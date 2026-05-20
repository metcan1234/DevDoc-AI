import { NextRequest, NextResponse } from "next/server";
import path from "path";
import type { ScanResult } from "@/lib/analyzer/types";
import { analyzeScanResultFiles } from "@/lib/claude/batch";
import type { FileAnalysis } from "@/lib/claude/types";
import { scanProject } from "@/lib/analyzer/scanner";
import { generateVault } from "@/lib/obsidian/generator";
import { getVaultOutputDir, validateProjectPath } from "@/lib/path-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let scanResult = body?.scanResult as ScanResult | undefined;
    const projectPath = body?.projectPath as string | undefined;
    const outputDir = (body?.outputDir as string | undefined) ?? getVaultOutputDir();
    const skipAnalysis = body?.skipAnalysis === true;

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

    let analysisByFile = body?.analysisByFile as
      | Record<string, FileAnalysis>
      | undefined;

    const cache = new Map<string, FileAnalysis>();

    if (!skipAnalysis && !analysisByFile) {
      analysisByFile = await analyzeScanResultFiles(scanResult, {
        concurrency: 4,
        cache,
        projectContext: `Proje: ${scanResult.projectPath}`,
      });
    } else if (analysisByFile) {
      for (const [key, value] of Object.entries(analysisByFile)) {
        cache.set(key, value);
      }
    }

    const vault = await generateVault({
      scanResult,
      analysisByFile,
      outputDir: resolveOutputDir(outputDir),
    });

    return NextResponse.json({
      ...vault,
      analysisByFile,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Vault oluşturulamadı.";
    const isConfig =
      message.includes("ANTHROPIC_API_KEY") ||
      message.includes("api_key");
    return NextResponse.json(
      { error: message },
      { status: isConfig ? 503 : 500 }
    );
  }
}

function resolveOutputDir(dir: string): string {
  return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
}
