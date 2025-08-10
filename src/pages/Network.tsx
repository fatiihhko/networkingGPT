import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ContactForm } from "@/components/network/ContactForm";
import { ContactList } from "@/components/network/ContactList";
import { NetworkFlow } from "@/components/network/NetworkFlow";

const Network = () => {
  return (
    <main className="min-h-screen px-4 py-6 md:p-8">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-semibold">Networking GPT</h1>
        <p className="text-muted-foreground">İç ağ yönetimi ve görselleştirme paneli</p>
      </header>

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
            <div className="text-muted-foreground">Yakında…</div>
          </TabsContent>
        </Tabs>
      </Card>
    </main>
  );
};

export default Network;
