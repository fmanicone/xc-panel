import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Trash2, RefreshCw, Monitor, User, Clock, Globe } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LoginAttempt {
  id: number;
  attemptedUsername: string;
  ipAddress: string;
  userAgent: string;
  attemptedAt: string | null;
}

export default function LoginAttemptsPage() {
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<{ attempts: LoginAttempt[]; total: number }>({
    queryKey: ["/api/admin/login-attempts"],
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/admin/login-attempts");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/login-attempts"] });
      toast({
        title: "Cleared",
        description: "All login attempts have been cleared",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear login attempts",
        variant: "destructive",
      });
    },
  });

  const parseUserAgent = (ua: string) => {
    if (!ua) return "Unknown";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    if (ua.includes("curl")) return "curl";
    return ua.substring(0, 30) + (ua.length > 30 ? "..." : "");
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-heading">Login Attempts</h1>
          <p className="text-muted-foreground mt-1">
            Failed login attempts are logged here for security monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh-attempts"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={!data?.attempts?.length}
                data-testid="button-clear-attempts"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all login attempts?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all recorded failed login attempts. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => clearMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {data?.total ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Failed Login Attempts
              </CardTitle>
              <Badge variant="destructive">{data.total} attempts</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-start gap-4 p-3 rounded-md bg-muted/50 border"
                  data-testid={`row-attempt-${attempt.id}`}
                >
                  <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {attempt.attemptedUsername || "empty"}
                      </span>
                      <span className="text-muted-foreground text-sm flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {attempt.ipAddress || "unknown IP"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {attempt.attemptedAt
                          ? format(new Date(attempt.attemptedAt), "MMM d, yyyy 'at' h:mm a")
                          : "Unknown time"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        {parseUserAgent(attempt.userAgent)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Loading...
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-muted-foreground">No failed login attempts recorded</p>
              <p className="text-xs text-muted-foreground">
                Failed login attempts will appear here for security monitoring
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
