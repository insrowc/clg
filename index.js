const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const hbs = require("hbs");
require("dotenv").config();
const PORT = process.env.PORT || 8000;
const mongoose = require("mongoose");
const fs = require("fs");

// built in middleware
const websitePath = path.join(__dirname, "./");
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(websitePath));
app.set("view engine", "hbs");
app.set("views", websitePath);
app.set("view engine", "html");

// schemas
// post schema
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

// notes schema
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
      default: 0
    },
    uploadedAt: String
  },
  {
    timestamps: true,
  }
);

// notesSchema.virtual("uploadedAt").get(function () {
//   const date = new Date();
//   return `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()} ${date.getHours()}:${date.getMinutes()}`;
// });

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

app.get("/announcement", (req, res) => {
  PostModal.find({}, (err, result) => {
    if (err) console.log(err);
    else {
      console.log(result[0].comments);
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
      if (err) alert("Something wrong while uploading your post");
      res.render("announcement");
    });
  } else {
    alert("Collegename and Username can not be empty");
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

app.post("/upload/notes", upload.single("notes"), (req, res) => {
  try {
    const {
      fieldname,
      originalname,
      encoding,
      mimetype,
      destination,
      filename,
      path,
      size,
    } = req.file;
    const user = "loggedinuser";
    const date = new Date();
    const uploadedAt = `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()} ${date.getHours()}:${date.getMinutes()}`

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
      uploadedAt
    });

    notes.save((err) => {
      if (err) alert("Something wrong while uploading your post");
      res.redirect("/upload");
    });
  } catch (err) {
    res.send(400);
  }
});

app.post("/notes/download", (req, res) => {
  const { id } = req.body;

  NotesModal.findById(id, (err, note) => {
    if(err) res.redirect("/");
    note.downloads  += 1;
    note.save();
  });
});

app.listen(PORT, () => {
  console.log("Listening at " + PORT);
});
  