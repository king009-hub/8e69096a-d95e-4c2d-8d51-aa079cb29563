import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useCompanyProfile, useUpdateCompanyProfile, useSettings, useUpdateSetting } from "@/hooks/useSettings";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const systemFormSchema = z.object({
  currency: z.string().min(1, "Currency is required"),
  timezone: z.string().min(1, "Timezone is required"),
  date_format: z.string().min(1, "Date format is required"),
  language: z.string().min(1, "Language is required"),
});

const companyFormSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  tax_number: z.string().optional(),
});

export function SystemSettings() {
  const { data: settings, isLoading: settingsLoading } = useSettings("system");
  const { data: companyProfile, isLoading: companyLoading } = useCompanyProfile();
  const updateSetting = useUpdateSetting();
  const updateCompanyProfile = useUpdateCompanyProfile();

  const systemForm = useForm<z.infer<typeof systemFormSchema>>({
    resolver: zodResolver(systemFormSchema),
    defaultValues: {
      currency: "USD",
      timezone: "UTC",
      date_format: "DD/MM/YYYY",
      language: "en",
    },
  });

  const companyForm = useForm<z.infer<typeof companyFormSchema>>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      company_name: "",
      address: "",
      phone: "",
      email: "",
      tax_number: "",
    },
  });

  // Update form values when data loads
  useEffect(() => {
    if (settings && !settingsLoading) {
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);

      systemForm.reset({
        currency: settingsMap.currency || "USD",
        timezone: settingsMap.timezone || "UTC",
        date_format: settingsMap.date_format || "DD/MM/YYYY",
        language: settingsMap.language || "en",
      });
    }
  }, [settings, settingsLoading, systemForm]);

  useEffect(() => {
    if (companyProfile && !companyLoading) {
      companyForm.reset({
        company_name: companyProfile.company_name || "",
        address: companyProfile.address || "",
        phone: companyProfile.phone || "",
        email: companyProfile.email || "",
        tax_number: companyProfile.tax_number || "",
      });
    }
  }, [companyProfile, companyLoading, companyForm]);

  const onSystemSubmit = async (values: z.infer<typeof systemFormSchema>) => {
    try {
      for (const [key, value] of Object.entries(values)) {
        await updateSetting.mutateAsync({
          category: "system",
          key,
          value,
        });
      }
      toast.success("System settings updated successfully");
    } catch (error) {
      console.error("Error updating system settings:", error);
      toast.error("Failed to update system settings");
    }
  };

  const onCompanySubmit = async (values: z.infer<typeof companyFormSchema>) => {
    try {
      await updateCompanyProfile.mutateAsync(values);
      toast.success("Company profile updated successfully");
    } catch (error) {
      console.error("Error updating company profile:", error);
      toast.error("Failed to update company profile");
    }
  };

  if (settingsLoading || companyLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium">Company Information</h3>
        <p className="text-sm text-muted-foreground">
          Basic company details and contact information
        </p>
      </div>

      <Form {...companyForm}>
        <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-4">
          <FormField
            control={companyForm.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={companyForm.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter company address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={companyForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={companyForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={companyForm.control}
            name="tax_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter tax number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={updateCompanyProfile.isPending}>
            {updateCompanyProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Company Details
          </Button>
        </form>
      </Form>

      <Separator />

      <div>
        <h3 className="text-lg font-medium">System Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Configure system-wide settings and preferences
        </p>
      </div>

      <Form {...systemForm}>
        <form onSubmit={systemForm.handleSubmit(onSystemSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={systemForm.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={systemForm.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      <SelectItem value="Asia/Kolkata">India</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={systemForm.control}
              name="date_format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Format</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={systemForm.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" disabled={updateSetting.isPending}>
            {updateSetting.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save System Settings
          </Button>
        </form>
      </Form>
    </div>
  );
}