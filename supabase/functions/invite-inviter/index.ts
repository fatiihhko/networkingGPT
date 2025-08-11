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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Log raw request info for debugging
    console.log("Request method:", req.method);
    console.log("Content-Type:", req.headers.get("content-type"));
    
    // Validate Content-Type (case-insensitive)
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.toLowerCase().includes("application/json")) {
      console.log("Invalid Content-Type:", contentType);
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        { 
          status: 415, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Parse JSON body with proper error handling
    let rawBody;
    let body: InviterBody;
    
    try {
      rawBody = await req.text();
      console.log("Raw request body:", rawBody);
      body = JSON.parse(rawBody);
      console.log("Parsed body:", body);
    } catch (parseError) {
      console.log("JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ error: "Geçersiz JSON formatı" }),
        { 
          status: 422, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    const { token, inviter } = body || {};

    // Validate required fields
    if (!token || !inviter?.email) {
      console.log("Missing required fields - token:", !!token, "inviter.email:", !!inviter?.email);
      return new Response(
        JSON.stringify({ error: "token ve davet gönderen bilgileri gerekli" }),
        { 
          status: 422, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Normalize email
    const normalizedEmail = inviter.email.trim().toLowerCase();
    console.log("Looking up invite with token:", token);
    console.log("Normalized inviter email:", normalizedEmail);

    // 1) Find the invite
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

    if (invErr) {
      console.error("Error fetching invite:", invErr);
      throw invErr;
    }
    
    if (!invite) {
      console.log("Invite not found for token:", token);
      return new Response(
        JSON.stringify({ error: "Geçersiz bağlantı" }), 
        {
          status: 404, 
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    console.log("Found invite:", invite.id, "owner_user_id:", invite.owner_user_id);

    // 2) Check chain limits
    const chain = Array.isArray(invite.invite_chains)
      ? invite.invite_chains[0]
      : invite.invite_chains;

    const unlimited = (chain?.max_uses ?? 0) === 0;
    const exhausted = invite.status !== "active" ||
                      chain?.status !== "active" ||
                      (!unlimited && (chain?.remaining_uses ?? 0) <= 0);

    if (exhausted) {
      console.log("Invite exhausted - invite status:", invite.status, "chain status:", chain?.status, "remaining:", chain?.remaining_uses);
      return new Response(
        JSON.stringify({ error: "Bu davet bağlantısının kullanım hakkı dolmuş." }),
        { 
          status: 422, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // 3) Find or validate inviter_contact_id
    let inviter_contact_id = invite.inviter_contact_id as string | null;
    
    if (!inviter_contact_id) {
      console.log("Searching for inviter contact with email:", normalizedEmail, "and owner_user_id:", invite.owner_user_id);
      
      const { data: existing, error: findErr } = await admin
        .from("contacts")
        .select("id, first_name, last_name, email")
        .eq("user_id", invite.owner_user_id)
        .ilike("email", normalizedEmail)
        .limit(1);

      if (findErr) {
        console.error("Error searching for contact:", findErr);
        throw findErr;
      }

      console.log("Contact search result:", existing);

      if (!existing || existing.length === 0) {
        console.log("No contact found with email:", normalizedEmail);
        return new Response(
          JSON.stringify({ error: "Bu e-posta adresi ağınızda kayıtlı değil. Lütfen önce bu kişiyi ağınıza ekleyin." }),
          { 
            status: 422, 
            headers: { "Content-Type": "application/json", ...corsHeaders } 
          }
        );
      }

      inviter_contact_id = existing[0].id;
      console.log("Found contact:", inviter_contact_id);

      // Update invite with inviter contact info
      const { error: updErr } = await admin
        .from("invites")
        .update({
          inviter_contact_id,
          inviter_first_name: inviter.first_name?.trim() || null,
          inviter_last_name: inviter.last_name?.trim() || null,
          inviter_email: normalizedEmail,
        })
        .eq("id", invite.id);

      if (updErr) {
        console.error("Error updating invite:", updErr);
        throw updErr;
      }
      
      console.log("Updated invite with inviter_contact_id:", inviter_contact_id);
    } else {
      console.log("Invite already has inviter_contact_id:", inviter_contact_id);
      
      // Update name/email if missing
      if (!invite.inviter_email) {
        const { error: updErr } = await admin
          .from("invites")
          .update({
            inviter_first_name: inviter.first_name?.trim() || null,
            inviter_last_name: inviter.last_name?.trim() || null,
            inviter_email: normalizedEmail,
          })
          .eq("id", invite.id);
          
        if (updErr) {
          console.error("Error updating invite details:", updErr);
          throw updErr;
        }
        
        console.log("Updated invite details");
      }
    }

    const response = { 
      ok: true, 
      inviter_contact_id, 
      parent_contact_id: inviter_contact_id 
    };
    
    console.log("Returning success response:", response);
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
    
  } catch (e: any) {
    console.error("invite-inviter error:", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Sunucu hatası" }),
      {
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});
