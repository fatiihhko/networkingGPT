import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  first_name: z.string().min(1, "Zorunlu"),
  last_name: z.string().min(1, "Zorunlu"),
  city: z.string().optional(),
  relationship_degree: z.number().min(0).max(10),
  services: z.string().optional(),
  tags: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Geçersiz e-posta").optional().or(z.literal("")),
  description: z.string().optional(),
});

export const ContactForm = ({
  parentContactId,
  onSuccess,
}: {
  parentContactId?: string;
  onSuccess?: (contact: any, values: z.infer<typeof schema>) => void;
}) => {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      relationship_degree: 5,
    },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      toast({ title: "Oturum bulunamadı", description: "Lütfen tekrar giriş yapın.", variant: "destructive" });
      return;
    }

    const servicesArr = values.services?.split(",").map(s => s.trim()).filter(Boolean) ?? [];
    const tagsArr = values.tags?.split(",").map(s => s.trim()).filter(Boolean) ?? [];

    const { data: inserted, error } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        first_name: values.first_name,
        last_name: values.last_name,
        city: values.city,
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
  };

  const rel = form.watch("relationship_degree");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Ad</Label>
        <Input {...form.register("first_name")} placeholder="Ad" />
      </div>
      <div className="space-y-2">
        <Label>Soyad</Label>
        <Input {...form.register("last_name")} placeholder="Soyad" />
      </div>
      <div className="space-y-2">
        <Label>Şehir / Lokasyon</Label>
        <Input {...form.register("city")} placeholder="İl / İlçe" />
      </div>
      <div className="space-y-2">
        <Label>Telefon</Label>
        <Input {...form.register("phone")} placeholder="05xx xxx xx xx" />
      </div>
      <div className="space-y-2">
        <Label>E-posta</Label>
        <Input type="email" {...form.register("email")} placeholder="eposta@ornek.com" />
      </div>
      <div className="space-y-2">
        <Label>Yakınlık (0-10): {rel}</Label>
        <Slider min={0} max={10} step={1} value={[rel || 5]} onValueChange={(v) => form.setValue("relationship_degree", v[0] ?? 5)} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Verebileceği Hizmetler (virgülle ayırın)</Label>
        <Input {...form.register("services")} placeholder="tasarım, yazılım, pazarlama" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Özellikler / Etiketler (virgülle ayırın)</Label>
        <Input {...form.register("tags")} placeholder="girişimci, yatırımcı, mentor" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Açıklama</Label>
        <Textarea {...form.register("description")} placeholder="Kısa açıklama" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit">Kaydet</Button>
      </div>
    </form>
  );
};
