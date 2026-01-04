import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Loader2 } from "lucide-react";

export default function ParentalReset() {
  const { toast } = useToast();
  const [masterCode, setMasterCode] = useState("");
  const [generatedPin, setGeneratedPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!masterCode.trim()) {
      toast({ title: "Error", description: "Please enter a master code", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/parental-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterCode }),
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedPin(data.resetCode);
        toast({ title: "Success", description: "PIN generated successfully" });
      } else {
        toast({ title: "Error", description: data.message || "Failed to generate PIN", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to generate PIN", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Parental PIN Reset</h1>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Enter Reset Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Master Code</Label>
            <Input
              data-testid="input-master-code"
              value={masterCode}
              onChange={(e) => setMasterCode(e.target.value)}
              placeholder="Enter master code"
            />
          </div>

          <Button
            data-testid="button-generate-pin"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Generate PIN
          </Button>

          <div className="space-y-2 pt-4 border-t">
            <Label>Generated Reset Code</Label>
            <Input
              data-testid="output-reset-code"
              value={generatedPin}
              readOnly
              placeholder="New Pin will appear here"
              className="text-center font-mono text-lg"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
