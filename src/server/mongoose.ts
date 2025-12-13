import mongoose from 'mongoose';
import { config } from './config';

mongoose.connect(config.mongoUri).then(() => {
  console.log('✅ Mongoose connected');
}).catch((err) => {
  console.error('❌ Mongoose connection error', err.message);
});

export default mongoose;