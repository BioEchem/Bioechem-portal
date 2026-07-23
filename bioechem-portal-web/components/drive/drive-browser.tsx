"use client";

import {
  ChevronRight,
  Download,
  File,
  FileText,
  FileVideo,
  FileImage,
  FolderOpen,
  FolderPlus,
  Home,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatBytes } from "@/lib/format/bytes";
import { formatShortDate as formatDate } from "@/lib/format/date";

type DriveItem = {
  id: string;
  name: string;
  type: "folder" | "file";
  parent_id: string | null;
  file_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  updated_at: string;
};

type BreadcrumbEntry = { id: string | null; name: string };

// Position of the active dropdown menu (screen coords)
type MenuPosition = { top: number; right: number };

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File className="h-5 w-5 text-bio-text-muted" />;
  if (mimeType.startsWith("image/")) return <FileImage className="h-5 w-5 text-purple-500" />;
  if (mimeType.startsWith("video/")) return <FileVideo className="h-5 w-5 text-blue-500" />;
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation")
  )
    return <FileText className="h-5 w-5 text-orange-500" />;
  return <File className="h-5 w-5 text-bio-text-muted" />;
}

export function DriveBrowser() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ id: null, name: "Drive" }]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadItems = useCallback(async (folderId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const url = folderId ? `/api/admin/drive?parent_id=${folderId}` : "/api/admin/drive";
      const res = await fetch(url);
      const json = await res.json() as { data?: DriveItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load.");
      setItems(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(currentFolderId); }, [currentFolderId, loadItems]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    }
    if (activeMenu) {
      document.addEventListener("mousedown", handle);
      return () => document.removeEventListener("mousedown", handle);
    }
  }, [activeMenu]);

  function openMenu(e: React.MouseEvent<HTMLButtonElement>, itemId: string) {
    e.stopPropagation();
    if (activeMenu === itemId) {
      setActiveMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
    setActiveMenu(itemId);
  }

  function navigateInto(item: DriveItem) {
    if (item.type !== "folder") return;
    setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name }]);
    setCurrentFolderId(item.id);
  }

  function navigateToBreadcrumb(entry: BreadcrumbEntry, idx: number) {
    setBreadcrumbs((prev) => prev.slice(0, idx + 1));
    setCurrentFolderId(entry.id);
  }

  async function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/admin/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parent_id: currentFolderId }),
      });
      const json = await res.json() as { data?: DriveItem; error?: string };
      if (!res.ok) throw new Error(json.error);
      setItems((prev) => [json.data!, ...prev]);
      setNewFolderMode(false);
      setNewFolderName("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create folder.");
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setUploading(true);
    for (const file of fileArray) {
      setUploadProgress(`Uploading ${file.name}…`);
      const form = new FormData();
      form.append("file", file);
      if (currentFolderId) form.append("parent_id", currentFolderId);
      try {
        const res = await fetch("/api/admin/drive/upload", { method: "POST", body: form });
        const json = await res.json() as { data?: DriveItem; error?: string };
        if (!res.ok) throw new Error(json.error);
        setItems((prev) => [...prev, json.data!]);
      } catch (e) {
        alert(`Failed to upload ${file.name}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }
    setUploading(false);
    setUploadProgress(null);
  }

  async function renameItem(id: string) {
    const name = renameValue.trim();
    if (!name) { setRenamingId(null); return; }
    try {
      const res = await fetch(`/api/admin/drive/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json() as { data?: { name: string }; error?: string };
      if (!res.ok) throw new Error(json.error);
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, name: json.data!.name } : i));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to rename.");
    } finally {
      setRenamingId(null);
    }
  }

  async function deleteItem(item: DriveItem) {
    const label = item.type === "folder"
      ? `folder "${item.name}" and all its contents`
      : `"${item.name}"`;
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    setActiveMenu(null);
    try {
      const res = await fetch(`/api/admin/drive/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error);
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete.");
    }
  }

  async function openFile(id: string) {
    try {
      const res = await fetch(`/api/admin/drive/${id}/url`);
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Failed to get URL.");
      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to open file.");
    }
  }

  function handleRowClick(item: DriveItem) {
    if (renamingId === item.id) return;
    if (item.type === "folder") {
      navigateInto(item);
    } else {
      void openFile(item.id);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) void uploadFiles(e.dataTransfer.files);
  }

  const activeItem = activeMenu ? items.find((i) => i.id === activeMenu) : null;
  const folders = items.filter((i) => i.type === "folder");
  const files = items.filter((i) => i.type === "file");

  return (
    <div
      className="relative"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-bio-green bg-bio-green/5">
          <p className="text-sm font-medium text-bio-green">Drop files to upload</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setNewFolderMode(true)}
          className="flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium text-bio-text hover:bg-bio-bg transition-colors"
        >
          <FolderPlus className="h-4 w-4" />
          New folder
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg bg-bio-green px-3 py-1.5 text-sm font-medium text-white hover:bg-bio-green/90 disabled:opacity-60 transition-colors"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? (uploadProgress ?? "Uploading…") : "Upload files"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) void uploadFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* Breadcrumbs */}
      <nav className="mb-4 flex items-center gap-1 text-sm text-bio-text-muted flex-wrap">
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />}
            {idx === breadcrumbs.length - 1 ? (
              <span className="font-medium text-bio-text flex items-center gap-1">
                {idx === 0 && <Home className="h-3.5 w-3.5" />}
                {crumb.name}
              </span>
            ) : (
              <button
                onClick={() => navigateToBreadcrumb(crumb, idx)}
                className="flex items-center gap-1 hover:text-bio-green transition-colors"
              >
                {idx === 0 && <Home className="h-3.5 w-3.5" />}
                {crumb.name}
              </button>
            )}
          </span>
        ))}
      </nav>

      {/* New folder input */}
      {newFolderMode && (
        <div className="mb-3 flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void createFolder();
              if (e.key === "Escape") { setNewFolderMode(false); setNewFolderName(""); }
            }}
            placeholder="Folder name"
            className="rounded-lg border border-card-border px-3 py-1.5 text-sm focus:border-bio-green focus:outline-none focus:ring-2 focus:ring-bio-green/20"
          />
          <button onClick={() => void createFolder()} className="rounded-lg bg-bio-green px-3 py-1.5 text-sm font-medium text-white hover:bg-bio-green/90">Create</button>
          <button onClick={() => { setNewFolderMode(false); setNewFolderName(""); }} className="rounded-lg border border-card-border px-3 py-1.5 text-sm text-bio-text-muted hover:text-bio-text">Cancel</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-bio-text-muted" />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-red-500">{error}</p>
      ) : items.length === 0 && !newFolderMode ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-card-border py-16 text-center">
          <FolderOpen className="h-10 w-10 text-bio-text-muted mb-3" />
          <p className="text-sm font-medium text-bio-text">This folder is empty</p>
          <p className="text-xs text-bio-text-muted mt-1">Drop files here or use the buttons above to add content.</p>
        </div>
      ) : (
        // No overflow-hidden here — that was clipping the dropdown
        <div className="rounded-xl border border-card-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-bio-bg">
                <th className="rounded-tl-xl px-4 py-2.5 text-left text-xs font-medium text-bio-text-muted">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-bio-text-muted hidden sm:table-cell">Size</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-bio-text-muted hidden md:table-cell">Modified</th>
                <th className="rounded-tr-xl px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {[...folders, ...files].map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  className="group cursor-pointer hover:bg-bio-bg/50 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {item.type === "folder"
                        ? <FolderOpen className="h-5 w-5 text-bio-green flex-shrink-0" />
                        : <FileIcon mimeType={item.mime_type} />}

                      {renamingId === item.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void renameItem(item.id);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          onBlur={() => void renameItem(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border border-bio-green px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-bio-green/20 min-w-0 w-48"
                        />
                      ) : (
                        <span className="font-medium text-bio-text truncate max-w-xs">{item.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-bio-text-muted hidden sm:table-cell">
                    {item.type === "file" && item.size_bytes != null ? formatBytes(item.size_bytes) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-bio-text-muted hidden md:table-cell">
                    {formatDate(item.updated_at)}
                  </td>
                  <td
                    className="px-4 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end">
                      <button
                        onClick={(e) => openMenu(e, item.id)}
                        className="rounded p-1 text-bio-text-muted opacity-0 group-hover:opacity-100 hover:bg-bio-bg hover:text-bio-text transition-all"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drop hint */}
      {!loading && !dragging && (
        <p className="mt-3 text-center text-xs text-bio-text-muted">
          Click a folder to open it · Click a file to open it · Drag &amp; drop files anywhere to upload
        </p>
      )}

      {/* Fixed-position dropdown — rendered outside the table so it's never clipped */}
      {activeMenu && activeItem && menuPos && (
        <div
          ref={dropdownRef}
          style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 50 }}
          className="min-w-[150px] rounded-lg border border-card-border bg-white shadow-xl"
        >
          <button
            onClick={() => { setRenamingId(activeItem.id); setRenameValue(activeItem.name); setActiveMenu(null); }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-bio-text hover:bg-bio-bg rounded-t-lg transition-colors"
          >
            <Pencil className="h-3.5 w-3.5 text-bio-text-muted" /> Rename
          </button>
          {activeItem.type === "file" && (
            <button
              onClick={async () => { setActiveMenu(null); await openFile(activeItem.id); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-bio-text hover:bg-bio-bg border-t border-card-border transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-bio-text-muted" /> Download
            </button>
          )}
          <button
            onClick={() => void deleteItem(activeItem)}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-card-border rounded-b-lg transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
