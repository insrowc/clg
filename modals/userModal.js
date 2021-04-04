const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
require("dotenv").config();

const usersSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
    },
    files: [],
    email: {
      type: String,
      unique: true,
      required: true,
    },
    phone: {
      type: Number,
      unique: true,
    },
    collegeName: {
      type: String,
      trim: true,
      lowercase: true,
    },
    notifications: [{}],
    course: String,
    startYear: Number,
    endYear: Number,
    userName: {
      type: String,
      unique: true,
      required: true,
    },
    movie: {
      type: String,
      required: true,
    },
    food: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    token: {
      type: String,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    blocks: [],
    blockedby: [],
  },
  { timestamps: true }
);

// hashing password
usersSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcryptjs.hash(this.password, 10);
  }
  next();
});

const UserModal = new mongoose.model("users", usersSchema);

module.exports = UserModal;
