"use client";

import type { LinkGraphEdge } from "@/lib/obsidian/types";

export interface VaultPreviewFile {
  vaultPath: string;
  fileName: string;
  content: string;
}

interface ObsidianPreviewProps {
  files: VaultPreviewFile[];
  linkGraph: LinkGraphEdge[];
  selectedVaultPath: string | null;
  onSelectVaultFile: (vaultPath: string) => void;
  outputDir: string | null;
}

export function ObsidianPreview({
  files,
  linkGraph,
  selectedVaultPath,
  onSelectVaultFile,
  outputDir,
}: ObsidianPreviewProps) {
  const selected = files.find((f) => f.vaultPath === selectedVaultPath) ?? files[0];

  return (
    <div className="flex flex-col h-full gap-3">
      {outputDir && (
        <p className="text-xs text-zinc-600 truncate" title={outputDir}>
          Vault: {outputDir}
        </p>
      )}

      {files.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Vault oluşturmak için tarama sonrası &quot;Vault Oluştur&quot; kullanın.
        </p>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap max-h-24 overflow-y-auto">
            {files.map((f) => (
              <button
                key={f.vaultPath}
                type="button"
                onClick={() => onSelectVaultFile(f.vaultPath)}
                className={`text-xs px-2 py-1 rounded font-mono truncate max-w-full ${
                  selected?.vaultPath === f.vaultPath
                    ? "bg-violet-900/60 text-violet-200"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {f.fileName}
              </button>
            ))}
          </div>

          <LinkGraphPanel graph={linkGraph} />

          {selected && (
            <pre className="flex-1 overflow-auto text-xs font-mono text-zinc-300 bg-zinc-900/80 rounded-lg p-3 border border-zinc-800 whitespace-pre-wrap">
              {selected.content}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

function LinkGraphPanel({ graph }: { graph: LinkGraphEdge[] }) {
  if (graph.length === 0) return null;

  const uniqueEdges = graph.slice(0, 20);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
      <h4 className="text-xs font-medium text-violet-400 mb-1">Bağlantı grafiği</h4>
      <ul className="text-xs font-mono text-zinc-500 space-y-0.5 max-h-20 overflow-y-auto">
        {uniqueEdges.map((e, i) => (
          <li key={`${e.from}-${e.to}-${i}`}>
            <span className="text-violet-300">[[{e.from}]]</span>
            <span className="text-zinc-600"> → </span>
            <span className="text-violet-300">[[{e.to}]]</span>
          </li>
        ))}
        {graph.length > 20 && (
          <li className="text-zinc-600">+{graph.length - 20} daha…</li>
        )}
      </ul>
    </div>
  );
}
