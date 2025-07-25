import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const findOrCreateCustomer = async (name: string, phone?: string) => {
    try {
      // First, try to find existing customer by phone or name
      if (phone) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', phone)
          .maybeSingle();

        if (existingCustomer) {
          return existingCustomer;
        }
      }

      // Create new customer
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert([{ name, phone }])
        .select()
        .single();

      if (error) throw error;

      setCustomers(prev => [newCustomer, ...prev]);
      return newCustomer;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setCustomers(prev => prev.map(customer =>
        customer.id === id ? data : customer
      ));

      toast({
        title: "Success",
        description: "Customer updated successfully",
      });

      return data;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    loading,
    findOrCreateCustomer,
    updateCustomer,
    refreshCustomers: fetchCustomers,
  };
}