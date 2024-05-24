const mongoose = require("mongoose");

const logUpdateId = mongoose.model("logUpdateId", {
  updateId: {
    type: String,
  },
  userId: {
    type: String,
  },
  dateTime: {
    type: String,
  }
});

module.exports = logUpdateId;