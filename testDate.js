const moment = require('moment');
const momentTimeZone = require('moment-timezone');

const today = momentTimeZone().tz("Asia/Jakarta");
const startDate = moment('Sunday 16 June 2024 11:59:00', "dddd DD MMMM YYYY HH:mm:ss");
const endDate = moment('Saturday 22 June 2024 18:59:00', "dddd DD MMMM YYYY HH:mm:ss");
console.log(today.isBetween(startDate, endDate, null, '[]'));