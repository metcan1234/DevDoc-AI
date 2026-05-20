import type { ParsedFile } from "@/lib/analyzer/types";

export interface ClaudeAnalysisRequest {
  file: ParsedFile;
  projectContext?: string;
}

export interface ClaudeAnalysisResponse {
  architecturalAnalysis: string;
  improvementSuggestions: string[];
}

/**
 * Stub Claude client — returns placeholder content until ANTHROPIC_API_KEY is wired.
 */
export async function analyzeFileWithClaude(
  request: ClaudeAnalysisRequest
): Promise<ClaudeAnalysisResponse> {
  const { file } = request;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return getStubAnalysis(file);
  }

  // Future: call Anthropic Messages API
  return getStubAnalysis(file);
}

export async function getImprovementSuggestions(
  file: ParsedFile
): Promise<string[]> {
  const result = await analyzeFileWithClaude({ file });
  return result.improvementSuggestions;
}

function getStubAnalysis(file: ParsedFile): ClaudeAnalysisResponse {
  const symbols = file.symbols.map((s) => s.name).join(", ") || "yok";

  return {
    architecturalAnalysis: `**[Claude Stub]** \`${file.relativePath}\` dosyası ${file.language} modülü olarak tarandı. Tespit edilen semboller: ${symbols}. Gerçek mimari analiz için \`ANTHROPIC_API_KEY\` ortam değişkenini ayarlayın.`,
    improvementSuggestions: [
      "Uzun fonksiyonları daha küçük birimlere bölün.",
      "Tekrarlayan import kalıplarını ortak bir modülde toplayın.",
      "JSDoc / docstring ile public API'leri belgeleyin.",
      "Bağımlılık grafiğini sadeleştirmek için döngüsel importları kontrol edin.",
    ],
  };
}
