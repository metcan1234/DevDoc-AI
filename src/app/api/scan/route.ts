import { NextRequest, NextResponse } from "next/server";
import { scanProject } from "@/lib/analyzer/scanner";
import { validateProjectPath } from "@/lib/path-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectPath = body?.projectPath as string | undefined;

    const validation = await validateProjectPath(projectPath ?? "");
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await scanProject(validation.resolved);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tarama başarısız.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
