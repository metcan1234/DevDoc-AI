"use client";

import { useCallback, useState } from "react";
import type { ParsedFile, ScanResult } from "@/lib/analyzer/types";
import type { LinkGraphEdge } from "@/lib/obsidian/types";
import { FileTree } from "./FileTree";
import { AnalysisPanel } from "./AnalysisPanel";
import { ObsidianPreview, type VaultPreviewFile } from "./ObsidianPreview";

export function ProjectScanner() {
  const [projectPath, setProjectPath] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [vaultFiles, setVaultFiles] = useState<VaultPreviewFile[]>([]);
  const [linkGraph, setLinkGraph] = useState<LinkGraphEdge[]>([]);
  const [vaultOutputDir, setVaultOutputDir] = useState<string | null>(null);
  const [selectedVaultPath, setSelectedVaultPath] = useState<string | null>(null);
  const [loading, setLoading] = useState<"scan" | "vault" | "analysis" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedFile: ParsedFile | null =
    scanResult?.files.find((f) => f.relativePath === selectedPath) ?? null;

  const handleScan = useCallback(async () => {
    setError(null);
    setLoading("scan");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tarama hatası");
      setScanResult(data);
      if (data.files?.length > 0) {
        setSelectedPath(data.files[0].relativePath);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bilinmeyen hata");
    } finally {
      setLoading(null);
    }
  }, [projectPath]);

  const loadAnalysis = useCallback(async (file: ParsedFile) => {
    setLoading("analysis");
    try {
      const arch = `**[Yer tutucu]** ${file.relativePath} — ${file.symbols.length} sembol, ${file.imports.length} import. Claude API bağlandığında gerçek mimari analiz üretilecek.`;
      const sug = [
        "Modül sorumluluklarını tek bir katmanda toplayın.",
        "Public API için tip tanımlarını/export'ları netleştirin.",
        "Test kapsamı düşük semboller için birim test ekleyin.",
      ];
      setAnalysis(arch);
      setSuggestions(sug);
    } finally {
      setLoading(null);
    }
  }, []);

  const handleSelectFile = useCallback(
    (path: string) => {
      setSelectedPath(path);
      const file = scanResult?.files.find((f) => f.relativePath === path);
      if (file) void loadAnalysis(file);
    },
    [scanResult, loadAnalysis]
  );

  const handleGenerateVault = useCallback(async () => {
    if (!scanResult) return;
    setError(null);
    setLoading("vault");
    try {
      const res = await fetch("/api/generate-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanResult }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vault hatası");

      setLinkGraph(data.linkGraph ?? []);
      setVaultOutputDir(data.outputDir ?? null);

      const previews: VaultPreviewFile[] = (data.documents ?? []).map(
        (d: { vaultPath: string; fileName: string; content: string }) => ({
          vaultPath: d.vaultPath,
          fileName: d.fileName,
          content: d.content,
        })
      );
      setVaultFiles(previews);
      if (previews.length > 0) {
        setSelectedVaultPath(previews[0].vaultPath);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bilinmeyen hata");
    } finally {
      setLoading(null);
    }
  }, [scanResult]);

  const handleRefreshVault = useCallback(async () => {
    setLoading("vault");
    try {
      const res = await fetch("/api/vault");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vault okuma hatası");
      setVaultOutputDir(data.outputDir ?? null);
      setVaultFiles(data.files ?? []);
      if (data.files?.length > 0) {
        setSelectedVaultPath(data.files[0].vaultPath);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bilinmeyen hata");
    } finally {
      setLoading(null);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-zinc-800 bg-zinc-950 px-4 py-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-emerald-400 tracking-tight">
            DevDoc AI
          </h1>
          <input
            type="text"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder="C:\projeler\benim-proje"
            className="flex-1 min-w-[200px] rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <button
            type="button"
            onClick={() => void handleScan()}
            disabled={loading === "scan" || !projectPath.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading === "scan" ? "Taranıyor…" : "Tara"}
          </button>
          <button
            type="button"
            onClick={() => void handleGenerateVault()}
            disabled={loading === "vault" || !scanResult}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading === "vault" ? "Oluşturuluyor…" : "Vault Oluştur"}
          </button>
          <button
            type="button"
            onClick={() => void handleRefreshVault()}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            Vault Yenile
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        {scanResult && (
          <p className="mt-1 text-xs text-zinc-500">
            {scanResult.totalFiles} dosya · {scanResult.scannedAt}
          </p>
        )}
      </header>

      <main className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <aside className="lg:w-72 border-b lg:border-b-0 lg:border-r border-zinc-800 p-4 overflow-y-auto shrink-0 max-h-48 lg:max-h-none">
          <h2 className="text-xs font-semibold uppercase text-zinc-500 mb-2">
            Dosya ağacı
          </h2>
          <FileTree
            tree={scanResult?.fileTree ?? null}
            selectedPath={selectedPath}
            onSelectFile={handleSelectFile}
          />
        </aside>

        <section className="flex-1 p-4 min-h-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-zinc-800">
          <AnalysisPanel
            file={selectedFile}
            architecturalAnalysis={analysis}
            suggestions={suggestions}
            loading={loading === "analysis"}
          />
        </section>

        <aside className="lg:w-96 p-4 min-h-0 overflow-hidden flex flex-col">
          <h2 className="text-xs font-semibold uppercase text-zinc-500 mb-2 shrink-0">
            Obsidian önizleme
          </h2>
          <div className="flex-1 min-h-0">
            <ObsidianPreview
              files={vaultFiles}
              linkGraph={linkGraph}
              selectedVaultPath={selectedVaultPath}
              onSelectVaultFile={setSelectedVaultPath}
              outputDir={vaultOutputDir}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
