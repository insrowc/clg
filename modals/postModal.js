const mongoose = require("mongoose");

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

const PostModal = new mongoose.model("posts", postSchema);

module.exports =  PostModal ;
