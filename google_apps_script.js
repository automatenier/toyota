/**
 * Google Apps Script - Toyota Lead CRM Webhook
 * Spreadsheet: https://docs.google.com/spreadsheets/d/10bdJgupeYWTA_pHQ-qGjIlANb-dmR8yHyOisdbQc1e0/edit#gid=0
 * 
 * PANDUAN AKTIVASI CEPAT (Hanya 1 Menit):
 * 1. Buka Google Sheet Toyota: https://docs.google.com/spreadsheets/d/10bdJgupeYWTA_pHQ-qGjIlANb-dmR8yHyOisdbQc1e0/edit
 * 2. Di menu atas, klik 'Extensions' (Ekstensi) -> 'Apps Script'.
 * 3. Hapus kode default (myFunction) dan paste seluruh isi file ini.
 * 4. Di pojok kanan atas, klik 'Deploy' (Terapkan) -> 'New deployment' (Penerapan baru).
 * 5. Klik ikon gerigi di sebelah 'Select type' -> pilih 'Web app' (Aplikasi web).
 * 6. Isi konfigurasi:
 *    - Description: "Toyota CRM Webhook"
 *    - Execute as: "Me (email pemilik sheet)"
 *    - Who has access: "Anyone" (Siapa saja - agar form website bisa kirim data tanpa login)
 * 7. Klik 'Deploy', lalu klik 'Authorize access' dan setujui izin akun Google.
 * 8. Copy 'Web app URL' (akhiran /exec).
 * 9. Paste URL tersebut ke `window.TOYOTA_CONFIG.crm_endpoint` di file `index.html`.
 */

