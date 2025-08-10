import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY");

const admin = createClient(supabaseUrl!, serviceRoleKey!);
const resend = new Resend(resendApiKey);

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
      .select("id, uses, max_uses, owner_user_id, parent_contact_id")
      .eq("token", token)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!invite) {
      return new Response(JSON.stringify({ error: "Geçersiz davet" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (invite.uses >= invite.max_uses) {
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
        parent_contact_id: contact.parent_contact_id ?? invite.parent_contact_id ?? null,
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

    // Increment uses (non-atomic but sufficient for typical use)
    const { error: updErr } = await admin
      .from("invites")
      .update({ uses: (invite.uses ?? 0) + 1 })
      .eq("id", invite.id);
    if (updErr) console.error("Failed to increment invite uses", updErr);

    // Optional email
    if (sendEmail && contact.email) {
      try {
        const inviteLink = `${(base_url || '').replace(/\/$/, '')}/invite/${token}`;
        await resend.emails.send({
          from: "Lovable <onboarding@resend.dev>",
          to: [contact.email],
          subject: "Network GPT Bilgilendirme",
          html: `
            <h2>Network GPT'ye hoş geldiniz${contact.first_name ? ", " + contact.first_name : ""}!</h2>
            <p>Ağınıza eklendiğiniz için teşekkürler. Sorunuz olursa bu e-postaya yanıt verebilirsiniz.</p>
            <p>Başkalarını eklemek için bu davet bağlantısını kullanabilirsiniz:</p>
            <p><a href="${inviteLink}">${inviteLink}</a></p>
          `,
        });
      } catch (mailErr) {
        console.error("Email send failed", mailErr);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, contact: inserted }),
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
