const mongoose = require("mongoose");

const user = mongoose.model("user", {
  userId: {
    type: String,
  },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  code: {
    type: String,
  },
  subscription: {
    type: String,
  },
  quantity: {
    type: Number,
  },
  duration: {
    type: Number,
  },
  price: {
    type: Number,
  },
  startDate: {
    type: String,
  },
  endDate: {
    type: String,
  },
  maxRequestPerDay: {
    type: Number,
  },
  role: {
    type: String,
  },
  dateIn: {
    type: String,
  },
  dateUp: {
    type: String,
  },
  status: {
    type: String,
  }
});

module.exports = user;