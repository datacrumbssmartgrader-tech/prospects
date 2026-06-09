import { DuplicatesChecker } from "@/components/duplicates/duplicates-checker";

export default function DuplicatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          Duplicate Checker
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Compares incoming numbers against existing prospects. Export new records to the main sheet with stage "Contacted".
        </p>
      </div>

      <DuplicatesChecker />
    </div>
  );
}
