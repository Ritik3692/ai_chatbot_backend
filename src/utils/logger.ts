import winston from 'winston';

const { combine, timestamp, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
    transports: [
        new winston.transports.Console({
            format:
                process.env.NODE_ENV === 'production'
                    ? combine(timestamp(), json())
                    : combine(colorize(), simple()),
        }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});
