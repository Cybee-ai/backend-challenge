import pino from 'pino';

    const logger = pino({
      transport: {
        targets: [
          {
            target: 'pino-pretty',
            options: { colorize: true },
          },
        ],
      },
    });

    

export default logger;