const mongoose = require("mongoose");

const logUpdateId = mongoose.model("logUpdateId", {
  updateId: {
    type: String,
  },
  userId: {
    type: String,
  },
  url: {
    type: String,
  },
  chatId: {
    type: String,
  },
  date: {
    type: String,
  },
  dateIn: {
    type: String,
  },
  dateUp: {
    type: String,
  }
});

module.exports = logUpdateId;