import { redis } from '../config/redis';
import { parameterRepository } from '../repositories/parameter.repository';
import { logger } from '../utils/logger';

export class ParameterService {
  private getCacheKey(category: string, name: string): string {
    return `param:${category}:${name}`;
  }

  public async getParameterValue(category: string, name: string, fallback: number = 0, nationId?: string): Promise<number> {
    if (nationId) {
      const overrideKey = `param:override:${nationId}:${category}:${name}`;
      try {
        const cachedOverride = await redis.get(overrideKey);
        if (cachedOverride !== null) {
          if (cachedOverride === 'NONE') {
            // Proceed to global parameters
          } else {
            return Number(cachedOverride);
          }
        } else {
          const overrides = await parameterRepository.findOverridesByNationId(nationId);
          const matched = overrides.find(o => o.category === category && o.name === name);
          if (matched) {
            const val = Number(matched.value);
            await redis.set(overrideKey, val.toString());
            return val;
          } else {
            await redis.set(overrideKey, 'NONE');
          }
        }
      } catch (error) {
        logger.error(`Failed to get parameter override for ${nationId} ${category}:${name}:`, error);
      }
    }

    const key = this.getCacheKey(category, name);
    try {
      const cached = await redis.get(key);
      if (cached !== null) {
        return Number(cached);
      }

      const param = await parameterRepository.findByCategoryAndName(category, name);
      if (param) {
        const val = Number(param.value);
        await redis.set(key, val.toString());
        return val;
      }

      logger.warn(`Parameter ${category}:${name} not found in database, using fallback: ${fallback}`);
      return fallback;
    } catch (error) {
      logger.error(`Failed to get parameter value for ${category}:${name}:`, error);
      return fallback;
    }
  }

  public async invalidateCache(category: string, name: string, nationId?: string): Promise<void> {
    if (nationId) {
      const overrideKey = `param:override:${nationId}:${category}:${name}`;
      await redis.del(overrideKey);
    } else {
      const key = this.getCacheKey(category, name);
      await redis.del(key);
    }
  }

  public async upsertGlobalParameter(category: string, name: string, value: number, description?: string): Promise<void> {
    await parameterRepository.upsertGlobal(category, name, value, description);
    await this.invalidateCache(category, name);
  }

  public async upsertNationOverride(nationId: string, category: string, name: string, value: number): Promise<void> {
    await parameterRepository.upsertOverride(nationId, category, name, value);
    await this.invalidateCache(category, name, nationId);
  }

  public async preloadAllParameters(): Promise<void> {
    try {
      logger.info('Preloading global simulation parameters into Redis cache...');
      const params = await parameterRepository.findAll();
      const pipeline = redis.pipeline();

      for (const p of params) {
        const key = this.getCacheKey(p.category, p.name);
        pipeline.set(key, p.value.toString());
      }

      await pipeline.exec();
      logger.info(`Successfully cached ${params.length} parameters.`);
    } catch (error) {
      logger.error('Failed to preload parameters into Redis:', error);
    }
  }
}
export const parameterService = new ParameterService();
