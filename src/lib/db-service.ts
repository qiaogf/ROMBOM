// Barrel re-export — keeps all existing `from "@/lib/db-service"` imports working unchanged.
// Real implementations live in ./db/* modules (split by domain for maintainability).

export * from "./db/types";
export * from "./db/catalog";
export * from "./db/series";
export * from "./db/products";
