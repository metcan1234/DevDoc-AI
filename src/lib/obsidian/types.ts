import type { ScanResult } from "@/lib/analyzer/types";
import type { FileAnalysis } from "@/lib/claude/types";

export interface VaultDocument {
  /** Obsidian note filename without path (e.g. `UserService.md`). */
  fileName: string;
  /** Relative path inside vault matching source structure. */
  vaultPath: string;
  /** Source file this note documents. */
  sourcePath: string;
  /** Full markdown content including frontmatter. */
  content: string;
  /** Wiki-link targets referenced in this note. */
  wikiLinks: string[];
}

export interface VaultGenerationResult {
  outputDir: string;
  documents: VaultDocument[];
  linkGraph: LinkGraphEdge[];
  generatedAt: string;
}

export interface LinkGraphEdge {
  from: string;
  to: string;
}

export interface GenerateVaultInput {
  scanResult: ScanResult;
  /** Claude analysis per source relative path. */
  analysisByFile?: Record<string, FileAnalysis>;
  outputDir?: string;
}
