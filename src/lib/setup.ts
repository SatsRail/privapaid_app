import { connectDB } from "./mongodb";
import Settings from "@/models/Settings";

// Always check MongoDB directly — no in-memory caching.
// All pages use force-dynamic, so fresh reads are expected.
export async function isSetupComplete(): Promise<boolean> {
  await connectDB();
  const settings = await Settings.findOne({ setup_completed: true }).lean();
  return !!settings;
}

// No-op: caching was removed but callers still reference this.
 
export function clearSetupCache(): void { /* intentional no-op */ }
