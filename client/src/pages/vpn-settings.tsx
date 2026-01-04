import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getVpnServers, createVpnServer, updateVpnServer, deleteVpnServer } from "@/lib/api";
import { countryOptions, vpnAuthTypeOptions, vpnStatusOptions, vpnAuthEmbeddedOptions } from "@shared/schema";
import type { VpnServer } from "@shared/schema";
import { Pencil, Trash2, X } from "lucide-react";

const defaultForm = {
  state: "",
  ovpnUrl: "",
  authType: "noup",
  username: "",
  password: "",
  status: "ACTIVE",
  authEmbedded: "NO",
  country: "IT",
};

function getCountryLabel(code: string) {
  return countryOptions.find(c => c.value === code)?.label || code;
}

function getAuthTypeLabel(code: string) {
  return vpnAuthTypeOptions.find(a => a.value === code)?.label || code;
}

export default function VpnSettings() {
  const { toast } = useToast();
  const [servers, setServers] = useState<VpnServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    loadServers();
  }, []);

  async function loadServers() {
    try {
      const data = await getVpnServers();
      setServers(data);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load VPN servers", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(server: VpnServer) {
    setEditingId(server.id);
    setForm({
      state: server.state || "",
      ovpnUrl: server.ovpnUrl || "",
      authType: server.authType || "noup",
      username: server.username || "",
      password: server.password || "",
      status: server.status || "ACTIVE",
      authEmbedded: server.authEmbedded || "NO",
      country: server.country || "IT",
    });
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
  }

  async function handleSubmit() {
    try {
      const data = {
        country: form.country,
        state: form.state,
        ovpnUrl: form.ovpnUrl,
        authType: form.authType,
        username: form.username,
        password: form.password,
        status: form.status,
        authEmbedded: form.authEmbedded,
        vpnCountry: form.country,
      };

      if (editingId) {
        await updateVpnServer(editingId, data);
        toast({ title: "Success", description: "VPN server updated" });
      } else {
        await createVpnServer(data);
        toast({ title: "Success", description: "VPN server added" });
      }
      handleCancel();
      loadServers();
    } catch (err) {
      toast({ title: "Error", description: "Failed to save server", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteVpnServer(id);
      toast({ title: "Success", description: "VPN server deleted" });
      loadServers();
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete server", variant: "destructive" });
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">OVPN Servers</h1>
        <Button
          data-testid="button-new-vpn"
          onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(!showForm); }}
          className="mt-4"
        >
          New OVPN Server
        </Button>
      </div>

      {showForm && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{editingId ? "Edit" : "Add"} OVPN Server</CardTitle>
            <Button size="icon" variant="ghost" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>State/Province</Label>
              <Input
                data-testid="input-vpn-state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="Albania TCP"
              />
            </div>
            <div>
              <Label>OpenVPN Config URL</Label>
              <Input
                data-testid="input-vpn-url"
                value={form.ovpnUrl}
                onChange={(e) => setForm({ ...form, ovpnUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Authentication Type</Label>
              <Select
                value={form.authType}
                onValueChange={(v) => setForm({ ...form, authType: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vpnAuthTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Embedded Username</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <Label>Embedded Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Auth Embedded</Label>
              <Select
                value={form.authEmbedded}
                onValueChange={(v) => setForm({ ...form, authEmbedded: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YES">YES</SelectItem>
                  <SelectItem value="NO">NO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>VPN Country</Label>
              <Select
                value={form.country}
                onValueChange={(v) => setForm({ ...form, country: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {countryOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              data-testid="button-submit-vpn"
              onClick={handleSubmit}
              className="w-full"
            >
              {editingId ? "Update" : "Submit"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead>State</TableHead>
                <TableHead>OVPN URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auth Type</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Edit</TableHead>
                <TableHead>Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No data available in table
                  </TableCell>
                </TableRow>
              ) : (
                servers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell>{getCountryLabel(server.country || "")}</TableCell>
                    <TableCell>{server.state}</TableCell>
                    <TableCell className="max-w-xs truncate">{server.ovpnUrl}</TableCell>
                    <TableCell>{server.status}</TableCell>
                    <TableCell>{getAuthTypeLabel(server.authType || "")}</TableCell>
                    <TableCell>{server.username}</TableCell>
                    <TableCell>{server.password ? "****" : ""}</TableCell>
                    <TableCell>{server.createdAt ? new Date(server.createdAt).toLocaleDateString() : ""}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleEdit(server)}
                        data-testid={`button-edit-vpn-${server.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDelete(server.id)}
                        data-testid={`button-delete-vpn-${server.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
