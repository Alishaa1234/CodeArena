
const  { createClient } =require('redis');
// import .env
require('dotenv').config();

const redisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: 'redis-17474.c262.us-east-1-3.ec2.cloud.redislabs.com',
        port: 17474
    }
});
module.exports = redisClient;
