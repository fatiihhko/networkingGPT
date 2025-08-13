import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Resend API ile e-posta gönderme fonksiyonu
async function sendEmailViaResend(to: string, subject: string, html: string) {
  try {
    if (!resend) {
      console.warn("Resend API key not configured");
      return { success: false, error: "Resend not configured" };
    }

    const result = await resend.emails.send({
      from: "Network GPT <noreply@networkinggpt.com>",
      to: [to],
      subject,
      html,
    });

    console.log("Resend email sent successfully:", result);
    return { success: true, result };
  } catch (error) {
    console.error("Resend email send failed:", error);
    return { success: false, error: error.message };
  }
}

// E-posta gönderme fonksiyonu (Resend API)
async function sendEmail(to: string, subject: string, html: string) {
  // Resend API ile e-posta gönder
  const result = await sendEmailViaResend(to, subject, html);
  
  if (result.success) {
    return result;
  }

  // Resend başarısız olursa simülasyon yap
  console.log("📧 Email Simulation (Resend API failed):");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("HTML:", html);
  console.log("Error:", result.error);
  console.log("---");
  
  return { 
    success: true, 
    simulated: true, 
    message: "Email simulated - Resend API failed" 
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, inviteLink, inviterName } = await req.json();

    if (!email || !inviteLink) {
      return new Response(JSON.stringify({ error: "Email ve davet linki gerekli" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const subject = "Network GPT Davetiyesi";
    const html = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Network GPT Davetiyesi</title>
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
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #8B5CF6, #7C3AED);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 25px 0;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
            transition: all 0.3s ease;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
          }
          .link-text {
            background: #F3F4F6;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            word-break: break-all;
            font-family: monospace;
            font-size: 14px;
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🤖 Network GPT</div>
            <h1 class="title">Özel Davetiyeniz</h1>
          </div>
          
          <div class="content">
            <p>Merhaba!</p>
            
            <p><span class="highlight">${inviterName || "Bir arkadaşınız"}</span> sizi Network GPT platformuna davet ediyor.</p>
            
            <div class="features">
              <p><strong>Bu platform ile:</strong></p>
              <ul>
                <li>📊 Profesyonel ağınızı genişletebilirsiniz</li>
                <li>👥 Bağlantılarınızı yönetebilirsiniz</li>
                <li>🤖 AI destekli analizler yapabilirsiniz</li>
                <li>📈 Ağınızın büyümesini takip edebilirsiniz</li>
                <li>🔗 Yeni fırsatlar keşfedebilirsiniz</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="${inviteLink}" class="cta-button">
                🚀 Davetiye Kabul Et
              </a>
            </div>
            
            <p>Veya aşağıdaki linki kullanabilirsiniz:</p>
            <div class="link-text">
              ${inviteLink}
            </div>
            
            <p><em>Bu davetiyenin süresi sınırlıdır. Hemen katılmak için yukarıdaki butona tıklayın!</em></p>
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
    console.error("send-invite-email error:", error);
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
