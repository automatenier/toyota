// Toyota CRM Cloudflare Worker Webhook
// Connects toyota.jordanengo.com directly to Google Sheets CRM

function base64url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlBuffer(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getGoogleAuthToken(clientEmail, privateKey) {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");

  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const header = { alg: "RS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const claimSet = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: exp,
    iat: iat,
  };

  const unsignedToken =
    base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claimSet));
  const enc = new TextEncoder();
  const tokenBuffer = enc.encode(unsignedToken);
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    tokenBuffer
  );
  const signature = base64urlBuffer(signatureBuffer);
  const jwt = unsignedToken + "." + signature;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Google OAuth error: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const spreadsheetId = env.SPREADSHEET_ID || "10bdJgupeYWTA_pHQ-qGjIlANb-dmR8yHyOisdbQc1e0";
    const saEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "cook-agent-605@festive-kayak-459112-e0.iam.gserviceaccount.com";
    const saKey = env.GOOGLE_PRIVATE_KEY;

    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "online",
          service: "Toyota CRM Lead Webhook",
          spreadsheet: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        }),
        {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (request.method === "POST") {
      try {
        let body = {};
        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          body = await request.json();
        } else if (contentType.includes("form")) {
          const formData = await request.formData();
          for (const [key, value] of formData.entries()) {
            body[key] = value;
          }
        } else {
          try {
            body = await request.json();
          } catch (e) {
            const text = await request.text();
            try {
              body = JSON.parse(text);
            } catch (err) {
              body = {};
            }
          }
        }

        const now = new Date();
        const jakartaTime = new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Jakarta",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now);

        // Check if request originates from ElevenLabs Post-call Webhook or Agent Tool
        const isElevenLabs = body.type === "post_call_transcription" || 
                             Boolean(body.agent_id) || 
                             Boolean(body.conversation_id) || 
                             (typeof body.source === "string" && body.source.toLowerCase().includes("elevenlabs")) ||
                             Boolean(body.analysis && body.analysis.data_collection_results);

        const dataCollection = (body.analysis && body.analysis.data_collection_results) || {};

        const name = body.client_name || 
                     body.name || 
                     body.customer_name || 
                     body.caller_name || 
                     body.user_name || 
                     (dataCollection.name && dataCollection.name.value) || 
                     (dataCollection.client_name && dataCollection.client_name.value) || 
                     (dataCollection.customer_name && dataCollection.customer_name.value) || 
                     (isElevenLabs ? "Lead Voice AI" : "Anonim");

        let phone = body.client_wa || 
                    body.phone || 
                    body.whatsapp || 
                    body.phone_number || 
                    body.caller_phone || 
                    body.wa || 
                    (dataCollection.phone && dataCollection.phone.value) || 
                    (dataCollection.whatsapp && dataCollection.whatsapp.value) || 
                    (dataCollection.client_wa && dataCollection.client_wa.value) || 
                    "-";

        const model = body.toyota_model || 
                      body.model || 
                      body.car_model || 
                      body.car || 
                      (dataCollection.model && dataCollection.model.value) || 
                      (dataCollection.toyota_model && dataCollection.toyota_model.value) || 
                      (isElevenLabs ? "Konsultasi Voice AI" : "All New Toyota");

        const scheme = body.financing_plan || 
                       body.scheme || 
                       body.payment_plan || 
                       body.payment_method || 
                       (dataCollection.scheme && dataCollection.scheme.value) || 
                       (dataCollection.financing_plan && dataCollection.financing_plan.value) || 
                       (isElevenLabs ? "Konsultasi Suara" : "Kredit Promo");

        const domicile = body.domicile_area || 
                         body.domicile || 
                         body.city || 
                         body.location || 
                         (dataCollection.domicile && dataCollection.domicile.value) || 
                         (dataCollection.city && dataCollection.city.value) || 
                         "Jabodetabek";

        const budget = body.budget_dp || 
                       body.budget || 
                       body.dp || 
                       (dataCollection.budget && dataCollection.budget.value) || 
                       (dataCollection.budget_dp && dataCollection.budget_dp.value) || 
                       "-";

        const status = body.status || 
                       (isElevenLabs ? (phone !== "-" ? "🔥 Voice AI Qualified Lead" : "🎙️ Voice Session Log") : "🔥 New Lead");

        const source = body.source || (isElevenLabs ? "ElevenLabs Voice Agent" : "Form Kualifikasi Website");

        let transcriptSummary = (body.analysis && body.analysis.transcript_summary) || 
                                body.transcript_summary || 
                                body.summary || 
                                (Array.isArray(body.transcript) ? body.transcript.map(t => `${t.role}: ${t.message}`).join(" | ").slice(0, 500) : "");

        const notes = body.notes || 
                      (transcriptSummary ? `Voice AI Summary: ${transcriptSummary}` : (isElevenLabs ? "Lead kualifikasi via ElevenLabs Voice AI" : "Lead masuk dari landing page toyota.jordanengo.com"));

        const gclid = body.gclid || "-";
        const utmCampaign = body.utm_campaign || "-";
        const utmSource = body.utm_source || (isElevenLabs ? "elevenlabs" : "direct");
        const utmMedium = body.utm_medium || (isElevenLabs ? "voice" : "none");
        const utmContent = body.utm_content || body.utm_term || "-";
        const landingPage = body.landing_page || "https://toyota.jordanengo.com";

        if (phone && phone !== "-" && !phone.startsWith("'")) {
          phone = "'" + phone;
        }

        const newRow = [
          jakartaTime,
          name,
          phone,
          model,
          scheme,
          domicile,
          budget,
          status,
          source,
          notes,
          gclid,
          utmCampaign,
          utmSource,
          utmMedium,
          utmContent,
          landingPage,
        ];

        const token = await getGoogleAuthToken(saEmail, saKey);
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:P:append?valueInputOption=USER_ENTERED`;

        const res = await fetch(appendUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: [newRow],
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Sheets append failed (${res.status}): ${errBody}`);
        }

        const result = await res.json();

        return new Response(
          JSON.stringify({
            status: "success",
            message: "Lead berhasil dicatat ke Google Sheets CRM!",
            lead: {
              name,
              phone,
              model,
              scheme,
              domicile,
            },
            updates: result.updates,
          }),
          {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (err) {
        console.error("Error processing lead:", err);
        return new Response(
          JSON.stringify({
            status: "error",
            message: err.message,
          }),
          {
            status: 500,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  },
};
