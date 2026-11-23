import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, RefreshCw, Pencil, Ban, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Activation {
  id: number;
  kind: "mac" | "code";
  identifier: string;
  username: string;
  password: string;
  portalIndex: number;
  label: string;
  status: "active" | "pending" | "blocked";
  expiresAt: string | null;
  lastSeen: string | null;
  lastIp: string | null;
  deviceModel: string | null;
  appVersion: string | null;
}

type Form = {
  id?: number;
  kind: "mac" | "code";
  identifier: string;
  username: string;
  password: string;
  label: string;
  portalIndex: string;
  expiresAt: string;
};

const emptyForm: Form = { kind: "mac", identifier: "", username: "", password: "", label: "", portalIndex: "0", expiresAt: "" };

const statusBadge = (s: Activation["status"]) =>
  s === "active" ? <Badge className="bg-green-600">Active</Badge>
  : s === "pending" ? <Badge className="bg-amber-500">Pending</Badge>
  : <Badge variant="destructive">Blocked</Badge>;

type AccessItem = { username: string; level: "full" | "maintenance"; note: string };

/** Livelli di accesso: "maintenance" = l'app mostra solo lo stato della linea. */
function AccessLevels() {
  const { toast } = useToast();
  const [user, setUser] = useState("");
  const [note, setNote] = useState("");
  const { data } = useQuery<{ items: AccessItem[] }>({ queryKey: ["/api/admin/access"] });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/access"] });
  const add = useMutation({
    mutationFn: async () => apiRequest("PUT", "/api/admin/access", { username: user.trim(), level: "maintenance", note }),
    onSuccess: () => { setUser(""); setNote(""); refresh(); toast({ title: "Maintainer added" }); },
    onError: (e: any) => toast({ title: "Error", description: String(e?.message || e), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: async (u: string) => apiRequest("DELETE", `/api/admin/access/${encodeURIComponent(u)}`),
    onSuccess: () => { refresh(); toast({ title: "Full access restored" }); },
  });
  const items = data?.items ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access levels</CardTitle>
        <CardDescription>
          Users listed here are "Maintainers": in the app they only see the line status (speed test and connection details), without channels, movies or series.
          Users not listed have full access. Applies to the Xtream line user used to sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap items-end">
          <div><Label>Line user</Label><Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="username" /></div>
          <div><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. ADSL technician north area" /></div>
          <Button disabled={!user.trim() || add.isPending} onClick={() => add.mutate()}><Plus className="h-4 w-4 mr-2" />Add maintainer</Button>
        </div>
        {items.length === 0 ? <p className="text-muted-foreground text-sm">No maintainers.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Level</TableHead><TableHead>Note</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.username}>
                  <TableCell className="font-mono">{i.username}</TableCell>
                  <TableCell><Badge variant={i.level === "maintenance" ? "default" : "secondary"}>{i.level === "maintenance" ? "Maintainer" : "Full"}</Badge></TableCell>
                  <TableCell className="text-sm">{i.note || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" title="Remove (restore full access)" onClick={() => remove.mutate(i.username)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function ActivationsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<Form | null>(null);

  const { data, isLoading, refetch } = useQuery<{ activations: Activation[]; total: number; pending: number }>({
    queryKey: ["/api/admin/activations"],
    refetchInterval: 10000,
  });

  const done = (title: string) => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/activations"] });
    toast({ title });
    setForm(null);
  };
  const fail = async (e: any) => {
    toast({ title: "Error", description: String(e?.message || e), variant: "destructive" });
  };

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const body = {
        kind: f.kind, identifier: f.identifier, username: f.username, password: f.password,
        label: f.label, portalIndex: Number(f.portalIndex) || 0, expiresAt: f.expiresAt || null,
      };
      if (f.id) await apiRequest("PUT", `/api/admin/activations/${f.id}`, body);
      else await apiRequest("POST", "/api/admin/activations", body);
    },
    onSuccess: () => done("Saved"),
    onError: fail,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => apiRequest("PUT", `/api/admin/activations/${id}`, { status }),
    onSuccess: () => done("Updated"),
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/activations/${id}`),
    onSuccess: () => done("Deleted"),
    onError: fail,
  });

  const items = data?.activations ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Activations</h1>
          <p className="text-muted-foreground text-sm">
            For the "MAC Address" and "Activation Code" login types: the app requests its credentials from this service using its MAC address or a code.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          <Button onClick={() => setForm({ ...emptyForm })}><Plus className="h-4 w-4 mr-2" />New</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Devices and codes {data ? `(${data.total})` : ""}</CardTitle>
          <CardDescription>
            {data?.pending ? `${data.pending} device(s) pending: click the pencil and assign the line username and password.` : "Unknown devices appear here automatically as soon as they open the app in MAC mode."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>Loading…</p> : items.length === 0 ? <p className="text-muted-foreground">No activations.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead><TableHead>MAC / Code</TableHead><TableHead>Line (user)</TableHead>
                  <TableHead>Status</TableHead><TableHead>Last seen</TableHead><TableHead>Device</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.kind === "mac" ? "MAC" : "Code"}</TableCell>
                    <TableCell className="font-mono">{a.identifier}{a.label ? <div className="text-xs text-muted-foreground font-sans">{a.label}</div> : null}</TableCell>
                    <TableCell>{a.username || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{statusBadge(a.status)}{a.expiresAt ? <div className="text-xs text-muted-foreground">expires {a.expiresAt}</div> : null}</TableCell>
                    <TableCell className="text-xs">{a.lastSeen ? `${a.lastSeen} UTC` : "—"}{a.lastIp ? <div className="text-muted-foreground">{a.lastIp}</div> : null}</TableCell>
                    <TableCell className="text-xs">{a.deviceModel || "—"}{a.appVersion ? <div className="text-muted-foreground">{a.appVersion}</div> : null}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" title="Edit / assign line"
                        onClick={() => setForm({ id: a.id, kind: a.kind, identifier: a.identifier, username: a.username, password: a.password, label: a.label, portalIndex: String(a.portalIndex), expiresAt: a.expiresAt || "" })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {a.status === "blocked"
                        ? <Button size="icon" variant="ghost" title="Unblock" onClick={() => setStatus.mutate({ id: a.id, status: a.username && a.password ? "active" : "pending" })}><CheckCircle2 className="h-4 w-4" /></Button>
                        : <Button size="icon" variant="ghost" title="Block" onClick={() => setStatus.mutate({ id: a.id, status: "blocked" })}><Ban className="h-4 w-4" /></Button>}
                      <Button size="icon" variant="ghost" title="Delete" onClick={() => { if (confirm("Delete this activation?")) remove.mutate(a.id); }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AccessLevels />

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit activation" : "New activation"}</DialogTitle>
            <DialogDescription>Username and password of the Xtream line on the portal: the app receives them and signs in automatically.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label>Type</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as "mac" | "code" })} disabled={!!form.id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mac">MAC (the device identifies itself)</SelectItem>
                    <SelectItem value="code">Activation code (typed by the user)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.kind === "mac" ? "Device MAC" : "Code (empty = generate one)"}</Label>
                <Input value={form.identifier} disabled={!!form.id} placeholder={form.kind === "mac" ? "AA:BB:CC:DD:EE:FF" : "e.g. K7M2P9QX"}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Line user</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
                <div><Label>Line password</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Portal</Label>
                  <Select value={form.portalIndex} onValueChange={(v) => setForm({ ...form, portalIndex: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[0, 1, 2, 3, 4].map((i) => <SelectItem key={i} value={String(i)}>Portal {i + 1}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Expiry (optional)</Label><Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></div>
              </div>
              <div><Label>Note</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. John Smith" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button disabled={!form || save.isPending} onClick={() => form && save.mutate(form)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
