const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 5000;
var bodyParser = require("body-parser");

require("./connectDB");
const lambdaRoutes = require("./routes/lambda");
const FERoutes = require("./routes/FE");

const users = require("./model/user");
const listUpdateId = require("./model/listUpdateId");
const logUpdateId = require("./model/logUpdateId");
const requestDay = require("./model/requestPerDay");

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
server.listen(PORT);

const date = new Date();
const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
const formattedDateTime = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

app.get("/", async (req, res) => {
    res.status(500).send("Error Internal Server");
});


app.post("/userManagement/", async (req, res) => {
    const today = dayjs().tz().format();
    // const query = users.insertMany([{
    //     userId: '1',
    //     code: 'asd123',
    //     subscription: '1 Week',
    //     price: 20000,
    //     startDate: '2024-05-11',
    //     endDate: '2024-05-18',
    //     maxRequestPerDay: 20,
    //     role: 'Basic',
    //     dateIn: formattedDateTime,
    //     updateId: '2368742367823468'
    // }])
    res.status(200).json(today);
});

app.use("/lambda", lambdaRoutes);
app.use("/FE", FERoutes);