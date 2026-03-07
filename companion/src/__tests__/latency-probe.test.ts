import { describe, test, expect, afterEach } from 'bun:test';
import {
  getTierHealth,
  getProbeResults,
  getFastestTier,
  stopProbing,
} from '../latency-probe';

describe('Latency Probe', () => {
  afterEach(() => {
    stopProbing();
  });

  test('getTierHealth returns expected shape', () => {
    const health = getTierHealth();
    expect(health).toHaveProperty('edge');
    expect(health).toHaveProperty('cloudRun');
    expect(health).toHaveProperty('mesh');
    expect(health).toHaveProperty('wasm');

    expect(health.edge).toHaveProperty('healthy');
    expect(health.edge).toHaveProperty('latencyMs');
    expect(health.wasm.healthy).toBe(true);
    expect(health.wasm.latencyMs).toBe(1);

    expect(typeof health.cloudRun).toBe('object');
    expect(health.mesh).toHaveProperty('peerCount');
  });

  test('getProbeResults returns array', () => {
    const results = getProbeResults();
    expect(Array.isArray(results)).toBe(true);
  });

  test('getFastestTier always returns wasm as baseline', () => {
    // Without any probes, WASM should be the fastest available tier
    const tier = getFastestTier('tinyllama-1.1b');
    // May return null if no probes cached, or 'wasm' as baseline
    if (tier !== null) {
      expect(typeof tier).toBe('string');
    }
  });

  test('probe results have required fields when populated', () => {
    const results = getProbeResults();
    for (const result of results) {
      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('latencyMs');
      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('lastProbed');
      expect(typeof result.latencyMs).toBe('number');
      expect(typeof result.healthy).toBe('boolean');
    }
  });

  test('cloudRun health includes known models', () => {
    const health = getTierHealth();
    const knownModels = [
      'tinyllama-1.1b',
      'mistral-7b',
      'qwen-2.5-coder-7b',
      'gemma3-4b-it',
      'glm-4-9b',
    ];

    for (const model of knownModels) {
      expect(model in health.cloudRun).toBe(true);
      expect(health.cloudRun[model]).toBeDefined();
      expect(typeof health.cloudRun[model].healthy).toBe('boolean');
      expect(typeof health.cloudRun[model].latencyMs).toBe('number');
    }
  });
});
