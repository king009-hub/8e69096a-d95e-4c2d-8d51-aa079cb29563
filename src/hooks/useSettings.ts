import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Setting {
  id: string;
  category: string;
  key: string;
  value: any;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfile {
  id: string;
  company_name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_number?: string;
  logo_url?: string;
  business_hours?: Record<string, any>;
  tax_rates?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useSettings(category?: string) {
  return useQuery({
    queryKey: ["settings", category],
    queryFn: async () => {
      let query = supabase.from("settings").select("*");
      
      if (category) {
        query = query.eq("category", category);
      }
      
      const { data, error } = await query.order("category").order("key");
      
      if (error) throw error;
      return data as Setting[];
    },
  });
}

export function useCompanyProfile() {
  return useQuery({
    queryKey: ["company_profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_profile")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as CompanyProfile | null;
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ category, key, value }: { category: string; key: string; value: any }) => {
      const { data, error } = await supabase
        .from("settings")
        .upsert(
          { category, key, value },
          { onConflict: "category,key" }
        );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({
        title: "Setting updated",
        description: "Setting has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating setting:", error);
      toast({
        title: "Error",
        description: "Failed to update setting. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: Partial<CompanyProfile>) => {
      // Check if profile exists
      const { data: existing } = await supabase
        .from("company_profile")
        .select("id")
        .limit(1)
        .maybeSingle();

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from("company_profile")
          .update(profile)
          .eq("id", existing.id);
        if (error) throw error;
        result = data;
      } else {
        // Ensure company_name is provided for insert
        if (!profile.company_name) {
          throw new Error("Company name is required");
        }
        const { data, error } = await supabase
          .from("company_profile")
          .insert(profile as Omit<CompanyProfile, 'id' | 'created_at' | 'updated_at'>);
        if (error) throw error;
        result = data;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_profile"] });
      toast({
        title: "Company profile updated",
        description: "Company profile has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating company profile:", error);
      toast({
        title: "Error",
        description: "Failed to update company profile. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUserRoles() {
  return useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at");
      
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user_id, role, permissions }: { user_id: string; role: string; permissions?: any[] }) => {
      const { data, error } = await supabase
        .from("user_roles")
        .upsert(
          { user_id, role, permissions: permissions || [] },
          { onConflict: "user_id" }
        );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
      toast({
        title: "User role updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating user role:", error);
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    },
  });
}