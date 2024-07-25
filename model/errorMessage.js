const mongoose = require("mongoose");

const errorMessage = mongoose.model("errorMessage", {
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
  chatId: {
    type: String,
  },
  message: {
    type: String,
  },
  dateIn: {
    type: String,
  },
  dateUp: {
    type: String,
  }
});

module.exports = errorMessage;