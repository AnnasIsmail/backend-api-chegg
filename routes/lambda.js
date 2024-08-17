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
const mongoose = require("mongoose");

const dbFormatDate = "DD MMMM YYYY";
const dbFormatDateTime = "YYYY-MM-DDTHH:mm:ss";
const userFormat = "dddd DD MMMM YYYY HH:mm:ss";

async function processVPSRequest(vpsList, body, today, res) {

  try {
    const testVPS = await axios
      .post(vpsList.ip + "/test", {}, { timeout: 30000 })
      .catch(async (error) => {
        return null; 
      });
      
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
      return false;
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
    return true
  } catch (error) {
    return false;
  }
}

router.post("/check", async (req, res) => {
  const today = momentTimeZone().tz("Asia/Jakarta");

  // body: updateId, userId, url, chatId, firstName, lastName
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

  //Check Update ID has Already Exist
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

  //Check Subscription of User
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
    statusCode = 500;
    responseData = {
      message:
        "There are currently a lot of requests on our server, please kindly wait about two minutes thank you",
      error: error.message,
      ip: vpsList.ip,
    };
  }

  //Check VPS
  const availableVPS = await VPS.find({ isRunning: false, isActive: true });
  if (availableVPS.length > 0) {
    for (const vps of availableVPS) {
      console.log(availableVPS.length);
    
      let statusCode = 200;
      let responseData = {};
    
      try {
        const requestVPS =  await processVPSRequest(vps, body, today, res);
    
        if (requestVPS) {
          responseData = {
            ip: vps.ip,
            message: "We are processing your request, kindly wait for the feedback",
          };
          return res.status(statusCode).json(responseData);
        }
      } catch (error) {
        console.error('Error processing VPS request:', error);
      }
    }
  }
    try {

      const vpsMoreThanFiveMinutes = await VPS.findOne({
        $and: [
          { userId: { $ne: "" } },
          { chatId: { $ne: "" } },
          { isActive: true },
          { isRunning: true },
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

      console.log("vpsMoreThanFiveMinutes",vpsMoreThanFiveMinutes);

      if (vpsMoreThanFiveMinutes) {
        const errorSend = await errorMessage.insertMany([
          {
            updateId: body.updateId,
            userId: body.userId,
            url: body.url,
            chatId: body.chatId,
            message: "VPS Error IP: " + vpsMoreThanFiveMinutes.ip + " vpsMoreThanFiveMinutes",
            dateIn: today.format(dbFormatDateTime),
          },
        ]);

        notifyAdmins(
          "VPS Error IP: " + vpsMoreThanFiveMinutes.ip + " Error ID: " + errorSend[0]._id + " vpsMoreThanFiveMinutes"
        );

        const vps = vpsMoreThanFiveMinutes;
        let statusCode = 200;
        let responseData = {};
        const requestVPS = await processVPSRequest(vps, body, today, res);

        if (requestVPS) {
          responseData = {
            ip: vps.ip,
            message: "We are processing your request, kindly wait for the feedback",
          };
          return res.status(statusCode).json(responseData);
        }
      }

      const activeVPS = await VPS.find({ isActive: true });
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

      const dataInsert = {
        userId: req.body.userId,
        updateId: req.body.updateId,
        chatId: body.chatId,
        url: body.url,
        dateIn: today.format(dbFormatDateTime),
      };

      const newQueue = await queueVPS.insertMany(dataInsert);
      const newQueueLog = await queueVPSLog.insertMany(dataInsert);

      return res.status(200).json({
        message:
          "We are processing your request, kindly wait for the feedback",
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