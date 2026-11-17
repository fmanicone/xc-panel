import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { countryOptions } from "@shared/schema";
import { deleteWgLocation, getWgLocations, updateWgLocation, uploadWgConfs, type WgLocation } from "@/lib/api";
import { Check, Pencil, Trash2, Upload, X } from "lucide-react";

function countryLabel(code: string) {
  return countryOptions.find((c) => c.value === code)?.label || code;
}

/**
 * VPN WireGuard per le app Vega: si caricano i file .conf scaricati dal fornitore (es. Surfshark > Manual setup >
 * WireGuard > Locations), uno per posizione. Paese e citta' vengono dal nome del server e si possono correggere.
 */
export default function WireguardSettings() {
  const { toast } = useToast();
  const [rows, setRows] = useState<WgLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState({ country: "", state: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setRows(await getWgLocations());
    } catch {
      toast({ title: "Errore", description: "Impossibile leggere le posizioni WireGuard", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const { results } = await uploadWgConfs(Array.from(files));
      const ok = results.filter((r) => r.ok).length;
      const bad = results.filter((r) => !r.ok);
      toast({
        title: `${ok} posizioni caricate`,
        description: bad.length ? bad.map((b) => `${b.name}: ${b.error}`).join("; ") : undefined,
        variant: bad.length ? "destructive" : undefined,
      });
      await load();
    } catch {
      toast({ title: "Errore", description: "Caricamento non riuscito", variant: "destructive" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(id: number) {
    try {
      await updateWgLocation(id, edit);
      setEditId(null);
      await load();
    } catch {
      toast({ title: "Errore", description: "Salvataggio non riuscito", variant: "destructive" });
    }
  }

  async function toggle(row: WgLocation) {
    try {
      await updateWgLocation(row.id, { status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
      await load();
    } catch {
      toast({ title: "Errore", description: "Aggiornamento non riuscito", variant: "destructive" });
    }
  }

  async function remove(id: number) {
    try {
      await deleteWgLocation(id);
      await load();
    } catch {
      toast({ title: "Errore", description: "Eliminazione non riuscita", variant: "destructive" });
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">WireGuard (app Vega)</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
          Su Vega OS la VPN di sistema accetta solo WireGuard. Carica i file .conf del fornitore, uno per posizione
          (Surfshark: Manual setup &gt; WireGuard &gt; Locations). Ogni .conf contiene una chiave privata: con la stessa
          chiave funziona un dispositivo alla volta.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".conf,text/plain"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
          data-testid="input-wg-files"
        />
        <Button className="mt-4" disabled={busy} onClick={() => fileRef.current?.click()} data-testid="button-wg-upload">
          <Upload className="w-4 h-4 mr-2" /> {busy ? "Caricamento..." : "Carica file .conf"}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Posizioni ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paese</TableHead>
                <TableHead>Citta'</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Modifica</TableHead>
                <TableHead>Elimina</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nessuna posizione caricata</TableCell>
                </TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {editId === r.id ? (
                      <Select value={edit.country} onValueChange={(v) => setEdit({ ...edit, country: v })}>
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {countryOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : countryLabel(r.country)}
                  </TableCell>
                  <TableCell>
                    {editId === r.id
                      ? <Input value={edit.state} onChange={(e) => setEdit({ ...edit, state: e.target.value })} className="w-40" />
                      : r.state}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.host}</TableCell>
                  <TableCell>
                    <Button size="sm" variant={r.status === "ACTIVE" ? "default" : "secondary"} onClick={() => toggle(r)}>
                      {r.status}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {editId === r.id ? (
                      <div className="flex gap-1">
                        <Button size="icon" onClick={() => save(r.id)}><Check className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X className="w-4 h-4" /></Button>
                      </div>
                    ) : (
                      <Button size="icon" variant="secondary" onClick={() => { setEditId(r.id); setEdit({ country: r.country, state: r.state }); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="destructive" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
