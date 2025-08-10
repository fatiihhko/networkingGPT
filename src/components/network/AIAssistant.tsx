import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Building2, MapPin, Tag } from "lucide-react";
import { useContacts } from "./ContactsContext";
import type { Contact } from "./types";

export const AIAssistant = () => {
  const { contacts } = useContacts();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((c: Contact) => {
      const haystack = [
        c.first_name || "",
        c.last_name || "",
        c.city || "",
        ...(Array.isArray(c.services) ? c.services : []),
      ]
        .join("\n")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [q, contacts]);

  return (
    <section className="space-y-4">
      <div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ağınızda ara..."
          className="h-11 rounded-xl"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          Sonuç bulunamadı
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="relative p-5 md:p-6 transition-all hover:shadow-md hover:bg-accent/40 rounded-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg md:text-xl font-semibold">
                    {c.first_name} {c.last_name}
                  </div>
                  {c.profession && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{c.profession}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{c.city || "-"}</span>
              </div>

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
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};
