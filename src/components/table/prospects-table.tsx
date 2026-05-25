"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Prospect } from "@/lib/google";
import { getCanonicalStage } from "@/lib/stages";
import { Search, Loader2 } from "lucide-react";

export function ProspectsTable() {
  const [data, setData] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Form visibility state
  const [isAdding, setIsAdding] = useState(false);
  
  // New prospect field states
  const [newProspectName, setNewProspectName] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newStage, setNewStage] = useState("");
  const [newSourceSheet, setNewSourceSheet] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract unique sheets from current prospects data
  const sheets = useMemo(() => {
    return Array.from(new Set(data.map((p) => p.sourceSheet).filter(Boolean)));
  }, [data]);

  // Derive unique stages dynamically from loaded data
  const uniqueStages = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of data) {
      const s = getCanonicalStage(p.stage);
      if (s && !seen.has(s)) {
        seen.add(s);
        result.push(s);
      }
    }
    return result.sort();
  }, [data]);

  // Set default sheet once sheets load
  useEffect(() => {
    if (sheets.length > 0 && !newSourceSheet) {
      setNewSourceSheet(sheets[0]);
    }
  }, [sheets, newSourceSheet]);

  // Set default stage once stages load
  useEffect(() => {
    if (uniqueStages.length > 0 && !newStage) {
      setNewStage(uniqueStages[0]);
    }
  }, [uniqueStages, newStage]);

  const clearForm = () => {
    setNewProspectName("");
    setNewPhoneNumber("");
    setNewStage(uniqueStages[0] ?? "");
    if (sheets.length > 0) {
      setNewSourceSheet(sheets[0]);
    }
  };

  const handleAddProspect = async () => {
    if (!newProspectName.trim()) {
      toast.error("Prospect Name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectName: newProspectName.trim(),
          phoneNumber: newPhoneNumber.trim(),
          stage: newStage,
          sourceSheet: newSourceSheet || (sheets.length > 0 ? sheets[0] : "Sheet1"),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add prospect");
      }

      const newProspect = await res.json();
      
      // Update local state by appending new prospect
      setData((old) => [...old, newProspect]);
      toast.success("Prospect added successfully!");
      setIsAdding(false);
      clearForm();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to add prospect");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/prospects");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (error) {
      toast.error("Failed to load prospects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateData = async (
    id: string,
    field: string,
    value: string,
    originalRow: Prospect
  ) => {
    const originalValue = (originalRow as any)[field];
    if (originalValue === value) return; // no change

    // Optimistic update
    setData((old) =>
      old.map((row) => {
        if (row.id === id) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );

    const promise = fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [field]: value,
        sourceSheet: originalRow.sourceSheet,
        rowIndex: originalRow.rowIndex,
      }),
    }).then((res) => {
      if (!res.ok) throw new Error("Update failed");
    });

    toast.promise(promise, {
      loading: "Saving...",
      success: "Row updated successfully!",
      error: () => {
        // Revert on error
        setData((old) =>
          old.map((row) => {
            if (row.id === id) {
              return { ...row, [field]: originalValue };
            }
            return row;
          })
        );
        return "Failed to save update";
      },
    });
  };

  const columns = useMemo<ColumnDef<Prospect>[]>(
    () => [
      {
        id: "serialNumber",
        header: "S.No",
        cell: ({ row, table }) => {
          const globalIndex = table.getFilteredRowModel().flatRows.indexOf(row) + 1;
          return <span className="font-mono text-zinc-400 dark:text-zinc-500 text-xs">{globalIndex}</span>;
        },
      },
      {
        accessorKey: "prospectName",
        header: "Prospect Name",
        cell: ({ row, getValue }) => {
          const initialValue = getValue() as string;
          return (
            <EditableCell
              initialValue={initialValue}
              onSave={(val) =>
                updateData(row.original.id, "prospectName", val, row.original)
              }
            />
          );
        },
      },
      {
        accessorKey: "phoneNumber",
        header: "Phone Number",
        cell: ({ row, getValue }) => {
          const initialValue = getValue() as string;
          return (
            <EditableCell
              initialValue={initialValue}
              onSave={(val) =>
                updateData(row.original.id, "phoneNumber", val, row.original)
              }
            />
          );
        },
      },
      {
        accessorKey: "stage",
        header: "Stage",
        cell: ({ row, getValue }) => {
          const initialValue = getCanonicalStage(getValue() as string);
          return (
            <Select
              value={initialValue}
              onValueChange={(val) =>
                updateData(row.original.id, "stage", val as string, row.original)
              }
            >
              <SelectTrigger className="w-[140px] border-none bg-transparent shadow-none hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <SelectValue placeholder="Select Stage" />
              </SelectTrigger>
              <SelectContent>
                {uniqueStages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      {
        accessorKey: "sourceSheet",
        header: "Source",
        cell: ({ row }) => (
          <span className="text-zinc-500 text-sm">{row.original.sourceSheet}</span>
        ),
      },
    ],
    [uniqueStages]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      return (
        String(row.getValue("prospectName")).toLowerCase().includes(search) ||
        String(row.getValue("phoneNumber")).toLowerCase().includes(search)
      );
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 12,
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          <Input
            placeholder="Search prospects..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-48">
            <Select
              value={(table.getColumn("stage")?.getFilterValue() as string) ?? "all"}
              onValueChange={(val) => {
                if (val === "all") {
                  table.getColumn("stage")?.setFilterValue("");
                } else {
                  table.getColumn("stage")?.setFilterValue(val);
                }
              }}
            >
              <SelectTrigger className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 w-full">
                <SelectValue placeholder="Filter by Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {uniqueStages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => setIsAdding(!isAdding)}
            variant={isAdding ? "outline" : "default"}
            className="w-full sm:w-auto font-medium"
          >
            {isAdding ? "Cancel" : "Add Row"}
          </Button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4 shadow-xs transition-all duration-200">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Add New Prospect Row</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Prospect Name *</label>
              <Input
                placeholder="Name"
                value={newProspectName}
                onChange={(e) => setNewProspectName(e.target.value)}
                className="h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Phone Number</label>
              <Input
                placeholder="Phone"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                className="h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
              />
            </div>

             <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Stage</label>
              <Select value={newStage} onValueChange={(val) => setNewStage(val || "Contacted")}>
                <SelectTrigger className="h-9 w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                  <SelectValue placeholder="Select Stage" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueStages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sheets.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Source Sheet</label>
                <Select value={newSourceSheet} onValueChange={(val) => setNewSourceSheet(val || "")}>
                  <SelectTrigger className="h-9 w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <SelectValue placeholder="Select Sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((sheet) => (
                      <SelectItem key={sheet} value={sheet}>
                        {sheet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                clearForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddProspect}
              disabled={isSubmitting || !newProspectName.trim()}
              className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-zinc-50/50 dark:bg-zinc-900/30">
                {headerGroup.headers.map((header) => {
                  const isSerial = header.column.id === "serialNumber";
                  return (
                    <TableHead 
                      key={header.id} 
                      className={`font-medium text-zinc-500 dark:text-zinc-400 ${
                        isSerial ? "print:hidden w-16 text-center" : ""
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-zinc-500">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    Loading prospects...
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const isSerial = cell.column.id === "serialNumber";
                    return (
                      <TableCell 
                        key={cell.id} 
                        className={`p-2 ${
                          isSerial ? "print:hidden text-center text-zinc-400 dark:text-zinc-500 font-mono text-xs w-16" : ""
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center text-zinc-500">
                  No prospects found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-500">
          Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} rows
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditableCell({
  initialValue,
  onSave,
}: {
  initialValue: string;
  onSave: (val: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    setIsEditing(false);
    if (value !== initialValue) {
      onSave(value);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
    if (e.key === "Escape") {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="h-8 py-1 px-2 border-zinc-300 dark:border-zinc-700 w-full"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-text px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors min-h-[32px] flex items-center"
    >
      {value || <span className="text-zinc-400 italic">Empty</span>}
    </div>
  );
}
