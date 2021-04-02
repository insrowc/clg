const multer = require("multer");
const path = require("path");
const {checkFileType} = require("../functions/functions");

// notes
var notesStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './upload/notes');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
var notes = multer({
  storage: notesStorage,
  fileFilter: function (_req, file, cb) {
    checkFileType(file, cb);
  },
});

// users
var usersStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./upload/users-profile");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
var users = multer({ storage: usersStorage });

// fits 
var fitsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./upload/fits");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
var fits = multer({ storage: fitsStorage });

// chats
var chatsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './upload/chats');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
var chats = multer({
  storage: chatsStorage
});

module.exports = { notes, users, fits, chats };
