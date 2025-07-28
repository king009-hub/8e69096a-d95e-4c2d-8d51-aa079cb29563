import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { useSettings, useUpdateSetting } from "@/hooks/useSettings";
import { Loader2 } from "lucide-react";

const receiptFormSchema = z.object({
  header_text: z.string(),
  footer_text: z.string(),
  show_logo: z.boolean(),
  paper_size: z.string(),
});

export function ReceiptSettings() {
  const { data: settings, isLoading } = useSettings("receipt");
  const updateSetting = useUpdateSetting();

  const form = useForm<z.infer<typeof receiptFormSchema>>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: {
      header_text: "Thank you for your purchase!",
      footer_text: "Visit us again!",
      show_logo: true,
      paper_size: "80mm",
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
        header_text: settingsMap.header_text || "Thank you for your purchase!",
        footer_text: settingsMap.footer_text || "Visit us again!",
        show_logo: Boolean(settingsMap.show_logo),
        paper_size: settingsMap.paper_size || "80mm",
      });
    }
  }, [settings, isLoading, form]);

  const onSubmit = async (values: z.infer<typeof receiptFormSchema>) => {
    for (const [key, value] of Object.entries(values)) {
      await updateSetting.mutateAsync({
        category: "receipt",
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
          name="header_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Receipt Header Text</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Thank you for your purchase!"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Text displayed at the top of the receipt
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="footer_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Receipt Footer Text</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Visit us again!"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Text displayed at the bottom of the receipt
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="show_logo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Show Company Logo</FormLabel>
                <FormDescription>
                  Display company logo on printed receipts
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
          name="paper_size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Paper Size</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select paper size" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="58mm">58mm (Small)</SelectItem>
                  <SelectItem value="80mm">80mm (Standard)</SelectItem>
                  <SelectItem value="110mm">110mm (Large)</SelectItem>
                  <SelectItem value="A4">A4 (Letter)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Receipt printer paper size
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={updateSetting.isPending}>
          {updateSetting.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Receipt Settings
        </Button>
      </form>
    </Form>
  );
}