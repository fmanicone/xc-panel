import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderProps {
  title: string;
}

export default function Placeholder({ title }: PlaceholderProps) {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">{title}</h1>
      <Card className="max-w-xl mx-auto">
        <CardContent className="p-8 text-center">
          <Construction className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            This feature is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
