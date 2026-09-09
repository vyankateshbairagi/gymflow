import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card><CardContent className="h-28 animate-pulse bg-muted/30" /></Card><Card><CardContent className="h-28 animate-pulse bg-muted/30" /></Card><Card><CardContent className="h-28 animate-pulse bg-muted/30" /></Card><Card><CardContent className="h-28 animate-pulse bg-muted/30" /></Card></div>;
}