import { ProspectsTable } from "@/components/table/prospects-table";

export default function ProspectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">Prospects Directory</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Manage and edit your prospect data synchronized directly with Google Sheets.
        </p>
      </div>
      
      <ProspectsTable />
    </div>
  );
}
