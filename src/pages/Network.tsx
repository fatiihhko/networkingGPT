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
import { UserPlus, List as ListIcon, Share2, Bot } from "lucide-react";
interface SimpleContact { id: string; first_name: string; last_name: string }

const InviteButtonInline = () => {
  const [open, setOpen] = useState(false);
  const [maxUses, setMaxUses] = useState<number>(0);
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


const Network = () => {
  const [activeTab, setActiveTab] = useState("add");
  return (
    <main className="min-h-screen px-4 pt-6 pb-24 md:p-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold">Networking GPT</h1>
          <p className="text-muted-foreground">İç ağ yönetimi ve görselleştirme paneli</p>
        </div>
        <InviteButtonInline />
      </header>


      <div className="mb-6">
        <Card className="p-4 md:p-6">
          <StatsBar />
        </Card>
      </div>

      <ContactsProvider>
        <Card className="p-4 md:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="hidden md:grid grid-cols-4 w-full">
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

      {/* Alt mobil gezinme çubuğu */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="grid grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTab("add")}
            aria-label="Kişi Ekle"
            aria-current={activeTab === "add"}
            className={`h-16 w-full flex flex-col items-center justify-center gap-1 ${activeTab === "add" ? "text-primary" : "text-muted-foreground"} hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
          >
            <UserPlus className="h-5 w-5" />
            <span className="text-xs">Kişi Ekle</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            aria-label="Ağ Listesi"
            aria-current={activeTab === "list"}
            className={`h-16 w-full flex flex-col items-center justify-center gap-1 ${activeTab === "list" ? "text-primary" : "text-muted-foreground"} hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
          >
            <ListIcon className="h-5 w-5" />
            <span className="text-xs">Ağ Listesi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("map")}
            aria-label="Görsel Ağ Haritası"
            aria-current={activeTab === "map"}
            className={`h-16 w-full flex flex-col items-center justify-center gap-1 ${activeTab === "map" ? "text-primary" : "text-muted-foreground"} hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
          >
            <Share2 className="h-5 w-5" />
            <span className="text-xs">Harita</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            aria-label="Yapay Zeka Asistanı"
            aria-current={activeTab === "ai"}
            className={`h-16 w-full flex flex-col items-center justify-center gap-1 ${activeTab === "ai" ? "text-primary" : "text-muted-foreground"} hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
          >
            <Bot className="h-5 w-5" />
            <span className="text-xs">Asistan</span>
          </button>
        </div>
      </nav>
    </main>
  );
};

export default Network;
