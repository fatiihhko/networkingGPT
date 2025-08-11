import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(supabaseUrl!, serviceRoleKey!);

interface CreateInviteBody {
  inviter_contact_id: string;
  max_uses?: number; // 0 = sınırsız
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CreateInviteBody = await req.json();
    const { inviter_contact_id, max_uses } = body || ({} as any);

    if (!inviter_contact_id) {
      return new Response(
        JSON.stringify({ error: "Daveti gönderen kişi ağda bulunmuyor" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check inviter exists and get its owner_user_id
    const { data: inviter, error: invErr } = await admin
      .from("contacts")
      .select("id, user_id")
      .eq("id", inviter_contact_id)
      .maybeSingle();

    if (invErr) throw invErr;
    if (!inviter) {
      return new Response(
        JSON.stringify({ error: "Daveti gönderen kişi ağda bulunmuyor" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = crypto.randomUUID();
    const m = Number.isFinite(max_uses as number) && (max_uses as number) >= 0 ? (max_uses as number) : 0;

    const { error: insErr } = await admin
      .from("invites")
      .insert({
        token,
        owner_user_id: inviter.user_id,
        inviter_contact_id,
        max_uses: m,
      });

    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ ok: true, token, max_uses: m }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error("invite-create error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
