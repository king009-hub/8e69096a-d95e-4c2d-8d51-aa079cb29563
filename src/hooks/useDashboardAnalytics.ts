import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export interface SalesChartData {
  date: string;
  revenue: number;
  sales: number;
}

export interface TopProduct {
  id: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  category: string | null;
}

export interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  category: string | null;
}

export function useDashboardAnalytics(days: number = 7) {
  const [salesChartData, setSalesChartData] = useState<SalesChartData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSalesChartData(),
        fetchTopProducts(),
        fetchLowStockProducts()
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesChartData = async () => {
    const chartData: SalesChartData[] = [];
    const startDate = subDays(new Date(), days - 1);

    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), days - 1 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const { data, error } = await supabase
        .from('sales')
        .select('final_amount')
        .gte('sale_date', dayStart.toISOString())
        .lte('sale_date', dayEnd.toISOString());

      if (!error && data) {
        const revenue = data.reduce((sum, sale) => sum + Number(sale.final_amount), 0);
        chartData.push({
          date: format(date, 'MMM dd'),
          revenue,
          sales: data.length
        });
      }
    }

    setSalesChartData(chartData);
  };

  const fetchTopProducts = async () => {
    const { data: saleItems, error } = await supabase
      .from('sale_items')
      .select(`
        product_id,
        quantity,
        total_price,
        products (
          id,
          name,
          category
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!error && saleItems) {
      const productMap = new Map<string, TopProduct>();

      saleItems.forEach((item: any) => {
        const product = item.products;
        if (product) {
          const existing = productMap.get(product.id);
          if (existing) {
            existing.totalQuantity += item.quantity;
            existing.totalRevenue += Number(item.total_price);
          } else {
            productMap.set(product.id, {
              id: product.id,
              name: product.name,
              totalQuantity: item.quantity,
              totalRevenue: Number(item.total_price),
              category: product.category
            });
          }
        }
      });

      const topProductsList = Array.from(productMap.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);

      setTopProducts(topProductsList);
    }
  };

  const fetchLowStockProducts = async () => {
    const { data: products, error } = await supabase
      .from('products_with_calculated_stock')
      .select('id, name, calculated_stock, min_stock_threshold, category')
      .order('calculated_stock', { ascending: true })
      .limit(10);

    if (!error && products) {
      const lowStock = products.filter(p => 
        (p.calculated_stock || 0) <= (p.min_stock_threshold || 10)
      ).map(p => ({
        id: p.id!,
        name: p.name!,
        stock: p.calculated_stock || 0,
        threshold: p.min_stock_threshold || 10,
        category: p.category
      }));

      setLowStockProducts(lowStock);
    }
  };

  return {
    salesChartData,
    topProducts,
    lowStockProducts,
    loading,
    refreshAnalytics: fetchAnalytics
  };
}
