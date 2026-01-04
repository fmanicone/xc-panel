import { Layout } from "@/components/Layout";
import { useSettings, useUpdateSettings } from "@/hooks/use-admin";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSettingsSchema } from "@shared/schema";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GeneralSettings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertSettingsSchema.partial()),
    defaultValues: {
      appName: "",
      customerId: "",
      versionCode: "",
      portalUrl: "",
      apkUrl: "",
      supportEmail: "",
      supportPhone: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        appName: settings.appName,
        customerId: settings.customerId,
        versionCode: settings.versionCode,
        portalUrl: settings.portalUrl,
        apkUrl: settings.apkUrl || "",
        supportEmail: settings.supportEmail || "",
        supportPhone: settings.supportPhone || "",
      });
    }
  }, [settings, form]);

  const onSubmit = (data: any) => {
    updateSettings.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Settings Saved",
          description: "General configuration has been updated successfully.",
        });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message,
        });
      },
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-2">
          General Settings
        </h1>
        <p className="text-muted-foreground">
          Configure core application parameters and connection details.
        </p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* App Identity */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle>Identity & Versioning</CardTitle>
                <CardDescription>Basic information about your application instance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="appName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-background/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="versionCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Version Code</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-background/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer ID</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-background/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Connection Settings */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle>Connectivity</CardTitle>
                <CardDescription>URLs and endpoints used by the application.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="portalUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portal URL (Middleware)</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-background/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apkUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>APK Download URL</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-background/50" placeholder="https://..." />
                      </FormControl>
                      <FormDescription>Used for in-app updates.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Support Info */}
            <Card className="bg-card border-border/50 lg:col-span-2">
              <CardHeader>
                <CardTitle>Support Information</CardTitle>
                <CardDescription>How users can contact you for help.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supportEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support Email / Contact Text</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-background/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supportPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support Phone / WhatsApp</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-background/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </Layout>
  );
}
