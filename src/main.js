import { USDMClient } from 'binance';

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
            threshold: 1,
            interval: 180 * 1000, // 3m
            data: [],
        };
        return res;
    }, {});

    for (;;) {
        for await (const { symbol, openInterest, change, error } of symbols.map(
            (symbol) => getOpenInterestChange(client, symbol, openInterests),
        )) {
            if (error) {
                console.error(`${symbol}: ${error}`);
            } else {
                if (Math.abs(change) >= openInterests[symbol].threshold) {
                    openInterests[symbol].signals++;

                    console.log(
                        `${symbol}: detected open interest change ${change.toFixed(2)}% (${((openInterest * change) / 100.0).toFixed(2)} USDT). ` +
                            `Signal number: ${openInterests[symbol].signals}`,
                    );

                    openInterests[symbol].data = [];
                }
            }
        }

        await sleep(10000);
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
