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
      
      // EmailJS template parameters - Standart değişken isimleri
      const templateParams = {
        // Yaygın kullanılan değişken isimleri
        to_email: email,
        user_email: email,
        email: email,
        recipient_email: email,
        
        to_name: 'Test Kullanıcısı',
        user_name: 'Test Kullanıcısı',
        name: 'Test Kullanıcısı',
        
        from_name: 'NetworkGPT',
        from_email: 'eda@rooktech.ai',
        reply_to: 'eda@rooktech.ai',
        
        subject: '🧪 NetworkGPT Test E-postası',
        message: `NetworkGPT.tech e-posta sistemi başarıyla çalışıyor!\n\nBu e-posta eda@rooktech.ai adresinden EmailJS ile gönderildi.\n\nTest zamanı: ${new Date().toLocaleString('tr-TR')}`,
        content: `NetworkGPT.tech e-posta sistemi başarıyla çalışıyor!\n\nBu e-posta eda@rooktech.ai adresinden EmailJS ile gönderildi.\n\nTest zamanı: ${new Date().toLocaleString('tr-TR')}`
      };

      // Initialize EmailJS - Artık doğru değerlerle
      const result = await emailjs.send(
        'service_cqmrqtj',    // Service ID
        'template_4cm4nqr',   // Template ID
        templateParams,
        '2HL35Reb4zyohI0T9'   // Public Key
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
      
      let errorMessage = 'Beklenmeyen hata';
      if (error.status === 400) {
        if (error.text?.includes('service ID not found')) {
          errorMessage = 'Service ID bulunamadı. EmailJS dashboard\'ınızı kontrol edin.';
        } else if (error.text?.includes('template')) {
          errorMessage = 'Template ID hatalı veya bulunamadı.';
        } else {
          errorMessage = `EmailJS API Hatası: ${error.text || error.message}`;
        }
      } else if (error.status === 403) {
        errorMessage = 'Public Key hatalı veya geçersiz.';
      } else {
        errorMessage = `HTTP ${error.status}: ${error.text || error.message}`;
      }
      
      setLastResult({ success: false, message: errorMessage });
      toast({ 
        title: "EmailJS Hatası", 
        description: errorMessage,
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

          <div className="text-xs text-muted-foreground space-y-2">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="font-medium text-yellow-800 mb-1">⚠️ Kurulum Gerekli:</p>
              <p className="text-yellow-700">1. emailjs.com'a gidip hesap oluşturun</p>
              <p className="text-yellow-700">2. Yeni bir Email Service ekleyin</p>
              <p className="text-yellow-700">3. Yeni bir Email Template oluşturun</p>
              <p className="text-yellow-700">4. Service ID ve Template ID'yi kodda güncelleyin</p>
            </div>
            <p>• Şu anda YOUR_SERVICE_ID ve YOUR_TEMPLATE_ID güncellenmeli</p>
            <p>• Public Key zaten ayarlandı: 2HL35Reb4zyohI0T9</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TestEmail;