import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getConnectedUsers, getConnectedUsersStats, deleteConnectedUser } from "@/lib/api";
import type { ConnectedUser } from "@shared/schema";
import { Trash2, Users, RefreshCw, Activity, Wifi, WifiOff, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 50;

export default function ConnectedUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ConnectedUser[]>([]);
  const [stats, setStats] = useState({ total: 0, online: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    let result = users;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        ((u as any).username || '').toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== "all") {
      result = result.filter(u => (u as any).status === statusFilter);
    }
    
    return result;
  }, [users, searchQuery, statusFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    try {
      const [usersData, statsData] = await Promise.all([
        getConnectedUsers(),
        getConnectedUsersStats(),
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteConnectedUser(id);
      toast({ title: "Success", description: "User session terminated" });
      loadData();
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connected Users</h1>
          <p className="text-muted-foreground">Monitor and manage active user sessions</p>
        </div>
        <Button
          data-testid="button-refresh-users"
          onClick={() => loadData(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold" data-testid="stat-total-users">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online Now</p>
                <p className="text-3xl font-bold text-green-500" data-testid="stat-online-users">{stats.online}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Wifi className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-3xl font-bold text-muted-foreground">{stats.total - stats.online}</p>
              </div>
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                <WifiOff className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Active Sessions</CardTitle>
              <CardDescription>All connected users and their session details</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48"
                  data-testid="input-search-users"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Online</SelectItem>
                  <SelectItem value="OFFLINE">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>User ID</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead>Last Online</TableHead>
                  <TableHead>App ID</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Package Name</TableHead>
                  <TableHead>App Name</TableHead>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>First Registered</TableHead>
                  <TableHead>Last Connection</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-10 h-10 text-muted-foreground/50" />
                        <p className="text-muted-foreground">{filteredUsers.length === 0 && users.length > 0 ? "No users match your filters" : "No users connected"}</p>
                        <p className="text-xs text-muted-foreground/70">{filteredUsers.length === 0 && users.length > 0 ? "Try adjusting your search or filter" : "Users will appear here when they connect to the app"}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => {
                    const u = user as any;
                    return (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <p className="font-medium">{u.username || user.userId || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {user.ipAddress || "-"}
                        </code>
                      </TableCell>
                      <TableCell>
                        {(u.status === "ACTIVE") ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            <Activity className="w-3 h-3 mr-1" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Offline
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {u.lastActive ? new Date(u.lastActive).toLocaleString() : "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{u.appId || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{u.version || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{u.deviceName || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{u.packageName || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{u.appName || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{u.customerId || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {u.firstRegistered ? new Date(u.firstRegistered).toLocaleString() : "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {u.lastConnection ? new Date(u.lastConnection).toLocaleString() : "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(user.id)}
                          data-testid={`button-delete-user-${user.id}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )})
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </Button>
                <span className="text-sm px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
