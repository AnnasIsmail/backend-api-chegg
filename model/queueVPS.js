const mongoose = require("mongoose");

const queueVPS = mongoose.model("queueVPS", {
  ip: {
    type: String,
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
  message: {
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

module.exports = queueVPS;