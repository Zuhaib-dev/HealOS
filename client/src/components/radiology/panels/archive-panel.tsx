"use client";

import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Search,
  Eye,
  Download,
  Filter,
  RefreshCw,
  CheckCircle2,
  FolderOpen,
  FileCheck,
  ShieldCheck,
  X,
} from "lucide-react";
import { PanelHeader } from "@/components/admin/admin-shell";
import { fetchDocumentsApi, StudyDocRecord } from "@/lib/api/radiology";
import { openProtectedReport } from "@/lib/api/reports";
import { toast } from "sonner";

export function ArchivePanel() {
  const [documents, setDocuments] = useState<StudyDocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("ALL");
  const [stateFilter, setStateFilter] = useState<string>("ALL");

  const loadDocuments = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetchDocumentsApi();
      if (res.status === "success") {
        setDocuments(res.data.documents || []);
      }
    } catch {
      toast.error("Failed to load study archive");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const kinds = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.kind) set.add(d.kind);
    });
    return Array.from(set);
  }, [documents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (kindFilter !== "ALL" && d.kind !== kindFilter) return false;
      if (stateFilter !== "ALL" && d.state !== stateFilter) return false;

      if (!q) return true;
      const text =
        `${d.fileName || ""} ${d.patient?.firstName || ""} ${d.patient?.lastName || ""} ${d.order?.accessionNumber || ""} ${d.order?.testName || ""} ${d.kind || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [documents, search, kindFilter, stateFilter]);

  return (
    <section className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PanelHeader
        index="04 / archive & pacs storage"
        title="Diagnostic Study Archive"
        note="Permanent clinical archive of verified diagnostic reports, scanned request orders, prior comparison studies, and DICOM imaging series."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadDocuments(true)}
              disabled={isRefreshing}
              aria-label="Refresh archive"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 hover:bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="p-4 sm:px-6 border-b border-border/60 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Kind Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setKindFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              kindFilter === "ALL"
                ? "bg-foreground text-background font-semibold shadow-xs"
                : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            All Documents ({documents.length})
          </button>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                kindFilter === k
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            id="radiology-archive-search"
            aria-label="Filter archive by file, patient, or accession"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filename, patient, accession #..."
            className="w-full bg-background border border-border/80 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/25"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Archive Documents List */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full min-w-[950px] border-collapse text-left text-xs">
          <thead className="bg-muted/40 uppercase font-mono text-[10px] text-muted-foreground border-b border-border/70">
            <tr>
              <th className="p-3.5">Document File</th>
              <th className="p-3.5">Category / Kind</th>
              <th className="p-3.5">Patient &amp; Accession</th>
              <th className="p-3.5">File Size</th>
              <th className="p-3.5">Uploaded Date</th>
              <th className="p-3.5">Audit State</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="size-6 animate-spin text-primary" />
                    <span className="font-mono text-xs">
                      Loading PACS study archive...
                    </span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <FolderOpen className="size-8 text-muted-foreground/30 mb-1" />
                    <p className="font-medium text-foreground text-sm">
                      No documents found
                    </p>
                    <p className="text-xs">
                      {search
                        ? "Try clearing your search query."
                        : "Attached studies will archive here automatically."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d._id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3.5 font-medium text-foreground">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-xs">
                          {d.fileName}
                        </p>
                        {d.pages > 0 && (
                          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                            {d.pages} page{d.pages === 1 ? "" : "s"}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                    <span className="px-2 py-0.5 rounded bg-muted/60 text-foreground font-semibold">
                      {d.kind}
                    </span>
                  </td>

                  <td className="p-3.5">
                    <p className="font-semibold text-foreground">
                      {d.patient?.firstName} {d.patient?.lastName}
                    </p>
                    <p className="font-mono text-[10px] text-primary">
                      {d.order?.accessionNumber || "ACC-N/A"}
                    </p>
                  </td>

                  <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                    {d.fileSize || "—"}
                  </td>

                  <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                    <p>
                      {new Date(d.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-[10px]">
                      {d.uploadedBy ||
                        (d.radiologist
                          ? `Dr. ${d.radiologist.lastName}`
                          : "System")}
                    </p>
                  </td>

                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        d.state === "verified"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : d.state === "pending sign"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-rose-500/15 text-rose-600"
                      }`}
                    >
                      {d.state || "Verified"}
                    </span>
                  </td>

                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        openProtectedReport(d._id).catch(() =>
                          toast.error("Unable to open protected document"),
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Eye className="size-3.5" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
