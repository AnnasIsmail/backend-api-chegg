const axios = require('axios');
const mongoose = require('mongoose');
const Admin =  require("../model/admin");

const urlTelegram = 'https://api.telegram.org/bot6740331088:AAHkgEEOjVkKLBhvpcHhTZw-o4Iq7CM4pzc/sendMessage';

const sendMessageToAdmin = async (chatId, text) => {
    const payloadTelegramBot = {
        chat_id: chatId,
        text: text
    };

    try {
        const response = await axios.post(urlTelegram, payloadTelegramBot);
    } catch (error) {
        console.error(`Error sending message to ${chatId}:`, error);
    }
};

const notifyAdmins = async (text) => {
    try {
        const adminList = await Admin.find();

        for (const admin of adminList) {
            await sendMessageToAdmin(admin.chatId, text);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error connecting to MongoDB or sending messages:', error);
    }
};

module.exports = {
    sendMessageToAdmin,
    notifyAdmins
};
