/**
 * Superinference Engine
 *
 * Parallel model racing with multiple collapse strategies:
 * - Fastest: first response wins, cancel others (autocomplete)
 * - Consensus: wait for all, return where 2+ agree (refactoring)
 * - Constructive: return agreements, flag disagreements (code review)
 *
 * Supports recursive superinference for multi-step tasks with depth
 * limits, cost ceilings, and cycle detection.
 *
 * Reference: docs/ebooks/24-superinference-quantum-inspired-distributed-compute/
 */

import type { ChatCompletionRequest, ChatMessage } from './inference-bridge';
import { infer } from './inference-bridge';

// --- Types ---

export type CollapseStrategy = 'fastest' | 'consensus' | 'constructive';

export interface SuperinferenceRequest {
  /** Base prompt to send to all models */
  request: ChatCompletionRequest;
  /** Models to race (defaults to all available) */
  models?: string[];
  /** How to collapse parallel results */
  strategy: CollapseStrategy;
  /** Max wall-clock time for all models */
  timeoutMs?: number;
}

export interface SuperinferenceResult {
  /** The collapsed final response */
  content: string;
  /** Which model produced the winning response */
  winningModel: string;
  /** Strategy used */
  strategy: CollapseStrategy;
  /** Per-model results for transparency */
  modelResults: ModelResult[];
  /** Time taken */
  durationMs: number;
  /** Confidence score (0-1, consensus-based) */
  confidence: number;
}

export interface ModelResult {
  model: string;
  content: string;
  tier: string;
  durationMs: number;
  finished: boolean;
}

export interface RecursiveRequest {
  /** The decomposition prompt */
  prompt: string;
  /** Models to use */
  models?: string[];
  /** Collapse strategy per level */
  strategy: CollapseStrategy;
  /** Max recursion depth */
  maxDepth?: number;
  /** Max total cost (in estimated tokens) */
  maxTokenBudget?: number;
  /** Seen prompts for cycle detection */
  _visited?: Set<string>;
  _currentDepth?: number;
  _tokensUsed?: number;
}

export interface RecursiveResult {
  content: string;
  depth: number;
  totalTokens: number;
  subResults: SuperinferenceResult[];
}

// --- Default models for superinference ---

const DEFAULT_MODELS = [
  'qwen-2.5-coder-7b', // Code-specialized
  'tinyllama-1.1b', // Fast
  'gemma3-4b-it', // General
];

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_TOKEN_BUDGET = 50_000;

// --- Core Engine ---

/**
 * Run parallel inference across multiple models and collapse results
 */
export async function superinfer(
  req: SuperinferenceRequest
): Promise<SuperinferenceResult> {
  const models = req.models ?? DEFAULT_MODELS;
  const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startTime = Date.now();

  if (models.length === 0) {
    throw new Error('At least one model required for superinference');
  }

  // Single model — just run it directly
  if (models.length === 1) {
    const result = await inferModel(models[0], req.request, timeoutMs);
    return {
      content: result.content,
      winningModel: result.model,
      strategy: req.strategy,
      modelResults: [result],
      durationMs: Date.now() - startTime,
      confidence: 1.0,
    };
  }

  switch (req.strategy) {
    case 'fastest':
      return raceFastest(models, req.request, timeoutMs, startTime);
    case 'consensus':
      return raceConsensus(models, req.request, timeoutMs, startTime);
    case 'constructive':
      return raceConstructive(models, req.request, timeoutMs, startTime);
  }
}

/**
 * Fastest wins — first response back, cancel the others
 * Best for autocomplete where latency > quality
 */
async function raceFastest(
  models: string[],
  request: ChatCompletionRequest,
  timeoutMs: number,
  startTime: number
): Promise<SuperinferenceResult> {
  const controllers = models.map(() => new AbortController());
  const results: ModelResult[] = [];

  const promises = models.map((model, i) =>
    inferModel(model, request, timeoutMs, controllers[i].signal).then(
      (result) => {
        results.push(result);
        // Cancel all others
        controllers.forEach((c, j) => {
          if (j !== i) c.abort();
        });
        return result;
      }
    )
  );

  try {
    const winner = await Promise.any(promises);
    return {
      content: winner.content,
      winningModel: winner.model,
      strategy: 'fastest',
      modelResults: results,
      durationMs: Date.now() - startTime,
      confidence: 1.0, // No consensus possible with fastest
    };
  } catch {
    // All models failed
    return {
      content: '[superinference] All models failed to respond',
      winningModel: 'none',
      strategy: 'fastest',
      modelResults: results,
      durationMs: Date.now() - startTime,
      confidence: 0,
    };
  }
}

/**
 * Consensus — wait for all models, return where 2+ agree
 * Best for refactoring where correctness > latency
 */
