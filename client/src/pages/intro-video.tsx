import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Upload, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface IntroStatus {
  exists: boolean;
  size?: number;
  lastModified?: string;
}

export default function IntroVideo() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: status, isLoading } = useQuery<IntroStatus>({
    queryKey: ["/api/admin/intro-status"],
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/intro", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/intro-status"] });
      toast({
        title: "Deleted",
        description: "Intro video deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete intro video.",
        variant: "destructive",
      });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({
        title: "Error",
        description: "Please select a video file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await fetch("/api/admin/intro", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      queryClient.invalidateQueries({ queryKey: ["/api/admin/intro-status"] });
      toast({
        title: "Uploaded",
        description: "Intro video uploaded successfully.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to upload intro video.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Intro Video
          </CardTitle>
          <CardDescription>
            Upload the intro video that will be served at /api/intro.php
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status?.exists ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">intro.mp4</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-intro"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {status.size && (
                  <p className="text-sm text-muted-foreground">
                    Size: {formatSize(status.size)}
                  </p>
                )}
                {status.lastModified && (
                  <p className="text-sm text-muted-foreground">
                    Last modified: {new Date(status.lastModified).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Preview</p>
                <video
                  src="/api/intro.php"
                  controls
                  className="w-full max-w-md rounded-md"
                  data-testid="video-preview"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">API Endpoint</p>
                <code className="block p-2 bg-muted rounded text-sm">
                  /api/intro.php
                </code>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <Video className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No intro video uploaded</p>
            </div>
          )}

          <div className="pt-4 border-t">
            <input
              type="file"
              accept="video/*"
              onChange={handleUpload}
              ref={fileInputRef}
              className="hidden"
              data-testid="input-video-file"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              data-testid="button-upload-intro"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {status?.exists ? "Replace Video" : "Upload Video"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
