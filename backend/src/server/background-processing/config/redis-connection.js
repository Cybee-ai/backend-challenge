import Redis from 'ioredis';

export const redisConnection = new Redis(process.env.REDIS_PORT, process.env.REDIS_HOST, {
    maxRetriesPerRequest: null
});

redisConnection.on('error', (err) => {
    console.error('Redis connection error:', err);
    process.exit(1);
});
