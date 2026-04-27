import { useState, useEffect, useRef, useCallback, Component } from "react";

// ═══════════════════════════════════════════════════════════════════════
// § CONFIG
// ═══════════════════════════════════════════════════════════════════════
const SB_URL  = "https://rfoiokhambyjewpauytn.supabase.co";
const SB_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmb2lva2hhbWJ5amV3cGF1eXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzgwMTEsImV4cCI6MjA5MTgxNDAxMX0.Lokl1HrFSx2HSJJFQjd5oM31NfeB3cbyso3nDvdB8bc";
const PUSH_KEY = "BOYvsqtTQvb4hyEtrI2psM8MjqAg5EnpUq16l-xd-QfgTZPTWSHk6OVvBFGEafdYdxvO3HtKFfCnQz_My9QQu_Y";
const isConf  = () => SB_URL !== "IHRE_SUPABASE_URL";
const MISSED_MS = 3 * 60 * 1000;

// ── Supabase Auth helpers (REST, no extra library) ─────────────
const sbAuth = {
  signIn: async (email, password) => {
    const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || "Login fehlgeschlagen");
    return data;
  },
  signOut: async (accessToken) => {
    await fetch(`${SB_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
  },
  getSession: () => {
    try { return JSON.parse(localStorage.getItem("sb_session") || "null"); } catch { return null; }
  },
  setSession: (s) => {
    try { localStorage.setItem("sb_session", s ? JSON.stringify(s) : "null"); } catch {} 
  },
}; // 3 Minuten bis "verpasst"

// ═══════════════════════════════════════════════════════════════════════
// § DESIGN TOKENS — Warm Dental Premium
// ═══════════════════════════════════════════════════════════════════════
const C = {
  brand:   "#2D1F1F",  brandMd: "#4A2E2E",
  sage:    "#7A9E8E",  sageDk:  "#5C7A6E",  sageLt:  "#E4EEE9",  sageXlt: "#F1F7F4",
  gold:    "#C9956A",  goldLt:  "#F5EDE4",  goldDk:  "#9B6A3A",
  ink:     "#1C1917",  inkMd:   "#44403C",  inkLt:   "#78716C",
  fog:     "#A8A29E",  sand:    "#E7E5E4",  parch:   "#F5F5F4",
  cream:   "#FAFAF9",  white:   "#FFFFFF",
  ok:      "#16A34A",  okLt:    "#DCFCE7",  okDk:    "#14532D",
  err:     "#DC2626",  errLt:   "#FEE2E2",  errMid:  "#EF4444",
  warn:    "#D97706",  warnLt:  "#FEF3C7",  warnDk:  "#92400E",
  info:    "#2563EB",  infoLt:  "#DBEAFE",
  pur:     "#7C3AED",  purLt:   "#EDE9FE",
  // Status
  stEin:   "#F59E0B",  stEinBg: "#FFFBEB",
  stArb:   "#3B82F6",  stArbBg: "#EFF6FF",
  stQual:  "#8B5CF6",  stQualBg:"#F5F3FF",
  stBer:   "#10B981",  stBerBg: "#ECFDF5",
  stZur:   "#F97316",  stZurBg: "#FFF7ED",
  stEin2:  "#0EA5E9",  stEin2Bg:"#F0F9FF",
  stArch:  "#6B7280",  stArchBg:"#F9FAFB",
};

// ═══════════════════════════════════════════════════════════════════════
// § CSS SYSTEM — Apple Premium
// ═══════════════════════════════════════════════════════════════════════
const CSS = `
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  html,body,#root{margin:0;padding:0;height:100%;overscroll-behavior:none;}  body{position:fixed;width:100%;height:100%;overflow:hidden;}
  body{font-family:-apple-system,'SF Pro Text','Helvetica Neue',sans-serif;background:${C.cream};color:${C.ink};}
  input,textarea,select,button{font-family:inherit;}
  ::-webkit-scrollbar{display:none;}

  /* ── Keyframes ─────────────────────────────────────────── */
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes springIn{
    0%{opacity:0;transform:scale(0.88) translateY(14px)}
    60%{opacity:1;transform:scale(1.02) translateY(-2px)}
    100%{opacity:1;transform:scale(1) translateY(0)}
  }
  @keyframes springUp{
    0%{transform:translateY(110%)}
    65%{transform:translateY(-5px)}
    100%{transform:translateY(0)}
  }
  @keyframes popIn{
    0%{opacity:0;transform:scale(0.7)}
    65%{transform:scale(1.1)}
    100%{opacity:1;transform:scale(1)}
  }
  @keyframes slideRight{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}
  @keyframes slideLeft{from{opacity:0;transform:translateX(-32px)}to{opacity:1;transform:translateX(0)}}
  @keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
  @keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.018)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.42}}
  @keyframes missedPulse{0%,100%{background:${C.err}}50%{background:#B91C1C}}
  @keyframes badgePop{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}

  /* ── Utility classes ──────────────────────────────────── */
  .fade-up   {animation:fadeUp    .32s cubic-bezier(.22,1,.36,1) both}
  .spring-in {animation:springIn  .38s cubic-bezier(.22,1,.36,1) both}
  .slide-up  {animation:springUp  .36s cubic-bezier(.22,1,.36,1) both}
  .slide-r   {animation:slideRight .3s cubic-bezier(.22,1,.36,1) both}
  .slide-l   {animation:slideLeft  .3s cubic-bezier(.22,1,.36,1) both}
  .pop-in    {animation:popIn     .34s cubic-bezier(.22,1,.36,1) both}

  .skeleton{
    background:linear-gradient(90deg,${C.sand} 25%,${C.parch} 50%,${C.sand} 75%);
    background-size:1200px 100%;
    animation:shimmer 1.6s ease-in-out infinite;
    border-radius:10px;
  }

  .btn-press{
    -webkit-touch-callout:none;
    transition:transform .12s cubic-bezier(.22,1,.36,1),opacity .12s cubic-bezier(.22,1,.36,1);
  }
  .btn-press:active{transform:scale(0.95);opacity:0.8;}

  .card-press{
    transition:transform .16s cubic-bezier(.22,1,.36,1),box-shadow .16s cubic-bezier(.22,1,.36,1);
    cursor:pointer;
  }
  .card-press:active{transform:scale(0.97);box-shadow:0 1px 6px rgba(28,25,23,0.07)!important;}

  input:focus,textarea:focus{
    outline:none;
    border-color:${C.sage}!important;
    box-shadow:0 0 0 3px ${C.sage}22!important;
    transition:border-color .15s,box-shadow .15s;
  }

  /* ── iOS specifics ──────────────────────────────────── */
  input,textarea,select{-webkit-appearance:none;appearance:none;}
  input[type="text"],input[type="date"],input[type="search"],textarea{font-size:16px!important;}
  .scroll-view{-webkit-overflow-scrolling:touch;overflow-y:auto;overscroll-behavior-y:contain;scroll-behavior:smooth;}
`;

// ═══════════════════════════════════════════════════════════════════════
// § STATUS SYSTEM — vollständig mit 7 Status
// ═══════════════════════════════════════════════════════════════════════
const STATUS_LIST = [
  "Eingang", "In Arbeit", "Qualitätskontrolle",
  "Bereit", "Zurückgeschickt", "Eingesetzt", "Archiviert"
];

const STATUS_META = {
  "Eingang":           { dot: C.stEin,  bg: C.stEinBg,  text: "#92400E",  icon: "📥", desc: "Neu eingegangen" },
  "In Arbeit":         { dot: C.stArb,  bg: C.stArbBg,  text: "#1D4ED8",  icon: "🔧", desc: "Wird bearbeitet" },
  "Qualitätskontrolle":{ dot: C.stQual, bg: C.stQualBg, text: "#6D28D9",  icon: "🔍", desc: "Qualität prüfen" },
  "Bereit":            { dot: C.stBer,  bg: C.stBerBg,  text: "#14532D",  icon: "✅", desc: "Bereit zur Einprobe" },
  "Zurückgeschickt":   { dot: C.stZur,  bg: C.stZurBg,  text: "#C2410C",  icon: "↩️", desc: "Vom Zahnarzt zurück" },
  "Eingesetzt":        { dot: C.stEin2, bg: C.stEin2Bg, text: "#0369A1",  icon: "🦷", desc: "Beim Patienten" },
  "Archiviert":        { dot: C.stArch, bg: C.stArchBg, text: C.fog,      icon: "📦", desc: "Abgeschlossen" },
};
const getStatus = s => STATUS_META[s] || { dot: C.fog, bg: C.parch, text: C.ink, icon: "●", desc: "" };

const PAY_META = {
  offen:       { color: C.warn,  bg: C.warnLt,  icon: "⏳", label: "Offen" },
  bezahlt:     { color: C.ok,    bg: C.okLt,    icon: "✅", label: "Bezahlt" },
  teilbezahlt: { color: C.info,  bg: C.infoLt,  icon: "◑",  label: "Teilbezahlt" },
  ueberfaellig:{ color: C.err,   bg: C.errLt,   icon: "🔴", label: "Überfällig" },
  storniert:   { color: C.fog,   bg: C.parch,   icon: "✕",  label: "Storniert" },
};
const getPS = k => PAY_META[k] || PAY_META.offen;

// ═══════════════════════════════════════════════════════════════════════
// § UTILS
// ═══════════════════════════════════════════════════════════════════════
const ss    = v => (v == null ? "" : String(v));
const today = () => new Date().toISOString().slice(0, 10);
const genId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const fmtDate = s => {
  if (!s) return "–";
  try { return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(s)); }
  catch { return s; }
};
const fmtTime = s => {
  if (!s) return "";
  try { return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(s)); }
  catch { return ""; }
};
const fmtRelTime = s => {
  if (!s) return "";
  const diff = Date.now() - new Date(s).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1) return "Gerade eben";
  if (min < 60) return `vor ${min} Min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std`;
  return fmtDate(s);
};
const isLate = a => a.faelligkeit && new Date(a.faelligkeit) < new Date() && !["Bereit","Eingesetzt","Archiviert"].includes(ss(a.status));
const isZurueck = a => ss(a.status) === "Zurückgeschickt";

// ═══════════════════════════════════════════════════════════════════════
// § LOCAL STORAGE
// ═══════════════════════════════════════════════════════════════════════
const LS = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v)   => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const getPinOn  = ()  => LS.get("pinOn", false); // PIN off by default — Supabase Auth is the real gate
const getUser   = ()  => LS.get("user", null);
const getDark   = ()  => LS.get("dark", false);
const setDark   = v   => LS.set("dark", v);
const getSmsVl  = ()  => LS.get("smsVl", [
  { id:"1", name:"Bereit",      text:"Ihr Zahnersatz ist fertig! Bitte vereinbaren Sie einen Einprobetermin." },
  { id:"2", name:"In Arbeit",   text:"Ihr Auftrag wird gerade bearbeitet. Wir melden uns bei Ihnen." },
]);
const getNotifs  = ()  => LS.get("notifs", []);
const setNotifs  = v   => LS.set("notifs", v);

// ═══════════════════════════════════════════════════════════════════════
// § MONITOR
// ═══════════════════════════════════════════════════════════════════════
const Monitor = {
  init:  () => {},
  error: (e, ctx) => console.error("[App]", ctx || "", e?.message || e),
  warn:  (msg)    => console.warn("[App]", msg),
};

// ═══════════════════════════════════════════════════════════════════════
// § SOUND + PUSH
// ═══════════════════════════════════════════════════════════════════════
let _soundTimer = null;
let _soundOn    = false;

function startAlertSound() {
  if (_soundOn) return;
  _soundOn = true;
  const beep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.22].forEach(off => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.setValueAtTime(880, ctx.currentTime + off);
        g.gain.setValueAtTime(0.14, ctx.currentTime + off);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + off + 0.18);
        o.start(ctx.currentTime + off); o.stop(ctx.currentTime + off + 0.18);
      });
    } catch {}
  };
  beep();
  _soundTimer = setInterval(beep, 8000);
}

function stopAlertSound() {
  if (_soundTimer) { clearInterval(_soundTimer); _soundTimer = null; }
  _soundOn = false;
}

function pushNotif(title, body, tag = "general") {
  // Add to in-app notifications
  const notifs = getNotifs();
  notifs.unshift({ id: genId(), title, body, tag, ts: new Date().toISOString(), read: false });
  setNotifs(notifs.slice(0, 50));
  // OS push
  try {
    if (Notification.permission === "granted") new Notification(title, { body, icon: "/icon-192.png", tag });
  } catch {}
}

// ── urlBase64ToUint8Array helper for VAPID key ────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

// ── Save or update push subscription in Supabase ──────────────
async function savePushSubscription(sub, userInfo) {
  try {
    const session = (() => { try { return JSON.parse(localStorage.getItem("sb_session") || "null"); } catch { return null; } })();
    if (!session?.access_token) return;
    const subJson = sub.toJSON();
    const payload = {
      user_id:      session.user.id,
      user_name:    userInfo?.name || userInfo?.email || "",
      role:         userInfo?.rolle || "praxis",
      endpoint:     subJson.endpoint,
      subscription: subJson,
      platform:     /iphone|ipad/i.test(navigator.userAgent) ? "ios" : /android/i.test(navigator.userAgent) ? "android" : "web",
      device_label: navigator.userAgent.slice(0, 80),
      is_active:    true,
      last_seen_at: new Date().toISOString(),
    };
    // Upsert by endpoint
    await fetch(`${SB_URL}/rest/v1/push_subscriptions`, {
      method:  "POST",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    });
    console.log("[Push] Subscription gespeichert");
  } catch(e) {
    console.warn("[Push] Subscription speichern fehlgeschlagen:", e.message);
  }
}

// ── Main push setup ───────────────────────────────────────────
async function askPush(userInfo) {
  try {
    // 1. Check browser support
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // 2. Request permission
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") return;

    // 3. Wait for service worker
    const registration = await navigator.serviceWorker.ready;

    // 4. Subscribe to push
    const existing = await registration.pushManager.getSubscription();
    let sub = existing;
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(PUSH_KEY),
      });
      console.log("[Push] Neue Subscription erstellt");
    } else {
      console.log("[Push] Bestehende Subscription gefunden");
    }

    // 5. Save to Supabase
    await savePushSubscription(sub, userInfo);

  } catch(e) {
    console.warn("[Push] Setup fehlgeschlagen:", e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// § SUPABASE API
// ═══════════════════════════════════════════════════════════════════════
const sbReq = async (path, opts = {}) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...opts.headers,
    },
    method: opts.method || "GET",
    body:   opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`); }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("json") ? res.json() : null;
};

