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

        const name = body.client_name || body.name || "Anonim";
        let phone = body.client_wa || body.phone || body.wa || "-";
        const model = body.toyota_model || body.model || "All New Toyota";
        const scheme = body.financing_plan || body.scheme || "Kredit Promo";
        const domicile = body.domicile_area || body.domicile || "Jabodetabek";
        const budget = body.budget_dp || body.budget || "-";
        const status = body.status || "🔥 New Lead";
        const source = body.source || "Form Kualifikasi Website";
        const notes = body.notes || "Lead masuk dari landing page toyota.jordanengo.com";

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
        ];

        const token = await getGoogleAuthToken(saEmail, saKey);
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:J:append?valueInputOption=USER_ENTERED`;

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
