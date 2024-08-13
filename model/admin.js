const mongoose = require("mongoose");

const admin = mongoose.model("admin", {
  userId: {
    type: String,
  },
  chatId: {
    type: String,
  },
  dateIn: {
    type: String,
  },
  dateUp: {
    type: String,
  }
});

module.exports = admin;