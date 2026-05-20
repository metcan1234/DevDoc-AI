"use client";

import type { FileTreeNode } from "@/lib/analyzer/types";

interface FileTreeProps {
  tree: FileTreeNode | null;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

export function FileTree({ tree, selectedPath, onSelectFile }: FileTreeProps) {
  if (!tree) {
    return (
      <p className="text-sm text-zinc-500">
        Proje tarandığında dosya ağacı burada görünecek.
      </p>
    );
  }

  return (
    <ul className="text-sm font-mono">
      <TreeNode
        node={tree}
        selectedPath={selectedPath}
        onSelectFile={onSelectFile}
        depth={0}
      />
    </ul>
  );
}

function TreeNode({
  node,
  selectedPath,
  onSelectFile,
  depth,
}: {
  node: FileTreeNode;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  depth: number;
}) {
  if (node.type === "file" && node.path) {
    const isSelected = selectedPath === node.path;
    return (
      <li style={{ paddingLeft: depth * 12 }}>
        <button
          type="button"
          onClick={() => onSelectFile(node.path)}
          className={`w-full truncate text-left rounded px-1 py-0.5 hover:bg-zinc-800 ${
            isSelected ? "bg-emerald-900/50 text-emerald-300" : "text-zinc-300"
          }`}
        >
          {node.name}
        </button>
      </li>
    );
  }

  return (
    <li>
      {node.path !== "" && (
        <span
          className="block text-zinc-500 font-sans text-xs py-0.5"
          style={{ paddingLeft: depth * 12 }}
        >
          {node.name}/
        </span>
      )}
      <ul>
        {(node.children ?? []).map((child) => (
          <TreeNode
            key={child.path || child.name}
            node={child}
            selectedPath={selectedPath}
            onSelectFile={onSelectFile}
            depth={node.path === "" ? depth : depth + 1}
          />
        ))}
      </ul>
    </li>
  );
}
