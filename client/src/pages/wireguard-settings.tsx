import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { countryOptions } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addWgKeys, deleteWgKey, getWgKeys, releaseWgKey, type WgKey,
  deleteWgLocation, getWgLocations, getWgSettings, importSurfshark, saveWgSettings, updateWgLocation, uploadWgConfs,
  type WgLocation, type WgSettings,
} from "@/lib/api";
import { Check, Download, KeyRound, Pencil, Trash2, Undo2, Upload, Users, X } from "lucide-react";

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
  const [ws, setWs] = useState<WgSettings | null>(null);
  const [keyForm, setKeyForm] = useState({ privateKey: "", address: "", dns: "" });
  const [keys, setKeys] = useState<WgKey[]>([]);
  const [newKeys, setNewKeys] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [list, st, ks] = await Promise.all([getWgLocations(), getWgSettings(), getWgKeys()]);
      setRows(list);
      setKeys(ks);
      setWs(st);
      setKeyForm((f) => ({ privateKey: "", address: f.address || st.address, dns: f.dns || st.dns }));
    } catch {
      toast({ title: "Error", description: "Could not load WireGuard locations", variant: "destructive" });
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
        title: `${ok} locations uploaded`,
        description: bad.length ? bad.map((b) => `${b.name}: ${b.error}`).join("; ") : undefined,
        variant: bad.length ? "destructive" : undefined,
      });
      await load();
    } catch {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveKey() {
    setBusy(true);
    try {
      const st = await saveWgSettings(keyForm);
      setWs(st);
      setKeyForm({ ...keyForm, privateKey: "" });
      toast({ title: "Key saved" });
    } catch {
      toast({ title: "Error", description: "Invalid private key (44 base64 characters, ends with =)", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setBusy(true);
    try {
      const r = await importSurfshark();
      toast({ title: "Surfshark locations", description: `${r.added} new, ${r.updated} updated (list: ${r.total})` });
      await load();
    } catch {
      toast({ title: "Error", description: "Surfshark import failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function addKeys() {
    setBusy(true);
    try {
      const r = await addWgKeys(newKeys);
      setNewKeys("");
      toast({
        title: `${r.added} keys added`,
        description: r.duplicates || r.invalid ? `${r.duplicates} already present, ${r.invalid} invalid` : undefined,
        variant: r.invalid ? "destructive" : undefined,
      });
      await load();
    } catch {
      toast({ title: "Error", description: "Could not save keys", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function keyAction(id: number, action: "release" | "delete") {
    try {
      if (action === "release") await releaseWgKey(id); else await deleteWgKey(id);
      await load();
    } catch {
      toast({ title: "Error", description: "Operation failed", variant: "destructive" });
    }
  }

  async function save(id: number) {
    try {
      await updateWgLocation(id, edit);
      setEditId(null);
      await load();
    } catch {
      toast({ title: "Error", description: "Save failed", variant: "destructive" });
    }
  }

  async function toggle(row: WgLocation) {
    try {
      await updateWgLocation(row.id, { status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
      await load();
    } catch {
      toast({ title: "Error", description: "Update failed", variant: "destructive" });
    }
  }

  async function remove(id: number) {
    try {
      await deleteWgLocation(id);
      await load();
    } catch {
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">WireGuard (Vega app)</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
          On Vega OS the system VPN only supports WireGuard. Import the Surfshark locations or upload the provider's
          .conf files, one per location (Surfshark: Manual setup &gt; WireGuard &gt; Locations). WireGuard identifies a
          device by its key: one key works on one device at a time.
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
        <div className="mt-4 flex justify-center gap-3">
          <Button disabled={busy} onClick={runImport} data-testid="button-wg-import">
            <Download className="w-4 h-4 mr-2" /> Import all Surfshark locations
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()} data-testid="button-wg-upload">
            <Upload className="w-4 h-4 mr-2" /> {busy ? "Uploading..." : "Upload .conf files"}
          </Button>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" /> Main WireGuard key (imported locations)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Surfshark: Manual setup &gt; WireGuard &gt; generate a key pair and paste the private key here. Used by the
            demo/review accounts (amazon, amzon) and by everyone when the key pool below is empty.{" "}
            {ws?.hasKey ? `Current key: ${ws.keyHint}` : "No key set."}
          </p>
          <div>
            <Label>Private key</Label>
            <Input type="password" autoComplete="off" value={keyForm.privateKey} placeholder={ws?.hasKey ? "(leave empty to keep it)" : "xxxxxxxx...="}
              onChange={(e) => setKeyForm({ ...keyForm, privateKey: e.target.value })} data-testid="input-wg-key" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Address</Label>
              <Input value={keyForm.address} onChange={(e) => setKeyForm({ ...keyForm, address: e.target.value })} />
            </div>
            <div>
              <Label>DNS</Label>
              <Input value={keyForm.dns} onChange={(e) => setKeyForm({ ...keyForm, dns: e.target.value })} />
            </div>
          </div>
          <Button className="w-full" disabled={busy} onClick={saveKey} data-testid="button-wg-save-key">Save</Button>
        </CardContent>
      </Card>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Key pool ({keys.length}, free {keys.filter((k) => !k.userid).length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            One key per subscriber, so all devices can connect at the same time. Generate key pairs on Surfshark (Manual
            setup &gt; WireGuard) and paste the private keys here, one per line. On first connection each username gets a
            free key and keeps it; when the pool is full, the least recently used key is reassigned.
          </p>
          <Textarea rows={4} className="font-mono text-xs" autoComplete="off" spellCheck={false} value={newKeys}
            placeholder={"key1...=\nkey2...="} onChange={(e) => setNewKeys(e.target.value)} data-testid="input-wg-pool" />
          <Button className="w-full" disabled={busy || !newKeys.trim()} onClick={addKeys} data-testid="button-wg-pool-add">
            Add keys
          </Button>
          {keys.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Release</TableHead>
                  <TableHead>Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-mono text-xs">{k.keyHint}</TableCell>
                    <TableCell>{k.userid || <span className="text-muted-foreground">free</span>}</TableCell>
                    <TableCell className="text-xs">{k.assignedAt || "-"}</TableCell>
                    <TableCell className="text-xs">{k.lastUsed || "-"}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="secondary" disabled={!k.userid} onClick={() => keyAction(k.id, "release")}>
                        <Undo2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="destructive" onClick={() => keyAction(k.id, "delete")}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Locations ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Edit</TableHead>
                <TableHead>Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No locations loaded</TableCell>
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
                  <TableCell className="text-xs">{r.source === "surfshark" ? "Surfshark" : ".conf"}</TableCell>
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
