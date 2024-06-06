
const db = process.env.DB;
const mongoose = require("mongoose");

mongoose.connect(
    db,
);