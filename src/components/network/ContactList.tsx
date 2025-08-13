import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Building2, MapPin, Phone, Mail, Star, Trash2, Tag, Users, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useContacts } from "./ContactsContext";
import type { Contact } from "./types";
import { classifyDistanceToIstanbul } from "@/utils/distance";
import { Input } from "@/components/ui/input";

function degreeColor(degree: number) {
  if (degree >= 8) return "hsl(var(--closeness-green))";
  if (degree >= 5) return "hsl(var(--closeness-yellow))";
  return "hsl(var(--closeness-red))";
}

export const ContactList = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setContacts: setCtxContacts } = useContacts();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (!error && data) {
        setContacts(data as any);
        setFilteredContacts(data as any);
        try { setCtxContacts(data as any); } catch {}
      }
      setIsLoading(false);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Search functionality
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredContacts(contacts);
      return;
    }
    
    const filtered = contacts.filter(contact => 
      contact.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.profession?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.services?.some(service => service.toLowerCase().includes(searchTerm.toLowerCase())) ||
      contact.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredContacts(filtered);
  }, [searchTerm, contacts]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      toast({ title: "Silinemedi", description: error.message, variant: "destructive" });
    } else {
      const updated = contacts.filter((c) => c.id !== id);
      setContacts(updated);
      setFilteredContacts(updated);
      try { setCtxContacts(updated); } catch {}
      toast({ title: "Kişi silindi", description: "Kişi ağınızdan kaldırıldı." });
    }
    setDeletingId(null);
  };

  const degreeMap = useMemo(() => {
    const map = new Map<string, Contact>();
    contacts.forEach((c) => map.set(c.id, c));
    const cache = new Map<string, number>();
    const getDegree = (id: string): number => {
      if (cache.has(id)) return cache.get(id)!;
      const visited = new Set<string>();
      let current = map.get(id);
      let degree = 1;
      while (current && current.parent_contact_id) {
        if (visited.has(current.id)) break;
        visited.add(current.id);
        degree++;
        current = map.get(current.parent_contact_id);
      }
      cache.set(id, degree);
      return degree;
    };
    const out: Record<string, number> = {};
    contacts.forEach((c) => {
      out[c.id] = getDegree(c.id);
    });
    return out;
  }, [contacts]);

  const cards = useMemo(
    () =>
      filteredContacts.map((c, index) => (
        <Card 
          key={c.id} 
          className="modern-card p-6 hover-lift bounce-in group" 
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {/* Üst satır: İsim + Yakınlık rozet */}
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

            <div className="flex items-center gap-2">
              <span 
                className="flex items-center gap-1 text-white font-medium rounded-full px-2 py-1 text-xs"
                style={{ 
                  backgroundColor: degreeColor(c.relationship_degree),
                  boxShadow: `0 0 10px ${degreeColor(c.relationship_degree)}40`
                }}
              >
                <Star className="h-3.5 w-3.5" />
                <span>{c.relationship_degree}/10</span>
              </span>
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                {(degreeMap[c.id] ?? 1)}. derece
              </span>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    aria-label="Kişiyi sil" 
                    onClick={() => setDeletingId(c.id)}
                    className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-dark">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="gradient-text">Kişiyi sil</AlertDialogTitle>
                    <AlertDialogDescription>
                      {c.first_name} {c.last_name} ağınızdan kalıcı olarak silinecek. Bu işlem geri alınamaz.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="hover-lift">Vazgeç</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDelete(c.id)} 
                      className="bg-destructive text-destructive-foreground hover:opacity-90 hover-lift"
                    >
                      Sil
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Konum + Mesafe Rozeti */}
          <div className="mb-4 p-3 glass rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">{c.city || "-"}</span>
            </div>
            {(() => {
              const label = classifyDistanceToIstanbul(c.city);
              const pretty: Record<string, string> = {
                "çok yakın": "Çok Yakın",
                "yakın": "Yakın",
                "orta": "Orta",
                "uzak": "Uzak",
                "çok uzak": "Çok Uzak",
              };
              return label ? (
                <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {pretty[label]}
                </span>
              ) : null;
            })()}
          </div>

          {/* Yapabilecekleri */}
          {c.services?.length ? (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Tag className="h-4 w-4 text-primary" />
                <span>Yapabilecekleri</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {c.services.map((service, i) => (
                  <span key={i} className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                    {service}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Özellikler */}
          {c.tags?.length ? (
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Özellikler</div>
              <div className="flex flex-wrap gap-1">
                {c.tags.map((t, i) => (
                  <span key={i} className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* İletişim */}
          <div className="mb-4 p-3 glass rounded-lg">
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span>{c.phone || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>{c.email || "-"}</span>
              </div>
            </div>
          </div>

          {/* Açıklama */}
          {c.description ? (
            <div className="p-3 glass rounded-lg">
              <div className="text-sm italic text-muted-foreground">
                "{c.description}"
              </div>
            </div>
          ) : null}
        </Card>
      )),
    [filteredContacts, degreeMap]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto"></div>
          <p className="text-muted-foreground">Kişiler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 fade-in">
        <div className="flex items-center justify-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold gradient-text">Ağ Listesi</h2>
        </div>
        <p className="text-muted-foreground">
          {filteredContacts.length} kişi bulundu
        </p>
      </div>

      {/* Search */}
      <div className="relative slide-in" style={{animationDelay: '0.1s'}}>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Kişi ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 hover-scale"
        />
      </div>

      {/* Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards}
      </div>

      {filteredContacts.length === 0 && !isLoading && (
        <div className="text-center space-y-4 py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">
            {searchTerm ? "Arama kriterlerine uygun kişi bulunamadı." : "Henüz kişi eklenmemiş."}
          </p>
        </div>
      )}
    </div>
  );
};
