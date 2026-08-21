/**
 * Shared logger — extracted here to avoid a circular import between
 * server/index.ts (which imports routes) and server/routes.ts (which
 * previously imported log from index).
 */
export function log(message: string, source = "express"): void {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}
