import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface Payload {
  name?: string;
  email: string;
  token?: string;
  base_url?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, token, base_url }: Payload = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "email gerekli" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const inviteLink = token ? `${(base_url || '').replace(/\/$/, '')}/invite/${token}` : null;

   const html = `
  <h2>Network GPT'ye hoş geldiniz${name ? ", " + name : ""}!</h2>
  <p><strong>${inviterName}</strong> sizi ağına ekledi.</p>
  ${inviteLink ? `
    <p>Kendi ağınızı oluşturmak için davet bağlantısını kullanabilirsiniz:</p>
    <p><a href="${inviteLink}">${inviteLink}</a></p>
  ` : ''}
`;

const result = await resend.emails.send({
  from: "Network GPT <no-reply@networkgpt.com>",
  to: [email],
  subject: "Network GPT Daveti",
  html,
});

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
