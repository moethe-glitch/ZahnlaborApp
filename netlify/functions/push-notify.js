// netlify/functions/push-notify.js
// Empfängt Supabase Webhook bei neuer Nachricht → sendet Web Push an Empfänger
// Benötigt: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SUPABASE_URL, SUPABASE_SERVICE_KEY

const webpush = require('web-push');

// ── CORS Headers ─────────────────────────────────────────────────────
const headers = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// ── VAPID Setup ───────────────────────────────────────────────────────
function setupVapid() {
  const publicKey  = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject    = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID Keys nicht konfiguriert');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey, privateKey, subject };
}

// ── Supabase REST helper ──────────────────────────────────────────────
async function sbFetch(path, opts = {}) {
  const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!SB_URL || !SB_KEY) throw new Error('Supabase nicht konfiguriert');

  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    headers: {
      apikey:          SB_KEY,
      Authorization:   `Bearer ${SB_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          opts.prefer || 'return=representation',
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

// ── Deaktiviere ungültige Subscriptions ──────────────────────────────
async function deactivateSubscription(endpoint) {
  try {
    await sbFetch(`push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body:   { is_active: false },
    });
    console.log('[push-notify] Subscription deaktiviert:', endpoint.slice(-30));
  } catch(e) {
    console.warn('[push-notify] Deaktivierung fehlgeschlagen:', e.message);
  }
}

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // ── Parse Webhook-Payload ─────────────────────────────────────
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ungültiges JSON' }) };
    }

    // Supabase Webhook sendet { type, table, record, old_record, schema }
    const record = payload.record || payload;
    const { absender, text, auftrag_id } = record;

    if (!absender || !text) {
      return { statusCode: 200, headers, body: JSON.stringify({ skipped: true, reason: 'Kein absender oder text' }) };
    }

    console.log(`[push-notify] Neue Nachricht von ${absender}: ${text.slice(0, 50)}`);

    // ── VAPID konfigurieren ───────────────────────────────────────
    setupVapid();

    // ── Aktive Subscriptions laden ────────────────────────────────
    const subscriptions = await sbFetch(
      'push_subscriptions?is_active=eq.true&select=id,user_id,user_name,role,endpoint,subscription'
    );

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[push-notify] Keine aktiven Subscriptions');
      return { statusCode: 200, headers, body: JSON.stringify({ sent: 0 }) };
    }

    // ── Push-Payload bauen ────────────────────────────────────────
    const pushPayload = JSON.stringify({
      title: `📬 ${absender}`,
      body:  text.slice(0, 100),
      tag:   auftrag_id ? `auftrag-${auftrag_id}` : 'chat',
      url:   '/',
      absender,
    });

    // ── Push senden — nur nicht an Absender ──────────────────────
    let sent = 0;
    let failed = 0;
    const sendPromises = subscriptions
      .filter(s => s.user_name !== absender) // nicht an Absender selbst
      .map(async (s) => {
        try {
          await webpush.sendNotification(s.subscription, pushPayload);
          sent++;
          console.log(`[push-notify] ✅ Gesendet an ${s.user_name || s.user_id}`);
        } catch(e) {
          failed++;
          console.warn(`[push-notify] ❌ Fehler für ${s.user_name}:`, e.statusCode, e.message);
          // 410 Gone oder 404 = Subscription abgelaufen → deaktivieren
          if (e.statusCode === 410 || e.statusCode === 404) {
            await deactivateSubscription(s.endpoint);
          }
        }
      });

    await Promise.allSettled(sendPromises);

    console.log(`[push-notify] Fertig — ${sent} gesendet, ${failed} fehlgeschlagen`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sent, failed }),
    };

  } catch(e) {
    console.error('[push-notify] Kritischer Fehler:', e.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
