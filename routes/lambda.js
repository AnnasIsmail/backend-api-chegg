const router = require("express").Router();
const axios = require("axios");
const users = require("../model/user");
const userLogs = require("../model/userLog");
const listUpdateId = require("../model/listUpdateId");
const logUpdateId = require("../model/logUpdateId");
const requestDay = require("../model/requestPerDay");
const VPS = require("../model/VPS");
const queueVPS = require("../model/queueVPS");
const queueVPSLog = require("../model/queueVPSLog");
const moment = require('moment');
const momentTimeZone = require('moment-timezone');
const formatDate = "DD MMMM YYYY";
const formatDateTime = "dddd DD MMMM YYYY HH:mm:ss";

router.post("/check", async (req, res) => {
  const today = momentTimeZone().tz("Asia/Jakarta");

  // body: updateId, userId, url, chatId
  const body = req.body;

  if (
    body.updateId == undefined ||
    body.userId == undefined ||
    body.url == undefined ||
    body.chatId == undefined
  ) {
    return res.status(403).json({
      message: "Minus Body Request.",
    });
  }

  //Check Update ID has Already Exist
  const isExistUpdateId = await listUpdateId.findOne({
    updateId: body.updateId,
  });
  await logUpdateId.insertMany({
    updateId: body.updateId,
    dateTime: today.format(formatDateTime),
  });
  if (isExistUpdateId) {
    return res.status(403).json({
      message: "UpdateId has already exist!",
      isExistUpdateId,
    });
  } else {
    await listUpdateId.insertMany({
      updateId: body.updateId,
      dateTime: today.format(formatDateTime),
      userId: body.userId,
    });
  }

  //Check Subscription of User
  const query = users.where({ userId: body.userId });
  const user = await query.findOne();
  if (user?.userId !== undefined) {
    const startDate = moment(user.startDate, "dddd DD MMMM YYYY HH:mm:ss");
    const endDate = moment(user.endDate, "dddd DD MMMM YYYY HH:mm:ss");
    if (today.isBetween(startDate, endDate, null, '()')) {
      return res.status(403).json({
        message: "Langganan anda sudah kadaluarsa.",
        user,
      });
    }
  } else {
    return res.status(403).json({
      message: "Anda belum terdaftar sebagai pelanggan.",
    });
  }

  // Check Request Per Day
  const LatestRequest = await requestDay.findOne({
    userId: body.userId,
    date: today.format(formatDate),
  });
  if (LatestRequest?.userId) {
    if (
      LatestRequest.requestOrderDay == LatestRequest.maxRequestPerDay ||
      LatestRequest.requestOrderDay > LatestRequest.maxRequestPerDay
    ) {
      return res.status(403).json({
        message: "Request kamu sudah mencapai maksimum.",
      });
    }
  }

  try {
    const vpsAlreadyExist = await VPS.findOne({ userId: body.userId });
    const QueueVPSVpsAlreadyExist = await queueVPS.findOne({
      userId: body.userId,
    });

    if (vpsAlreadyExist || QueueVPSVpsAlreadyExist) {
      return res.status(201).send({
        message:
          "Permintaan anda sebelumnya sedang kami proses, mohon menunggu sampai selesai.",
      });
    }
  } catch (error) {
    statusCode = 500;
    responseData = {
      message: "Server Kami Sedang Error!",
      error: error.message,
      ip: vpsList.ip,
    };
  }

  //Check VPS
  const vpsList = await VPS.findOne({ isRunning: false });
  if (vpsList) {
    let response = {};
    let statusCode = 200; // Default status code
    let responseData = {};

    try {
      await VPS.updateOne(
        { ip: vpsList.ip },
        {
          isRunning: true,
          userId: body.userId,
          updateId: body.updateId,
          chatId: body.chatId,
          url: body.url,
          dateUp: today.format(formatDateTime),
        }
      );

      axios
        .post(vpsList.ip, {
          url: body.url,
          id: body.updateId,
          chatId: body.chatId,
          userId: body.userId,
        })
        .catch((error) => {
          console.error("Error on axios.post:", error);
        });
      responseData = {
        ip: vpsList.ip,
        message: "Permintaan anda sedang kami proses",
      };
      res.status(statusCode).json(responseData);
    } catch (error) {
      statusCode = 500;
      responseData = {
        message: "Server Kami Sedang Error!",
        error: error.message,
        ip: vpsList.ip,
      };
      res.status(statusCode).json(responseData);
    }
    return true;
  } else {
    try {
      const activeVPS = await VPS.find({ isActive: true });

      if (activeVPS.length === 0) {
        throw new Error("Tidak ada VPS yang aktif.");
      }

      const queueCounts = await queueVPS.aggregate([
        { $match: { ip: { $in: activeVPS.map((vps) => vps.ip) } } },
        { $group: { _id: "$ip", count: { $sum: 1 } } },
      ]);

      const queueMap = {};
      queueCounts.forEach((q) => {
        queueMap[q._id] = q.count;
      });

      let targetVPS = activeVPS.find((vps) => !(vps.ip in queueMap));

      if (!targetVPS) {
        targetVPS = activeVPS[0];
        let minQueueCount = queueMap[targetVPS.ip] || 0;

        activeVPS.forEach((vps) => {
          const count = queueMap[vps.ip] || 0;
          if (count < minQueueCount) {
            targetVPS = vps;
            minQueueCount = count;
          }
        });
      }
      const dataInsert = {
        ip: minIp,
        userId: req.body.userId,
        updateId: req.body.updateId,
        chatId: body.chatId,
        url: body.url,
        dateIn: today.format(formatDateTime),
      }
      const newQueue = await queueVPS.insertMany(dataInsert);
      const newQueueLog = await queueVPSLog.insertMany(dataInsert);

      const targetQueueCount = queueMap[targetVPS.ip] || 0;

      return res.status(200).json({ message: targetQueueCount > 4 ? "Anda dalam antrian " + targetQueueCount + ", mohon kesediaanya untuk menunggu." 
        : "Permintaan anda sedang kami proses" });
    } catch (error) {
      return res.status(500).json({ message: "Mohon maaf. Server Kami Sedang Error!" });
    }
  }
});

