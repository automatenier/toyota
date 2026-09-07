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

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Lead berhasil dicatat ke CRM Toyota!",
      row: lastRow,
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

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Toyota CRM Webhook Mas Jordan",
    sheet_url: "https://docs.google.com/spreadsheets/d/10bdJgupeYWTA_pHQ-qGjIlANb-dmR8yHyOisdbQc1e0/edit",
    timestamp: Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss")
  })).setMimeType(ContentService.MimeType.JSON);
}
