import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ContactForm } from "@/components/network/ContactForm";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InviteLookupResponse {
  valid: boolean;
  exhausted: boolean;
  remaining: number | null;
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
  const [inviter, setInviter] = useState({ first_name: "", last_name: "", email: "" });
  const [stepOneDone, setStepOneDone] = useState(false);
  const [resolvedParentId, setResolvedParentId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

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
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-lookup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ token })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setLookup(data || null);
      } catch (error: any) {
        toast({ title: "Davet yüklenemedi", description: error.message, variant: "destructive" });
        setLookup(null);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  // Gerçek zamanlı davranış: sayfa açıkken davetin geçersizleşmesi durumunda otomatik yenile
  useEffect(() => {
    if (!token) return;
    if (!lookup?.valid || lookup.exhausted) return;
    const id = setInterval(async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-lookup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ token })
        });
        if (response.ok) {
          const data = await response.json();
          setLookup(data);
        }
      } catch (error) {
        console.error('Interval lookup failed:', error);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [token, lookup?.valid, lookup?.exhausted]);

// Invite mode handles email sending and usage on the server via Edge Function

  const handleInviterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-inviter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ token, inviter })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }));
        toast({ title: "Hata", description: errorData.error || `HTTP ${response.status}`, variant: "destructive" });
        return;
      }
      
      const data = await response.json();
      const parentId = data?.parent_contact_id as string | undefined;
      if (parentId) {
        setResolvedParentId(parentId);
        setStepOneDone(true);
        toast({ title: "Onaylandı", description: "Daveti gönderen kaydedildi." });
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message || "Bilinmeyen hata", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

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
            Geçersiz bağlantı. Lütfen yöneticinizle iletişime geçin. {" "}
            <Link className="underline" to="/auth">Giriş yap</Link>
          </div>
        )}
        {!loading && lookup && exhausted && (
          <div>Bu davet bağlantısının kullanım hakkı dolmuş.</div>
        )}
        {!loading && lookup && !exhausted && !stepOneDone && (
          <section aria-labelledby="step1" className="space-y-4">
            <h2 id="step1" className="text-xl font-medium">Adım 1 — Daveti Gönderen</h2>
            <form onSubmit={handleInviterSubmit} className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="first_name">Ad</Label>
                <Input id="first_name" required value={inviter.first_name} onChange={(e) => setInviter({ ...inviter, first_name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="last_name">Soyad</Label>
                <Input id="last_name" required value={inviter.last_name} onChange={(e) => setInviter({ ...inviter, last_name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2 md:col-span-1">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" type="email" required value={inviter.email} onChange={(e) => setInviter({ ...inviter, email: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" disabled={submitting}>{submitting ? "Gönderiliyor..." : "Devam Et"}</Button>
              </div>
            </form>
          </section>
        )}
        {!loading && lookup && !exhausted && stepOneDone && (
          <section aria-labelledby="step2" className="space-y-2">
            <h2 id="step2" className="text-xl font-medium">Adım 2 — Kişi Ekle</h2>
            <ContactForm
              parentContactId={resolvedParentId}
              inviteToken={token}
            />
          </section>
        )}
      </Card>
    </main>
  );
};

export default InviteLanding;
