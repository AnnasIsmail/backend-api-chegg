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
  dateIn: {
    type: String,
  },
  dateUp: {
    type: String,
  }
});

module.exports = VPS;