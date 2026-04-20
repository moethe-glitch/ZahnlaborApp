// netlify/functions/send-email.js — Resend Email (serverseitig)

const rateLimits = new Map();
function checkRate(ip) {
  const now = Date.now();
  const e = rateLimits.get(ip) || { count:0, start:now };
  if (now - e.start > 60_000) { rateLimits.set(ip,{count:1,start:now}); return true; }
  e.count++; rateLimits.set(ip,e);
  return e.count <= 5; // max 5 Emails per minute per IP
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ success:false, error:"Method not allowed" }) };
  }
  const headers = {
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Headers":"Content-Type",
    "Content-Type":"application/json",
  };

  const ip = event.headers?.["x-forwarded-for"]?.split(",")?.[0]?.trim() || "unknown";
  if (!checkRate(ip)) {
    return { statusCode:429, headers, body:JSON.stringify({ success:false, error:"Zu viele E-Mail-Anfragen. Bitte warten." }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode:400, headers, body:JSON.stringify({ success:false, error:"Ungültiger Request" }) }; }

  const { to, subject, html } = body;
  if (!to || !subject || !html) {
    return { statusCode:400, headers, body:JSON.stringify({ success:false, error:"Fehlende Felder: to, subject, html" }) };
  }

  // Basic email validation
  const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const recipients = Array.isArray(to) ? to : [to];
  if (!recipients.every(e => emailRe.test(String(e)))) {
    return { statusCode:400, headers, body:JSON.stringify({ success:false, error:"Ungültige E-Mail-Adresse" }) };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[send-email] RESEND_API_KEY missing");
    return { statusCode:503, headers, body:JSON.stringify({ success:false, error:"E-Mail-Dienst nicht konfiguriert" }) };
  }

  const senderName    = process.env.EMAIL_FROM_NAME  || "Die 3 Zahnärzte by Mahal";
  const senderAddress = process.env.EMAIL_FROM_ADDR  || "noreply@example.com";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization":`Bearer ${apiKey}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        from:    `${senderName} <${senderAddress}>`,
        to:      recipients,
        subject: String(subject).slice(0, 200),
        html:    String(html).slice(0, 50000),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[send-email] Resend error:", res.status, data.message);
      return { statusCode:502, headers, body:JSON.stringify({ success:false, error:"E-Mail konnte nicht gesendet werden" }) };
    }
    console.log("[send-email] sent:", { to: recipients.map(e=>e.replace(/^[^@]+/,'***')), id:data.id });
    return { statusCode:200, headers, body:JSON.stringify({ success:true, id:data.id }) };
  } catch (err) {
    console.error("[send-email] error:", err.message);
    return { statusCode:500, headers, body:JSON.stringify({ success:false, error:"E-Mail-Versand fehlgeschlagen. Bitte erneut versuchen." }) };
  }
};
