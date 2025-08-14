import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendInviteRequest {
  to: string;
  inviteUrl: string;
  projectName?: string;
}

// Email template
const generateEmailHTML = (inviteUrl: string, projectName: string = 'Ağ GPT') => `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} Daveti</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 40px 30px;
            text-align: center;
        }
        .content h2 {
            margin: 0 0 20px;
            color: #333;
            font-size: 24px;
            font-weight: 600;
        }
        .content p {
            margin: 0 0 30px;
            line-height: 1.6;
            color: #666;
            font-size: 16px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .features {
            background: #f8fafc;
            padding: 30px;
            margin: 30px 0;
            border-radius: 8px;
        }
        .features h3 {
            margin: 0 0 20px;
            color: #333;
            font-size: 18px;
        }
        .feature-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .feature-list li {
            padding: 8px 0;
            color: #666;
            position: relative;
            padding-left: 20px;
        }
        .feature-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #667eea;
            font-weight: bold;
        }
        .footer {
            background: #f1f5f9;
            padding: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎟️ ${projectName} Daveti</h1>
            <p>Ağınıza katılmaya davetlisiniz</p>
        </div>
        
        <div class="content">
            <h2>Merhaba! 👋</h2>
            <p>
                ${projectName} platformuna katılmak için özel bir davet aldınız. 
                Bu platform, profesyonel ağınızı genişletmenize ve değerli bağlantılar kurmanıza yardımcı olur.
            </p>
            
            <a href="${inviteUrl}" class="cta-button">
                Daveti Kabul Et ve Katıl
            </a>
            
            <div class="features">
                <h3>Platform Özellikleri:</h3>
                <ul class="feature-list">
                    <li>Akıllı ağ analizi ve görselleştirme</li>
                    <li>Güvenli ve özel bağlantı yönetimi</li>
                    <li>Yapay zeka destekli öneriler</li>
                    <li>Profesyonel ağınızı genişletme araçları</li>
                </ul>
            </div>
            
            <p>
                Bu davet bağlantısı güvenlik amacıyla sınırlı süre geçerlidir. 
                Platformumuza katılmak için yukarıdaki butona tıklayın.
            </p>
        </div>
        
        <div class="footer">
            <p>
                Bu e-posta ${projectName} tarafından gönderilmiştir.<br>
                Eğer bu daveti beklemiyorsanız, bu e-postayı güvenle silebilirsiniz.
            </p>
        </div>
    </div>
</body>
</html>
`;

// Simple retry mechanism with exponential backoff
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries: number = 3): Promise<any> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Check if it's a retryable error (5xx or 429)
      const isRetryable = error.message?.includes('5') || 
                         error.message?.includes('429') ||
                         error.message?.includes('timeout') ||
                         error.message?.includes('connection');
      
      if (!isRetryable) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Simple idempotency check using a Map (in production, use Redis or similar)
const recentRequests = new Map<string, number>();
const IDEMPOTENCY_WINDOW = 60 * 1000; // 60 seconds

const cleanupOldRequests = () => {
  const now = Date.now();
  for (const [key, timestamp] of recentRequests) {
    if (now - timestamp > IDEMPOTENCY_WINDOW) {
      recentRequests.delete(key);
    }
  }
};

const sendEmail = async (to: string, subject: string, html: string) => {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = 'onboarding@resend.dev'; // Use verified domain

  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }

  console.log(`Sending email via Resend API to: ${to}`);

  const resend = new Resend(resendApiKey);

  const result = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: subject,
    html: html,
  });

  if (result.error) {
    console.error('Resend error:', result.error);
    throw new Error(`Email sending failed: ${result.error.message}`);
  }

  console.log(`Email sent successfully via Resend to: ${to}, ID: ${result.data?.id}`);
  return { success: true, id: result.data?.id || `resend_${Date.now()}` };
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const { to, inviteUrl, projectName }: SendInviteRequest = await req.json();

    // Validation
    if (!to || !inviteUrl) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required fields: to, inviteUrl' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // URL validation
    try {
      new URL(inviteUrl);
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid invite URL format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Idempotency check
    const requestKey = `${to}:${inviteUrl}`;
    const now = Date.now();
    cleanupOldRequests();

    if (recentRequests.has(requestKey)) {
      const lastRequest = recentRequests.get(requestKey)!;
      if (now - lastRequest < IDEMPOTENCY_WINDOW) {
        console.log(`Duplicate request detected for ${to}, ignoring`);
        return new Response(
          JSON.stringify({ ok: true, id: `duplicate_${lastRequest}`, duplicate: true }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    recentRequests.set(requestKey, now);

    // Send email with retry
    const result = await retryWithBackoff(async () => {
      return await sendEmail(
        to,
        `🎟️ ${projectName || 'Ağ GPT'} daveti`,
        generateEmailHTML(inviteUrl, projectName)
      );
    });

    console.log(`Invite email sent successfully to: ${to}`);

    return new Response(
      JSON.stringify({ ok: true, id: result.id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in send-invite-smtp function:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message || 'Internal server error',
        code: error.code || 'UNKNOWN_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});