import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Tag, Bot, Search, Sparkles, Brain, Zap } from "lucide-react";
import { useContacts } from "./ContactsContext";
import type { Contact } from "./types";

export const AIAssistant = () => {
  const { contacts } = useContacts();
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "Tümü", icon: Bot },
    { id: "profession", label: "Meslek", icon: Building2 },
    { id: "location", label: "Konum", icon: MapPin },
    { id: "services", label: "Hizmetler", icon: Tag },
  ];

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return contacts;
    
    return contacts.filter((c: Contact) => {
      const haystack = [
        c.first_name || "",
        c.last_name || "",
        c.city || "",
        c.profession || "",
        ...(Array.isArray(c.services) ? c.services : []),
        ...(Array.isArray(c.tags) ? c.tags : []),
      ]
        .join("\n")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [q, contacts]);

  const getAIInsights = () => {
    if (contacts.length === 0) return null;
    
    const totalContacts = contacts.length;
    const cities = new Set(contacts.map(c => c.city).filter(Boolean));
    const professions = new Set(contacts.map(c => c.profession).filter(Boolean));
    const avgRelationship = contacts.reduce((sum, c) => sum + (c.relationship_degree || 0), 0) / totalContacts;
    
    return {
      totalContacts,
      uniqueCities: cities.size,
      uniqueProfessions: professions.size,
      avgRelationship: avgRelationship.toFixed(1),
    };
  };

  const insights = getAIInsights();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 fade-in">
        <div className="flex items-center justify-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold gradient-text">AI Asistan</h2>
        </div>
        <p className="text-muted-foreground">Ağınızı akıllıca analiz edin ve keşfedin</p>
      </div>

      {/* AI Insights */}
      {insights && (
        <Card className="modern-card p-6 slide-in" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI Analizi</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 glass rounded-lg">
              <div className="text-2xl font-bold gradient-text">{insights.totalContacts}</div>
              <div className="text-xs text-muted-foreground">Toplam Kişi</div>
            </div>
            <div className="text-center p-3 glass rounded-lg">
              <div className="text-2xl font-bold gradient-text">{insights.uniqueCities}</div>
              <div className="text-xs text-muted-foreground">Şehir</div>
            </div>
            <div className="text-center p-3 glass rounded-lg">
              <div className="text-2xl font-bold gradient-text">{insights.uniqueProfessions}</div>
              <div className="text-xs text-muted-foreground">Meslek</div>
            </div>
            <div className="text-center p-3 glass rounded-lg">
              <div className="text-2xl font-bold gradient-text">{insights.avgRelationship}</div>
              <div className="text-xs text-muted-foreground">Ort. Yakınlık</div>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="space-y-4 slide-in" style={{animationDelay: '0.2s'}}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="AI ile ağınızda ara..."
            className="pl-10 h-12 hover-scale"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="hover-scale"
              >
                <Icon className="h-4 w-4 mr-2" />
                {category.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card className="modern-card p-12 text-center slide-in" style={{animationDelay: '0.3s'}}>
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {q ? "Arama kriterlerine uygun kişi bulunamadı." : "Arama yapmaya başlayın..."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, index) => (
            <Card
              key={c.id}
              className="modern-card p-6 hover-lift bounce-in group"
              style={{ animationDelay: `${index * 0.1 + 0.3}s` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1">
                  <div className="text-xl font-bold gradient-text group-hover:scale-105 transition-transform">
                    {c.first_name} {c.last_name}
                  </div>
                  {c.profession && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span>{c.profession}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                    {c.relationship_degree}/10
                  </span>
                </div>
              </div>

              {/* Location */}
              <div className="mb-4 p-3 glass rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">{c.city || "-"}</span>
                </div>
              </div>

              {/* Services */}
              {c.services?.length ? (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <span>Yapabilecekleri</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.services.slice(0, 3).map((service, i) => (
                      <span key={i} className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                        {service}
                      </span>
                    ))}
                    {c.services.length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
                        +{c.services.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Tags */}
              {c.tags?.length ? (
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Özellikler</div>
                  <div className="flex flex-wrap gap-1">
                    {c.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
                        {tag}
                      </span>
                    ))}
                    {c.tags.length > 2 && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                        +{c.tags.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}

              {/* AI Recommendation */}
              <div className="mt-4 p-3 glass rounded-lg border-l-4 border-primary">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="font-medium">AI Önerisi</span>
                </div>
                <div className="text-xs mt-1">
                  {c.relationship_degree >= 8 
                    ? "Bu kişi ile güçlü bir bağlantınız var. Düzenli iletişim kurmayı öneririz."
                    : c.relationship_degree >= 5
                    ? "Bu bağlantıyı güçlendirmek için daha sık iletişim kurmayı deneyin."
                    : "Bu bağlantıyı geliştirmek için ortak ilgi alanlarınızı keşfedin."
                  }
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {filtered.length > 0 && (
        <Card className="modern-card p-6 slide-in" style={{animationDelay: '0.4s'}}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Hızlı Eylemler</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="hover-scale">
              <Sparkles className="h-4 w-4 mr-2" />
              Toplu Analiz
            </Button>
            <Button variant="outline" size="sm" className="hover-scale">
              <Brain className="h-4 w-4 mr-2" />
              Bağlantı Önerileri
            </Button>
            <Button variant="outline" size="sm" className="hover-scale">
              <Tag className="h-4 w-4 mr-2" />
              Kategori Analizi
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
