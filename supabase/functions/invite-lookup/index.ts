import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(supabaseUrl!, serviceRoleKey!);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ valid: false, message: "token gerekli" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: invite, error } = await admin
      .from("invites")
      .select("id, uses_count, max_uses, parent_contact_id, status")
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;

    if (!invite) {
      return new Response(JSON.stringify({ valid: false, message: "Davet bulunamadı" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const unlimited = (invite.max_uses ?? 0) === 0;
    const exhausted = invite.status !== 'active';
    const remaining = unlimited ? null : (invite.max_uses ?? 0);

    return new Response(
      JSON.stringify({
        valid: true,
        exhausted,
        remaining,
        parent_contact_id: invite.parent_contact_id,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error("invite-lookup error", e);
    return new Response(JSON.stringify({ valid: false, message: e?.message || "unknown" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
