import { RedisClient } from "bun";
import { config } from "./config";

const client = new RedisClient(
  `redis://:${config.redis.password}@${config.redis.host}:${config.redis.port}/${config.redis.db}`
);

client
  .connect()
  .then(() => {
    console.log("✅ Redis connected");
  })
  .catch((err) => {
    console.error("Redis error", err);
  });

client.onclose = () => {
  console.log("Redis closed");
};

export default client;
