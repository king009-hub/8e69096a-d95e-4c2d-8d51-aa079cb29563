import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export interface ProfitData {
  totalProfit: number;
  productProfit: number;
  extraRevenue: number; // Additional money from agreements/discounts
  profitMargin: number;
  salesCount: number;
}

export interface ProfitAnalysis {
  daily: ProfitData;
  weekly: ProfitData;
  monthly: ProfitData;
  yearly: ProfitData;
  custom?: ProfitData;
}

export const useProfitAnalysis = (customDateRange?: { start: Date; end: Date }) => {
  const [profitAnalysis, setProfitAnalysis] = useState<ProfitAnalysis>({
    daily: { totalProfit: 0, productProfit: 0, extraRevenue: 0, profitMargin: 0, salesCount: 0 },
    weekly: { totalProfit: 0, productProfit: 0, extraRevenue: 0, profitMargin: 0, salesCount: 0 },
    monthly: { totalProfit: 0, productProfit: 0, extraRevenue: 0, profitMargin: 0, salesCount: 0 },
    yearly: { totalProfit: 0, productProfit: 0, extraRevenue: 0, profitMargin: 0, salesCount: 0 },
  });
  const [loading, setLoading] = useState(true);

  const calculateProfitForPeriod = async (startDate: Date, endDate: Date): Promise<ProfitData> => {
    try {
      // Get sales with items and batch information for the period
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          final_amount,
          discount,
          sale_items (
            quantity,
            unit_price,
            total_price,
            batch_id,
            product_id,
            product_batches (
              purchase_price,
              selling_price
            )
          )
        `)
        .gte('sale_date', startDate.toISOString())
        .lte('sale_date', endDate.toISOString());

      if (salesError) throw salesError;

      let productProfit = 0;
      let totalRevenue = 0;
      let extraRevenue = 0;
      const salesCount = salesData?.length || 0;

      salesData?.forEach(sale => {
        totalRevenue += Number(sale.final_amount);
        
        // Calculate extra revenue (difference between total and final amount after discount)
        const expectedTotal = Number(sale.total_amount) - Number(sale.discount || 0);
        const actualTotal = Number(sale.final_amount);
        extraRevenue += Math.max(0, actualTotal - expectedTotal);

        sale.sale_items?.forEach(item => {
          // Calculate profit per item: (selling_price - purchase_price) * quantity
          const batchData = item.product_batches;
          if (batchData) {
            const purchasePrice = Number(batchData.purchase_price);
            const unitSellingPrice = Number(item.unit_price);
            const itemProfit = (unitSellingPrice - purchasePrice) * Number(item.quantity);
            productProfit += itemProfit;
          }
        });
      });

      const totalProfit = productProfit + extraRevenue;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      return {
        totalProfit,
        productProfit,
        extraRevenue,
        profitMargin,
        salesCount,
      };
    } catch (error) {
      console.error('Error calculating profit:', error);
      return { totalProfit: 0, productProfit: 0, extraRevenue: 0, profitMargin: 0, salesCount: 0 };
    }
  };

  const fetchProfitAnalysis = async () => {
    setLoading(true);
    try {
      const now = new Date();
      
      const [daily, weekly, monthly, yearly] = await Promise.all([
        calculateProfitForPeriod(startOfDay(now), endOfDay(now)),
        calculateProfitForPeriod(startOfWeek(now), endOfWeek(now)),
        calculateProfitForPeriod(startOfMonth(now), endOfMonth(now)),
        calculateProfitForPeriod(startOfYear(now), endOfYear(now)),
      ]);

      let custom;
      if (customDateRange) {
        custom = await calculateProfitForPeriod(customDateRange.start, customDateRange.end);
      }

      setProfitAnalysis({
        daily,
        weekly,
        monthly,
        yearly,
        custom,
      });
    } catch (error) {
      console.error('Error fetching profit analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitAnalysis();
  }, [customDateRange]);

  return {
    profitAnalysis,
    loading,
    refreshProfitAnalysis: fetchProfitAnalysis,
  };
};