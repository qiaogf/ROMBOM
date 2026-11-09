"use client";

/**
 * Shared client hook for CSV/Excel upload forms (admin + supplier portals).
 *
 * Owns file state, validation, submission, and result/error state.
 * Callers render their own JSX (sizes / result display differ between admin
 * and supplier). The hook is generic over the result shape so each portal
 * can declare its own `ImportResult*` type from `@/lib/import-form`.
 */
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { validateImportFile } from "@/lib/import-form";

interface UseImportFormOptions<TResult> {
  /** Endpoint that accepts multipart/form-data with a `file` field. */
  endpoint: string;
  /** Optional FormData field appended alongside `file` (e.g. "product_info" / "price"). */
  batchType?: string;
  /** When true, calls router.refresh() after a successful upload (supplier behavior). */
  refreshAfterSuccess?: boolean;
}

export function useImportForm<TResult>({
  endpoint,
  batchType,
  refreshAfterSuccess = false,
}: UseImportFormOptions<TResult>) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TResult | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const onFileChange = (e: ChangeEvent<HTMLInputElement>): File | null => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return null;
    }
    if (!validateImportFile(f)) {
      setError("Please upload an .xlsx, .xls, or .csv file.");
      setFile(null);
      return null;
    }
    setError("");
    setFile(f);
    return f;
  };

  /** 上传指定文件（供"点 Import 直接上传"的调用方使用，跳过表单提交事件） */
  const upload = async (f: File) => {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      if (batchType) fd.append("batchType", batchType);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { message?: string }).message || "Import failed.");
      } else {
        setResult(data as TResult);
        if (refreshAfterSuccess) router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a file. (.xlsx / .xls / .csv)");
      return;
    }
    await upload(file);
  };

  return { file, loading, result, error, onFileChange, onSubmit, upload };
}
