// netlify/functions/ai-analyze.js
// Claude AI Proxy — serverseitig, kein Key im Frontend
// Modes: "tips" (Anweisungsvorschläge) | "analyze" (Dokument-Vision)

// ── In-memory rate limiting (per IP, resets on cold start) ──────
const rateLimits = new Map();
const RATE_WINDOW_MS = 60_000; // 1 Minute
const RATE_MAX = { tips: 30, analyze: 10 }; // requests per window

function checkRate(ip, mode) {
  const key = `${ip}:${mode}`;
  const now = Date.now();
  const entry = rateLimits.get(key) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW_MS) {
    rateLimits.set(key, { count: 1, start: now });
    return true;
  }
  entry.count++;
  rateLimits.set(key, entry);
  return entry.count <= (RATE_MAX[mode] || 20);
}

// ── Sanitize: remove PII from logs ──────────────────────────────
function sanitizeForLog(obj) {
  if (!obj) return {};
  const safe = { ...obj };
  ['patient_name', 'patientName', 'telefon', 'phone', 'email', 'address'].forEach(k => {
    if (safe[k]) safe[k] = '[REDACTED]';
  });
  if (safe.imageBase64) safe.imageBase64 = `[BASE64 ${Math.round((safe.imageBase64.length * 3) / 4 / 1024)}KB]`;
  return safe;
}

