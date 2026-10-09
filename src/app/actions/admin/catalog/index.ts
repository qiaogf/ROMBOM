// Barrel re-export — preserves the public API of the original catalog.ts.
// Real implementations live in ./categories, ./brands, ./series (split by domain for maintainability).
// Shared helpers (./shared) are internal and not re-exported here.

export * from "./categories";
export * from "./brands";
export * from "./series";
