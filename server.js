require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const hbs = require("hbs");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const bcryptjs = require("bcrypt");
const UserModal = require("./modals/userModal");
const PostModal = require("./modals/postModal");
const NotesModal = require("./modals/notesModal");
const ChatModal = require("./modals/chatModal");
const FitModal = require("./modals/fitPostModal");
const auth = require("./auth/auth");
const { notes, users, fits, chats } = require("./multer/multer");
const transporter = require("./mailconfig/mail");
const { bytesToKB } = require("./functions/functions");
const PORT = process.env.PORT || 8000;
const DOMAIN = process.env.DOMAIN;

app.listen(PORT, () => {
  console.log("Listening at " + PORT);
});
app.engine("hbs", hbs.__express);
const websitePath = path.join("./");
app.use(express.static(websitePath));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.json());
app.set("view engine", "hbs");

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

hbs.registerHelper(
  "containsparam",
  function (mimetype, destination, originalname) {
    if (mimetype && mimetype.includes("video")) {
      return `<video src='${destination}/${originalname}' class='img-fluid1' controls></video>`;
    } else {
      return `<img src='${destination}/${originalname}' alt='banner-img' class='img-fluid1'>`;
    }
  }
);

hbs.registerHelper("ifEquals", function (arg1, arg2, options) {
  console.log(arg1, arg2);
  return arg1 != arg2 ? options.fn(this) : options.inverse(this);
});

let extError = "";

