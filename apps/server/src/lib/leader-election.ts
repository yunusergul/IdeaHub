import type Redis from 'ioredis';
import { INSTANCE_ID } from '../ws/connection-manager.js';

const LEADER_KEY = 'ideahub:leader';
const LEADER_TTL_SECONDS = 30;
const RENEW_INTERVAL_MS = 10_000;

let renewTimer: ReturnType<typeof setInterval> | null = null;
let isLeader = false;

export function getIsLeader(): boolean {
  return isLeader;
}

export async function startLeaderElection(redis: Redis, onBecomeLeader: () => void, onLoseLeadership: () => void): Promise<void> {
  // Lua script for atomic check-and-extend (avoids TOCTOU race)
  const RENEW_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("expire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;

  async function tryAcquire(): Promise<boolean> {
    // SET key value NX EX ttl — only set if not exists
    const result = await redis.set(LEADER_KEY, INSTANCE_ID, 'EX', LEADER_TTL_SECONDS, 'NX');
    if (result === 'OK') return true;

    // Atomic check-and-extend via Lua (prevents TOCTOU race)
    const renewed = await redis.eval(RENEW_SCRIPT, 1, LEADER_KEY, INSTANCE_ID, String(LEADER_TTL_SECONDS));
    return renewed === 1;
  }

  async function tick(): Promise<void> {
    try {
      const acquired = await tryAcquire();
      if (acquired && !isLeader) {
        isLeader = true;
        onBecomeLeader();
      } else if (!acquired && isLeader) {
        isLeader = false;
        onLoseLeadership();
      }
    } catch {
      // Redis connection error — assume we lost leadership
      if (isLeader) {
        isLeader = false;
        onLoseLeadership();
      }
    }
  }

  // Initial attempt
  await tick();

  // Periodic renewal/acquisition
  renewTimer = setInterval(tick, RENEW_INTERVAL_MS);
}

export async function stopLeaderElection(redis: Redis): Promise<void> {
  if (renewTimer) {
    clearInterval(renewTimer);
    renewTimer = null;
  }
  // Release leadership if we hold it
  if (isLeader) {
    try {
      const current = await redis.get(LEADER_KEY);
      if (current === INSTANCE_ID) {
        await redis.del(LEADER_KEY);
      }
    } catch {}
    isLeader = false;
  }
}
