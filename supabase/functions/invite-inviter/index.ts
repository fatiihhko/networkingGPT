import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(supabaseUrl!, serviceRoleKey!);

interface InviterBody {
  token: string;
  inviter: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: InviterBody = await req.json();
    const { token, inviter } = body || ({} as any);

    if (!token || !inviter?.email) {
      return new Response(
        JSON.stringify({ error: "token ve davet gönderen bilgileri gerekli" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Looking up invite with token:", token);
    
    // Load invite with chain information
    const { data: invite, error: invErr } = await admin
      .from("invites")
      .select(`
        id, 
        uses_count, 
        invites.max_uses, 
        owner_user_id, 
        parent_contact_id, 
        invites.status, 
        inviter_email, 
        inviter_contact_id,
        chain_id,
        invite_chains!inner(max_uses:invite_chains.max_uses, remaining_uses:invite_chains.remaining_uses, status:invite_chains.status)
      `)
      .eq("token", token)
      .maybeSingle();

    console.log("Invite lookup result:", { invite, error: invErr });

    if (invErr) throw invErr;
    if (!invite) {
      return new Response(JSON.stringify({ error: "Geçersiz bağlantı" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate status and usage limits (do not increment here)
    const chain = invite.invite_chains;
    const unlimited = (chain.max_uses ?? 0) === 0;
    const exhausted = invite.status !== 'active' || chain.status !== 'active' ||
                     (!unlimited && (chain.remaining_uses ?? 0) <= 0);
    if (exhausted) {
      return new Response(JSON.stringify({ error: "Bu davet bağlantısının kullanım hakkı dolmuş." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Resolve inviter_contact_id (contact representing the sender)
    let inviter_contact_id = (invite as any).inviter_contact_id as string | null;

    if (!inviter_contact_id) {
      // Find existing contact by email for the invite owner (case-insensitive)
      const { data: existing, error: findErr } = await admin
        .from("contacts")
        .select("id, first_name, last_name")
        .eq("user_id", invite.owner_user_id)
        .ilike("email", inviter.email)
        .limit(1);

      if (findErr) throw findErr;

      let inviterContactId: string | null = existing && existing.length > 0 ? existing[0].id : null;

      if (!inviterContactId) {
        // Inviter email not found in network - block progression
        return new Response(JSON.stringify({ error: "Bu e-posta adresi ağınızda kayıtlı değil. Lütfen önce bu kişiyi ağınıza ekleyin." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      inviter_contact_id = inviterContactId;

      // Update invite with inviter info and inviter_contact_id
      const { error: updErr } = await admin
        .from("invites")
        .update({
          inviter_contact_id,
          inviter_first_name: inviter.first_name,
          inviter_last_name: inviter.last_name,
          inviter_email: inviter.email,
        })
        .eq("id", invite.id);

      if (updErr) throw updErr;
    } else {
      // Ensure inviter's display fields are set at least once
      if (!invite.inviter_email) {
        const { error: updErr } = await admin
          .from("invites")
          .update({
            inviter_first_name: inviter.first_name,
            inviter_last_name: inviter.last_name,
            inviter_email: inviter.email,
          })
          .eq("id", invite.id);
        if (updErr) throw updErr;
      }
    }

    // For compatibility, also return parent_contact_id equal to inviter_contact_id
    return new Response(
      JSON.stringify({ ok: true, inviter_contact_id, parent_contact_id: inviter_contact_id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error("invite-inviter error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
