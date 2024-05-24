const mongoose = require("mongoose");

const subscription = mongoose.model("subscription", {
  name: {
    type: String,
  },
  duration: {
    type: Number,
  },
  price: {
    type: Number,
  },
  dateIn: {
    type: String,
  },
  dateUp: {
    type: String,
  },
});

module.exports = subscription;