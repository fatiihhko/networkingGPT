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
  inviter_contact_id?: string | null;
  max_uses?: number; // 0 = sınırsız
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CreateInviteBody = await req.json();
    const { max_uses } = body || ({} as any);

    // Identify the authenticated user creating the invite
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "Giriş gerekli" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Giriş doğrulanamadı" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = crypto.randomUUID();
    const m = Number.isFinite(max_uses as number) && (max_uses as number) >= 0 ? (max_uses as number) : 0;

    const { error: insErr } = await admin
      .from("invites")
      .insert({
        token,
        owner_user_id: userData.user.id,
        inviter_contact_id: null,
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
