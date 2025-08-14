import React, { useState } from 'react';
import emailjs from '@emailjs/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Send, CheckCircle, XCircle } from 'lucide-react';

const TestEmail = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const sendTestEmail = async () => {
    if (!email) {
      toast({ title: "Hata", description: "E-posta adresi gerekli", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Sending test email to:', email);
      
      // EmailJS template parameters
      const templateParams = {
        to_email: email,
        to_name: 'Test Kullanıcısı',
        from_name: 'NetworkGPT',
        from_email: 'eda@rooktech.ai',
        subject: '🧪 NetworkGPT Test E-postası',
        message: `NetworkGPT.tech e-posta sistemi başarıyla çalışıyor!\n\nBu e-posta eda@rooktech.ai adresinden EmailJS ile gönderildi.\n\nTest zamanı: ${new Date().toLocaleString('tr-TR')}`
      };

      // Initialize EmailJS (you'll need to set these up at emailjs.com)
      const result = await emailjs.send(
        'service_networkgpt', // Service ID (you'll create this)
        'template_test',      // Template ID (you'll create this)
        templateParams,
        'YOUR_PUBLIC_KEY'     // Public Key (you'll get this)
      );

      console.log('EmailJS result:', result);
      
      if (result.status === 200) {
        setLastResult({ success: true, message: 'E-posta başarıyla gönderildi!' });
        toast({ 
          title: "Başarılı!", 
          description: `Test e-postası ${email} adresine gönderildi.`,
          variant: "default"
        });
      } else {
        setLastResult({ success: false, message: 'E-posta gönderilemedi' });
        toast({ 
          title: "Hata", 
          description: 'E-posta gönderilemedi',
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('EmailJS test error:', error);
      setLastResult({ success: false, message: error.message || 'Beklenmeyen hata' });
      toast({ 
        title: "Hata", 
        description: error.message || 'Beklenmeyen hata oluştu',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-md mx-auto pt-20">
        <Card className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Send className="h-6 w-6 text-primary" />
              E-posta Test
            </h1>
            <p className="text-muted-foreground">
              NetworkGPT e-posta sistemini test edin
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Test E-posta Adresi</label>
              <Input
                type="email"
                placeholder="test@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button 
              onClick={sendTestEmail} 
              disabled={isLoading || !email}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Test E-postası Gönder
                </>
              )}
            </Button>

            {lastResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                lastResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {lastResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span className="text-sm">{lastResult.message}</span>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Test e-postası eda@rooktech.ai adresinden EmailJS ile gönderilir</p>
            <p>• EmailJS hesabı yapılandırması gerekir (emailjs.com)</p>
            <p>• Service ID ve Template ID ayarlanmalıdır</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TestEmail;