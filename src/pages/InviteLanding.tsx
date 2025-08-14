import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ContactForm } from "@/components/network/ContactForm";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Mail, User, CheckCircle, Clock, AlertCircle, Sparkles, Crown, Users } from "lucide-react";

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
      `${baseUrl}/invite-link/${token || ""}`
    );
  }, [baseUrl, token]);

useEffect(() => {
const load = async () => {
      if (!token) {
        console.log("InviteLanding: No token provided");
        return;
      }
      
      console.log("InviteLanding: Starting lookup for token:", token);
      setLoading(true);
      
      try {
        const url = `https://ysqnnassgbihnrjkcekb.supabase.co/functions/v1/invite-lookup`;
        const body = JSON.stringify({ token });
        
        console.log("InviteLanding: Making request to:", url);
        console.log("InviteLanding: Request body:", body);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcW5uYXNzZ2JpaG5yamtjZWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjQzOTQsImV4cCI6MjA3MDQwMDM5NH0.quHEwhAvPUi8QinNJM4dTnN7MQXlmHKAt0BpYnNosoc`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcW5uYXNzZ2JpaG5yamtjZWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjQzOTQsImV4cCI6MjA3MDQwMDM5NH0.quHEwhAvPUi8QinNJM4dTnN7MQXlmHKAt0BpYnNosoc'
          },
          body: body
        });
        
        console.log("InviteLanding: Response status:", response.status);
        console.log("InviteLanding: Response ok:", response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log("InviteLanding: Error response text:", errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log("InviteLanding: Response data:", data);
        setLookup(data || null);
      } catch (error: any) {
        console.error("InviteLanding: Error in lookup:", error);
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
        const response = await fetch(`https://ysqnnassgbihnrjkcekb.supabase.co/functions/v1/invite-lookup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcW5uYXNzZ2JpaG5yamtjZWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjQzOTQsImV4cCI6MjA3MDQwMDM5NH0.quHEwhAvPUi8QinNJM4dTnN7MQXlmHKAt0BpYnNosoc`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcW5uYXNzZ2JpaG5yamtjZWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjQzOTQsImV4cCI6MjA3MDQwMDM5NH0.quHEwhAvPUi8QinNJM4dTnN7MQXlmHKAt0BpYnNosoc'
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
      const response = await fetch(`https://ysqnnassgbihnrjkcekb.supabase.co/functions/v1/invite-inviter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcW5uYXNzZ2JpaG5yamtjZWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjQzOTQsImV4cCI6MjA3MDQwMDM5NH0.quHEwhAvPUi8QinNJM4dTnN7MQXlmHKAt0BpYnNosoc`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcW5uYXNzZ2JpaG5yamtjZWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjQzOTQsImV4cCI6MjA3MDQwMDM5NH0.quHEwhAvPUi8QinNJM4dTnN7MQXlmHKAt0BpYnNosoc'
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
    <main className="min-h-screen px-4 pt-6 pb-24 md:p-8 gradient-bg">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl float" style={{animationDelay: '1s'}}></div>
      </div>

                    {/* Header */}
       <header className="mb-8 text-center space-y-4 relative z-10 fade-in">
         <div className="flex items-center justify-center mb-6">
           <img 
             src="/networking-gpt-logo.png" 
             alt="Networking GPT Logo" 
             className="h-20 w-auto object-contain"
           />
         </div>
         <p className="text-xl text-muted-foreground">Davete özel kişi ekleme platformu</p>
         <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
           <Sparkles className="h-4 w-4 text-primary" />
           <span>Mitolojik güçle ağınızı genişletin</span>
         </div>
       </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Status Card - only show when needed */}
        {(loading || (!lookup || !lookup.valid) || (lookup && exhausted)) && (
          <Card className="mythology-card greek-pattern p-8 text-center">
            <div className="space-y-6">
              {loading && (
                <div className="space-y-4">
                  <div className="mythology-icon">
                    <div className="loading-spinner mx-auto"></div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold" style={{color: "hsl(var(--mythology-gold))"}}>Davet Doğrulanıyor</h2>
                    <p className="text-muted-foreground mt-2">Hermes gibi hızla bağlantınızı kontrol ediyoruz...</p>
                  </div>
                </div>
              )}

              {!loading && (!lookup || !lookup.valid) && (
                <div className="space-y-4">
                  <div className="mythology-icon">
                    <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-destructive">Geçersiz Davet</h2>
                    <p className="text-muted-foreground mt-2">Bu bağlantı geçersiz veya süresi dolmuş.</p>
                    <div className="mt-6">
                      <Link to="/auth">
                        <Button className="btn-premium">
                          <User className="h-5 w-5 mr-2" />
                          Giriş Yap
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {!loading && lookup && exhausted && (
                <div className="space-y-4">
                  <div className="mythology-icon">
                    <Clock className="h-16 w-16 text-warning mx-auto" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-warning">Davet Kullanılmış</h2>
                    <p className="text-muted-foreground mt-2">Bu davet bağlantısının kullanım hakkı dolmuş.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Step 1: Inviter Information */}
        {!loading && lookup && !exhausted && !stepOneDone && (
           <Card className="mythology-card marble-texture p-8 bounce-in">
             <div className="space-y-6">
               <div className="text-center space-y-4">
                 <div className="mythology-icon">
                   <Users className="h-12 w-12" style={{color: "hsl(var(--hermes-blue))"}} />
                 </div>
                 <div>
                   <h2 className="text-3xl font-bold" style={{color: "hsl(var(--mythology-gold))"}}>Adım 1: Davet Gönderen Bilgileri</h2>
                   <p className="text-muted-foreground">Sizinle bağlantı kurmak isteyen kişinin bilgilerini girin</p>
                 </div>
               </div>

              <form onSubmit={handleInviterSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="first_name" className="block text-sm font-medium mb-2">
                      Ad
                    </Label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required
                      value={inviter.first_name}
                      onChange={(e) => {
                        console.log("First name changed:", e.target.value);
                        setInviter({ ...inviter, first_name: e.target.value });
                      }}
                      placeholder="Adınız"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ position: 'relative', zIndex: 101 }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="last_name" className="block text-sm font-medium mb-2">
                      Soyad
                    </Label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      required
                      value={inviter.last_name}
                      onChange={(e) => {
                        console.log("Last name changed:", e.target.value);
                        setInviter({ ...inviter, last_name: e.target.value });
                      }}
                      placeholder="Soyadınız"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ position: 'relative', zIndex: 101 }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="block text-sm font-medium mb-2">
                      E-posta Adresi
                    </Label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={inviter.email}
                      onChange={(e) => {
                        console.log("Email changed:", e.target.value);
                        setInviter({ ...inviter, email: e.target.value });
                      }}
                      placeholder="e-posta@ornek.com"
                      className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ position: 'relative', zIndex: 101 }}
                    />
                  </div>
                </div>

                <div className="text-center pt-4">
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="px-8 py-3 text-lg"
                    style={{ position: 'relative', zIndex: 101 }}
                  >
                    {submitting ? (
                      <>
                        <div className="loading-spinner mr-2"></div>
                        Doğrulanıyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Devam Et
                      </>
                    )}
                  </Button>
                                 </div>
               </form>
             </div>
           </Card>
         )}

        {/* Step 2: Contact Form */}
        {!loading && lookup && !exhausted && stepOneDone && (
          <Card className="mythology-card marble-texture p-8 bounce-in">
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="mythology-icon">
                  <UserPlus className="h-12 w-12" style={{color: "hsl(var(--hermes-blue))"}} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold" style={{color: "hsl(var(--mythology-gold))"}}>Adım 2: Ağınıza Katılın</h2>
                  <p className="text-muted-foreground">Hermes'in rehberliğinde yeni bağlantınızı oluşturun</p>
                </div>
              </div>

              <div className="max-w-3xl mx-auto">
                <ContactForm
                  parentContactId={resolvedParentId}
                  inviteToken={token}
                  onSuccess={() => {
                    toast({ 
                      title: "Başarılı!", 
                      description: "Ağa başarıyla katıldınız. Hoş geldiniz!" 
                    });
                  }}
                />
              </div>
            </div>
          </Card>
                 )}

         {/* Information Cards */}
         {!loading && lookup && !exhausted && (
           <div className="grid md:grid-cols-3 gap-6 mt-8">
             <Card className="interactive-card p-6 text-center">
               <div className="space-y-4">
                 <Crown className="h-10 w-10 mx-auto" style={{color: "hsl(var(--mythology-gold))"}} />
                 <div>
                   <h3 className="font-bold text-lg">Güvenli</h3>
                   <p className="text-sm text-muted-foreground">Verileriniz Zeus'un koruması altında</p>
                 </div>
               </div>
             </Card>

             <Card className="interactive-card p-6 text-center">
               <div className="space-y-4">
                 <Sparkles className="h-10 w-10 mx-auto text-primary" />
                 <div>
                   <h3 className="font-bold text-lg">Akıllı</h3>
                   <p className="text-sm text-muted-foreground">Athena'nın bilgeliği ile ağ analizi</p>
                 </div>
               </div>
             </Card>

             <Card className="interactive-card p-6 text-center">
               <div className="space-y-4">
                 <Users className="h-10 w-10 mx-auto text-primary" />
                 <div>
                   <h3 className="font-bold text-lg">Bağlantılı</h3>
                   <p className="text-sm text-muted-foreground">Apollo'nun müziği gibi uyumlu ağ</p>
                 </div>
               </div>
             </Card>
           </div>
         )}
       </div>
     </main>
   );
 };
 
 export default InviteLanding;
