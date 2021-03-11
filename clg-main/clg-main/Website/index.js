const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const hbs = require("hbs");
const { homePage } = require("./routes/homeRoute");
const {
  announcementPage,
  sendPostAnnouncement,
} = require("./routes/announcementRoute");
require("dotenv").config();
const PORT = process.env.PORT || 8000;
const mongoose = require("mongoose");
const fs = require("fs");

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
    photo: {
      data: Buffer,
      contentType: String,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    comments: [{}],
  },
  { timestamps: true }
);

const PostModal = new mongoose.model("posts", postSchema);

module.exports = { PostModal };

// mongodb connection to mongoose
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

// paths variables
const websitePath = path.join(__dirname, "./Website");

// built in middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(websitePath));
app.set("view engine", "hbs");
app.set("views", websitePath);
app.set("view engine", "html");
app.engine("html", require("hbs").__express);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now());
  },
});

const upload = multer({ storage: storage });

// routes
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

app.post("/announcement", upload.single("image"), (req, res) => {
  // get data from url while submitting form
  const { userName, message, collegeName, photo } = req.body;

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

app.listen(PORT, () => {
  console.log("Listening at " + PORT);
});
