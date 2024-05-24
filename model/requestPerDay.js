const mongoose = require("mongoose");

const requestDay = mongoose.model("requestDay", {
  userId: {
    type: String,
  },
  date: {
    type: String,
  },
  requestOrderDay: {
    type: Number,
  },
  maxRequestPerDay: {
    type: Number,
  }
});

module.exports = requestDay;