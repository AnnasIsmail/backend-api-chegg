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
  }
});

module.exports = queueVPS;