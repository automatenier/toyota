/**
 * ══════════════════════════════════════════════════════════════════════════════
 * TUNAS TOYOTA JABODETABEK - ENTERPRISE TRACKING & ATTRIBUTION ENGINE
 * ══════════════════════════════════════════════════════════════════════════════
 * Architecture:
 * - Google Consent Mode v2 (Granted by default, PDP compliant)
 * - Google Analytics 4 (GA4) & Google Tag (gtag.js)
 * - Google Ads Conversion Tracking with Enhanced Conversions for Leads
 * - Persistent GCLID / WBRAID / GBRAID & UTM Attribution across sessions
 * - Dynamic Outbound WhatsApp Click Decoration (Lead Source Tagging)
 * - dataLayer Schema for Form Submission, Credit Calculator, WhatsApp & Voice AI
 * - Meta Pixel & Server-Side CAPI Deduplication Event IDs
 * ══════════════════════════════════════════════════════════════════════════════
 */

(function(window, document) {
  "use strict";

  // 1. DATA LAYER & GTAG BOOTSTRAP
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;

  // 2. DEFAULT GOOGLE CONSENT MODE V2
  // Compliant with Indonesian PDP Law (UU PDP) & global Google requirements
  gtag('consent', 'default', {
    'ad_storage': 'granted',
    'ad_user_data': 'granted',
    'ad_personalization': 'granted',
    'analytics_storage': 'granted',
    'functionality_storage': 'granted',
    'personalization_storage': 'granted',
    'security_storage': 'granted'
  });

  // 3. ATTRIBUTION STORAGE ENGINE (GCLID, WBRAID, GBRAID, UTMs)
  const ATTRIBUTION_STORAGE_KEY = "toyota_attribution_v1";
  const ATTRIBUTION_TTL_DAYS = 30;

  function parseUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const trackingKeys = [
      "gclid", "wbraid", "gbraid",
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "ttclid"
    ];
    const extracted = {};
    let hasAny = false;

    trackingKeys.forEach(function(key) {
      const val = params.get(key);
      if (val) {
        extracted[key] = val.trim();
        hasAny = true;
      }
    });

    if (hasAny) {
      extracted.timestamp = new Date().toISOString();
      extracted.landing_page = window.location.pathname + window.location.search;
      extracted.referrer = document.referrer || "direct";
      return extracted;
    }
    return null;
  }

  function getStoredAttribution() {
    try {
      const item = localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
      if (!item) return null;
      const parsed = JSON.parse(item);
      const ageMs = Date.now() - new Date(parsed.timestamp).getTime();
      const maxAgeMs = ATTRIBUTION_TTL_DAYS * 24 * 60 * 60 * 1000;
      if (ageMs > maxAgeMs) {
        localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveAttribution(data) {
    try {
      localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(data));
      sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Storage unavailable or disabled
    }
  }

  // Initialize or update attribution on load
  const freshAttribution = parseUrlParameters();
  let activeAttribution = freshAttribution || getStoredAttribution() || {
    utm_source: "direct",
    utm_medium: "none",
    utm_campaign: "organic",
    timestamp: new Date().toISOString(),
    landing_page: window.location.pathname,
    referrer: document.referrer || "direct"
  };

  if (freshAttribution) {
    saveAttribution(freshAttribution);
    activeAttribution = freshAttribution;
  }

  // Check Debug Mode from URL (?debug_tracking=true) or Config
  const isDebug = new URLSearchParams(window.location.search).get("debug_tracking") === "true" ||
                  (window.TOYOTA_CONFIG && window.TOYOTA_CONFIG.tracking && window.TOYOTA_CONFIG.tracking.debug === true);

  function logDebug(message, data) {
    if (isDebug) {
      console.log(
        "%c[TOYOTA TRACKING] " + message,
        "background: #bd0014; color: #ffffff; font-weight: bold; padding: 2px 6px; border-radius: 4px;",
        data || ""
      );
    }
  }

  // 3.1 META CAPI IDENTIFIER HELPERS (_fbp and _fbc)
  function getCookie(name) {
    try {
      const match = document.cookie ? document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)")) : null;
      return match ? decodeURIComponent(match[2]) : null;
    } catch (e) {
      return null;
    }
  }

  function setCookie(name, value, days) {
    try {
      const d = new Date();
      d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
      document.cookie = name + "=" + encodeURIComponent(value) + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
    } catch (e) {}
  }

  function getMetaIdentifiers() {
    let fbp = getCookie("_fbp");
    if (!fbp) {
      try { fbp = localStorage.getItem("toyota_fbp") || ""; } catch (e) {}
    }

    let fbc = getCookie("_fbc");
    if (!fbc) {
      try { fbc = localStorage.getItem("toyota_fbc") || ""; } catch (e) {}
    }

    // Auto-generate standard _fbc if visitor came with fbclid
    if (activeAttribution.fbclid && !fbc) {
      fbc = "fb.1." + Date.now() + "." + activeAttribution.fbclid;
      setCookie("_fbc", fbc, 90);
      try { localStorage.setItem("toyota_fbc", fbc); } catch (e) {}
    }

    return {
      fbp: fbp || "",
      fbc: fbc || "",
      fbclid: activeAttribution.fbclid || ""
    };
  }

  logDebug("Engine initialized. Active attribution:", activeAttribution);

  // 4. PHONE NUMBER NORMALIZATION (E.164 Format for Google Enhanced Conversions)
  function normalizeIndonesianPhone(rawPhone) {
    if (!rawPhone) return "";
    let cleaned = String(rawPhone).replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+62")) {
      return cleaned;
    }
    if (cleaned.startsWith("62")) {
      return "+" + cleaned;
    }
    if (cleaned.startsWith("0")) {
      return "+62" + cleaned.substring(1);
    }
    if (cleaned.startsWith("8")) {
      return "+62" + cleaned;
    }
    return cleaned;
  }

  // Helper to split full name into first and last name
  function splitFullName(fullName) {
    if (!fullName) return { first_name: "", last_name: "" };
    const parts = fullName.trim().split(/\s+/);
    return {
      first_name: parts[0] || "",
      last_name: parts.length > 1 ? parts.slice(1).join(" ") : ""
    };
  }

  // Unique Event ID Generator (for CAPI / Offline Deduplication)
  function generateEventId(prefix) {
    const p = prefix || "evt";
    const rand = Math.random().toString(36).substring(2, 8);
    return p + "_" + Date.now() + "_" + rand;
  }

  // 5. GOOGLE TAG & THIRD PARTY SCRIPTS INJECTION
  function loadGoogleTag(googleAdsId, ga4Id) {
    const primaryId = googleAdsId || ga4Id;
    if (!primaryId || primaryId.includes("XXXX")) {
      logDebug("Google Tag ID is placeholder or unset:", { googleAdsId, ga4Id });
      return;
    }

    const existingScript = document.getElementById("gtag-script") || (document.querySelector ? document.querySelector('script[src*="googletagmanager.com/gtag/js"]') : null);
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "gtag-script";
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(primaryId);
      document.head.appendChild(script);

      gtag("js", new Date());
    }

    // Configure Google Analytics 4
    if (ga4Id && !ga4Id.includes("XXXX")) {
      gtag("config", ga4Id, {
        send_page_view: true,
        cookie_flags: "SameSite=None;Secure"
      });
      logDebug("Configured GA4:", ga4Id);
    }

    // Configure Google Ads with Enhanced Conversions
    if (googleAdsId && !googleAdsId.includes("XXXX")) {
      gtag("config", googleAdsId, {
        allow_enhanced_conversions: true
      });
      logDebug("Configured Google Ads Tag:", googleAdsId);
    }
  }

  // Optional Meta Pixel Loader
  function loadMetaPixel(pixelId) {
    if (!pixelId || pixelId.includes("XXXX") || window.fbq) return;
    /* eslint-disable */
    !(function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)})(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
    logDebug("Meta Pixel Initialized:", pixelId);
  }

  // 6. CORE TRACKING & CONVERSION DISPATCHER
  function pushDataLayer(eventName, params) {
    const payload = Object.assign({
      event: eventName,
      timestamp: new Date().toISOString(),
      page_location: window.location.href,
      page_path: window.location.pathname,
      gclid: activeAttribution.gclid || "",
      utm_source: activeAttribution.utm_source || "direct",
      utm_medium: activeAttribution.utm_medium || "none",
      utm_campaign: activeAttribution.utm_campaign || "organic"
    }, params || {});

    window.dataLayer.push(payload);
    logDebug("dataLayer.push -> " + eventName, payload);
    return payload;
  }

  function trackConversion(actionKey, customParams, userData) {
    const config = window.TOYOTA_CONFIG ? window.TOYOTA_CONFIG.tracking : null;
    const googleAdsId = config ? config.google_ads_id : null;
    const labels = config && config.conversion_labels ? config.conversion_labels : {};
    const label = labels[actionKey];
    const eventId = generateEventId(actionKey);

    const eventParams = Object.assign({
      event_id: eventId,
      action_key: actionKey,
      send_to_google_ads: false
    }, customParams || {});

    // 1. Enhanced Conversions payload if user data is provided
    if (userData && config && config.enhanced_conversions !== false) {
      const e164Phone = normalizeIndonesianPhone(userData.phone);
      const nameParts = splitFullName(userData.name);
      const enhancedUserData = {};

      if (e164Phone) enhancedUserData.phone_number = e164Phone;
      if (nameParts.first_name) {
        enhancedUserData.address = {
          first_name: nameParts.first_name,
          last_name: nameParts.last_name || "",
          country: "ID"
        };
      }

      if (Object.keys(enhancedUserData).length > 0) {
        gtag("set", "user_data", enhancedUserData);
        logDebug("Enhanced Conversions user_data set:", enhancedUserData);
      }
    }

    // 2. Fire Google Ads conversion if configured
    if (googleAdsId && label && !googleAdsId.includes("XXXX")) {
      const sendTo = googleAdsId + "/" + label;
      const gAdsPayload = {
        send_to: sendTo,
        transaction_id: eventId,
        value: customParams && customParams.value ? customParams.value : 1.0,
        currency: "IDR"
      };

      gtag("event", "conversion", gAdsPayload);
      eventParams.send_to_google_ads = true;
      eventParams.conversion_label = label;
      logDebug("Google Ads Conversion fired -> " + sendTo, gAdsPayload);
    } else {
      logDebug("Google Ads conversion skipped (no valid label or ID for " + actionKey + ")");
    }

    // 3. Dispatch to GA4 via standard dataLayer / gtag event
    let ga4EventName = "generate_lead";
    if (actionKey === "whatsapp_click" || actionKey.includes("whatsapp")) {
      ga4EventName = "contact";
    } else if (actionKey === "credit_calc_lead") {
      ga4EventName = "simulate_credit";
    } else if (actionKey === "voice_agent_interact") {
      ga4EventName = "voice_ai_engagement";
    }

    gtag("event", ga4EventName, Object.assign({}, eventParams));
    pushDataLayer(ga4EventName, eventParams);

    // 4. Meta Pixel Track (Aligned with Conversions API Review Setup: Lead, SubmitApplication, ViewContent)
    if (window.fbq) {
      let metaEventName = "Lead";
      const metaPayload = {
        content_name: customParams.toyota_model || "Toyota Lead",
        currency: "IDR",
        value: customParams.value || 100000
      };

      if (actionKey === "hero_quiz_lead") {
        metaEventName = "Lead";
      } else if (actionKey === "credit_calc_lead") {
        metaEventName = "SubmitApplication";
        metaPayload.value = customParams.value || 50000;
      } else if (actionKey === "whatsapp_click" || actionKey.includes("whatsapp")) {
        metaEventName = "Contact";
      } else if (actionKey === "view_content") {
        metaEventName = "ViewContent";
        metaPayload.value = 0;
      }

      window.fbq("track", metaEventName, metaPayload, { eventID: eventId });
      logDebug("Meta Pixel Event fired -> " + metaEventName, { metaPayload, eventID: eventId });
    }

    return eventId;
  }

  // 7. OUTBOUND WHATSAPP ATTRIBUTION DECORATOR
  // Enriches outbound WhatsApp URLs with a subtle attribution footer
  // so Mathew Jordan immediately knows in chat where the customer arrived from.
  function decorateWhatsAppUrl(url, ctaContext) {
    if (!url || !url.includes("wa.me")) return url;

    try {
      const urlObj = new URL(url);
      let text = urlObj.searchParams.get("text") || "";

      // Check if attribution already attached
      if (text.includes("📌 Ref:")) return url;

      let refSnippet = "";
      if (activeAttribution.gclid) {
        refSnippet = "Google Ads";
        if (activeAttribution.utm_campaign && activeAttribution.utm_campaign !== "organic") {
          refSnippet += " (" + activeAttribution.utm_campaign + ")";
        }
      } else if (activeAttribution.utm_source && activeAttribution.utm_source !== "direct") {
        refSnippet = activeAttribution.utm_source;
        if (activeAttribution.utm_campaign) {
          refSnippet += " - " + activeAttribution.utm_campaign;
        }
      }

      const ctaTag = ctaContext || "Web Direct";
      const attributionFooter = "\n\n📌 Ref: " + (refSnippet ? refSnippet + " | " : "") + ctaTag;

      text = text + attributionFooter;
      urlObj.searchParams.set("text", text);
      return urlObj.toString();
    } catch (e) {
      return url;
    }
  }

  // 8. AUTOMATIC EVENT LISTENER HOOKS
  function setupAutomatedListeners() {
    logDebug("Binding automatic interaction listeners...");

    // A. Intercept All WhatsApp Clicks
    document.addEventListener("click", function(e) {
      const target = e.target.closest('a[href*="wa.me"]');
      if (!target) return;

      const rawHref = target.getAttribute("href") || "";
      const textContent = target.textContent.trim();
      let ctaLocation = "general";
      let model = "";

      if (target.id === "main-wa-link" || target.closest("#agentz-wa-wrapper")) {
        ctaLocation = "floating_widget";
      } else if (target.closest("header")) {
        ctaLocation = "header_cta";
      } else if (target.closest("#katalog-mobil") || target.closest(".group")) {
        ctaLocation = "car_card_cta";
        // Extract model from nearest heading
        const card = target.closest(".group") || target.closest(".bg-surface-container-lowest");
        if (card) {
          const h3 = card.querySelector("h3");
          if (h3) model = h3.textContent.trim();
        }
      } else if (target.closest("footer")) {
        ctaLocation = "footer_cta";
      } else if (target.id === "quiz-wa-redirect" || target.closest("#quiz-success-panel")) {
        ctaLocation = "quiz_success_cta";
      }

      logDebug("WhatsApp link clicked:", { ctaLocation, model, textContent });

      // Track Conversion
      trackConversion("whatsapp_click", {
        click_location: ctaLocation,
        toyota_model: model,
        button_text: textContent
      });

      // Decorate outbound link with attribution tag
      const decoratedUrl = decorateWhatsAppUrl(rawHref, (model ? model + " - " : "") + ctaLocation);
      target.setAttribute("href", decoratedUrl);
    }, { capture: true, passive: false });

    // B. ElevenLabs Voice Agent Interaction Listener
    const elevenWidget = document.getElementById("eleven-widget");
    if (elevenWidget) {
      let voiceTracked = false;
      const trackVoice = function() {
        if (voiceTracked) return;
        voiceTracked = true;
        logDebug("ElevenLabs Voice Agent interaction detected");
        trackConversion("voice_agent_interact", {
          service: "elevenlabs_voice_consultant"
        });
      };

      elevenWidget.addEventListener("click", trackVoice);
      elevenWidget.addEventListener("focusin", trackVoice);
      window.addEventListener("elevenlabs-convai:call", trackVoice);
      window.addEventListener("elevenlabs-convai:start", trackVoice);
    }
  }

  // 9. INITIALIZE ON DOM READY
  function init() {
    const config = window.TOYOTA_CONFIG ? window.TOYOTA_CONFIG.tracking : null;
    const gAdsId = config ? config.google_ads_id : null;
    const ga4Id = config ? config.ga4_id : null;
    const pixelId = config ? config.meta_pixel_id : null;

    loadGoogleTag(gAdsId, ga4Id);
    loadMetaPixel(pixelId);

    // Initial page view event to dataLayer
    pushDataLayer("page_view", {
      page_title: document.title,
      screen_resolution: window.screen.width + "x" + window.screen.height,
      has_gclid: !!activeAttribution.gclid
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupAutomatedListeners);
    } else {
      setupAutomatedListeners();
    }
  }

  init();

  // 10. EXPOSE GLOBAL TRACKER API
  window.ToyotaTracker = {
    getAttribution: function() { return Object.assign({}, activeAttribution); },
    getMetaIdentifiers: getMetaIdentifiers,
    normalizePhone: normalizeIndonesianPhone,
    splitName: splitFullName,
    pushDataLayer: pushDataLayer,
    trackConversion: trackConversion,
    decorateWhatsAppUrl: decorateWhatsAppUrl,
    getStatus: function() {
      const config = window.TOYOTA_CONFIG ? window.TOYOTA_CONFIG.tracking : {};
      return {
        initialized: true,
        debug: isDebug,
        attribution: activeAttribution,
        google_ads_id: config.google_ads_id || "not configured",
        ga4_id: config.ga4_id || "not configured",
        meta_pixel_id: config.meta_pixel_id || "not configured",
        conversion_labels: config.conversion_labels || {},
        enhanced_conversions_enabled: config.enhanced_conversions !== false
      };
    }
  };

})(window, document);
