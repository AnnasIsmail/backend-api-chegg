const router = require("express").Router();
const axios = require("axios");
const users = require("../model/user");
const userLogs = require("../model/userLog");
const listUpdateId = require("../model/listUpdateId");
const logUpdateId = require("../model/logUpdateId");
const requestDay = require("../model/requestPerDay");
const VPS = require("../model/VPS");
const queueVPS = require("../model/queueVPS");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const isBetween = require("dayjs/plugin/isBetween");

dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Jakarta");
const myIp = "http://139.162.86.177:8000";

router.post("/check", async (req, res) => {
  const today = dayjs().tz();
  const formattedDate = today.format("YYYY-MM-DD");

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
    dateTime: today.format(),
  });
  if (isExistUpdateId) {
    return res.status(403).json({
      message: "UpdateId has already exist!",
      isExistUpdateId,
    });
  } else {
    await listUpdateId.insertMany({
      updateId: body.updateId,
      dateTime: today.format(),
      userId: body.userId,
    });
  }

  //Check Subscription of User
  const query = users.where({ userId: body.userId });
  const user = await query.findOne();
  if (user?.userId !== undefined) {
    if (!today.isBetween(dayjs(user.startDate), dayjs(user.endDate))) {
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
    date: formattedDate,
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
  if (vpsList?.isRunning == false) {
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
          dateUp: today.format(),
        }
      );

      axios
        .post(vpsList.ip === myIp ? "http://localhost:8000/" : vpsList.ip, {
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
    } catch (error) {
      statusCode = 500;
      responseData = {
        message: "Server Kami Sedang Error!",
        error: error.message,
        ip: vpsList.ip,
      };
    }
    return res.status(statusCode).json(responseData);
  } else {
    try {
      // Ambil semua antrian dari database
      const queues = await queueVPS.find();

      // Jika tidak ada antrian, gunakan IP dari permintaan
      let minIp;
      if (queues.length === 0) {
        minIp = req.body.ip;
      } else {
        // Hitung jumlah antrian untuk setiap IP
        const ipCounts = queues.reduce((acc, queue) => {
          acc[queue.ip] = (acc[queue.ip] || 0) + 1;
          return acc;
        }, {});

        // Cari IP dengan jumlah antrian paling sedikit
        minIp = null;
        let minCount = Infinity;
        for (const [ip, count] of Object.entries(ipCounts)) {
          if (count < minCount) {
            minIp = ip;
            minCount = count;
          }
        }
      }
      // Buat antrian baru dengan IP yang ditemukan
      const newQueue = await queueVPS.insertMany({
        ip: minIp,
        userId: req.body.userId,
        updateId: req.body.updateId,
        chatId: body.chatId,
        url: body.url,
        dateIn: today.format(),
      });

      return res.status(200).send({
        newQueue,
        queues,
        message: "Permintaan anda sedang kami proses",
      });
    } catch (error) {
      return res.status(500).send({
        error: error.message,
        message: "Mohon maaf. Server Kami Sedang Error!",
      });
    }
  }
});

router.post("/userRegister", async (req, res) => {
  const today = dayjs().tz();

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
        // if user active
        if (today.isBetween(userIdExist.startDate, userIdExist.endDate)) {
          const newEndDate = dayjs(userIdExist.endDate)
            .add(user.duration, "day")
            .set("hour", today.hour())
            .set("minute", today.minute());
          const newStartDate = dayjs(userIdExist.startDate)
            .set("hour", today.hour())
            .set("minute", today.minute());
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
              dateUp: today.format(),
            }
          );
          const userLog = await users.findOne({ code: body.code });
          const insertUserLog = await userLogs.insertMany([userLog]);
          return res.status(200).json({
            updatedUser,
            removeUser,
            message: `Terima Kasih anda sudah berlangganan, langganan anda mulai dari ${newStartDate.format(
              "dddd D MMMM YYYY HH:mm:ss"
            )} hingga ${newEndDate.format("dddd D MMMM YYYY HH:mm:ss")}`,
          });
        } else {
          const updatedUser = await users.updateOne(
            { code: body.code },
            {
              userId: body.userId,
              firstName: body.firstName,
              lastName: body.lastName,
              dateUp: today.format(),
            }
          );
          const userLog = await users.findOne({ code: body.code });
          const insertUserLog = await userLogs.insertMany([userLog]);
          return res.status(200).json({
            updatedUser,
            removeUser,
            message: `Terima Kasih anda sudah berlangganan, langganan anda mulai dari ${updatedUser.startDate.format(
              "dddd D MMMM YYYY HH:mm:ss"
            )} hingga ${updatedUser.endDate.format(
              "dddd D MMMM YYYY HH:mm:ss"
            )}`,
          });
        }
      } else {
        const updatedUser = await users.updateOne(
          { code: body.code },
          {
            userId: body.userId,
            firstName: body.firstName,
            lastName: body.lastName,
            dateUp: today.format(),
          }
        );
        const userLog = await users.findOne({ code: body.code });
        const insertUserLog = await userLogs.insertMany([userLog]);
        return res.status(200).json({
          updatedUser,
          message: `Terima Kasih anda sudah berlangganan, langganan anda mulai dari ${updatedUser.startDate.format(
            "dddd D MMMM YYYY HH:mm:ss"
          )} hingga ${updatedUser.endDate.format("dddd D MMMM YYYY HH:mm:ss")}`,
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
