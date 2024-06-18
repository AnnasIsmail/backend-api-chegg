const router = require("express").Router();
const axios = require("axios");
const VPS = require("../model/VPS");
const queueVPS = require("../model/queueVPS");
const requestDay = require("../model/requestPerDay");
const users = require("../model/user");
const moment = require('moment');
const momentTimeZone = require('moment-timezone');
const formatDate = "DD MMMM YYYY";
const formatDateTime = "dddd DD MMMM YYYY HH:mm:ss";

function findEarliestDate(data) {
  let earliestDateObj = data[0];

  data.forEach((obj) => {
    if (moment(obj.dateIn).isBefore(moment(earliestDateObj.dateIn))) {
      earliestDateObj = obj;
    }
  });

  return earliestDateObj;
}

router.post("/getQueue", async (req, res) => {
  const today = momentTimeZone().tz("Asia/Jakarta");

  // body: ip
  const body = req.body;

  if (body.ip == undefined) {
    return res.status(403).json({
      message: "Minus Body Request.",
    });
  }
  try {
    const vpsList = await queueVPS.find({ ip: body.ip });
    if (vpsList.length > 0) {
      const data = findEarliestDate(vpsList);
      await queueVPS.deleteOne({
        _id: data._id,
      });
      await VPS.updateOne(
        { ip: body.ip },
        {
          isRunning: false,
          userId: null,
          updateId: null,
          chatId: null,
          url: null,
          dateUp: today.format(formatDateTime),
        }
      );
      data["message"] = "Has Queue";
      return res.status(200).json(data);
    } else {
      await VPS.updateOne(
        { ip: body.ip },
        {
          isRunning: false,
          userId: null,
          updateId: null,
          chatId: null,
          url: null,
          dateUp: today.format(formatDateTime),
        }
      );
      return res.status(200).json({ message: "No Queue" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

router.post("/requestPerDay", async (req, res) => {
  const today = momentTimeZone().tz("Asia/Jakarta");

  // body: userId, updateId, url, chatId
  const body = req.body;

  if (!body.updateId || !body.userId || !body.url || !body.chatId) {
    return res.status(403).json({
      message: "updateId or userId not found!",
    });
  }

  //Check Exist RequestID
  const LatestRequest = await requestDay.findOne({
    userId: body.userId,
    date: today.format(formatDate),
  });
  let result = [];
  if (LatestRequest?.userId) {
    const requestOrderDay = LatestRequest.requestOrderDay + 1;
    result = await requestDay.updateOne(
      {
        userId: body.userId,
        date: today.format(formatDate),
      },
      {
        requestOrderDay,
        dateUp: today,
        url: body.url,
        chatId: body.chatId,
      }
    );
  } else {
    const query = users.where({ userId: body.userId });
    const user = await query.findOne();
    await requestDay.insertMany([
      {
        userId: body.userId,
        date: formattedDate,
        requestOrderDay: 1,
        maxRequestPerDay: user?.maxRequestPerDay,
        url: body.url,
        chatId: body.chatId,
        dateUp: today.format(formatDate),
      },
    ]);
  }

  return res.status(200).json({
    message: "Request Per Day Updated Successfully",
  });
});

// router.post("/deleteQueue", async (req, res) => {
//     const today = dayjs().tz("Asia/Jakarta");
//     const formattedDate = today.format('YYYY-MM-DD');

//     // body: ip, updateId, userId
//     const body = req.body;

//     if (body.ip === undefined ||
//         body.updateId === undefined ||
//         body.userId === undefined) {
//         return res.status(403).json({
//             message: "minus body."
//         });
//     }
//     try {
//         const vpsList = await queueVPS.deleteOne({
//             ip: body.ip,
//             updateId: body.updateId,
//             userId: body.userId
//         })
//         return res.status(200).json(vpsList);
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             message: "Internal Server Error"
//         });
//     }
// });

// router.post("/changeIsRunning", async (req, res) => {
//     const today = dayjs().tz("Asia/Jakarta");

//     // body: ip, IsRunning
//     const body = req.body;

//     if (body.ip === undefined ||
//         body.IsRunning === undefined) {
//         return res.status(403).json({
//             message: "minus body."
//         });
//     }
//     try {
//         const vpsList = await VPS.updateOne({
//             ip: body.ip,
//         },{IsRunning: body.IsRunning, dateUp: today.format()})
//         return res.status(200).json(vpsList);
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             message: "Internal Server Error"
//         });
//     }
// });

module.exports = router;
