const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 5000;
var bodyParser = require("body-parser");
const axios = require("axios");
require('dotenv').config();

require("./connectDB");

const mongoose = require("mongoose");
const FERoutes = require("./routes/FE");
const VPSRoutes = require("./routes/VPS");
const lambdaRoutes = require("./routes/lambda");

const users = require("./model/user");
const listUpdateId = require("./model/listUpdateId");
const logUpdateId = require("./model/logUpdateId");
const requestDay = require("./model/requestPerDay");
const queueVPS = require("./model/queueVPS");
const VPS = require("./model/VPS");
const errorMessage = require("./model/errorMessage");
const admin = require("./model/admin");

const moment = require('moment');
const momentTimeZone = require('moment-timezone');
const dbFormatDate = "DD MMMM YYYY";
const dbFormatDateTime = "YYYY-MM-DDTHH:mm:ss";

// ----------------------------------------------------------------------

app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json());

const server = require("http").createServer(app);
app.listen(PORT, () => {
    console.log("Server running on Port: "+ PORT);
  });

app.get("/", async (req, res) => {
    res.status(500).send("Error Internal Server.");
});


app.post("/userManagement/", async (req, res) => {
    const today = momentTimeZone().tz("Asia/Jakarta");
    
    try {
        const admins = await admin.insertMany([{
            userId: "5157078824",
            chatId: "5157078824",
            dateIn: today.format(dbFormatDateTime),
          },{
            userId: "905512354",
            chatId: "905512354",
            dateIn: today.format(dbFormatDateTime),
          }]);
        res.status(200).json({ data: admins });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// mongoose.connection.on('disconnected', () => {
//   console.log('MongoDB disconnected. Trying to reconnect...');
//   mongoose.connect('mongodb://yourMongoDBURI', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
//   });
// });

// mongoose.connection.on('connected', () => {
//   console.log('MongoDB connected');
// });

// mongoose.connection.on('error', (err) => {
//   console.error('MongoDB connection error:', err);
// });

app.use("/FE", FERoutes);
app.use("/VPS", VPSRoutes);
app.use("/lambda", lambdaRoutes);