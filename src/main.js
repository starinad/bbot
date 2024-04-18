import { USDMClient } from 'binance';

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

export default async () => {
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
            threshold: 0.1,
            interval: 180 * 1000, // 3m
            data: [],
        };
        return res;
    }, {});

    for (;;) {
        for await (const {
            symbol,
            openInterest,
            change,
            price,
            timestamp,
            error,
        } of symbols.map((symbol) =>
            getOpenInterestChange(client, symbol, openInterests),
        )) {
            if (error) {
                console.error(`${symbol}: ${error}`);
            } else {
                if (Math.abs(change) >= openInterests[symbol].threshold) {
                    openInterests[symbol].signals++;

                    console.log(
                        `https://binance.com/uk-UA/futures/${symbol}: OI change ${change.toFixed(2)}% (${currencyFormatter.format((openInterest * change) / 100.0)}). ` +
                            `Price: ${priceFormatter.format(price)}. ` +
                            `Time: ${timeFormatter.format(new Date(timestamp))}. Signal: ${openInterests[symbol].signals}`,
                    );

                    openInterests[symbol].data = [];
                }
            }
        }

        await sleep(15000);
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
            change: 0,
        });

        if (histOpenInterests[symbol].data.length > 1) {
            histOpenInterests[symbol].data = calculatePercentageChange(
                histOpenInterests[symbol].data,
            );
        }

        const change = histOpenInterests[symbol].data.reduce(
            (sum, { change }) => {
                return sum + change;
            },
            0,
        );

        return {
            symbol,
            change,
            openInterest: openInterest * price,
            price,
            timestamp: time,
        };
    } catch (ex) {
        return { symbol, error: ex.message };
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculatePercentageChange(histData) {
    for (let i = 1; i < histData.length; i++) {
        const current = histData[i];
        const previous = histData[i - 1];
        const change =
            ((current.openInterest - previous.openInterest) /
                previous.openInterest) *
            100;
        current.change = change;
    }

    return histData;
}