async function raceConsensus(
  models: string[],
  request: ChatCompletionRequest,
  timeoutMs: number,
  startTime: number
): Promise<SuperinferenceResult> {
  const results = await Promise.allSettled(
    models.map((model) => inferModel(model, request, timeoutMs))
  );

  const completed: ModelResult[] = results
    .filter(
      (r): r is PromiseFulfilledResult<ModelResult> => r.status === 'fulfilled'
    )
    .map((r) => r.value);

  if (completed.length === 0) {
    return {
      content: '[superinference] All models failed',
      winningModel: 'none',
      strategy: 'consensus',
      modelResults: [],
      durationMs: Date.now() - startTime,
      confidence: 0,
    };
  }

  // Find consensus via normalized content similarity
  const { winner, confidence } = findConsensus(completed);

  return {
    content: winner.content,
    winningModel: winner.model,
    strategy: 'consensus',
    modelResults: completed,
    durationMs: Date.now() - startTime,
    confidence,
  };
}

/**
 * Constructive interference — return agreements, flag disagreements
 * Best for code review where knowing uncertainty matters
 */
async function raceConstructive(
  models: string[],
  request: ChatCompletionRequest,
  timeoutMs: number,
  startTime: number
): Promise<SuperinferenceResult> {
  const results = await Promise.allSettled(
    models.map((model) => inferModel(model, request, timeoutMs))
  );

  const completed: ModelResult[] = results
    .filter(
      (r): r is PromiseFulfilledResult<ModelResult> => r.status === 'fulfilled'
    )
    .map((r) => r.value);

  if (completed.length === 0) {
    return {
      content: '[superinference] All models failed',
      winningModel: 'none',
      strategy: 'constructive',
      modelResults: [],
      durationMs: Date.now() - startTime,
      confidence: 0,
    };
  }

  // Build constructive output: agreements and disagreements
  const { content, confidence } = buildConstructiveOutput(completed);

  return {
    content,
    winningModel: completed[0].model, // Primary model
    strategy: 'constructive',
    modelResults: completed,
    durationMs: Date.now() - startTime,
    confidence,
  };
}

// --- Recursive Superinference ---

/**
 * Recursive superinference for multi-step tasks
 *
 * Decomposes a complex prompt into sub-queries, each of which can
 * itself be a superinference query. Implements depth limits, cost
 * ceilings, and cycle detection.
 */
export async function recursiveSuperinfer(
  req: RecursiveRequest
): Promise<RecursiveResult> {
  const maxDepth = req.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxTokens = req.maxTokenBudget ?? DEFAULT_TOKEN_BUDGET;
  const visited = req._visited ?? new Set<string>();
  const currentDepth = req._currentDepth ?? 0;
  let tokensUsed = req._tokensUsed ?? 0;

  // Guard: depth limit
  if (currentDepth >= maxDepth) {
    const result = await superinfer({
      request: {
        model: req.models?.[0] ?? DEFAULT_MODELS[0],
        messages: [{ role: 'user', content: req.prompt }],
      },
      models: req.models,
      strategy: req.strategy,
    });
    return {
      content: result.content,
      depth: currentDepth,
      totalTokens: tokensUsed,
      subResults: [result],
    };
  }

  // Guard: cycle detection
  const promptHash = simpleHash(req.prompt);
  if (visited.has(promptHash)) {
    return {
      content: `[cycle detected at depth ${currentDepth}]`,
      depth: currentDepth,
      totalTokens: tokensUsed,
      subResults: [],
    };
  }
  visited.add(promptHash);

  // Guard: token budget
  if (tokensUsed >= maxTokens) {
    return {
      content: `[token budget exhausted at depth ${currentDepth}]`,
      depth: currentDepth,
      totalTokens: tokensUsed,
      subResults: [],
    };
  }

  // Step 1: Decompose the task
  const decomposition = await superinfer({
    request: {
      model: req.models?.[0] ?? DEFAULT_MODELS[0],
      messages: [
        {
          role: 'system',
          content:
            'You are a task decomposition assistant. Break the following task into 2-4 independent sub-tasks. Output each sub-task on its own line, prefixed with "- ". If the task is already atomic, output just the task itself prefixed with "- ".',
        },
        { role: 'user', content: req.prompt },
      ],
      max_tokens: 512,
    },
    models: req.models,
    strategy: 'consensus',
    timeoutMs: 15_000,
  });

  tokensUsed += estimateTokens(decomposition.content);

  // Parse sub-tasks
  const subTasks = decomposition.content
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter((line) => line.length > 0);

  // If only 1 sub-task (atomic), just solve it directly
  if (subTasks.length <= 1) {
    const result = await superinfer({
      request: {
        model: req.models?.[0] ?? DEFAULT_MODELS[0],
        messages: [{ role: 'user', content: req.prompt }],
      },
      models: req.models,
      strategy: req.strategy,
    });
    tokensUsed += estimateTokens(result.content);
    return {
      content: result.content,
      depth: currentDepth,
      totalTokens: tokensUsed,
      subResults: [result],
    };
  }

  // Step 2: Recursively solve each sub-task
  const subResults: SuperinferenceResult[] = [];
  const subContents: string[] = [];

  for (const subTask of subTasks) {
    if (tokensUsed >= maxTokens) break;

    const subResult = await recursiveSuperinfer({
      prompt: subTask,
      models: req.models,
      strategy: req.strategy,
      maxDepth,
      maxTokenBudget: maxTokens,
      _visited: visited,
      _currentDepth: currentDepth + 1,
      _tokensUsed: tokensUsed,
    });

    tokensUsed = subResult.totalTokens;
    subResults.push(...subResult.subResults);
    subContents.push(subResult.content);
  }

  // Step 3: Synthesize results
  const synthesis = await superinfer({
    request: {
      model: req.models?.[0] ?? DEFAULT_MODELS[0],
      messages: [
        {
          role: 'system',
          content:
            'Synthesize the following sub-task results into a coherent final answer. Be concise.',
        },
        {
          role: 'user',
          content: subContents
            .map((c, i) => `Sub-task ${i + 1}:\n${c}`)
            .join('\n\n'),
        },
      ],
    },
    models: req.models,
    strategy: req.strategy,
  });

  tokensUsed += estimateTokens(synthesis.content);
  subResults.push(synthesis);

  return {
    content: synthesis.content,
    depth: currentDepth,
    totalTokens: tokensUsed,
    subResults,
  };
}

