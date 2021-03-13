const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const hbs = require("hbs");
require("dotenv").config();
let url = require("url");
const PORT = process.env.PORT || 8000;
const mongoose = require("mongoose");

const websitePath = path.join(__dirname, "./");
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(websitePath));
app.set("view engine", "hbs");
app.set("views", websitePath);
app.set("view engine", "html");

const postSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
    },
    collegeName: {
      type: String,
      required: true,
    },
    message: String,
    commentsCount: {
      type: Number,
      default: 0,
    },
    comments: [{}],
  },
  { timestamps: true }
);

const notesSchema = new mongoose.Schema(
  {
    user: String,
    originalname: String,
    encoding: String,
    mimetype: String,
    destination: String,
    filename: String,
    path: String,
    size: Number,
    downloads: {
      type: Number,
      default: 0,
    },
    uploadedAt: String,
    filePages: Number,
  },
  {
    timestamps: true,
  }
);

notesSchema.virtual("ext").get(function () {
  return this.mimetype.slice(this.mimetype.indexOf("/") + 1);
});

const NotesModal = new mongoose.model("notes", notesSchema);
const PostModal = new mongoose.model("posts", postSchema);

mongoose.connect(
  process.env.MONGO_URL,
  {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  },
  function (err, db) {
    if (err) throw err;

    console.log("monogodb connected");
  }
);

app.engine("html", require("hbs").__express);

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./upload");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

let extError = "";

function checkFileType(file, cb) {
  const filetypes = /jpeg|pdf|docx|jpg|png|doc|zip/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    extError = "Error: format support only jpeg, pdf, docx, jpg, png";
  }
}

var upload = multer({
  storage: storage,
  fileFilter: function (_req, file, cb) {
    checkFileType(file, cb);
  },
});

const bytesToKB = (arr) => {
  arr.forEach((item) => {
    item.size = item.size / 1000;
  });

  return arr;
};

app.get("/", (req, res) => {
  res.render("index");
});
app.get("/notesinfo", (req, res) => {
  res.render("notesinfo");
});
app.get("/uploadnotes", (req, res) => {
  const { filename, filepages } = req.query;
  res.render("upload", {
    fileName: filename,
    filePages: filepages,
  });
});
app.get("/announcement", (req, res) => {
  PostModal.find({}, (err, result) => {
    if (err) console.log(err);
    else {
      // console.log(result[0].comments);
      res.render("announcement", { posts: result });
    }
  });
});

app.post("/announcement", (req, res) => {
  // get data from url while submitting form
  const { userName, message, collegeName } = req.body;

  if (userName !== "" && collegeName !== "") {
    //   creating new document
    const post = new PostModal({
      userName,
      message,
      collegeName,
    });

    // uploading post to posts collection
    post.save((err) => {
      if (err) console.log("Something wrong while uploading your post");
      res.render("announcement");
    });
  } else {
    console.log("Collegename and Username can not be empty");
  }
});

app.post("/comment", async (req, res) => {
  const postId = req.body.postId;
  const comment = req.body.comment;

  // updating comments
  await PostModal.findOneAndUpdate(
    { _id: postId },
    {
      $push: {
        comments: {
          whoComment: "loggedinuer",
          comment: comment,
        },
      },
    }
  );

  // count comments
  let count = 0;
  await PostModal.findOne({ _id: postId }, (err, res) => {
    res.comments.map((item) => {
      count++;
    });
  });

  // update comments count
  await PostModal.findOneAndUpdate(
    { _id: postId },
    {
      $set: {
        commentsCount: count,
      },
    }
  );
});

app.get("/studynotes", (req, res) => {
  NotesModal.find({}, (err, result) => {
    result = bytesToKB(result);
    res.render("study notes", { notesList: result });
  });
});

app.get("/upload", (req, res) => {
  NotesModal.find({}, (err, result) => {
    result = bytesToKB(result);
    res.render("upload", { notesList: result });
  });
});

app.post("/uploadnotes", (req, res) => {
  const { filename, filepages } = req.body;
  res.render("upload", { filename: filename, filepages: filepages });
});

app.post("/upload/notes", upload.single("notes"), (req, res) => {
  try {
    const { fileName, filepages } = req.body;

    req.file.filePages = filepages;
    req.file.originalname = fileName;

    const {
      fieldname,
      encoding,
      originalname,
      mimetype,
      destination,
      filename,
      path,
      size,
      filePages,
    } = req.file;

    const user = "loggedinuser";
    const date = new Date();
    const uploadedAt = `${date.getUTCDate()}/${
      date.getUTCMonth() + 1
    }/${date.getUTCFullYear()} ${date.getHours()}:${date.getMinutes()}`;

    const notes = new NotesModal({
      user,
      fieldname,
      originalname,
      encoding,
      mimetype,
      destination,
      filename,
      path,
      size,
      uploadedAt,
      filePages,
    });

    notes.save((err) => {
      if (err) console.log("Something wrong while uploading your post");
      res.redirect("/studynotes");
    });
  } catch (err) {
    res.sendStatus(400);
  }
});

app.post("/notes/download", (req, res) => {
  const { id } = req.body;

  NotesModal.findById(id, (err, note) => {
    if (err) res.redirect("/");
    note.downloads += 1;
    note.save();
  });
});
app.post('/notes/search', async(req, res) => {
  const {search} = req.body;
  const data  = await NotesModal.find({originalname: {$regex: search}});
  res.render("study notes", {notesList: data})
});
app.post("/notes/filter", (req, res) => {
  const {filter} = req.body;
  switch(filter) {
    case "high to low downloads":
      NotesModal.find({}).sort([['downloads', -1]])
      .exec((err,docs) => {
        if(err) {
          console.log(err);
          res.redirect('/studynotes');
        }
        res.render("study notes", {notesList: docs});
      });
      
      break;
    case "low to high downloads":
      NotesModal.find({}).sort("downloads")
      .exec((err,docs) => {
        if(err) {
          console.log(err);
          res.redirect('/studynotes');
        }
        res.render("study notes", {notesList: docs});
      });
      break;
    case "latest to old date":
      NotesModal.find({}).sort([["uploadedAt", -1]])
      .exec((err,docs) => {
        if(err) {
          console.log(err);
          res.redirect('/studynotes');
        }
        res.render("study notes", {notesList: docs});
      });
      break;
    case "old to latest date":
      NotesModal.find({}).sort("uploadedAt")
      .exec((err,docs) => {
        if(err) {
          console.log(err);
          res.redirect('/studynotes');
        }
        res.render("study notes", {notesList: docs});
      });
      break;
    case "max to min pages":
      NotesModal.find({}).sort([['filePages', -1]])
      .exec((err,docs) => {
        if(err) {
          console.log(err);
          res.redirect('/studynotes');
        }
        res.render("study notes", {notesList: docs});
      });
      break;
    case "min to max pages":
      NotesModal.find({}).sort("filePages")
      .exec((err,docs) => {
        if(err) {
          console.log(err);
          res.redirect('/studynotes');
        }
        res.render("study notes", {notesList: docs});
      });
      break;
    default: 
      res.redirect("/studynotes");
  }
});

app.listen(PORT, () => {
  console.log("Listening at " + PORT);
});
