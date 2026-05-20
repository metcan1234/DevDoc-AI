import type { ParsedFile, ScanResult } from "@/lib/analyzer/types";
import { analyzeFileWithClaude } from "./client";
import { readProjectFileContent } from "./read-file";
import type { FileAnalysis } from "./types";

const DEFAULT_CONCURRENCY = 4;

export interface BatchAnalyzeOptions {
  concurrency?: number;
  /** Optional in-memory cache shared within one HTTP request. */
  cache?: Map<string, FileAnalysis>;
  projectContext?: string;
  onProgress?: (completed: number, total: number, filePath: string) => void;
}

/**
 * Analyzes all scanned files with a concurrency limit and optional per-request cache.
 */
export async function analyzeScanResultFiles(
  scanResult: ScanResult,
  options: BatchAnalyzeOptions = {}
): Promise<Record<string, FileAnalysis>> {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const cache = options.cache ?? new Map<string, FileAnalysis>();
  const files = scanResult.files;
  const result: Record<string, FileAnalysis> = {};

  let completed = 0;

  async function analyzeOne(file: ParsedFile): Promise<void> {
    const key = file.relativePath;
    if (cache.has(key)) {
      result[key] = cache.get(key)!;
      completed += 1;
      options.onProgress?.(completed, files.length, key);
      return;
    }

    const content = await readProjectFileContent(
      scanResult.projectPath,
      file.relativePath
    );

    const analysis = await analyzeFileWithClaude(
      file.relativePath,
      content,
      file.symbols,
      file.imports,
      options.projectContext
    );

    cache.set(key, analysis);
    result[key] = analysis;
    completed += 1;
    options.onProgress?.(completed, files.length, key);
  }

  await runWithConcurrency(files, analyzeOne, concurrency);
  return result;
}

async function runWithConcurrency<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) break;
      await worker(item);
    }
  });
  await Promise.all(runners);
}
