import { readFile } from "fs/promises";
import path from "path";

/** Reads a project file safely (path must stay under project root). */
export async function readProjectFileContent(
  projectPath: string,
  relativePath: string
): Promise<string> {
  const root = path.resolve(projectPath);
  const full = path.resolve(root, relativePath);

  const relative = path.relative(root, full);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Geçersiz dosya yolu.");
  }

  return readFile(full, { encoding: "utf-8" });
}
