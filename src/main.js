import { USDMClient, WebsocketClient } from 'binance';
import sendMessage from './telegram.js';
import logger from './logger.js';
import {
    timeFormatter,
    currencyFormatter,
    priceFormatter,
} from './formaters.js';

export default async (opts) => {
    logger.info('Bbot is started!');
    sendMessage('Bbot is started!', opts);

    const client = new USDMClient();
    const prices = await createPriceReader();

    const exchangeInfo = await client.getExchangeInfo();

    const symbols = exchangeInfo.symbols
        .filter(
            ({ symbol, status }) =>
                status === 'TRADING' && symbol.endsWith('USDT'),
        )
        .map(({ symbol }) => symbol);

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
        let topNegative = { symbol: 'N/A', change: 0, value: 0, price: 0 };
        let topPositive = { symbol: 'N/A', change: 0, value: 0, price: 0 };

        for await (const {
            symbol,
            openInterestChange,
            openInterestChangePercent,
            price,
            timestamp,
            error,
        } of symbols.map((symbol) =>
            getOpenInterestChange(client, symbol, openInterests, prices),
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
                        price: price,
                    };
                } else if (openInterestChangePercent < topNegative.change) {
                    topNegative = {
                        symbol,
                        value: openInterestChange,
                        change: openInterestChangePercent,
                        price: price,
                    };
                }
            }
        }

        logger.info(
            `Top positive: ${topPositive.symbol} ${topPositive.change.toFixed(2)}% (${currencyFormatter.format(topPositive.value)}) ${priceFormatter.format(topPositive.price)}. ` +
                `Top negative: ${topNegative.symbol} ${topNegative.change.toFixed(2)}% (${currencyFormatter.format(topNegative.value)}) ${priceFormatter.format(topNegative.price)}.`,
        );

        await sleep(opts.sleep);
    }
};

function createPriceReader() {
    const prices = {};

    return new Promise((resolve, reject) => {
        const wsClient = new WebsocketClient({
            beautify: true,
        });

        wsClient.on('open', (data) => {
            logger.info('Web Socket connection opened: ' + data?.wsKey);
        });

        wsClient.on('error', (data) => {
            logger.error('ws saw error ' + data?.wsKey);
            reject('ws saw error ' + data?.wsKey);
        });

        wsClient.on('formattedMessage', (data) => {
            data.forEach(({ symbol, markPrice }) => {
                prices[symbol] = markPrice;
            });

            resolve(prices);
        });

        wsClient.subscribeAllMarketMarkPrice('usdm', 3000);
    });
}

async function getOpenInterestChange(
    client,
    symbol,
    histOpenInterests,
    prices,
) {
    try {
        const price = prices[symbol] ?? 0;
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
