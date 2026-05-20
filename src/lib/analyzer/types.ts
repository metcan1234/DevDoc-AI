/** Supported source file extensions for scanning and parsing. */
export const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".vue",
  ".svelte",
]);

/** Directories and files to skip during recursive scan. */
export const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "__pycache__",
  ".next",
  "out",
  "coverage",
  ".turbo",
  "vault-output",
  ".venv",
  "venv",
  "target",
]);

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

export interface ParsedSymbol {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "method" | "variable";
  line?: number;
}

export interface ParsedImport {
  module: string;
  names: string[];
  line?: number;
}

export interface ParsedFile {
  path: string;
  relativePath: string;
  language: string;
  symbols: ParsedSymbol[];
  imports: ParsedImport[];
  lineCount: number;
}

export interface ScanResult {
  projectPath: string;
  scannedAt: string;
  fileTree: FileTreeNode;
  files: ParsedFile[];
  totalFiles: number;
}
