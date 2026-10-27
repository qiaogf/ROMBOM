// searchParams 单值读取：App Router 的 searchParams 值为 string | string[] | undefined

export function toStr(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}
