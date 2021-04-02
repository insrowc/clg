const mongoose = require("mongoose");

const notesSchema = new mongoose.Schema(
    {
      user: String,
      originalname: String,
      encoding: String,
      mimetype: String,
      destination: String,
      filename: String,
      path: String,
      ext: String,
      size: Number,
      downloads: {
        type: Number,
        default: 0,
      },
      uploadedAt: String,
      filePages: Number,
    },
    { timestamps: true }
  );

  // notesSchema.virtual("ext").get(function () {
  //   return this.mimetype.slice(this.mimetype.indexOf("/") + 1);
  // });

  notesSchema.pre("save", function() {
    this.ext = this.mimetype.slice(this.mimetype.indexOf("/") + 1);
  });
  
  const NotesModal = new mongoose.model("notes", notesSchema);

  module.exports = NotesModal