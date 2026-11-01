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
  s === "active" ? <Badge className="bg-green-600">Attiva</Badge>
  : s === "pending" ? <Badge className="bg-amber-500">In attesa</Badge>
  : <Badge variant="destructive">Bloccata</Badge>;

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
    toast({ title: "Errore", description: String(e?.message || e), variant: "destructive" });
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
    onSuccess: () => done("Salvata"),
    onError: fail,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => apiRequest("PUT", `/api/admin/activations/${id}`, { status }),
    onSuccess: () => done("Aggiornata"),
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/activations/${id}`),
    onSuccess: () => done("Eliminata"),
    onError: fail,
  });

  const items = data?.activations ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Activations</h1>
          <p className="text-muted-foreground text-sm">
            Per i Login Type "MAC Address" e "Activation Code": l'app chiede le credenziali a questo servizio con il proprio MAC o con un codice.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Aggiorna</Button>
          <Button onClick={() => setForm({ ...emptyForm })}><Plus className="h-4 w-4 mr-2" />Nuova</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dispositivi e codici {data ? `(${data.total})` : ""}</CardTitle>
          <CardDescription>
            {data?.pending ? `${data.pending} dispositivo/i in attesa: premi la matita e assegna utente e password della linea.` : "I dispositivi sconosciuti compaiono qui da soli appena aprono l'app in modalita' MAC."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>Caricamento…</p> : items.length === 0 ? <p className="text-muted-foreground">Nessuna attivazione.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead><TableHead>MAC / Codice</TableHead><TableHead>Linea (utente)</TableHead>
                  <TableHead>Stato</TableHead><TableHead>Ultimo accesso</TableHead><TableHead>Dispositivo</TableHead><TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.kind === "mac" ? "MAC" : "Codice"}</TableCell>
                    <TableCell className="font-mono">{a.identifier}{a.label ? <div className="text-xs text-muted-foreground font-sans">{a.label}</div> : null}</TableCell>
                    <TableCell>{a.username || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{statusBadge(a.status)}{a.expiresAt ? <div className="text-xs text-muted-foreground">scade {a.expiresAt}</div> : null}</TableCell>
                    <TableCell className="text-xs">{a.lastSeen ? `${a.lastSeen} UTC` : "—"}{a.lastIp ? <div className="text-muted-foreground">{a.lastIp}</div> : null}</TableCell>
                    <TableCell className="text-xs">{a.deviceModel || "—"}{a.appVersion ? <div className="text-muted-foreground">{a.appVersion}</div> : null}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" title="Modifica / assegna linea"
                        onClick={() => setForm({ id: a.id, kind: a.kind, identifier: a.identifier, username: a.username, password: a.password, label: a.label, portalIndex: String(a.portalIndex), expiresAt: a.expiresAt || "" })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {a.status === "blocked"
                        ? <Button size="icon" variant="ghost" title="Sblocca" onClick={() => setStatus.mutate({ id: a.id, status: a.username && a.password ? "active" : "pending" })}><CheckCircle2 className="h-4 w-4" /></Button>
                        : <Button size="icon" variant="ghost" title="Blocca" onClick={() => setStatus.mutate({ id: a.id, status: "blocked" })}><Ban className="h-4 w-4" /></Button>}
                      <Button size="icon" variant="ghost" title="Elimina" onClick={() => { if (confirm("Eliminare questa attivazione?")) remove.mutate(a.id); }}>
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

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Modifica attivazione" : "Nuova attivazione"}</DialogTitle>
            <DialogDescription>Utente e password sono quelli della linea Xtream sul portale: l'app li riceve e fa il login da sola.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as "mac" | "code" })} disabled={!!form.id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mac">MAC (il dispositivo si identifica da solo)</SelectItem>
                    <SelectItem value="code">Codice di attivazione (lo digita l'utente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.kind === "mac" ? "MAC del dispositivo" : "Codice (vuoto = ne genero uno)"}</Label>
                <Input value={form.identifier} disabled={!!form.id} placeholder={form.kind === "mac" ? "AA:BB:CC:DD:EE:FF" : "es. K7M2P9QX"}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Utente linea</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
                <div><Label>Password linea</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Portale</Label>
                  <Select value={form.portalIndex} onValueChange={(v) => setForm({ ...form, portalIndex: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[0, 1, 2, 3, 4].map((i) => <SelectItem key={i} value={String(i)}>Portale {i + 1}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Scadenza (opz.)</Label><Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></div>
              </div>
              <div><Label>Nota</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="es. Mario Rossi" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Annulla</Button>
            <Button disabled={!form || save.isPending} onClick={() => form && save.mutate(form)}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
