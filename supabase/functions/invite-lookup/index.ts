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
  console.log("invite-lookup: Request received", { method: req.method, url: req.url });
  
  if (req.method === "OPTIONS") {
    console.log("invite-lookup: Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("invite-lookup: Request body:", body);
    
    const { token } = body;
    if (!token || typeof token !== "string") {
      console.log("invite-lookup: Invalid token:", token);
      return new Response(JSON.stringify({ valid: false, message: "token gerekli" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("invite-lookup: Looking up token:", token);

    // Load invite with chain information
    const { data: inviteData, error } = await admin
      .from("invites")
      .select(`
        id, 
        uses_count, 
        max_uses, 
        parent_contact_id, 
        status,
        owner_user_id,
        chain_id,
        invite_chains!inner(max_uses, remaining_uses, status)
      `)
      .eq("token", token)
      .maybeSingle();

    console.log("invite-lookup: Database query result:", { inviteData, error });

    if (error) {
      console.error("invite-lookup: Database error:", error);
      throw error;
    }

    if (!inviteData) {
      console.log("invite-lookup: Invite not found for token:", token);
      return new Response(JSON.stringify({ valid: false, message: "Davet bulunamadı" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("invite-lookup: Invite found:", inviteData);

    const chain = inviteData.invite_chains;
    const unlimited = (chain.max_uses ?? 0) === 0;
    const exhausted = inviteData.status !== 'active' || chain.status !== 'active' || 
                     (!unlimited && (chain.remaining_uses ?? 0) <= 0);
    const remaining = unlimited ? null : chain.remaining_uses;

    console.log("invite-lookup: Calculated values:", { unlimited, exhausted, remaining });

    const response = {
      valid: true,
      exhausted,
      remaining,
      parent_contact_id: inviteData.parent_contact_id,
    };

    console.log("invite-lookup: Returning response:", response);

    return new Response(
      JSON.stringify(response),
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
