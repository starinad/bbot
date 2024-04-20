import pino from 'pino';

const transport = pino.transport({
    targets: [
        // stdout
        {
            target: 'pino-pretty',
            options: {
                colorize: true,
                destination: 1,
            },
        },
        // file
        {
            target: 'pino-pretty',
            options: {
                colorize: false,
                destination: './bbot.log',
            },
        },
    ],
});

export default pino(transport);
