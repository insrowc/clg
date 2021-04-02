const mongoose = require("mongoose");

const fitPostSchema = new mongoose.Schema({
  file: {
    type: Object,
  },
  message: {
    type: String,
  },
  userid: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  userphoto: {
    type: Object,
    required: true,
  },
  college: {
    type: String,
    required: true,
  },
  likes: [],
  likescount: {
    type: Number,
    default: 0,
  },
  comments: [],
  commentsCount: {
    type: Number,
    default: 0,
  },
  expireAt: {
    type: Date,
    default: new Date(new Date().getDay()+10000*10000)
  },
});

const FitModal = new mongoose.model("fits", fitPostSchema);

module.exports = FitModal;
