// Barrel re-export — preserves the public API of the former products.ts.
// shared.ts (getSeriesGroupsForCategoryBrand) is intentionally NOT re-exported
// to keep the helper private, matching the original module's visibility.

export * from "./queries";
export * from "./search";
