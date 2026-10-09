"use client";

// Shared inline-edit-table state machine for admin CRUD tables
// (Series / Category). Extracted in Phase 18 — pure move, zero behavior change.
// Per-entity field state (brand/category/parent selects) stays in each component.

import { useState, useTransition } from "react";

export interface InlineEditTable {
  /** 新建行名称 */
  name: string;
  setName: (v: string) => void;
  /** 行内/新建错误消息 */
  error: string;
  setError: (v: string) => void;
  /** Server Action transition pending 态 */
  pending: boolean;
  startTransition: React.TransitionStartFunction;
  /** 当前编辑行 id（null = 非编辑态） */
  editingId: string | null;
  /** 编辑态：名称 */
  editName: string;
  setEditName: (v: string) => void;
  /** 编辑态：启用状态 */
  editActive: boolean;
  setEditActive: (v: boolean) => void;
  /** 进入编辑态：填充行当前值并清空错误 */
  beginEdit: (row: { id: string; name: string; isActive: boolean }) => void;
  /** 取消编辑：退出编辑态并清空错误 */
  cancelEdit: () => void;
  /** 保存成功：退出编辑态 */
  finishEdit: () => void;
}

export function useInlineEditTable(): InlineEditTable {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // 行内编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);

  const beginEdit = (row: { id: string; name: string; isActive: boolean }) => {
    setError("");
    setEditingId(row.id);
    setEditName(row.name);
    setEditActive(row.isActive);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError("");
  };

  const finishEdit = () => {
    setEditingId(null);
  };

  return {
    name,
    setName,
    error,
    setError,
    pending,
    startTransition,
    editingId,
    editName,
    setEditName,
    editActive,
    setEditActive,
    beginEdit,
    cancelEdit,
    finishEdit,
  };
}
