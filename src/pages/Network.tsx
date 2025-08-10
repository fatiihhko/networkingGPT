import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ContactForm } from "@/components/network/ContactForm";
import { ContactList } from "@/components/network/ContactList";
import { NetworkFlow } from "@/components/network/NetworkFlow";
import { StatsBar } from "@/components/network/StatsBar";
import { ContactsProvider } from "@/components/network/ContactsContext";
import { AIAssistant } from "@/components/network/AIAssistant";
interface SimpleContact { id: string; first_name: string; last_name: string }

const InviteButtonInline = () => {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<SimpleContact[]>([]);
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [unlimited, setUnlimited] = useState<boolean>(false);
  const [link, setLink] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data, error } = await supabase.from("contacts").select("id, first_name, last_name").order("created_at", { ascending: false });
      if (error) toast({ title: "Kişiler yüklenemedi", description: error.message, variant: "destructive" });
      setContacts((data as any) || []);
    };
    load();
  }, [open]);

  const createInvite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Giriş gerekli", description: "Önce giriş yapmalısınız.", variant: "destructive" });
      return;
    }
    const token = crypto.randomUUID();
    const { error } = await supabase.from("invites").insert({
      token,
      parent_contact_id: parentId ?? null,
      max_uses: unlimited ? 0 : maxUses,
      owner_user_id: user.id,
    });
    if (error) {
      toast({ title: "Davet oluşturulamadı", description: error.message, variant: "destructive" });
      return;
    }
    const url = `${window.location.origin}/invite/${token}`;
    setLink(url);
    await navigator.clipboard.writeText(url).catch(() => {});
    toast({ title: "Davet oluşturuldu", description: "Bağlantı panoya kopyalandı." });
    window.dispatchEvent(new CustomEvent("invites:refresh"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Davet Oluştur</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Davetiye Bağlantısı Oluştur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Daveti gönderen kişi (opsiyonel)</Label>
            <Select onValueChange={(v) => setParentId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Bir kişi seçin (opsiyonel)" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Maksimum kullanım</Label>
            <Input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value || "1", 10))}
              disabled={unlimited}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="unlimited">Sınırsız bağlantı</Label>
            <Switch id="unlimited" checked={unlimited} onCheckedChange={(v) => setUnlimited(!!v)} />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={createInvite}>Bağlantı Oluştur</Button>
            {link && (
              <>
                <Input readOnly value={link} className="flex-1" />
                <Button variant="secondary" onClick={() => navigator.clipboard.writeText(link)}>Kopyala</Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Davet listesi (kopyalama butonlarıyla)
const InvitesList = () => {
  const [invites, setInvites] = useState<Array<{ id: string; token: string; uses: number; max_uses: number; parent_contact_id: string | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setInvites([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("invites")
      .select("id, token, uses, max_uses, parent_contact_id, created_at")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Davetler yüklenemedi", description: error.message, variant: "destructive" });
      setInvites([]);
      setLoading(false);
      return;
    }
    const invitesData = (data as any) || [];

    const parentIds = Array.from(
      new Set(invitesData.map((i: any) => i.parent_contact_id).filter(Boolean))
    ) as string[];
    if (parentIds.length > 0) {
      const { data: contacts, error: cErr } = await supabase
        .from("contacts")
        .select("id, first_name, last_name")
        .in("id", parentIds);
      if (!cErr && contacts) {
        const m: Record<string, string> = {};
        (contacts as any).forEach((c: any) => {
          m[c.id] = `${c.first_name} ${c.last_name}`;
        });
        setNames(m);
      }
    }

    setInvites(invitesData);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const onRefresh = () => load();
    // @ts-ignore - CustomEvent typing is fine in runtime
    window.addEventListener("invites:refresh", onRefresh);
    return () => window.removeEventListener("invites:refresh", onRefresh as any);
  }, []);

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url).catch(() => {});
    toast({ title: "Bağlantı kopyalandı" });
  };

  const base = window.location.origin;

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Davet Bağlantıları</h3>
      {loading ? (
        <div>Yükleniyor…</div>
      ) : invites.length === 0 ? (
        <div className="text-muted-foreground">Henüz davet oluşturulmadı.</div>
      ) : (
        <ul className="space-y-2">
          {invites.map((i) => {
            const url = `${base}/invite/${i.token}`;
            const parent = i.parent_contact_id ? names[i.parent_contact_id] || "Bilinmeyen" : "Yok";
            const limitLabel = i.max_uses === 0 ? "Sınırsız" : i.max_uses;
            return (
              <li key={i.id} className="flex flex-col md:flex-row md:items-center gap-2 justify-between rounded-md border bg-card p-3">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Üst Kişi: {parent}</span>
                  <span className="text-sm">Kullanım: {i.uses} / {limitLabel}</span>
                  <span className="text-xs text-muted-foreground break-all">{url}</span>
                </div>
                <div>
                  <Button variant="secondary" onClick={() => copy(url)}>Kopyala</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const Network = () => {
  return (
    <main className="min-h-screen px-4 py-6 md:p-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold">Networking GPT</h1>
          <p className="text-muted-foreground">İç ağ yönetimi ve görselleştirme paneli</p>
        </div>
        <InviteButtonInline />
      </header>

      <div className="mb-6">
        <Card className="p-4 md:p-6">
          <InvitesList />
        </Card>
      </div>

      <div className="mb-6">
        <Card className="p-4 md:p-6">
          <StatsBar />
        </Card>
      </div>

      <ContactsProvider>
        <Card className="p-4 md:p-6">
          <Tabs defaultValue="add" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
              <TabsTrigger value="add">Kişi Ekle</TabsTrigger>
              <TabsTrigger value="list">Ağ Listesi</TabsTrigger>
              <TabsTrigger value="map">Görsel Ağ Haritası</TabsTrigger>
              <TabsTrigger value="ai">Yapay Zeka Asistanı</TabsTrigger>
            </TabsList>
            <TabsContent value="add">
              <ContactForm />
            </TabsContent>
            <TabsContent value="list">
              <ContactList />
            </TabsContent>
            <TabsContent value="map">
              <NetworkFlow />
            </TabsContent>
            <TabsContent value="ai">
              <AIAssistant />
            </TabsContent>
          </Tabs>
        </Card>
      </ContactsProvider>
    </main>
  );
};

export default Network;
