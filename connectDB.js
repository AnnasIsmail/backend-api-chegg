
const db = process.env.DB;
const mongoose = require("mongoose");
// mongoose.connect('mongodb://127.0.0.1:27017/Annas',
mongoose.connect(
    // "mongodb+srv://chegg-permission:chegg123@cluster0.rc4qkvv.mongodb.net/userManagementChegg",
    db,
);