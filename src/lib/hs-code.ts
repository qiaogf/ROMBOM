// HS Code 智能推导 — 按产品名称/型号/描述中的关键词匹配 6 位大类编码。
// 目的：同类产品得到一致的默认值，供管理员在 Sales 明细中确认或修改。
// 未命中返回空字符串，由人工填写；系统不虚构具体商品编码。

const HS_RULES: Array<{ keywords: string[]; code: string }> = [
  { keywords: ["pump", "泵"], code: "8413.70" },
  { keywords: ["compressor", "压缩机"], code: "8414.30" },
  { keywords: ["fan", "风机", "风扇"], code: "8414.59" },
  { keywords: ["cylinder", "气缸", "油缸", "液压缸"], code: "8412.21" },
  { keywords: ["valve", "阀门", "阀"], code: "8481.80" },
  { keywords: ["bearing", "轴承"], code: "8482.10" },
  { keywords: ["gear", "齿轮", "reducer", "减速机"], code: "8483.40" },
  { keywords: ["coupling", "联轴器"], code: "8483.60" },
  { keywords: ["seal", "密封", "gasket", "垫片", "o-ring"], code: "8484.20" },
  { keywords: ["filter", "滤芯", "过滤器"], code: "8421.23" },
  { keywords: ["motor", "电机", "马达"], code: "8501.10" },
  { keywords: ["inverter", "变频器"], code: "8504.40" },
  { keywords: ["transformer", "变压器"], code: "8504.31" },
  { keywords: ["battery", "电池"], code: "8507.60" },
  { keywords: ["sensor", "传感器"], code: "9026.20" },
  { keywords: ["cable", "电缆", "线缆", "wire"], code: "8544.42" },
  { keywords: ["connector", "连接器", "接插件"], code: "8536.69" },
  { keywords: ["switch", "开关"], code: "8536.50" },
  { keywords: ["relay", "继电器"], code: "8536.41" },
  { keywords: ["pcb", "circuit board", "电路板"], code: "8534.00" },
  { keywords: ["led"], code: "8539.50" },
  { keywords: ["screw", "bolt", "nut", "螺钉", "螺栓", "螺母"], code: "7318.15" },
  { keywords: ["spring", "弹簧"], code: "7320.20" },
  { keywords: ["chain", "链条"], code: "7315.11" },
  { keywords: ["belt", "皮带", "传送带"], code: "4010.39" },
  { keywords: ["flange", "法兰"], code: "7307.21" },
  { keywords: ["pipe", "tube", "钢管", "管道"], code: "7304.31" },
  { keywords: ["display", "显示屏", "monitor"], code: "8528.52" },
  { keywords: ["camera", "摄像"], code: "8525.89" },
  { keywords: ["keyboard", "mouse", "键盘", "鼠标"], code: "8471.60" },
  { keywords: ["laptop", "computer", "笔记本", "电脑"], code: "8471.30" },
  { keywords: ["tool", "工具", "drill", "钻头"], code: "8207.50" },
  { keywords: ["magnet", "磁铁", "磁"], code: "8505.11" },
];

/** 从若干文本片段中推断 HS Code；无匹配返回空字符串 */
export function inferHsCode(...parts: Array<string | null | undefined>): string {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  if (!text) return "";
  for (const rule of HS_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) return rule.code;
  }
  return "";
}
