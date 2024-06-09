const mongoose = require("mongoose");

const listUpdateId = mongoose.model("listUpdateId", {
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

module.exports = listUpdateId;