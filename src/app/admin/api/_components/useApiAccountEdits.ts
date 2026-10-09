"use client";

// Shared edit-state machine for the API account table (auto-save-on-blur).
// Extracted from ApiAccountTable.tsx (Phase 19) — pure move, zero behavior change.

import { useState } from "react";

export type ApiAccountEdits = Record<string, Record<string, string>>;

export interface ApiAccountEditsApi {
  edits: ApiAccountEdits;
  getEdit: (id: string, field: string, fallback: string) => string;
  setEdit: (id: string, field: string, value: string) => void;
  /** 保存成功后清除该行的编辑态 */
  clearEdit: (id: string) => void;
  hasEdits: (id: string) => boolean;
}

export function useApiAccountEdits(): ApiAccountEditsApi {
  // 编辑态：apiAccountId -> field -> value
  const [edits, setEdits] = useState<ApiAccountEdits>({});

  const getEdit = (id: string, field: string, fallback: string) =>
    edits[id]?.[field] ?? fallback;

  const setEdit = (id: string, field: string, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), [field]: value },
    }));
  };

  const clearEdit = (id: string) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const hasEdits = (id: string) => !!edits[id];

  return { edits, getEdit, setEdit, clearEdit, hasEdits };
}
