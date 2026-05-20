import { NextRequest, NextResponse } from "next/server";
import type { ParsedFile } from "@/lib/analyzer/types";
import { analyzeFileWithClaude } from "@/lib/claude/client";
import { readProjectFileContent } from "@/lib/claude/read-file";
import { validateProjectPath } from "@/lib/path-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectPath = body?.projectPath as string | undefined;
    const file = body?.file as ParsedFile | undefined;

    if (!file?.relativePath) {
      return NextResponse.json(
        { error: "file (ParsedFile) gerekli." },
        { status: 400 }
      );
    }

    const validation = await validateProjectPath(projectPath ?? "");
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const content = await readProjectFileContent(
      validation.resolved,
      file.relativePath
    );

    const analysis = await analyzeFileWithClaude(
      file.relativePath,
      content,
      file.symbols,
      file.imports,
      body?.projectContext as string | undefined
    );

    return NextResponse.json(analysis);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Analiz başarısız.";
    const isConfig =
      message.includes("ANTHROPIC_API_KEY") ||
      message.includes("api_key");
    return NextResponse.json(
      { error: message },
      { status: isConfig ? 503 : 500 }
    );
  }
}
