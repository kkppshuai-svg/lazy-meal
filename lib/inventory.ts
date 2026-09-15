export type InventoryStatus = "fresh" | "soon" | "expired" | "unknown";

export function deriveExpiry(expiresAt: number | null) {
  if (!expiresAt) return { daysLeft: null, status: "unknown" as InventoryStatus, label: "日期待确认" };
  const daysLeft = Math.ceil((expiresAt - Date.now()) / 86_400_000);
  if (daysLeft < 0) return { daysLeft, status: "expired" as InventoryStatus, label: `已过期 ${Math.abs(daysLeft)} 天` };
  if (daysLeft === 0) return { daysLeft, status: "soon" as InventoryStatus, label: "今天到期" };
  if (daysLeft <= 2) return { daysLeft, status: "soon" as InventoryStatus, label: `${daysLeft} 天内吃掉` };
  return { daysLeft, status: "fresh" as InventoryStatus, label: `约 ${daysLeft} 天` };
}

export function categoryFor(name: string) {
  if (/蛋|肉|鱼|虾|鸡|牛|猪/.test(name)) return "蛋白质";
  if (/奶|酸奶|芝士|豆腐|豆浆/.test(name)) return "冷藏";
  if (/米|面|饭|馒头|面包/.test(name)) return "主食";
  if (/果|蕉|橙|梨|莓/.test(name)) return "水果";
  if (/菜|葱|蒜|番茄|土豆|萝卜|瓜/.test(name)) return "蔬菜";
  return "其他";
}

export function quantityParts(amount: string) {
  const match = amount.match(/(\d+(?:\.\d+)?)\s*(.*)/);
  if (!match) return { quantity: 1, unit: amount || "份" };
  return { quantity: Number(match[1]), unit: match[2]?.trim() || "份" };
}
