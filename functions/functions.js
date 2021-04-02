const path = require("path");

const bytesToKB = (arr) => {
  arr.forEach((item) => {
    item.size = item.size / 1000;
  });

  return arr;
};

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

module.exports = { bytesToKB, checkFileType };
