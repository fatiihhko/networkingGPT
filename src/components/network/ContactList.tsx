import React, { useEffect, useState, memo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useContacts } from "./ContactsContext";
import type { Contact } from "./types";
import { Input } from "@/components/ui/input";
import { ContactListSkeleton } from "@/components/ui/loading-skeleton";
import { ContactCard } from "./ContactCard";

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

  // Simplified degree calculation - just use 1 for now to improve performance
  const getDegreeLevel = useCallback((contact: Contact): number => {
    if (!contact.parent_contact_id) return 1;
    // Simple calculation: if has parent, it's 2nd degree
    return 2;
  }, []);

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
        {filteredContacts.map((contact, index) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            index={index}
            degreeLevel={getDegreeLevel(contact)}
            onDelete={handleDelete}
          />
        ))}
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
