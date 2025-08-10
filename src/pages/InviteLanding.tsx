import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ContactForm } from "@/components/network/ContactForm";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InviteLookupResponse {
  valid: boolean;
  exhausted: boolean;
  remaining: number;
  parent_contact_id: string | null;
  message?: string;
}

const setSEO = (title: string, description: string, canonical?: string) => {
  document.title = title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", description);
  else {
    const m = document.createElement("meta");
    m.name = "description";
    m.content = description;
    document.head.appendChild(m);
  }
  if (canonical) {
    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;
  }
};

const InviteLanding = () => {
  const { token } = useParams();
const [lookup, setLookup] = useState<InviteLookupResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const baseUrl = useMemo(() => window.location.origin, []);

  useEffect(() => {
    setSEO(
      "Davet ile Kişi Ekle | Networking GPT",
      "Davet bağlantısıyla kişiyi ağınıza ekleyin.",
      `${baseUrl}/invite/${token || ""}`
    );
  }, [baseUrl, token]);

useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("invite-lookup", {
        body: { token },
      });
      if (error) {
        toast({ title: "Davet yüklenemedi", description: error.message, variant: "destructive" });
        setLookup(null);
      } else {
        setLookup((data as any) || null);
      }
      setLoading(false);
    };
    load();
  }, [token]);

// Invite mode handles email sending and usage on the server via Edge Function

  const exhausted = !!lookup?.exhausted;

  return (
    <main className="min-h-screen px-4 py-6 md:p-8">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-semibold">Davet ile Kişi Ekle</h1>
        <p className="text-muted-foreground">Bu sayfadan sadece kişi ekleme işlemi yapılabilir.</p>
      </header>
      <Card className="p-4 md:p-6">
{loading && <div>Yükleniyor…</div>}
        {!loading && (!lookup || !lookup.valid) && (
          <div>
            Geçersiz davet bağlantısı. Lütfen yöneticinizle iletişime geçin.
            {" "}
            <Link className="underline" to="/auth">Giriş yap</Link>
          </div>
        )}
        {!loading && lookup && exhausted && (
          <div>Bu davet bağlantısının kullanım hakkı dolmuştur.</div>
        )}
        {!loading && lookup && !exhausted && (
          <ContactForm
            parentContactId={lookup.parent_contact_id || undefined}
            inviteToken={token}
          />
        )}
      </Card>
    </main>
  );
};

export default InviteLanding;
