import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BatchStockData {
  [productId: string]: {
    totalStock: number;
    nextExpiryDate?: string;
    currentSellingPrice?: number;
  };
}

export function useBatchStock() {
  const [batchStock, setBatchStock] = useState<BatchStockData>({});
  const [loading, setLoading] = useState(true);

  const fetchBatchStock = async () => {
    try {
      const { data, error } = await supabase
        .from('product_batches')
        .select('product_id, quantity, expiry_date, selling_price')
        .gt('quantity', 0);

      if (error) throw error;

      const stockData: BatchStockData = {};
      
      data?.forEach(batch => {
        if (!stockData[batch.product_id]) {
          stockData[batch.product_id] = {
            totalStock: 0,
            nextExpiryDate: batch.expiry_date,
            currentSellingPrice: batch.selling_price
          };
        }
        
        stockData[batch.product_id].totalStock += batch.quantity;
        
        // Update next expiry date if this batch expires sooner
        if (batch.expiry_date && 
            (!stockData[batch.product_id].nextExpiryDate || 
             batch.expiry_date < stockData[batch.product_id].nextExpiryDate!)) {
          stockData[batch.product_id].nextExpiryDate = batch.expiry_date;
        }
      });

      setBatchStock(stockData);
    } catch (error) {
      console.error('Error fetching batch stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProductStock = (productId: string) => {
    return batchStock[productId]?.totalStock || 0;
  };

  const getProductNextExpiry = (productId: string) => {
    return batchStock[productId]?.nextExpiryDate;
  };

  const getProductCurrentPrice = (productId: string) => {
    return batchStock[productId]?.currentSellingPrice;
  };

  useEffect(() => {
    fetchBatchStock();
  }, []);

  return {
    batchStock,
    loading,
    getProductStock,
    getProductNextExpiry,
    getProductCurrentPrice,
    refreshBatchStock: fetchBatchStock,
  };
}