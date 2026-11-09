// Barrel re-export — preserves the public API of the original import-batch.ts.
// Real implementations live in ./markup and ./lifecycle (split by domain for maintainability).
// Shared helpers (./shared) are internal and not re-exported here.

export * from "./markup";
export * from "./lifecycle";
export * from "./compare";
export * from "./self-order";
