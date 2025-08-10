import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
      max_uses: maxUses,
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
            <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(parseInt(e.target.value || "1", 10))} />
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
        {/* Stats */}
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
