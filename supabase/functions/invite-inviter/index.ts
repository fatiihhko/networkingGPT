import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey);

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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: InviterBody = await req.json().catch(() => null as any);
    const { token, inviter } = body || {};

    if (!token || !inviter?.email) {
      return new Response(
        JSON.stringify({ error: "token ve davet gönderen bilgileri gerekli" }),
        { status: 422, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = inviter.email.trim().toLowerCase();
    console.log("Looking up invite with token:", token);

    // 1) Daveti bul
    const { data: invite, error: invErr } = await admin
      .from("invites")
      .select(`
        id,
        uses_count,
        max_uses,
        owner_user_id,
        parent_contact_id,
        status,
        inviter_email,
        inviter_contact_id,
        chain_id,
        invite_chains (
          max_uses,
          remaining_uses,
          status
        )
      `)
      .eq("token", token)
      .maybeSingle();

    if (invErr) throw invErr;
    if (!invite) {
      return new Response(JSON.stringify({ error: "Geçersiz bağlantı" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2) Zincir limit kontrolü
    const chain = Array.isArray(invite.invite_chains)
      ? invite.invite_chains[0]
      : invite.invite_chains;

    const unlimited = (chain?.max_uses ?? 0) === 0;
    const exhausted = invite.status !== "active" ||
                      chain?.status !== "active" ||
                      (!unlimited && (chain?.remaining_uses ?? 0) <= 0);

    if (exhausted) {
      return new Response(JSON.stringify({ error: "Bu davet bağlantısının kullanım hakkı dolmuş." }), {
        status: 422, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 3) inviter_contact_id yoksa bul
    let inviter_contact_id = invite.inviter_contact_id as string | null;
    if (!inviter_contact_id) {
      const { data: existing, error: findErr } = await admin
        .from("contacts")
        .select("id, first_name, last_name")
        .eq("owner_user_id", invite.owner_user_id) // burada owner_user_id kullandık
        .ilike("email", normalizedEmail)
        .limit(1);

      if (findErr) throw findErr;

      if (!existing || existing.length === 0) {
        return new Response(JSON.stringify({ error: "Bu e-posta adresi ağınızda kayıtlı değil. Lütfen önce bu kişiyi ağınıza ekleyin." }), {
          status: 422, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      inviter_contact_id = existing[0].id;

      const { error: updErr } = await admin
        .from("invites")
        .update({
          inviter_contact_id,
          inviter_first_name: inviter.first_name?.trim() || null,
          inviter_last_name: inviter.last_name?.trim() || null,
          inviter_email: normalizedEmail,
        })
        .eq("id", invite.id);

      if (updErr) throw updErr;
    } else {
      // E-posta vs. eksikse doldur
      if (!invite.inviter_email) {
        const { error: updErr } = await admin
          .from("invites")
          .update({
            inviter_first_name: inviter.first_name?.trim() || null,
            inviter_last_name: inviter.last_name?.trim() || null,
            inviter_email: normalizedEmail,
          })
          .eq("id", invite.id);
        if (updErr) throw updErr;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, inviter_contact_id, parent_contact_id: inviter_contact_id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error("invite-inviter error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
