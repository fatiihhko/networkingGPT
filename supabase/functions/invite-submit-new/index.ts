import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

const admin = createClient(supabaseUrl!, serviceRoleKey!);
const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // More flexible Content-Type checking
    const ct = req.headers.get("content-type") || "";
    if (!ct.toLowerCase().includes("application/json")) {
      return new Response(JSON.stringify({ error: "İstek JSON olmalı (application/json)" }), {
        status: 415,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body: SubmitBody = await req.json().catch(() => null as any);
    if (!body) {
      return new Response(JSON.stringify({ error: "Geçersiz JSON gövdesi" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { token, contact, sendEmail, base_url } = body;

    // Zorunlu alanlar
    if (!token) {
      return new Response(JSON.stringify({ error: "token gerekli" }), {
        status: 422,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!contact?.first_name || !contact?.last_name) {
      return new Response(JSON.stringify({ error: "ad/soyad gerekli" }), {
        status: 422,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (typeof contact.relationship_degree !== "number") {
      return new Response(JSON.stringify({ error: "relationship_degree sayısal olmalı" }), {
        status: 422,
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

    // RPC çağrısı — parametre isimleri Postgres fonksiyon imzasıyla bire bir eşleşmeli
    // Burada p_token + p_contact beklediğini varsayıyoruz.
    console.log("Calling accept_invite_and_add_contact with:", {
      p_token: token,
      p_contact: {
        first_name: contact.first_name,
        last_name: contact.last_name,
        city: contact.city ?? null,
        profession: contact.profession ?? null,
        relationship_degree: contact.relationship_degree,
        services,
        tags,
        phone: contact.phone ?? null,
        email: contact.email ?? null,
        description: contact.description ?? null,
      },
    });

    const { data: rpcData, error: rpcError } = await admin.rpc("accept_invite_and_add_contact", {
      p_token: token,
      p_contact: {
        first_name: contact.first_name,
        last_name: contact.last_name,
        city: contact.city ?? null,
        profession: contact.profession ?? null,
        relationship_degree: contact.relationship_degree,
        services,
        tags,
        phone: contact.phone ?? null,
        email: contact.email ?? null,
        description: contact.description ?? null,
      },
    });

    console.log("RPC result:", { rpcData, rpcError });

    if (rpcError) {
      const msg = rpcError.message || "İşlem gerçekleştirilemedi";
      // Bilinen iş kuralı hatalarını 422 döndür
      const isBiz =
        /doğrulanmadı|inviter_contact_id|null|zincir|limit|kısıt/i.test(msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: isBiz ? 422 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fonksiyon dönüşü array/obj olabilir — güvenli ayrıştır
    const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (!result || !result.contact_id) {
      return new Response(JSON.stringify({ error: "Beklenmeyen dönüş yapısı" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const insertedContactId: string = result.contact_id;

    // Davet + zincir bilgisi - bu kontrol RPC çağrısından ÖNCE yapılmalı
    const { data: inviteData, error: inviteErr } = await admin
      .from("invites")
      .select(
        `
        owner_user_id,
        inviter_first_name,
        inviter_last_name,
        chain_id,
        invite_chains (
          status,
          remaining_uses,
          max_uses
        )
      `
      )
      .eq("token", token)
      .single();

    if (inviteErr) {
      // Bu hata kritik değil; sadece takip daveti için kullanıyoruz.
      console.warn("Invite fetch warning:", inviteErr.message);
    }

    // RPC sonucundan gelen remaining_uses'i kullanarak email gönderim kararı verelim
    // Bu değer işlem SONRASI durumu gösterir, ama aslında ÖNCESI durumu önemli
    const canSendEmail = sendEmail && contact.email && inviteData && resend && result.chain_status === "active";
    
    // Eğer chain hala active ise veya remaining_uses > 0 ise email gönderebiliriz
    // Çünkü revoked olsa bile bu işlemde kullanılabilirdi demektir
    const shouldSendEmail = canSendEmail || (sendEmail && contact.email && inviteData && resend && 
      ((result.remaining_uses !== null && result.remaining_uses >= 0) || result.chain_status === "active"));

    // Opsiyonel e‑posta (takip daveti)
    if (shouldSendEmail) {
      try {
        // invite_chains relation obj/array olabilir
        const chainRel = Array.isArray(inviteData.invite_chains)
          ? inviteData.invite_chains[0]
          : inviteData.invite_chains;

        // Zincir bilgilerini kullanarak email gönderim kontrolü
        if (chainRel) {
          // Email göndermek için: zincir sınırsız VEYA hala kalan kullanım var VEYA az önce 0'a düştü
          const canSendFollowUp = 
            chainRel.max_uses === 0 || // sınırsız
            (result.remaining_uses !== null && result.remaining_uses >= 0); // hala kullanım var veya az önce bitti

          if (canSendFollowUp) {
            const newToken = crypto.randomUUID();

            const { error: newInvErr } = await admin.from("invites").insert({
              token: newToken,
              owner_user_id: inviteData.owner_user_id,
              inviter_contact_id: insertedContactId,
              chain_id: inviteData.chain_id,
              max_uses: 0, // bireysel davette kullanım takibi yapmıyoruz; zincir takip ediyor
            });

            if (newInvErr) throw newInvErr;

            const inviterFullName =
              [inviteData.inviter_first_name, inviteData.inviter_last_name]
                .filter(Boolean)
                .join(" ") || "Bir davet eden";

            const base = (base_url || "").replace(/\/$/, "");
            const newInviteLink = `${base}/invite/${newToken}`;

            await resend.emails.send({
              from: "Lovable <onboarding@resend.dev>",
              to: [contact.email],
              subject: "Network GPT Davetiyesi",
              html: `
                <p><strong>${inviterFullName}</strong> sizi Networking GPT ağına ekledi. 
                Eğer siz de başkalarını eklemek isterseniz aşağıdaki davet bağlantısını kullanabilirsiniz.</p>
                <p><a href="${newInviteLink}">${newInviteLink}</a></p>
              `,
            });
          } else {
            console.log("Follow-up invite not created: chain exhausted or inactive");
          }
        }
      } catch (mailErr) {
        console.error("Email send failed:", (mailErr as Error)?.message || mailErr);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        contact: { id: insertedContactId },
        remaining_uses: result.remaining_uses ?? null,
        chain_status: result.chain_status ?? null,
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
