import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { ParsedFile } from "@/lib/analyzer/types";
import type {
  GenerateVaultInput,
  LinkGraphEdge,
  VaultDocument,
  VaultGenerationResult,
} from "./types";

/**
 * Builds an Obsidian-compatible vault: one .md per source file with wiki-links
 * between related components based on import relationships and symbol overlap.
 */
export async function generateVault(
  input: GenerateVaultInput
): Promise<VaultGenerationResult> {
  const { scanResult, analysisByFile = {} } = input;

  const resolvedOutput = input.outputDir
    ? path.isAbsolute(input.outputDir)
      ? input.outputDir
      : path.resolve(process.cwd(), input.outputDir)
    : path.resolve(process.cwd(), "vault-output");

  await mkdir(resolvedOutput, { recursive: true });

  const noteIdBySource = buildNoteIdMap(scanResult.files);
  const linkGraph: LinkGraphEdge[] = [];
  const documents: VaultDocument[] = [];

  for (const file of scanResult.files) {
    const noteId = noteIdBySource.get(file.relativePath)!;
    const related = findRelatedNotes(file, scanResult.files, noteIdBySource);
    const wikiLinks = related.map((r) => r.noteId);

    for (const rel of related) {
      linkGraph.push({ from: noteId, to: rel.noteId });
    }

    const analysis =
      analysisByFile[file.relativePath] ??
      generatePlaceholderAnalysis(file);

    const content = buildMarkdownNote(
      file,
      noteId,
      analysis,
      wikiLinks
    );

    const vaultRelPath = sourcePathToVaultPath(file.relativePath);
    const absoluteOut = path.join(resolvedOutput, vaultRelPath);
    await mkdir(path.dirname(absoluteOut), { recursive: true });
    await writeFile(absoluteOut, content, { encoding: "utf-8" });

    documents.push({
      fileName: path.basename(vaultRelPath),
      vaultPath: vaultRelPath.replace(/\\/g, "/"),
      sourcePath: file.relativePath,
      content,
      wikiLinks,
    });
  }

  return {
    outputDir: resolvedOutput,
    documents,
    linkGraph,
    generatedAt: new Date().toISOString(),
  };
}

function buildNoteIdMap(files: ParsedFile[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of files) {
    map.set(f.relativePath, filePathToNoteId(f.relativePath));
  }
  return map;
}

/** Converts `src/lib/foo.ts` → `src-lib-foo` for wiki-link titles. */
export function filePathToNoteId(relativePath: string): string {
  const base = relativePath.replace(/\.[^.]+$/, "");
  return base.replace(/[/\\]/g, "-").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function sourcePathToVaultPath(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.[^.]+$/, "");
  return `${withoutExt}.md`;
}

function findRelatedNotes(
  file: ParsedFile,
  allFiles: ParsedFile[],
  noteIdBySource: Map<string, string>
): { sourcePath: string; noteId: string }[] {
  const related = new Map<string, string>();

  for (const imp of file.imports) {
    const resolved = resolveImportToFile(imp.module, file, allFiles);
    if (resolved && noteIdBySource.has(resolved)) {
      related.set(resolved, noteIdBySource.get(resolved)!);
    }
  }

  for (const other of allFiles) {
    if (other.relativePath === file.relativePath) continue;
    const otherBase = path.basename(other.relativePath, path.extname(other.relativePath));
    for (const sym of file.symbols) {
      if (
        other.symbols.some((s) => s.name === sym.name) ||
        other.imports.some((i) => i.module.includes(otherBase))
      ) {
        related.set(other.relativePath, noteIdBySource.get(other.relativePath)!);
      }
    }
  }

  return Array.from(related.entries()).map(([sourcePath, noteId]) => ({
    sourcePath,
    noteId,
  }));
}

function resolveImportToFile(
  modulePath: string,
  fromFile: ParsedFile,
  allFiles: ParsedFile[]
): string | null {
  const candidates = [
    modulePath,
    `${modulePath}.ts`,
    `${modulePath}.tsx`,
    `${modulePath}.js`,
    `${modulePath}/index.ts`,
    `${modulePath}/index.tsx`,
  ];

  const fromDir = path.dirname(fromFile.relativePath).replace(/\\/g, "/");

  for (const c of candidates) {
    const resolved = path
      .normalize(path.join(fromDir, c))
      .replace(/\\/g, "/");
    const match = allFiles.find(
      (f) =>
        f.relativePath.replace(/\\/g, "/") === resolved ||
        f.relativePath.endsWith(c.replace(/^\.\//, ""))
    );
    if (match) return match.relativePath;
  }

  const baseName = path.basename(modulePath);
  const byName = allFiles.find((f) =>
    f.relativePath.includes(baseName)
  );
  return byName?.relativePath ?? null;
}

function generatePlaceholderAnalysis(file: ParsedFile): string {
  const symbolList =
    file.symbols.length > 0
      ? file.symbols.map((s) => `- \`${s.kind}\` **${s.name}** (satır ${s.line ?? "?"})`).join("\n")
      : "_Sembol tespit edilmedi._";

  return `## Mimari Analiz (Yer Tutucu)

Bu dosya **${file.language}** dilinde, ${file.lineCount} satırdan oluşuyor.

### Tespit edilen semboller
${symbolList}

### Bağımlılıklar
${
  file.imports.length > 0
    ? file.imports.map((i) => `- \`${i.module}\``).join("\n")
    : "_İçe aktarma bulunamadı._"
}

> Claude API entegrasyonu sonrası bu bölüm gerçek mimari analiz ile değiştirilecek.`;
}

function buildMarkdownNote(
  file: ParsedFile,
  noteId: string,
  analysis: string,
  wikiLinks: string[]
): string {
  const linksSection =
    wikiLinks.length > 0
      ? wikiLinks.map((id) => `- [[${id}]]`).join("\n")
      : "_İlişkili bileşen yok._";

  return `---
title: ${noteId}
source: ${file.relativePath}
language: ${file.language}
generated: ${new Date().toISOString()}
tags:
  - devdoc
  - auto-generated
---

# ${noteId}

**Kaynak:** \`${file.relativePath}\`

${analysis}

## İlişkili Bileşenler

${linksSection}

## Semboller

${
  file.symbols.length > 0
    ? "| Tür | Ad | Satır |\n|-----|-----|-------|\n" +
      file.symbols
        .map((s) => `| ${s.kind} | ${s.name} | ${s.line ?? "-"} |`)
        .join("\n")
    : "_Sembol yok._"
}
`;
}
