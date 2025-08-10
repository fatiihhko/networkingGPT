import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

interface LoginForm {
  email: string;
  password: string;
}

const Auth = () => {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm<LoginForm>();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) navigate("/network", { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/network", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (values: LoginForm) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      toast({ title: "Giriş başarısız", description: error.message, variant: "destructive" });
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
              <Input id="email" type="email" placeholder="admin@alan.com" {...register("email", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register("password", { required: true })} />
            </div>
            <Button type="submit" className="w-full">Giriş Yap</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default Auth;
