import React, { useState, memo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { UserPlus, MapPin, Briefcase, Phone, Mail, Heart, Tag, FileText, Send } from "lucide-react";
import { ContactFormSkeleton } from "@/components/ui/loading-skeleton";

const schema = z.object({
  first_name: z.string().min(1, "Zorunlu"),
  last_name: z.string().min(1, "Zorunlu"),
  city: z.string().optional(),
  profession: z.string().optional(),
  relationship_degree: z.number().min(0).max(10),
  services: z.string().optional(),
  tags: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Geçersiz e-posta").optional().or(z.literal("")),
  description: z.string().optional(),
});

const ContactForm = memo(({
  parentContactId,
  onSuccess,
  inviteToken,
}: {
  parentContactId?: string;
  onSuccess?: (contact: any, values: z.infer<typeof schema>, sendEmail?: boolean) => void;
  inviteToken?: string;
}) => {
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: {
    relationship_degree: 5,
  },
});
const [sendEmail, setSendEmail] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);

const onSubmit = async (values: z.infer<typeof schema>) => {
  setIsSubmitting(true);
  const servicesArr = values.services?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const tagsArr = values.tags?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

  // If inviteToken exists, submit via Edge Function (no auth required)
  if (inviteToken) {
    try {
      // First, submit the contact
      const response = await fetch(`https://ysqnnassgbihnrjkcekb.supabase.co/functions/v1/invite-submit-new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcW5uYXNzZ2JpaG5yamtjZWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjQzOTQsImV4cCI6MjA3MDQwMDM5NH0.quHEwhAvPUi8QinNJM4dTnN7MQXlmHKAt0BpYnNosoc`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcW5uYXNzZ2JpaG5yamtjZWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MjQzOTQsImV4cCI6MjA3MDQwMDM5NH0.quHEwhAvPUi8QinNJM4dTnN7MQXlmHKAt0BpYnNosoc'
        },
        body: JSON.stringify({
          token: inviteToken,
          sendEmail: false, // We'll handle email separately with SMTP
          base_url: window.location.origin,
          contact: {
            first_name: values.first_name,
            last_name: values.last_name,
            city: values.city,
            profession: values.profession,
            relationship_degree: values.relationship_degree,
            services: servicesArr,
            tags: tagsArr,
            phone: values.phone,
            email: values.email || null,
            description: values.description,
            parent_contact_id: parentContactId ?? null,
          },
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }));
        toast({ title: "Kaydedilemedi", description: errorData.error || `HTTP ${response.status}`, variant: "destructive" });
        return;
      }

      const data = await response.json();
      
      // If sendEmail is checked and contact has email, send invite via SMTP
      if (sendEmail && values.email) {
        try {
          const emailResponse = await fetch(`https://ysqnnassgbihnrjkcekb.supabase.co/functions/v1/send-invite-smtp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: values.email,
              inviteUrl: `${window.location.origin}/invite/${inviteToken}`,
              projectName: 'Ağ GPT'
            })
          });

          if (!emailResponse.ok) {
            const emailError = await emailResponse.json().catch(() => ({ error: 'E-posta gönderilemedi' }));
            console.warn('Email sending failed:', emailError);
            toast({ 
              title: "Kişi eklendi", 
              description: "Kişi eklendi ancak e-posta gönderilemedi.", 
              variant: "default" 
            });
          } else {
            const emailData = await emailResponse.json();
            if (emailData.ok) {
              toast({ 
                title: "Başarılı!", 
                description: "Kişi eklendi ve bilgi e-postası gönderildi." 
              });
            } else {
              toast({ 
                title: "Kişi eklendi", 
                description: "Kişi eklendi ancak e-posta gönderilemedi.", 
                variant: "default" 
              });
            }
          }
        } catch (emailError: any) {
          console.warn('Email sending error:', emailError);
          toast({ 
            title: "Kişi eklendi", 
            description: "Kişi eklendi ancak e-posta gönderilemedi.", 
            variant: "default" 
          });
        }
      } else {
        toast({ title: "Kişi eklendi", description: "Ağınıza yeni kişi eklendi." });
      }
      
      onSuccess?.(data?.contact ?? null, values, sendEmail);
    } catch (error: any) {
      toast({ title: "Kaydedilemedi", description: error.message || "Bilinmeyen hata", variant: "destructive" });
      return;
    } finally {
      setIsSubmitting(false);
    }
    form.reset({
      first_name: "",
      last_name: "",
      city: "",
      profession: "",
      relationship_degree: 5,
      services: "",
      tags: "",
      phone: "",
      email: "",
      description: "",
    });
    setSendEmail(false);
    return;
  }

  // Default (authenticated) flow
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    toast({ title: "Oturum bulunamadı", description: "Lütfen tekrar giriş yapın.", variant: "destructive" });
    setIsSubmitting(false);
    return;
  }

  const { data: inserted, error } = await supabase
    .from("contacts")
    .insert({
      user_id: user.id,
      first_name: values.first_name,
      last_name: values.last_name,
      city: values.city,
      profession: values.profession,
      relationship_degree: values.relationship_degree,
      services: servicesArr,
      tags: tagsArr,
      phone: values.phone,
      email: values.email || null,
      description: values.description,
      parent_contact_id: parentContactId ?? null,
    })
    .select()
    .single();

  if (error) {
    toast({ title: "Kaydedilemedi", description: error.message, variant: "destructive" });
  } else {
    toast({ title: "Kişi eklendi", description: "Ağınıza yeni kişi eklendi." });
    onSuccess?.(inserted, values);
    form.reset({ relationship_degree: 5 });
  }
  setIsSubmitting(false);
};

  const rel = form.watch("relationship_degree");
  const relationshipColor = rel >= 8 ? "hsl(var(--closeness-green))" : 
                           rel >= 5 ? "hsl(var(--closeness-yellow))" : 
                           "hsl(var(--closeness-red))";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 fade-in">
        <div className="flex items-center justify-center gap-2">
          <UserPlus className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold gradient-text">Yeni Kişi Ekle</h2>
        </div>
        <p className="text-muted-foreground">Ağınıza yeni bir bağlantı ekleyin</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information Card */}
        <Card className="modern-card p-6 space-y-4 slide-in">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Kişisel Bilgiler</h3>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Ad
              </Label>
              <Input 
                {...form.register("first_name")} 
                placeholder="Ad" 
                className="hover-scale"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Soyad
              </Label>
              <Input 
                {...form.register("last_name")} 
                placeholder="Soyad" 
                className="hover-scale"
              />
            </div>
          </div>
        </Card>

        {/* Contact Information Card */}
        <Card className="modern-card p-6 space-y-4 slide-in" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">İletişim Bilgileri</h3>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Şehir / Lokasyon
              </Label>
              <Input 
                {...form.register("city")} 
                placeholder="İl / İlçe" 
                className="hover-scale"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Meslek
              </Label>
              <Input 
                {...form.register("profession")} 
                placeholder="Örn: Avukat, Tasarımcı" 
                className="hover-scale"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefon
              </Label>
              <Input 
                {...form.register("phone")} 
                placeholder="05xx xxx xx xx" 
                className="hover-scale"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-posta
              </Label>
              <Input 
                type="email" 
                {...form.register("email")} 
                placeholder="eposta@ornek.com" 
                className="hover-scale"
              />
            </div>
          </div>
        </Card>

        {/* Relationship Card */}
        <Card className="modern-card p-6 space-y-4 slide-in" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Yakınlık Seviyesi</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Yakınlık (0-10): {rel}</Label>
              <span 
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
                style={{ 
                  backgroundColor: relationshipColor + '20', 
                  color: relationshipColor,
                  borderColor: relationshipColor
                }}
              >
                {rel >= 8 ? "Çok Yakın" : rel >= 5 ? "Orta" : "Uzak"}
              </span>
            </div>
            <Slider 
              min={0} 
              max={10} 
              step={1} 
              value={[rel || 5]} 
              onValueChange={(v) => form.setValue("relationship_degree", v[0] ?? 5)}
              className="hover-scale"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uzak</span>
              <span>Orta</span>
              <span>Çok Yakın</span>
            </div>
          </div>
        </Card>

        {/* Services & Tags Card */}
        <Card className="modern-card p-6 space-y-4 slide-in" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center gap-2 mb-4">
            <Tag className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Hizmetler ve Özellikler</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Verebileceği Hizmetler (virgülle ayırın)
              </Label>
              <Input 
                {...form.register("services")} 
                placeholder="tasarım, yazılım, pazarlama" 
                className="hover-scale"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Özellikler / Etiketler (virgülle ayırın)
              </Label>
              <Input 
                {...form.register("tags")} 
                placeholder="girişimci, yatırımcı, mentor" 
                className="hover-scale"
              />
            </div>
          </div>
        </Card>

        {/* Description Card */}
        <Card className="modern-card p-6 space-y-4 slide-in" style={{animationDelay: '0.4s'}}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Açıklama</h3>
          </div>
          
          <div className="space-y-2">
            <Label>Açıklama</Label>
            <Textarea 
              {...form.register("description")} 
              placeholder="Kısa açıklama" 
              className="hover-scale min-h-[100px]"
            />
          </div>
        </Card>

        {/* Email Option */}
        {inviteToken && (
          <Card className="modern-card p-6 slide-in" style={{animationDelay: '0.5s'}}>
            <div className="flex items-center gap-3">
              <Checkbox 
                id="sendEmail" 
                checked={sendEmail} 
                onCheckedChange={(v) => setSendEmail(!!v)} 
                className="hover-scale"
              />
              <Label htmlFor="sendEmail" className="flex items-center gap-2 cursor-pointer">
                <Send className="h-4 w-4 text-primary" />
                Bu kişiye e-posta gönderilsin mi?
              </Label>
            </div>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-center pt-4 slide-in" style={{animationDelay: '0.6s'}}>
          <Button 
            type="submit" 
            className="btn-modern hover-lift hover-glow px-8 py-3 text-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="loading-spinner mr-2"></div>
                Kaydediliyor...
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5 mr-2" />
                Kişiyi Kaydet
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
});

export { ContactForm };
