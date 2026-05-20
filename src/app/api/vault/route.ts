import { NextResponse } from "next/server";
import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { getVaultOutputDir } from "@/lib/path-utils";

export interface VaultFilePreview {
  vaultPath: string;
  fileName: string;
  content: string;
}

export async function GET() {
  try {
    const vaultDir = path.resolve(process.cwd(), getVaultOutputDir());

    try {
      await stat(vaultDir);
    } catch {
      return NextResponse.json({
        outputDir: vaultDir,
        files: [] as VaultFilePreview[],
        message: "Henüz vault oluşturulmadı.",
      });
    }

    const mdFiles = await collectMarkdownFiles(vaultDir, vaultDir);
    const files: VaultFilePreview[] = [];

    for (const rel of mdFiles) {
      const full = path.join(vaultDir, rel);
      const content = await readFile(full, { encoding: "utf-8" });
      files.push({
        vaultPath: rel.replace(/\\/g, "/"),
        fileName: path.basename(rel),
        content,
      });
    }

    return NextResponse.json({
      outputDir: vaultDir,
      files,
      total: files.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vault okunamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function collectMarkdownFiles(
  root: string,
  current: string
): Promise<string[]> {
  const entries = await readdir(current, { encoding: "utf-8" });
  const results: string[] = [];

  for (const entry of entries) {
    const full = path.join(current, entry);
    const info = await stat(full);
    if (info.isDirectory()) {
      results.push(...(await collectMarkdownFiles(root, full)));
    } else if (entry.endsWith(".md")) {
      results.push(path.relative(root, full));
    }
  }

  return results.sort();
}