const DB = {
  auftraege: {
    list:   ()      => sbReq("auftraege?order=eingang.desc&limit=300"),
    get:    id      => sbReq(`auftraege?id=eq.${id}`).then(r => r?.[0]),
    insert: body    => sbReq("auftraege", { method: "POST", body }),
    update: (id, b) => sbReq(`auftraege?id=eq.${id}`, { method: "PATCH", body: b }),
  },
  nachrichten: {
    byOrder: aid    => sbReq(`nachrichten?auftrag_id=eq.${aid}&order=erstellt_am.asc&limit=300`),
    recent:  ()     => sbReq("nachrichten?order=erstellt_am.desc&limit=600"),
    insert:  body   => sbReq("nachrichten", { method: "POST", body }),
    markRead:(id,n) => sbReq(`nachrichten?id=eq.${id}`, { method: "PATCH", body: { gelesen_von: n } }),
  },
  patienten: {
    list:   ()      => sbReq("patienten?order=name.asc&limit=500"),
    insert: body    => sbReq("patienten", { method: "POST", body }),
    update: (id, b) => sbReq(`patienten?id=eq.${id}`, { method: "PATCH", body: b }),
    del:    id      => sbReq(`patienten?id=eq.${id}`, { method: "DELETE" }),
  },
  documents: {
    list:   qs      => sbReq(`documents?${qs || "order=created_at.desc&limit=100"}`),
    insert: body    => sbReq("documents", { method: "POST", body }),
    update: (id, b) => sbReq(`documents?id=eq.${id}`, { method: "PATCH", body: b }),
  },
  docItems: {
    insert: body    => sbReq("document_items", { method: "POST", body }),
    byDoc:  id      => sbReq(`document_items?document_id=eq.${id}`),
  },
  materials: {
    list:   ()      => sbReq("materials?order=name.asc&limit=500"),
    update: (id, b) => sbReq(`materials?id=eq.${id}`, { method: "PATCH", body: b }),
  },
  mappings: {
    list:   ()      => sbReq("material_mappings?limit=1000"),
    insert: body    => sbReq("material_mappings", { method: "POST", body }),
  },
  invMoves: {
    insert: body    => sbReq("inventory_movements", { method: "POST", body }),
    list:   mid     => sbReq(`inventory_movements?material_id=eq.${mid}&order=created_at.desc&limit=50`),
  },
  storage: {
    upload: async (file, bucket = "fotos") => {
      const ext  = (file.name || "file").split(".").pop() || "jpg";
      const path = `${genId()}.${ext}`;
      const res  = await fetch(`${SB_URL}/storage/v1/object/${bucket}/${path}`, {
        method: "POST",
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload fehlgeschlagen");
      return `${bucket}/${path}`; // store path, not public URL;
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════
// § NORMALIZE
// ═══════════════════════════════════════════════════════════════════════
// ── Signed URL helper ─────────────────────────────────────────
const getPhotoUrl = async (pathOrUrl, bucket = "fotos", expires = 3600) => {
  // Old public URLs pass through unchanged
  if (pathOrUrl && (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://"))) return pathOrUrl;
  if (!pathOrUrl) return null;
  // New paths → signed URL
  try {
    const cleanPath = pathOrUrl.replace(`${bucket}/`, "");
    const session = (() => { try { return JSON.parse(localStorage.getItem("sb_session") || "null"); } catch { return null; } })();
    const token = session?.access_token || SB_KEY;
    const res = await fetch(`${SB_URL}/storage/v1/object/sign/${bucket}/${cleanPath}`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: expires }),
    });
    if (!res.ok) return pathOrUrl;
    const data = await res.json();
    return `${SB_URL}/storage/v1${data.signedURL}`;
  } catch { return pathOrUrl; }
};

const normA = a => ({
  ...a,
  fotos:   (() => { try { return JSON.parse(a.fotos || "[]"); } catch { return []; } })(),
  verlauf: (() => { try { return JSON.parse(a.verlauf || "[]"); } catch { return []; } })(),
});

// ═══════════════════════════════════════════════════════════════════════
// § FUZZY MATCH
// ═══════════════════════════════════════════════════════════════════════
function fuzzyMatch(raw, materials) {
  if (!raw || !materials?.length) return null;
  const norm  = s => ss(s).toLowerCase().replace(/[^a-z0-9äöüß]/g, " ").replace(/\s+/g, " ").trim();
  const toks  = s => new Set(norm(s).split(" ").filter(t => t.length > 2));
  const rT    = toks(raw);
  let best = null, bestScore = 0;
  materials.forEach(m => {
    const mT = toks(m.name);
    const inter = [...rT].filter(t => mT.has(t)).length;
    const score = inter / Math.max(rT.size, mT.size, 1);
    if (score > bestScore && score > 0.35) { bestScore = score; best = { ...m, score }; }
  });
  return best;
}

// ═══════════════════════════════════════════════════════════════════════
// § SWIPE-TO-GO-BACK
// ═══════════════════════════════════════════════════════════════════════
function useSwipeBack(onBack, enabled = true) {
  const startX = useRef(null); const startY = useRef(null);
  const drag   = useRef(false); const elRef  = useRef(null);
  const EDGE = 32, MIN = 65, MAX_ANGLE = 35;

  useEffect(() => {
    if (!enabled) return;
    const el = elRef.current; if (!el) return;

    const onTS = e => {
      const t = e.touches[0];
      if (t.clientX > EDGE) { startX.current = null; return; }
      startX.current = t.clientX; startY.current = t.clientY; drag.current = false;
    };
    const onTM = e => {
      if (startX.current === null) return;
      const t = e.touches[0];
      const dx = t.clientX - startX.current, dy = t.clientY - startY.current;
      const angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
      if (!drag.current && angle > MAX_ANGLE && angle < 180 - MAX_ANGLE) { startX.current = null; return; }
      if (dx > 8) {
        drag.current = true;
        if (dx < 220) { el.style.transform = `translateX(${dx * 0.56}px)`; el.style.opacity = `${1 - dx / 520}`; }
      }
    };
    const onTE = e => {
      if (!drag.current || startX.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      el.style.transition = "transform .28s cubic-bezier(.22,1,.36,1),opacity .28s cubic-bezier(.22,1,.36,1)";
      el.style.transform = "translateX(0)"; el.style.opacity = "1";
      setTimeout(() => { if (el) { el.style.transition = el.style.transform = el.style.opacity = ""; } }, 300);
      if (dx >= MIN) {
        el.style.transition = "transform .2s cubic-bezier(.4,0,1,1),opacity .2s ease";
        el.style.transform = "translateX(100%)"; el.style.opacity = "0";
        setTimeout(onBack, 190);
      }
      startX.current = null; drag.current = false;
    };

    el.addEventListener("touchstart", onTS, { passive: true });
    el.addEventListener("touchmove",  onTM, { passive: true });
    el.addEventListener("touchend",   onTE, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTS);
      el.removeEventListener("touchmove",  onTM);
      el.removeEventListener("touchend",   onTE);
    };
  }, [onBack, enabled]);
  return elRef;
}

// ═══════════════════════════════════════════════════════════════════════
// § ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════════════
class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  componentDidCatch(e, info) { Monitor.error(e, info.componentStack); }
  render() {
    if (this.state.err) return (
      <div style={{ padding: 40, textAlign: "center", background: C.cream, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: 20, color: C.ink, fontFamily: "Georgia,serif" }}>Fehler aufgetreten</div>
        <div style={{ fontSize: 13, color: C.fog, maxWidth: 280, lineHeight: 1.6 }}>{this.state.err.message}</div>
        <button onClick={() => window.location.reload()} className="btn-press"
          style={{ background: C.sage, color: C.white, border: "none", borderRadius: 14, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          App neu laden
        </button>
      </div>
    );
    return this.props.children;
  }
}


// ═══════════════════════════════════════════════════════════════════════
// § DESIGN PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════

function Spinner({ size = 22, color = C.sage }) {
  return <div style={{ width: size, height: size, border: `2.5px solid ${color}22`, borderTop: `2.5px solid ${color}`, borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />;
}

function Toast({ msg, type = "ok" }) {
  if (!msg) return null;
  const bg = type === "err" ? C.err : type === "warn" ? C.warn : C.ok;
  return (
    <div style={{ position: "fixed", top: "env(safe-area-inset-top,20px)", left: "50%", transform: "translateX(-50%)", zIndex: 9990, background: bg, color: C.white, padding: "12px 22px", borderRadius: 16, fontSize: 14, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", whiteSpace: "nowrap", animation: "springIn .3s cubic-bezier(.22,1,.36,1)" }}>
      {msg}
    </div>
  );
}

function OfflineBanner({ show }) {
  if (!show) return null;
  return <div style={{ background: C.err, color: C.white, padding: "10px 20px", textAlign: "center", fontSize: 13, fontWeight: 600, position: "sticky", top: 0, zIndex: 800 }}>📡 Keine Verbindung — wird automatisch wiederhergestellt</div>;
}

function Card({ children, onClick, style, pad = 16, radius = 18 }) {
  return (
    <div onClick={onClick} className={onClick ? "card-press" : ""}
      style={{ background: C.white, borderRadius: radius, boxShadow: "0 2px 14px rgba(28,25,23,0.07)", padding: pad, ...style }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value, accent, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: last ? "none" : `1px solid ${C.sand}` }}>
      <span style={{ fontSize: 13, color: C.fog, fontWeight: 500, flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 14, color: accent || C.ink, fontWeight: 600, textAlign: "right" }}>{value || "–"}</span>
    </div>
  );
}

function StatusBadge({ status, small }) {
  const sm = getStatus(status);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: small ? 4 : 5, background: sm.bg, color: sm.text, borderRadius: 20, padding: small ? "3px 8px" : "5px 11px", fontSize: small ? 11 : 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      <span style={{ width: small ? 5 : 6, height: small ? 5 : 6, borderRadius: "50%", background: sm.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

function EmptyState({ icon, title, sub, cta, onCta }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 32px", gap: 12, textAlign: "center" }}>
      <div style={{ fontSize: 52, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 19, color: C.ink, fontFamily: "Georgia,serif" }}>{title}</div>
      {sub && <div style={{ fontSize: 14, color: C.fog, lineHeight: 1.6, maxWidth: 260 }}>{sub}</div>}
      {cta && <button onClick={onCta} className="btn-press" style={{ marginTop: 8, background: C.sage, color: C.white, border: "none", borderRadius: 14, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{cta}</button>}
    </div>
  );
}

function Chip({ label, active, onClick, dot, count }) {
  return (
    <button onClick={onClick} className="btn-press"
      style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${active ? C.sage : C.sand}`, background: active ? C.sage : C.white, color: active ? C.white : C.inkMd, fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", transition: "all .15s" }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: active ? C.white : dot, flexShrink: 0 }} />}
      {label}
      {count > 0 && <span style={{ background: active ? "rgba(255,255,255,0.3)" : C.sage, color: active ? C.white : C.white, borderRadius: 20, fontSize: 11, padding: "1px 6px", fontWeight: 800 }}>{count}</span>}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § SHEET (iOS Bottom Sheet — scroll fixed)
// ═══════════════════════════════════════════════════════════════════════
function Sheet({ onClose, children, title, maxHeight = "92vh" }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(28,25,23,0.55)", animation: "fadeIn .22s" }} />
      <div className="slide-up" style={{ position: "relative", background: C.white, borderRadius: "26px 26px 0 0", maxHeight, overflow: "visible", display: "flex", flexDirection: "column", paddingBottom: "env(safe-area-inset-bottom, 0px)", boxShadow: "0 -10px 60px rgba(28,25,23,0.2)" }}>
        {/* Clip corners without blocking scroll */}
        <div style={{ position: "absolute", inset: 0, borderRadius: "26px 26px 0 0", overflow: "hidden", pointerEvents: "none", zIndex: 0 }} />
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 6, flexShrink: 0, position: "relative", zIndex: 1 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.sand }} />
        </div>
        {/* Title */}
        {title && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 14px", flexShrink: 0, position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.ink, fontFamily: "Georgia,serif", letterSpacing: "-0.3px" }}>{title}</div>
            <button onClick={onClose} className="btn-press" style={{ background: C.parch, border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.fog }}>✕</button>
          </div>
        )}
        {/* Scroll area */}
        <div className="scroll-view" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", maxHeight: `calc(${maxHeight} - 80px)`, padding: "0 20px 20px", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", position: "relative", zIndex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § FORM INPUT (module-level to prevent keyboard remount bug)
// ═══════════════════════════════════════════════════════════════════════
// Lazy signed URL image component
function SignedImg({ path, style, onClick }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getPhotoUrl(path).then(url => { if (!cancelled) setSrc(url); });
    return () => { cancelled = true; };
  }, [path]);
  if (!src) return <div style={{ ...style, background: "#E7E5E4", display: "flex", alignItems: "center", justifyContent: "center" }}>⏳</div>;
  return <img src={src} alt="" style={style} onClick={onClick} />;
}

function FormInput({ label, value, onChange, type = "text", required, placeholder, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.fog, textTransform: "uppercase", letterSpacing: "0.6px" }}>
        {label}{required && <span style={{ color: C.err }}> *</span>}
      </label>
      <input value={value} onChange={e => onChange(e.target.value)} type={type}
        placeholder={placeholder || ""} autoComplete="off" autoCorrect="off"
        autoCapitalize={type === "text" ? "words" : "off"} spellCheck={false}
        style={{ background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 14, padding: "14px 16px", fontSize: 16, color: C.ink, width: "100%", boxSizing: "border-box", boxShadow: "0 1px 4px rgba(28,25,23,0.05)" }} />
      {hint && <div style={{ fontSize: 12, color: C.fog, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § PIN PAD — Apple Lock Screen style
// ═══════════════════════════════════════════════════════════════════════
function PinPad({ onSubmit, error, dark }) {
  const [pin,   setPin]   = useState("");
  const [shake, setShake] = useState(false);
  const maxLen = 6;

  useEffect(() => {
    if (error) { setShake(true); setTimeout(() => { setShake(false); setPin(""); }, 440); }
  }, [error]);

  const press = d => {
    if (pin.length >= maxLen) return;
    const np = pin + d; setPin(np);
    if (np.length >= 4) setTimeout(() => onSubmit(np), 140);
  };
  const del = () => setPin(p => p.slice(0, -1));

  const btnBg    = dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.85)";
  const btnPress = dark ? "rgba(255,255,255,0.07)" : "rgba(200,200,200,0.7)";
  const dotFill  = dark ? C.white : C.ink;
  const dotEmpty = dark ? "rgba(255,255,255,0.22)" : C.sand;
  const numClr   = dark ? C.white : C.ink;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36, userSelect: "none" }}>
      {/* Dots */}
      <div style={{ display: "flex", gap: 20, animation: shake ? "shake .44s cubic-bezier(.36,.07,.19,.97)" : undefined }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < pin.length ? dotFill : "transparent", border: `2px solid ${i < pin.length ? dotFill : dotEmpty}`, transition: "all .14s cubic-bezier(.22,1,.36,1)", transform: i < pin.length ? "scale(1.12)" : "scale(1)" }} />
        ))}
      </div>
      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 80px)", gridTemplateRows: "repeat(4, 80px)", gap: 14 }}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d, i) => {
          const isEmpty = d === ""; const isDel = d === "⌫";
          return (
            <button key={i}
              onTouchStart={e => { if (!isEmpty) { e.currentTarget.style.background = btnPress; e.currentTarget.style.transform = "scale(0.91)"; } }}
              onTouchEnd={e => { e.currentTarget.style.background = isEmpty ? "transparent" : btnBg; e.currentTarget.style.transform = "scale(1)"; }}
              onMouseDown={e => { if (!isEmpty) { e.currentTarget.style.background = btnPress; e.currentTarget.style.transform = "scale(0.91)"; } }}
              onMouseUp={e => { e.currentTarget.style.background = isEmpty ? "transparent" : btnBg; e.currentTarget.style.transform = "scale(1)"; }}
              onClick={() => isDel ? del() : !isEmpty ? press(String(d)) : null}
              style={{ width: 80, height: 80, borderRadius: "50%", background: isEmpty ? "transparent" : btnBg, border: "none", backdropFilter: isEmpty ? "none" : "blur(12px)", WebkitBackdropFilter: isEmpty ? "none" : "blur(12px)", boxShadow: isEmpty ? "none" : dark ? "0 2px 10px rgba(0,0,0,0.22)" : "0 2px 14px rgba(0,0,0,0.1)", fontSize: isDel ? 22 : 30, fontWeight: isDel ? 400 : 300, color: numClr, cursor: isEmpty ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .1s,background .1s", fontFamily: "-apple-system,'SF Pro Display','Helvetica Neue',sans-serif" }}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § LOGIN SCREEN — Premium Apple style
// ═══════════════════════════════════════════════════════════════════════
function AuthLoginScreen({ onAuthSuccess }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setErr("E-Mail und Passwort eingeben"); return; }
    setLoading(true); setErr(null);
    try {
      const session = await sbAuth.signIn(email.trim(), password.trim());
      sbAuth.setSession(session);
      onAuthSuccess(session);
    } catch(e) { setErr(e.message || "Login fehlgeschlagen"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(175deg,${C.brand} 0%,#3D2823 45%,#2C3E35 100%)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 28px" }}>
      <style>{CSS}</style>
      <div style={{ fontSize:56, marginBottom:16 }}>🦷</div>
      <div style={{ color:C.white, fontSize:28, fontWeight:700, fontFamily:"Georgia,serif", marginBottom:6 }}>Mothe App</div>
      <div style={{ color:"rgba(255,255,255,0.45)", fontSize:14, marginBottom:44 }}>Die 3 Zahnärzte by Mahal</div>
      <div style={{ width:"100%", maxWidth:340, display:"flex", flexDirection:"column", gap:14 }}>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="E-Mail" autoCapitalize="none"
          style={{ background:"rgba(255,255,255,0.12)", border:"1.5px solid rgba(255,255,255,0.18)", borderRadius:16, padding:"16px 18px", fontSize:16, color:C.white, fontFamily:"inherit", outline:"none" }} />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Passwort"
          onKeyDown={e=>{ if(e.key==="Enter") handleLogin(); }}
          style={{ background:"rgba(255,255,255,0.12)", border:"1.5px solid rgba(255,255,255,0.18)", borderRadius:16, padding:"16px 18px", fontSize:16, color:C.white, fontFamily:"inherit", outline:"none" }} />
        {err && <div style={{ background:"rgba(220,38,38,0.2)", border:"1px solid rgba(220,38,38,0.4)", borderRadius:12, padding:"12px 16px", color:"#FCA5A5", fontSize:14, fontWeight:600 }}>{err}</div>}
        <button onClick={handleLogin} disabled={loading}
          style={{ background:loading?`rgba(122,158,142,0.5)`:`linear-gradient(135deg,${C.sage},${C.sageDk})`, color:C.white, border:"none", borderRadius:16, padding:"17px", fontSize:17, fontWeight:700, cursor:loading?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
          {loading ? "Anmelden…" : "Anmelden"}
        </button>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [step,   setStep]   = useState("pin");
  const [pinErr, setPinErr] = useState(false);
  const ROLES = [
    { key: "Zahnarzt",         icon: "🦷", desc: "Aufträge · Patienten · Chat" },
    { key: "Techniker",        icon: "🔧", desc: "Labor · Fotos · Status · Material" },
    { key: "Assistenz",        icon: "💼", desc: "Verwaltung · Patienten · Belege" },
    { key: "Geschäftsleitung", icon: "🏥", desc: "Vollzugriff · Analyse · Kosten" },
  ];

  const handlePin = pin => {
    if (pin === LS.get("pin", "1234") || pin === "1234") {
      const ex = getUser();
      if (ex?.name) { onLogin(ex); return; }
      setStep("role");
    } else { setPinErr(true); setTimeout(() => setPinErr(false), 900); }
  };
  const handleRole = r => {
    const u = { name: r === "Zahnarzt" ? "Dr. Mahal" : r, rolle: r };
    LS.set("user", u); onLogin(u);
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(175deg, ${C.brand} 0%, #3D2823 45%, #2C3E35 100%)`, display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top, 44px)", paddingBottom: "env(safe-area-inset-bottom, 34px)", paddingLeft: 24, paddingRight: 24, overflowY: "auto" }}>
      {/* Logo */}
      <div style={{ flex: step === "pin" ? 1 : 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: step === "pin" ? 0 : 36, paddingBottom: step === "pin" ? 0 : 28, animation: "fadeUp .5s cubic-bezier(.22,1,.36,1)" }}>
        <div style={{ width: 90, height: 90, borderRadius: 28, background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, marginBottom: 20, boxShadow: "0 12px 52px rgba(0,0,0,0.32)" }}>🦷</div>
        <div style={{ color: C.white, fontSize: 30, fontWeight: 700, fontFamily: "Georgia,serif", letterSpacing: "-0.6px", marginBottom: 6 }}>Mothe App</div>
        <div style={{ color: "rgba(255,255,255,0.42)", fontSize: 14, letterSpacing: "0.3px" }}>Die 3 Zahnärzte by Mahal</div>
      </div>

      {step === "pin" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 48, animation: "fadeUp .38s cubic-bezier(.22,1,.36,1) .06s both" }}>
          <div style={{ marginBottom: 36, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {pinErr
              ? <div style={{ color: "#FCA5A5", fontSize: 16, fontWeight: 600, animation: "shake .44s cubic-bezier(.36,.07,.19,.97)" }}>Falscher PIN — erneut versuchen</div>
              : <div style={{ color: "rgba(255,255,255,0.52)", fontSize: 16, letterSpacing: "0.2px" }}>PIN eingeben</div>}
          </div>
          <PinPad onSubmit={handlePin} error={pinErr} dark={true} />
        </div>
      )}

      {step === "role" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", animation: "springIn .3s cubic-bezier(.22,1,.36,1)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ color: C.white, fontSize: 24, fontWeight: 700, fontFamily: "Georgia,serif", marginBottom: 8 }}>Willkommen!</div>
            <div style={{ color: "rgba(255,255,255,0.48)", fontSize: 15 }}>Wähle deine Rolle</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ROLES.map(r => (
              <button key={r.key} onClick={() => handleRole(r.key)} className="btn-press"
                style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", color: C.white, textAlign: "left", fontFamily: "inherit", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                onTouchStart={e => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; e.currentTarget.style.transform = "scale(0.98)"; }}
                onTouchEnd={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "scale(1)"; }}>
                <span style={{ fontSize: 32, width: 44, textAlign: "center", flexShrink: 0 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 3 }}>{r.key}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{r.desc}</div>
                </div>
                <span style={{ color: "rgba(255,255,255,0.32)", fontSize: 22 }}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ textAlign: "center", paddingTop: 20, color: "rgba(255,255,255,0.18)", fontSize: 12 }}>Mothe App v3.0 · Premium</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § STATUS SHEET — alle 7 Status mit Icon + Beschreibung
// ═══════════════════════════════════════════════════════════════════════
function StatusSheet({ current, onSelect, onClose }) {
  return (
    <Sheet onClose={onClose} title="Status ändern">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {STATUS_LIST.map(s => {
          const sm = getStatus(s); const isActive = s === current;
          return (
            <button key={s} onClick={() => { onSelect(s); onClose(); }} className="btn-press"
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: isActive ? sm.bg : C.parch, border: `2px solid ${isActive ? sm.dot : "transparent"}`, borderRadius: 18, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: isActive ? sm.dot + "22" : C.sand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{sm.icon}</div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 16, fontWeight: isActive ? 700 : 500, color: isActive ? sm.text : C.ink }}>{s}</div>
                <div style={{ fontSize: 12, color: C.fog, marginTop: 2 }}>{sm.desc}</div>
              </div>
              {isActive && <div style={{ width: 24, height: 24, borderRadius: "50%", background: sm.dot, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 13, fontWeight: 800, flexShrink: 0, animation: "popIn .25s cubic-bezier(.22,1,.36,1)" }}>✓</div>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § PAYMENT SHEET
// ═══════════════════════════════════════════════════════════════════════
function PaymentSheet({ current, onSelect, onClose }) {
  return (
    <Sheet onClose={onClose} title="Zahlungsstatus ändern">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(PAY_META).map(([k, ps]) => {
          const isActive = k === current;
          return (
            <button key={k} onClick={() => { onSelect(k); onClose(); }} className="btn-press"
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: isActive ? ps.bg : C.parch, border: `2px solid ${isActive ? ps.color : "transparent"}`, borderRadius: 18, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
              <span style={{ fontSize: 24, width: 36, textAlign: "center", flexShrink: 0 }}>{ps.icon}</span>
              <span style={{ flex: 1, fontSize: 16, fontWeight: isActive ? 700 : 500, color: isActive ? ps.color : C.ink, textAlign: "left" }}>{ps.label}</span>
              {isActive && <span style={{ color: ps.color, fontWeight: 800, fontSize: 18 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § FOTO SHEET
// ═══════════════════════════════════════════════════════════════════════
function FotoSheet({ auftragId, onClose, onUploaded }) {
  const [prog, setProg] = useState(0); const [uploading, setUploading] = useState(false); const [err, setErr] = useState(null);
  const camRef = useRef(); const galRef = useRef();

  const handleFile = async f => {
    if (!f) return;
    setUploading(true); setErr(null); setProg(15);
    let attempt = 0;
    while (attempt < 3) {
      try {
        setProg(30 + attempt * 20);
        const url = await DB.storage.upload(f);
        setProg(90);
        if (auftragId && isConf()) {
          const a = await DB.auftraege.get(auftragId);
          const fotos = (() => { try { return JSON.parse(a?.fotos || "[]"); } catch { return []; } })();
          await DB.auftraege.update(auftragId, { fotos: JSON.stringify([...fotos, url]) });
        }
        setProg(100);
        setTimeout(() => { onUploaded?.(url); onClose(); }, 350);
        return;
      } catch { attempt++; if (attempt >= 3) setErr(`Upload fehlgeschlagen (3 Versuche)`); }
    }
    setUploading(false);
  };

  return (
    <Sheet onClose={onClose} title="Foto hinzufügen">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <button onClick={() => camRef.current?.click()} className="btn-press"
          style={{ background: `linear-gradient(135deg,${C.sage},${C.sageDk})`, color: C.white, border: "none", borderRadius: 18, padding: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 17, fontWeight: 700, cursor: "pointer", boxShadow: `0 6px 24px ${C.sage}44` }}>
          📷 Kamera öffnen
        </button>
        <button onClick={() => galRef.current?.click()} className="btn-press"
          style={{ background: C.white, color: C.ink, border: `1.5px solid ${C.sand}`, borderRadius: 18, padding: "18px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
          🖼 Aus Galerie wählen
        </button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        <input ref={galRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        {uploading && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 6, background: C.sand, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", background: C.sage, width: `${prog}%`, transition: "width .3s", borderRadius: 3 }} />
            </div>
            <div style={{ textAlign: "center", fontSize: 13, color: C.fog, marginTop: 8 }}>Wird hochgeladen… {prog}%</div>
          </div>
        )}
        {err && <div style={{ color: C.err, fontSize: 14, fontWeight: 600, textAlign: "center", padding: "12px 16px", background: C.errLt, borderRadius: 12 }}>{err}</div>}
      </div>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § SMS SHEET
// ═══════════════════════════════════════════════════════════════════════
function SmsSheet({ auftrag, onClose }) {
  const vl = getSmsVl();
  const [text,      setText]     = useState(vl[0]?.text || "");
  const [phoneInput,setPhoneInput]= useState(ss(auftrag?.telefon || auftrag?.zahnarzt_telefon));
  const [sending,   setSending]  = useState(false);
  const [sent,      setSent]     = useState(false);
  const [err,       setErr]      = useState(null);

  const send = async () => {
    if (!text.trim()) return;
    if (!phoneInput.trim()) { setErr("Bitte Telefonnummer eingeben"); return; }
    setSending(true); setErr(null);
    try {
      const res = await fetch("/.netlify/functions/send-sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: phoneInput.trim(), message: text }) });
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data.error || "Fehler");
      setSent(true); setTimeout(onClose, 2000);
    } catch(e) { setErr(e.message || "SMS konnte nicht gesendet werden — Verbindung prüfen"); }
    setSending(false);
  };

  return (
    <Sheet onClose={onClose} title="SMS senden">
      {sent ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ fontSize: 56, animation: "popIn .4s cubic-bezier(.22,1,.36,1)", marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 19, color: C.ok, fontFamily: "Georgia,serif" }}>SMS gesendet!</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {vl.map(v => <button key={v.id} onClick={() => setText(v.text)} className="btn-press" style={{ flexShrink: 0, padding: "8px 14px", background: C.sageLt, color: C.sageDk, border: "none", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{v.name}</button>)}
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.fog, textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: 6 }}>Telefonnummer</label>
            <input value={phoneInput} onChange={e => setPhoneInput(e.target.value)}
              type="tel" placeholder="+49170..." inputMode="tel"
              style={{ width: "100%", background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 14, padding: "13px 16px", fontSize: 16, color: C.ink, boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
            style={{ background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 14, padding: "14px 16px", fontSize: 16, color: C.ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box", width: "100%" }} placeholder="Nachricht…" />
          {err && <div style={{ color: C.err, fontSize: 13, fontWeight: 600, padding: "10px 14px", background: C.errLt, borderRadius: 12 }}>{err}</div>}
          <button onClick={send} disabled={sending || !text.trim()} className="btn-press"
            style={{ background: sending ? C.sand : `linear-gradient(135deg,${C.sage},${C.sageDk})`, color: C.white, border: "none", borderRadius: 16, padding: "16px", fontSize: 16, fontWeight: 700, cursor: sending ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: sending ? "none" : `0 6px 24px ${C.sage}44` }}>
            {sending ? <><Spinner size={18} color={C.white} /> Wird gesendet…</> : "📱 SMS senden"}
          </button>
        </div>
      )}
    </Sheet>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// § MISSED BANNER + OVERLAY
// ═══════════════════════════════════════════════════════════════════════
function MissedBanner({ missed, auftraege, onOpen, onDismiss }) {
  const [open, setOpen] = useState(true);
  const [blink, setBlink] = useState(true);
  useEffect(() => { const t = setInterval(() => setBlink(b => !b), 850); return () => clearInterval(t); }, []);
  if (!missed?.length) return null;

  const byOrder = {};
  missed.forEach(m => {
    const aid = ss(m.auftrag_id);
    if (!byOrder[aid]) byOrder[aid] = { msgs: [], a: auftraege.find(x => x.id === aid) };
    byOrder[aid].msgs.push(m);
  });

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 700, background: blink ? C.err : "#B91C1C", transition: "background .45s", boxShadow: "0 4px 24px rgba(220,38,38,0.42)" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", cursor: "pointer" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, animation: "pulse 1s infinite", flexShrink: 0 }}>⚠</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.white, fontWeight: 800, fontSize: 14, fontFamily: "Georgia,serif" }}>{missed.length} verpasste Nachricht{missed.length !== 1 ? "en" : ""}</div>
          <div style={{ color: "rgba(255,255,255,0.68)", fontSize: 12, marginTop: 1 }}>{Object.keys(byOrder).length} Auftrag{Object.keys(byOrder).length !== 1 ? "aufträge" : ""} betroffen</div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 600 }}>{open ? "▲" : "▼"}</div>
      </div>
      {open && (
        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(byOrder).map(([aid, info]) => (
            <div key={aid} onClick={() => { stopAlertSound(); onOpen(aid, info.a); }}
              style={{ background: "rgba(255,255,255,0.14)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", border: "1.5px solid rgba(255,255,255,0.24)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: C.white, fontSize: 13, flexShrink: 0 }}>{info.msgs.length}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.white, fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info.a ? ss(info.a.patient) : `Auftrag ${aid}`}</div>
                <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 11, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmtRelTime(info.msgs[info.msgs.length - 1]?.erstellt_am)} · {ss(info.msgs[info.msgs.length - 1]?.text).slice(0, 45)}</div>
              </div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 12, background: "rgba(0,0,0,0.22)", borderRadius: 8, padding: "4px 10px", flexShrink: 0 }}>Lesen →</div>
            </div>
          ))}
          <button onClick={e => { e.stopPropagation(); stopAlertSound(); onDismiss(); }}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.28)", color: "rgba(255,255,255,0.58)", borderRadius: 9, padding: "7px 14px", cursor: "pointer", fontSize: 12, alignSelf: "flex-end", fontFamily: "inherit" }}>
            Alle als gelesen markieren
          </button>
        </div>
      )}
    </div>
  );
}

function MissedOverlay({ count, onGo, onLater }) {
  if (!count) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9500, background: "rgba(220,38,38,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(4px)", animation: "fadeIn .3s" }}>
      <div style={{ background: C.white, borderRadius: 28, padding: "44px 36px", maxWidth: 340, textAlign: "center", boxShadow: "0 32px 80px rgba(0,0,0,0.36)", animation: "springIn .32s cubic-bezier(.22,1,.36,1)" }}>
        <div style={{ fontSize: 68, marginBottom: 14, animation: "pulse 1s infinite" }}>⚠️</div>
        <div style={{ fontWeight: 800, fontSize: 23, color: C.err, fontFamily: "Georgia,serif", marginBottom: 8 }}>Verpasste Nachrichten</div>
        <div style={{ fontSize: 42, fontWeight: 800, color: C.err, marginBottom: 12, fontFamily: "Georgia,serif" }}>{count}</div>
        <div style={{ fontSize: 14, color: C.inkMd, marginBottom: 28, lineHeight: 1.6 }}>Mitarbeiter warten auf Rückmeldung. Bitte jetzt lesen.</div>
        <button onClick={() => { stopAlertSound(); onGo(); }} className="btn-press"
          style={{ background: `linear-gradient(135deg,${C.err},#B91C1C)`, color: C.white, border: "none", borderRadius: 16, padding: "18px 32px", fontSize: 17, fontWeight: 800, cursor: "pointer", width: "100%", marginBottom: 10, boxShadow: `0 6px 24px ${C.err}55` }}>
          Jetzt lesen →
        </button>
        <button onClick={onLater} style={{ background: "transparent", border: "none", color: C.fog, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>In 5 Minuten erinnern</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § BOTTOM NAV
// ═══════════════════════════════════════════════════════════════════════
function BottomNav({ tab, setTab, unreadCount, missedCount, role }) {
  const isGL = role === "Geschäftsleitung";
  const TABS = [
    { k: "home",      icon: "📋", label: "Aufträge" },
    { k: "chat",      icon: "💬", label: "Chat" },
    { k: "scan",      icon: "📷", label: "Scannen" },
    { k: isGL ? "analysis" : "materials", icon: isGL ? "📊" : "🧪", label: isGL ? "Analyse" : "Material" },
    { k: "more",      icon: "⋯",  label: "Mehr" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(250,250,249,0.94)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: `1px solid ${C.sand}`, display: "flex", paddingBottom: "env(safe-area-inset-bottom, 0px)", zIndex: 600, boxShadow: "0 -1px 0 rgba(0,0,0,0.05)" }}>
      {TABS.map(t => {
        const isActive  = tab === t.k || (t.k === "more" && ["patienten","belege","statistik","settings","notifs"].includes(tab));
        const hasMissed = t.k === "chat" && missedCount > 0;
        const hasUnread = t.k === "chat" && unreadCount > 0 && !hasMissed;
        return (
          <button key={t.k} onTouchEnd={() => setTab(t.k)} onClick={() => setTab(t.k)} className="btn-press"
            style={{ flex: 1, paddingTop: 10, paddingBottom: 8, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", position: "relative", minHeight: 56 }}>
            <div style={{ position: "relative" }}>
              <span style={{ fontSize: 22, filter: isActive ? "none" : "grayscale(0.4) opacity(0.52)", transition: "filter .15s" }}>{t.icon}</span>
              {hasMissed && <div style={{ position: "absolute", top: -5, right: -7, background: C.err, color: C.white, borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, animation: "pulse 1s infinite", border: "2px solid rgba(250,250,249,0.94)" }}>{missedCount}</div>}
              {hasUnread && <div style={{ position: "absolute", top: -5, right: -7, background: C.warn, color: C.white, borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, border: "2px solid rgba(250,250,249,0.94)" }}>{unreadCount}</div>}
            </div>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? C.sage : C.fog, transition: "color .15s" }}>{t.label}</span>
            {isActive && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 28, height: 3, background: C.sage, borderRadius: "0 0 4px 4px" }} />}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § AUFTRAG CARD
// ═══════════════════════════════════════════════════════════════════════
function AuftragCard({ a, unread = 0, onPress, index = 0 }) {
  const late    = isLate(a);
  const zurueck = isZurueck(a);
  const sm      = getStatus(ss(a.status));
  const urgent  = zurueck || late || unread > 0;

  return (
    <div onClick={onPress} className="card-press"
      style={{ background: C.white, borderRadius: 20, padding: "16px 18px", marginBottom: 12, boxShadow: `0 2px 16px rgba(28,25,23,0.08)`, border: `1.5px solid ${zurueck ? C.stZur : late ? C.warn : unread > 0 ? C.err : "transparent"}`, position: "relative", overflow: "hidden", animation: `fadeUp .32s cubic-bezier(.22,1,.36,1) ${index * 45}ms both` }}>
      {/* Status accent left bar */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: sm.dot, borderRadius: "20px 0 0 20px" }} />

      <div style={{ paddingLeft: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: urgent ? (zurueck ? C.stZur : C.err) : C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.2px", fontFamily: "Georgia,serif" }}>
              {ss(a.patient)}
            </div>
            <div style={{ fontSize: 13, color: C.fog, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {ss(a.zahnarzt)} · {ss(a.arbeitstyp)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0, marginLeft: 10 }}>
            <StatusBadge status={ss(a.status)} small />
            {unread > 0 && <div style={{ background: C.err, color: C.white, borderRadius: 12, fontSize: 11, padding: "2px 8px", fontWeight: 800, animation: "pulse 1.5s infinite" }}>⚠ {unread}</div>}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: zurueck ? C.stZur : late ? C.err : C.fog, fontWeight: urgent ? 700 : 400 }}>
            {zurueck ? "↩ Zurückgeschickt — Beachten!" : late ? "⚠ Überfällig" : a.faelligkeit ? `Fällig ${fmtDate(a.faelligkeit)}` : ""}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {a.dringend && <span style={{ fontSize: 11, background: C.errLt, color: C.err, borderRadius: 8, padding: "2px 8px", fontWeight: 700 }}>🔴 Dringend</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § NOTIFICATION CENTER
// ═══════════════════════════════════════════════════════════════════════
function NotifCenter({ onClose }) {
  const [notifs, setNotifs] = useState(getNotifs());
  const swipeRef = useSwipeBack(onClose);

  const markAllRead = () => {
    const updated = notifs.map(n => ({ ...n, read: true }));
    setNotifs(updated); setNotifs(updated);
  };
  const clearAll = () => { setNotifs([]); setNotifs([]); };

  const ICONS = { chat: "💬", status: "📋", material: "🧪", beleg: "📄", system: "ℹ️", general: "🔔" };

  return (
    <div ref={swipeRef} style={{ position: "fixed", inset: 0, zIndex: 2000, background: C.cream, display: "flex", flexDirection: "column", overflow: "hidden", animation: "springIn .34s cubic-bezier(.22,1,.36,1)" }}>
      <div style={{ background: "rgba(250,250,249,0.94)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${C.sand}`, paddingTop: "env(safe-area-inset-top, 44px)", padding: `env(safe-area-inset-top, 44px) 20px 14px`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} className="btn-press" style={{ background: C.parch, border: "none", borderRadius: "50%", width: 38, height: 38, fontSize: 19, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        <div style={{ flex: 1, fontWeight: 700, fontSize: 18, color: C.ink, fontFamily: "Georgia,serif" }}>Benachrichtigungen</div>
        {notifs.length > 0 && <button onClick={clearAll} style={{ background: "none", border: "none", color: C.fog, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Alle löschen</button>}
      </div>

      <div className="scroll-view" style={{ flex: 1, overflowY: "auto", padding: "16px 16px calc(env(safe-area-inset-bottom,0px) + 80px)" }}>
        {notifs.length === 0 && <EmptyState icon="🔔" title="Keine Benachrichtigungen" sub="Alle aktuell — nichts zu beachten" />}
        {notifs.map((n, i) => (
          <div key={n.id} className="card-press" onClick={() => { const up = notifs.map(x => x.id === n.id ? { ...x, read: true } : x); setNotifs(up); setNotifs(up); }}
            style={{ background: n.read ? C.parch : C.white, borderRadius: 16, padding: "14px 16px", marginBottom: 10, border: `1.5px solid ${n.read ? "transparent" : C.sage + "44"}`, boxShadow: n.read ? "none" : "0 2px 12px rgba(28,25,23,0.07)", animation: `fadeUp .28s cubic-bezier(.22,1,.36,1) ${i * 35}ms both` }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: C.sageLt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{ICONS[n.tag] || ICONS.general}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: n.read ? C.inkMd : C.ink, marginBottom: 3 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: C.fog, lineHeight: 1.4 }}>{n.body}</div>
                <div style={{ fontSize: 11, color: C.fog, marginTop: 5 }}>{fmtRelTime(n.ts)}</div>
              </div>
              {!n.read && <div style={{ width: 9, height: 9, borderRadius: "50%", background: C.sage, flexShrink: 0, marginTop: 4, animation: "badgePop .3s cubic-bezier(.22,1,.36,1)" }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § TASK FOCUS CARD (Today / Jetzt — for HomeScreen)
// ═══════════════════════════════════════════════════════════════════════
function TaskFocusCard({ auftraege, unread, missed, onOpenDetail, onOpenChat }) {
  const zurueck   = auftraege.filter(a => isZurueck(a));
  const ueberfaellig = auftraege.filter(a => isLate(a) && !isZurueck(a));
  const heuteFaellig = auftraege.filter(a => ss(a.faelligkeit) === today() && !["Bereit","Eingesetzt","Archiviert"].includes(ss(a.status)));
  const totalMissed  = missed?.length || 0;
  const totalUnread  = Object.values(unread).reduce((s, n) => s + (n || 0), 0);

  const total = zurueck.length + ueberfaellig.length + heuteFaellig.length + totalMissed;
  if (total === 0) return null;

  return (
    <div style={{ margin: "16px 16px 0", animation: "fadeUp .3s cubic-bezier(.22,1,.36,1)" }}>
      <div style={{ background: `linear-gradient(135deg, ${C.brand}, #3D2823)`, borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(45,31,31,0.25)" }}>
        <div style={{ padding: "16px 18px 12px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.48)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Jetzt wichtig</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.white, fontFamily: "Georgia,serif" }}>
            {total} Aktion{total !== 1 ? "en" : ""} ausstehend
          </div>
        </div>

        {/* Priority items */}
        <div style={{ padding: "0 12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Verpasst */}
          {totalMissed > 0 && (
            <div onClick={() => onOpenChat()} style={{ background: "rgba(220,38,38,0.18)", border: "1px solid rgba(220,38,38,0.32)", borderRadius: 14, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#FCA5A5", fontWeight: 700, fontSize: 14 }}>{totalMissed} verpasste Nachricht{totalMissed !== 1 ? "en" : ""}</div>
                <div style={{ color: "rgba(255,255,255,0.52)", fontSize: 12 }}>Sofort lesen</div>
              </div>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 18 }}>›</span>
            </div>
          )}
          {/* Zurückgeschickt */}
          {zurueck.slice(0, 2).map(a => (
            <div key={a.id} onClick={() => onOpenDetail(a)} style={{ background: "rgba(249,115,22,0.18)", border: "1px solid rgba(249,115,22,0.32)", borderRadius: 14, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>↩️</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#FED7AA", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ss(a.patient)}</div>
                <div style={{ color: "rgba(255,255,255,0.52)", fontSize: 12 }}>Zurückgeschickt — {ss(a.zahnarzt)}</div>
              </div>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 18 }}>›</span>
            </div>
          ))}
          {/* Überfällig */}
          {ueberfaellig.slice(0, 2).map(a => (
            <div key={a.id} onClick={() => onOpenDetail(a)} style={{ background: "rgba(220,38,38,0.14)", border: "1px solid rgba(220,38,38,0.24)", borderRadius: 14, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>⏰</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#FCA5A5", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ss(a.patient)}</div>
                <div style={{ color: "rgba(255,255,255,0.52)", fontSize: 12 }}>Überfällig seit {fmtDate(a.faelligkeit)}</div>
              </div>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 18 }}>›</span>
            </div>
          ))}
          {/* Heute fällig */}
          {heuteFaellig.slice(0, 1).map(a => (
            <div key={a.id} onClick={() => onOpenDetail(a)} style={{ background: "rgba(217,119,6,0.14)", border: "1px solid rgba(217,119,6,0.24)", borderRadius: 14, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>📅</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#FDE68A", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ss(a.patient)}</div>
                <div style={{ color: "rgba(255,255,255,0.52)", fontSize: 12 }}>Heute fällig · {ss(a.arbeitstyp)}</div>
              </div>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// § PATIENT DETAIL SCREEN (mit Chat-History)
// ═══════════════════════════════════════════════════════════════════════
function PatientDetailScreen({ patient, auftraege, user, onOpenDetail, onOpenChat, onClose }) {
  const [msgs, setMsgs]       = useState([]);
  const [loading, setLoading] = useState(false);
  const swipeRef = useSwipeBack(onClose);

  const patAuftraege = auftraege.filter(a => ss(a.patient).toLowerCase() === ss(patient?.name).toLowerCase());
  const activeCount  = patAuftraege.filter(a => !["Archiviert","Eingesetzt"].includes(ss(a.status))).length;
  const hasZurueck   = patAuftraege.some(a => isZurueck(a));

  useEffect(() => {
    if (!isConf() || !patAuftraege.length) return;
    setLoading(true);
    Promise.all(patAuftraege.map(a => DB.nachrichten.byOrder(a.id).catch(() => [])))
      .then(results => {
        const all = results.flat().sort((a, b) => new Date(a.erstellt_am) - new Date(b.erstellt_am));
        setMsgs(all);
      })
      .finally(() => setLoading(false));
  }, [patient?.name]);

  const myName = ss(user?.name);

  return (
    <div ref={swipeRef} style={{ position:"fixed", inset:0, zIndex:2200, background:C.cream, display:"flex", flexDirection:"column", overflow:"hidden", animation:"springIn .32s cubic-bezier(.22,1,.36,1)" }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(175deg,${C.brand},#3D2823)`, paddingTop:"env(safe-area-inset-top,44px)", padding:`env(safe-area-inset-top,44px) 20px 24px`, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button onClick={onClose} className="btn-press" style={{ background:"rgba(255,255,255,0.12)", border:"none", borderRadius:"50%", width:38, height:38, fontSize:19, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:C.white }}>‹</button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:2 }}>Patient</div>
            <div style={{ fontSize:22, fontWeight:700, color:C.white, fontFamily:"Georgia,serif", letterSpacing:"-0.4px" }}>{ss(patient?.name)}</div>
          </div>
        </div>
        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            { label:"Aufträge", value:patAuftraege.length },
            { label:"Aktiv",    value:activeCount,          accent:activeCount>0?C.sage:undefined },
            { label:"Zurück",   value:patAuftraege.filter(a=>isZurueck(a)).length, accent:hasZurueck?C.stZur:undefined },
          ].map(s => (
            <div key={s.label} style={{ background:"rgba(255,255,255,0.1)", borderRadius:14, padding:"12px 14px", textAlign:"center" }}>
              <div style={{ fontSize:24, fontWeight:800, color:s.accent||C.white, fontFamily:"Georgia,serif" }}>{s.value}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="scroll-view" style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain" }}>
        {/* Aufträge des Patienten */}
        {patAuftraege.length > 0 && (
          <div style={{ padding:"16px 16px 0" }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.fog, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:12 }}>Aufträge</div>
            {patAuftraege.map((a, i) => (
              <div key={a.id} onClick={() => onOpenDetail(a)} className="card-press"
                style={{ background:C.white, borderRadius:16, padding:"14px 16px", marginBottom:10, border:`1.5px solid ${isZurueck(a)?C.stZur:"transparent"}`, boxShadow:"0 2px 12px rgba(28,25,23,0.07)", display:"flex", alignItems:"center", gap:12 }}>
                <StatusBadge status={ss(a.status)} small />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:C.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:"Georgia,serif" }}>{ss(a.arbeitstyp)}</div>
                  <div style={{ fontSize:12, color:C.fog }}>{ss(a.zahnarzt)} · {fmtDate(a.eingang)}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); onOpenChat(a.id, a); }} style={{ background:C.sageLt, border:"none", borderRadius:12, padding:"8px 12px", fontSize:13, fontWeight:600, color:C.sageDk, cursor:"pointer", flexShrink:0 }}>Chat</button>
              </div>
            ))}
          </div>
        )}

        {/* Patienten-Chat-Verlauf */}
        <div style={{ padding:"16px 16px calc(env(safe-area-inset-bottom,0px) + 24px)" }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.fog, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:12 }}>Chat-Verlauf ({msgs.length})</div>
          {loading && <div style={{ display:"flex", justifyContent:"center", padding:24 }}><Spinner /></div>}
          {!loading && msgs.length === 0 && <EmptyState icon="💬" title="Noch keine Nachrichten" sub="Chats erscheinen hier sobald Kommunikation gestartet" />}
          {msgs.map((m, i) => {
            const isMine = ss(m.absender) === myName;
            const a = patAuftraege.find(x => x.id === ss(m.auftrag_id));
            return (
              <div key={m.id} style={{ marginBottom:14 }}>
                {i === 0 || ss(msgs[i-1].auftrag_id) !== ss(m.auftrag_id) ? (
                  <div style={{ textAlign:"center", margin:"12px 0 8px" }}>
                    <span style={{ background:C.sageLt, color:C.sageDk, fontSize:11, fontWeight:600, borderRadius:20, padding:"4px 12px" }}>{a ? `${ss(a.arbeitstyp)} · ${fmtDate(a.eingang)}` : "Auftrag"}</span>
                  </div>
                ) : null}
                <div style={{ display:"flex", flexDirection:"column", alignItems:isMine?"flex-end":"flex-start" }}>
                  {!isMine && <div style={{ fontSize:11, color:C.fog, fontWeight:600, marginBottom:3, paddingLeft:4 }}>{ss(m.absender)}</div>}
                  <div style={{ maxWidth:"78%", background:isMine?`linear-gradient(135deg,${C.sage},${C.sageDk})`:C.white, color:isMine?C.white:C.ink, borderRadius:isMine?"20px 20px 4px 20px":"20px 20px 20px 4px", padding:"11px 15px", fontSize:14, lineHeight:1.45, boxShadow:isMine?"none":"0 2px 10px rgba(28,25,23,0.09)" }}>
                    {ss(m.text)}
                  </div>
                  <div style={{ fontSize:10, color:C.fog, marginTop:3, paddingLeft:4, paddingRight:4 }}>{fmtRelTime(m.erstellt_am)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § AI HINTS SHEET
// ═══════════════════════════════════════════════════════════════════════
function AIHintsSheet({ auftrag, onClose }) {
  const [hints,    setHints]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState(null);

  useEffect(() => {
    const generate = async () => {
      setLoading(true);
      try {
        const res = await fetch("/.netlify/functions/ai-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "hints", auftrag: { patient: ss(auftrag?.patient), arbeitstyp: ss(auftrag?.arbeitstyp), status: ss(auftrag?.status), zahnarzt: ss(auftrag?.zahnarzt), farbe: ss(auftrag?.farbe) } }),
        });
        if (!res.ok) throw new Error("Fehler");
        const d = await res.json();
        setHints(d.hints || []);
      } catch {
        setErr("KI-Hinweise konnten nicht geladen werden");
        setHints([
          { icon:"💡", title:"Status prüfen", body:"Prüfe ob der aktuelle Status korrekt dokumentiert ist." },
          { icon:"📸", title:"Foto empfohlen", body:"Ein Foto des aktuellen Arbeitsstands hilft bei der Kommunikation." },
          { icon:"💬", title:"Rückmeldung geben", body:"Informiere den Zahnarzt über den Fortschritt." },
        ]);
      }
      setLoading(false);
    };
    generate();
  }, [auftrag?.id]);

  return (
    <Sheet onClose={onClose} title="🤖 KI-Hinweise">
      {loading && <div style={{ display:"flex", justifyContent:"center", padding:32 }}><Spinner /></div>}
      {err && !loading && <div style={{ color:C.warn, fontSize:13, fontWeight:600, padding:"10px 14px", background:C.warnLt, borderRadius:12, marginBottom:14 }}>⚠ {err}</div>}
      {hints && !loading && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {hints.map((h, i) => (
            <div key={i} style={{ background:C.parch, borderRadius:16, padding:"16px 18px", display:"flex", gap:14, alignItems:"flex-start", animation:`fadeUp .3s cubic-bezier(.22,1,.36,1) ${i*55}ms both` }}>
              <div style={{ width:42, height:42, borderRadius:12, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, boxShadow:"0 2px 8px rgba(28,25,23,0.08)" }}>{h.icon||"💡"}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:C.ink, marginBottom:4, fontFamily:"Georgia,serif" }}>{h.title}</div>
                <div style={{ fontSize:13, color:C.fog, lineHeight:1.5 }}>{h.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § ANALYSIS SCREEN (Geschäftsleitung only)
// ═══════════════════════════════════════════════════════════════════════
function AnalysisScreen({ auftraege, materials }) {
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConf()) return;
    setLoading(true);
    DB.documents.list("order=created_at.desc&limit=200").then(d => { setDocs(Array.isArray(d) ? d : []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalOffen    = docs.filter(d => d.payment_status === "offen").reduce((s, d) => s + (parseFloat(d.total_amount)||0), 0);
  const totalBez      = docs.filter(d => d.payment_status === "bezahlt").reduce((s, d) => s + (parseFloat(d.total_amount)||0), 0);
  const totalUeber    = docs.filter(d => d.payment_status === "ueberfaellig").reduce((s, d) => s + (parseFloat(d.total_amount)||0), 0);
  const lowMatCount   = (materials||[]).filter(m => (parseFloat(m.current_stock)||0) <= (parseFloat(m.min_stock)||0)).length;
  const zurueckCount  = auftraege.filter(a => isZurueck(a)).length;
  const bereitCount   = auftraege.filter(a => ss(a.status)==="Bereit").length;

  const perSupplier   = {};
  docs.forEach(d => {
    const s = ss(d.supplier_name)||"Unbekannt";
    perSupplier[s] = (perSupplier[s]||0) + (parseFloat(d.total_amount)||0);
  });
  const topSuppliers  = Object.entries(perSupplier).sort((a,b) => b[1]-a[1]).slice(0,5);

  return (
    <div className="scroll-view" style={{ flex:1, overflowY:"auto" }}>
      <div style={{ padding:"20px 20px 12px", fontSize:22, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", letterSpacing:"-0.4px" }}>📊 Analyse</div>

      {/* Financial KPIs */}
      <div style={{ padding:"0 16px 16px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.fog, textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:12 }}>Finanzübersicht</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            { label:"Offen",       value:`€ ${totalOffen.toFixed(0)}`,       color:C.warn,  icon:"⏳", bg:C.warnLt },
            { label:"Bezahlt",     value:`€ ${totalBez.toFixed(0)}`,         color:C.ok,    icon:"✅", bg:C.okLt },
            { label:"Überfällig",  value:`€ ${totalUeber.toFixed(0)}`,       color:C.err,   icon:"🔴", bg:C.errLt },
            { label:"Belege total",value:docs.length,                         color:C.ink,   icon:"📄", bg:C.parch },
          ].map((k,i) => (
            <Card key={i} pad={16} style={{ background:k.bg, border:`1.5px solid ${k.color}22`, animation:`fadeUp .28s cubic-bezier(.22,1,.36,1) ${i*40}ms both` }}>
              <div style={{ fontSize:24, marginBottom:4 }}>{k.icon}</div>
              <div style={{ fontSize:22, fontWeight:800, color:k.color, fontFamily:"Georgia,serif", letterSpacing:"-0.5px" }}>{k.value}</div>
              <div style={{ fontSize:12, color:k.color, marginTop:2, fontWeight:600 }}>{k.label}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Operational KPIs */}
      <div style={{ padding:"0 16px 16px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.fog, textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:12 }}>Betrieb</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            { label:"Bereit",       value:bereitCount,   color:C.ok,    icon:"✅" },
            { label:"Zurückgeschickt", value:zurueckCount, color:zurueckCount>0?C.stZur:C.ok, icon:zurueckCount>0?"↩️":"✓" },
            { label:"Material ⚠",  value:lowMatCount,   color:lowMatCount>0?C.err:C.ok,   icon:lowMatCount>0?"📦":"✓" },
          ].map((k,i) => (
            <Card key={i} pad={14} style={{ textAlign:"center" }}>
              <div style={{ fontSize:22 }}>{k.icon}</div>
              <div style={{ fontSize:24, fontWeight:800, color:k.color, fontFamily:"Georgia,serif" }}>{k.value}</div>
              <div style={{ fontSize:11, color:C.fog, marginTop:2 }}>{k.label}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Insights / Warnungen */}
      {(totalUeber > 0 || zurueckCount > 0 || lowMatCount > 0) && (
        <div style={{ margin:"0 16px 16px", background:`linear-gradient(135deg,${C.brand},#3D2823)`, borderRadius:18, padding:"16px 20px" }}>
          <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:12 }}>🤖 KI-Insights</div>
          {totalUeber > 0 && <div style={{ fontSize:14, color:"#FCA5A5", marginBottom:8 }}>🔴 € {totalUeber.toFixed(0)} überfällig — sofort Zahlung anfordern</div>}
          {zurueckCount > 0 && <div style={{ fontSize:14, color:"#FED7AA", marginBottom:8 }}>↩️ {zurueckCount} zurückgeschickte Aufträge beeinflussen Produktivität</div>}
          {lowMatCount > 0 && <div style={{ fontSize:14, color:"#FDE68A", marginBottom:0 }}>📦 {lowMatCount} Material{lowMatCount!==1?"ien":""} unter Mindestbestand — Nachbestellen empfohlen</div>}
        </div>
      )}

      {/* Top Suppliers */}
      {topSuppliers.length > 0 && (
        <div style={{ padding:"0 16px calc(env(safe-area-inset-bottom,0px) + 100px)" }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.fog, textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:14 }}>Top Lieferanten</div>
          {topSuppliers.map(([sup, total], i) => (
            <div key={sup} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12, animation:`fadeUp .25s cubic-bezier(.22,1,.36,1) ${i*40}ms both` }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:C.sageLt, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:C.sageDk, flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1, fontSize:14, fontWeight:600, color:C.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:"Georgia,serif" }}>{sup}</div>
              <div style={{ fontWeight:800, fontSize:16, color:C.sageDk, flexShrink:0 }}>€ {total.toFixed(0)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// § CHAT SCREEN
// ═══════════════════════════════════════════════════════════════════════
function ChatScreen({ auftragId, auftrag, user, onBack, onMarkRead }) {
  const [msgs,    setMsgs]    = useState([]);
  const [text,    setText]    = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();
  const myName    = ss(user?.name);
  const swipeRef  = useSwipeBack(onBack, !text);
  const sm        = auftrag ? getStatus(ss(auftrag.status)) : null;

  const load = useCallback(async () => {
    if (!isConf()) { setLoading(false); return; }
    try {
      const d = await DB.nachrichten.byOrder(auftragId);
      const fresh = Array.isArray(d) ? d : [];
      // Merge: keep any _pending or _failed local messages not yet in DB
      setMsgs(prev => {
        const dbIds = new Set(fresh.map(m => m.id));
        const localOnly = prev.filter(m => (m._pending || m._failed) && !dbIds.has(m.id));
        return [...fresh, ...localOnly].sort((a, b) => new Date(a.erstellt_am) - new Date(b.erstellt_am));
      });
      const unread = (Array.isArray(d) ? d : []).filter(m => { const seen = Array.isArray(m.gelesen_von) ? m.gelesen_von : []; return ss(m.absender) !== myName && !seen.includes(myName); });
      for (const m of unread) { const seen = Array.isArray(m.gelesen_von) ? m.gelesen_von : []; await DB.nachrichten.markRead(m.id, [...seen, myName]).catch(() => {}); }
      if (unread.length > 0) onMarkRead?.(auftragId);
    } catch {}
    setLoading(false);
  }, [auftragId, myName]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);
  useEffect(() => { if (bottomRef.current) { bottomRef.current.scrollIntoView({ behavior: "auto", block: "end" }); } }, [msgs.length]);

  // ── RETRY: resend a failed message ──────────────────────────────
  const retrySend = async (failedMsg) => {
    if (!auftragId) return;
    // Reset to pending
    setMsgs(p => p.map(m => m.id === failedMsg.id ? { ...m, _failed: false, _pending: true } : m));
    try {
      const res = await DB.nachrichten.insert({
        auftrag_id:  auftragId,
        absender:    ss(failedMsg.absender),
        text:        ss(failedMsg.text),
        erstellt_am: failedMsg.erstellt_am || new Date().toISOString(),
        gelesen_von: [myName],
      });
      console.log("[Chat] Retry OK:", res);
      const confirmed = Array.isArray(res) && res[0]
        ? { ...res[0], gelesen_von: [myName] }
        : { ...failedMsg, _pending: false, _failed: false };
      setMsgs(p => p.map(m => m.id === failedMsg.id ? confirmed : m));
    } catch (err) {
      console.error("[Chat] Retry FAILED:", err);
      setMsgs(p => p.map(m => m.id === failedMsg.id ? { ...m, _pending: false, _failed: true } : m));
    }
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    // Guard: auftrag_id must exist
    if (!auftragId) {
      console.error("[Chat] auftrag_id fehlt — Senden blockiert");
      return;
    }
    const t = text.trim();
    setText("");
    setSending(true);

    const tempId   = "tmp_" + genId();
    const now      = new Date().toISOString();
    const localMsg = { id: tempId, auftrag_id: auftragId, absender: myName, text: t, erstellt_am: now, gelesen_von: [myName], _pending: true };
    setMsgs(p => [...p, localMsg]);

    if (isConf()) {
      try {
        console.log("[Chat] Sending payload:", { auftrag_id: auftragId, absender: myName, text: t, erstellt_am: now });
        const res = await DB.nachrichten.insert({
          auftrag_id:  auftragId,
          absender:    myName,
          text:        t,
          erstellt_am: now,
          gelesen_von: [myName],
        });
        console.log("[Chat] Supabase response:", JSON.stringify(res));
        const confirmed = Array.isArray(res) && res[0]
          ? { ...res[0], gelesen_von: [myName] }
          : { ...localMsg, _pending: false };
        setMsgs(p => p.map(m => m.id === tempId ? confirmed : m));
      } catch (err) {
        console.error("[Chat] Insert error:", err?.message || err);
        setMsgs(p => p.map(m => m.id === tempId ? { ...m, _pending: false, _failed: true } : m));
      }
    } else {
      // Demo mode
      setMsgs(p => p.map(m => m.id === tempId ? { ...m, _pending: false } : m));
    }
    setSending(false);
  };

  // Group by day
  const grouped = [];
  let lastDay = null;
  msgs.forEach(m => {
    const day = ss(m.erstellt_am).slice(0, 10);
    if (day !== lastDay) { grouped.push({ type: "day", day }); lastDay = day; }
    grouped.push({ type: "msg", msg: m });
  });

  return (
    <div ref={swipeRef} style={{ position: "fixed", inset: 0, zIndex: 2000, background: C.cream, display: "flex", flexDirection: "column", overflow: "hidden", animation: "springIn .32s cubic-bezier(.22,1,.36,1)" }}>
      {/* Header */}
      <div style={{ background: "rgba(250,250,249,0.94)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${C.sand}`, paddingTop: "env(safe-area-inset-top, 44px)", padding: `env(safe-area-inset-top, 44px) 16px 14px`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} className="btn-press" style={{ background: C.parch, border: "none", borderRadius: "50%", width: 38, height: 38, fontSize: 19, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "Georgia,serif" }}>{auftrag ? ss(auftrag.patient) : "Chat"}</div>
          {auftrag && <div style={{ fontSize: 12, color: C.fog, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ss(auftrag.zahnarzt)} · {ss(auftrag.arbeitstyp)}</div>}
        </div>
        {auftrag && <StatusBadge status={ss(auftrag.status)} small />}
      </div>

      {/* Context banner for Zurückgeschickt */}
      {auftrag && isZurueck(auftrag) && (
        <div style={{ background: C.stZurBg, borderBottom: `1px solid ${C.stZur}44`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 16 }}>↩️</span>
          <div style={{ fontSize: 13, color: C.stZur, fontWeight: 600 }}>Auftrag zurückgeschickt — Bitte Korrekturen vornehmen</div>
        </div>
      )}

      {/* Messages */}
      <div className="scroll-view" style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", padding: "16px 16px 0" }}>
        {loading && <div style={{ display: "flex", justifyContent: "center", padding: 32 }}><Spinner /></div>}
        {!loading && msgs.length === 0 && <EmptyState icon="💬" title="Noch keine Nachrichten" sub="Starte jetzt die Konversation" />}
        {grouped.map((item, i) => {
          if (item.type === "day") return (
            <div key={`d-${item.day}`} style={{ textAlign: "center", margin: "16px 0 10px" }}>
              <span style={{ background: C.sand, color: C.fog, fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "4px 12px" }}>{fmtDate(item.day)}</span>
            </div>
          );
          const m = item.msg; const isMine = ss(m.absender) === myName;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 10, animation: "fadeUp .22s cubic-bezier(.22,1,.36,1)" }}>
              {!isMine && <div style={{ fontSize: 11, color: C.fog, fontWeight: 600, marginBottom: 3, paddingLeft: 4 }}>{ss(m.absender)}</div>}
              {/* _failed: tappable retry block */}
              {m._failed ? (
                <button onClick={() => retrySend(m)} className="btn-press"
                  style={{ maxWidth: "78%", background: C.errLt, color: C.err, border: `1.5px solid ${C.err}44`, borderRadius: "20px 20px 4px 20px", padding: "12px 16px", fontSize: 15, lineHeight: 1.48, textAlign: "left", fontFamily: "inherit", cursor: "pointer", display: "block" }}>
                  {ss(m.text)}
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6, color: C.err }}>❌ Nicht gesendet — Tippen zum Wiederholen</div>
                </button>
              ) : (
                <div style={{ maxWidth: "78%", background: isMine ? `linear-gradient(135deg,${C.sage},${C.sageDk})` : C.white, color: isMine ? C.white : C.ink, borderRadius: isMine ? "20px 20px 4px 20px" : "20px 20px 20px 4px", padding: "12px 16px", fontSize: 15, lineHeight: 1.48, boxShadow: isMine ? "none" : "0 2px 10px rgba(28,25,23,0.09)", opacity: m._pending ? 0.6 : 1 }}>
                  {ss(m.text)}
                </div>
              )}
              {!m._failed && (
                <div style={{ fontSize: 10, color: C.fog, marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
                  {m._pending ? "⏳ Wird gesendet…" : fmtTime(m.erstellt_am)}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: "rgba(250,250,249,0.96)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: `1px solid ${C.sand}`, padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom,0px))", display: "flex", gap: 10, alignItems: "flex-end", flexShrink: 0 }}>
        <textarea value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Nachricht…" rows={1}
          style={{ flex: 1, background: C.parch, border: "none", borderRadius: 22, padding: "10px 16px", fontSize: 16, color: C.ink, resize: "none", fontFamily: "inherit", maxHeight: 100, overflowY: "auto" }} />
        <button onClick={send} disabled={!text.trim() || sending} className="btn-press"
          style={{ width: 46, height: 46, borderRadius: "50%", background: text.trim() ? `linear-gradient(135deg,${C.sage},${C.sageDk})` : C.sand, border: "none", color: C.white, fontSize: 21, cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .15s", boxShadow: text.trim() ? `0 4px 18px ${C.sage}44` : "none" }}>
          {sending ? <Spinner size={18} color={C.white} /> : "↑"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § CHAT OVERVIEW
// ═══════════════════════════════════════════════════════════════════════
function ChatOverview({ auftraege, unread, chatPreview, missed, allMsgs, userName, onOpenChat }) {
  const totalMissed = missed?.length || 0;
  const totalUnread = Object.values(unread).reduce((s, n) => s + (n || 0), 0);

  const enriched = auftraege
    .filter(a => (unread[a.id] || 0) > 0 || chatPreview[a.id])
    .map(a => {
      const ug = unread[a.id] || 0;
      const ms = (missed || []).filter(m => ss(m.auftrag_id) === a.id).length;
      const ts = allMsgs?.find(m => ss(m.auftrag_id) === a.id)?.erstellt_am || a.eingang || "";
      return { ...a, _ug: ug, _ms: ms, _prev: chatPreview[a.id] || "", _ts: ts };
    })
    .sort((a, b) => { if (b._ms !== a._ms) return b._ms - a._ms; if (b._ug !== a._ug) return b._ug - a._ug; return new Date(b._ts) - new Date(a._ts); });

  return (
    <div className="scroll-view" style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "20px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: "Georgia,serif", letterSpacing: "-0.4px" }}>💬 Chat</div>
        <div style={{ display: "flex", gap: 8 }}>
          {totalMissed > 0 && <div style={{ background: C.errLt, border: `1.5px solid ${C.err}`, borderRadius: 20, padding: "5px 13px", fontSize: 12, fontWeight: 800, color: C.err, animation: "pulse 1s infinite" }}>⚠ {totalMissed}</div>}
          {totalUnread > 0 && <div style={{ background: C.warnLt, border: `1.5px solid ${C.warn}`, borderRadius: 20, padding: "5px 13px", fontSize: 12, fontWeight: 700, color: C.warn }}>{totalUnread} ungelesen</div>}
          {totalUnread === 0 && totalMissed === 0 && <div style={{ background: C.okLt, border: `1.5px solid ${C.ok}`, borderRadius: 20, padding: "5px 13px", fontSize: 12, fontWeight: 700, color: C.ok }}>✅ Alles gelesen</div>}
        </div>
      </div>

      {enriched.length === 0 && <EmptyState icon="💬" title="Noch keine Chats" sub="Öffne einen Auftrag und starte eine Konversation" />}

      <div style={{ padding: "0 16px calc(env(safe-area-inset-bottom,0px) + 100px)" }}>
        {enriched.map((a, i) => {
          const isMissed = a._ms > 0; const isUnread = a._ug > 0;
          const borderCol = isMissed ? C.err : isUnread ? C.warn : C.sand;
          return (
            <div key={a.id} onClick={() => onOpenChat(a.id, a)} className="card-press"
              style={{ background: isMissed ? C.errLt : isUnread ? "#FFFBEE" : C.white, borderRadius: 18, padding: "14px 16px", marginBottom: 10, border: `1.5px solid ${borderCol}`, boxShadow: "0 2px 12px rgba(28,25,23,0.07)", display: "flex", alignItems: "center", gap: 12, animation: `fadeUp .28s cubic-bezier(.22,1,.36,1) ${i * 32}ms both` }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: isMissed ? C.err : isUnread ? C.warn : C.sand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: C.white, flexShrink: 0 }}>
                {isMissed ? "⚠" : isUnread ? "💬" : "✓"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: isMissed ? C.err : C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "Georgia,serif" }}>{a.patient}</div>
                <div style={{ fontSize: 12, color: C.fog, marginTop: 2 }}>{a.zahnarzt} · {a.arbeitstyp}</div>
                {a._prev && <div style={{ fontSize: 13, color: isMissed ? C.err : isUnread ? C.warn : C.fog, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isMissed || isUnread ? 600 : 400 }}>{a._prev}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                {(isMissed || isUnread) && <div style={{ background: isMissed ? C.err : C.warn, color: C.white, borderRadius: 12, fontSize: 12, padding: "3px 9px", fontWeight: 800 }}>{isMissed ? a._ms : a._ug}</div>}
                <div style={{ fontSize: 11, color: C.fog }}>{fmtRelTime(a._ts)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § NEW AUFTRAG SHEET — stable (no keyboard bug)
// ═══════════════════════════════════════════════════════════════════════
function NewAuftragSheet({ patienten, onSave, onClose }) {
  const TYPES = ["Krone","Brücke","Prothese","Implant","Veneer","Inlay","Schiene","Zahnersatz","Reparatur","Andere"];

  // ── Mode: voice | manual ──────────────────────────────────────
  const [mode,      setMode]      = useState("choose"); // choose | recording | processing | review | manual
  const [form,      setForm]      = useState({ patient: "", zahnarzt: "", arbeitstyp: "Krone", farbe: "", faelligkeit: new Date(Date.now() + 14*24*60*60*1000).toISOString().slice(0,10), anweisungen: "", dringend: false, grund_rueck: "", prioritaet: "Normal", zahn: "" });
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState(null);
  const [done,      setDone]      = useState(false);
  const [showPat,   setShowPat]   = useState(false);

  // ── Voice states ──────────────────────────────────────────────
  const [transkript,  setTranskript]  = useState("");
  const [recording,   setRecording]   = useState(false);
  const [procMsg,     setProcMsg]     = useState("Auftrag wird analysiert…");
  const [reviewData,  setReviewData]  = useState(null);
  const [laborzettel, setLaborzettel] = useState("");
  const [warnungen,   setWarnungen]   = useState([]);
  const recognRef = useRef(null);

  const set = useCallback((k, v) => setForm(p => ({ ...p, [k]: v })), []);
  const patSuggestions = (patienten || []).filter(p => ss(p.name).toLowerCase().includes(form.patient.toLowerCase()) && form.patient.length > 0);

  // ── Voice: Start recording ────────────────────────────────────
  const startRecording = () => {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { setErr("Spracherkennung nicht verfügbar — bitte manuell eingeben"); setMode("manual"); return; }
      const r = new SR();
      r.lang = "de-DE";
      r.continuous = true;
      r.interimResults = true;
      r.onresult = e => {
        let final = "";
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        }
        setTranskript(final);
      };
      r.onerror = e => {
        if (e.error === "not-allowed") setErr("Kein Mikrofon-Zugriff — bitte in Einstellungen erlauben");
        else setErr("Spracherkennung unterbrochen — bitte erneut versuchen");
        setRecording(false); setMode("choose");
      };
      r.onend = () => { setRecording(false); };
      recognRef.current = r;
      r.start();
      setRecording(true);
      setTranskript("");
      setMode("recording");
    } catch { setErr("Spracherkennung nicht verfügbar"); setMode("manual"); }
  };

  const stopRecording = () => {
    recognRef.current?.stop();
    setRecording(false);
    setMode("processing");
    processVoice();
  };

  // ── Voice: Process with KI ────────────────────────────────────
  const processVoice = async () => {
    const msgs = ["Auftrag wird analysiert…","Patient wird erkannt…","Felder werden extrahiert…","Laborzettel wird erstellt…"];
    let mi = 0; setProcMsg(msgs[0]);
    const t = setInterval(() => { mi = Math.min(mi+1, msgs.length-1); setProcMsg(msgs[mi]); }, 900);
    try {
      const res = await fetch("/.netlify/functions/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "voice", transkript, patienten: (patienten||[]).slice(0,50).map(p=>({name:p.name})) }),
      });
      clearInterval(t);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Fehler");
      const r = data.result;
      // Fill form from KI result
      const newForm = { ...form };
      if (r.patient?.name)       newForm.patient      = r.patient.name;
        if (r.auftrag?.arbeitstyp) newForm.arbeitstyp   = r.auftrag.arbeitstyp;
      if (r.auftrag?.zaehne)     newForm.zahn         = r.auftrag.zaehne;
      if (r.auftrag?.material)   newForm.anweisungen  = (r.auftrag.material + (r.auftrag.anweisungen ? " — " + r.auftrag.anweisungen : ""));
      if (r.auftrag?.farbe)      newForm.farbe        = r.auftrag.farbe;
      if (r.auftrag?.faelligkeit) newForm.faelligkeit = r.auftrag.faelligkeit;
      if (r.auftrag?.prioritaet) newForm.prioritaet   = r.auftrag.prioritaet;
      if (r.auftrag?.anweisungen && !r.auftrag?.material) newForm.anweisungen = r.auftrag.anweisungen;
      setForm(newForm);
      setLaborzettel(r.laborzettel?.text || "");
      setWarnungen([...(r.meta?.fehlende_felder||[]).map(f=>"Fehlt: "+f), ...(r.laborzettel?.warnungen||[])]);
      setReviewData(r);
      setMode("review");
    } catch(e) {
      clearInterval(t);
      setErr("KI-Analyse fehlgeschlagen — bitte manuell eingeben");
      setMode("manual");
    }
  };

  // ── Save ──────────────────────────────────────────────────────
  const save = async () => {
    if (!form.patient.trim() || !form.zahnarzt.trim() || !form.faelligkeit || !form.anweisungen.trim()) {
      setErr("Bitte alle Pflichtfelder ausfüllen (Patient, Zahnarzt, Fälligkeit, Anweisungen)"); return;
    }
    setSaving(true); setErr(null);
    const anwFull = laborzettel ? (form.anweisungen ? form.anweisungen + "\n\nLaborzettel:\n" + laborzettel : laborzettel) : form.anweisungen;
    const a = { ...form, anweisungen: anwFull, id: genId(), status: "Eingang", eingang: today(), verlauf: JSON.stringify([{ datum: today(), status: "Eingang", notiz: "" }]), fotos: "[]", created_at: new Date().toISOString() };
    try {
      if (isConf()) { const ins = await DB.auftraege.insert(a); onSave(normA(Array.isArray(ins) && ins[0] ? ins[0] : a)); }
      else onSave(normA(a));
      setDone(true); setTimeout(onClose, 900);
    } catch { setErr("Speichern fehlgeschlagen – bitte erneut versuchen"); setSaving(false); }
  };

  if (done) return <Sheet onClose={onClose} title=""><div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "44px 24px", gap: 16 }}><div style={{ fontSize: 68, animation: "popIn .4s cubic-bezier(.22,1,.36,1)" }}>✅</div><div style={{ fontWeight: 700, fontSize: 21, color: C.ok, fontFamily: "Georgia,serif" }}>Auftrag angelegt!</div><div style={{ fontSize: 14, color: C.fog }}>Erscheint sofort in der Liste</div></div></Sheet>;

  // ── SCREEN: choose ────────────────────────────────────────────
  if (mode === "choose") return (
    <Sheet onClose={onClose} title="Neuer Auftrag" maxHeight="96vh">
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 40 }}>
        <p style={{ fontSize: 14, color: C.fog, margin: 0, textAlign: "center" }}>Wie möchtest du den Auftrag anlegen?</p>
        <button onClick={startRecording} className="btn-press"
          style={{ background: `linear-gradient(135deg,${C.sage},${C.sageDk})`, color: C.white, border: "none", borderRadius: 20, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer", boxShadow: `0 8px 32px ${C.sage}44` }}>
          <span style={{ fontSize: 40 }}>🎙</span>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "Georgia,serif" }}>Sprechen</span>
          <span style={{ fontSize: 13, opacity: 0.8 }}>Einfach frei sprechen — KI erkennt alles</span>
        </button>
        <button onClick={() => setMode("manual")} className="btn-press"
          style={{ background: C.white, color: C.ink, border: `1.5px solid ${C.sand}`, borderRadius: 20, padding: "18px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <span style={{ fontSize: 32 }}>✏️</span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Manuell eingeben</span>
          <span style={{ fontSize: 13, color: C.fog }}>Felder einzeln ausfüllen</span>
        </button>
        {err && <div style={{ background: C.errLt, borderRadius: 12, padding: "12px 16px", color: C.err, fontSize: 14, fontWeight: 600 }}>{err}</div>}
      </div>
    </Sheet>
  );

  // ── SCREEN: recording ─────────────────────────────────────────
  if (mode === "recording") return (
    <Sheet onClose={() => { recognRef.current?.stop(); setMode("choose"); }} title="Sprechen…" maxHeight="96vh">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, paddingBottom: 40 }}>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `linear-gradient(135deg,${C.err},#B91C1C)`, display: "flex", alignItems: "center", justifyContent: "center", animation: "breathe 1.2s ease-in-out infinite", boxShadow: `0 0 0 0 ${C.err}44`, fontSize: 44 }}>🎙</div>
        <div style={{ fontSize: 15, color: C.fog, fontWeight: 600, animation: "pulse 1.5s infinite" }}>Ich höre zu…</div>
        {transkript && (
          <div style={{ background: C.parch, borderRadius: 16, padding: "16px", width: "100%", fontSize: 15, color: C.ink, lineHeight: 1.6, minHeight: 80, boxSizing: "border-box" }}>
            {transkript || <span style={{ color: C.fog }}>Transkript erscheint hier…</span>}
          </div>
        )}
        <p style={{ fontSize: 13, color: C.fog, textAlign: "center", margin: 0 }}>
          Beispiel: "Neue Patientin Müller, Krone auf Zahn 16, Farbe A2, bis nächste Woche"
        </p>
        <button onClick={stopRecording} className="btn-press"
          style={{ background: C.err, color: C.white, border: "none", borderRadius: 16, padding: "16px 40px", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: `0 6px 24px ${C.err}44` }}>
          ⏹ Fertig — Auftrag analysieren
        </button>
        <button onClick={() => { recognRef.current?.stop(); setTranskript(""); setMode("choose"); }}
          style={{ background: "none", border: "none", color: C.fog, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          ✕ Abbrechen
        </button>
      </div>
    </Sheet>
  );

  // ── SCREEN: processing ────────────────────────────────────────
  if (mode === "processing") return (
    <Sheet onClose={onClose} title="" maxHeight="96vh">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "40px 0" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg,${C.sage},${C.sageDk})`, display: "flex", alignItems: "center", justifyContent: "center", animation: "breathe 1.5s ease-in-out infinite", fontSize: 32 }}>🤖</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, fontFamily: "Georgia,serif" }}>{procMsg}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.sage, animation: `pulse 1.2s ease-in-out ${i*0.3}s infinite` }} />)}
        </div>
      </div>
    </Sheet>
  );

  // ── SCREEN: review ────────────────────────────────────────────
  if (mode === "review") return (
    <Sheet onClose={onClose} title="Auftrag prüfen" maxHeight="96vh">
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: "calc(env(safe-area-inset-bottom,34px) + 100px)" }}>
        {/* Section 1: Patient */}
        <div style={{ background: C.sageLt, borderRadius: 16, padding: "16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.sageDk, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>👤 Patient</div>
          <FormInput label="Name" value={form.patient} onChange={v => set("patient", v)} required placeholder="Patientenname" />
          {reviewData?.patient?.ist_neu && <div style={{ marginTop: 8, fontSize: 12, color: C.warn, fontWeight: 600 }}>⚠ Neuer Patient — wird angelegt</div>}
        </div>
        {/* Section 2: Auftrag */}
        <div style={{ background: C.parch, borderRadius: 16, padding: "16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.fog, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>📋 Auftrag</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <FormInput label="Zahnarzt" value={form.zahnarzt} onChange={v => set("zahnarzt", v)} required placeholder="Name des Zahnarztes" />
            <FormInput label="Arbeitstyp" value={form.arbeitstyp} onChange={v => set("arbeitstyp", v)} placeholder="z.B. Krone" />
            <FormInput label="Zahn" value={form.zahn} onChange={v => set("zahn", v)} placeholder="z.B. 16" />
            <FormInput label="Farbe" value={form.farbe} onChange={v => set("farbe", v)} placeholder="z.B. A2" />
            <FormInput label="Fälligkeit" value={form.faelligkeit} onChange={v => set("faelligkeit", v)} type="date" />
          </div>
        </div>
        {/* Section 3: Laborzettel */}
        {laborzettel && (
          <div style={{ background: C.infoLt, borderRadius: 16, padding: "16px", border: `1.5px solid ${C.info}22` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.info, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>🔬 Auftragshinweis für Techniker</div>
            <textarea value={laborzettel} onChange={e => setLaborzettel(e.target.value)} rows={4}
              style={{ background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 12, padding: "12px 14px", fontSize: 14, color: C.ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box", width: "100%", lineHeight: 1.5 }} />
          </div>
        )}
        {/* Section 4: Anweisungen + Warnungen */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.fog, textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: 6 }}>Anweisungen</label>
          <textarea value={form.anweisungen} onChange={e => set("anweisungen", e.target.value)} rows={3} placeholder="Besondere Hinweise…"
            style={{ background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 14, padding: "14px 16px", fontSize: 16, color: C.ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box", width: "100%" }} />
        </div>
        {warnungen.length > 0 && (
          <div style={{ background: C.warnLt, borderRadius: 14, padding: "12px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.warn, marginBottom: 6 }}>⚠ Hinweise der KI</div>
            {warnungen.map((w,i) => <div key={i} style={{ fontSize: 13, color: C.warn }}>{w}</div>)}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setMode("choose")} className="btn-press"
            style={{ flex: 1, background: C.parch, color: C.inkMd, border: `1.5px solid ${C.sand}`, borderRadius: 14, padding: "14px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            🎙 Neu sprechen
          </button>
          <button onClick={() => setMode("manual")} className="btn-press"
            style={{ flex: 1, background: C.parch, color: C.inkMd, border: `1.5px solid ${C.sand}`, borderRadius: 14, padding: "14px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            ✏️ Manuell
          </button>
        </div>
        {err && <div style={{ background: C.errLt, borderRadius: 12, padding: "12px 16px", color: C.err, fontSize: 14, fontWeight: 600 }}>{err}</div>}
        <button onClick={save} disabled={saving} className="btn-press"
          style={{ background: saving ? C.sand : `linear-gradient(135deg,${C.sage},${C.sageDk})`, color: C.white, border: "none", borderRadius: 18, padding: "18px", fontSize: 17, fontWeight: 700, cursor: saving ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: saving ? "none" : `0 6px 24px ${C.sage}44` }}>
          {saving ? <><Spinner size={20} color={C.white} /> Wird gespeichert…</> : "✅ Auftrag bestätigen & speichern"}
        </button>
      </div>
    </Sheet>
  );

  // ── SCREEN: manual ────────────────────────────────────────────
  return (
    <Sheet onClose={onClose} title="Neuer Auftrag" maxHeight="96vh">
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: "calc(env(safe-area-inset-bottom,34px) + 100px)" }}>
        <button onClick={() => setMode("choose")} style={{ background: "none", border: "none", color: C.sage, fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", fontFamily: "inherit", padding: 0 }}>← Zurück</button>
        {/* Patient */}
        <div style={{ position: "relative" }}>
          <FormInput label="Patient" value={form.patient} onChange={v => { set("patient", v); setShowPat(true); }} required placeholder="Patientenname" />
          {showPat && patSuggestions.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: C.white, borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", overflow: "hidden", border: `1px solid ${C.sand}`, marginTop: 4 }}>
              {patSuggestions.slice(0, 4).map(p => (
                <div key={p.id} onClick={() => { set("patient", p.name); setShowPat(false); }} style={{ padding: "14px 16px", borderBottom: `1px solid ${C.sand}`, cursor: "pointer", fontSize: 15, color: C.ink, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>👤</span> {p.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <FormInput label="Zahnarzt" value={form.zahnarzt} onChange={v => set("zahnarzt", v)} required placeholder="Name des Zahnarztes" />
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.fog, textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: 8 }}>Arbeitstyp</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TYPES.map(t => (
              <button key={t} onClick={() => set("arbeitstyp", t)} className="btn-press"
                style={{ padding: "9px 15px", borderRadius: 12, border: `1.5px solid ${form.arbeitstyp === t ? C.sage : C.sand}`, background: form.arbeitstyp === t ? C.sageLt : C.white, color: form.arbeitstyp === t ? C.sageDk : C.inkMd, fontSize: 14, fontWeight: form.arbeitstyp === t ? 700 : 400, cursor: "pointer", transition: "all .12s", fontFamily: "inherit" }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <FormInput label="Farbe / Shade" value={form.farbe} onChange={v => set("farbe", v)} placeholder="z.B. A2, BL2" />
        <FormInput label="Zahn-Nummer" value={form.zahn} onChange={v => set("zahn", v)} placeholder="z.B. 36, 37" />
        <FormInput label="Fälligkeitsdatum" value={form.faelligkeit} onChange={v => set("faelligkeit", v)} type="date" />
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.fog, textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: 6 }}>Anweisungen</label>
          <textarea value={form.anweisungen} onChange={e => set("anweisungen", e.target.value)} rows={3} placeholder="Besondere Hinweise…"
            style={{ background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 14, padding: "14px 16px", fontSize: 16, color: C.ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box", width: "100%" }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.fog, textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: 8 }}>Priorität</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["Normal","Dringend","Notfall"].map(p => (
              <button key={p} onClick={() => set("prioritaet", p)} className="btn-press"
                style={{ flex: 1, padding: "11px 8px", borderRadius: 12, border: `1.5px solid ${form.prioritaet === p ? (p === "Normal" ? C.sage : C.err) : C.sand}`, background: form.prioritaet === p ? (p === "Normal" ? C.sageLt : C.errLt) : C.white, color: form.prioritaet === p ? (p === "Normal" ? C.sageDk : C.err) : C.inkMd, fontSize: 13, fontWeight: form.prioritaet === p ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                {p === "Normal" ? "✓ Normal" : p === "Dringend" ? "🔴 Dringend" : "🚨 Notfall"}
              </button>
            ))}
          </div>
        </div>
        <div onClick={() => set("dringend", !form.dringend)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: form.dringend ? C.errLt : C.white, border: `1.5px solid ${form.dringend ? C.err : C.sand}`, borderRadius: 16, padding: "16px 18px", cursor: "pointer", transition: "all .2s", boxShadow: "0 1px 4px rgba(28,25,23,0.05)" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: form.dringend ? C.err : C.inkMd }}>🔴 Dringend markieren</span>
          <div style={{ width: 50, height: 30, borderRadius: 15, background: form.dringend ? C.err : C.sand, position: "relative", transition: "background .2s", flexShrink: 0, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.14)" }}>
            <div style={{ position: "absolute", top: 3, left: form.dringend ? 23 : 3, width: 24, height: 24, borderRadius: "50%", background: C.white, boxShadow: "0 2px 6px rgba(0,0,0,0.18)", transition: "left .2s cubic-bezier(.22,1,.36,1)" }} />
          </div>
        </div>
        {err && <div style={{ background: C.errLt, border: `1px solid ${C.err}30`, borderRadius: 12, padding: "12px 16px", color: C.err, fontSize: 14, fontWeight: 600 }}>{err}</div>}
        <button onClick={save} disabled={saving} className="btn-press"
          style={{ background: saving ? C.sand : `linear-gradient(135deg,${C.sage},${C.sageDk})`, color: C.white, border: "none", borderRadius: 18, padding: "18px", fontSize: 17, fontWeight: 700, cursor: saving ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: saving ? "none" : `0 6px 24px ${C.sage}44` }}>
          {saving ? <><Spinner size={20} color={C.white} /> Auftrag wird angelegt…</> : "✅ Auftrag anlegen"}
        </button>
      </div>
    </Sheet>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// § DETAIL SCREEN
// ═══════════════════════════════════════════════════════════════════════
function DetailScreen({ a, user, onBack, onOpenChat, onUpdated, onOpenAIHints }) {
  const [showStatus, setShowStatus] = useState(false);
  const [showSms,    setShowSms]    = useState(false);
  const [showFoto,   setShowFoto]   = useState(false);
  const [localA,     setLocalA]     = useState(a);
  const [showAnw,    setShowAnw]    = useState(false);
  const [anwText,    setAnwText]    = useState(ss(a.anweisungen));
  const swipeRef = useSwipeBack(onBack, !showStatus && !showSms && !showFoto && !showAnw);

  useEffect(() => {
    if (!showAnw) {
      const aTime = a?.updated_at ? new Date(a.updated_at).getTime() : 0;
      const lTime = localA?.updated_at ? new Date(localA.updated_at).getTime() : 0;
      if (aTime >= lTime) { setLocalA(a); setAnwText(ss(a.anweisungen)); }
    }
  }, [a]);

  const handleStatus = async s => {
    const prev = ss(localA.status);
    const v    = Array.isArray(localA.verlauf) ? localA.verlauf : [];
    const nv   = [...v, { datum: today(), status: s, notiz: "" }];
    const upd  = { ...localA, status: s, verlauf: nv };
    setLocalA(upd);
    if (isConf()) {
      try { await DB.auftraege.update(localA.id, { status: s, verlauf: JSON.stringify(nv), updated_at: new Date().toISOString() }); }
      catch { setLocalA(p => ({ ...p, status: prev })); }
    }
    onUpdated?.(upd);
    if (s === "Bereit") pushNotif("✅ Auftrag fertig", `${ss(localA.patient)} ist bereit`, "status");
    if (s === "Zurückgeschickt") pushNotif("↩️ Zurückgeschickt", `${ss(localA.patient)} wurde zurückgeschickt`, "status");
  };

  const fotos   = Array.isArray(localA.fotos)   ? localA.fotos   : [];
  const verlauf = Array.isArray(localA.verlauf)  ? localA.verlauf : [];
  const sm      = getStatus(ss(localA.status));
  const zurueck = isZurueck(localA);

  return (
    <div ref={swipeRef} style={{ position: "fixed", inset: 0, zIndex: 2000, background: C.cream, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", animation: "springIn .36s cubic-bezier(.22,1,.36,1)" }}>
      {/* Header */}
      <div style={{ background: "rgba(250,250,249,0.94)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${C.sand}`, paddingTop: "env(safe-area-inset-top, 44px)", padding: `env(safe-area-inset-top, 44px) 16px 14px`, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
        <button onClick={onBack} className="btn-press" style={{ background: C.parch, border: "none", borderRadius: "50%", width: 38, height: 38, fontSize: 19, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "Georgia,serif" }}>{ss(localA.patient)}</div>
          <div style={{ fontSize: 13, color: C.fog }}>{ss(localA.zahnarzt)}</div>
        </div>
        <StatusBadge status={ss(localA.status)} />
      </div>

      {/* Zurückgeschickt Alert */}
      {zurueck && (
        <div style={{ background: C.stZurBg, borderBottom: `2px solid ${C.stZur}44`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, animation: "fadeUp .3s cubic-bezier(.22,1,.36,1)" }}>
          <span style={{ fontSize: 24 }}>↩️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.stZur, fontFamily: "Georgia,serif" }}>Auftrag zurückgeschickt</div>
            <div style={{ fontSize: 13, color: C.stZur + "BB", marginTop: 2 }}>Bitte Korrekturen vornehmen und Zahnarzt kontaktieren</div>
          </div>
        </div>
      )}

      <div style={{ padding: "16px 16px calc(env(safe-area-inset-bottom,0px) + 100px)" }}>
        {/* Quick Actions Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { icon: "📋", label: "Status ändern", action: () => setShowStatus(true), accent: C.sage },
            { icon: "💬", label: "Chat öffnen",   action: () => onOpenChat(localA.id, localA), accent: C.info },
            { icon: "📷", label: "Foto",           action: () => setShowFoto(true),  accent: C.goldDk },
            { icon: "📱", label: "SMS",            action: () => setShowSms(true),   accent: C.pur },
            { icon: "🤖", label: "KI-Hinweise",  action: () => onOpenAIHints?.(localA), accent: C.gold },
            { icon: "✏️",  label: "Anweisungen", action: () => { setAnwText(ss(localA.anweisungen)); setShowAnw(true); }, accent: C.ink },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action} className="btn-press"
              style={{ background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 18, padding: "18px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 12px rgba(28,25,23,0.07)" }}>
              <span style={{ fontSize: 28 }}>{btn.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.inkMd }}>{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Info Card */}
        <Card pad={0} style={{ marginBottom: 16, overflow: "hidden" }}>
          <div style={{ background: `linear-gradient(135deg,${C.brand},#3D2823)`, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: C.sage, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Arbeitsdetails</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.white, fontFamily: "Georgia,serif" }}>{ss(localA.arbeitstyp)}</div>
          </div>
          <div style={{ padding: "0 16px 4px" }}>
            <InfoRow label="Zahnarzt"  value={localA.zahnarzt} />
            <InfoRow label="Farbe"     value={localA.farbe} />
            <InfoRow label="Eingang"   value={fmtDate(localA.eingang)} />
            <InfoRow label="Fällig"    value={fmtDate(localA.faelligkeit)} accent={isLate(localA) ? C.err : undefined} />
            {localA.zahn && <InfoRow label="Zahn" value={ss(localA.zahn)} />}
            {localA.prioritaet && <InfoRow label="Priorität" value={localA.prioritaet === "Notfall" ? "🚨 Notfall" : localA.prioritaet === "Dringend" ? "🔴 Dringend" : localA.dringend ? "🔴 Dringend" : "✓ Normal"} accent={localA.prioritaet === "Normal" ? undefined : C.err} />}
            {localA.anweisungen && <InfoRow label="Anweisungen" value={ss(localA.anweisungen)} last />}
          </div>
        </Card>

        {/* Fotos */}
        {fotos.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.inkMd, marginBottom: 10 }}>Fotos ({fotos.length})</div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {fotos.map((path, i) => (
                <SignedImg key={i} path={path} onClick={() => getPhotoUrl(path).then(url => window.open(url))} style={{ width: 88, height: 88, borderRadius: 14, objectFit: "cover", flexShrink: 0, boxShadow: "0 2px 10px rgba(0,0,0,0.12)", cursor: "zoom-in" }} />
              ))}
            </div>
          </div>
        )}

        {/* Verlauf */}
        {verlauf.length > 0 && (
          <Card pad={18} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.inkMd, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "Georgia,serif" }}>Status-Verlauf</div>
            {[...verlauf].reverse().map((v, i) => {
              const vSm = getStatus(ss(v.status));
              return (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < verlauf.length - 1 ? 16 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: i === 0 ? vSm.dot : C.sand, marginTop: 3, zIndex: 1 }} />
                    {i < verlauf.length - 1 && <div style={{ width: 2, flex: 1, background: C.sand, marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: i < verlauf.length - 1 ? 4 : 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: i === 0 ? vSm.text : C.inkMd }}>{vSm.icon} {ss(v.status)}</div>
                    <div style={{ fontSize: 12, color: C.fog, marginTop: 2 }}>{fmtDate(v.datum)}</div>
                    {v.notiz && <div style={{ fontSize: 13, color: C.inkLt, marginTop: 4, lineHeight: 1.4 }}>{v.notiz}</div>}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>

      {showStatus && <StatusSheet current={ss(localA.status)} onSelect={handleStatus} onClose={() => setShowStatus(false)} />}
      {showSms    && <SmsSheet auftrag={localA} onClose={() => setShowSms(false)} />}
      {showFoto   && <FotoSheet auftragId={localA.id} onClose={() => setShowFoto(false)} onUploaded={url => setLocalA(p => ({ ...p, fotos: [...(Array.isArray(p.fotos) ? p.fotos : []), url] }))} />}
      {showAnw && (
        <Sheet onClose={() => setShowAnw(false)} title="Anweisungen bearbeiten">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <textarea value={anwText} onChange={e => setAnwText(e.target.value)} rows={6}
              style={{ background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 14, padding: "14px 16px", fontSize: 16, color: C.ink, resize: "none", fontFamily: "inherit", boxSizing: "border-box", width: "100%" }}
              placeholder="Anweisungen für den Techniker…" />
            <button onClick={async () => {
              const upd = { ...localA, anweisungen: anwText, updated_at: new Date().toISOString() };
              setLocalA(upd);
              setShowAnw(false);
              if (isConf()) {
                try { await DB.auftraege.update(localA.id, { anweisungen: anwText, updated_at: upd.updated_at }); }
                catch { setLocalA(p => ({ ...p, anweisungen: localA.anweisungen })); }
              }
              onUpdated?.(upd);
            }} className="btn-press"
              style={{ background: `linear-gradient(135deg,${C.sage},${C.sageDk})`, color: C.white, border: "none", borderRadius: 16, padding: "16px", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: `0 6px 24px ${C.sage}44` }}>
              ✅ Speichern
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § PATIENT SCREEN
// ═══════════════════════════════════════════════════════════════════════
function PatientScreen({ auftraege, onOpenDetail, onOpenPatient, onClose }) {
  const [search, setSearch] = useState("");
  const swipeRef = useSwipeBack(onClose);

  const patients = [...new Map(
    auftraege.filter(a => ss(a.patient)).map(a => [ss(a.patient), {
      name: ss(a.patient), zahnarzt: ss(a.zahnarzt),
      count: auftraege.filter(x => x.patient === a.patient).length,
      latest: a,
      hasZurueck: auftraege.filter(x => x.patient === a.patient && isZurueck(x)).length > 0,
    }])
  ).values()].filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div ref={swipeRef} style={{ position: "fixed", inset: 0, zIndex: 1500, background: C.cream, display: "flex", flexDirection: "column", overflow: "hidden", animation: "springIn .32s cubic-bezier(.22,1,.36,1)" }}>
      <div style={{ background: "rgba(250,250,249,0.94)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${C.sand}`, paddingTop: "env(safe-area-inset-top, 44px)", padding: `env(safe-area-inset-top, 44px) 20px 14px`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} className="btn-press" style={{ background: C.parch, border: "none", borderRadius: "50%", width: 38, height: 38, fontSize: 19, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, fontFamily: "Georgia,serif" }}>👥 Patienten</div>
      </div>

      <div style={{ padding: "12px 16px 8px", flexShrink: 0 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Patient suchen…"
          style={{ width: "100%", background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 14, padding: "12px 16px", fontSize: 16, boxSizing: "border-box" }} />
      </div>

      <div className="scroll-view" style={{ flex: 1, overflowY: "auto", padding: "4px 16px calc(env(safe-area-inset-bottom,0px) + 24px)" }}>
        {patients.length === 0 && <EmptyState icon="👥" title="Keine Patienten" sub="Patienten werden aus Aufträgen erstellt" />}
        {patients.map((p, i) => (
          <div key={p.name} onClick={() => onOpenPatient ? onOpenPatient(p.name) : onOpenDetail(p.latest)} className="card-press"
            style={{ background: C.white, borderRadius: 18, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 12px rgba(28,25,23,0.07)", display: "flex", alignItems: "center", gap: 12, animation: `fadeUp .28s cubic-bezier(.22,1,.36,1) ${i * 35}ms both`, border: `1.5px solid ${p.hasZurueck ? C.stZur + "44" : "transparent"}` }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: p.hasZurueck ? C.stZurBg : C.sageLt, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20, color: p.hasZurueck ? C.stZur : C.sageDk, flexShrink: 0 }}>{p.name.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: p.hasZurueck ? C.stZur : C.ink, fontFamily: "Georgia,serif" }}>{p.name}</div>
              <div style={{ fontSize: 13, color: C.fog, marginTop: 2 }}>{p.zahnarzt} · {p.count} Auftrag{p.count !== 1 ? "aufträge" : ""}</div>
              {p.hasZurueck && <div style={{ fontSize: 11, color: C.stZur, fontWeight: 600, marginTop: 3 }}>↩️ Zurückgeschickt</div>}
            </div>
            <span style={{ color: C.fog, fontSize: 22 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § HOME SCREEN (with TaskFocusCard)
// ═══════════════════════════════════════════════════════════════════════
function HomeScreen({ auftraege, unread, missed, onOpenDetail, onSaveNew, onOpenChat, user }) {
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("Alle");
  const [showNew,  setShowNew]  = useState(false);
  const [patienten, setPatienten] = useState([]);

  useEffect(() => {
    if (isConf()) DB.patienten.list().then(d => setPatienten(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const filtered = auftraege.filter(a => {
    const matchFilter = filter === "Alle" || ss(a.status) === filter;
    const matchSearch = !search ||
      ss(a.patient).toLowerCase().includes(search.toLowerCase()) ||
      ss(a.zahnarzt).toLowerCase().includes(search.toLowerCase()) ||
      ss(a.arbeitstyp).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    const ua = unread[a.id] || 0, ub = unread[b.id] || 0;
    if (isZurueck(b) !== isZurueck(a)) return isZurueck(b) ? 1 : -1;
    if (ub !== ua) return ub - ua;
    const la = isLate(a) ? 1 : 0, lb = isLate(b) ? 1 : 0;
    if (lb !== la) return lb - la;
    return new Date(b.eingang || 0) - new Date(a.eingang || 0);
  });

  const FILTERS = ["Alle", ...STATUS_LIST.filter(s => s !== "Archiviert")];
  const zurueckCount = auftraege.filter(a => isZurueck(a)).length;

  return (
    <div className="scroll-view" style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "20px 20px 14px" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.fog, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Guten Tag</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, fontFamily: "Georgia,serif", letterSpacing: "-0.5px" }}>{ss(user?.name)}</div>
          {user?.rolle && <div style={{ fontSize: 12, color: C.fog, marginTop: 2 }}>{user.rolle}</div>}
        </div>
        <button onClick={() => setShowNew(true)} className="btn-press"
          style={{ background: `linear-gradient(135deg,${C.sage},${C.sageDk})`, color: C.white, border: "none", borderRadius: 14, padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 18px ${C.sage}44` }}>
          ＋ Auftrag
        </button>
      </div>

      {/* Task Focus Card */}
      <TaskFocusCard auftraege={auftraege} unread={unread} missed={missed}
        onOpenDetail={onOpenDetail} onOpenChat={onOpenChat} />

      {/* Search */}
      <div style={{ padding: "16px 16px 10px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Aufträge suchen…"
          style={{ width: "100%", background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 14, padding: "12px 16px", fontSize: 16, boxSizing: "border-box", boxShadow: "0 2px 8px rgba(28,25,23,0.05)" }} />
      </div>

      {/* Filter Pills */}
      <div style={{ display: "flex", gap: 8, padding: "0 16px 14px", overflowX: "auto" }}>
        {FILTERS.map(f => {
          const sm  = getStatus(f);
          const cnt = f === "Zurückgeschickt" ? zurueckCount : 0;
          return <Chip key={f} label={f} active={filter === f} onClick={() => setFilter(f)} dot={f !== "Alle" ? sm.dot : undefined} count={cnt} />;
        })}
      </div>

      {/* List */}
      {sorted.length === 0 && <EmptyState icon="📋" title={search ? "Keine Treffer" : "Keine Aufträge"} sub={search ? "Suchbegriff anpassen" : "Leg deinen ersten Auftrag an"} cta={!search ? "＋ Neuer Auftrag" : undefined} onCta={() => setShowNew(true)} />}

      <div style={{ padding: "0 16px calc(env(safe-area-inset-bottom,0px) + 100px)" }}>
        {sorted.map((a, i) => <AuftragCard key={a.id} a={a} unread={unread[a.id] || 0} index={i} onPress={() => onOpenDetail(a)} />)}
      </div>

      {showNew && <NewAuftragSheet patienten={patienten} onSave={a => { onSaveNew(a); setShowNew(false); }} onClose={() => setShowNew(false)} />}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// § BELEGE FLOW (5 Schritte — preview bug fixed)
// ═══════════════════════════════════════════════════════════════════════
function BelegeFlow({ user, materials, onClose, onSaved }) {
  const [step,      setStep]      = useState(1);
  const [docType,   setDocType]   = useState("invoice");
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [analysis,  setAnalysis]  = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg,setAnalyzeMsg]= useState("Beleg wird analysiert…");
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState(null);
  const [payStatus, setPayStatus] = useState("offen");
  const camRef = useRef(); const galRef = useRef();
  const swipeRef = useSwipeBack(() => { if (step <= 2) { step === 1 ? onClose() : setStep(1); } }, step <= 2);

  const ANALYZE_MSGS = ["Beleg wird erkannt…","Lieferant identifiziert…","Beträge werden gelesen…","Positionen werden zugeordnet…","Fast fertig…"];
  const DOC_TYPES = [
    { k: "invoice",         icon: "🧾", label: "Rechnung",          desc: "Lieferanten-Rechnung" },
    { k: "delivery_note",   icon: "📦", label: "Lieferschein",       desc: "Wareneingangsdokument" },
    { k: "hkp",             icon: "📋", label: "Heil- & Kostenplan", desc: "HKP-Dokument" },
    { k: "mehrkosten",      icon: "📝", label: "Mehrkostenvereinb.", desc: "Mehrkosten-Dokument" },
  ];

  const hashFile = async f => { const buf = await f.arrayBuffer(); const dig = await crypto.subtle.digest("SHA-256",buf); return Array.from(new Uint8Array(dig)).map(b=>b.toString(16).padStart(2,"0")).join(""); };

  const handleFile = async f => {
    if (!f) return;
    setErr(null); setImgLoaded(false);
    // Preview set SYNCHRONOUSLY before any await
    const objectUrl = URL.createObjectURL(f);
    setFile(f); setPreview(objectUrl); setStep(3);

    let hash = "";
    try { hash = await hashFile(f); } catch { hash = genId(); }
    if (isConf() && hash) {
      try { const ex = await DB.documents.list(`file_hash=eq.${hash}&limit=1`); if (Array.isArray(ex) && ex.length > 0) { setErr("⚠ Duplikat erkannt — Beleg bereits vorhanden"); setStep(2); URL.revokeObjectURL(objectUrl); setPreview(null); return; } }
      catch {}
    }
    await analyzeFile(f, hash);
  };

  const analyzeFile = async (f, hash) => {
    setAnalyzing(true); setErr(null);
    let mi = 0; setAnalyzeMsg(ANALYZE_MSGS[0]);
    const msgTimer = setInterval(() => { mi = Math.min(mi+1, ANALYZE_MSGS.length-1); setAnalyzeMsg(ANALYZE_MSGS[mi]); }, 1900);
    try {
      const reader = new FileReader();
      const b64 = await new Promise((res,rej) => { reader.onload = e => res(e.target.result.split(",")[1]); reader.onerror = rej; reader.readAsDataURL(f); });
      const res = await fetch("/.netlify/functions/ai-analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ mode:"analyze", imageBase64:b64, mimeType:f.type, documentType:docType }) });
      if (!res.ok) throw new Error("Analyse fehlgeschlagen");
      const data = await res.json();
      setAnalysis({ ...data, file_hash: hash });
      clearInterval(msgTimer); setStep(4);
    } catch {
      clearInterval(msgTimer);
      setErr("KI-Analyse fehlgeschlagen — bitte manuell ausfüllen");
      setAnalysis({ supplier_name:"", document_date:today(), total_amount:0, currency:"EUR", patient_name:"", items:[], confidence:0, file_hash:hash });
      setStep(4);
    }
    setAnalyzing(false);
  };

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      let fileUrl = null;
      if (file && isConf()) fileUrl = await DB.storage.upload(file);
      const doc = { id:genId(), document_type:docType, supplier_name:ss(analysis?.supplier_name), document_number:ss(analysis?.document_number), document_date:ss(analysis?.document_date), total_amount:parseFloat(analysis?.total_amount)||0, currency:ss(analysis?.currency)||"EUR", patient_name:ss(analysis?.patient_name), treatment_name:ss(analysis?.treatment_name), payment_status:payStatus, file_url:fileUrl, file_hash:ss(analysis?.file_hash), confidence_score:analysis?.confidence||0, created_at:new Date().toISOString() };
      if (isConf()) {
        await DB.documents.insert(doc);
        if (Array.isArray(analysis?.items)) {
          for (const item of analysis.items) {
            const matched = fuzzyMatch(item.name_raw, materials);
            await DB.docItems.insert({ id:genId(), document_id:doc.id, name_raw:ss(item.name_raw), name_normalized:ss(item.name_normalized||item.name_raw), quantity:parseFloat(item.quantity)||1, unit:ss(item.unit), unit_price:parseFloat(item.unit_price)||0, total_price:parseFloat(item.total_price)||0, material_id:matched?.id||null, confidence:parseFloat(item.confidence)||0 }).catch(()=>{});
            if (matched && docType==="delivery_note") {
              await DB.invMoves.insert({ id:genId(), material_id:matched.id, document_id:doc.id, movement_type:"in", quantity:parseFloat(item.quantity)||1, unit:ss(item.unit), note:`Lieferschein: ${doc.supplier_name}`, created_at:new Date().toISOString() }).catch(()=>{});
            }
          }
        }
      }
      onSaved?.(doc);
      if (preview) URL.revokeObjectURL(preview);
      setStep(5);
    } catch (e) { setErr("Speichern fehlgeschlagen: " + e.message); }
    setSaving(false);
  };

  useEffect(() => { return () => { if (preview) URL.revokeObjectURL(preview); }; }, []);

  const dtInfo = DOC_TYPES.find(d => d.k === docType);

  return (
    <div ref={swipeRef} style={{ position:"fixed", inset:0, zIndex:2000, background:C.cream, display:"flex", flexDirection:"column", overflow:"hidden", animation:"springIn .32s cubic-bezier(.22,1,.36,1)" }}>
      {/* Header */}
      <div style={{ background:"rgba(250,250,249,0.94)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderBottom:`1px solid ${C.sand}`, paddingTop:"env(safe-area-inset-top,44px)", padding:`env(safe-area-inset-top,44px) 20px 14px`, display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <button onClick={() => { if (step<=2) { step===1?onClose():setStep(1); } }} className="btn-press" style={{ background:C.parch, border:"none", borderRadius:"50%", width:38, height:38, fontSize:step<=2?18:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {step<=2?"✕":"‹"}
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:16, color:C.ink, fontFamily:"Georgia,serif" }}>
            {["","Belegart","Aufnehmen","Analysiere…","Prüfen","Gespeichert!"][step]}
          </div>
          {step>=2&&step<5&&<div style={{ fontSize:12, color:C.fog, marginTop:1 }}>Schritt {step} von 4</div>}
        </div>
        <div style={{ width:80, height:4, background:C.sand, borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${(step-1)/4*100}%`, background:step===5?C.ok:C.sage, borderRadius:2, transition:"width .4s cubic-bezier(.22,1,.36,1)" }} />
        </div>
      </div>

      <div className="scroll-view" style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain" }}>
        {/* STEP 1 */}
        {step===1 && (
          <div className="fade-up" style={{ padding:"28px 20px 40px" }}>
            <div style={{ fontSize:24, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", letterSpacing:"-0.4px", marginBottom:6 }}>Was erfasst du?</div>
            <div style={{ fontSize:15, color:C.fog, marginBottom:28, lineHeight:1.5 }}>Wähle die Art des Belegs</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {DOC_TYPES.map((t,i) => (
                <button key={t.k} onClick={() => { setDocType(t.k); setStep(2); }} className="btn-press card-press"
                  style={{ background:docType===t.k?C.sageLt:C.white, border:`2px solid ${docType===t.k?C.sage:C.sand}`, borderRadius:20, padding:"18px 20px", display:"flex", alignItems:"center", gap:16, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 2px 12px rgba(28,25,23,0.07)", animation:`fadeUp .32s cubic-bezier(.22,1,.36,1) ${i*55}ms both` }}>
                  <div style={{ width:52, height:52, borderRadius:16, background:docType===t.k?C.sage:C.parch, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0, transition:"all .2s" }}>{t.icon}</div>
                  <div style={{ flex:1, textAlign:"left" }}>
                    <div style={{ fontSize:17, fontWeight:700, color:docType===t.k?C.sageDk:C.ink, marginBottom:2, fontFamily:"Georgia,serif" }}>{t.label}</div>
                    <div style={{ fontSize:13, color:C.fog }}>{t.desc}</div>
                  </div>
                  {docType===t.k && <div style={{ width:28, height:28, borderRadius:"50%", background:C.sage, display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontSize:14, fontWeight:800, flexShrink:0, animation:"popIn .25s cubic-bezier(.22,1,.36,1)" }}>✓</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step===2 && (
          <div className="fade-up" style={{ padding:"28px 20px 40px" }}>
            <div style={{ fontSize:24, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", marginBottom:6 }}>{dtInfo?.icon} {dtInfo?.label}</div>
            <div style={{ fontSize:15, color:C.fog, marginBottom:28, lineHeight:1.5 }}>Fotografiere den Beleg oder lade eine Datei hoch</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <button onClick={() => camRef.current?.click()} className="btn-press"
                style={{ width:"100%", background:`linear-gradient(135deg,${C.sage},${C.sageDk})`, color:C.white, border:"none", borderRadius:20, padding:"22px", display:"flex", alignItems:"center", justifyContent:"center", gap:14, fontSize:18, fontWeight:700, cursor:"pointer", boxShadow:`0 8px 28px ${C.sage}44` }}>
                📷 Kamera öffnen
              </button>
              <button onClick={() => galRef.current?.click()} className="btn-press"
                style={{ width:"100%", background:C.white, color:C.ink, border:`1.5px solid ${C.sand}`, borderRadius:20, padding:"20px", display:"flex", alignItems:"center", justifyContent:"center", gap:14, fontSize:16, fontWeight:600, cursor:"pointer", boxShadow:"0 2px 12px rgba(28,25,23,0.07)" }}>
                🖼 Aus Galerie / PDF
              </button>
              <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=""; }} />
              <input ref={galRef} type="file" accept="image/*,application/pdf" style={{ display:"none" }} onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=""; }} />
              {err && <div className="fade-up" style={{ background:C.errLt, border:`1px solid ${C.err}30`, borderRadius:14, padding:"14px 16px", color:C.err, fontSize:14, fontWeight:600 }}>{err}</div>}
              <button onClick={() => setStep(1)} style={{ background:"none", border:"none", color:C.fog, fontSize:15, cursor:"pointer", fontFamily:"inherit", padding:"12px", width:"100%", textAlign:"center" }}>← Zurück</button>
            </div>
          </div>
        )}

        {/* STEP 3: Analyzing */}
        {step===3 && (
          <div className="fade-up" style={{ padding:"28px 20px 40px", display:"flex", flexDirection:"column", alignItems:"center" }}>
            {preview ? (
              <div style={{ marginBottom:32, position:"relative" }}>
                {!imgLoaded && <div className="skeleton" style={{ width:220, height:280, borderRadius:20 }} />}
                <img src={preview} alt="Vorschau" onLoad={() => setImgLoaded(true)}
                  style={{ width:220, height:280, objectFit:"cover", borderRadius:20, boxShadow:"0 16px 52px rgba(28,25,23,0.2)", display:imgLoaded?"block":"none", animation:imgLoaded?"springIn .38s cubic-bezier(.22,1,.36,1)":undefined }} />
                {analyzing && imgLoaded && (
                  <div style={{ position:"absolute", inset:0, borderRadius:20, background:"linear-gradient(180deg,transparent 0%,rgba(122,158,142,0.16) 50%,transparent 100%)", backgroundSize:"100% 200%", animation:"shimmer 2s ease-in-out infinite" }} />
                )}
              </div>
            ) : (
              <div className="skeleton" style={{ width:220, height:280, borderRadius:20, marginBottom:32 }} />
            )}
            <div style={{ width:64, height:64, borderRadius:"50%", background:`linear-gradient(135deg,${C.sage},${C.sageDk})`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 8px 28px ${C.sage}44`, animation:"breathe 2s ease-in-out infinite", marginBottom:16 }}>
              <span style={{ fontSize:30 }}>🤖</span>
            </div>
            <div style={{ fontSize:17, fontWeight:700, color:C.ink, textAlign:"center", fontFamily:"Georgia,serif", marginBottom:8 }}>{analyzeMsg}</div>
            <div style={{ fontSize:13, color:C.fog, textAlign:"center", lineHeight:1.5, marginBottom:16 }}>Erkennt Lieferant, Beträge & Positionen</div>
            <div style={{ display:"flex", gap:6 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:C.sage, animation:`pulse 1.2s ease-in-out ${i*0.3}s infinite` }} />)}
            </div>
          </div>
        )}

        {/* STEP 4: Review */}
        {step===4 && analysis && (
          <div className="slide-r" style={{ padding:"20px 20px 40px" }}>
            {/* Preview + Confidence */}
            {preview && (
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22, padding:16, background:C.white, borderRadius:20, boxShadow:"0 2px 14px rgba(28,25,23,0.08)" }}>
                <div style={{ width:68, height:68, borderRadius:14, overflow:"hidden", flexShrink:0, background:C.sand }}>
                  <img src={preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => { e.target.style.display="none"; }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:C.ink, marginBottom:6, fontFamily:"Georgia,serif" }}>{dtInfo?.label}</div>
                  {analysis.confidence>0 && (
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                        <div style={{ flex:1, height:5, background:C.sand, borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${analysis.confidence}%`, background:analysis.confidence>70?C.ok:C.warn, borderRadius:3, transition:"width .5s cubic-bezier(.22,1,.36,1)" }} />
                        </div>
                        <div style={{ fontSize:12, fontWeight:700, color:analysis.confidence>70?C.ok:C.warn, flexShrink:0 }}>{Math.round(analysis.confidence)}%</div>
                      </div>
                      {analysis.confidence<70 && <div style={{ fontSize:11, color:C.warn, fontWeight:600 }}>⚠ Bitte Felder prüfen</div>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {err && <div className="fade-up" style={{ background:C.errLt, borderRadius:14, padding:"12px 16px", color:C.err, fontSize:14, fontWeight:600, marginBottom:16 }}>{err}</div>}

            {/* Editable fields */}
            <div style={{ background:C.white, borderRadius:20, overflow:"hidden", boxShadow:"0 2px 14px rgba(28,25,23,0.07)", marginBottom:16 }}>
              {[["Lieferant","supplier_name","text"],["Rech.-Nr.","document_number","text"],["Datum","document_date","date"],["Patient","patient_name","text"],["Betrag (€)","total_amount","text"]].map(([lbl,key,type],i,arr) => (
                <div key={key} style={{ padding:"14px 18px", borderBottom:i<arr.length-1?`1px solid ${C.sand}`:"none" }}>
                  <label style={{ fontSize:11, fontWeight:600, color:C.fog, textTransform:"uppercase", letterSpacing:"0.6px", display:"block", marginBottom:5 }}>{lbl}</label>
                  <input value={ss(analysis[key])} onChange={e => setAnalysis(p => ({ ...p, [key]:e.target.value }))} type={type}
                    style={{ width:"100%", background:"transparent", border:"none", fontSize:16, color:C.ink, fontFamily:"inherit", padding:0, boxShadow:"none" }} />
                </div>
              ))}
            </div>

            {/* Zahlungsstatus */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.fog, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10 }}>Zahlungsstatus</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {Object.entries(PAY_META).slice(0,4).map(([k,ps]) => (
                  <button key={k} onClick={() => setPayStatus(k)} className="btn-press"
                    style={{ padding:"10px 16px", borderRadius:22, border:`2px solid ${payStatus===k?ps.color:C.sand}`, background:payStatus===k?ps.bg:C.white, color:payStatus===k?ps.color:C.fog, fontSize:13, fontWeight:payStatus===k?700:500, cursor:"pointer", transition:"all .15s" }}>
                    {ps.icon} {ps.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Positionen */}
            {Array.isArray(analysis.items)&&analysis.items.length>0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.inkMd, marginBottom:10 }}>{analysis.items.length} erkannte Position{analysis.items.length!==1?"en":""}</div>
                <div style={{ background:C.white, borderRadius:16, overflow:"hidden", boxShadow:"0 2px 12px rgba(28,25,23,0.07)" }}>
                  {analysis.items.map((item,i) => {
                    const matched = fuzzyMatch(item.name_raw, materials);
                    return (
                      <div key={i} style={{ padding:"14px 16px", borderBottom:i<analysis.items.length-1?`1px solid ${C.sand}`:"none" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                          <div style={{ fontSize:14, fontWeight:600, color:C.ink, flex:1, marginRight:8 }}>{ss(item.name_raw)}</div>
                          <div style={{ fontSize:14, fontWeight:700, color:C.sageDk, flexShrink:0 }}>€ {parseFloat(item.total_price||0).toFixed(2)}</div>
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span style={{ fontSize:12, color:C.fog }}>{item.quantity} {item.unit}</span>
                          {matched?<span style={{ fontSize:11, color:C.ok, fontWeight:700 }}>✅ {matched.name}</span>:<span style={{ fontSize:11, color:C.warn, fontWeight:600 }}>⚠ Nicht zugeordnet</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={save} disabled={saving} className="btn-press"
              style={{ width:"100%", background:saving?C.sand:`linear-gradient(135deg,${C.sage},${C.sageDk})`, color:C.white, border:"none", borderRadius:20, padding:"20px", fontSize:17, fontWeight:700, cursor:saving?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:12, boxShadow:saving?"none":`0 8px 28px ${C.sage}44`, transition:"all .2s cubic-bezier(.22,1,.36,1)" }}>
              {saving ? <><Spinner size={20} color={C.white} />Wird gespeichert…</> : "💾 Beleg speichern"}
            </button>
          </div>
        )}

        {/* STEP 5 */}
        {step===5 && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"64px 32px", minHeight:360, textAlign:"center", gap:20 }}>
            <div style={{ width:100, height:100, borderRadius:"50%", background:`linear-gradient(135deg,${C.ok},#14A84A)`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 16px 52px ${C.ok}44`, animation:"popIn .5s cubic-bezier(.22,1,.36,1)" }}>
              <span style={{ fontSize:48, color:C.white }}>✓</span>
            </div>
            <div style={{ fontSize:26, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", animation:"fadeUp .4s cubic-bezier(.22,1,.36,1) .15s both" }}>Beleg gespeichert!</div>
            <div style={{ fontSize:15, color:C.fog, maxWidth:260, lineHeight:1.6, animation:"fadeUp .4s cubic-bezier(.22,1,.36,1) .22s both" }}>
              Erfolgreich erfasst und analysiert.{docType==="delivery_note"&&" Lagerbewegung automatisch erstellt."}
            </div>
            <button onClick={onClose} className="btn-press"
              style={{ background:`linear-gradient(135deg,${C.sage},${C.sageDk})`, color:C.white, border:"none", borderRadius:18, padding:"18px 40px", fontSize:17, fontWeight:700, cursor:"pointer", boxShadow:`0 8px 28px ${C.sage}44`, animation:"fadeUp .4s cubic-bezier(.22,1,.36,1) .32s both" }}>
              Fertig
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// § BELEG LIST (Geschäftsleitung)
// ═══════════════════════════════════════════════════════════════════════
function BelegListScreen({ user, materials }) {
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter,  setFilter]  = useState("alle");
  const [selDoc,  setSelDoc]  = useState(null);
  const [showPay, setShowPay] = useState(false);
  const isGL = ["Geschäftsleitung","Assistenz"].includes(ss(user?.rolle));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let qs = "order=created_at.desc&limit=100";
      if (filter !== "alle") qs += `&payment_status=eq.${filter}`;
      if (isConf()) { const d = await DB.documents.list(qs); setDocs(Array.isArray(d) ? d : []); }
      else setDocs([
        { id:"d1", supplier_name:"Dental Depot Nord", document_type:"invoice", document_date:"2024-01-15", total_amount:289.50, currency:"EUR", payment_status:"offen", patient_name:"Max Mustermann" },
        { id:"d2", supplier_name:"ZahnTech GmbH",     document_type:"delivery_note", document_date:"2024-01-10", total_amount:142.00, currency:"EUR", payment_status:"bezahlt", patient_name:"Erika Muster" },
        { id:"d3", supplier_name:"MedDental AG",       document_type:"invoice", document_date:"2023-12-20", total_amount:580.00, currency:"EUR", payment_status:"ueberfaellig", patient_name:"Klaus Fischer" },
      ]);
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updatePay = async k => {
    if (!selDoc) return;
    if (isConf()) await DB.documents.update(selDoc.id, { payment_status: k }).catch(() => {});
    setDocs(p => p.map(d => d.id === selDoc.id ? { ...d, payment_status: k } : d));
    setSelDoc(s => ({ ...s, payment_status: k }));
    setShowPay(false);
  };

  const FILTERS = [["alle","Alle"],["offen","Offen"],["bezahlt","Bezahlt"],["ueberfaellig","Überfällig"]];
  const docIcon  = t => t === "invoice" ? "🧾" : t === "delivery_note" ? "📦" : "📋";
  const docLabel = t => t === "invoice" ? "Rechnung" : t === "delivery_note" ? "Lieferschein" : t === "hkp" ? "HKP" : "Dokument";

  return (
    <div className="scroll-view" style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", padding:"20px 20px 12px" }}>
        <div style={{ fontSize:22, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", letterSpacing:"-0.4px" }}>📄 Belege</div>
        <button onClick={load} className="btn-press" style={{ background:C.parch, border:"none", borderRadius:10, padding:"8px 12px", fontSize:14, cursor:"pointer", color:C.fog }}>↻</button>
      </div>

      {!isGL && (
        <div style={{ margin:"0 16px 16px", background:C.warnLt, border:`1px solid ${C.warn}44`, borderRadius:16, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>🔒</span>
          <div style={{ fontSize:14, color:C.warn, fontWeight:600 }}>Nur für Geschäftsleitung sichtbar</div>
        </div>
      )}

      <div style={{ display:"flex", gap:8, padding:"0 16px 14px", overflowX:"auto" }}>
        {FILTERS.map(([k,l]) => <Chip key={k} label={l} active={filter===k} onClick={() => setFilter(k)} />)}
      </div>

      {loading && <div style={{ display:"flex", justifyContent:"center", padding:32 }}><Spinner /></div>}
      {!loading && docs.length === 0 && <EmptyState icon="📄" title="Keine Belege" sub="Noch keine Belege für diesen Filter" />}

      <div style={{ padding:"0 16px calc(env(safe-area-inset-bottom,0px) + 100px)" }}>
        {docs.map((doc, i) => {
          const ps = getPS(doc.payment_status);
          return (
            <div key={doc.id} onClick={() => setSelDoc(doc)} className="card-press"
              style={{ background:C.white, borderRadius:18, padding:"14px 16px", marginBottom:10, boxShadow:"0 2px 12px rgba(28,25,23,0.07)", border:`1.5px solid ${doc.payment_status==="ueberfaellig"?C.err:"transparent"}`, display:"flex", alignItems:"center", gap:12, animation:`fadeUp .28s cubic-bezier(.22,1,.36,1) ${i*25}ms both` }}>
              <div style={{ width:52, height:52, borderRadius:14, background:C.sageLt, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>
                {doc.file_url ? <img src={doc.file_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:14 }} onError={e => { e.target.style.display="none"; }} /> : docIcon(doc.document_type)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:15, color:doc.payment_status==="ueberfaellig"?C.err:C.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:"Georgia,serif" }}>{doc.supplier_name||"Unbekannt"}</div>
                <div style={{ fontSize:12, color:C.fog, marginTop:2 }}>{docLabel(doc.document_type)} · {fmtDate(doc.document_date)}{doc.patient_name?` · ${doc.patient_name}`:""}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                {doc.total_amount>0 && <div style={{ fontWeight:800, fontSize:16, color:C.ink, fontFamily:"Georgia,serif" }}>€ {parseFloat(doc.total_amount).toFixed(2)}</div>}
                <span style={{ background:ps.bg, color:ps.color, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{ps.icon} {ps.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Sheet */}
      {selDoc && (
        <Sheet onClose={() => setSelDoc(null)} title="Beleg Details">
          <div>
            {selDoc.file_url && <img src={selDoc.file_url} alt="Beleg" style={{ width:"100%", maxHeight:220, objectFit:"contain", borderRadius:16, marginBottom:18, background:C.parch }} />}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:19, color:C.ink, fontFamily:"Georgia,serif" }}>{selDoc.supplier_name||"Beleg"}</div>
                <div style={{ fontSize:13, color:C.fog, marginTop:3 }}>{docIcon(selDoc.document_type)} {docLabel(selDoc.document_type)}</div>
              </div>
              {isGL && (
                <button onClick={() => setShowPay(true)} className="btn-press"
                  style={{ background:getPS(selDoc.payment_status).bg, color:getPS(selDoc.payment_status).color, border:"none", borderRadius:20, padding:"9px 16px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  {getPS(selDoc.payment_status).icon} {getPS(selDoc.payment_status).label} ↓
                </button>
              )}
            </div>
            {selDoc.total_amount>0 && (
              <div style={{ background:C.sageLt, borderRadius:16, padding:"16px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:14, color:C.sageDk, fontWeight:600 }}>Gesamtbetrag</span>
                <span style={{ fontSize:26, fontWeight:800, color:C.sageDk, fontFamily:"Georgia,serif" }}>€ {parseFloat(selDoc.total_amount).toFixed(2)}</span>
              </div>
            )}
            {[["Datum",fmtDate(selDoc.document_date)],["Patient",selDoc.patient_name],["Rech.-Nr.",selDoc.document_number],["KI-Konfidenz",selDoc.confidence_score?`${Math.round(selDoc.confidence_score)}%`:null]].filter(([,v])=>v).map(([l,v],i,arr) => (
              <InfoRow key={l} label={l} value={v} last={i===arr.length-1} />
            ))}
            {selDoc.file_url && (
              <a href={selDoc.file_url} target="_blank" rel="noreferrer"
                style={{ display:"block", marginTop:16, background:C.sageLt, color:C.sageDk, borderRadius:16, padding:"16px", textAlign:"center", fontWeight:700, fontSize:16, textDecoration:"none" }}>
                🔗 Original öffnen
              </a>
            )}
          </div>
        </Sheet>
      )}
      {showPay && selDoc && <PaymentSheet current={selDoc.payment_status} onSelect={updatePay} onClose={() => setShowPay(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § MATERIAL SCREEN
// ═══════════════════════════════════════════════════════════════════════
function MaterialScreen({ materials }) {
  const [matTab, setMatTab] = useState("alle");
  const [search, setSearch] = useState("");
  const [selMat, setSelMat] = useState(null);

  const filtered = (materials || []).filter(m => {
    const ms = !search || ss(m.name).toLowerCase().includes(search.toLowerCase());
    if (!ms) return false;
    if (matTab === "warnungen") return (parseFloat(m.current_stock)||0) <= (parseFloat(m.min_stock)||0);
    if (matTab === "unmapped")  return !m.mapped;
    return true;
  });

  const lowStock   = (materials||[]).filter(m => (parseFloat(m.current_stock)||0) <= (parseFloat(m.min_stock)||0)).length;
  const unmappedCt = (materials||[]).filter(m => !m.mapped).length;
  const stockPct   = m => Math.min(100, Math.round(((parseFloat(m.current_stock)||0) / Math.max(parseFloat(m.max_stock)||parseFloat(m.min_stock)*3||100, 1)) * 100));

  return (
    <div className="scroll-view" style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding:"20px 20px 12px", fontSize:22, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", letterSpacing:"-0.4px" }}>🧪 Material</div>

      {(lowStock>0||unmappedCt>0) && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"0 16px 12px" }}>
          {lowStock>0 && <div style={{ background:C.errLt, border:`1.5px solid ${C.err}`, borderRadius:16, padding:14, textAlign:"center" }}><div style={{ fontSize:22, fontWeight:800, color:C.err }}>{lowStock}</div><div style={{ fontSize:12, color:C.err, fontWeight:600 }}>Niedriger Bestand</div></div>}
          {unmappedCt>0 && <div style={{ background:C.warnLt, border:`1.5px solid ${C.warn}`, borderRadius:16, padding:14, textAlign:"center" }}><div style={{ fontSize:22, fontWeight:800, color:C.warn }}>{unmappedCt}</div><div style={{ fontSize:12, color:C.warn, fontWeight:600 }}>Nicht zugeordnet</div></div>}
        </div>
      )}

      <div style={{ display:"flex", gap:8, padding:"0 16px 10px", overflowX:"auto" }}>
        {[["alle","Alle"],["warnungen","⚠ Warnungen"],["unmapped","Nicht gemappt"]].map(([k,l]) => <Chip key={k} label={l} active={matTab===k} onClick={() => setMatTab(k)} />)}
      </div>

      <div style={{ padding:"0 16px 10px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Material suchen…"
          style={{ width:"100%", background:C.white, border:`1.5px solid ${C.sand}`, borderRadius:14, padding:"12px 16px", fontSize:16, boxSizing:"border-box" }} />
      </div>

      {filtered.length===0 && <EmptyState icon="🧪" title="Keine Materialien" sub="Materialien werden über die Praxis-Software verwaltet" />}

      <div style={{ padding:"0 16px calc(env(safe-area-inset-bottom,0px) + 100px)" }}>
        {filtered.map((m, i) => {
          const cur = parseFloat(m.current_stock)||0, min = parseFloat(m.min_stock)||0, isLow = cur<=min;
          return (
            <Card key={m.id} onClick={() => setSelMat(m)} style={{ marginBottom:10, border:`1.5px solid ${isLow?C.err:"transparent"}`, animation:`fadeUp .25s cubic-bezier(.22,1,.36,1) ${i*22}ms both` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:isLow?C.err:C.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:"Georgia,serif" }}>{m.name}</div>
                  <div style={{ fontSize:12, color:C.fog, marginTop:2 }}>{ss(m.category)}{ss(m.unit)?` · ${m.unit}`:""}</div>
                </div>
                <div style={{ flexShrink:0, marginLeft:10, textAlign:"right" }}>
                  <div style={{ fontWeight:800, fontSize:19, color:isLow?C.err:C.ink, fontFamily:"Georgia,serif" }}>{cur}</div>
                  <div style={{ fontSize:11, color:C.fog }}>Min: {min}</div>
                </div>
              </div>
              <div style={{ height:6, background:C.sand, borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${stockPct(m)}%`, background:isLow?C.err:stockPct(m)>50?C.ok:C.warn, borderRadius:3, transition:"width .4s cubic-bezier(.22,1,.36,1)" }} />
              </div>
              {!m.mapped && <div style={{ marginTop:7, fontSize:11, color:C.warn, fontWeight:600 }}>⚠ Noch nicht zugeordnet</div>}
            </Card>
          );
        })}
      </div>

      {selMat && (
        <Sheet onClose={() => setSelMat(null)} title={selMat.name}>
          <div style={{ background:C.sageLt, borderRadius:18, padding:20, marginBottom:18, textAlign:"center" }}>
            <div style={{ fontSize:52, fontWeight:800, color:C.sageDk, fontFamily:"Georgia,serif" }}>{parseFloat(selMat.current_stock)||0}</div>
            <div style={{ fontSize:14, color:C.sageDk, fontWeight:600 }}>{ss(selMat.unit)||"Stück"} auf Lager</div>
          </div>
          <InfoRow label="Kategorie" value={selMat.category} />
          <InfoRow label="Einheit"   value={selMat.unit} />
          <InfoRow label="Mindest"   value={`${selMat.min_stock||0} ${selMat.unit||""}`} />
          <InfoRow label="Maximum"   value={`${selMat.max_stock||"–"} ${selMat.unit||""}`} />
          <InfoRow label="Mapped"    value={selMat.mapped?"✅ Ja":"⚠ Nein"} accent={selMat.mapped?C.ok:C.warn} last />
        </Sheet>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § STATISTIK SCREEN — mit Zurückgeschickt + Insights
// ═══════════════════════════════════════════════════════════════════════
function StatistikScreen({ auftraege, materials }) {
  const aktive     = auftraege.filter(a => a.status !== "Archiviert");
  const bereit     = auftraege.filter(a => a.status === "Bereit");
  const ueberfaellig = auftraege.filter(a => isLate(a));
  const zurueck    = auftraege.filter(a => isZurueck(a));
  const heute      = auftraege.filter(a => ss(a.eingang) === today());
  const perStatus  = {}; STATUS_LIST.forEach(s => { perStatus[s] = auftraege.filter(a => ss(a.status) === s).length; });
  const perTyp     = {}; auftraege.forEach(a => { const t = ss(a.arbeitstyp)||"Unbekannt"; perTyp[t] = (perTyp[t]||0)+1; });
  const topTypen   = Object.entries(perTyp).sort((a,b) => b[1]-a[1]).slice(0,6);

  return (
    <div className="scroll-view" style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding:"20px 20px 12px", fontSize:22, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", letterSpacing:"-0.4px" }}>📊 Statistik</div>

      {/* KPI Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"0 16px 16px" }}>
        {[
          { label:"Aktive Aufträge",    value:aktive.length,      color:C.sageDk, icon:"📋" },
          { label:"Bereit",             value:bereit.length,      color:C.ok,     icon:"✅" },
          { label:"Überfällig",         value:ueberfaellig.length,color:ueberfaellig.length>0?C.err:C.ok, icon:ueberfaellig.length>0?"⚠":"🎉" },
          { label:"Zurückgeschickt",    value:zurueck.length,     color:zurueck.length>0?C.stZur:C.ok, icon:"↩️" },
        ].map((k,i) => (
          <Card key={i} pad={18} style={{ animation:`fadeUp .28s cubic-bezier(.22,1,.36,1) ${i*45}ms both`, border:`1.5px solid ${k.value>0&&(k.label==="Überfällig"||k.label==="Zurückgeschickt")?k.color+"44":"transparent"}` }}>
            <div style={{ fontSize:28, marginBottom:6 }}>{k.icon}</div>
            <div style={{ fontSize:32, fontWeight:800, color:k.color, letterSpacing:"-1px", fontFamily:"Georgia,serif" }}>{k.value}</div>
            <div style={{ fontSize:13, color:C.fog, marginTop:2 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Insights */}
      {(zurueck.length>0||ueberfaellig.length>0) && (
        <div style={{ margin:"0 16px 16px", background:`linear-gradient(135deg,${C.brand},#3D2823)`, borderRadius:18, padding:"16px 20px" }}>
          <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>Handlungsbedarf</div>
          {zurueck.length>0 && <div style={{ fontSize:14, color:C.white, marginBottom:6 }}>↩️ <strong>{zurueck.length}</strong> Auftrag{zurueck.length!==1?"aufträge":""} zurückgeschickt</div>}
          {ueberfaellig.length>0 && <div style={{ fontSize:14, color:C.white }}>⏰ <strong>{ueberfaellig.length}</strong> Auftrag{ueberfaellig.length!==1?"aufträge":""} überfällig</div>}
        </div>
      )}

      {/* Status Verteilung */}
      <div style={{ padding:"0 16px 16px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.inkMd, marginBottom:14, textTransform:"uppercase", letterSpacing:"0.5px" }}>Status-Verteilung</div>
        {STATUS_LIST.filter(s => s !== "Archiviert").map((s, i) => {
          const count = perStatus[s]||0;
          const total = Math.max(auftraege.length, 1);
          const pct   = Math.round((count/total)*100);
          const sm    = getStatus(s);
          return (
            <div key={s} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:14, fontWeight:600, color:sm.text }}>{sm.icon} {s}</span>
                <span style={{ fontSize:14, fontWeight:700, color:C.inkMd }}>{count} <span style={{ color:C.fog, fontWeight:400 }}>({pct}%)</span></span>
              </div>
              <div style={{ height:8, background:C.sand, borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:sm.dot, borderRadius:4, transition:`width .5s cubic-bezier(.22,1,.36,1) ${i*60}ms` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Arbeitstypen */}
      {topTypen.length>0 && (
        <div style={{ padding:"0 16px calc(env(safe-area-inset-bottom,0px) + 100px)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.inkMd, marginBottom:14, textTransform:"uppercase", letterSpacing:"0.5px" }}>Top Arbeitstypen</div>
          {topTypen.map(([typ,count],i) => (
            <div key={typ} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12, animation:`fadeUp .25s cubic-bezier(.22,1,.36,1) ${i*40}ms both` }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:C.sageLt, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:C.sageDk, flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1, fontSize:14, fontWeight:600, color:C.ink, fontFamily:"Georgia,serif" }}>{typ}</div>
              <div style={{ fontWeight:800, fontSize:16, color:C.sageDk }}>{count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § SETTINGS SCREEN
// ═══════════════════════════════════════════════════════════════════════
function MitarbeiterAdmin({ user }) {
  const [profiles,  setProfiles]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState({});
  const [msgs,      setMsgs]      = useState({});
  const [localRoles,setLocalRoles]= useState({});
  const ROLLEN = ["admin","zahnarzt","assistenz","techniker"];

  useEffect(() => {
    if (!isConf()) return;
    setLoading(true);
    const session = sbAuth.getSession();
    if (!session?.access_token) { setLoading(false); return; }
    fetch(`${SB_URL}/rest/v1/profiles?select=id,email,name,rolle&order=email.asc`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProfiles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saveRolle = async (profileId, rolle) => {
    setSaving(p => ({ ...p, [profileId]: true }));
    setMsgs(p => ({ ...p, [profileId]: null }));
    try {
      const session = sbAuth.getSession();
      if (!session?.access_token) throw new Error("Nicht eingeloggt");
      const res = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${profileId}`, {
        method: "PATCH",
        headers: { apikey: SB_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ rolle }),
      });
      if (!res.ok) throw new Error("Speichern fehlgeschlagen");
      setProfiles(p => p.map(pr => pr.id === profileId ? { ...pr, rolle } : pr));
      setMsgs(p => ({ ...p, [profileId]: { t: "ok", m: "✅ Gespeichert" } }));
      setTimeout(() => setMsgs(p => ({ ...p, [profileId]: null })), 2500);
    } catch(e) {
      setMsgs(p => ({ ...p, [profileId]: { t: "err", m: e.message || "Fehler" } }));
    }
    setSaving(p => ({ ...p, [profileId]: false }));
  };

  return (
    <Card pad={18} style={{ marginBottom:16 }}>
      <div style={{ fontSize:15, fontWeight:700, color:C.ink, marginBottom:4, fontFamily:"Georgia,serif" }}>👥 Mitarbeiterverwaltung</div>
      <div style={{ fontSize:12, color:C.fog, marginBottom:14 }}>⚠ Hinweis: RLS muss serverseitig abgesichert sein damit nur Admins Rollen ändern können.</div>
      {loading && <div style={{ color:C.fog, fontSize:14 }}>Lade Mitarbeiter…</div>}
      {!loading && profiles.map(pr => {
        const currentRolle = localRoles[pr.id] ?? pr.rolle ?? "praxis";
        const isSelf = pr.id === sbAuth.getSession()?.user?.id;
        return (
          <div key={pr.id} style={{ borderBottom:`1px solid ${C.sand}`, paddingBottom:14, marginBottom:14 }}>
            <div style={{ fontWeight:600, fontSize:14, color:C.ink }}>{pr.name || pr.email || pr.id}</div>
            <div style={{ fontSize:12, color:C.fog, marginBottom:8 }}>{pr.email}{isSelf ? " (du)" : ""}</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <select value={currentRolle}
                onChange={e => setLocalRoles(p => ({ ...p, [pr.id]: e.target.value }))}
                style={{ flex:1, background:C.parch, border:`1.5px solid ${C.sand}`, borderRadius:10, padding:"10px 12px", fontSize:14, fontFamily:"inherit", color:C.ink }}>
                {ROLLEN.map(r => <option key={r} value={r}>{r}</option>)}
                {!ROLLEN.includes(currentRolle) && <option value={currentRolle}>{currentRolle} (alt)</option>}
              </select>
              <button onClick={() => saveRolle(pr.id, localRoles[pr.id] ?? pr.rolle ?? "praxis")}
                disabled={saving[pr.id] || !(pr.id in localRoles)}
                className="btn-press"
                style={{ background: saving[pr.id] || !(pr.id in localRoles) ? C.sand : `linear-gradient(135deg,${C.sage},${C.sageDk})`, color:C.white, border:"none", borderRadius:10, padding:"10px 16px", fontSize:14, fontWeight:700, cursor: saving[pr.id] || !(pr.id in localRoles) ? "default" : "pointer" }}>
                {saving[pr.id] ? "…" : "Speichern"}
              </button>
            </div>
            {msgs[pr.id] && <div style={{ fontSize:12, fontWeight:600, marginTop:6, color: msgs[pr.id].t==="err" ? C.err : C.ok }}>{msgs[pr.id].m}</div>}
          </div>
        );
      })}
    </Card>
  );
}

function NameEditor({ user, onNameSaved }) {
  const [name,    setName]    = useState(ss(user?.name) || "");
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);

  const save = async () => {
    if (!name.trim()) { setMsg({ t:"err", m:"Name darf nicht leer sein" }); return; }
    setSaving(true); setMsg(null);
    try {
      if (isConf()) {
        const session = sbAuth.getSession();
        if (session?.access_token) {
          await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${session.user.id}`, {
            method: "PATCH",
            headers: { apikey: SB_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ name: name.trim() }),
          });
        }
      }
      onNameSaved(name.trim());
      setMsg({ t:"ok", m:"✅ Name gespeichert" });
      setTimeout(() => setMsg(null), 2500);
    } catch { setMsg({ t:"err", m:"Speichern fehlgeschlagen" }); }
    setSaving(false);
  };

  return (
    <div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name"
        style={{ width:"100%", background:C.parch, border:`1.5px solid ${C.sand}`, borderRadius:12, padding:"13px 15px", fontSize:16, boxSizing:"border-box", marginBottom:10, fontFamily:"inherit" }} />
      {msg && <div style={{ color:msg.t==="err"?C.err:C.ok, fontSize:13, fontWeight:600, marginBottom:10 }}>{msg.m}</div>}
      <button onClick={save} disabled={saving} className="btn-press"
        style={{ background:`linear-gradient(135deg,${C.sage},${C.sageDk})`, color:C.white, border:"none", borderRadius:12, padding:14, width:"100%", fontSize:15, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 18px ${C.sage}44` }}>
        {saving ? "Speichern…" : "Name speichern"}
      </button>
    </div>
  );
}

function SettingsScreen({ user, dark, onToggleDark, onLogout, onNameSaved }) {
  const [pin, setPin] = useState(""); const [pinConf, setPinConf] = useState(""); const [pinMsg, setPinMsg] = useState(null);
  const [pinOn, setPinOn] = useState(getPinOn());

  const savePin = () => {
    if (pin.length < 4) { setPinMsg({ t:"err", m:"PIN muss mind. 4 Ziffern haben" }); return; }
    if (pin !== pinConf) { setPinMsg({ t:"err", m:"PINs stimmen nicht überein" }); return; }
    LS.set("pin", pin); setPin(""); setPinConf(""); setPinMsg({ t:"ok", m:"✅ PIN gespeichert" });
    setTimeout(() => setPinMsg(null), 2500);
  };

  const ROWS = [
    { label:"Benutzer",    value: ss(user?.name)+" · "+ss(user?.rolle) },
    { label:"Version",     value:"Mothe App v3.0 Premium" },
    { label:"Datenbank",   value: isConf()?"✅ Verbunden":"⚠ Demo-Modus" },
  ];

  return (
    <div className="scroll-view" style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding:"20px 20px 12px", fontSize:22, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", letterSpacing:"-0.4px" }}>⚙️ Einstellungen</div>

      <div style={{ padding:"0 16px calc(env(safe-area-inset-bottom,0px) + 100px)" }}>
        {/* Profile */}
        <Card pad={18} style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:54, height:54, borderRadius:"50%", background:`linear-gradient(135deg,${C.sage},${C.sageDk})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>
              {user?.rolle==="Zahnarzt"?"🦷":user?.rolle==="Techniker"?"🔧":user?.rolle==="Geschäftsleitung"?"🏥":"💼"}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:18, color:C.ink, fontFamily:"Georgia,serif" }}>{ss(user?.name)}</div>
              <div style={{ fontSize:14, color:C.fog, marginTop:2 }}>{ss(user?.rolle)}</div>
            </div>
          </div>
        </Card>

        {/* Info */}
        <Card pad={0} style={{ marginBottom:16, overflow:"hidden" }}>
          {ROWS.map((r,i) => <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", borderBottom:i<ROWS.length-1?`1px solid ${C.sand}`:"none" }}><span style={{ fontSize:14, color:C.fog }}>{r.label}</span><span style={{ fontSize:14, color:C.ink, fontWeight:600 }}>{r.value}</span></div>)}
        </Card>

        {/* Toggles */}
        <Card pad={0} style={{ marginBottom:16, overflow:"hidden" }}>
          {[
            { label:dark?"🌙 Dunkelmodus":"☀️ Hellmodus", val:dark,  toggle:onToggleDark },
            { label:"🔐 PIN-Schutz",                      val:pinOn, toggle:() => { const n=!pinOn; setPinOn(n); LS.set("pinOn",n); } },
          ].map((r,i,arr) => (
            <div key={r.label} onClick={r.toggle} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:18, borderBottom:i<arr.length-1?`1px solid ${C.sand}`:"none", cursor:"pointer" }}>
              <span style={{ fontSize:15, color:C.ink }}>{r.label}</span>
              <div style={{ width:50, height:30, borderRadius:15, background:r.val?C.sage:C.sand, position:"relative", transition:"background .2s", flexShrink:0 }}>
                <div style={{ position:"absolute", top:3, left:r.val?23:3, width:24, height:24, borderRadius:"50%", background:C.white, boxShadow:"0 2px 6px rgba(0,0,0,0.2)", transition:"left .2s cubic-bezier(.22,1,.36,1)" }} />
              </div>
            </div>
          ))}
        </Card>

        {/* PIN ändern */}
        <Card pad={18} style={{ marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.ink, marginBottom:14, fontFamily:"Georgia,serif" }}>🔐 PIN ändern</div>
          <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,"").slice(0,8))} type="password" inputMode="numeric" placeholder="Neuer PIN (mind. 4 Ziffern)"
            style={{ width:"100%", background:C.parch, border:`1.5px solid ${C.sand}`, borderRadius:12, padding:"13px 15px", fontSize:16, boxSizing:"border-box", marginBottom:10 }} />
          <input value={pinConf} onChange={e => setPinConf(e.target.value.replace(/\D/g,"").slice(0,8))} type="password" inputMode="numeric" placeholder="PIN bestätigen"
            style={{ width:"100%", background:C.parch, border:`1.5px solid ${C.sand}`, borderRadius:12, padding:"13px 15px", fontSize:16, boxSizing:"border-box", marginBottom:12 }} />
          {pinMsg && <div style={{ color:pinMsg.t==="err"?C.err:C.ok, fontSize:13, fontWeight:600, marginBottom:10 }}>{pinMsg.m}</div>}
          <button onClick={savePin} className="btn-press"
            style={{ background:`linear-gradient(135deg,${C.sage},${C.sageDk})`, color:C.white, border:"none", borderRadius:12, padding:14, width:"100%", fontSize:15, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 18px ${C.sage}44` }}>
            PIN speichern
          </button>
        </Card>

        {/* Name ändern */}
        <Card pad={18} style={{ marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.ink, marginBottom:14, fontFamily:"Georgia,serif" }}>✏️ Name ändern</div>
          <NameEditor user={user} onNameSaved={onNameSaved} />
        </Card>

        {/* Admin: Mitarbeiterverwaltung */}
        {user?.rolle === "admin" && <MitarbeiterAdmin user={user} />}

        {/* Logout */}
        <button onClick={onLogout} className="btn-press"
          style={{ width:"100%", background:C.errLt, border:`1.5px solid ${C.err}44`, borderRadius:18, padding:18, fontSize:16, fontWeight:700, color:C.err, cursor:"pointer" }}>
          Abmelden
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § MORE SCREEN (Patienten, Belege, Statistik, Notifs, Settings)
// ═══════════════════════════════════════════════════════════════════════
function MoreScreen({ user, onNav }) {
  const isGL = ss(user?.rolle) === "Geschäftsleitung";
  const ITEMS = [
    { icon:"👥", label:"Patienten",        key:"patienten",  desc:"Alle Patienten" },
    ...(isGL ? [{ icon:"📄", label:"Belege Übersicht", key:"belege",     desc:"Rechnungen & Lieferscheine" }] : []),
    { icon:"📊", label:"Statistik",         key:"statistik",  desc:"Übersicht & Auswertungen" },
    { icon:"🔔", label:"Benachrichtigungen",key:"notifs",     desc:"Alle Hinweise" },
    { icon:"⚙️",  label:"Einstellungen",    key:"settings",   desc:"PIN, Darstellung, Profil" },
  ];
  return (
    <div className="scroll-view" style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding:"20px 20px 12px", fontSize:22, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", letterSpacing:"-0.4px" }}>Mehr</div>
      <div style={{ padding:"0 16px calc(env(safe-area-inset-bottom,0px) + 100px)" }}>
        <Card pad={0} style={{ overflow:"hidden" }}>
          {ITEMS.map((it,i) => (
            <div key={it.key} onClick={() => onNav(it.key)} className="card-press"
              style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", borderBottom:i<ITEMS.length-1?`1px solid ${C.sand}`:"none" }}>
              <div style={{ width:44, height:44, borderRadius:12, background:C.sageLt, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{it.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:600, color:C.ink }}>{it.label}</div>
                <div style={{ fontSize:13, color:C.fog, marginTop:2 }}>{it.desc}</div>
              </div>
              <span style={{ color:C.fog, fontSize:22 }}>›</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// § MAIN APP — vollständige State-Logik + Navigation
// ═══════════════════════════════════════════════════════════════════════
function App() {
  // ─── Auth ────────────────────────────────────────────────────────────
  const [locked,  setLocked]  = useState(getPinOn);
  const [user,    setUser]    = useState(getUser);
  const [dark,    setDarkS]   = useState(getDark);
  const [sbSession,   setSbSession]   = useState(() => sbAuth.getSession());
  const [authChecked, setAuthChecked] = useState(false);
  const [profileErr,  setProfileErr]  = useState(null);
  const toggleDark = () => { const n = !dark; setDark(n); setDarkS(n); };

  // Load profile (role) from Supabase after session is confirmed
  const loadProfile = useCallback(async (session) => {
    if (!session?.access_token || !isConf()) return;
    try {
      const res = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=rolle,email,name`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Profil nicht gefunden");
      const data = await res.json();
      if (!data?.[0]) { setProfileErr("Kein Profil gefunden — bitte Administrator kontaktieren"); return; }
      const p = data[0];
      const u = { name: p.name || p.email || session.user.email, rolle: p.rolle || "praxis" };
      setUser(u); LS.set("user", u); setProfileErr(null);
    } catch(e) { setProfileErr(e.message); }
  }, []);

  useEffect(() => {
    Monitor.init();
    const s = sbAuth.getSession();
    if (s?.access_token) { setSbSession(s); loadProfile(s); }
    setAuthChecked(true);
  }, [loadProfile]);

  // ── Push: start only when user + session are truly ready ────────
  const pushDoneRef = useRef(false);
  useEffect(() => {
    if (!authChecked) return;
    if (!sbSession?.access_token) return;
    if (!user) return;
    if (Notification.permission === "denied") return;
    if (pushDoneRef.current) return;
    pushDoneRef.current = true;
    // Small delay to ensure everything settled
    const t = setTimeout(() => askPush(user), 2000);
    return () => clearTimeout(t);
  }, [authChecked, sbSession, user]);

  // ─── Navigation ──────────────────────────────────────────────────────
  const [navTab,       setNavTab]       = useState("home");
  const [detail,       setDetail]       = useState(null);
  const [chatOpen,     setChatOpen]     = useState(null);
  const [patientDetail,setPatientDetail]= useState(null);
  const [belegeFlow,   setBelegeFlow]   = useState(false);
  const [showNotif,    setShowNotif]    = useState(false);
  const [showAIHints,  setShowAIHints]  = useState(null); // auftrag

  // ─── Data ────────────────────────────────────────────────────────────
  const [auftraege, setAuftraege] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [connErr,   setConnErr]   = useState(false);

  // ─── Chat + Verpasst ─────────────────────────────────────────────────
  const [unread,      setUnread]      = useState({});
  const [chatPreview, setChatPreview] = useState({});
  const [allMsgs,     setAllMsgs]     = useState([]);
  const [missed,      setMissed]      = useState([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const dismissedRef    = useRef(new Set());
  const lastNotifRef    = useRef(0);
  const overlayShownRef = useRef(false);

  // ─── UI ──────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); }, []);
  const myName = ss(user?.name);
  const role   = ss(user?.rolle);
  const isGL   = role === "Geschäftsleitung";

  // ─── Load Data ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      if (isConf()) {
        const [a, m] = await Promise.all([DB.auftraege.list(), DB.materials.list()]);
        setAuftraege(Array.isArray(a) ? a.map(normA) : []);
        setMaterials(Array.isArray(m) ? m : []);
      } else {
        // Demo data
        setAuftraege([
          { id:"d1", patient:"Max Mustermann", zahnarzt:"Dr. Mahal", arbeitstyp:"Krone", status:"In Arbeit", eingang:"2024-01-15", faelligkeit:"2024-01-22", dringend:false, fotos:[], verlauf:[{datum:"2024-01-15",status:"Eingang",notiz:""},{datum:"2024-01-16",status:"In Arbeit",notiz:""}] },
          { id:"d2", patient:"Erika Muster", zahnarzt:"Dr. Schmidt", arbeitstyp:"Brücke", status:"Zurückgeschickt", eingang:"2024-01-10", faelligkeit:"2024-01-18", dringend:true, fotos:[], verlauf:[{datum:"2024-01-10",status:"Eingang",notiz:""},{datum:"2024-01-12",status:"In Arbeit",notiz:""},{datum:"2024-01-15",status:"Zurückgeschickt",notiz:"Farbe nicht korrekt"}] },
          { id:"d3", patient:"Klaus Fischer", zahnarzt:"Dr. Mahal", arbeitstyp:"Prothese", status:"Bereit", eingang:"2024-01-05", faelligkeit:"2024-01-19", dringend:false, fotos:[], verlauf:[{datum:"2024-01-05",status:"Eingang",notiz:""},{datum:"2024-01-12",status:"Bereit",notiz:""}] },
          { id:"d4", patient:"Anna Weber", zahnarzt:"Dr. Mahal", arbeitstyp:"Veneer", status:"Qualitätskontrolle", eingang:"2024-01-17", faelligkeit:"2024-01-25", dringend:false, fotos:[], verlauf:[{datum:"2024-01-17",status:"Eingang",notiz:""}] },
        ]);
        setMaterials([
          { id:"m1", name:"Zirkonoxid A2", category:"Keramik", unit:"g", current_stock:45, min_stock:50, max_stock:200, mapped:true },
          { id:"m2", name:"Komposit B2", category:"Komposit", unit:"ml", current_stock:120, min_stock:40, max_stock:300, mapped:true },
          { id:"m3", name:"Titan-Schrauben", category:"Implantate", unit:"Stück", current_stock:8, min_stock:20, max_stock:100, mapped:false },
        ]);
      }
      setConnErr(false);
    } catch { setConnErr(true); }
    finally { setLoading(false); }
  }, [user]);

  // ─── Load Unread + Missed ────────────────────────────────────────────
  const loadUnread = useCallback(async () => {
    if (!user || !isConf()) return;
    try {
      const d = await DB.nachrichten.recent();
      const msgs = Array.isArray(d) ? d : [];
      setAllMsgs(msgs);
      const counts = {}, prevs = {}, newMissed = [];
      const now = Date.now();
      msgs.forEach(m => {
        const aid = ss(m.auftrag_id);
        if (!prevs[aid] || new Date(m.erstellt_am) > new Date(prevs[aid].ts))
          prevs[aid] = { text: ss(m.text).slice(0, 55), ts: m.erstellt_am };
        const seen = Array.isArray(m.gelesen_von) ? m.gelesen_von : [];
        if (ss(m.absender) !== myName && !seen.includes(myName)) {
          counts[aid] = (counts[aid] || 0) + 1;
          if (now - new Date(m.erstellt_am).getTime() > MISSED_MS && !dismissedRef.current.has(ss(m.id)))
            newMissed.push(m);
        }
      });
      setUnread(counts);
      const pm = {}; Object.entries(prevs).forEach(([id, v]) => { pm[id] = v.text; });
      setChatPreview(pm);
      const filtered = newMissed.filter(m => !dismissedRef.current.has(ss(m.id)));
      setMissed(filtered);

      if (filtered.length > 0) {
        startAlertSound();
        const now2 = Date.now();
        if (now2 - lastNotifRef.current > 120000) {
          lastNotifRef.current = now2;
          pushNotif("⚠ Verpasste Nachrichten!", `${filtered.length} ungelesene Nachricht${filtered.length !== 1 ? "en" : ""}`, "chat");
        }
        if (!overlayShownRef.current) { overlayShownRef.current = true; setShowOverlay(true); }
      } else { stopAlertSound(); }
    } catch {}
  }, [myName]);

  useEffect(() => { if (user) { load(); loadUnread(); } }, [load, loadUnread, user]);
  useEffect(() => { const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setInterval(loadUnread, 8000); return () => clearInterval(t); }, [loadUnread]);

  // ─── WebSocket Realtime ──────────────────────────────────────────────
  useEffect(() => {
    if (!isConf() || !user) return;
    let ws, rTimer, pTimer; let dead = false;
    const connect = () => {
      if (dead) return;
      try {
        ws = new WebSocket(`${SB_URL.replace("https://","wss://")}/realtime/v1/websocket?apikey=${SB_KEY}&vsn=1.0.0`);
        ws.onopen = () => {
          if (dead) { ws.close(); return; }
          setConnErr(false);
          ["realtime:public:auftraege","realtime:public:nachrichten"].forEach(t => {
            ws.send(JSON.stringify({ topic: t, event: "phx_join", payload: {}, ref: "r" }));
          });
          pTimer = setInterval(() => { try { ws.send(JSON.stringify({ topic:"phoenix", event:"heartbeat", payload:{}, ref:"hb" })); } catch {} }, 25000);
        };
        ws.onmessage = e => {
          try {
            const msg = JSON.parse(e.data); if (msg.event === "phx_reply") return;
            const tbl = msg.topic?.split(":")?.[2];
            if (tbl === "nachrichten") loadUnread(); else load();
          } catch { load(); }
        };
        ws.onclose = () => { if (pTimer) clearInterval(pTimer); if (!dead) { setConnErr(true); rTimer = setTimeout(connect, 4000); } };
        ws.onerror = () => { try { ws.close(); } catch {} };
      } catch { if (!dead) rTimer = setTimeout(connect, 5000); }
    };
    connect();
    const online  = () => { setConnErr(false); if (!ws || ws.readyState > 1) connect(); load(); };
    const offline = () => setConnErr(true);
    window.addEventListener("online",  online);
    window.addEventListener("offline", offline);
    return () => {
      dead = true;
      if (pTimer) clearInterval(pTimer); if (rTimer) clearTimeout(rTimer);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      try { ws?.close(); } catch {}
    };
  }, [user, load, loadUnread]);

  // ─── Handlers ────────────────────────────────────────────────────────
  const openChat = useCallback((aid, auftrag) => {
    missed.filter(m => ss(m.auftrag_id) === aid).forEach(m => dismissedRef.current.add(ss(m.id)));
    setMissed(p => p.filter(m => ss(m.auftrag_id) !== aid));
    setChatOpen({ aid, auftrag: auftrag || auftraege.find(x => x.id === aid) });
    setShowOverlay(false);
  }, [missed, auftraege]);

  const dismissAllMissed = useCallback(() => {
    missed.forEach(m => dismissedRef.current.add(ss(m.id)));
    setMissed([]); stopAlertSound(); setShowOverlay(false); overlayShownRef.current = false;
  }, [missed]);

  const markRead = useCallback(aid => { setUnread(p => { const n = { ...p }; delete n[aid]; return n; }); }, []);

  // Supabase Auth is the only real gate
  if (!authChecked) return null;
  if (!sbSession?.access_token) {
    return <AuthLoginScreen onAuthSuccess={s => { sbAuth.setSession(s); setSbSession(s); loadProfile(s); }} />;
  }
  if (profileErr) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40, gap:16, background: C.cream }}>
        <div style={{ fontSize:48 }}>⚠️</div>
        <div style={{ fontWeight:700, fontSize:20, color:C.err, fontFamily:"Georgia,serif" }}>Kein Zugriff</div>
        <div style={{ fontSize:14, color:C.fog, textAlign:"center", maxWidth:280 }}>{profileErr}</div>
        <button onClick={async () => { await sbAuth.signOut(sbSession.access_token); sbAuth.setSession(null); setSbSession(null); }} style={{ background:C.err, color:"#fff", border:"none", borderRadius:14, padding:"14px 28px", fontSize:15, fontWeight:700, cursor:"pointer" }}>Abmelden</button>
      </div>
    );
  }
  if (!user) return <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}><Spinner /></div>;
  // Optional PIN (comfort only — not a security gate)
  if (locked && getPinOn()) {
    return <LoginScreen onLogin={u => { setUser(u); LS.set("user", u); setLocked(false); }} />;
  }

  const totalUnread = Object.values(unread).reduce((s, n) => s + (n || 0), 0);
  const totalMissed = missed.length;

  // ─── Tab content resolver ─────────────────────────────────────────────
  const renderTab = () => {
    const wrapSt = { flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" };
    switch (navTab) {
      case "home": return (
        <div key="home" className="fade-up" style={wrapSt}>
          <HomeScreen auftraege={auftraege} unread={unread} missed={missed} user={user}
            onOpenDetail={a => setDetail(a)}
            onSaveNew={a => setAuftraege(p => [a, ...p])}
            onOpenChat={() => setNavTab("chat")} />
        </div>
      );
      case "chat": return (
        <div key="chat" className="fade-up" style={wrapSt}>
          <ChatOverview auftraege={auftraege} unread={unread} chatPreview={chatPreview}
            missed={missed} allMsgs={allMsgs} userName={myName}
            onOpenChat={(aid, a) => openChat(aid, a)} />
        </div>
      );
      case "scan": return (
        <div key="scan" className="fade-up" style={{ ...wrapSt, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
          <div style={{ padding:"20px 20px 12px" }}>
            <div style={{ fontSize:22, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", letterSpacing:"-0.4px", marginBottom:6 }}>📷 Beleg scannen</div>
            <div style={{ fontSize:14, color:C.fog, marginBottom:20 }}>Erfasse Rechnungen, Lieferscheine und Dokumente mit der Kamera</div>
          </div>
          <div style={{ padding:"0 16px" }}>
            <button onClick={() => setBelegeFlow(true)} className="btn-press"
              style={{ width:"100%", background:`linear-gradient(135deg,${C.sage},${C.sageDk})`, color:C.white, border:"none", borderRadius:22, padding:"26px", display:"flex", alignItems:"center", justifyContent:"center", gap:16, fontSize:20, fontWeight:700, cursor:"pointer", boxShadow:`0 10px 36px ${C.sage}44`, marginBottom:20, animation:"breathe 3s ease-in-out infinite" }}>
              📷 Beleg jetzt erfassen
            </button>
            <Card pad={20} style={{ marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif", marginBottom:14 }}>Was kann ich erfassen?</div>
              {[["🧾","Rechnungen","Lieferanten-Rechnungen","Automatische Erkennung + Buchung"],["📦","Lieferscheine","Wareneingänge","Lagerbestand wird automatisch aktualisiert"],["📋","HKP","Heil- und Kostenpläne","Verknüpfung mit Aufträgen"],["📝","Mehrkostenvereinbarungen","Patientenvereinbarungen","Dokumentation + Archivierung"]].map(([icon,t,d,sub]) => (
                <div key={t} style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"12px 0", borderBottom:`1px solid ${C.sand}` }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:C.sageLt, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.ink, fontFamily:"Georgia,serif" }}>{t}</div>
                    <div style={{ fontSize:12, color:C.fog, marginTop:1 }}>{d}</div>
                    <div style={{ fontSize:11, color:C.sage, marginTop:2, fontWeight:600 }}>✓ {sub}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      );
      case "analysis": return (
        <div key="analysis" className="fade-up" style={wrapSt}>
          <AnalysisScreen auftraege={auftraege} materials={materials} />
        </div>
      );
      case "materials": return (
        <div key="materials" className="fade-up" style={wrapSt}>
          <MaterialScreen materials={materials} />
        </div>
      );
      case "patienten": return (
        <div key="patienten" className="fade-up" style={wrapSt}>
          <PatientScreen auftraege={auftraege}
            onOpenDetail={a => setDetail(a)}
            onOpenPatient={name => setPatientDetail({ name })}
            onClose={() => setNavTab("more")} />
        </div>
      );
      case "belege": return (
        <div key="belege" className="fade-up" style={wrapSt}>
          <BelegListScreen user={user} materials={materials} />
        </div>
      );
      case "statistik": return (
        <div key="statistik" className="fade-up" style={wrapSt}>
          <StatistikScreen auftraege={auftraege} materials={materials} />
        </div>
      );
      case "settings": return (
        <div key="settings" className="fade-up" style={wrapSt}>
          <SettingsScreen user={user} dark={dark} onToggleDark={toggleDark}
            onNameSaved={newName => { const u={...user, name:newName}; setUser(u); LS.set("user",u); }}
            onLogout={async () => {
            if (sbSession?.access_token) await sbAuth.signOut(sbSession.access_token);
            sbAuth.setSession(null);
            setSbSession(null);
            LS.set("user", null);
            setUser(null);
            setLocked(false);
            setProfileErr(null);
          }} />
        </div>
      );
      case "more": return (
        <div key="more" className="fade-up" style={wrapSt}>
          <MoreScreen user={user} onNav={k => setNavTab(k)} />
        </div>
      );
      case "notifs": return (
        <div key="notifs" className="fade-up" style={wrapSt}>
          <NotifCenter onClose={() => setNavTab("more")} />
        </div>
      );
      default: return null;
    }
  };

  return (
    <div style={{ height:"100dvh", maxHeight:"100dvh", background:C.cream, display:"flex", flexDirection:"column", overflow:"hidden", paddingTop:"env(safe-area-inset-top,0px)" }}>
      <style>{CSS}</style>
      <Toast msg={toast?.msg} type={toast?.type} />
      <OfflineBanner show={connErr} />

      {/* Demo Banner */}
      {!isConf() && (
        <div style={{ background:C.brand, padding:"10px 20px", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:C.sage, fontSize:12, fontWeight:700 }}>⚠️ Demo-Modus — Supabase URL &amp; Key in Zeile 6-7 eintragen</span>
        </div>
      )}

      {/* Missed Banner */}
      <MissedBanner missed={missed} auftraege={auftraege} onOpen={(aid, a) => openChat(aid, a)} onDismiss={dismissAllMissed} />

      {/* Main Content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0, overflow:"hidden" }}>
        {renderTab()}
      </div>

      {/* Bottom Nav */}
      <BottomNav tab={navTab} setTab={t => { setNavTab(t); if (t === "chat") overlayShownRef.current = true; }} unreadCount={totalUnread} missedCount={totalMissed} role={role} />

      {/* ═══ SCREEN OVERLAYS ═══ */}
      {detail && (
        <DetailScreen a={detail} user={user} onBack={() => setDetail(null)}
          onOpenChat={(aid, a) => { setDetail(null); openChat(aid, a); }}
          onOpenAIHints={a => setShowAIHints(a)}
          onUpdated={upd => { setAuftraege(p => p.map(x => x.id === upd.id ? { ...x, ...upd } : x)); setDetail(upd); }} />
      )}
      {chatOpen && (
        <ChatScreen auftragId={chatOpen.aid} auftrag={chatOpen.auftrag} user={user}
          onBack={() => { setChatOpen(null); loadUnread(); }}
          onMarkRead={markRead} />
      )}
      {patientDetail && (
        <PatientDetailScreen
          patient={patientDetail}
          auftraege={auftraege}
          user={user}
          onOpenDetail={a => { setPatientDetail(null); setDetail(a); }}
          onOpenChat={(aid, a) => { setPatientDetail(null); openChat(aid, a); }}
          onClose={() => setPatientDetail(null)} />
      )}
      {belegeFlow && (
        <BelegeFlow user={user} materials={materials}
          onClose={() => setBelegeFlow(false)}
          onSaved={() => { showToast("✅ Beleg gespeichert"); setBelegeFlow(false); }} />
      )}
      {showOverlay && totalMissed > 0 && (
        <MissedOverlay count={totalMissed}
          onGo={() => { setShowOverlay(false); setNavTab("chat"); stopAlertSound(); }}
          onLater={() => {
            setShowOverlay(false); overlayShownRef.current = false;
            setTimeout(() => { if (missed.length > 0) { overlayShownRef.current = true; setShowOverlay(true); } }, 5 * 60 * 1000);
          }} />
      )}
      {showNotif && <NotifCenter onClose={() => setShowNotif(false)} />}
      {showAIHints && <AIHintsSheet auftrag={showAIHints} onClose={() => setShowAIHints(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// § EXPORT
// ═══════════════════════════════════════════════════════════════════════
export default function MotheApp() {
  return <ErrorBoundary><App /></ErrorBoundary>;
}