function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Sheet1") || ss.getSheets()[0];

    // Cek dan sinkronisasi header lengkap termasuk atribut iklan (Google Ads & UTM)
    var headers = [
      "Timestamp",
      "Nama Konsumen",
      "No. WhatsApp",
      "Model Unit",
      "Skema Pembelian",
      "Wilayah Domisili",
      "Budget DP / Estimasi",
      "Status Lead",
      "Sumber Lead",
      "Catatan Sales (Mas Jordan)",
      "GCLID (Google Ads Click ID)",
      "UTM Campaign",
      "UTM Source",
      "UTM Medium",
      "UTM Content / Keyword",
      "Landing Page"
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      var hRange = sheet.getRange(1, 1, 1, headers.length);
      hRange.setBackground("#bd0014");
      hRange.setFontColor("#ffffff");
      hRange.setFontWeight("bold");
      hRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    } else {
      // Pastikan header attribution di kolom K-P ada
      var existingHeaderRange = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 10));
      var existingHeaders = existingHeaderRange.getValues()[0];
      if (existingHeaders.length < headers.length) {
        for (var h = existingHeaders.length; h < headers.length; h++) {
          var cell = sheet.getRange(1, h + 1);
          cell.setValue(headers[h]);
          cell.setBackground("#8b0000");
          cell.setFontColor("#ffffff");
          cell.setFontWeight("bold");
        }
      }
    }

    // Parsing data lead yang masuk (Mendukung Form Website & ElevenLabs Voice AI)
    var tz = "Asia/Jakarta";
    var timestamp = data.timestamp || Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss");

    var isElevenLabs = data.type === "post_call_transcription" || 
                       Boolean(data.agent_id) || 
                       Boolean(data.conversation_id) || 
                       (typeof data.source === "string" && data.source.toLowerCase().indexOf("elevenlabs") !== -1) ||
                       Boolean(data.analysis && data.analysis.data_collection_results);

    var dataCollection = (data.analysis && data.analysis.data_collection_results) || {};

    var name = data.client_name || 
               data.name || 
               data.customer_name || 
               data.caller_name || 
               data.user_name || 
               (dataCollection.name && dataCollection.name.value) || 
               (dataCollection.client_name && dataCollection.client_name.value) || 
               (dataCollection.customer_name && dataCollection.customer_name.value) || 
               (isElevenLabs ? "Lead Voice AI" : "Anonim");

    var phone = data.client_wa || 
                data.phone || 
                data.whatsapp || 
                data.phone_number || 
                data.caller_phone || 
                data.wa || 
                (dataCollection.phone && dataCollection.phone.value) || 
                (dataCollection.whatsapp && dataCollection.whatsapp.value) || 
                (dataCollection.client_wa && dataCollection.client_wa.value) || 
                "-";

    var model = data.toyota_model || 
                data.model || 
                data.car_model || 
                data.car || 
                (dataCollection.model && dataCollection.model.value) || 
                (dataCollection.toyota_model && dataCollection.toyota_model.value) || 
                (isElevenLabs ? "Konsultasi Voice AI" : "All New Toyota");

    var scheme = data.financing_plan || 
                 data.scheme || 
                 data.payment_plan || 
                 data.payment_method || 
                 (dataCollection.scheme && dataCollection.scheme.value) || 
                 (dataCollection.financing_plan && dataCollection.financing_plan.value) || 
                 (isElevenLabs ? "Konsultasi Suara" : "Kredit Promo");

    var domicile = data.domicile_area || 
                   data.domicile || 
                   data.city || 
                   data.location || 
                   (dataCollection.domicile && dataCollection.domicile.value) || 
                   (dataCollection.city && dataCollection.city.value) || 
                   "Jabodetabek";

    var budget = data.budget_dp || 
                 data.budget || 
                 data.dp || 
                 (dataCollection.budget && dataCollection.budget.value) || 
                 (dataCollection.budget_dp && dataCollection.budget_dp.value) || 
                 "-";

    var status = data.status || 
                 (isElevenLabs ? (phone !== "-" ? "🔥 Voice AI Qualified Lead" : "🎙️ Voice Session Log") : "🔥 New Lead");

    var source = data.source || (isElevenLabs ? "ElevenLabs Voice Agent" : "Form Kualifikasi Website");

    var transcriptSummary = (data.analysis && data.analysis.transcript_summary) || 
                            data.transcript_summary || 
                            data.summary || 
                            (Array.isArray(data.transcript) ? data.transcript.map(function(t) { return (t.role || "") + ": " + (t.message || ""); }).join(" | ").substring(0, 500) : "");

    var notes = data.notes || 
                (transcriptSummary ? "Voice AI Summary: " + transcriptSummary : (isElevenLabs ? "Lead kualifikasi via ElevenLabs Voice AI" : "Lead masuk dari landing page toyota.jordanengo.com"));

    // Attribution data dari Google Ads & UTM Tracker
    var gclid = data.gclid || "-";
    var utmCampaign = data.utm_campaign || "-";
    var utmSource = data.utm_source || (isElevenLabs ? "elevenlabs" : "direct");
    var utmMedium = data.utm_medium || (isElevenLabs ? "voice" : "none");
    var utmContent = data.utm_content || data.utm_term || "-";
    var landingPage = data.landing_page || "-";

    // Format nomor WhatsApp agar rapi (jika dimulai dengan 08, ubah ke format terbaca)
    if (phone && phone !== "-") {
      phone = "'" + phone; // prefix petik agar angka 0 di depan tidak hilang di spreadsheet
    }

    var newRow = [
      timestamp,
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
      landingPage
    ];

    sheet.appendRow(newRow);

    var lastRow = sheet.getLastRow();
    var rowRange = sheet.getRange(lastRow, 1, 1, newRow.length);
    rowRange.setFontFamily("Manrope");
    rowRange.setFontSize(10);
    rowRange.setVerticalAlignment("middle");

    // Kirim event server-side ke Meta Conversions API (CAPI) jika dikonfigurasi
    var capiStatus = sendToMetaCAPI(data);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Lead berhasil dicatat ke CRM Toyota!",
      row: lastRow,
      meta_capi: capiStatus,
      data: {
        name: name,
        model: model,
        phone: phone
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// META CONVERSIONS API (CAPI) ENGINE
// ══════════════════════════════════════════════════════════════════════════════
var META_CONFIG = {
  pixel_id: "2029772677665340",        // Dataset ID / Pixel ID Meta Anda
  access_token: "EAAHcxUeQtbYBSdHUqwEYUwwYE67DhCBSj2X1fWjZAoNxX5YaeaJZBJ9RQHYjfpLPioItTc4JOBMY196keve0ZCHRyMofvVAgfgZCH5T17XMdlaDsUl2Y5ZBvLvvpiZASOiRCKt0iWB87WTbRFQ8lkoMHyfznHBW7xscAxV1ZCQgVfekd3wh8rTczxqvucPXeRwXKgZDZD",
  test_event_code: ""                  // Isi jika sedang menguji di tab 'Test Events' Meta (contoh: "TEST12345")
};

function sendToMetaCAPI(data) {
  try {
    // Ambil kredensial dari variabel script atau Script Properties
    var sp = PropertiesService.getScriptProperties();
    var pixelId = sp.getProperty("META_PIXEL_ID") || META_CONFIG.pixel_id;
    var accessToken = sp.getProperty("META_CAPI_TOKEN") || META_CONFIG.access_token;
    var testCode = sp.getProperty("META_TEST_CODE") || META_CONFIG.test_event_code;

    if (!pixelId || !accessToken) {
      return { status: "skipped", message: "Meta Pixel ID / Access Token belum dikonfigurasi" };
    }

    var eventName = data.event_name || "Lead";
    var eventId = data.event_id || ("capi_" + Date.now() + "_" + Math.floor(Math.random() * 1000));
    var eventTime = Math.floor(Date.now() / 1000);

    // 1. Normalisasi Nomor HP ke standar E.164 tanpa tanda '+' untuk SHA-256 hashing
    var rawPhone = data.client_wa || data.phone || "";
    var cleanPhone = rawPhone.replace(/[^\d]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.substring(1);
    }

    // 2. Format User Data dengan Hashing SHA-256 (Sesuai Konfigurasi Review Setup Meta)
    var userData = {
      country: [hashSHA256("id")]
    };

    // Phone number: Hashed SHA-256 (E.164 digits)
    if (cleanPhone) {
      userData.ph = [hashSHA256(cleanPhone)];
    }

    // First name & Last name: Hashed SHA-256
    if (data.client_name) {
      var nameParts = data.client_name.trim().toLowerCase().split(/\s+/);
      userData.fn = [hashSHA256(nameParts[0])];
      if (nameParts.length > 1) {
        userData.ln = [hashSHA256(nameParts.slice(1).join(" "))];
      }
    }

    // County / Region / State & City: Hashed SHA-256
    if (data.domicile_area) {
      var dom = data.domicile_area.trim().toLowerCase();
      userData.st = [hashSHA256(dom)]; // County / Region
      userData.ct = [hashSHA256(dom.replace(/[^a-z0-9]/g, ""))]; // City
    }

    // Client user agent: DO NOT HASH (Meta requirement)
    if (data.client_user_agent) {
      userData.client_user_agent = data.client_user_agent;
    }

    // Client IP Address jika diteruskan
    if (data.client_ip) {
      userData.client_ip_address = data.client_ip;
    }

    // Identifiers Browser Meta (_fbp dan _fbc) untuk Event Match Quality maksimal
    if (data.fbp) userData.fbp = data.fbp;
    if (data.fbc) userData.fbc = data.fbc;

    var eventPayload = {
      event_name: eventName,
      event_time: eventTime,
      event_id: eventId,
      event_source_url: data.landing_page ? "https://toyota.jordanengo.com" + data.landing_page : "https://toyota.jordanengo.com/",
      action_source: "website",
      user_data: userData,
      custom_data: {
        content_name: data.toyota_model || "Toyota All New",
        currency: "IDR",
        value: (eventName === "Lead") ? 100000 : 50000
      }
    };

    var body = {
      data: [eventPayload]
    };

    if (testCode) {
      body.test_event_code = testCode;
    }

    var endpoint = "https://graph.facebook.com/v19.0/" + encodeURIComponent(pixelId) + "/events?access_token=" + encodeURIComponent(accessToken);
    var response = UrlFetchApp.fetch(endpoint, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });

    var resCode = response.getResponseCode();
    var resBody = response.getContentText();
    Logger.log("Meta CAPI (" + resCode + "): " + resBody);

    return {
      status: (resCode === 200) ? "success" : "api_warning",
      code: resCode,
      event_id: eventId
    };

  } catch (err) {
    Logger.log("Meta CAPI Exception: " + err.toString());
    return { status: "error", message: err.toString() };
  }
}

function hashSHA256(input) {
  if (!input) return "";
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input.trim(), Utilities.Charset.UTF_8);
  var hex = "";
  for (var i = 0; i < raw.length; i++) {
    var val = raw[i];
    if (val < 0) val += 256;
    var str = val.toString(16);
    if (str.length === 1) str = "0" + str;
    hex += str;
  }
  return hex;
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Toyota CRM Webhook Mas Jordan (Google Ads + Meta CAPI Ready)",
    sheet_url: "https://docs.google.com/spreadsheets/d/10bdJgupeYWTA_pHQ-qGjIlANb-dmR8yHyOisdbQc1e0/edit",
    timestamp: Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss")
  })).setMimeType(ContentService.MimeType.JSON);
}
