import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(supabaseUrl!, serviceRoleKey!);

interface SubmitRequest {
  token: string;
  contact: {
    first_name: string;
    last_name: string;
    city?: string;
    profession?: string;
    relationship_degree: number;
    services?: string[];
    tags?: string[];
    phone?: string;
    email?: string;
    description?: string;
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: SubmitRequest = await req.json();
    const { token, contact } = body;

    // Get the authenticated user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: userData, error: userError } = await admin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate required fields
    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 422,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!contact?.first_name || !contact?.last_name) {
      return new Response(JSON.stringify({ error: "First name and last name required" }), {
        status: 422,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!contact?.email) {
      return new Response(JSON.stringify({ error: "Email required for chain tracking" }), {
        status: 422,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Call the database function to add member
    const { data, error } = await admin.rpc("add_member_via_invite_link", {
      p_token: token,
      p_inviter_user_id: userData.user.id,
      p_member_email: contact.email,
      p_contact_data: contact,
    });

    if (error) {
      console.error("RPC error:", error);
      return new Response(JSON.stringify({ error: "Database operation failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result.success) {
      const status = result.error_message?.includes("limitine ulaştı") ? 409 : 422;
      return new Response(JSON.stringify({ error: result.error_message }), {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send info email to the newly added contact
    try {
      await admin.functions.invoke("invite-send-info-email", {
        body: {
          email: contact.email,
          name: `${contact.first_name} ${contact.last_name}`,
        },
      });
      console.log(`Info email sent to ${contact.email}`);
    } catch (emailError) {
      console.error("Failed to send info email:", emailError);
      // Continue despite email failure - don't fail the whole operation
    }

    return new Response(
      JSON.stringify({
        success: true,
        contact_id: result.contact_id,
        remaining_slots: result.remaining_slots,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (e: any) {
    console.error("invite-link-submit error:", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});