// --- Helpers ---

/**
 * Run inference on a single model and extract the text response
 */
async function inferModel(
  model: string,
  request: ChatCompletionRequest,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<ModelResult> {
  const start = Date.now();
  try {
    const modelRequest = { ...request, model, stream: false };

    // Create a timeout race
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    const result = await infer(modelRequest);
    clearTimeout(timeout);

    const data = (await result.response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content =
      data.choices?.[0]?.message?.content ?? '[no content]';

    return {
      model,
      content,
      tier: result.tier,
      durationMs: Date.now() - start,
      finished: true,
    };
  } catch {
    return {
      model,
      content: '',
      tier: 'error',
      durationMs: Date.now() - start,
      finished: false,
    };
  }
}

/**
 * Find consensus among model results using line-level agreement
 */
function findConsensus(results: ModelResult[]): {
  winner: ModelResult;
  confidence: number;
} {
  if (results.length === 1) {
    return { winner: results[0], confidence: 1.0 };
  }

  // Score each result by how many others agree with it
  const scores = results.map((result, i) => {
    let agreements = 0;
    const lines = normalizeContent(result.content);

    for (let j = 0; j < results.length; j++) {
      if (i === j) continue;
      const otherLines = normalizeContent(results[j].content);
      const overlap = computeLineOverlap(lines, otherLines);
      if (overlap > 0.5) agreements++;
    }

    return { result, agreements, score: agreements / (results.length - 1) };
  });

  // Pick the result with highest agreement
  scores.sort((a, b) => b.score - a.score || a.result.durationMs - b.result.durationMs);

  return {
    winner: scores[0].result,
    confidence: scores[0].score,
  };
}

/**
 * Build constructive interference output
 * Shows agreements (high confidence) and flags disagreements (uncertain)
 */
function buildConstructiveOutput(results: ModelResult[]): {
  content: string;
  confidence: number;
} {
  if (results.length === 1) {
    return { content: results[0].content, confidence: 1.0 };
  }

  const allLines = results.map((r) => normalizeContent(r.content));

  // Find lines that appear in majority of results
  const lineVotes = new Map<string, number>();
  for (const lines of allLines) {
    for (const line of lines) {
      lineVotes.set(line, (lineVotes.get(line) ?? 0) + 1);
    }
  }

  const majority = Math.ceil(results.length / 2);
  const agreed: string[] = [];
  const disputed: string[] = [];

  for (const [line, votes] of lineVotes) {
    if (votes >= majority) {
      agreed.push(line);
    } else {
      disputed.push(line);
    }
  }

  const totalLines = agreed.length + disputed.length;
  const confidence = totalLines > 0 ? agreed.length / totalLines : 0;

  let content = '';
  if (agreed.length > 0) {
    content += agreed.join('\n');
  }
  if (disputed.length > 0) {
    content += '\n\n--- UNCERTAIN (models disagree) ---\n';
    content += disputed.join('\n');
  }

  return { content: content.trim(), confidence };
}

function normalizeContent(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function computeLineOverlap(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  if (a.length === 0 || b.length === 0) return 0;

  const setB = new Set(b);
  let matches = 0;
  for (const line of a) {
    if (setB.has(line)) matches++;
  }
  return matches / Math.max(a.length, b.length);
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}
