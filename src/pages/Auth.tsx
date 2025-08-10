import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

const ADMIN_EMAIL = "admin@rooktech.com";

interface LoginForm {
  email: string;
  password: string;
}

const Auth = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, setValue } = useForm<LoginForm>();

  useEffect(() => {
    // İsteğe bağlı: örnek kimlik bilgilerini doldur
    setValue("email", ADMIN_EMAIL);
    setValue("password", "rooktech");

    // Her giriş denemesinde formu göstermek için mevcut oturumu kapat
    supabase.auth.signOut().catch(() => {});
  }, [setValue]);

  const onSubmit = async (values: LoginForm) => {
    if (values.email !== ADMIN_EMAIL) {
      toast({ title: "Yetkisiz kullanıcı", description: "Sadece admin hesabı ile giriş yapılabilir.", variant: "destructive" });
      return;
    }

    // Önce giriş yapmayı dene
    const { error: signInErr, data: signInData } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (!signInErr) {
      if (signInData.session?.user?.email !== ADMIN_EMAIL) {
        toast({ title: "Yetkisiz kullanıcı", description: "Sadece admin hesabı ile giriş yapılabilir.", variant: "destructive" });
        return;
      }
      toast({ title: "Hoş geldiniz", description: "Başarıyla giriş yapıldı." });
      navigate("/network", { replace: true });
      return;
    }

    // Hesap yoksa otomatik oluşturmayı dene
    const redirectUrl = `${window.location.origin}/`;
    const { error: signUpErr } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: redirectUrl },
    });

    if (signUpErr) {
      toast({ title: "Giriş başarısız", description: signInErr.message || signUpErr.message, variant: "destructive" });
      return;
    }

    // Tekrar giriş denemesi
    const { error: secondErr, data: secondData } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (secondErr) {
      toast({ title: "Giriş başarısız", description: secondErr.message, variant: "destructive" });
      return;
    }
    if (secondData.session?.user?.email !== ADMIN_EMAIL) {
      toast({ title: "Yetkisiz kullanıcı", description: "Sadece admin hesabı ile giriş yapılabilir.", variant: "destructive" });
      return;
    }
    toast({ title: "Hoş geldiniz", description: "Başarıyla giriş yapıldı." });
    navigate("/network", { replace: true });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur border border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Yalnızca Yönetici Girişi</CardTitle>
          <CardDescription>Paneli görmek için e-posta ve şifrenizle giriş yapın.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" placeholder="admin@rooktech.com" {...register("email", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register("password", { required: true })} />
            </div>
            <Button type="submit" className="w-full">Giriş Yap</Button>
            <p className="text-xs text-muted-foreground">Not: Eğer bu hesap Supabase'de yoksa kullanıcıyı ekleyin.</p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default Auth;
