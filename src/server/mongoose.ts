import mongoose from 'mongoose';
import { config } from './config';

mongoose.connect(config.mongoUri, {
  // 减少bun上的内存泄露
  maxIdleTimeMS: 10000,
  minPoolSize: 0,
  maxPoolSize: 10,
}).then(() => {
  console.log('✅ Mongoose connected');
}).catch((err) => {
  console.error('❌ Mongoose connection error', err.message);
});

export default mongoose;