app.get("/", auth, async (req, res) => {
  const college = req.cookies["college"];
  const fits = await FitModal.find({ college: college }).sort({ _id: -1 });
  const userId = req.cookies["user"];
  const user = await UserModal.findById(userId);
  hbs.registerHelper("likeordislike", function (likesArr, id) {
    if (likesArr.includes(user.userName)) {
      return `<a class="btn like" onclick="likeDislike(event,'${id}')">`;
    } else {
      return `<a class="btn dislike" onclick="likeDislike(event,'${id}')">`;
    }
  });
  res.render("index", { fits: fits });
});
app.get("/notesinfo", auth, (req, res) => {
  res.render("notesinfo");
});
app.get("/uploadnotes", auth, (req, res) => {
  const { filename, filepages } = req.query;
  res.render("upload", {
    fileName: filename,
    filePages: filepages,
  });
});
app.get("/announcement", auth, (req, res) => {
  PostModal.find({}, (err, result) => {
    if (err) console.log(err);
    else {
      // console.log(result[0].comments);
      res.render("announcement", { posts: result });
    }
  });
});
app.post("/announcement", auth, (req, res) => {
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
app.post("/comment", auth, async (req, res) => {
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
app.get("/studynotes", auth, (req, res) => {
  NotesModal.find({}, (err, result) => {
    result = bytesToKB(result);
    res.render("study notes", { notesList: result });
  });
});
app.get("/upload", auth, (req, res) => {
  NotesModal.find({}, (err, result) => {
    result = bytesToKB(result);
    res.render("upload", { notesList: result });
  });
});
app.post("/uploadnotes", auth, (req, res) => {
  const { filename, filepages } = req.body;
  res.render("upload", { filename: filename, filepages: filepages });
});
app.post("/upload/notes", auth, notes.single("notes"), (req, res) => {
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
app.post("/notes/download", auth, (req, res) => {
  const { id } = req.body;

  NotesModal.findById(id, (err, note) => {
    if (err) res.redirect("/");
    note.downloads += 1;
    note.save();
  });
});
app.post("/notes/search", auth, async (req, res) => {
  const { search } = req.body;
  const data = await NotesModal.find({ originalname: { $regex: search } });
  res.render("study notes", { notesList: data });
});
app.post("/notes/filter", auth, (req, res) => {
  const { filter } = req.body;
  switch (filter) {
    case "high to low downloads":
      NotesModal.find({})
        .sort([["downloads", -1]])
        .exec((err, docs) => {
          if (err) {
            console.log(err);
            verified("/studynotes");
          }
          res.render("study notes", { notesList: docs });
        });

      break;
    case "low to high downloads":
      NotesModal.find({})
        .sort("downloads")
        .exec((err, docs) => {
          if (err) {
            console.log(err);
            res.redirect("/studynotes");
          }
          res.render("study notes", { notesList: docs });
        });
      break;
    case "latest to old date":
      NotesModal.find({})
        .sort([["uploadedAt", -1]])
        .exec((err, docs) => {
          if (err) {
            console.log(err);
            res.redirect("/studynotes");
          }
          res.render("study notes", { notesList: docs });
        });
      break;
    case "old to latest date":
      NotesModal.find({})
        .sort("uploadedAt")
        .exec((err, docs) => {
          if (err) {
            console.log(err);
            res.redirect("/studynotes");
          }
          res.render("study notes", { notesList: docs });
        });
      break;
    case "max to min pages":
      NotesModal.find({})
        .sort([["filePages", -1]])
        .exec((err, docs) => {
          if (err) {
            console.log(err);
            res.redirect("/studynotes");
          }
          res.render("study notes", { notesList: docs });
        });
      break;
    case "min to max pages":
      NotesModal.find({})
        .sort("filePages")
        .exec((err, docs) => {
          if (err) {
            console.log(err);
            res.redirect("/studynotes");
          }
          res.render("study notes", { notesList: docs });
        });
      break;
    default:
      res.redirect("/studynotes");
  }
});
app.get("/signup", (req, res) => {
  res.render("signup");
});
app.post("/signup", users.array("userid"), async (req, res) => {
  try {
    let {
      fullname,
      email,
      phone,
      collegename,
      course,
      startyear,
      endyear,
      username,
      password,
      movie,
      food,
      confirmpassword,
    } = req.body;
    const files = req.files;

    if (password === confirmpassword) {
      const newUser = new UserModal({
        fullName: fullname,
        email,
        phone,
        collegeName: collegename.toLowerCase(),
        course,
        startYear: startyear,
        endYear: endyear,
        userName: username,
        password,
        movie,
        food,
        files,
      });

      const userRegistered = await newUser.save();

      const verifyemailhtml = `<a style='padding:10px 25px: text-decoration:none; background: lightgray; color: #333;' href='${DOMAIN}${PORT}/emailisverified?email=${email}'>Verify Email</a>`;

      const mail = {
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: "VFindFit Email verification",
        html: verifyemailhtml,
      };

      transporter.sendMail(mail, function (err, success) {
        if (err) {
          if (err.errno && err.errno == -3008) {
            res.render("signup", { message: "Connection Problem" });
          } else {
            res.render("signup", { message: "Something Wrong Try again" });
          }
          console.log(err);
        } else {
          res.redirect("/needtoverifyemail");
        }
      });
    } else {
      res.render("signup", { message: "Password does not match" });
    }
  } catch (error) {
    // console.log(error);
    // console.log("catch");
    if (error.keyPattern) {
      const existingUser = await UserModal.find({
        email: error.keyValue.email,
      });
      console.log(error);
      // if user is not verified send verification not error
      if (existingUser[0] && !existingUser[0].verified) {
        console.log("not verified");

        const verifyemailhtml = `<a style='padding:10px 25px: text-decoration:none; background: lightgray; color: #333;' href='${DOMAIN}${PORT}/emailisverified?email=${req.body.email}'>Verify Email</a>`;

        const mail = {
          from: process.env.SENDER_EMAIL,
          to: req.body.email,
          subject: "VFindFit Email verification",
          html: verifyemailhtml,
        };

        transporter.sendMail(mail, function (err, success) {
          if (err) {
            if (err.errno && err.errno == -3008) {
              //connection error
              res.render("signup", { message: "Connection Problem" });
            } else {
              res.render("signup", { message: "Something Wrong Try again" });
            }
            // console.log(err);
          } else {
            res.redirect("/needtoverifyemail");
          }
        });
      } else {
        // if user is verified then can't use previous email phone username
        console.log("key pattern error");
        if (error.keyPattern && error.keyPattern.email >= 1) {
          res.send(
            `${error.keyValue.email} id already exist try with different email <a href='${DOMAIN}${PORT}/signup'>Sign Up again</a>`
          );
        } else if (error.keyPattern && error.keyPattern.phone >= 1) {
          res.send(
            `${error.keyValue.phone} number already exist try with different phone number <a href='${DOMAIN}${PORT}/signup'>Sign Up again</a>`
          );
        } else if (error.keyPattern && error.keyPattern.userName >= 1) {
          res.send(
            `${error.keyValue.username} already exist try with different username <a href='${DOMAIN}${PORT}/signup'>Sign Up again</a>`
          );
        }
      }
    } else {
      console.log(error);
      res.send("new error except key pattern");
    }
  }
});
app.get("/needtoverifyemail", (req, res) => {
  res.send("Verify Your Email");
});
app.get("/emailisverified", (req, res) => {
  const emailToVerify = req.query.email;
  UserModal.findOneAndUpdate(
    { email: emailToVerify },
    { $set: { verified: true } }
  )
    .then((response) => {
      res.redirect("/login");
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/signup");
    });
});
app.get(
  "/login",
  (req, res, next) => {
    const user = req.cookies["user"];
    if (user) res.redirect("/");
    else next();
  },
  (req, res) => {
    res.render("login");
  }
);
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await UserModal.find({ userName: username });
    const user = users[0];

    if (user) {
      // user exist or not
      if (user.verified) {
        // user email is verified
        const userid = user.id;
        const isPasswordCorrect = await bcryptjs.compare(
          password,
          user.password
        );

        if (isPasswordCorrect) {
          // if password is correct
          res.cookie("user", userid);
          res.cookie("college", user.collegeName);
          res.redirect("/");
        } else {
          // if password is incorrect
          res.render("login", { message: `Password is Incorrect` });
        }
      } else {
        // if email is not verified
        res.render("login", {
          message:
            "Your email is not verified Go to email and click on given link to verify",
        });
      }
    } else {
      // if username does not exits in db
      res.render("login", { message: `${username} does not exist` });
    }
  } catch (error) {
    console.log(error);
    res.end("error");
  }
});
app.get("/logout", auth, (req, res) => {
  res.cookie("college", "", { expires: new Date(Date.now()) });
  res.cookie("user", "", { expires: new Date(Date.now()) });
  res.redirect("/login");
});
app.get("/postimage", auth, (req, res) => {
  res.render("post image");
});
app.get("/postvideo", auth, (req, res) => {
  res.render("post video");
});
app.post("/postfit", auth, fits.single("fitpic"), async (req, res) => {
  const fitFile = req.file;
  const { message } = req.body;

  const userid = req.cookies["user"];
  const college = req.cookies["college"];

  const user = await UserModal.find({ _id: userid });
  const username = user[0].fullName;
  const { destination, filename } = user[0].files[0];

  const fit = new FitModal({
    file: fitFile,
    message,
    userid,
    username,
    userphoto: {
      destination,
      filename,
    },
    college,
  });

  const savedFit = await fit.save();

  res.redirect("/");
});
app.get("/forgotpassword", (req, res) => {
  res.render("forgotpassword");
});
app.post("/forgotpassword", async (req, res) => {
  const { username, food, movie } = req.body;
  const user = await UserModal.find({ userName: username });
  if (user && user[0]) {
    if (user[0].food === food && user[0].movie === movie) {
      res.cookie("resetpass", username, {
        expires: new Date(Date.now() + 50000),
      });
      res.redirect("createnewpassword");
    } else {
      res.render("forgotpassword", { message: "Wrong Answers" });
    }
  } else {
    res.render("forgotpassword", { message: "This username does not exist" });
  }
});
app.get(
  "/resetpassword",
  (req, res, next) => {
    if (req.cookies["resetpass"] && req.cookies["resetpass"] !== "") {
      next();
    } else {
      res.redirect("login");
    }
  },
  (req, res) => {
    res.render("resetpassword");
  }
);
app.post(
  "/resetpassword",
  (req, res, next) => {
    if (req.cookies["resetpass"] && req.cookies["resetpass"] !== "") {
      next();
    } else {
      res.redirect("login");
    }
  },
  async (req, res) => {
    const { password, cpass } = req.body;
    if (password && password === cpass && password !== "") {
      const username = req.cookies["resetpass"];
      const hashPassword = await bcryptjs.hash(password, 10);
      const user = await UserModal.update(
        { userName: username },
        {
          password: hashPassword,
        }
      );
      console.log(user);
      res.redirect("login");
    } else {
      res.render("resetpassword", { message: "Password does not match" });
    }
  }
);
app.get("/chat", auth, async (req, res) => {
  if (req.query && req.query.username) {
    const user = await UserModal.find({ userName: req.query.username });
    let userStatus = user[0].status;
    res.render("chat", { username: req.query.username, userStatus });
  } else {
    res.redirect("/");
  }
});
app.get("/getchat", auth, async (req, res) => {
  try {
    const loggedInUserId = req.cookies["user"];
    const user = await UserModal.findById(loggedInUserId);
    const username = user.userName;
    if (req.query && req.query.username) {
      // console.log("username");
      const chatRoomMember = req.query.username;
      const chats = await ChatModal.find({
        $or: [
          { sender: username, receiver: chatRoomMember },
          { sender: chatRoomMember, receiver: username },
        ],
      });
      // console.log(chats);
      res.send(chats);
    } else {
      console.log("else");
      res.redirect("/");
    }
  } catch (error) {
    console.log("catch error " + error);
  }
});
app.post("/chat", auth, async (req, res) => {
  try {
    const { sender, message, receiver, gif, image } = req.body;
    const user = await UserModal.findById(sender);
    const username = user.userName;
    const deleteChat = await ChatModal.deleteMany({
      $or: [
        { sender: username, receiver: receiver },
        { sender: receiver, receiver: username },
      ],
    });
    const chat = new ChatModal({
      sender: username,
      message,
      receiver,
      gif,
    });
    const saveChat = await chat.save();
  } catch (error) {
    console.log("catch error");
    console.log(error);
  }
});
app.post("/chatimg", auth, chats.single("chatimage"), async (req, res) => {
  const { sender, receiver } = req.body;
  const chatimage = req.file;
  const user = await UserModal.findById(sender);
  const username = user.userName;
  const deleteChat = await ChatModal.deleteMany({
    $or: [
      { sender: username, receiver: receiver },
      { sender: receiver, receiver: username },
    ],
  });
  let message = "",
    gif = "";
  const chat = new ChatModal({
    sender: username,
    message,
    receiver,
    gif,
    image: chatimage,
  });
  const saveChat = await chat.save();
  res.redirect(`chat?username=${receiver}`);
});
app.post("/likedislike", auth, async (req, res) => {
  const { postId, action } = req.body;
  const userId = req.cookies["user"];
  const user = await UserModal.findById(userId);
  if (action === "like") {
    FitModal.findById(postId, (err, fit) => {
      fit.likes = [...fit.likes, user.userName];
      fit.likescount = fit.likes.length;
      fit.save();
    });
  } else {
    FitModal.findById(postId, (err, fit) => {
      fit.likes.splice(fit.likes.indexOf(user.userName), 1);
      fit.likescount = fit.likes.length;
      fit.save();
    });
  }
});
app.post("/fitcomment", auth, async (req, res) => {
  const { comment, postId } = req.body;
  const userId = req.cookies["user"];
  const user = await UserModal.findById(userId);
  FitModal.findById(postId, (err, fit) => {
    fit.comments = [...fit.comments, { username: user.userName, comment }];
    fit.commentsCount = fit.comments.length;
    fit.save();
  });
});
app.get("/jumptoothercolleges", auth, (req, res) => {
  mongoose.connection.db.collection("colleges", async (err, result) => {
    try {
      const colleges = await result.find({}).toArray();
      const college = req.cookies["college"];
      res.render("clg", { colleges, college });
    } catch (error) {
      console.log("catch error in jumtocolleges " + error);
    }
  });
});
app.get("/findfriends", auth, async (req, res) => {
  try {
    const userid = req.cookies["user"];
    const college = req.cookies["college"];
    const user = await UserModal.findById(userid);
    const loggedInUser = await UserModal.findById(userid);
    const users = await UserModal.find({
      collegeName: college,
      _id: { $nin: loggedInUser._id },
      blockedby: { $nin: loggedInUser.blocks },
      verified: true,
    });

    res.render("friends", { users, college });
  } catch (error) {
    console.log("catch error");
  }
});
app.get("/friendsprofile", async (req, res) => {
  try {
    if (req.query && req.query.username) {
      const username = req.query.username;
      const users = await UserModal.find({ userName: username });
      const user = users[0];
      const fits = await FitModal.find({ userid: user._id });
      const fitLength = fits.length;
      const collegeName = req.cookies["college"];
      const newUsers = await UserModal.find({ collegeName }).limit(10);
      console.log(newUsers);

      res.render("friendsprofile", { user, fits, fitLength, newUsers });
    } else {
      res.redirect("/findfriends");
    }
  } catch (error) {
    console.log("catch errr " + error);
  }
});
app.get("/profile", auth, async (req, res) => {
  try {
    const userid = req.cookies["user"];
    const user = await UserModal.findById(userid);
    const fits = await FitModal.find({ userid });
    res.render("profile", { user, fits, fitLength: fits.length });
  } catch (error) {}
});
app.get("/allposts", auth, async (req, res) => {
  if (req.query && req.query.username) {
    const loggedinusername = req.query.username;
    const users = await UserModal.find({ userName: loggedinusername });
    const user = users[0];
    const fits = await FitModal.find({ userid: user._id });
    res.send(fits);
  } else {
    const loggedinuserid = req.cookies["user"];
    const fits = await FitModal.find({ userid: loggedinuserid });
    res.send(fits);
  }
});
app.get("/editprofile", auth, async (req, res) => {
  try {
    const userid = req.cookies["user"];
    const user = await UserModal.findById(userid);
    res.render("editprofile", { user });
  } catch (error) {}
});
app.post("/editprofile", auth, (req, res) => {
  const {
    profilePic,
    fullName,
    email,
    phone,
    collegeName,
    course,
    userName,
  } = req.body;
  const userid = req.cookies["user"];
  UserModal.findById(userid, (err, user) => {
    (user.files[0] = profilePic),
      (user.fullName = fullName),
      (user.email = email),
      (user.phone = phone),
      (user.collegeName = collegeName),
      (user.course = course),
      (user.userName = userName);
    user.save();
  });
  res.redirect("/editprofile");
});
app.get("/blockperson", auth, (req, res) => {
  const { blockid } = req.query;
  const loggedinuser = req.cookies["user"];
  UserModal.findById(loggedinuser, (err, user) => {
    user.blocks = [...user.blocks, blockid];
    user.save();
  });
  UserModal.findById(blockid, (err, user) => {
    user.blockedby = [...user.blockedby, loggedinuser];
    user.save();
  });
  res.redirect("/findfriends");
});
app.get("/unblockperson", auth, (req, res) => {
  const { unblockid } = req.query;
  const loggedinuser = req.cookies["user"];
  UserModal.findById(loggedinuser, (err, user) => {
    user.blocks = user.blocks.filter((blockid) => {
      if (blockid !== unblockid) return blockid;
    });
    user.save();
  });
  UserModal.findById(unblockid, (err, user) => {
    user.blockedby = user.blockedby.filter((blockedbyid) => {
      if (blockedbyid !== unblockid) {
      } else {
        return blockedbyid;
      }
    });
    user.save();
  });
  res.redirect("/findfriends");
});
app.get("/getnewchat", auth, (req, res) => {
  const loggedInUserId = req.cookies["user"];
  UserModal.findById(loggedInUserId, (err, user) => {
    if (user) {
      ChatModal.find({ receiver: user.userName }, (err, chat) => {
        res.send(chat);
      });
    }
  });
});
app.get("/notifications", auth, (req, res) => {
  res.render("notifications");
});
app.get("/getnotifications", auth, async (req, res) => {
  const loggedInUserId = req.cookies["user"];
  let notifications = { likes: [] };
  const fits = await FitModal.find({ userid: loggedInUserId }).limit(10);

  for (let item of fits) {
    if (item.likes.length) {
      notifications.likes = [
        ...notifications.likes,
        item.likes[item.likes.length - 1],
      ];
    }
  }
  console.log(notifications);
  res.send(notifications);
});
