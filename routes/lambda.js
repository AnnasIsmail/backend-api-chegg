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
const { notifyAdmins } = require("../funstion/sendMessageToAdmin ");
const errorMessage = require("../model/errorMessage");
const momentTimeZone = require("moment-timezone");
const sendMessageToAdmin = require("../funstion/sendMessageToAdmin ");

const dbFormatDate = "DD MMMM YYYY";
const dbFormatDateTime = "YYYY-MM-DDTHH:mm:ss";
const userFormat = "dddd DD MMMM YYYY HH:mm:ss";

// Fungsi untuk melakukan request ke endpoint /test
async function testVPSEndpoint(ip) {
  try {
    const response = await axios.post(ip + "/test", {}, { timeout: 30000 });
    return response;
  } catch (error) {
    console.error("Error on axios.post /test:", error);
    return { statusCode: 404 }; // Perbaikan di sini
  }
}

// Fungsi untuk melakukan request ke endpoint utama
async function mainVPSEndpoint(ip, data) {
  try {
    const response = await axios.post(ip, data);
    return response;
  } catch (error) {
    console.error("Error on axios.post main endpoint:", error);
    return { statusCode: 404 }; // Perbaikan di sini
  }
}

router.post("/check", async (req, res) => {
  const today = momentTimeZone().tz("Asia/Jakarta");

  const body = req.body;

  if (
    body.updateId == undefined ||
    body.userId == undefined ||
    body.url == undefined ||
    body.chatId == undefined ||
    body.firstName == undefined ||
    body.lastName == undefined
  ) {
    return res.status(403).json({
      message: "Minus Body Request.",
    });
  }

  // Check Update ID has Already Exist
  const isExistUpdateId = await listUpdateId.findOne({
    updateId: body.updateId,
  });
  await logUpdateId.insertMany({
    updateId: body.updateId,
    userId: body.userId,
    chatId: body.chatId,
    url: body.url,
    date: today.format(dbFormatDate),
    dateIn: today.format(dbFormatDateTime),
  });
  if (isExistUpdateId) {
    return res.status(200).json({
      message: "UpdateId has already exist!",
      isExistUpdateId,
    });
  } else {
    await listUpdateId.insertMany({
      updateId: body.updateId,
      userId: body.userId,
      chatId: body.chatId,
      url: body.url,
      date: today.format(dbFormatDate),
      dateIn: today.format(dbFormatDateTime),
    });
  }

  // Check Subscription of User
  const query = users.where({ userId: body.userId });
  const user = await query.findOne();
  if (user?.userId !== undefined) {
    const startDate = momentTimeZone.tz(
      user.startDate,
      dbFormatDateTime,
      "Asia/Jakarta"
    );
    const endDate = momentTimeZone.tz(
      user.endDate,
      dbFormatDateTime,
      "Asia/Jakarta"
    );
    if (!today.isBetween(startDate, endDate, null, "[]")) {
      return res.status(200).json({
        message: `Halo ${body.firstName} ${body.lastName}, thank you for being member. Currently your member status are expired and we’re waiting for your next feedback -TechSolutionID`,
        user,
      });
    }
  } else {
    return res.status(200).json({
      message: `Halo ${body.firstName} ${body.lastName}, thank you for reaching us. Currently you are not member of our subscription services, kindly contact us on https://linktr.ee/techsolutionid`,
    });
  }

  // Check Request Per Day
  const LatestRequest = await requestDay.findOne({
    userId: body.userId,
    date: today.format(dbFormatDate),
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
          "Your previous request is being processed by us, please wait until it is complete thank you",
      });
    }
  } catch (error) {
    const statusCode = 500;
    const responseData = {
      message:
        "There are currently a lot of requests on our server, please kindly wait about two minutes thank you",
      error: error.message,
      ip: vpsList.ip,
    };
    return res.status(statusCode).json(responseData);
  }

  // Check VPS
  const vpsList = await VPS.findOne({ isRunning: false, isActive: true });
  if (vpsList) {
    let statusCode = 200; // Default status code
    let responseData = {};

    try {
      const testVPS = await testVPSEndpoint(vpsList.ip);

      if (testVPS?.data.statusCode !== 200) {
        const errorSend = await errorMessage.insertMany([
          {
            updateId: body.updateId,
            userId: body.userId,
            url: body.url,
            chatId: body.chatId,
            message: "VPS tidak bisa dihubungi IP: " + vpsList.ip,
            dateIn: today.format(dbFormatDateTime),
          },
        ]);

        notifyAdmins(
          "VPS tidak bisa dihubungi IP: " +
            vpsList.ip +
            " Error ID: " +
            errorSend[0]._id
        );
        await VPS.updateOne(
          { ip: vpsList.ip },
          {
            isRunning: false,
            isActive: false,
            errorId: errorSend[0]._id,
            url: body.url,
            dateUp: today.format(dbFormatDateTime),
          }
        );
        return res.status(200).json({
          message:
            "We are experiencing server maintenance. Please send the url again, thank you",
        });
      }
      await VPS.updateOne(
        { ip: vpsList.ip },
        {
          isRunning: true,
          userId: body.userId,
          updateId: body.updateId,
          chatId: body.chatId,
          url: body.url,
          dateUp: today.format(dbFormatDateTime),
        }
      );

      await mainVPSEndpoint(vpsList.ip, {
        url: body.url,
        id: body.updateId,
        chatId: body.chatId,
        userId: body.userId,
      });

      responseData = {
        ip: vpsList.ip,
        message: "We are processing your request, kindly wait for the feedback",
      };
      res.status(statusCode).json(responseData);
    } catch (error) {
      const errorSend = await errorMessage.insertMany([
        {
          updateId: body.updateId,
          userId: body.userId,
          url: body.url,
          chatId: body.chatId,
          message: "VPS Error IP: " + vpsList.ip + " " + error,
          dateIn: today.format(dbFormatDateTime),
        },
      ]);

      notifyAdmins(
        "VPS Error IP: " + vpsList.ip + " Error ID: " + errorSend[0]._id
      );

      statusCode = 500;
      responseData = {
        message:
          "We are experiencing server maintenance. Please send the url again, thank you",
        error: error.message,
        ip: vpsList.ip,
      };
      res.status(statusCode).json(responseData);
    }
    return true;
  } else {
    try {
      const activeVPS = await VPS.find({ isActive: true });
      console.log(activeVPS);
      if (activeVPS.length === 0) {
        const errorSend = await errorMessage.insertMany([
          {
            updateId: body.updateId,
            userId: body.userId,
            url: body.url,
            chatId: body.chatId,
            message: "VPS tidak ada yang aktif ",
            dateIn: today.format(dbFormatDateTime),
          },
        ]);

        notifyAdmins(
          "VPS tidak ada yang aktif, mohon bantuannya gaes." +
            " Error ID: " +
            errorSend[0]._id
        );
        return res.status(200).json({
          message:
            "We are experiencing server maintenance. Please send the url again, thank you",
        });
      }

      const vpsMoreThanFiveMinutes = await VPS.findOne({
        $and: [
          { userId: { $ne: null } },
          { chatId: { $ne: null } },
          {
            $expr: {
              $gt: [
                {
                  $dateFromString: { dateString: "$dateUp" }
                },
                momentTimeZone().subtract(5, 'minutes').toDate()
              ]
            }
          }
        ]
      });

      if (vpsMoreThanFiveMinutes) {
        let statusCode = 200; // Default status code
        let responseData = {};
    
        try {
            // Mengirim request ke endpoint /test untuk mengecek apakah VPS yang sudah berjalan lebih dari 5 menit masih aktif
            const testVPS = await testVPSEndpoint(vpsMoreThanFiveMinutes.ip);
    
            if (testVPS?.data.statusCode !== 200) {
                // Jika VPS tidak bisa dihubungi, kirim notifikasi dan update status VPS
                const errorSend = await errorMessage.insertMany([
                    {
                        updateId: body.updateId,
                        userId: body.userId,
                        url: body.url,
                        chatId: body.chatId,
                        message: "VPS tidak bisa dihubungi IP: " + vpsMoreThanFiveMinutes.ip,
                        dateIn: today.format(dbFormatDateTime),
                    },
                ]);
    
                notifyAdmins(
                    "VPS tidak bisa dihubungi IP: " +
                    vpsMoreThanFiveMinutes.ip +
                    " Error ID: " +
                    errorSend[0]._id
                );
                await VPS.updateOne(
                    { ip: vpsMoreThanFiveMinutes.ip },
                    {
                        isRunning: false,
                        isActive: false,
                        errorId: errorSend[0]._id,
                        url: body.url,
                        dateUp: today.format(dbFormatDateTime),
                    }
                );
                return res.status(200).json({
                    message:
                        "We are experiencing server maintenance. Please send the url again, thank you",
                });
            }
    
            // Jika VPS masih bisa dihubungi, update status VPS dan proses permintaan pengguna
            await VPS.updateOne(
                { ip: vpsMoreThanFiveMinutes.ip },
                {
                    isRunning: true,
                    userId: body.userId,
                    updateId: body.updateId,
                    chatId: body.chatId,
                    url: body.url,
                    dateUp: today.format(dbFormatDateTime),
                }
            );
    
            await mainVPSEndpoint(vpsMoreThanFiveMinutes.ip, {
                url: body.url,
                id: body.updateId,
                chatId: body.chatId,
                userId: body.userId,
            });
    
            responseData = {
                ip: vpsMoreThanFiveMinutes.ip,
                message: "We are processing your request, kindly wait for the feedback",
            };
            res.status(statusCode).json(responseData);
        } catch (error) {
            const errorSend = await errorMessage.insertMany([
                {
                    updateId: body.updateId,
                    userId: body.userId,
                    url: body.url,
                    chatId: body.chatId,
                    message: "VPS Error IP: " + vpsMoreThanFiveMinutes.ip + " " + error,
                    dateIn: today.format(dbFormatDateTime),
                },
            ]);
    
            notifyAdmins(
                "VPS Error IP: " + vpsMoreThanFiveMinutes.ip + " Error ID: " + errorSend[0]._id
            );
    
            statusCode = 500;
            responseData = {
                message:
                    "We are experiencing server maintenance. Please send the url again, thank you",
                error: error.message,
                ip: vpsMoreThanFiveMinutes.ip,
            };
            res.status(statusCode).json(responseData);
        }
        return true;
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
        ip: targetVPS.ip,
        userId: req.body.userId,
        updateId: req.body.updateId,
        chatId: body.chatId,
        url: body.url,
        dateIn: today.format(dbFormatDateTime),
      };

      const newQueue = await queueVPS.insertMany(dataInsert);
      const newQueueLog = await queueVPSLog.insertMany(dataInsert);
      const targetQueueCount = queueMap[targetVPS.ip] || 0;

      return res.status(200).json({
        message:
          targetQueueCount > 4
            ? "There are currently a lot of requests on our server, please kindly wait about " +
              targetQueueCount +
              " minutes thank you"
            : "We are processing your request, kindly wait for the feedback",
      });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({
          message:
            "We are experiencing server maintenance. Please send the url again, thank you",
        });
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
        const startDate = momentTimeZone.tz(
          userIdExist.startDate,
          dbFormatDateTime,
          "Asia/Jakarta"
        );
        const endDate = momentTimeZone.tz(
          userIdExist.endDate,
          dbFormatDateTime,
          "Asia/Jakarta"
        );
        // if user active
        if (today.isBetween(startDate, endDate, null, "[]")) {
          const newStartDate = momentTimeZone.tz(
            userIdExist.startDate,
            "Asia/Jakarta"
          );
          const newEndDate = momentTimeZone
            .tz(userIdExist.endDate, "Asia/Jakarta")
            .add(user.duration, "day")
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
              maxRequestPerDay,
              startDate: newStartDate.format(dbFormatDateTime),
              endDate: newEndDate.format(dbFormatDateTime),
              dateUp: today.format(dbFormatDateTime),
            }
          );
          const userLog = await users.findOne({ code: body.code });
          const insertUserLog = await userLogs.insertMany([userLog]);
          return res.status(200).json({
            today,
            updatedUser,
            removeUser,
            message: `Halo ${body.firstName} ${
              body.lastName
            }, thank you for being member. Your member duration start from ${newStartDate.format(
              userFormat
            )} until ${newEndDate.format(userFormat)}`,
          });
        } else {
          const newStartDate = today.clone();
          const newEndDate = today.clone().add(user.duration, "day");
          const updatedUser = await users.updateOne(
            { code: body.code },
            {
              userId: body.userId,
              firstName: body.firstName,
              lastName: body.lastName,
              startDate: newStartDate.format(dbFormatDateTime),
              endDate: newEndDate.format(dbFormatDateTime),
              dateUp: today.format(),
            }
          );
          const userLog = await users.findOne({ code: body.code });
          const insertUserLog = await userLogs.insertMany([userLog]);
          return res.status(200).json({
            today,
            updatedUser,
            removeUser,
            message: `Halo ${body.firstName} ${
              body.lastName
            }, thank you for being member. Your member duration start from ${newStartDate.format(
              userFormat
            )} until ${newEndDate.format(userFormat)}`,
          });
        }
      } else {
        const newStartDate = today.clone();
        const newEndDate = today.clone().add(user.duration, "day");
        const updatedUser = await users.updateOne(
          { code: body.code },
          {
            userId: body.userId,
            firstName: body.firstName,
            lastName: body.lastName,
            startDate: newStartDate.format(dbFormatDateTime),
            endDate: newEndDate.format(dbFormatDateTime),
            dateUp: today.format(dbFormatDateTime),
          }
        );
        const userLog = await users.findOne({ code: body.code });
        const insertUserLog = await userLogs.insertMany([userLog]);
        return res.status(200).json({
          today,
          updatedUser,
          message: `Halo ${body.firstName} ${
            body.lastName
          }, thank you for being member. Your member duration start from ${newStartDate.format(
            userFormat
          )} until ${newEndDate.format(userFormat)}`,
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

router.post("/durasiUser", async (req, res) => {
  const today = momentTimeZone().tz("Asia/Jakarta");

  // body: userId, firstName, lastName
  const body = req.body;

  if (
    body.userId === undefined ||
    body.firstName == undefined ||
    body.lastName == undefined
  ) {
    return res.status(403).json({
      message: "minus body.",
    });
  }
  try {
    const user = await users.findOne({ userId: body.userId });
    if (user) {
      const startDate = momentTimeZone.tz(
        user.startDate,
        dbFormatDateTime,
        "Asia/Jakarta"
      );
      const endDate = momentTimeZone.tz(
        user.endDate,
        dbFormatDateTime,
        "Asia/Jakarta"
      );
      if (!today.isBetween(startDate, endDate, null, "[]")) {
        return res.status(200).json({
          message: `Halo ${body.firstName} ${body.lastName}, thank you for being member. Currently your member status are expired and we’re waiting for your next feedback -TechSolutionID`,
          user,
        });
      }
      return res.status(200).json({
        user,
        message: `Halo ${body.firstName} ${
          body.lastName
        }, thank you for being member. Your member duration start from ${startDate.format(
          userFormat
        )} until ${endDate.format(userFormat)}`,
      });
    } else {
      return res.status(403).json({
        message: `Halo ${body.firstName} ${body.lastName}, thank you for reaching us. Currently you are not member of our subscription services, kindly contact us on https://linktr.ee/techsolutionid`,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message:
        "We are experiencing server maintenance. Please send the url again, thank you",
    });
  }
});

module.exports = router;
