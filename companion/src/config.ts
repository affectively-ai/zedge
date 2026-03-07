/**
 * Zedge Companion Configuration
 *
 * Reuses ~/.edgework/ directory from edgework-cli.
 * Adds zedge.json for companion-specific settings.
 */

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const CONFIG_DIR = join(homedir(), '.edgework');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const API_KEY_FILE = join(CONFIG_DIR, 'api-key');
const ZEDGE_CONFIG_FILE = join(CONFIG_DIR, 'zedge.json');

export type Environment = 'production' | 'staging' | 'development';

export interface EdgeworkConfig {
  environment: Environment;
  apiBaseUrl: string;
  mcpEndpoint: string;
}

export interface ZedgeConfig {
  port: number;
  computePool: {
    enabled: boolean;
    maxCpuPercent: number;
    maxMemoryMb: number;
    allowedModels: string[];
  };
  preferredModel: string;
  cloudRunDirect: boolean;
}

const DEFAULT_EDGEWORK_CONFIG: EdgeworkConfig = {
  environment: 'production',
  apiBaseUrl: 'https://api.edgework.ai',
  mcpEndpoint: 'https://api.edgework.ai/mcp',
};

const DEFAULT_ZEDGE_CONFIG: ZedgeConfig = {
  port: 7331,
  computePool: {
    enabled: false,
    maxCpuPercent: 50,
    maxMemoryMb: 2048,
    allowedModels: ['tinyllama-1.1b', 'gemma3-1b-it'],
  },
  preferredModel: 'tinyllama-1.1b',
  cloudRunDirect: true,
};

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

function readJsonFile<T>(path: string, defaultValue: T): T {
  try {
    if (!existsSync(path)) return defaultValue;
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return defaultValue;
  }
}

function writeJsonFile(path: string, data: unknown): void {
  ensureConfigDir();
  writeFileSync(path, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function getEdgeworkConfig(): EdgeworkConfig {
  return readJsonFile(CONFIG_FILE, DEFAULT_EDGEWORK_CONFIG);
}

export function getZedgeConfig(): ZedgeConfig {
  return readJsonFile(ZEDGE_CONFIG_FILE, DEFAULT_ZEDGE_CONFIG);
}

export function saveZedgeConfig(
  config: Partial<ZedgeConfig>
): ZedgeConfig {
  const current = getZedgeConfig();
  const updated = { ...current, ...config };
  writeJsonFile(ZEDGE_CONFIG_FILE, updated);
  return updated;
}

export function getApiKey(): string | null {
  try {
    if (!existsSync(API_KEY_FILE)) return null;
    return readFileSync(API_KEY_FILE, 'utf-8').trim();
  } catch {
    return null;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const apiKey = getApiKey();
  if (apiKey) {
    return {
      Authorization: `Bearer ${apiKey}`,
      'X-API-Key': apiKey,
    };
  }
  return {};
}

export function getApiBaseUrl(): string {
  return getEdgeworkConfig().apiBaseUrl;
}

export function getCompanionPort(): number {
  return getZedgeConfig().port;
}
