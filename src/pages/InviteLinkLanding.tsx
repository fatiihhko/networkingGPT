import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, AlertCircle } from "lucide-react";
import { ContactForm } from "@/components/network/ContactForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface InviteLinkInfo {
  id: string;
  name: string;
  limit_count: number;
  used_count: number;
  status: string;
}

export const InviteLinkLanding = () => {
  const { token } = useParams<{ token: string }>();
  const [linkInfo, setLinkInfo] = useState<InviteLinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchLinkInfo = async () => {
    if (!token) {
      setError("Geçersiz davet bağlantısı");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("invite_links")
        .select("*")
        .eq("token", token)
        .eq("status", "active")
        .single();

      if (error || !data) {
        setError("Davet bağlantısı bulunamadı veya devre dışı");
        setLoading(false);
        return;
      }

      setLinkInfo(data);
    } catch (err) {
      setError("Davet bağlantısı yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (contactData: any, sendEmail: boolean = false) => {
    if (!token || !linkInfo) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-link-submit", {
        body: {
          token,
          contact: contactData,
          sendEmail,
        },
      });

      if (error) {
        if (error.message?.includes("limitine ulaştı")) {
          toast({
            title: "Limit Doldu",
            description: "Bu davet bağlantısı kullanım limitine ulaştı",
            variant: "destructive",
          });
        } else if (error.message?.includes("zaten bu davet bağlantısı ile eklenmiş")) {
          toast({
            title: "Daha Önce Eklenmiş",
            description: "Bu e-posta adresi zaten bu davet bağlantısı ile eklenmiş",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Hata",
            description: error.message || "Kişi eklenirken hata oluştu",
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Başarılı!",
        description: `Kişi başarıyla eklendi. ${data.remaining_slots} slot kaldı.`,
      });

      // Refresh link info to show updated count
      fetchLinkInfo();
    } catch (err: any) {
      toast({
        title: "Hata",
        description: err.message || "Beklenmeyen bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchLinkInfo();
  }, [token]);

  useEffect(() => {
    // Set page title and meta description
    document.title = `Davet Bağlantısı - Networking GPT`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Networking GPT ağına katılın ve tanıdıklarınızı organize edin.");
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p>Davet bağlantısı kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  if (error || !linkInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Davet Bağlantısı Geçersiz</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              {error || "Bu davet bağlantısı artık geçerli değil."}
            </p>
            <Button asChild>
              <Link to="/">Ana Sayfaya Dön</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remainingSlots = linkInfo.limit_count - linkInfo.used_count;
  const isLimitReached = remainingSlots <= 0;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center space-y-4">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/networking-gpt-logo.png" 
              alt="Networking GPT Logo" 
              className="h-16 w-auto object-contain"
            />
          </div>
          <p className="text-muted-foreground">
            Ağına kişi eklemek için davet bağlantısı
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{linkInfo.name}</span>
              <div className="text-sm font-normal bg-primary/10 text-primary px-2 py-1 rounded">
                {linkInfo.used_count}/{linkInfo.limit_count} kullanıldı
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLimitReached ? (
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Limit Doldu</h3>
                  <p className="text-muted-foreground">
                    Bu davet bağlantısı kullanım limitine ulaştı.
                  </p>
                </div>
                <Button asChild>
                  <Link to="/">Ana Sayfaya Dön</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Yeni Kişi Ekle</h3>
                  <p className="text-muted-foreground">
                    Ağa eklemek istediğiniz kişinin bilgilerini girin.
                    <br />
                    <span className="text-sm">Kalan slot: {remainingSlots}</span>
                  </p>
                </div>
                <ContactForm 
                  inviteToken={token}
                  onSuccess={(contact, values, sendEmail) => handleContactSubmit(values, sendEmail)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InviteLinkLanding;