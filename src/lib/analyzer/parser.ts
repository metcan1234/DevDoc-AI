import path from "path";
import type { ParsedFile, ParsedImport, ParsedSymbol } from "./types";

/**
 * v1 heuristic parser — regex-based, not a full AST.
 * Limitations: misses nested/multiline constructs, dynamic imports, macros.
 * Sufficient for skeleton symbol extraction across common languages.
 */
export function parseSourceFile(
  relativePath: string,
  content: string
): ParsedFile {
  const ext = path.extname(relativePath).toLowerCase();
  const language = extensionToLanguage(ext);
  const lines = content.split(/\r?\n/);

  let symbols: ParsedSymbol[] = [];
  let imports: ParsedImport[] = [];

  switch (ext) {
    case ".py":
      symbols = parsePythonSymbols(content);
      imports = parsePythonImports(content);
      break;
    case ".go":
      symbols = parseGoSymbols(content);
      imports = parseGoImports(content);
      break;
    case ".rs":
      symbols = parseRustSymbols(content);
      imports = parseRustImports(content);
      break;
    case ".java":
      symbols = parseJavaSymbols(content);
      imports = parseJavaImports(content);
      break;
    case ".vue":
    case ".svelte":
      symbols = parseJsLikeSymbols(content);
      imports = parseJsImports(content);
      break;
    default:
      symbols = parseJsLikeSymbols(content);
      imports = parseJsImports(content);
  }

  return {
    path: relativePath,
    relativePath,
    language,
    symbols,
    imports,
    lineCount: lines.length,
  };
}

function extensionToLanguage(ext: string): string {
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescriptreact",
    ".js": "javascript",
    ".jsx": "javascriptreact",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".vue": "vue",
    ".svelte": "svelte",
  };
  return map[ext] ?? "unknown";
}

function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split(/\r?\n/).length;
}

// --- JavaScript / TypeScript ---

function parseJsLikeSymbols(content: string): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];

  const patterns: { regex: RegExp; kind: ParsedSymbol["kind"] }[] = [
    { regex: /^\s*export\s+async\s+function\s+(\w+)/gm, kind: "function" },
    { regex: /^\s*export\s+function\s+(\w+)/gm, kind: "function" },
    { regex: /^\s*async\s+function\s+(\w+)/gm, kind: "function" },
    { regex: /^\s*function\s+(\w+)/gm, kind: "function" },
    { regex: /^\s*export\s+class\s+(\w+)/gm, kind: "class" },
    { regex: /^\s*class\s+(\w+)/gm, kind: "class" },
    { regex: /^\s*export\s+interface\s+(\w+)/gm, kind: "interface" },
    { regex: /^\s*interface\s+(\w+)/gm, kind: "interface" },
    { regex: /^\s*export\s+type\s+(\w+)/gm, kind: "type" },
    { regex: /^\s*type\s+(\w+)\s*=/gm, kind: "type" },
    {
      regex: /^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/gm,
      kind: "function",
    },
    {
      regex: /^\s*(?:export\s+)?const\s+(\w+)\s*=\s*async\s+/gm,
      kind: "function",
    },
  ];

  for (const { regex, kind } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      symbols.push({
        name: match[1],
        kind,
        line: lineNumberAt(content, match.index),
      });
    }
  }

  return dedupeSymbols(symbols);
}

function parseJsImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];

  const importFrom = /import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = importFrom.exec(content)) !== null) {
    const names = extractImportNames(m[0]);
    imports.push({
      module: m[1],
      names,
      line: lineNumberAt(content, m.index),
    });
  }

  const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = requireRe.exec(content)) !== null) {
    imports.push({
      module: m[1],
      names: [],
      line: lineNumberAt(content, m.index),
    });
  }

  return imports;
}

function extractImportNames(importStmt: string): string[] {
  const names: string[] = [];
  const defaultMatch = importStmt.match(
    /import\s+(\w+)\s+from/
  );
  if (defaultMatch) names.push(defaultMatch[1]);

  const namedMatch = importStmt.match(/\{([^}]+)\}/);
  if (namedMatch) {
    namedMatch[1].split(",").forEach((part) => {
      const n = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (n) names.push(n);
    });
  }

  const nsMatch = importStmt.match(/import\s+\*\s+as\s+(\w+)/);
  if (nsMatch) names.push(nsMatch[1]);

  return names;
}

// --- Python ---

