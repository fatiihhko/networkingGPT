import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Bot, Shield, Sparkles, Eye, EyeOff, Lock, Mail } from "lucide-react";

const ADMIN_EMAIL = "admin@rooktech.com";

interface LoginForm {
  email: string;
  password: string;
}

const Auth = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, setValue } = useForm<LoginForm>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Her giriş denemesinde formu göstermek için mevcut oturumu kapat
    supabase.auth.signOut().catch(() => {});
  }, []);

  const onSubmit = async (values: LoginForm) => {
    setIsSubmitting(true);
    
    if (values.email !== ADMIN_EMAIL) {
      toast({ title: "Yetkisiz kullanıcı", description: "Sadece admin hesabı ile giriş yapılabilir.", variant: "destructive" });
      setIsSubmitting(false);
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
        setIsSubmitting(false);
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
      setIsSubmitting(false);
      return;
    }

    // Tekrar giriş denemesi
    const { error: secondErr, data: secondData } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (secondErr) {
      toast({ title: "Giriş başarısız", description: secondErr.message, variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (secondData.session?.user?.email !== ADMIN_EMAIL) {
      toast({ title: "Yetkisiz kullanıcı", description: "Sadece admin hesabı ile giriş yapılabilir.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    toast({ title: "Hoş geldiniz", description: "Başarıyla giriş yapıldı." });
    navigate("/network", { replace: true });
  };

  return (
    <main className="min-h-screen flex items-center justify-center gradient-bg relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl float" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <Card className="modern-card glass-dark border-0 shadow-2xl fade-in">
          <CardHeader className="text-center pb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-full gradient-primary">
                <Bot className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold gradient-text mb-2">
              Networking GPT
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              AI destekli akıllı ağ yönetimi platformu. Kişilerinizi organize edin, bağlantılarınızı güçlendirin.
            </CardDescription>
            
            <div className="mt-6 pt-6 border-t border-border/50">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Yönetici Girişi</h3>
              </div>
              <p className="text-sm text-muted-foreground">Paneli görmek için e-posta ve şifrenizle giriş yapın.</p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-posta
                </Label>
                <div className="relative">
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="admin@rooktech.com" 
                    {...register("email", { required: true })} 
                    className="pl-10 hover-scale"
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Şifre
                </Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    {...register("password", { required: true })} 
                    className="pl-10 pr-10 hover-scale"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full btn-modern hover-lift hover-glow h-12 text-lg font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
                    Giriş Yapılıyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Giriş Yap
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Not: Eğer bu hesap Supabase'de yoksa kullanıcıyı ekleyin.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Features preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 slide-in" style={{animationDelay: '0.3s'}}>
          <div className="text-center p-3 glass rounded-lg">
            <Bot className="h-6 w-6 text-primary mx-auto mb-2" />
            <div className="text-xs font-medium">AI Asistan</div>
          </div>
          <div className="text-center p-3 glass rounded-lg">
            <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
            <div className="text-xs font-medium">Akıllı Analiz</div>
          </div>
          <div className="text-center p-3 glass rounded-lg">
            <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
            <div className="text-xs font-medium">Güvenli</div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Auth;