// ── Sanitize error messages for user ────────────────────────────
function safeError(raw) {
  if (!raw) return "Unbekannter Fehler";
  const msg = String(raw);
  // Strip internal tokens, stack traces, SQL
  if (msg.includes('sk-ant-') || msg.includes('Bearer ')) return "API-Fehler";
  if (msg.length > 200) return msg.slice(0, 200) + "…";
  return msg;
}

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: "Method not allowed" }) };
  }

  const headers = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Rate limiting
  const ip = event.headers?.["x-forwarded-for"]?.split(",")?.[0]?.trim() || "unknown";
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Ungültiger Request" }) };
  }

  const mode = body.mode || "tips";

  if (!checkRate(ip, mode)) {
    console.warn("[ai-analyze] rate limit exceeded:", { ip, mode });
    return { statusCode: 429, headers, body: JSON.stringify({ success: false, error: "Zu viele Anfragen. Bitte kurz warten." }) };
  }

  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    console.error("[ai-analyze] ANTHROPIC_KEY missing");
    return { statusCode: 503, headers, body: JSON.stringify({ success: false, error: "KI-Dienst nicht konfiguriert" }) };
  }

  // ── MODE: TIPS ────────────────────────────────────────────────
  if (mode === "tips") {
    const { arbeitstyp, zahn } = body;
    if (!arbeitstyp || typeof arbeitstyp !== "string" || arbeitstyp.length > 200) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Ungültiger Arbeitstyp" }) };
    }

    const prompt = `4 kurze Anweisungen für Zahntechniker für: ${arbeitstyp.slice(0,100)}${zahn ? ` Zahn ${String(zahn).slice(0,10)}` : ""}. Max 10 Wörter pro Anweisung. Antworte NUR mit JSON-Array: ["Anweisung 1","Anweisung 2","Anweisung 3","Anweisung 4"]`;

    try {
      console.log("[ai-analyze] tips request:", { arbeitstyp: arbeitstyp.slice(0,50) });
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01" },
        body: JSON.stringify({ model:"claude-3-5-sonnet-20241022", max_tokens:300, messages:[{ role:"user", content:prompt }] }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[ai-analyze] tips claude error:", res.status);
        throw new Error(`Claude ${res.status}`);
      }

      const data = await res.json();
      const txt  = data.content?.[0]?.text || "[]";
      const clean = txt.replace(/```json\n?/gi,"").replace(/```\n?/g,"").trim();
      const tips  = JSON.parse(clean);
      console.log("[ai-analyze] tips ok:", tips.length);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, tips: Array.isArray(tips) ? tips.slice(0,6) : [] }) };
    } catch (err) {
      console.error("[ai-analyze] tips error:", err.message);
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: "KI-Vorschläge momentan nicht verfügbar" }) };
    }
  }

  // ── MODE: ANALYZE ─────────────────────────────────────────────
  if (mode === "analyze") {
    const { imageBase64, mimeType, docTypeHint } = body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Kein Bild übermittelt" }) };
    }

    // Size check: base64 of 10MB = ~13.3M chars
    if (imageBase64.length > 14_000_000) {
      return { statusCode: 413, headers, body: JSON.stringify({ success: false, error: "Bild zu groß (max 10 MB)" }) };
    }

    const mime = (mimeType || "image/jpeg").replace(/[^a-z/]/g, "");
    const hint = docTypeHint ? String(docTypeHint).slice(0, 60) : "";

    const SYSTEM = `Du bist ein Experte für Zahnarzt-Praxis-Buchhaltung und Dokumentenanalyse.
Regeln:
1. Antworte IMMER NUR mit validem JSON — kein Markdown, kein Text.
2. Unbekannte oder unleserliche Felder = null, fehlende Zahlen = 0.
3. Dokumenttypen: invoice, delivery_note, treatment_cost_plan, extra_cost_agreement.
4. Einheiten normalisieren: g, ml, kg, l, Stück, Packung.
5. Datum immer im Format YYYY-MM-DD.
6. confidence_score: 1.0 = klar lesbar, 0.5 = unsicher, 0.3 = kaum erkennbar.`;

    const FORMAT = `{
  "document_type": "invoice",
  "supplier_name": "",
  "document_number": "",
  "document_date": "YYYY-MM-DD",
  "patient_name": null,
  "treatment_name": null,
  "total_amount": 0,
  "currency": "EUR",
  "items": [
    {
      "item_name_raw": "",
      "item_name_normalized": "",
      "quantity": 0,
      "unit": "Stück",
      "unit_price": 0,
      "total_price": 0,
      "confidence_score": 0.95
    }
  ]
}`;

    const USER = `Analysiere dieses Zahnarzt-Praxis-Dokument.${hint ? ` Typ-Hinweis: ${hint}` : ""}
WICHTIG: Erkenne ALLE Positionen. Preise nur wenn erkennbar, sonst null.
Antworte NUR mit JSON:\n${FORMAT}`;

    try {
      console.log("[ai-analyze] analyze request:", sanitizeForLog({ hint, mimeType: mime, size: imageBase64.length }));

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01" },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 2000,
          system: SYSTEM,
          messages: [{ role:"user", content:[
            { type:"image", source:{ type:"base64", media_type:mime, data:imageBase64 } },
            { type:"text",  text:USER },
          ]}],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[ai-analyze] analyze claude error:", res.status, err.slice(0,200));
        if (res.status === 429) return { statusCode: 429, headers, body: JSON.stringify({ success:false, error:"KI ausgelastet. Bitte erneut versuchen." }) };
        throw new Error(`Claude ${res.status}`);
      }

      const data = await res.json();
      const txt  = data.content?.[0]?.text || "{}";
      const clean = txt.trim().replace(/^```json\s*/i,"").replace(/^```\s*/,"").replace(/```\s*$/,"").trim();

      let result;
      try { result = JSON.parse(clean); }
      catch {
        const m = clean.match(/\{[\s\S]*\}/);
        if (m) result = JSON.parse(m[0]);
        else throw new Error("JSON-Parse fehlgeschlagen");
      }

      console.log("[ai-analyze] analyze ok:", { type: result.document_type, items: result.items?.length });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, result }) };

    } catch (err) {
      console.error("[ai-analyze] analyze error:", err.message);
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: "Dokument konnte nicht analysiert werden. Bitte erneut versuchen." }) };
    }
  }

  // ── MODE: VOICE ─────────────────────────────────────────────────
  if (mode === "voice") {
    const { transkript, patienten } = body;
    if (!transkript || typeof transkript !== "string" || transkript.length > 2000) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Kein gültiges Transkript" }) };
    }

    const patientenListe = Array.isArray(patienten) ? patienten.slice(0, 50).map(p => `${p.name}${p.geburtsdatum ? ` (geb. ${p.geburtsdatum})` : ""}`).join(", ") : "";

    const prompt = `Du bist ein Assistent in einer Zahnarztpraxis. Analysiere diesen gesprochenen Text und extrahiere strukturierte Auftragsdaten.

Gesprochener Text: "${transkript.slice(0, 1500)}"

${patientenListe ? `Bekannte Patienten in der Datenbank: ${patientenListe}` : ""}

Extrahiere die Daten und antworte NUR mit diesem JSON (keine anderen Texte, keine Markdown-Backticks):

{
  "patient": {
    "name": "string oder null",
    "geburtsdatum": "YYYY-MM-DD oder null",
    "ist_neu": true,
    "match_name": "exakter Name aus Patientenliste wenn gefunden, sonst null",
    "match_confidence": 0.0
  },
  "auftrag": {
    "zahnarzt": "string oder null (Name des Zahnarztes wenn genannt)",
    "arbeitstyp": "string oder null",
    "zaehne": "string oder null (z.B. 14-16 oder 26)",
    "material": "string oder null",
    "farbe": "string oder null (VITA-Format wenn möglich)",
    "faelligkeit": "YYYY-MM-DD oder null",
    "prioritaet": "Normal oder Dringend oder Notfall",
    "anweisungen": "string oder null (Zusammenfassung der klinischen Hinweise)"
  },
  "laborzettel": {
    "text": "Professioneller Laborzettel für Zahntechniker. Nur gesicherte Informationen. Max 5 Sätze. Keine Halluzinationen.",
    "warnungen": ["string"]
  },
  "meta": {
    "fehlende_felder": ["string"],
    "confidence": 0.0,
    "sprache": "de oder en"
  }
}

Wichtige Regeln:
- Erfinde KEINE Daten die nicht im Text stehen
- Bei Unsicherheit: null setzen
- Zahnnummern im FDI-Format (11-48)
- Farbe im VITA-Format wenn erkennbar (A1-D4, BL1-4)
- Datum relativ berechnen: heute ist ${new Date().toISOString().slice(0,10)}
- "nächste Woche" = in 7 Tagen, "übermorgen" = in 2 Tagen
- Laborzettel: nur verwenden was explizit gesagt wurde`;

    try {
      console.log("[ai-analyze] voice request, length:", transkript.length);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }]
        }),
      });

      if (!res.ok) throw new Error(`Claude ${res.status}`);

      const data = await res.json();
      const txt  = data.content?.[0]?.text || "{}";
      const clean = txt.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(clean);
      console.log("[ai-analyze] voice ok, confidence:", result?.meta?.confidence);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, result }) };

    } catch (err) {
      console.error("[ai-analyze] voice error:", err.message);
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: "Sprach-Analyse fehlgeschlagen — bitte manuell eingeben" }) };
    }
  }

  return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: `Unbekannter Modus: ${mode}` }) };
};
