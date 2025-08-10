import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ContactForm } from "@/components/network/ContactForm";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InviteRow {
  id: string;
  token: string;
  parent_contact_id: string | null;
  max_uses: number;
  uses: number;
  created_at: string;
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
  const [invite, setInvite] = useState<InviteRow | null>(null);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Giriş gerekli", description: "Devam etmek için lütfen giriş yapın." });
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("invites")
        .select("*")
        .eq("token", token)
        .maybeSingle();
      if (error) {
        toast({ title: "Davet yüklenemedi", description: error.message, variant: "destructive" });
      }
      setInvite((data as any) || null);
      setLoading(false);
    };
    load();
  }, [token]);

  const handleAfterSave = async (_contact: any, values: any) => {
    if (!invite) return;
    // Increase invite usage count
    await supabase.from("invites").update({ uses: (invite?.uses ?? 0) + 1 }).eq("id", invite.id);

    // Ask for email sending
    const shouldSend = window.confirm("Arkadaşınıza da Network GPT maili atalım mı?");
    if (shouldSend && values?.email) {
      const { error } = await supabase.functions.invoke("send-invite-email", {
        body: {
          name: `${values.first_name} ${values.last_name}`.trim(),
          email: values.email,
        },
      });
      if (error) {
        toast({ title: "E-posta gönderilemedi", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "E-posta gönderildi", description: "Arkadaşınıza bilgilendirme e-postası yollandı." });
      }
    }
  };

  const exhausted = invite && invite.uses >= invite.max_uses;

  return (
    <main className="min-h-screen px-4 py-6 md:p-8">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-semibold">Davet ile Kişi Ekle</h1>
        <p className="text-muted-foreground">Bu sayfadan sadece kişi ekleme işlemi yapılabilir.</p>
      </header>
      <Card className="p-4 md:p-6">
        {loading && <div>Yükleniyor…</div>}
        {!loading && !invite && (
          <div>
            Geçersiz davet bağlantısı. Lütfen yöneticinizle iletişime geçin. {" "}
            <Link className="underline" to="/auth">Giriş yap</Link>
          </div>
        )}
        {!loading && invite && exhausted && (
          <div>Bu davet bağlantısının kullanım hakkı dolmuştur.</div>
        )}
        {!loading && invite && !exhausted && (
          <ContactForm parentContactId={invite.parent_contact_id || undefined} onSuccess={handleAfterSave} />
        )}
      </Card>
    </main>
  );
};

export default InviteLanding;
