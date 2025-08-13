import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

const admin = createClient(supabaseUrl!, serviceRoleKey!);
const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface SubmitBody {
  token: string;
  sendEmail?: boolean;
  base_url?: string;
  contact: {
    first_name: string;
    last_name: string;
    city?: string | null;
    profession?: string | null;
    relationship_degree: number;
    services?: string[] | string | null;
    tags?: string[] | string | null;
    phone?: string | null;
    email?: string | null;
    description?: string | null;
    parent_contact_id?: string | null;
  };
}

// Resend API ile e-posta gönderme fonksiyonu
async function sendEmailViaResend(to: string, subject: string, html: string) {
  try {
    if (!resend) {
      console.warn("Resend API key not configured");
      return { success: false, error: "Resend not configured" };
    }

    const result = await resend.emails.send({
      from: "Network GPT <onboarding@resend.dev>",
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SubmitBody = await req.json();
    const { token, contact, sendEmail, base_url } = body || {};

    if (!token || !contact) {
      return new Response(JSON.stringify({ error: "token ve contact gerekli" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Load invite
    const { data: invite, error: invErr } = await admin
      .from("invites")
      .select("id, uses_count, max_uses, owner_user_id, parent_contact_id, inviter_contact_id, status, inviter_first_name, inviter_last_name, inviter_email")
      .eq("token", token)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!invite) {
      return new Response(JSON.stringify({ error: "Geçersiz davet" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate status; max_uses semantics:
    // - 0 => sınırsız (her zaman geçerli)
    // - >0 => kullanılınca azaltılır, 0'a inince revoke edilir
    const unlimited = (invite.max_uses ?? 0) === 0;
    if (invite.status !== 'active') {
      return new Response(JSON.stringify({ error: "Davet kullanım hakkı dolmuş" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Normalize arrays
    const toArray = (v?: string[] | string | null) =>
      Array.isArray(v)
        ? v
        : (v || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

    const services = toArray(contact.services);
    const tags = toArray(contact.tags);

    // Insert contact for the invite owner
    const { data: inserted, error: insErr } = await admin
      .from("contacts")
      .insert({
        user_id: invite.owner_user_id,
        parent_contact_id: (invite as any).inviter_contact_id ?? null,
        first_name: contact.first_name,
        last_name: contact.last_name,
        city: contact.city ?? null,
        profession: contact.profession ?? null,
        relationship_degree: contact.relationship_degree ?? 0,
        services,
        tags,
        phone: contact.phone ?? null,
        email: contact.email ?? null,
        description: contact.description ?? null,
      })
      .select()
      .single();

    if (insErr) throw insErr;

    // Update invite usage
    const newUsesCount = (invite.uses_count ?? 0) + 1;
    const newMaxUses = invite.max_uses ?? 0;
    const shouldRevoke = newMaxUses > 0 && newUsesCount >= newMaxUses;

    const { error: updateErr } = await admin
      .from("invites")
      .update({
        uses_count: newUsesCount,
        status: shouldRevoke ? 'revoked' : 'active',
      })
      .eq("id", invite.id);

    if (updateErr) throw updateErr;

    // Send email if requested
    if (sendEmail && contact.email) {
      try {
        const inviterName = [invite.inviter_first_name, invite.inviter_last_name]
          .filter(Boolean)
          .join(" ") || "Bir arkadaşınız";

        const subject = "Network GPT Ağına Eklendiğiniz Bildirimi";
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Network GPT Ağına Hoş Geldiniz!</h2>
            <p>Merhaba ${contact.first_name}!</p>
            <p><strong>${inviterName}</strong> sizi Network GPT profesyonel ağına ekledi.</p>
            <p>Artık platform üzerinden:</p>
            <ul>
              <li>Profesyonel bağlantılarınızı yönetebilirsiniz</li>
              <li>Yeni kişiler ekleyebilirsiniz</li>
              <li>Ağınızı genişletebilirsiniz</li>
              <li>İletişim bilgilerinizi güncelleyebilirsiniz</li>
            </ul>
            <p>Herhangi bir sorunuz olursa bu e-postaya yanıt verebilirsiniz.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">
              Bu e-posta Network GPT platformu tarafından gönderilmiştir.
            </p>
          </div>
        `;

        await sendEmail(contact.email, subject, html);
      } catch (mailErr) {
        console.error("Email send failed:", (mailErr as Error)?.message || mailErr);
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        contact: inserted,
        invite_status: shouldRevoke ? 'revoked' : 'active',
        uses_count: newUsesCount
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error("invite-submit error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
