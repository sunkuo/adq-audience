/**
 * BullMQ 还是只支持ioredis 后续支持bun-redis之后迁移
 */

import IORedis from 'ioredis';
import { config } from './config';

const connection = new IORedis(config.bullmq.redis);

export default connection;