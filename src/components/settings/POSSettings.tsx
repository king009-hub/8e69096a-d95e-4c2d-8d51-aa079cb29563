import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { useSettings, useUpdateSetting } from "@/hooks/useSettings";
import { Loader2 } from "lucide-react";

const posFormSchema = z.object({
  default_payment_method: z.string(),
  enable_discounts: z.boolean(),
  max_discount_percent: z.number().min(0).max(100),
  enable_customer_display: z.boolean(),
});

export function POSSettings() {
  const { data: settings, isLoading } = useSettings("pos");
  const updateSetting = useUpdateSetting();

  const form = useForm<z.infer<typeof posFormSchema>>({
    resolver: zodResolver(posFormSchema),
    defaultValues: {
      default_payment_method: "cash",
      enable_discounts: true,
      max_discount_percent: 50,
      enable_customer_display: true,
    },
  });

  // Update form values when data loads
  useEffect(() => {
    if (settings && !isLoading) {
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);

      form.reset({
        default_payment_method: settingsMap.default_payment_method || "cash",
        enable_discounts: Boolean(settingsMap.enable_discounts),
        max_discount_percent: Number(settingsMap.max_discount_percent) || 50,
        enable_customer_display: Boolean(settingsMap.enable_customer_display),
      });
    }
  }, [settings, isLoading, form]);

  const onSubmit = async (values: z.infer<typeof posFormSchema>) => {
    for (const [key, value] of Object.entries(values)) {
      await updateSetting.mutateAsync({
        category: "pos",
        key,
        value,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="default_payment_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Payment Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="digital">Digital Wallet</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Default payment method selected when creating new sales
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enable_discounts"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Discounts</FormLabel>
                <FormDescription>
                  Allow applying discounts to sales transactions
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="max_discount_percent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Discount Percentage</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="50"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Maximum discount percentage allowed per transaction
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enable_customer_display"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Customer Display</FormLabel>
                <FormDescription>
                  Show transaction details on customer-facing display
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={updateSetting.isPending}>
          {updateSetting.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save POS Settings
        </Button>
      </form>
    </Form>
  );
}