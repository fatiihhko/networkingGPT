import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
}

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
                         error.message?.includes('connection') ||
                         error.message?.includes('network');
      
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
  const smtpHost = Deno.env.get('SMTP_HOST');
  const smtpPort = Deno.env.get('SMTP_PORT');
  const smtpSecure = Deno.env.get('SMTP_SECURE');
  const smtpUser = Deno.env.get('SMTP_USER');
  const smtpPass = Deno.env.get('SMTP_PASS');
  const fromEmail = Deno.env.get('FROM_EMAIL') || 'eda@rooktech.ai';

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.error('SMTP configuration missing:', {
      host: !!smtpHost,
      port: !!smtpPort,
      user: !!smtpUser,
      pass: !!smtpPass
    });
    throw new Error('SMTP configuration not complete');
  }

  console.log(`Sending email via SMTP to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`From: ${fromEmail}`);
  console.log(`SMTP Host: ${smtpHost}:${smtpPort}`);

  const port = parseInt(smtpPort);
  const secure = smtpSecure === 'true';

  try {
    // SMTP Implementation using native TCP connection
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Connect to SMTP server
    const conn = await Deno.connect({
      hostname: smtpHost,
      port: port,
    });

    console.log(`Connected to SMTP server: ${smtpHost}:${port}`);

    const writer = conn.writable.getWriter();
    const reader = conn.readable.getReader();

    // Helper function to send SMTP command
    const sendCommand = async (command: string) => {
      console.log(`> ${command}`);
      await writer.write(encoder.encode(command + '\r\n'));
    };

    // Helper function to read SMTP response
    const readResponse = async () => {
      const { value } = await reader.read();
      const response = decoder.decode(value);
      console.log(`< ${response.trim()}`);
      return response;
    };

    // SMTP conversation
    await readResponse(); // Welcome message

    // HELO
    await sendCommand(`HELO ${smtpHost}`);
    await readResponse();

    // AUTH LOGIN
    await sendCommand('AUTH LOGIN');
    await readResponse();

    // Username (base64 encoded)
    const usernameB64 = btoa(smtpUser);
    await sendCommand(usernameB64);
    await readResponse();

    // Password (base64 encoded)
    const passwordB64 = btoa(smtpPass);
    await sendCommand(passwordB64);
    await readResponse();

    // MAIL FROM
    await sendCommand(`MAIL FROM:<${fromEmail}>`);
    await readResponse();

    // RCPT TO
    await sendCommand(`RCPT TO:<${to}>`);
    await readResponse();

    // DATA
    await sendCommand('DATA');
    await readResponse();

    // Email content
    const emailContent = [
      `From: NetworkGPT <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      '',
      html,
      '.',
      ''
    ].join('\r\n');

    await writer.write(encoder.encode(emailContent));
    await readResponse();

    // QUIT
    await sendCommand('QUIT');
    await readResponse();

    // Close connection
    await writer.close();
    await reader.cancel();
    conn.close();

    console.log(`Email sent successfully via SMTP to: ${to}`);
    return { success: true, id: `smtp_${Date.now()}`, method: 'smtp' };

  } catch (error: any) {
    console.error('SMTP error:', error.message);
    console.error('SMTP stack:', error.stack);
    
    // Return error instead of falling back
    throw new Error(`SMTP Error: ${error.message}`);
  }
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
    const { to, subject, html }: SendEmailRequest = await req.json();

    // Validation
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required fields: to, subject, html' }),
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

    // Idempotency check
    const requestKey = `${to}:${subject}`;
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
      return await sendEmail(to, subject, html);
    });

    console.log(`Email sent successfully to: ${to}`);

    return new Response(
      JSON.stringify({ ok: true, id: result.id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in send-invite function:', error);
    
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