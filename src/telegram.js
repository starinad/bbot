import TelegramBot from 'node-telegram-bot-api';
const token = '6992458611:AAFar6_0KdR0YpEN1COE8IOmMMK5MvKnnIc';
const id = '500195639';
const bot = new TelegramBot(token, { polling: false });

export default async (message) => {
    try {
        await bot.sendMessage(id, message);
    } catch (ex) {
        console.error(`Could not send message: ${ex.message}`);
    }
};

// bot.onText(/\/start/, (msg) => {
//     console.log(msg.chat.id);
//     bot.sendMessage(
//         msg.chat.id,
//         'Hello, this is a message from your Telegram bot.',
//     );
// });
