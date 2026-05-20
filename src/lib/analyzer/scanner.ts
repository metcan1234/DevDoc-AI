import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import {
  FileTreeNode,
  IGNORED_DIRS,
  ParsedFile,
  ScanResult,
  SUPPORTED_EXTENSIONS,
} from "./types";
import { parseSourceFile } from "./parser";

/**
 * Recursively scans a project directory and builds a file tree plus parsed metadata.
 * Skips common build/cache directories. UTF-8 file reads for Windows/Turkish paths.
 */
export async function scanProject(projectPath: string): Promise<ScanResult> {
  const root = path.resolve(projectPath);
  const fileTree = await buildFileTree(root, root);
  const filePaths = collectFilePaths(fileTree);
  const files: ParsedFile[] = [];

  for (const relativePath of filePaths) {
    const absolutePath = path.join(root, relativePath);
    try {
      const content = await readFile(absolutePath, { encoding: "utf-8" });
      const parsed = parseSourceFile(relativePath, content);
      files.push(parsed);
    } catch {
      // Skip unreadable files (binary, permissions, etc.)
    }
  }

  return {
    projectPath: root,
    scannedAt: new Date().toISOString(),
    fileTree,
    files,
    totalFiles: files.length,
  };
}

async function buildFileTree(
  root: string,
  current: string
): Promise<FileTreeNode> {
  const name = path.basename(current);
  const relativePath =
    current === root ? "" : path.relative(root, current).replace(/\\/g, "/");

  const info = await stat(current);
  if (!info.isDirectory()) {
    return {
      name,
      path: relativePath,
      type: "file",
    };
  }

  const entries = await readdir(current, { encoding: "utf-8" });
  const children: FileTreeNode[] = [];

  for (const entry of entries.sort()) {
    if (IGNORED_DIRS.has(entry)) continue;
    if (entry.startsWith(".") && entry !== ".") continue;

    const full = path.join(current, entry);
    const childStat = await stat(full);

    if (childStat.isDirectory()) {
      children.push(await buildFileTree(root, full));
    } else if (isSupportedFile(entry)) {
      const rel = path.relative(root, full).replace(/\\/g, "/");
      children.push({ name: entry, path: rel, type: "file" });
    }
  }

  return {
    name: name || path.basename(root),
    path: relativePath,
    type: "directory",
    children,
  };
}

function isSupportedFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

function collectFilePaths(node: FileTreeNode): string[] {
  if (node.type === "file" && node.path) {
    return [node.path];
  }
  const paths: string[] = [];
  for (const child of node.children ?? []) {
    paths.push(...collectFilePaths(child));
  }
  return paths;
}
