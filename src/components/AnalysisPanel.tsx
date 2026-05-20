"use client";

import type { ParsedFile } from "@/lib/analyzer/types";

interface AnalysisPanelProps {
  file: ParsedFile | null;
  architecturalAnalysis: string;
  suggestions: string[];
  loading?: boolean;
}

export function AnalysisPanel({
  file,
  architecturalAnalysis,
  suggestions,
  loading,
}: AnalysisPanelProps) {
  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
        Analiz için soldan bir dosya seçin.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 text-sm">
        Analiz yükleniyor…
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-y-auto h-full pr-2">
      <header>
        <h2 className="text-lg font-semibold text-zinc-100 break-all">
          {file.relativePath}
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          {file.language} · {file.lineCount} satır · {file.symbols.length} sembol
        </p>
      </header>

      <section>
        <h3 className="text-sm font-medium text-emerald-400 mb-2">
          Tespit edilen semboller
        </h3>
        {file.symbols.length === 0 ? (
          <p className="text-sm text-zinc-500">Sembol bulunamadı.</p>
        ) : (
          <ul className="grid gap-1 text-sm font-mono">
            {file.symbols.map((s) => (
              <li
                key={`${s.kind}-${s.name}-${s.line}`}
                className="flex gap-2 text-zinc-300"
              >
                <span className="text-zinc-500 w-20 shrink-0">{s.kind}</span>
                <span className="text-emerald-300">{s.name}</span>
                {s.line != null && (
                  <span className="text-zinc-600">:{s.line}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-emerald-400 mb-2">İçe aktarmalar</h3>
        {file.imports.length === 0 ? (
          <p className="text-sm text-zinc-500">Import yok.</p>
        ) : (
          <ul className="text-sm font-mono text-zinc-400 space-y-1">
            {file.imports.map((imp, i) => (
              <li key={`${imp.module}-${i}`}>
                <span className="text-zinc-500">from</span> {imp.module}
                {imp.names.length > 0 && (
                  <span className="text-zinc-600">
                    {" "}
                    ({imp.names.join(", ")})
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-sky-400 mb-2">
          Mimari analiz
        </h3>
        <div className="prose prose-invert prose-sm max-w-none text-zinc-300 whitespace-pre-wrap text-sm leading-relaxed">
          {architecturalAnalysis}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-amber-400 mb-2">
          İyileştirme / Refactor önerileri
        </h3>
        <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
          {suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
