const router = require("express").Router();
const users = require("../model/user");
const subscriptions = require("../model/subscription");
const VPS = require("../model/VPS");
const moment = require('moment');
const momentTimeZone = require('moment-timezone');
const formatDate = "DD MMMM YYYY";
const formatDateTime = "dddd DD MMMM YYYY HH:mm:ss";
const dbFormatDateTime = "YYYY-MM-DDTHH:mm:ss";
const errorMessage = require("../model/errorMessage");

router.post("/userRegister", async (req, res) => {
    const today = momentTimeZone().tz("Asia/Jakarta");

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
        body.maxRequestPerDay === null ||
        body.email === null ||
        body.phoneNumber === null
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
            dateIn: today.format(formatDateTime),
            duration: body.duration,
            phoneNumber: body.phoneNumber,
            email: body.email,
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
    const today = momentTimeZone().tz("Asia/Jakarta");

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
        dateIn: today.format(formatDateTime),
        dateUp: undefined
    }]);
    return res.status(200).json(subscriptionsList);
});

router.post("/addVPS", async (req, res) => {
    const today = momentTimeZone().tz("Asia/Jakarta");

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
        dateIn: today.format(formatDateTime),
        dateUp: undefined
    }]);
    return res.status(200).json(subscriptionsList);
});

router.post("/listUser", async (req, res) => {
    const today = momentTimeZone().tz("Asia/Jakarta");

    let user = await users.find({});
    let activeUser = 0;
    let notActiveUser = 0;
    let notRegisteredYetUser = 0;

    user = user.map(x => {
        if(x.userId === undefined && x.firstName === undefined && x.lastName === undefined){
            notRegisteredYetUser += 1;
            x.status = "Not Registered Yet";
        }else if(today.isBetween(moment(x.startDate, dbFormatDateTime), moment(x.endDate, dbFormatDateTime))){
            activeUser += 1;
            x.status = "Active";
        }else if(!today.isBetween(moment(x.startDate, dbFormatDateTime), moment(x.endDate, dbFormatDateTime))){
            notActiveUser += 1;
            x.status = "Not Active";
        }
        return x;
    })

    return res.status(200).json({user, notRegisteredYetUser, activeUser, notActiveUser});
});

router.post("/listError", async (req, res) => {
    const today = momentTimeZone().tz("Asia/Jakarta");
    
    try {
        // Ambil data dari koleksi errormessages dan klasifikasikan berdasarkan userId
        const errors = await errorMessage.aggregate([
            {
                $group: {
                    _id: "$userId",
                    errors: {
                        $push: "$$ROOT"  // Mengambil semua field di dalam dokumen
                    }
                }
            },
            {
                $project: {
                    errors: {
                        $slice: [
                            { $sortArray: { input: "$errors", sortBy: { dateIn: -1 } } }, 
                            10 // Misalnya ambil 10 error terbaru, sesuaikan dengan kebutuhan Anda
                        ]
                    }
                }
            },
            { $sort: { "errors.0.dateIn": -1 } } // Sort berdasarkan dateIn dari error terbaru (errors yang pertama)
        ]);

        // Ambil detail user berdasarkan userId
        const results = await Promise.all(errors.map(async error => {
            const user = await users.findOne({ userId: error._id });
            return {
                user,
                errors: error.errors
            };
        }));

        res.json(results);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


module.exports = router;