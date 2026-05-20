import Anthropic from "@anthropic-ai/sdk";
import type { ParsedImport, ParsedSymbol } from "@/lib/analyzer/types";
import type { ClaudeAnalysisRequest, FileAnalysis } from "./types";

const MODEL = "claude-sonnet-4-20250514";
const MAX_CONTENT_CHARS = 48_000;

const SYSTEM_PROMPT = `Sen kıdemli bir yazılım mimarı ve kod inceleme uzmanısın.
Görevin: verilen kaynak dosyayı mimari açıdan analiz etmek, bağımlılıkları çıkarmak ve iyileştirme önerileri sunmak.

Kurallar:
- Kullanıcıya yönelik tüm metinleri Türkçe yaz.
- architecturalAnalysis alanı Markdown formatında olsun (başlıklar, madde işaretleri kullanılabilir).
- dependencies: statik import listesini ve Claude yorumunu birleştir; tekrarları kaldır.
- refactorSuggestions: somut, uygulanabilir öneriler (en az 2, en fazla 8 madde).
- Sadece verilen koda dayan; varsayımda bulunma.
- record_file_analysis aracını mutlaka kullan.`;

const ANALYSIS_TOOL: Anthropic.Tool = {
  name: "record_file_analysis",
  description: "Dosya mimari analizi, bağımlılıklar ve refactor önerilerini kaydet.",
  input_schema: {
    type: "object",
    properties: {
      architecturalAnalysis: {
        type: "string",
        description: "Markdown formatında mimari analiz (Türkçe).",
      },
      dependencies: {
        type: "array",
        items: { type: "string" },
        description: "Tespit edilen bağımlılıklar ve modüller.",
      },
      refactorSuggestions: {
        type: "array",
        items: { type: "string" },
        description: "İyileştirme ve refactor önerileri (Türkçe).",
      },
    },
    required: [
      "architecturalAnalysis",
      "dependencies",
      "refactorSuggestions",
    ],
  },
};

interface AnalysisToolInput {
  architecturalAnalysis: string;
  dependencies: string[];
  refactorSuggestions: string[];
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY ortam değişkeni tanımlı değil. .env dosyasına ekleyin."
    );
  }
  return new Anthropic({ apiKey });
}

function buildMetadataSection(
  filePath: string,
  parsedSymbols?: ParsedSymbol[],
  imports?: ParsedImport[],
  projectContext?: string
): string {
  const symbolLines =
    parsedSymbols && parsedSymbols.length > 0
      ? parsedSymbols
          .map((s) => `- ${s.kind} ${s.name}${s.line != null ? ` (satır ${s.line})` : ""}`)
          .join("\n")
      : "_Sembol yok._";

  const importLines =
    imports && imports.length > 0
      ? imports
          .map(
            (i) =>
              `- \`${i.module}\`${i.names.length > 0 ? ` → ${i.names.join(", ")}` : ""}`
          )
          .join("\n")
      : "_Import yok._";

  return `## Dosya
\`${filePath}\`

${projectContext ? `## Proje bağlamı\n${projectContext}\n\n` : ""}## Önceden çıkarılan semboller
${symbolLines}

## Önceden çıkarılan importlar
${importLines}`;
}

function extractToolInput(
  content: Anthropic.Message["content"]
): AnalysisToolInput {
  const block = content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!block || block.name !== "record_file_analysis") {
    throw new Error("Claude yanıtında yapılandırılmış analiz bulunamadı.");
  }
  return block.input as AnalysisToolInput;
}

/**
 * Calls Anthropic Messages API for architectural analysis of a single file.
 */
export async function analyzeFileWithClaude(
  filePath: string,
  content: string,
  parsedSymbols?: ParsedSymbol[],
  imports?: ParsedImport[],
  projectContext?: string
): Promise<FileAnalysis> {
  const client = getClient();

  let codeContent = content;
  let truncated = false;
  if (content.length > MAX_CONTENT_CHARS) {
    codeContent = content.slice(0, MAX_CONTENT_CHARS);
    truncated = true;
  }

  const metadata = buildMetadataSection(
    filePath,
    parsedSymbols,
    imports,
    projectContext
  );

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: "record_file_analysis" },
    messages: [
      {
        role: "user",
        content: `${metadata}\n\n## Kaynak kod\n\`\`\`\n${codeContent}\n\`\`\``,
      },
    ],
  });

  const input = extractToolInput(response.content);
  const truncationNote = truncated
    ? `\n\n> **Not:** Dosya ${content.length.toLocaleString("tr-TR")} karakter; analiz için ilk ${MAX_CONTENT_CHARS.toLocaleString("tr-TR")} karakter kullanıldı.`
    : "";

  return {
    architecturalAnalysis: input.architecturalAnalysis + truncationNote,
    dependencies: normalizeDependencies(input.dependencies, imports),
    refactorSuggestions: input.refactorSuggestions.filter(Boolean),
    analyzedAt: new Date().toISOString(),
    model: MODEL,
    truncated,
  };
}

/** Convenience wrapper using a request object. */
export async function analyzeFileRequest(
  request: ClaudeAnalysisRequest
): Promise<FileAnalysis> {
  return analyzeFileWithClaude(
    request.filePath,
    request.content,
    request.parsedSymbols,
    request.imports,
    request.projectContext
  );
}

export async function getImprovementSuggestions(
  filePath: string,
  content: string,
  parsedSymbols?: ParsedSymbol[],
  imports?: ParsedImport[]
): Promise<string[]> {
  const result = await analyzeFileWithClaude(
    filePath,
    content,
    parsedSymbols,
    imports
  );
  return result.refactorSuggestions;
}

function normalizeDependencies(
  fromClaude: string[],
  imports?: ParsedImport[]
): string[] {
  const fromImports =
    imports?.map((i) => {
      const names =
        i.names.length > 0 ? ` (${i.names.join(", ")})` : "";
      return `${i.module}${names}`;
    }) ?? [];

  const merged = new Set<string>();
  for (const d of [...fromImports, ...fromClaude]) {
    const trimmed = d.trim();
    if (trimmed) merged.add(trimmed);
  }
  return Array.from(merged);
}
