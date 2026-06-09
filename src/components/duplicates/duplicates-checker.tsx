"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Upload, Search } from "lucide-react";

type AnnotatedEntry = {
  prospectName: string;
  phoneNumber: string;
  normalizedPhone: string;
  rowIndex: number;
  isDuplicate: boolean;
};

type Filter = "all" | "new" | "duplicate";

export function DuplicatesChecker() {
  const [entries, setEntries] = useState<AnnotatedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/duplicates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setEntries(data.entries);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleExport = async () => {
    const toExport = entries.filter((e) => !e.isDuplicate);
    if (toExport.length === 0) {
      toast.error("No new records to export");
      return;
    }

    setExporting(true);
    try {
      const res = await fetch("/api/duplicates/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospects: toExport.map((e) => ({
            prospectName: e.prospectName,
            phoneNumber: e.normalizedPhone,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");
      toast.success(`${data.exported} record${data.exported !== 1 ? "s" : ""} exported with stage "Contacted"`);
      fetchEntries();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  const newCount = entries.filter((e) => !e.isDuplicate).length;
  const dupCount = entries.filter((e) => e.isDuplicate).length;

  const q = search.trim().toLowerCase();
  const visible = entries.filter((e) => {
    if (filter === "new" && e.isDuplicate) return false;
    if (filter === "duplicate" && !e.isDuplicate) return false;
    if (q) {
      return (
        e.prospectName.toLowerCase().includes(q) ||
        e.phoneNumber.includes(q) ||
        e.normalizedPhone.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Summary + Export */}
      <div className="flex items-center justify-between">
        {loading ? (
          <span className="text-sm text-zinc-400">Loading…</span>
        ) : (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-green-600 dark:text-green-400">{newCount} new</span>
            {" · "}
            <span className="font-medium text-red-500">{dupCount} duplicate{dupCount !== 1 ? "s" : ""}</span>
            {" · "}
            {entries.length} total
          </span>
        )}
        <Button
          onClick={handleExport}
          disabled={loading || exporting || newCount === 0}
          className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium cursor-pointer"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Export {newCount > 0 ? `${newCount} ` : ""}new to main sheet
            </>
          )}
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <Input
            placeholder="Search name or number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "new", "duplicate"] as Filter[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className={
                filter === f
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
                  : "cursor-pointer"
              }
            >
              {f === "all" ? "All" : f === "new" ? "New" : "Duplicates"}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/30">
              <TableHead className="font-medium text-zinc-500 dark:text-zinc-400 w-12">#</TableHead>
              <TableHead className="font-medium text-zinc-500 dark:text-zinc-400">Prospect Name</TableHead>
              <TableHead className="font-medium text-zinc-500 dark:text-zinc-400">Number</TableHead>
              <TableHead className="font-medium text-zinc-500 dark:text-zinc-400">Duplicate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex items-center justify-center text-zinc-500">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Checking for duplicates…
                  </div>
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-zinc-500">
                  {entries.length === 0
                    ? "No entries found in the source tab."
                    : "No entries match your search or filter."}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((entry, i) => (
                <TableRow key={`${entry.rowIndex}-${i}`}>
                  <TableCell className="text-zinc-400 text-xs tabular-nums">{i + 1}</TableCell>
                  <TableCell className="font-medium text-zinc-800 dark:text-zinc-200">
                    {entry.prospectName || <span className="text-zinc-400 italic text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300 font-mono text-sm">
                    {entry.phoneNumber}
                  </TableCell>
                  <TableCell>
                    {entry.isDuplicate ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                        Already Exists
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                        Doesn&apos;t Exist
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
