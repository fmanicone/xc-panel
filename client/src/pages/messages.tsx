import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getMessages, createMessage, deleteMessage, updateMessage } from "@/lib/api";
import type { Message } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MessageSquare, User, Loader2, Search, Pencil, ChevronLeft, ChevronRight } from "lucide-react";

export default function MessagesPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [searchUsername, setSearchUsername] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [form, setForm] = useState({
    message: "",
    userId: "",
    status: "ACTIVE",
    expire: "",
  });
  const [editForm, setEditForm] = useState({
    message: "",
    status: "ACTIVE",
    expire: "",
  });

  const filteredMessages = messages.filter((msg) => {
    const username = (msg as any).username || msg.userId || "";
    const matchesUsername = username.toLowerCase().includes(searchUsername.toLowerCase());
    const matchesStatus = filterStatus === "all" || msg.status === filterStatus;
    return matchesUsername && matchesStatus;
  });

  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
  const paginatedMessages = filteredMessages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchUsername, filterStatus]);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      const data = await getMessages();
      setMessages(data);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!form.message || !form.userId) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await createMessage({
        message: form.message,
        userId: form.userId,
        status: form.status,
        expire: form.expire,
      });
      toast({ title: "Success", description: "Message created successfully" });
      setDialogOpen(false);
      setForm({ message: "", userId: "", status: "ACTIVE", expire: "" });
      loadMessages();
    } catch (err) {
      toast({ title: "Error", description: "Failed to create message", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMessage(id);
      toast({ title: "Success", description: "Message deleted" });
      loadMessages();
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
    }
  }

  function openEditDialog(msg: Message) {
    setEditingMessage(msg);
    setEditForm({
      message: msg.message,
      status: msg.status || "ACTIVE",
      expire: (msg as any).expiration || msg.expire || "",
    });
    setEditDialogOpen(true);
  }

  async function handleUpdate() {
    if (!editingMessage) return;
    setUpdating(true);
    try {
      await updateMessage(editingMessage.id, {
        message: editForm.message,
        status: editForm.status,
        expiration: editForm.expire,
      } as any);
      toast({ title: "Success", description: "Message updated successfully" });
      setEditDialogOpen(false);
      setEditingMessage(null);
      loadMessages();
    } catch (err) {
      toast({ title: "Error", description: "Failed to update message", variant: "destructive" });
    } finally {
      setUpdating(false);
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Messages</h1>
          <p className="text-muted-foreground">Send targeted messages to specific users</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-message">
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  data-testid="input-username"
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  data-testid="input-message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Enter your message..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiration (optional)</Label>
                <Input
                  type="datetime-local"
                  step="1"
                  value={form.expire ? form.expire.replace(" ", "T") : ""}
                  onChange={(e) => setForm({ ...form, expire: e.target.value.replace("T", " ") })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={form.status === "ACTIVE"}
                  onCheckedChange={(v) => setForm({ ...form, status: v ? "ACTIVE" : "INACTIVE" })}
                />
              </div>
              <Button 
                onClick={handleSubmit} 
                className="w-full" 
                disabled={creating}
                data-testid="button-submit-message"
              >
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Message
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-username"
            placeholder="Search by username..."
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paginatedMessages.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">No messages yet</h3>
                <p className="text-sm text-muted-foreground">Create your first message to get started</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedMessages.map((msg) => (
            <Card key={msg.id} data-testid={`card-message-${msg.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{(msg as any).username || msg.userId}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : "-"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={msg.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                    {msg.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{msg.message}</p>
                {((msg as any).expiration || msg.expire) && (
                  <p className="text-xs text-muted-foreground">
                    Expires: {(msg as any).expiration || msg.expire}
                  </p>
                )}
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(msg)}
                    data-testid={`button-edit-message-${msg.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(msg.id)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`button-delete-message-${msg.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredMessages.length)} of {filteredMessages.length} messages
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={(editingMessage as any)?.username || editingMessage?.userId || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                data-testid="input-edit-message"
                value={editForm.message}
                onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                placeholder="Enter your message..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiration (optional)</Label>
              <Input
                type="datetime-local"
                step="1"
                value={editForm.expire ? editForm.expire.replace(" ", "T") : ""}
                onChange={(e) => setEditForm({ ...editForm, expire: e.target.value.replace("T", " ") })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={editForm.status === "ACTIVE"}
                onCheckedChange={(v) => setEditForm({ ...editForm, status: v ? "ACTIVE" : "INACTIVE" })}
              />
            </div>
            <Button 
              onClick={handleUpdate} 
              className="w-full" 
              disabled={updating}
              data-testid="button-update-message"
            >
              {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Update Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
