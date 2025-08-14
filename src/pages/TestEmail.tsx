import React, { useState } from 'react';
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
      const testHtml = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Test E-postası</title>
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                }
                .container {
                    max-width: 500px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 12px;
                    padding: 30px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    color: #333;
                    margin-bottom: 20px;
                }
                .success {
                    color: #16a34a;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Test E-postası</h1>
                    <p class="success">NetworkGPT.tech e-posta sistemi başarıyla çalışıyor!</p>
                    <p>Bu e-posta eda@rooktech.ai adresinden Resend ile gönderildi.</p>
                    <hr>
                    <p><small>Test zamanı: ${new Date().toLocaleString('tr-TR')}</small></p>
                </div>
            </div>
        </body>
        </html>
      `;

      console.log('Sending test email to:', email);
      
      const response = await fetch(`https://ysqnnassgbihnrjkcekb.supabase.co/functions/v1/send-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: '🧪 NetworkGPT Test E-postası',
          html: testHtml
        })
      });

      console.log('Email response status:', response.status);
      const data = await response.json();
      console.log('Email response data:', data);

      if (response.ok && data.ok) {
        setLastResult({ success: true, message: 'E-posta başarıyla gönderildi!' });
        toast({ 
          title: "Başarılı!", 
          description: `Test e-postası ${email} adresine gönderildi.`,
          variant: "default"
        });
      } else {
        setLastResult({ success: false, message: data.error || 'E-posta gönderilemedi' });
        toast({ 
          title: "Hata", 
          description: data.error || 'E-posta gönderilemedi',
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Email test error:', error);
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
            <p>• Test e-postası eda@rooktech.ai adresinden Resend ile gönderilir</p>
            <p>• RESEND_API_KEY Supabase secrets'ta yapılandırılmalıdır</p>
            <p>• Resend.com'da domain doğrulaması gerekir</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TestEmail;