import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Building2, MapPin, Phone, Mail, Star, Trash2, Tag } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useContacts } from "./ContactsContext";
import type { Contact } from "./types";
import { classifyDistanceToIstanbul } from "@/utils/distance";

function degreeColor(degree: number) {
  if (degree >= 8) return "bg-[hsl(var(--closeness-green))] text-white";
  if (degree >= 5) return "bg-[hsl(var(--closeness-yellow))] text-foreground";
  return "bg-[hsl(var(--closeness-red))] text-white";
}

export const ContactList = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { setContacts: setCtxContacts } = useContacts();
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (!error && data) {
        setContacts(data as any);
        try { setCtxContacts(data as any); } catch {}
      }
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      toast({ title: "Silinemedi", description: error.message, variant: "destructive" });
    } else {
      const updated = contacts.filter((c) => c.id !== id);
      setContacts(updated);
      try { setCtxContacts(updated); } catch {}
      toast({ title: "Kişi silindi", description: "Kişi ağınızdan kaldırıldı." });
    }
    setDeletingId(null);
  };

  const cards = useMemo(
    () =>
      contacts.map((c) => (
        <Card key={c.id} className="relative p-5 md:p-6">
          {/* Üst satır: İsim + Yakınlık rozet */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg md:text-xl font-semibold">{c.first_name} {c.last_name}</div>
              {c.profession && (
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{c.profession}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge className={`flex items-center gap-1 ${degreeColor(c.relationship_degree)}`}>
                <Star className="h-3.5 w-3.5" />
                <span>{c.relationship_degree}/10</span>
              </Badge>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Kişiyi sil" onClick={() => setDeletingId(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Kişiyi sil</AlertDialogTitle>
                    <AlertDialogDescription>
                      {c.first_name} {c.last_name} ağınızdan kalıcı olarak silinecek. Bu işlem geri alınamaz.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:opacity-90">
                      Sil
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Konum + Mesafe Rozeti */}
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{c.city || "-"}</span>
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
              <div className="mt-2">
                <Badge variant="secondary" className="rounded-full">
                  {pretty[label]}
                </Badge>
              </div>
            ) : null;
          })()}

          {/* Yapabilecekleri */}
          {c.services?.length ? (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Tag className="h-4 w-4" />
                <span>Yapabilecekleri</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {c.services.join(", ")}
              </div>
            </div>
          ) : null}

          {/* Özellikler */}
          {c.tags?.length ? (
            <div className="mt-4">
              <div className="text-sm font-medium">Özellikler</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {c.tags.map((t, i) => (
                  <Badge key={i} variant="secondary" className="rounded-full">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {/* İletişim */}
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{c.phone || "-"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{c.email || "-"}</span>
            </div>
          </div>

          {/* Açıklama */}
          {c.description ? (
            <div className="mt-4 text-sm italic text-muted-foreground">
              {c.description}
            </div>
          ) : null}
        </Card>
      )),
    [contacts]
  );

  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards}</div>;
};