function parsePythonSymbols(content: string): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];
  const patterns: { regex: RegExp; kind: ParsedSymbol["kind"] }[] = [
    { regex: /^\s*def\s+(\w+)\s*\(/gm, kind: "function" },
    { regex: /^\s*async\s+def\s+(\w+)\s*\(/gm, kind: "function" },
    { regex: /^\s*class\s+(\w+)\s*[:(]/gm, kind: "class" },
  ];

  for (const { regex, kind } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      symbols.push({
        name: match[1],
        kind,
        line: lineNumberAt(content, match.index),
      });
    }
  }
  return dedupeSymbols(symbols);
}

function parsePythonImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const importRe = /^\s*(?:from\s+(\S+)\s+)?import\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(content)) !== null) {
    const modulePath = m[1] ?? m[2].split(",")[0].trim();
    const names = m[2]
      .split(",")
      .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    imports.push({
      module: modulePath,
      names,
      line: lineNumberAt(content, m.index),
    });
  }
  return imports;
}

// --- Go ---

function parseGoSymbols(content: string): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];
  const funcRe = /^\s*func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/gm;
  let m: RegExpExecArray | null;
  while ((m = funcRe.exec(content)) !== null) {
    symbols.push({
      name: m[1],
      kind: "function",
      line: lineNumberAt(content, m.index),
    });
  }
  const typeRe = /^\s*type\s+(\w+)\s+(?:struct|interface)/gm;
  while ((m = typeRe.exec(content)) !== null) {
    symbols.push({
      name: m[1],
      kind: "class",
      line: lineNumberAt(content, m.index),
    });
  }
  return dedupeSymbols(symbols);
}

function parseGoImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const block = content.match(/import\s*\(([\s\S]*?)\)/);
  if (block) {
    const lineRe = /['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(block[1])) !== null) {
      imports.push({ module: m[1], names: [] });
    }
  }
  const single = /import\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = single.exec(content)) !== null) {
    imports.push({ module: m[1], names: [] });
  }
  return imports;
}

// --- Rust ---

function parseRustSymbols(content: string): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];
  const patterns: { regex: RegExp; kind: ParsedSymbol["kind"] }[] = [
    { regex: /^\s*(?:pub\s+)?fn\s+(\w+)/gm, kind: "function" },
    { regex: /^\s*(?:pub\s+)?struct\s+(\w+)/gm, kind: "class" },
    { regex: /^\s*(?:pub\s+)?enum\s+(\w+)/gm, kind: "type" },
    { regex: /^\s*(?:pub\s+)?trait\s+(\w+)/gm, kind: "interface" },
  ];
  for (const { regex, kind } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      symbols.push({
        name: match[1],
        kind,
        line: lineNumberAt(content, match.index),
      });
    }
  }
  return dedupeSymbols(symbols);
}

function parseRustImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const useRe = /^\s*use\s+([^;]+);/gm;
  let m: RegExpExecArray | null;
  while ((m = useRe.exec(content)) !== null) {
    imports.push({
      module: m[1].trim(),
      names: [],
      line: lineNumberAt(content, m.index),
    });
  }
  return imports;
}

// --- Java ---

function parseJavaSymbols(content: string): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];
  const classRe = /^\s*(?:public\s+)?(?:abstract\s+)?class\s+(\w+)/gm;
  let m: RegExpExecArray | null;
  while ((m = classRe.exec(content)) !== null) {
    symbols.push({
      name: m[1],
      kind: "class",
      line: lineNumberAt(content, m.index),
    });
  }
  const methodRe =
    /^\s*(?:public|private|protected)\s+(?:static\s+)?[\w<>,\[\]\s]+\s+(\w+)\s*\(/gm;
  while ((m = methodRe.exec(content)) !== null) {
    if (!["if", "for", "while", "switch"].includes(m[1])) {
      symbols.push({
        name: m[1],
        kind: "method",
        line: lineNumberAt(content, m.index),
      });
    }
  }
  return dedupeSymbols(symbols);
}

function parseJavaImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const importRe = /^\s*import\s+(?:static\s+)?([^;]+);/gm;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(content)) !== null) {
    imports.push({
      module: m[1].trim(),
      names: [],
      line: lineNumberAt(content, m.index),
    });
  }
  return imports;
}

function dedupeSymbols(symbols: ParsedSymbol[]): ParsedSymbol[] {
  const seen = new Set<string>();
  return symbols.filter((s) => {
    const key = `${s.kind}:${s.name}:${s.line ?? 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
