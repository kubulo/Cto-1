import IORedis, { Redis } from 'ioredis';

const DEFAULT_REDIS_URL = 'redis://127.0.0.1:6379';

let sharedConnection: Redis | undefined;

export function getRedisUrl(): string {
  return process.env.REDIS_URL ?? DEFAULT_REDIS_URL;
}

export function createRedisConnection(): Redis {
  const url = getRedisUrl();
  const client = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  client.on('error', (error) => {
    console.error('[redis] connection error', error);
  });

  return client;
}

export function getSharedRedisConnection(): Redis {
  if (!sharedConnection) {
    sharedConnection = createRedisConnection();
  }

  return sharedConnection;
}

export async function closeSharedRedisConnection(): Promise<void> {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = undefined;
  }
}
