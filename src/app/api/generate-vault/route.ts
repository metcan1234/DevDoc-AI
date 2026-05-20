import { NextRequest, NextResponse } from "next/server";
import path from "path";
import type { ScanResult } from "@/lib/analyzer/types";
import { scanProject } from "@/lib/analyzer/scanner";
import { generateVault } from "@/lib/obsidian/generator";
import { getVaultOutputDir, validateProjectPath } from "@/lib/path-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let scanResult = body?.scanResult as ScanResult | undefined;
    const projectPath = body?.projectPath as string | undefined;
    const outputDir = (body?.outputDir as string | undefined) ?? getVaultOutputDir();

    if (!scanResult && projectPath) {
      const validation = await validateProjectPath(projectPath);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      scanResult = await scanProject(validation.resolved);
    }

    if (!scanResult?.files?.length) {
      return NextResponse.json(
        { error: "scanResult veya geçerli projectPath gerekli." },
        { status: 400 }
      );
    }

    const vault = await generateVault({
      scanResult,
      analysisByFile: body?.analysisByFile,
      outputDir: resolveOutputDir(outputDir),
    });

    return NextResponse.json(vault);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vault oluşturulamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function resolveOutputDir(dir: string): string {
  return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
}
