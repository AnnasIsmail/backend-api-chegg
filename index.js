const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 5000;
var bodyParser = require("body-parser");
require('dotenv').config();

require("./connectDB");
const lambdaRoutes = require("./routes/lambda");
const FERoutes = require("./routes/FE");
const VPSRoutes = require("./routes/VPS");

const users = require("./model/user");
const listUpdateId = require("./model/listUpdateId");
const logUpdateId = require("./model/logUpdateId");
const requestDay = require("./model/requestPerDay");
const queueVPS = require("./model/queueVPS");

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isBetween = require('dayjs/plugin/isBetween');

dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Jakarta");
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
    const today = dayjs().tz().format();
    const query = await queueVPS.insertMany([{
        ip: 'test1',
        userId: "1231",
        updateId: "123123123",
        dateIn: today
    }])
    res.status(200).json(query);
});

app.use("/lambda", lambdaRoutes);
app.use("/FE", FERoutes);
app.use("/VPS", VPSRoutes);