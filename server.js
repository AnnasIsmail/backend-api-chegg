const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 5000;
var bodyParser = require("body-parser");
require('dotenv').config();

require("./connectDB");

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
        const errorSend = await errorMessage.insertMany([{
            updateId: 123123123,
            userId: 123123123,
            url: "test",
            chatId: 123123123,
            message: "VPS Error IP: " ,
            dateIn: today.format(dbFormatDateTime),
          }]);
        console.log(errorSend);
        res.status(200).json({ errorSend });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.use("/FE", FERoutes);
app.use("/VPS", VPSRoutes);
app.use("/lambda", lambdaRoutes);