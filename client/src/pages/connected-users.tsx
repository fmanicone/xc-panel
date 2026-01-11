import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getConnectedUsers, getConnectedUsersStats, deleteConnectedUser } from "@/lib/api";
import type { ConnectedUser } from "@shared/schema";
import {
  Trash2,
  Users,
  RefreshCw,
  Activity,
  Wifi,
  WifiOff,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  Settings,
  Lock,
  HardDrive,
  Info,
  MessageSquare
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ITEMS_PER_PAGE = 50;

interface RemoteCommand {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const REMOTE_COMMANDS: RemoteCommand[] = [
  {
    id: "send_message",
    name: "Send Message",
    description: "Send a simple message to the device",
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    id: "restart_app",
    name: "Restart App",
    description: "Restart the application on the device",
    icon: <RefreshCw className="w-4 h-4" />,
  },
  {
    id: "reset_players_settings",
    name: "Reset Player Settings",
    description: "Reset all player settings to default values",
    icon: <Settings className="w-4 h-4" />,
  },
  {
    id: "reset_parental_password",
    name: "Reset Parental PIN",
    description: "Reset parental control PIN to 0000",
    icon: <Lock className="w-4 h-4" />,
  },
  {
    id: "delete_cache",
    name: "Delete Cache",
    description: "Clear application cache",
    icon: <HardDrive className="w-4 h-4" />,
  },
  {
    id: "get_info_dm",
    name: "Get Device Info",
    description: "Request device information",
    icon: <Info className="w-4 h-4" />,
  },
];

export default function ConnectedUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ConnectedUser[]>([]);
  const [stats, setStats] = useState({ total: 0, online: 0 });
  const [realtimeDevices, setRealtimeDevices] = useState<Map<string, { protocol: string; connectedAt: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sendingCommand, setSendingCommand] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [displayInterval, setDisplayInterval] = useState("5");
  const [disappearAfter, setDisappearAfter] = useState("1");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    command: RemoteCommand | null;
    target: "single" | "selected" | "all";
    username?: string;
  }>({ open: false, command: null, target: "single" });

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    let result = users;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((u) =>
        ((u as any).username || "").toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((u) => (u as any).status === statusFilter);
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
      const [usersData, statsData, wsStatsRes] = await Promise.all([
        getConnectedUsers(),
        getConnectedUsersStats(),
        fetch("/api/admin/ws-stats", { credentials: "include" }).then(r => r.json()),
      ]);
      setUsers(usersData);
      setStats(statsData);

      // Build map of username -> protocol from real-time connected devices
      const deviceMap = new Map<string, { protocol: string; connectedAt: string }>();
      if (wsStatsRes.devices && Array.isArray(wsStatsRes.devices)) {
        wsStatsRes.devices.forEach((d: any) => {
          if (d.username) {
            deviceMap.set(d.username, {
              protocol: d.protocol || "unknown",
              connectedAt: d.connectedAt,
            });
          }
        });
      }
      setRealtimeDevices(deviceMap);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  }

  function toggleUserSelection(username: string) {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(username)) {
      newSelected.delete(username);
    } else {
      newSelected.add(username);
    }
    setSelectedUsers(newSelected);
  }

  function toggleAllUsers() {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      const allUsernames = filteredUsers
        .map((u) => (u as any).username)
        .filter(Boolean);
      setSelectedUsers(new Set(allUsernames));
    }
  }

  async function sendCommand(
    command: string,
    target: "single" | "selected" | "all",
    username?: string
  ) {
    setSendingCommand(true);
    try {
      let response;
      let endpoint: string;
      let body: any;

      // Handle send_message command separately
      if (command === "send_message") {
        if (!messageText.trim()) {
          toast({
            title: "Error",
            description: "Please enter a message",
            variant: "destructive",
          });
          setSendingCommand(false);
          return;
        }

        if (target === "single" && username) {
          endpoint = "/api/admin/mqtt-message/user";
          body = { username, message: messageText };
        } else {
          toast({
            title: "Error",
            description: "Messages can only be sent to individual users",
            variant: "destructive",
          });
          setSendingCommand(false);
          return;
        }
      } else {
        // Regular commands
        if (target === "single" && username) {
          endpoint = "/api/admin/remote-command/user";
          body = { username, command };
        } else if (target === "selected") {
          endpoint = "/api/admin/remote-command/users";
          body = { usernames: Array.from(selectedUsers), command };
        } else {
          endpoint = "/api/admin/remote-command/broadcast";
          body = { command };
        }
      }

      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: command === "send_message" ? "Message Sent" : "Command Sent",
          description: data.message,
        });
        if (target === "selected") {
          setSelectedUsers(new Set());
        }
        setMessageText("");
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send",
        variant: "destructive",
      });
    } finally {
      setSendingCommand(false);
      setConfirmDialog({ open: false, command: null, target: "single" });
    }
  }

  function openConfirmDialog(
    command: RemoteCommand,
    target: "single" | "selected" | "all",
    username?: string
  ) {
    setConfirmDialog({ open: true, command, target, username });
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
          <p className="text-muted-foreground">
            Monitor and manage active user sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedUsers.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={sendingCommand}>
                  <Send className="w-4 h-4 mr-2" />
                  Send to Selected ({selectedUsers.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Remote Commands</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {REMOTE_COMMANDS.map((cmd) => (
                  <DropdownMenuItem
                    key={cmd.id}
                    onClick={() => openConfirmDialog(cmd, "selected")}
                  >
                    {cmd.icon}
                    <span className="ml-2">{cmd.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p
                  className="text-3xl font-bold"
                  data-testid="stat-total-users"
                >
                  {stats.total}
                </p>
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
                <p
                  className="text-3xl font-bold text-green-500"
                  data-testid="stat-online-users"
                >
                  {stats.online}
                </p>
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
                <p className="text-3xl font-bold text-muted-foreground">
                  {stats.total - stats.online}
                </p>
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
              <CardDescription>
                All connected users and their session details
              </CardDescription>
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
                <SelectTrigger
                  className="w-32"
                  data-testid="select-status-filter"
                >
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
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredUsers.length > 0 &&
                        selectedUsers.size === filteredUsers.length
                      }
                      onCheckedChange={toggleAllUsers}
                    />
                  </TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>Last Online</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Package Name</TableHead>
                  <TableHead>App Name</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-10 h-10 text-muted-foreground/50" />
                        <p className="text-muted-foreground">
                          {filteredUsers.length === 0 && users.length > 0
                            ? "No users match your filters"
                            : "No users connected"}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {filteredUsers.length === 0 && users.length > 0
                            ? "Try adjusting your search or filter"
                            : "Users will appear here when they connect to the app"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => {
                    const u = user as any;
                    const username = u.username || user.userId || "";
                    return (
                      <TableRow
                        key={user.id}
                        data-testid={`row-user-${user.id}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(username)}
                            onCheckedChange={() =>
                              toggleUserSelection(username)
                            }
                            disabled={!username}
                          />
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{username || "-"}</p>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {user.ipAddress || "-"}
                          </code>
                        </TableCell>
                        <TableCell>
                          {u.status === "ACTIVE" ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              <Activity className="w-3 h-3 mr-1" />
                              Online
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Offline</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {realtimeDevices.has(username) ? (
                            <Badge
                              variant="outline"
                              className={
                                realtimeDevices.get(username)?.protocol === "mqtt"
                                  ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                                  : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              }
                            >
                              {realtimeDevices.get(username)?.protocol === "mqtt" ? "MQTT" : "Socket.IO"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {u.lastActive
                              ? new Date(u.lastActive).toLocaleString()
                              : "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{u.version || u.ver || "-"}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm max-w-[140px] truncate" title={u.packageName || "-"}>
                            {u.packageName ? u.packageName.substring(0, 20) : "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{u.appName || "-"}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={sendingCommand || !username}
                                  title="Send remote command"
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                  Send Command to {username}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {REMOTE_COMMANDS.map((cmd) => (
                                  <DropdownMenuItem
                                    key={cmd.id}
                                    onClick={() =>
                                      openConfirmDialog(cmd, "single", username)
                                    }
                                  >
                                    {cmd.icon}
                                    <span className="ml-2">{cmd.name}</span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(user.id)}
                              data-testid={`button-delete-user-${user.id}`}
                              className="text-destructive hover:text-destructive"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}{" "}
                of {filteredUsers.length} users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
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

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          setConfirmDialog({ ...confirmDialog, open });
          if (!open) {
            setMessageText("");
            setDisplayInterval("5");
            setDisappearAfter("1");
          }
        }}
      >
        <AlertDialogContent className={confirmDialog.command?.id === "send_message" ? "max-w-md" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.command?.id === "send_message"
                ? "Send Message"
                : "Confirm Remote Command"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              {confirmDialog.command && (
                <div className="space-y-3">
                  <p>
                    <strong>Target:</strong>{" "}
                    {confirmDialog.target === "single"
                      ? confirmDialog.username
                      : confirmDialog.target === "selected"
                      ? `${selectedUsers.size} selected users`
                      : "All connected devices"}
                  </p>
                  {confirmDialog.command.id === "send_message" && (
                    <div className="pt-2">
                      <label className="text-sm font-medium text-foreground">Message</label>
                      <Textarea
                        placeholder="Enter your message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="mt-1.5"
                        rows={3}
                      />
                    </div>
                  )}
                  {confirmDialog.command.id !== "send_message" && (
                    <>
                      <p>
                        <strong>Command:</strong> {confirmDialog.command.name}
                      </p>
                      <p className="text-muted-foreground">
                        {confirmDialog.command.description}
                      </p>
                    </>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingCommand}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDialog.command &&
                sendCommand(
                  confirmDialog.command.id,
                  confirmDialog.target,
                  confirmDialog.username
                )
              }
              disabled={sendingCommand || (confirmDialog.command?.id === "send_message" && !messageText.trim())}
            >
              {sendingCommand ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Command
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
