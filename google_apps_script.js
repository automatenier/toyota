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

    // Parsing data lead yang masuk
    var tz = "Asia/Jakarta";
    var timestamp = data.timestamp || Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss");
    var name = data.client_name || data.name || "Anonim";
    var phone = data.client_wa || data.phone || data.wa || "-";
    var model = data.toyota_model || data.model || "All New Toyota";
    var scheme = data.financing_plan || data.scheme || "Kredit Promo";
    var domicile = data.domicile_area || data.domicile || "Jabodetabek";
    var budget = data.budget_dp || data.budget || "-";
    var status = data.status || "🔥 New Lead";
    var source = data.source || "Website Kualifikasi Form";
    var notes = data.notes || "Lead masuk dari landing page toyota.jordanengo.com";

    // Attribution data dari Google Ads & UTM Tracker
    var gclid = data.gclid || "-";
    var utmCampaign = data.utm_campaign || "-";
    var utmSource = data.utm_source || "direct";
    var utmMedium = data.utm_medium || "none";
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
  pixel_id: "",        // Contoh: "123456789012345"
  access_token: "",    // Dari Meta Events Manager -> Settings -> Generate Access Token
  test_event_code: ""  // Opsional: Dari tab 'Test Events' Meta (contoh: "TEST54321")
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

    // 2. Format User Data dengan Hashing SHA-256
    var userData = {
      country: [hashSHA256("id")]
    };

    if (cleanPhone) {
      userData.ph = [hashSHA256(cleanPhone)];
    }

    if (data.client_name) {
      var nameParts = data.client_name.trim().toLowerCase().split(/\s+/);
      userData.fn = [hashSHA256(nameParts[0])];
      if (nameParts.length > 1) {
        userData.ln = [hashSHA256(nameParts.slice(1).join(" "))];
      }
    }

    if (data.domicile_area) {
      userData.ct = [hashSHA256(data.domicile_area.trim().toLowerCase())];
    }

    // Identifiers Browser Meta (_fbp dan _fbc)
    if (data.fbp) userData.fbp = data.fbp;
    if (data.fbc) userData.fbc = data.fbc;
    if (data.client_user_agent) userData.client_user_agent = data.client_user_agent;

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
