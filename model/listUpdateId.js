const mongoose = require("mongoose");

const listUpdateId = mongoose.model("listUpdateId", {
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

module.exports = listUpdateId;