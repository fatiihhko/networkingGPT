import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SendGrid API ile e-posta gönderme fonksiyonu
async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch(`https://ysqnnassgbihnrjkcekb.supabase.co/functions/v1/send-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || 'Email sending failed');
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.error || 'Email sending failed');
  }

  return { success: true };
}

serve(async (req: Request) => {
  console.log("📧 Info email function called, method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("📧 Info email request body:", body);
    
    const { email, contactName, inviterName } = body;

    if (!email) {
      console.error("📧 Info email error: Email is required");
      return new Response(JSON.stringify({ error: "Email gerekli" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const subject = "Network GPT Ağına Eklendiğiniz Bildirimi";
    const html = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Network GPT Ağına Hoş Geldiniz</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #8B5CF6;
            margin-bottom: 10px;
          }
          .title {
            color: #1F2937;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .content {
            color: #4B5563;
            margin-bottom: 25px;
          }
          .features {
            background: #F3F4F6;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .features ul {
            margin: 0;
            padding-left: 20px;
          }
          .features li {
            margin-bottom: 8px;
            color: #374151;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            color: #6B7280;
            font-size: 14px;
          }
          .highlight {
            color: #8B5CF6;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🤖 Network GPT</div>
            <h1 class="title">Ağımıza Hoş Geldiniz!</h1>
          </div>
          
          <div class="content">
            <p>Merhaba <span class="highlight">${contactName || "Değerli kullanıcı"}</span>!</p>
            
            <p><span class="highlight">${inviterName || "Bir arkadaşınız"}</span> sizi Network GPT profesyonel ağına ekledi.</p>
            
            <div class="features">
              <p><strong>Artık platform üzerinden:</strong></p>
              <ul>
                <li>📊 Profesyonel bağlantılarınızı yönetebilirsiniz</li>
                <li>👥 Yeni kişiler ekleyebilirsiniz</li>
                <li>🌐 Ağınızı genişletebilirsiniz</li>
                <li>📝 İletişim bilgilerinizi güncelleyebilirsiniz</li>
                <li>🤖 AI destekli analizler yapabilirsiniz</li>
              </ul>
            </div>
            
            <p>Herhangi bir sorunuz olursa bu e-postaya yanıt verebilirsiniz.</p>
          </div>
          
          <div class="footer">
            <p>Bu e-posta Network GPT platformu tarafından gönderilmiştir.</p>
            <p>© 2024 Network GPT - AI Destekli Ağ Yönetimi</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail(email, subject, html);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'simulated' in result ? "Email simulated" : "Email sent successfully",
        details: result
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error) {
    console.error("invite-send-info-email error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Email gönderilemedi", 
        details: error.message 
      }), 
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});