const mongoose = require("mongoose");

const VPS = mongoose.model("VPS", {
  ip: {
    type: String,
  },
  isRunning: {
    type: Boolean,
  },
  isActive: {
    type: Boolean,
  }
});

module.exports = VPS;