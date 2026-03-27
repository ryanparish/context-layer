import "dotenv/config";

import { startWorkers } from "./server/jobs/worker";

startWorkers();

// Keep process alive.
process.stdin.resume();

