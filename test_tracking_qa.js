/**
 * Automated QA Test Suite for Toyota Jabodetabek Tracking Engine
 */

// 1. Mock Browser Environment
const mockWindow = {
  location: {
    pathname: "/",
    search: "?gclid=CjwKCAjwGoogleAdsClickID123&utm_source=google&utm_medium=cpc&utm_campaign=Toyota-Avanza-Jabodetabek&utm_term=promo+avanza+jakarta",
    href: "https://toyota.jordanengo.com/?gclid=CjwKCAjwGoogleAdsClickID123&utm_source=google&utm_medium=cpc&utm_campaign=Toyota-Avanza-Jabodetabek&utm_term=promo+avanza+jakarta"
  },
  screen: { width: 1920, height: 1080 },
  dataLayer: [],
  TOYOTA_CONFIG: {
    sales_agent: "Mathew Jordan",
    hotline: "6288975785200",
    tracking: {
      debug: true,
      ga4_id: "G-TEST12345",
      google_ads_id: "AW-999888777",
      conversion_labels: {
        hero_quiz_lead: "LABEL_HERO_QUIZ",
        credit_calc_lead: "LABEL_CREDIT_CALC",
        whatsapp_click: "LABEL_WA_CLICK",
        voice_agent_interact: "LABEL_VOICE"
      },
      enhanced_conversions: true
    }
  }
};

const mockStorage = {};
const mockLocalStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = v; },
  removeItem: (k) => { delete mockStorage[k]; }
};

const mockDocument = {
  title: "Tunas Toyota Resmi Jabodetabek",
  referrer: "https://www.google.com/",
  addEventListener: () => {},
  head: { appendChild: () => {} },
  getElementById: () => null,
  createElement: (tag) => ({ tag: tag, setAttribute: () => {} })
};

global.window = mockWindow;
global.document = mockDocument;
global.localStorage = mockLocalStorage;
global.sessionStorage = mockLocalStorage;
global.URLSearchParams = require("url").URLSearchParams;
global.URL = require("url").URL;

// Load tracking script
require("./tracking.js");

console.log("\n========================================================");
console.log(" RUNNING AUTOMATED TRACKING QA VERIFICATION");
console.log("========================================================");

let testsPassed = 0;
let testsTotal = 0;

function assert(condition, message) {
  testsTotal++;
  if (condition) {
    testsPassed++;
    console.log(`✅ PASS: ${message}`);
  } else {
    console.error(`❌ FAIL: ${message}`);
  }
}

// TEST 1: Tracker Initialized
assert(typeof window.ToyotaTracker === "object", "window.ToyotaTracker API is exposed");

// TEST 2: GCLID and UTM Parsing & Storage
const attr = window.ToyotaTracker.getAttribution();
assert(attr.gclid === "CjwKCAjwGoogleAdsClickID123", "GCLID correctly captured");
assert(attr.utm_campaign === "Toyota-Avanza-Jabodetabek", "UTM Campaign correctly captured");
assert(attr.utm_source === "google", "UTM Source correctly captured");

// TEST 3: Phone Normalization (E.164)
assert(window.ToyotaTracker.normalizePhone("0889-7578-5200") === "+6288975785200", "Normalizes 0889... to +6288975785200");
assert(window.ToyotaTracker.normalizePhone("+62 812-3456-7890") === "+6281234567890", "Normalizes formatted +62 number");
assert(window.ToyotaTracker.normalizePhone("08123456789") === "+628123456789", "Normalizes 0812... to +628123456789");

// TEST 4: Name Splitting
const nameObj = window.ToyotaTracker.splitName("Budi Santoso");
assert(nameObj.first_name === "Budi" && nameObj.last_name === "Santoso", "Splits 'Budi Santoso' into first & last name");

// TEST 5: WhatsApp URL Attribution Decoration
const testWaUrl = "https://wa.me/6288975785200?text=Halo%20Mas%20Jordan";
const decorated = window.ToyotaTracker.decorateWhatsAppUrl(testWaUrl, "Innova Zenix - Car Card");
const decodedText = decodeURIComponent(decorated).replace(/\+/g, " ");
assert(decodedText.includes("📌 Ref:"), "WhatsApp URL decorated with Ref tag");
assert(decodedText.includes("Google Ads"), "WhatsApp URL includes Google Ads attribution");
assert(decodedText.includes("Toyota-Avanza-Jabodetabek"), "WhatsApp URL includes active campaign");

// TEST 6: Google Ads Primary Conversion Event & Enhanced Conversions
const initialEvents = window.dataLayer.length;
const leadEventId = window.ToyotaTracker.trackConversion("hero_quiz_lead", {
  toyota_model: "All New Avanza 1.5 G",
  financing_plan: "DP 15 Jt-an",
  domicile_area: "Jakarta Selatan",
  value: 100000
}, {
  name: "Budi Santoso",
  phone: "0889-7578-5200"
});

assert(typeof leadEventId === "string" && leadEventId.startsWith("hero_quiz_lead_"), "Lead event generated unique ID");

// Verify dataLayer pushes
const lastGtagCall = window.dataLayer[window.dataLayer.length - 1];
assert(lastGtagCall && lastGtagCall.event === "generate_lead", "Fired 'generate_lead' to dataLayer");
assert(lastGtagCall.toyota_model === "All New Avanza 1.5 G", "Car model retained in conversion event");
assert(lastGtagCall.gclid === "CjwKCAjwGoogleAdsClickID123", "GCLID preserved in conversion event");

// TEST 7: Credit Calculator Simulation Conversion
const calcEventId = window.ToyotaTracker.trackConversion("credit_calc_lead", {
  toyota_model: "Innova Zenix Hybrid",
  dp_amount: "80",
  priority: "Fokus DP Ringan",
  tenor: "5 Tahun",
  value: 50000
});
assert(typeof calcEventId === "string" && calcEventId.startsWith("credit_calc_lead_"), "Calculator event generated unique ID");

// TEST 8: Meta CAPI Identifiers (_fbp, _fbc, fbclid)
const metaIds = window.ToyotaTracker.getMetaIdentifiers();
assert(typeof metaIds === "object", "ToyotaTracker.getMetaIdentifiers() returns object");
assert(typeof metaIds.fbc === "string" && typeof metaIds.fbp === "string", "fbp and fbc keys exist");
assert(metaIds.fbc.startsWith("fb.1.") || metaIds.fbc === "", "fbc follows Meta standard format");

// SUMMARY
console.log("========================================================");
console.log(` RESULTS: ${testsPassed} of ${testsTotal} QA tests passed!`);
console.log("========================================================\n");

if (testsPassed === testsTotal) {
  process.exit(0);
} else {
  process.exit(1);
}
