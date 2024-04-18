const TelegramBot = require('node-telegram-bot-api');
const token = 'YOUR_BOT_TOKEN';
const bot = new TelegramBot(token, { polling: true });

bot.sendMessage(
    'USER_CHAT_ID',
    'Hello, this is a message from your Telegram bot.',
);
