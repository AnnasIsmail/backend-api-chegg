const router = require("express").Router();
const users = require("../model/user");
const listUpdateId = require("../model/listUpdateId");
const logUpdateId = require("../model/logUpdateId");
const requestDay = require("../model/requestPerDay");
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isBetween = require('dayjs/plugin/isBetween');

dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Jakarta");


router.post("/check", async (req, res) => {
    const today = dayjs().tz();
    const formattedDate = today.format('YYYY-MM-DD');

    // body: updateId, userId
    const body = req.body;

    if(!body.updateId || !body.userId){
        return res.status(403).json({
            message: "updateId or userId not found!"
        });
    }
    
    //Check Update ID has Already Exist
    const isExistUpdateId = await listUpdateId.findOne({ updateId: body.updateId})
    await logUpdateId.insertMany({ updateId: body.updateId, dateTime: today.format()})
    if(isExistUpdateId){
        return res.status(403).json({
            message: "UpdateId has already exist!",
            isExistUpdateId
        });
    }else{
        await listUpdateId.insertMany({ 
            updateId: body.updateId, 
            dateTime: today.format(),
            userId: body.userId
        })
    }

    //Check Subscription of User
    const query = users.where({ userId: body.userId });
    const user = await query.findOne();
    if(user?.userId !== undefined){
        if (!today.isBetween(user.startDate, user.endDate)) {
            return res.status(403).json({
                message: "User Has Expired",
                user
            });
        }
    }else{
        return res.status(403).json({
            message: "User not found!"
        });
    }

    // Check Request Per Day
    const LatestRequest = await requestDay.findOne({ userId: body.userId, date: formattedDate })
    if(LatestRequest?.userId){
        if(LatestRequest.requestOrderDay == LatestRequest.maxRequestPerDay || LatestRequest.requestOrderDay > LatestRequest.maxRequestPerDay){
            return res.status(403).json({
                message: "Your request has reached the maximum" 
            });
        }
    }

    return res.status(200).json({
        message: "The user has met the requirements"
    });
});

router.post("/requestPerDay", async (req, res) => {
    const today = dayjs().tz();
    const formattedDate = today.format('YYYY-MM-DD');

    // body: userId, updateId
    const body = req.body;

    if(!body.updateId || !body.userId){
        return res.status(403).json({
            message: "updateId or userId not found!"
        });
    }

    //Check Exist RequestID
    const LatestRequest = await requestDay.findOne({ userId: body.userId, date: formattedDate })
    let result = [];
    if(LatestRequest?.userId){
        const requestOrderDay = LatestRequest.requestOrderDay + 1;
        result = await requestDay.updateOne(
            { 
                userId: body.userId, 
                date: formattedDate
            },
            { requestOrderDay });
    }else{
        const query = users.where({ userId: body.userId });
        const user = await query.findOne();
        await requestDay.insertMany([
            { 
                userId: body.userId, 
                date: formattedDate, 
                requestOrderDay: 1, 
                maxRequestPerDay: 
                user.maxRequestPerDay 
            }
        ]);
    }

    return res.status(200).json({
        message: "Request Per Day Updated Successfully"
    });
});

router.post("/userRegister", async (req, res) => {
    const today = dayjs().tz();

    // body: userId, firstName, lastName, maxRequestPerDay
    const body = req.body;

    if (body.userId === undefined || 
        body.firstName === undefined || 
        body.lastName === undefined || 
        body.code === undefined) {
        return res.status(403).json({
            message: "minus body."
        });
    }

    try {
        const user = await users.findOne({ code: body.code });

        if (user) {
            if (user.userId !== undefined) {
                return res.status(403).json({
                    message: "User was registered"
                });
            }

            const userIdExist = await users.findOne({ userId: body.userId });

            // if user repeat order
            if(userIdExist?.userId !== undefined){
                const removeUser = await users.deleteOne({ userId: body.userId })
                // if user active
                if(today.isBetween(userIdExist.startDate, userIdExist.endDate)){
                    const newEndDate = dayjs(userIdExist.endDate).add(user.duration, 'day').format();
                    const maxRequestPerDay = (user.maxRequestPerDay > userIdExist.maxRequestPerDay)? user.maxRequestPerDay : userIdExist.maxRequestPerDay;
                    const updatedUser = await users.updateOne(
                        { code: body.code },
                        {
                            userId: body.userId,
                            firstName: body.firstName,
                            lastName: body.lastName,

                            quantity: user.quantity+userIdExist.quantity,
                            duration: user.duration+userIdExist.duration,
                            price: user.price+userIdExist.price,
                            startDate: userIdExist.startDate,
                            maxRequestPerDay,
                            endDate: newEndDate,
                            dateUp: today.format()
                    });
                    return res.status(200).json({updatedUser, removeUser});
                }else{
                    const updatedUser = await users.updateOne(
                        { code: body.code },
                        {
                            userId: body.userId,
                            firstName: body.firstName,
                            lastName: body.lastName,
                            dateUp: today.format()
                    });
                    return res.status(200).json({updatedUser, removeUser});
                }
            }else{
                const updatedUser = await users.updateOne(
                    { code: body.code },
                    {
                        userId: body.userId,
                        firstName: body.firstName,
                        lastName: body.lastName,
                        dateUp: today.format()
                });
                return res.status(200).json(updatedUser);
            }
        } else {
            return res.status(403).json({
                message: "Code Not Found"
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

module.exports = router;