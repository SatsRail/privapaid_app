import { requireAdminApi } from "@/lib/auth-helpers";
import ImportExportClient from "./ImportExportClient";

export const dynamic = "force-dynamic";

export default async function ImportExportPage() {
  await requireAdminApi();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Import / Export</h1>
        <p className="mt-1 text-sm text-[var(--theme-text-secondary)]">
          Export your content as JSON or import from a file
        </p>
      </div>
      <ImportExportClient />
    </div>
  );
}
