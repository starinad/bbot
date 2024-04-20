#!/usr/bin/env node

import bbot from '../src/main.js';
import { Command } from 'commander';

try {
    const program = new Command();

    program
        .name('bbot')
        .description('Bot for binance futures')
        .option('-i, --interval <interval>', 'Interval in seconds', 5)
        .option('-t, --threshold <threshold>', 'Threshold in %', 10)
        .option('-s, --sleep <sleep>', 'Sleep in seconds', 25)
        .option('--telegram-id <telegram-id>', 'Telegram ID')
        .option('--telegram-token <telegram-token>', 'Telegram token')
        .parse();

    console.log(`Running bot with the options:`);
    console.log(program.opts());

    await bbot(program.opts());
} catch (ex) {
    console.error(`Something went wrong: ${ex}`);
}
