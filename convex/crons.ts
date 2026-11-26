import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// The public demo starts over every night (devtools:demoReset). Anywhere else, where
// LENDLOOP_DEMO isn't set, the run returns straight away without touching anything.
crons.daily("reset the public demo", { hourUTC: 3, minuteUTC: 30 }, internal.devtools.demoReset, {});

// Audit entries are kept for a year, then deleted (GDPR storage limitation).
crons.daily("delete audit entries older than a year", { hourUTC: 4, minuteUTC: 0 }, internal.admin.purgeAuditLogAll, {});

export default crons;
