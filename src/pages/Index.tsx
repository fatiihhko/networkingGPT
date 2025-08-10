import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Users, Search, Zap, MessageSquare, Shield, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Akıllı Network Yönetimi",
    desc: "Tanıdıklarınızı meslek, şehir, yakınlık derecesi ve yönlendirme gibi ölçütlerle yönetin. Her detay kaydedilsin.",
  },
  {
    icon: Search,
    title: "AI Destekli Arama",
    desc: '"İstanbul’da data uzmanı kim?" deyin. AI en uygun kişileri ilişkisel bağlamla otomatik olarak önerir.',
  },
  {
    icon: Zap,
    title: "Hızlı Erişim",
    desc: "Network üzerindeki konum ve uzmanlık alanına göre aradığınızı hemen bulun. Doğru kişi hep elinizin altında.",
  },
  {
    icon: MessageSquare,
    title: "Doğal Dil Desteği",
    desc: "Komutlar yerine doğal konuşma diliyle ihtiyacınızı ifade edin. AI anlasın, önerisin.",
  },
  {
    icon: Shield,
    title: "Güvenli & Kişisel",
    desc: "Verileriniz sizin kontrolünüzde. Sadece siz ve kendi network’ünüz erişebilir ve yönetebilirsiniz.",
  },
  {
    icon: BarChart3,
    title: "İstatistikler",
    desc: "Network’ün büyüklüğünü, çeşitliliğini ve güçlü noktalarını görsel olarak takip edin.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container mx-auto flex h-14 items-center justify-between">
          <a href="/" className="inline-flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Networking GPT</span>
          </a>
          <Button asChild variant="secondary" size="sm">
            <a href="/network" aria-label="Uygulamaya Git">Uygulamaya Git</a>
          </Button>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            <span className="text-primary">Networking GPT</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg md:text-xl text-muted-foreground">
            Çevrenizdeki insanları organize edin, yapay zeka desteğiyle ihtiyacınız olduğunda en uygun kişiyi bulun. Network’ünüzü akıllı bir şekilde yönetin.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <a href="/auth" aria-label="Hemen Başla">
                Hemen Başla
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </section>

        {/* Why / Features */}
        <section className="container mx-auto px-4 py-10 md:py-12">
          <h2 className="text-center text-2xl md:text-3xl font-semibold">Neden Networking GPT?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            Modern network yönetimi için tasarlanmış özelliklerle, tanıdıklarınızdan maksimum verim alın.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="hover:shadow-sm transition-shadow">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">
            Network’ünüzü Güçlendirmeye Hazır mısınız?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            İlk kişinizi ekleyerek başlayın ve AI asistanının gücünü keşfedin. Ücretsiz, hızlı ve kolay.
          </p>
          <div className="mt-6">
            <Button asChild size="lg" variant="secondary">
              <a href="/auth" aria-label="Şimdi Deneyin">
                Şimdi Deneyin
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
