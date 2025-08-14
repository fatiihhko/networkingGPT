import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('FROM_EMAIL') || 'eda@rooktech.ai';

  if (!resendApiKey) {
    throw new Error('Resend API key not configured');
  }

  console.log(`Sending email via Resend to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`From: ${fromEmail}`);

  const resend = new Resend(resendApiKey);

  try {
    const emailResponse = await resend.emails.send({
      from: `NetworkGPT <${fromEmail}>`,
      to: [to],
      subject: subject,
      html: html,
    });

    console.log('Resend response:', emailResponse);

    if (emailResponse.error) {
      console.error('Resend error:', emailResponse.error);
      throw new Error(`Resend API error: ${emailResponse.error.message}`);
    }

    console.log(`Email sent successfully via Resend to: ${to}`);
    return { success: true, id: emailResponse.data?.id || `resend_${Date.now()}` };

  } catch (error: any) {
    console.error('Resend error:', error.message);
    throw new Error(`Resend Error: ${error.message}`);
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