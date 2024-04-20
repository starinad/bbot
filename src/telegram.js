import TelegramBot from 'node-telegram-bot-api';
let bot;

export default async (message, { telegramId, telegramToken }) => {
    if (telegramId && telegramToken) {
        try {
            bot ??= new TelegramBot(telegramToken, { polling: false });
            await bot.sendMessage(telegramId, message);
        } catch (ex) {
            console.error(`Could not send message: ${ex.message}`);
        }
    }
};
