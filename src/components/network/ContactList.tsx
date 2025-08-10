import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Mail, Phone, MapPin, Tag } from "lucide-react";

export type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  city: string | null;
  relationship_degree: number;
  services: string[];
  tags: string[];
  phone: string | null;
  email: string | null;
  description: string | null;
};

function badgeColor(degree: number) {
  if (degree >= 8) return "bg-[hsl(var(--closeness-green))] text-white";
  if (degree >= 5) return "bg-[hsl(var(--closeness-yellow))] text-black";
  return "bg-[hsl(var(--closeness-red))] text-white";
}

export const ContactList = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
      if (!mounted) return;
      if (!error && data) setContacts(data as any);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const cards = useMemo(() => contacts.map((c) => (
    <Dialog key={c.id}>
      <DialogTrigger asChild>
        <Card className={`transition-transform hover:scale-[1.01] cursor-pointer ${badgeColor(c.relationship_degree)} bg-opacity-20` }>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="opacity-80" /> {c.first_name} {c.last_name}</CardTitle>
            <CardDescription className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {c.city || "-"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm opacity-80">Yakınlık: {c.relationship_degree}</div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{c.first_name} {c.last_name}</DialogTitle>
          <DialogDescription>{c.description || "Açıklama yok"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {c.city || "-"}</div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {c.phone || "-"}</div>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {c.email || "-"}</div>
          <div className="flex items-center gap-2"><Tag className="h-4 w-4" /> Etiketler: {c.tags?.length ? c.tags.join(", ") : "-"}</div>
          <div className="flex items-center gap-2"><Tag className="h-4 w-4" /> Hizmetler: {c.services?.length ? c.services.join(", ") : "-"}</div>
        </div>
      </DialogContent>
    </Dialog>
  )), [contacts]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards}
    </div>
  );
};
