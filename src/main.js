import { USDMClient } from 'binance';
import sendMessage from './telegram.js';
import logger from './logger.js';

const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

const priceFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 6,
});

export default async (opts) => {
    logger.info('Bbot is started!');
    sendMessage('Bbot is started!', opts);

    const client = new USDMClient();

    const exchangeInfo = await client.getExchangeInfo();

    const symbols = exchangeInfo.symbols
        .filter(
            ({ symbol, status }) =>
                status === 'TRADING' && symbol.endsWith('USDT'),
        )
        .map(({ symbol }) => symbol);
    // const symbols = ['ATAUSDT', 'BTCUSDT', 'ETHUSDT', 'LTCUSDT'];
    // const symbols = ['ATAUSDT'];

    const openInterests = symbols.reduce((res, symbol) => {
        res[symbol] = {
            signals: 0,
            threshold: opts.threshold,
            interval: opts.interval * 60 * 1000,
            data: [],
        };
        return res;
    }, {});

    for (;;) {
        let topNegative = { symbol: 'N/A', change: 0, value: 0 };
        let topPositive = { symbol: 'N/A', change: 0, value: 0 };

        for await (const {
            symbol,
            openInterestChange,
            openInterestChangePercent,
            price,
            timestamp,
            error,
        } of symbols.map((symbol) =>
            getOpenInterestChange(client, symbol, openInterests),
        )) {
            if (error) {
                logger.error(`${symbol}: ${error}`);
            } else {
                if (
                    Math.abs(openInterestChangePercent) >=
                    openInterests[symbol].threshold
                ) {
                    openInterests[symbol].signals++;

                    const msg =
                        `https://binance.com/uk-UA/futures/${symbol}: OI change ${openInterestChangePercent.toFixed(2)}% ` +
                        `(${currencyFormatter.format(openInterestChange)}}). ` +
                        `Price: ${priceFormatter.format(price)}. ` +
                        `Time: ${timeFormatter.format(new Date(timestamp))}. Signal: ${openInterests[symbol].signals}`;
                    sendMessage(msg, opts);
                    logger.info(msg);

                    openInterests[symbol].data = [];
                }

                if (openInterestChangePercent > topPositive.change) {
                    topPositive = {
                        symbol,
                        value: openInterestChange,
                        change: openInterestChangePercent,
                    };
                } else if (openInterestChangePercent < topNegative.change) {
                    topNegative = {
                        symbol,
                        value: openInterestChange,
                        change: openInterestChangePercent,
                    };
                }
            }
        }

        logger.info(
            `Top positive: ${topPositive.symbol} ${topPositive.change.toFixed(2)}% (${currencyFormatter.format(topPositive.value)}). ` +
                `Top negative: ${topNegative.symbol} ${topNegative.change.toFixed(2)}% (${currencyFormatter.format(topNegative.value)}).`,
        );

        await sleep(opts.sleep);
    }
};

async function getOpenInterestChange(client, symbol, histOpenInterests) {
    try {
        const { price } = await client.getSymbolPriceTicker({ symbol });
        const { openInterest, time } = await client.getOpenInterest({ symbol });

        histOpenInterests[symbol].data = histOpenInterests[symbol].data.filter(
            ({ timestamp }) =>
                timestamp > time - histOpenInterests[symbol].interval,
        );

        histOpenInterests[symbol].data.push({
            symbol,
            openInterest: openInterest * price,
            timestamp: time,
        });

        const first = histOpenInterests[symbol].data[0];
        const last =
            histOpenInterests[symbol].data[
                histOpenInterests[symbol].data.length - 1
            ];

        const openInterestChange = last.openInterest - first.openInterest;
        const openInterestChangePercent =
            first.openInterest === 0
                ? 0
                : (openInterestChange / first.openInterest) * 100;

        let res = {
            symbol,
            openInterest: openInterest * price,
            openInterestChange,
            openInterestChangePercent,
            price,
            timestamp: time,
        };

        return res;
    } catch (ex) {
        return { symbol, error: ex.message };
    }
}

function sleep(s) {
    return new Promise((resolve) => setTimeout(resolve, s * 1000));
}
