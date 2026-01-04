import { Layout } from "@/components/Layout";
import { useAccessLogs } from "@/hooks/use-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Smartphone, Globe, User } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function Logs() {
  const { data: logs, isLoading } = useAccessLogs();
  const [search, setSearch] = useState("");

  const filteredLogs = logs?.filter(log => 
    log.userId?.toLowerCase().includes(search.toLowerCase()) ||
    log.ipAddress?.includes(search) ||
    log.action?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-2">
            Access Logs
          </h1>
          <p className="text-muted-foreground">
            Monitor user activity and connection attempts.
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Search user, IP, or action..." 
            className="pl-10 bg-card border-border/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Device Info</TableHead>
                  <TableHead className="text-right">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs?.map((log) => (
                  <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {log.timestamp ? format(new Date(log.timestamp), "MMM dd, HH:mm:ss") : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-primary" />
                        <span className="font-medium text-white">{log.userId || "Guest"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`
                        border-transparent
                        ${log.action === 'login' ? 'bg-blue-500/20 text-blue-500' : 'bg-white/10 text-muted-foreground'}
                      `}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-white">
                          <Smartphone size={12} />
                          {log.deviceId || "Unknown Device"}
                        </div>
                        {log.userAgent && (
                          <span className="text-[10px] text-muted-foreground max-w-[200px] truncate" title={log.userAgent}>
                            {log.userAgent}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <Globe size={12} className="text-muted-foreground" />
                        {log.ipAddress}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredLogs?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No logs found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
