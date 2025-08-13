import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

import { supabase } from "@/integrations/supabase/client";
import { ContactForm } from "@/components/network/ContactForm";
import { ContactList } from "@/components/network/ContactList";
import { NetworkFlow } from "@/components/network/NetworkFlow";



import { ContactsProvider } from "@/components/network/ContactsContext";
import { AIAssistant } from "@/components/network/AIAssistant";
import { UserPlus, List as ListIcon, Share2, Bot, LogOut, Sparkles } from "lucide-react";



const InviteButtonInline = () => {
  const [open, setOpen] = useState(false);
  const [maxUses, setMaxUses] = useState<number>(0);
  const [link, setLink] = useState<string>("");


  const createInvite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Giriş gerekli", description: "Önce giriş yapmalısınız.", variant: "destructive" });
      return;
    }


    const { data, error } = await supabase.functions.invoke("invite-create", {
      body: {
        max_uses: Number.isFinite(maxUses) ? maxUses : 0,
      },
    });

    if (error) {
      toast({ title: "Davet oluşturulamadı", description: error.message || "Bilinmeyen hata", variant: "destructive" });
      return;
    }

    const token = (data as any)?.token as string;
    const url = `${window.location.origin}/invite/${token}`;
    setLink(url);
    await navigator.clipboard.writeText(url).catch(() => {});
    toast({ title: "Davet oluşturuldu", description: "Bağlantı panoya kopyalandı." });
    window.dispatchEvent(new CustomEvent("invites:refresh"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-modern hover-lift hover-glow">
          <Sparkles className="h-4 w-4 mr-2" />
          Davet Bağlantısı Oluştur
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-dark">
        <DialogHeader>
          <DialogTitle className="gradient-text">Davetiye Bağlantısı Oluştur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Kullanım limiti (0 = sınırsız)</Label>
            <Input
              type="number"
              min={0}
              value={maxUses}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setMaxUses(Number.isNaN(v) ? 0 : Math.max(0, v));
              }}
              className="hover-scale"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={createInvite} className="btn-modern hover-lift">
              <Sparkles className="h-4 w-4 mr-2" />
              Bağlantı Oluştur
            </Button>
            {link && (
              <>
                <Input readOnly value={link} className="flex-1 hover-scale" />
                <Button variant="secondary" onClick={() => navigator.clipboard.writeText(link)} className="hover-lift">
                  Kopyala
                </Button>
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
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Çıkış yapıldı", description: "Başarıyla çıkış yaptınız." });
  };

  return (
    <main className="min-h-screen px-4 pt-6 pb-24 md:p-8 gradient-bg">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl float" style={{animationDelay: '1s'}}></div>
      </div>

            <header className="mb-6 flex items-center justify-between gap-3 relative z-10 fade-in">
        <div className="flex items-center gap-4">
          <img 
            src="/networking-gpt-logo.png" 
            alt="Networking GPT Logo" 
            className="h-12 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-2">
          <InviteButtonInline />
          <Button variant="outline" size="sm" onClick={handleLogout} className="hover-lift hover-glow">
            <LogOut className="h-4 w-4" />
            Çıkış
          </Button>
        </div>
      </header>



      <ContactsProvider>
        {/* Desktop mythology cards */}
        <div className="hidden md:block">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {/* Hermes - Kişi Ekle */}
            <div 
              onClick={() => setActiveTab("add")}
              className={`mythology-card greek-pattern ${activeTab === "add" ? "golden-glow" : ""}`}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                                 <div className="mythology-icon">
                   <img 
                     src="/lovable-uploads/84a0729d-10e4-4a40-b43e-adb34ad6ab0d.png" 
                     alt="Hermes - Messenger of Gods" 
                     className="h-36 w-48 object-cover rounded-xl"
                   />
                 </div>
                <div>
                  <h3 className="text-xl font-bold" style={{color: "hsl(var(--mythology-gold))"}}>Hermes</h3>
                  <p className="text-muted-foreground">Kişi Ekle</p>
                  <p className="text-xs text-muted-foreground mt-1">Haberciler tanrısı gibi yeni bağlantılar kurun</p>
                </div>
              </div>
            </div>

            {/* Agora - Ağ Listesi */}
            <div 
              onClick={() => setActiveTab("list")}
              className={`mythology-card greek-pattern ${activeTab === "list" ? "golden-glow" : ""}`}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                                 <div className="mythology-icon">
                   <img 
                     src="/lovable-uploads/9fb618e5-56fd-49dc-a341-8c856ba65545.png" 
                     alt="Agora - Ancient Marketplace" 
                     className="h-36 w-48 object-cover rounded-xl"
                   />
                 </div>
                <div>
                  <h3 className="text-xl font-bold" style={{color: "hsl(var(--mythology-gold))"}}>Agora</h3>
                  <p className="text-muted-foreground">Ağ Listesi</p>
                  <p className="text-xs text-muted-foreground mt-1">Antik pazar yeri gibi tüm bağlantılarınızı görün</p>
                </div>
              </div>
            </div>

            {/* Atlas - Görsel Ağ Haritası */}
            <div 
              onClick={() => setActiveTab("map")}
              className={`mythology-card greek-pattern ${activeTab === "map" ? "golden-glow" : ""}`}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                                 <div className="mythology-icon">
                   <img 
                     src="/lovable-uploads/57b52711-75e1-460c-86d2-ab82f0984651.png" 
                     alt="Atlas - Bearer of the World" 
                     className="h-36 w-48 object-cover rounded-xl"
                   />
                 </div>
                <div>
                  <h3 className="text-xl font-bold" style={{color: "hsl(var(--mythology-gold))"}}>Atlas</h3>
                  <p className="text-muted-foreground">Görsel Ağ Haritası</p>
                  <p className="text-xs text-muted-foreground mt-1">Dünyayı taşıyan titan gibi ağınızı keşfedin</p>
                </div>
              </div>
            </div>

            {/* Pythia - Yapay Zeka Asistanı */}
            <div 
              onClick={() => setActiveTab("ai")}
              className={`mythology-card greek-pattern ${activeTab === "ai" ? "golden-glow" : ""}`}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                                 <div className="mythology-icon">
                   <img 
                     src="/lovable-uploads/704fb316-91d6-4a36-9a70-acefffccb8c5.png" 
                     alt="Pythia - Oracle of Delphi" 
                     className="h-36 w-48 object-cover rounded-xl"
                   />
                 </div>
                <div>
                  <h3 className="text-xl font-bold" style={{color: "hsl(var(--mythology-gold))"}}>Pythia</h3>
                  <p className="text-muted-foreground">Yapay Zeka Asistanı</p>
                  <p className="text-xs text-muted-foreground mt-1">Delphi kahinesi gibi ağınız hakkında bilgi alın</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content area for desktop */}
          <Card className="modern-card marble-texture p-6 hover-lift">
            {activeTab === "add" && (
              <div className="fade-in">
                <ContactForm />
              </div>
            )}
            {activeTab === "list" && (
              <div className="fade-in">
                <ContactList />
              </div>
            )}
            {activeTab === "map" && (
              <div className="fade-in">
                <NetworkFlow />
              </div>
            )}
            {activeTab === "ai" && (
              <div className="fade-in">
                <AIAssistant />
              </div>
            )}
          </Card>
        </div>

        {/* Mobile tabs (existing functionality) */}
        <div className="md:hidden">
          <Card className="modern-card p-4 hover-lift">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsContent value="add" className="fade-in">
                <ContactForm />
              </TabsContent>
              <TabsContent value="list" className="fade-in">
                <ContactList />
              </TabsContent>
              <TabsContent value="map" className="fade-in">
                <NetworkFlow />
              </TabsContent>
              <TabsContent value="ai" className="fade-in">
                <AIAssistant />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </ContactsProvider>

      {/* Alt mobil gezinme çubuğu */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 glass border-t">
        <div className="grid grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveTab("add")}
            aria-label="Kişi Ekle"
            aria-current={activeTab === "add"}
            className={`h-16 w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 hover:scale-110 ${
              activeTab === "add" 
                ? "text-primary pulse-glow" 
                : "text-muted-foreground hover:text-foreground"
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
          >
            <UserPlus className="h-5 w-5" />
            <span className="text-xs">Kişi Ekle</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            aria-label="Ağ Listesi"
            aria-current={activeTab === "list"}
            className={`h-16 w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 hover:scale-110 ${
              activeTab === "list" 
                ? "text-primary pulse-glow" 
                : "text-muted-foreground hover:text-foreground"
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
          >
            <ListIcon className="h-5 w-5" />
            <span className="text-xs">Ağ Listesi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("map")}
            aria-label="Görsel Ağ Haritası"
            aria-current={activeTab === "map"}
            className={`h-16 w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 hover:scale-110 ${
              activeTab === "map" 
                ? "text-primary pulse-glow" 
                : "text-muted-foreground hover:text-foreground"
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
          >
            <Share2 className="h-5 w-5" />
            <span className="text-xs">Harita</span>
          </button>



          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            aria-label="Yapay Zeka Asistanı"
            aria-current={activeTab === "ai"}
            className={`h-16 w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 hover:scale-110 ${
              activeTab === "ai" 
                ? "text-primary pulse-glow" 
                : "text-muted-foreground hover:text-foreground"
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
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
