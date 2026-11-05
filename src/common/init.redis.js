const { createClient } = require("redis");

const client = createClient({
  url: "redis://default:1nYB135Wm8Koj8F9nKJQnsyWavIQAPXr@redis-16223.crce219.us-east-1-4.ec2.cloud.redislabs.com:16223",
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    connectTimeout: 10000,
  },
});

let isConnected = false;

client.on("error", (error) => {
  console.error("Redis Client Error:", error);
  isConnected = false;
});

client.on("connect", () => {
  console.log("Redis Client Connecting...");
});

client.on("ready", () => {
  console.log("Redis Client Ready");
  isConnected = true;
});

client.on("end", () => {
  console.log("Redis Client Disconnected");
  isConnected = false;
});

const connectionRedis = async () => {
  try {
    if (!client.isOpen) {
      await client.connect();
    }
    isConnected = true;
    console.log("Redis connected successfully");
    return client;
  } catch (error) {
    console.error("Redis connection failed:", error);
    isConnected = false;
    throw error;
  }
};

// Helper function to check connection
const isRedisConnected = () => isConnected && client.isOpen;

module.exports = {
  connectionRedis,
  redisClient: client,
  isRedisConnected,
};