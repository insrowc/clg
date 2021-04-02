const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
      sender: {
          type: String,
          required: true
      },
      message: {
          type: String,
      },
      gif: {
          type: String,
      },
      receiver: {
          type: String,
          required: true
      },
      image: {
          type: Object
      }
  },
  { timestamps: true }
);

const ChatModal = new mongoose.model("chats", chatSchema);

module.exports = ChatModal;
