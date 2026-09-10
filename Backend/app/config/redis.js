const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (error) => {
  console.error("Redis Error:", error.message);
});

const connectRedis = async () => {
  try {
    await redisClient.connect();

    console.log("Redis Connected Successfully");
  } catch (error) {
    console.error("Redis Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = {
  redisClient,
  connectRedis,
};