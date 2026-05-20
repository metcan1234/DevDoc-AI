import { access, stat } from "fs/promises";
import path from "path";

/**
 * Validates that a path exists and is a directory.
 * Resolves to an absolute path for consistent server-side handling.
 */
export async function validateProjectPath(
  inputPath: string
): Promise<{ ok: true; resolved: string } | { ok: false; error: string }> {
  if (!inputPath || typeof inputPath !== "string") {
    return { ok: false, error: "Proje yolu gerekli." };
  }

  const trimmed = inputPath.trim();
  if (!trimmed) {
    return { ok: false, error: "Proje yolu boş olamaz." };
  }

  let resolved: string;
  try {
    resolved = path.resolve(trimmed);
  } catch {
    return { ok: false, error: "Geçersiz yol formatı." };
  }

  try {
    await access(resolved);
  } catch {
    return { ok: false, error: `Yol bulunamadı: ${resolved}` };
  }

  try {
    const info = await stat(resolved);
    if (!info.isDirectory()) {
      return { ok: false, error: "Belirtilen yol bir dizin değil." };
    }
  } catch {
    return { ok: false, error: "Dizin bilgisi okunamadı." };
  }

  return { ok: true, resolved };
}

/** Default vault output directory (project-relative). */
export function getVaultOutputDir(): string {
  return process.env.VAULT_OUTPUT_DIR?.trim() || "vault-output";
}
