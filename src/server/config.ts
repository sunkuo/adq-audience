const tag = '[config]'

const mongoUri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_URI}/${process.env.MONGO_DB}?authSource=${process.env.MONGO_AUTH_SOURCE}&replicaSet=${process.env.MONGO_REPLICA_SET}`
console.log(tag, mongoUri)

export const config = {
  mongoUri,
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB,
    maxRetriesPerRequest: null,
  },
  bullmq: {
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB,
      maxRetriesPerRequest: null,
    },
  },
};
