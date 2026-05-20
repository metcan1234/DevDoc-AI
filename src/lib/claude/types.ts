/** Structured analysis returned by Claude for a single source file. */
export interface FileAnalysis {
  architecturalAnalysis: string;
  dependencies: string[];
  refactorSuggestions: string[];
  analyzedAt: string;
  model?: string;
  truncated?: boolean;
}

export interface ClaudeAnalysisRequest {
  filePath: string;
  content: string;
  parsedSymbols?: import("@/lib/analyzer/types").ParsedSymbol[];
  imports?: import("@/lib/analyzer/types").ParsedImport[];
  projectContext?: string;
}
