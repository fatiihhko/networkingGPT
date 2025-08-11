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

    // Load invite
    const { data: invite, error: invErr } = await admin
      .from("invites")
      .select("id, uses_count, max_uses, owner_user_id, parent_contact_id, status, inviter_email")
      .eq("token", token)
      .maybeSingle();

    if (invErr) throw invErr;
    if (!invite) {
      return new Response(JSON.stringify({ error: "Geçersiz bağlantı" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate status and usage limits (do not increment here)
    const unlimited = (invite.max_uses ?? 0) === 0;
    const exhausted = invite.status !== 'active' ? true : (unlimited ? false : invite.uses_count >= invite.max_uses);
    if (exhausted) {
      return new Response(JSON.stringify({ error: "Kullanım sınırına ulaşıldı" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let parent_contact_id = invite.parent_contact_id as string | null;

    // If inviter is not already set on the invite, resolve and persist it
    if (!invite.inviter_email) {
      // Try to find existing contact by email for the invite owner
      const { data: existing, error: findErr } = await admin
        .from("contacts")
        .select("id, first_name, last_name")
        .eq("user_id", invite.owner_user_id)
        .eq("email", inviter.email)
        .limit(1);

      if (findErr) throw findErr;

      let inviterContactId: string | null = existing && existing.length > 0 ? existing[0].id : null;

      if (!inviterContactId) {
        // Create minimal contact
        const { data: inserted, error: insErr } = await admin
          .from("contacts")
          .insert({
            user_id: invite.owner_user_id,
            parent_contact_id: null,
            first_name: inviter.first_name,
            last_name: inviter.last_name,
            email: inviter.email,
            services: [],
            tags: [],
            relationship_degree: 0,
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        inviterContactId = inserted.id;
      }

      parent_contact_id = inviterContactId;

      // Update invite with inviter info and resolved parent_contact_id
      const { error: updErr } = await admin
        .from("invites")
        .update({
          parent_contact_id: parent_contact_id,
          inviter_first_name: inviter.first_name,
          inviter_last_name: inviter.last_name,
          inviter_email: inviter.email,
        })
        .eq("id", invite.id);

      if (updErr) throw updErr;
    }

    return new Response(
      JSON.stringify({ ok: true, parent_contact_id }),
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
