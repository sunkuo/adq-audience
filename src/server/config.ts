export const config = {
  mongoUri:
    "mongodb://root:Super123456@localhost:27017/demo?replicaSet=rs0&authSource=admin",
  redis: {
    host: "localhost",
    port: 6379,
    password: "Super123456",
    db: 0,
    maxRetriesPerRequest: null,
  },
  bullmq: {
    redis: {
      host: "localhost",
      port: 6379,
      password: "Super123456",
      db: 1,
      maxRetriesPerRequest: null,
    }
  }
};
