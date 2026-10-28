# Website Điện Lạnh Đắc An

Website tĩnh (HTML/CSS/JS thuần, không cần build) + 1 Cloudflare Pages Function nhận form.

```
index.html            Trang chủ (giới thiệu, năng lực, dịch vụ, vận hành, công nghệ, đối tác, hành trình, liên hệ)
dich-vu/index.html    Trang Dịch vụ (catalog thiết bị, giải pháp doanh nghiệp, quy trình, FAQ, đặt lịch)
404.html              Trang lỗi
functions/api/lead.js API nhận form → Telegram / Webhook / Email
assets/               CSS, JS, font Be Vietnam Pro (tự host), icon, logo, ảnh
_headers              Cache + bảo mật cho Cloudflare
robots.txt, sitemap.xml, site.webmanifest
```

## Deploy lên Cloudflare Pages (qua GitHub)

1. Tạo repo trên GitHub, đẩy toàn bộ thư mục này lên (nhánh `main`).
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → chọn repo.
3. Cấu hình build:
   - Framework preset: **None**
   - Build command: *(để trống)*
   - Build output directory: `/`
4. **Save and Deploy**. Thư mục `functions/` được Cloudflare tự nhận làm API `/api/lead`.
5. Gắn tên miền: Pages project → **Custom domains** → thêm `dacanco.com` (và `www.dacanco.com`).

Mỗi lần push lên `main`, Cloudflare tự deploy lại.

## Bật form liên hệ / đặt lịch

Form gửi về `/api/lead`. Cần cấu hình **ít nhất một** kênh nhận trong
Pages project → **Settings** → **Variables and Secrets** (đặt cho Production), rồi deploy lại:

| Kênh | Biến | Ghi chú |
|---|---|---|
| Telegram (khuyên dùng) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Tạo bot qua @BotFather, thêm bot vào nhóm, lấy chat id |
| Webhook | `LEAD_WEBHOOK_URL` | Google Apps Script ghi vào Google Sheets, hoặc Make/Zapier |
| Email (Resend) | `RESEND_API_KEY`, `LEAD_EMAIL_TO`, `LEAD_EMAIL_FROM` | Cần xác minh tên miền gửi trên resend.com |

Khi chưa cấu hình, form báo lỗi và hiển thị hotline + email để khách liên hệ trực tiếp (không giả vờ gửi thành công).

## Chạy thử trên máy

```bash
npx wrangler pages dev .          # có cả API /api/lead
# hoặc chỉ xem giao diện:
python3 -m http.server 8080
```

Thử form khi chạy local: chép `.dev.vars.example` thành `.dev.vars` và điền biến.

## Việc cần làm trước khi công bố

- [ ] Xác nhận tên miền chính. Mã nguồn đang dùng `https://dacanco.com` trong canonical, Open Graph, sitemap, robots và JSON-LD.
- [ ] Xác nhận số 0916 756 248 có dùng Zalo (nút Zalo dùng `https://zalo.me/0916756248`).
- [ ] Xác nhận danh mục dịch vụ tại nhà (tủ lạnh, máy giặt, máy nước nóng, máy lọc nước, tivi, bếp…).
- [ ] Bổ sung tên thương hiệu của logo khách hàng chữ "R" (đang để alt "Logo khách hàng chữ R").
- [ ] Bổ sung nếu có: mã số thuế, chính sách bảo hành sau dịch vụ, bảng giá, ảnh công trình thực tế.

## Nguồn nội dung

Toàn bộ số liệu và cam kết lấy từ *Hồ sơ năng lực Điện Lạnh Đắc An 2026*.
Logo khách hàng, đối tác và ảnh công trình được trích trực tiếp từ hồ sơ này.
