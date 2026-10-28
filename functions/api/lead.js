/**
 * Cloudflare Pages Function: POST /api/lead
 * Nhận yêu cầu tư vấn / đặt lịch từ form và chuyển tiếp tới kênh đã cấu hình.
 *
 * Biến môi trường (Cloudflare Pages → Settings → Variables and Secrets):
 *   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID   → gửi tin nhắn Telegram (khuyên dùng, miễn phí)
 *   LEAD_WEBHOOK_URL                         → POST JSON tới webhook (Google Apps Script/Sheets, Make, Zapier…)
 *   RESEND_API_KEY + LEAD_EMAIL_TO (+ LEAD_EMAIL_FROM) → gửi email qua Resend
 * Cần ít nhất một kênh. Nếu chưa cấu hình, API trả 503 và form hiển thị hotline thay thế.
 */

const MAX = { name: 120, phone: 30, email: 160, company: 160, need: 120, device: 120, area: 240, time: 120, message: 2000, segment: 40, page: 120 };

function clean(v, max) {
  return String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export async function onRequestPost({ request, env }) {
  let raw;
  try {
    const type = request.headers.get("content-type") || "";
    raw = type.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // Honeypot: bots fill hidden "website" field
  if (raw.website) return json({ ok: true });

  const lead = {};
  for (const [k, max] of Object.entries(MAX)) lead[k] = clean(raw[k], max);

  const digits = lead.phone.replace(/\D/g, "");
  if (!lead.name || digits.length < 9 || digits.length > 12 || !lead.need) {
    return json({ ok: false, error: "invalid" }, 422);
  }

  const lines = [
    "Yêu cầu mới từ website Đắc An",
    `Loại khách: ${lead.segment || "-"}`,
    `Họ tên: ${lead.name}`,
    `SĐT: ${lead.phone}`,
    lead.email && `Email: ${lead.email}`,
    lead.company && `Công ty: ${lead.company}`,
    `Nhu cầu: ${lead.need}`,
    lead.device && `Thiết bị: ${lead.device}`,
    lead.area && `Khu vực/Địa chỉ: ${lead.area}`,
    lead.time && `Thời gian mong muốn: ${lead.time}`,
    lead.message && `Nội dung: ${lead.message}`,
    `Trang: ${lead.page || "-"}`,
    `Thời điểm: ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
  ].filter(Boolean);
  const text = lines.join("\n");

  const jobs = [];

  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    jobs.push(fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true })
    }));
  }

  if (env.LEAD_WEBHOOK_URL) {
    jobs.push(fetch(env.LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, submitted_at: new Date().toISOString() })
    }));
  }

  if (env.RESEND_API_KEY && env.LEAD_EMAIL_TO) {
    jobs.push(fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: env.LEAD_EMAIL_FROM || "Website Đắc An <onboarding@resend.dev>",
        to: env.LEAD_EMAIL_TO.split(",").map((s) => s.trim()),
        reply_to: lead.email || undefined,
        subject: `[Website] ${lead.need} - ${lead.name}`,
        text
      })
    }));
  }

  if (!jobs.length) return json({ ok: false, error: "not_configured" }, 503);

  const results = await Promise.allSettled(jobs);
  const delivered = results.some((r) => r.status === "fulfilled" && r.value.ok);
  return delivered ? json({ ok: true }) : json({ ok: false, error: "delivery_failed" }, 502);
}

export function onRequest() {
  return json({ ok: false, error: "method_not_allowed" }, 405);
}
