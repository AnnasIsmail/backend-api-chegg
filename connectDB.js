
const db = process.env.DB;
const mongoose = require("mongoose");

mongoose.connect(
    "mongodb+srv://chegg-permission:chegg123@serverlessinstance0.jc8bmep.mongodb.net/prod-chegg",
);