router.post("/userRegister", async (req, res) => {
  const today = momentTimeZone().tz("Asia/Jakarta");

  // body: userId, firstName, lastName, maxRequestPerDay
  const body = req.body;

  if (
    body.userId === undefined ||
    body.firstName === undefined ||
    body.lastName === undefined ||
    body.code === undefined
  ) {
    return res.status(403).json({
      message: "minus body.",
    });
  }

  try {
    const user = await users.findOne({ code: body.code });

    if (user) {
      if (user.userId !== undefined) {
        return res.status(403).json({
          message: "User was registered",
        });
      }

      const userIdExist = await users.findOne({ userId: body.userId });
      // if user repeat order
      if (userIdExist?.userId !== undefined) {
        const removeUser = await users.deleteOne({ userId: body.userId });
        const startDate = moment(userIdExist.startDate, "dddd DD MMMM YYYY HH:mm:ss");
        const endDate = moment(userIdExist.endDate, "dddd DD MMMM YYYY HH:mm:ss");
        // if user active
        if (today.isBetween(startDate, endDate, null, '[]')) {
          const newEndDate = moment(userIdExist.endDate)
            .add(user.duration, "day")
            .set("hour", today.hour())
            .set("minute", today.minute())
            .format(formatDateTime);
          const newStartDate = moment(userIdExist.startDate)
            .set("hour", today.hour())
            .set("minute", today.minute())
            .format(formatDateTime);
          const maxRequestPerDay =
            user.maxRequestPerDay > userIdExist.maxRequestPerDay
              ? user.maxRequestPerDay
              : userIdExist.maxRequestPerDay;
          const updatedUser = await users.updateOne(
            { code: body.code },
            {
              userId: body.userId,
              firstName: body.firstName,
              lastName: body.lastName,

              quantity: user.quantity + userIdExist.quantity,
              duration: user.duration + userIdExist.duration,
              price: user.price + userIdExist.price,
              startDate: newStartDate,
              maxRequestPerDay,
              endDate: newEndDate,
              dateUp: today.format(formatDateTime),
            }
          );
          const userLog = await users.findOne({ code: body.code });
          const insertUserLog = await userLogs.insertMany([userLog]);
          return res.status(200).json({
            today,
            updatedUser,
            removeUser,
            message: `Terima Kasih anda sudah berlangganan, langganan anda mulai dari ${newStartDate} hingga ${newEndDate}`,
          });
        } else {
          const newEndDate = moment(user.endDate)
            .set("hour", today.hour())
            .set("minute", today.minute())
            .format(formatDateTime);
          const newStartDate = moment(user.startDate)
            .set("hour", today.hour())
            .set("minute", today.minute())
            .format(formatDateTime);
          const updatedUser = await users.updateOne(
            { code: body.code },
            {
              userId: body.userId,
              firstName: body.firstName,
              lastName: body.lastName,
              startDate: newStartDate,
              endDate: newEndDate,
              dateUp: today.format(),
            }
          );
          const userLog = await users.findOne({ code: body.code });
          const insertUserLog = await userLogs.insertMany([ userLog ]);
          return res.status(200).json({
            today,
            updatedUser,
            removeUser,
            message: `Terima Kasih anda sudah berlangganan, langganan anda mulai dari ${newStartDate} hingga ${newEndDate}`,
          });
        }
      } else {
        const newEndDate = moment(user.endDate)
          .set("hour", today.hour())
          .set("minute", today.minute())
          .format(formatDateTime);
        const newStartDate = moment(user.startDate)
          .set("hour", today.hour())
          .set("minute", today.minute())
          .format(formatDateTime);
        const updatedUser = await users.updateOne(
          { code: body.code },
          {
            userId: body.userId,
            firstName: body.firstName,
            lastName: body.lastName,
            startDate: newStartDate,
            endDate: newEndDate,
            dateUp: today.format(formatDateTime),
          }
        );
        const userLog = await users.findOne({ code: body.code });
        const insertUserLog = await userLogs.insertMany([ userLog ]);
        return res.status(200).json({
          today,
          updatedUser,
          message: `Terima Kasih anda sudah berlangganan, langganan anda mulai dari ${newStartDate} hingga ${newEndDate}`,
        });
      }
    } else {
      return res.status(403).json({
        message: "Kode tidak terdaftar!",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

module.exports = router;
