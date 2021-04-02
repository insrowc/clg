const UserModal = require("../modals/userModal");

const auth = (req, res, next) => {
  const user = req.cookies["user"];
  if (user === undefined) {
    res.redirect("/login");
  } else {
    next();
  }
};

const authAdmin = async (req, res, next) => {
  try {
    const userid = req.cookies["user"];
    const user = await UserModal.findById(userid);
    user.role === "admin"? next() : res.redirect("/");
  } catch (error) {
    console.log("auth admin error "+ error);
  }
};

module.exports = auth;
