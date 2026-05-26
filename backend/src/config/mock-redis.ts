import { EventEmitter } from 'events';

class MockRedisPipeline {
  private redis: MockRedis;
  private commands: Array<() => any> = [];

  constructor(redis: MockRedis) {
    this.redis = redis;
  }

  set(key: string, value: string, ...args: any[]) {
    this.commands.push(() => this.redis.set(key, value, ...args));
    return this;
  }

  get(key: string) {
    this.commands.push(() => this.redis.get(key));
    return this;
  }

  del(key: string) {
    this.commands.push(() => this.redis.del(key));
    return this;
  }

  hset(key: string, ...args: any[]) {
    this.commands.push(() => (this.redis as any).hset(key, ...args));
    return this;
  }

  hgetall(key: string) {
    this.commands.push(() => this.redis.hgetall(key));
    return this;
  }

  async exec() {
    const results = [];
    for (const cmd of this.commands) {
      try {
        const res = await cmd();
        results.push([null, res]);
      } catch (err) {
        results.push([err, null]);
      }
    }
    return results;
  }
}

export class MockRedis extends EventEmitter {
  private store = new Map<string, any>();
  private ttls = new Map<string, number>();

  constructor() {
    super();
    // Emit connect and ready events on next tick to mimic standard client flow
    process.nextTick(() => {
      this.emit('connect');
      this.emit('ready');
    });
  }

  private isExpired(key: string): boolean {
    const expireTime = this.ttls.get(key);
    if (expireTime !== undefined && Date.now() > expireTime) {
      this.store.delete(key);
      this.ttls.delete(key);
      return true;
    }
    return false;
  }

  async get(key: string): Promise<string | null> {
    if (this.isExpired(key)) return null;
    const val = this.store.get(key);
    if (val === undefined) return null;
    return String(val);
  }

  async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
    this.store.set(key, value);
    if (args.length >= 2) {
      const type = String(args[0]).toUpperCase();
      const ttlVal = Number(args[1]);
      if (type === 'PX') {
        this.ttls.set(key, Date.now() + ttlVal);
      } else if (type === 'EX') {
        this.ttls.set(key, Date.now() + ttlVal * 1000);
      }
    }
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        count++;
      }
      this.ttls.delete(key);
    }
    return count;
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (this.isExpired(key)) return null;
    const hash = this.store.get(key);
    if (!hash || typeof hash !== 'object') return null;
    const val = hash[field];
    return val !== undefined ? String(val) : null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (this.isExpired(key)) return {};
    const hash = this.store.get(key);
    if (!hash || typeof hash !== 'object') return {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(hash)) {
      result[k] = String(v);
    }
    return result;
  }

  async hset(key: string, ...args: any[]): Promise<number> {
    let hash = this.store.get(key);
    if (!hash || typeof hash !== 'object') {
      hash = {};
      this.store.set(key, hash);
    }

    let added = 0;
    if (args.length === 1 && typeof args[0] === 'object') {
      for (const [k, v] of Object.entries(args[0])) {
        if (hash[k] === undefined) added++;
        hash[k] = String(v);
      }
    } else {
      for (let i = 0; i < args.length; i += 2) {
        const k = String(args[i]);
        const v = String(args[i + 1]);
        if (hash[k] === undefined) added++;
        hash[k] = v;
      }
    }
    return added;
  }

  async hmset(key: string, ...args: any[]): Promise<'OK'> {
    await this.hset(key, ...args);
    return 'OK';
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.store.get(key);
    if (!hash || typeof hash !== 'object') return 0;
    let deleted = 0;
    for (const f of fields) {
      if (f in hash) {
        delete hash[f];
        deleted++;
      }
    }
    return deleted;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    let set = this.store.get(key);
    if (!set || !(set instanceof Set)) {
      set = new Set<string>();
      this.store.set(key, set);
    }
    let added = 0;
    for (const m of members) {
      if (!set.has(m)) {
        set.add(m);
        added++;
      }
    }
    return added;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.store.get(key);
    if (!set || !(set instanceof Set)) return [];
    return Array.from(set as Set<string>);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.store.get(key);
    if (!set || !(set instanceof Set)) return 0;
    let removed = 0;
    for (const m of members) {
      if (set.delete(m)) {
        removed++;
      }
    }
    return removed;
  }

  async sismember(key: string, member: string): Promise<number> {
    const set = this.store.get(key);
    if (!set || !(set instanceof Set)) return 0;
    return set.has(member) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regexStr = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexStr}$`);
    const matched: string[] = [];
    for (const key of this.store.keys()) {
      if (this.isExpired(key)) continue;
      if (regex.test(key)) {
        matched.push(key);
      }
    }
    return matched;
  }

  async pexpire(key: string, milliseconds: number): Promise<number> {
    this.ttls.set(key, Date.now() + milliseconds);
    return 1;
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.ttls.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async ping(): Promise<'PONG'> {
    return 'PONG';
  }

  // Pub/Sub simulation using shared Event Emitter
  private static pubsub = new EventEmitter();

  async publish(channel: string, message: string): Promise<number> {
    MockRedis.pubsub.emit(channel, message);
    return 1;
  }

  async subscribe(...channels: any[]): Promise<void> {
    const callback = typeof channels[channels.length - 1] === 'function' ? channels.pop() : null;
    for (const channel of channels) {
      if (typeof channel === 'string') {
        MockRedis.pubsub.on(channel, (message) => {
          this.emit('message', channel, message);
        });
      }
    }
    if (callback) {
      callback(null, channels.length);
    }
  }

  pipeline() {
    return new MockRedisPipeline(this);
  }

  async quit(): Promise<'OK'> {
    return 'OK';
  }

  async disconnect(): Promise<void> {
    // No-op
  }
}
