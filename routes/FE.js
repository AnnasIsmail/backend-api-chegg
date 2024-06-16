const router = require("express").Router();
const users = require("../model/user");
const subscriptions = require("../model/subscription");
const VPS = require("../model/VPS");
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isBetween = require('dayjs/plugin/isBetween');

dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Jakarta");


router.post("/userRegister", async (req, res) => {
    const today = dayjs().tz("Asia/Jakarta");

    // body: code, subscription, quantity, price, startDate, endDate, maxRequestPerDay, duration
    const body = req.body;
    if(
        body.code === null || 
        body.subscription === null || 
        body.quantity === null || 
        body.price === null || 
        body.startDate === null || 
        body.endDate === null || 
        body.duration === null ||
        body.maxRequestPerDay === null
    ){
        return res.status(403).json({
            message: "Please Fill the Body"
        });
    }
    const userExist = await users.findOne({code: body.code});
    if(userExist?.code !== undefined){
        return res.status(403).json({
            message: "User Already Exist"
        });
    }
    const insertUser = await users.insertMany([
        {
            code: body.code,
            subscription: body.subscription,
            quantity: body.quantity,
            price: body.price,
            startDate: body.startDate,
            endDate: body.endDate,
            maxRequestPerDay: body.maxRequestPerDay,
            dateIn: today.format(),
            duration: body.duration,
            // Part of Lambda
            userId: undefined,
            firstName: undefined,
            lastName: undefined,
            dateUp: undefined
        }
    ]);
    return res.status(200).json({
        messageQuery: insertUser,
        message: "User Registered Successfully",
        exists: userExist
    });
});

router.post("/getSubscription", async (req, res) => {
    const subscriptionsList = await subscriptions.find({});
    if(subscriptionsList?.length === 0){
        return res.status(403).json({
            message: "List Not Found"
        });
    }
    return res.status(200).json(subscriptionsList);
});

router.post("/addSubscription", async (req, res) => {
    const today = dayjs().tz("Asia/Jakarta");

    // body: name, duration, price
    const body = req.body;
    if(body.name == undefined || 
        body.duration == undefined || body.duration == 0 ||
        body.price == undefined || body.price == 0
    ){
        return res.status(403).json({
            message: "Please Fill the Body"
        });
    }
    const subscriptionsList = await subscriptions.insertMany([{
        name: body.name,
        duration: body.duration,
        price: body.price,
        dateIn: today.format(),
        dateUp: undefined
    }]);
    return res.status(200).json(subscriptionsList);
});

router.post("/addVPS", async (req, res) => {
    const today = dayjs().tz("Asia/Jakarta");

    // body: ip, isRunning, isActive
    const body = req.body;
    if(body.ip == undefined || 
        body.isRunning == undefined || 
        body.isActive == undefined 
    ){
        return res.status(403).json({
            message: "Please Fill the Body"
        });
    }

    const subscriptionsList = await VPS.insertMany([{
        ip: body.ip,
        isRunning: body.isRunning,
        isActive: body.isActive,
        dateIn: today.format(),
        dateUp: undefined
    }]);
    return res.status(200).json(subscriptionsList);
});

router.post("/listUser", async (req, res) => {
    const today = dayjs().tz("Asia/Jakarta");
    const formattedDate = today.format('YYYY-MM-DD');
    let user = await users.find({});
    let activeUser = 0;
    let notActiveUser = 0;
    let notRegisteredYetUser = 0;

    user = user.map(x => {
        if(x.userId === undefined && x.firstName === undefined && x.lastName === undefined){
            notRegisteredYetUser += 1;
            x.status = "Not Registered Yet";
        }else if(today.isBetween(dayjs(x.startDate), dayjs(x.endDate))){
            activeUser += 1;
            x.status = "Active";
        }else if(!today.isBetween(dayjs(x.startDate), dayjs(x.endDate))){
            notActiveUser += 1;
            x.status = "Not Active";
        }
        return x;
    })

    return res.status(200).json({user, notRegisteredYetUser, activeUser, notActiveUser});
});

module.exports = router;