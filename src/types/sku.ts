export type Sku = {
  skuId: string;
  skuName: string;
  category: string;
  supplier: string;
  unitCost: number;
  unitPrice: number;
  currentStock: number;
  reorderPoint: number;
  reorderQty: number;
  leadTimeDays: number;
  dailySales30dAvg: number;
  dailySales90dAvg: number;
  lastSaleDate: string | null;
  lastReorderDate: string | null;
  stockoutDaysLast90d: number;
  seasonalIndex: number;
  marginPct: number;
};