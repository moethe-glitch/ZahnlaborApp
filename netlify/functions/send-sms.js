// netlify/functions/send-sms.js — Twilio SMS (serverseitig)

const rateLimits = new Map();
function checkRate(ip) {
  const now = Date.now();
  const e = rateLimits.get(ip) || { count:0, start:now };
  if (now - e.start > 60_000) { rateLimits.set(ip,{count:1,start:now}); return true; }
  e.count++; rateLimits.set(ip,e);
  return e.count <= 10; // max 10 SMS per minute per IP
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
    return { statusCode:429, headers, body:JSON.stringify({ success:false, error:"Zu viele SMS-Anfragen. Bitte warten." }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode:400, headers, body:JSON.stringify({ success:false, error:"Ungültiger Request" }) }; }

  const { to, message } = body;
  if (!to || !message) {
    return { statusCode:400, headers, body:JSON.stringify({ success:false, error:"Fehlende Felder: to, message" }) };
  }
  if (typeof message !== "string" || message.length > 1600) {
    return { statusCode:400, headers, body:JSON.stringify({ success:false, error:"Nachricht zu lang (max 1600 Zeichen)" }) };
  }

  const cleanTo = String(to).replace(/\s/g,"");
  if (!/^\+[1-9]\d{7,14}$/.test(cleanTo)) {
    return { statusCode:400, headers, body:JSON.stringify({ success:false, error:"Ungültige Telefonnummer. Format: +49170..." }) };
  }

  const sid   = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const from  = process.env.TWILIO_VON;
  if (!sid || !token || !from) {
    console.error("[send-sms] Twilio env vars missing");
    return { statusCode:503, headers, body:JSON.stringify({ success:false, error:"SMS-Dienst nicht konfiguriert" }) };
  }

  try {
    const params = new URLSearchParams({ To:cleanTo, From:from, Body:message });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type":  "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      console.error("[send-sms] Twilio error:", res.status, data.message);
      return { statusCode:502, headers, body:JSON.stringify({ success:false, error:"SMS konnte nicht gesendet werden" }) };
    }
    console.log("[send-sms] sent:", { to:cleanTo.slice(0,-4)+"****", sid:data.sid });
    return { statusCode:200, headers, body:JSON.stringify({ success:true, sid:data.sid }) };
  } catch (err) {
    console.error("[send-sms] error:", err.message);
    return { statusCode:500, headers, body:JSON.stringify({ success:false, error:"SMS-Versand fehlgeschlagen. Bitte erneut versuchen." }) };
  }
};
