const mongoose = require("mongoose");

const VPS = mongoose.model("VPS", {
  ip: {
    type: String,
  },
  isRunning: {
    type: Boolean,
  },
  userId: {
    type: String,
  },
  isActive: {
    type: Boolean,
  },
  userId: {
    type: String,
  },
  updateId: {
    type: String,
  },
  chatId: {
    type: String,
  },
  url: {
    type: String,
  },
  dateIn: {
    type: String,
  },
  dateUp: {
    type: String,
  }
});

module.exports = VPS;