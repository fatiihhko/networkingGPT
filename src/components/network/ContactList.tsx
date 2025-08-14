import React, { useEffect, useMemo, useState, memo, useCallback } from "react";
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
import { ContactListSkeleton } from "@/components/ui/loading-skeleton";

const degreeColor = (degree: number) => {
  if (degree >= 8) return "hsl(var(--closeness-green))";
  if (degree >= 5) return "hsl(var(--closeness-yellow))";
  return "hsl(var(--closeness-red))";
};

// Memoized contact card for better performance
const ContactCard = memo(({ 
  contact, 
  index, 
  degreeLevel, 
  onDelete 
}: { 
  contact: Contact; 
  index: number; 
  degreeLevel: number;
  onDelete: (id: string) => void; 
}) => (
  <Card 
    className="modern-card p-6 hover-lift bounce-in group" 
    style={{ animationDelay: `${index * 0.1}s` }}
  >
    {/* Card content here - keeping exact same structure for space */}
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex-1">
        <div className="text-xl font-bold gradient-text group-hover:scale-105 transition-transform">
          {contact.first_name} {contact.last_name}
        </div>
        {contact.profession && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            <span>{contact.profession}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span 
          className="flex items-center gap-1 text-white font-medium rounded-full px-2 py-1 text-xs"
          style={{ 
            backgroundColor: degreeColor(contact.relationship_degree),
            boxShadow: `0 0 10px ${degreeColor(contact.relationship_degree)}40`
          }}
        >
          <Star className="h-3.5 w-3.5" />
          <span>{contact.relationship_degree}/10</span>
        </span>
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
          {degreeLevel}. derece
        </span>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              aria-label="Kişiyi sil" 
              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="glass-dark">
            <AlertDialogHeader>
              <AlertDialogTitle className="gradient-text">Kişiyi sil</AlertDialogTitle>
              <AlertDialogDescription>
                {contact.first_name} {contact.last_name} ağınızdan kalıcı olarak silinecek. Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="hover-lift">Vazgeç</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onDelete(contact.id)} 
                className="bg-destructive text-destructive-foreground hover:opacity-90 hover-lift"
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>

    {/* Location */}
    <div className="mb-4 p-3 glass rounded-lg">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="font-medium">{contact.city || "-"}</span>
      </div>
      {(() => {
        const label = classifyDistanceToIstanbul(contact.city);
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

    {/* Services */}
    {contact.services?.length ? (
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm font-medium mb-2">
          <Tag className="h-4 w-4 text-primary" />
          <span>Yapabilecekleri</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {contact.services.map((service, i) => (
            <span key={i} className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
              {service}
            </span>
          ))}
        </div>
      </div>
    ) : null}

    {/* Tags */}
    {contact.tags?.length ? (
      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Özellikler</div>
        <div className="flex flex-wrap gap-1">
          {contact.tags.map((t, i) => (
            <span key={i} className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
              {t}
            </span>
          ))}
        </div>
      </div>
    ) : null}

    {/* Contact info */}
    <div className="mb-4 p-3 glass rounded-lg">
      <div className="grid gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          <span>{contact.phone || "-"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <span>{contact.email || "-"}</span>
        </div>
      </div>
    </div>

    {/* Description */}
    {contact.description ? (
      <div className="p-3 glass rounded-lg">
        <div className="text-sm italic text-muted-foreground">
          "{contact.description}"
        </div>
      </div>
    ) : null}
  </Card>
));

const ContactList = memo(() => {
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { contacts, setContacts, isLoading } = useContacts();

  // Initialize filtered contacts when contacts change
  useEffect(() => {
    setFilteredContacts(contacts);
  }, [contacts]);

  // Debounced search for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
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
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, contacts]);

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      toast({ title: "Silinemedi", description: error.message, variant: "destructive" });
    } else {
      const updated = contacts.filter((c) => c.id !== id);
      setContacts(updated);
      toast({ title: "Kişi silindi", description: "Kişi ağınızdan kaldırıldı." });
    }
  }, [contacts, setContacts]);

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

  const renderedCards = useMemo(
    () =>
      filteredContacts.map((contact, index) => (
        <ContactCard
          key={contact.id}
          contact={contact}
          index={index}
          degreeLevel={degreeMap[contact.id] ?? 1}
          onDelete={handleDelete}
        />
      )),
    [filteredContacts, degreeMap, handleDelete]
  );

  if (isLoading) {
    return <ContactListSkeleton />;
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
        {renderedCards}
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
});

export { ContactList };
