import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getGlobalMessage, updateGlobalMessage } from "@/lib/api";
import type { GlobalMessage } from "@shared/schema";

export default function GlobalMessagePage() {
  const { toast } = useToast();
  const [gm, setGm] = useState<GlobalMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGlobalMessage();
  }, []);

  async function loadGlobalMessage() {
    try {
      const data = await getGlobalMessage();
      setGm(data);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!gm) return;
    try {
      await updateGlobalMessage({
        message: gm.message,
        status: gm.status || "INACTIVE",
        expire: gm.expire,
      });
      toast({ title: "Success", description: "Message updated" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!gm) return <div className="p-6">Failed to load</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">In-app Message</h1>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Message for Everyone</Label>
            <Input
              data-testid="input-global-message"
              value={gm.message || ""}
              onChange={(e) => setGm({ ...gm, message: e.target.value })}
              placeholder="hello world this message is for everyone"
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={gm.status || "INACTIVE"}
              onValueChange={(v) => setGm({ ...gm, status: v })}
            >
              <SelectTrigger data-testid="select-global-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Expiration</Label>
            <Input
              type="datetime-local"
              step="1"
              data-testid="input-global-expire"
              value={gm.expire ? gm.expire.replace(" ", "T") : ""}
              onChange={(e) => setGm({ ...gm, expire: e.target.value.replace("T", " ") })}
            />
          </div>
          <Button data-testid="button-submit-global" onClick={handleSubmit} className="w-full">
            Submit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
