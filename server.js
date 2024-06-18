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

const moment = require('moment');
const momentTimeZone = require('moment-timezone');


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
    
    try {
        const today = momentTimeZone().tz("Asia/Jakarta");
        const startDate = moment('Sunday 16 June 2024 11:59:00', "dddd DD MMMM YYYY HH:mm:ss");
        const endDate = moment('Saturday 22 June 2024 18:59:00', "dddd DD MMMM YYYY HH:mm:ss");
        res.status(200).json({ condition: today.isBetween(startDate, endDate, null, '[]'), today: today.format("DD MMMM YYYY")});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.use("/FE", FERoutes);
app.use("/VPS", VPSRoutes);
app.use("/lambda", lambdaRoutes);