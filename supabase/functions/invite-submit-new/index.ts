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

    console.log("Calling accept_invite_and_add_contact with:", {
      token,
      contact: { ...contact, services, tags }
    });
    
    // Use the transactional function to accept invite and add contact
    const { data: resultData, error: acceptError } = await admin.rpc(
      'accept_invite_and_add_contact',
      {
        p_token: token,
        p_contact: JSON.stringify({
          first_name: contact.first_name,
          last_name: contact.last_name,
          city: contact.city,
          profession: contact.profession,
          relationship_degree: contact.relationship_degree,
          services: services,
          tags: tags,
          phone: contact.phone,
          email: contact.email,
          description: contact.description,
        })
      }
    );
    
    console.log("RPC result:", { resultData, acceptError });

    if (acceptError) {
      // Handle specific Turkish error messages from the function
      return new Response(JSON.stringify({ error: acceptError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const result = resultData[0];
    const insertedContactId = result.contact_id;
    
    // Get invite and chain details for email generation
    const { data: inviteData } = await admin
      .from("invites")
      .select(`
        owner_user_id,
        inviter_first_name,
        inviter_last_name,
        chain_id,
        invite_chains!inner(
          remaining_uses:invite_chains.remaining_uses, 
          status:invite_chains.status,
          max_uses:invite_chains.max_uses
        )
      `)
      .eq("token", token)
      .single();

    // Optional email with follow-up invite
    if (sendEmail && contact.email && inviteData) {
      try {
        // Create a fresh invite (T2) tied to the NEW contact as inviter, same chain
        const chain = inviteData.invite_chains;
        
        // Only create follow-up if chain is still active and has remaining uses (or unlimited)
        if (chain.status === 'active' && (chain.remaining_uses > 0 || chain.max_uses === 0)) {
          const newToken = crypto.randomUUID();
          
          const { error: newInvErr } = await admin
            .from("invites")
            .insert({
              token: newToken,
              owner_user_id: inviteData.owner_user_id,
              inviter_contact_id: insertedContactId,
              chain_id: inviteData.chain_id, // Same chain
              max_uses: 0, // Individual invite doesn't track uses anymore
            });

          if (newInvErr) throw newInvErr;

          const inviterFullName = [
            inviteData.inviter_first_name,
            inviteData.inviter_last_name,
          ].filter(Boolean).join(" ") || "Bir davet eden";

          const base = (base_url || '').replace(/\/$/, '');
          const newInviteLink = base + `/invite/${newToken}`;

          await resend.emails.send({
            from: "Lovable <onboarding@resend.dev>",
            to: [contact.email],
            subject: "Network GPT Davetiyesi",
            html: `
              <p><strong>${inviterFullName}</strong> sizi Networking GPT ağına ekledi. Eğer siz de başkalarını eklemek isterseniz aşağıdaki davet bağlantısını kullanabilirsiniz.</p>
              <p><a href="${newInviteLink}">${newInviteLink}</a></p>
            `,
          });
        } else {
          console.log("Follow-up invite not created: chain exhausted or inactive");
        }
      } catch (mailErr) {
        console.error("Email send failed", mailErr);
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        contact: { id: insertedContactId },
        remaining_uses: result.remaining_uses,
        chain_status: result.chain_status
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error("invite-submit-new error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});