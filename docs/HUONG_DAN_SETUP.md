# Hướng dẫn setup và deploy (cho Edward)

Tài liệu này đi từ trạng thái **bản đã deploy thành công trước đây (hết Phase 7)** đến bản hiện tại (Phase 8–10 + đợt rà soát). Làm theo đúng thứ tự: **database trước, biến môi trường sau, code cuối cùng**. Code mới gọi các bảng và hàm SQL mới, nên nếu deploy code trước khi chạy migration, admin và một số trang sẽ báo lỗi.

Thời gian ước tính: 1–2 giờ cho phần bắt buộc (mục 1–6, 9–10), cộng thêm 1–2 giờ nếu làm luôn Google, Resend domain và backup.

---

## 0. Có gì mới so với bản đã deploy

| Nhóm | Thay đổi | Việc bạn phải làm |
|---|---|---|
| Database | 6 migration mới `0011`–`0016` | Chạy `supabase db push` (mục 3) |
| **Bảo mật** | `0015` sửa lỗi có từ Phase 1: **bất kỳ ai đăng ký cũng có thể tự set `status = 'active'` qua API để bỏ qua bước duyệt**. Ngoài ra, giới hạn sức chứa RSVP trước đây không chặn được ai | Push migration càng sớm càng tốt, rồi chạy câu kiểm tra ở mục 3.4 |
| Bảo mật | `0016`: thành viên trước đây không đăng bài được, nút Report comment không làm gì, có thể tự chèn ảnh "đã duyệt" | Tự sửa khi push migration |
| Storage | `0014` tạo bucket `avatars` (trước giờ chưa có, nên upload avatar luôn lỗi) và giới hạn file ảnh ≤10MB, không nhận SVG | Tự tạo khi push migration |
| Biến môi trường | Thêm `ALERT_EMAIL` và `NEXT_PUBLIC_SITE_TIMEZONE` (đều tuỳ chọn) | Mục 4 |
| Cron | Thêm cron digest email thứ Hai hằng tuần. Cron giờ đọc header `Authorization: Bearer <CRON_SECRET>` (đúng chuẩn Vercel) | Chỉ cần `CRON_SECRET` có trong Vercel (mục 4) |
| Stripe | Đã sửa lỗi webhook **không bao giờ cấp tier** (upsert thiếu `onConflict`), và lỗi nút Upgrade/Billing trả về JSON | Không cần cấu hình gì thêm; nên test lại theo mục 6.4 |
| Nội dung | Mọi chữ công khai gom về `content/site.ts`; hướng dẫn cho bạn của bạn ở `docs/CONTENT_GUIDE.md` | Mục 11 |
| Giao diện | Font trước giờ **không tải được** (toàn hiện Times New Roman), nay đã sửa; màu brass đậm hơn một chút để đạt chuẩn tương phản | Không cần làm gì |

---

## 1. Chuẩn bị trên máy

| Công cụ | Kiểm tra | Ghi chú |
|---|---|---|
| Node.js **22.18 trở lên** | `node -v` | Máy bạn đang có Node 25, dùng được |
| pnpm | `pnpm -v` | Repo khoá `pnpm@12.3.4` |
| Git | `git --version` | |
| Supabase CLI | `pnpm exec supabase --version` | Đã có sẵn trong devDependencies, không cần cài riêng |
| Docker Desktop | | **Chỉ cần nếu muốn chạy Supabase local và test e2e** (mục 12). Deploy không cần |

Lấy code mới về và cài đặt:

```bash
cd "C:\Users\Admin\Coding\Family Hub Platform Plan\family-hub"
git status                 # phải sạch
git log --oneline -6       # thấy các commit phase 8, 9, 10 và "Review pass"
pnpm install
```

Kiểm tra nhanh trước khi đụng vào production (không cần mạng hay database):

```bash
pnpm typecheck     # TypeScript
pnpm test          # 16 unit test
pnpm test:db       # chạy toàn bộ migration + 64 kiểm thử RLS trên Postgres nhúng
pnpm lint          # 0 errors (có khoảng 60 warning cũ, bỏ qua được)
```

Cả bốn lệnh phải pass. `pnpm test:db` quan trọng nhất: nó chứng minh các migration chạy được và các quy tắc bảo mật đúng như mong đợi.

---

## 2. Sao lưu production trước khi đổi gì

Trước khi push migration lên project thật, hãy tạo một bản sao lưu:

1. Supabase Dashboard → project `martin-sawyer-reunion-prod` → **Database → Backups**: xác nhận có bản backup hằng ngày gần nhất (gói free giữ 7 ngày).
2. Dump thủ công thêm cho chắc:

   ```bash
   pnpm exec supabase login                       # nếu chưa đăng nhập CLI
   pnpm exec supabase link --project-ref jzsgvmcrckaurxhkhpil
   mkdir backups
   pnpm db:dump                                   # ra backups/schema.sql và backups/data.sql
   ```

   Thư mục `backups/` đã nằm trong `.gitignore`. File này chứa email và số điện thoại thành viên, **không gửi đi đâu cả**.

---

## 3. Đẩy migration lên production

### 3.1 Xem lịch sử migration

```bash
pnpm exec supabase migration list
```

Bạn sẽ thấy hai cột Local và Remote.

- **Trường hợp A:** `0001`–`0010` có ở cả hai cột → sang mục 3.2.
- **Trường hợp B:** Remote trống, dù database thật đã có bảng (do hồi trước bạn chạy SQL bằng tay trong SQL Editor) → đánh dấu chúng là đã chạy, để CLI không chạy lại từ đầu:

  ```bash
  pnpm exec supabase migration repair --status applied 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010
  ```

  Chỉ làm bước này khi chắc chắn database thật đã có đủ thay đổi của 0001–0010 (ví dụ có bảng `post_likes` và bucket `media`).

### 3.2 Chạy thử

```bash
pnpm exec supabase db push --dry-run
```

Danh sách hiện ra phải đúng 6 file: `0011_admin_console`, `0012_email_preferences`, `0013_rsvp_deadline`, `0014_storage_hardening`, `0015_fix_privileged_checks`, `0016_content_fixes`.

### 3.3 Chạy thật

```bash
pnpm exec supabase db push
```

CLI sẽ hỏi mật khẩu database. Mật khẩu này lấy ở Dashboard → Project Settings → Database (nếu quên thì reset ở đó).

Nếu một migration báo lỗi, toàn bộ file đó được huỷ, không để lại trạng thái dở dang. Chụp lỗi lại; nhiều khả năng là do database thật lệch với file (có ai sửa tay trong Studio). Đừng sửa file migration cũ.

### 3.4 Kiểm tra sau khi push

Mở Dashboard → **SQL Editor** và chạy:

```sql
-- 1. Mọi bảng đều bật RLS (kết quả phải rỗng)
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;

-- 2. Bucket avatars đã có
select id, public, file_size_limit, allowed_mime_types from storage.buckets;

-- 3. Ai đang "active" mà chưa từng được duyệt qua admin console?
--    Lỗi đã sửa ở 0015 cho phép tự kích hoạt. Những người bạn từng duyệt
--    tay trong Studio cũng sẽ hiện ở đây; hãy dò xem có ai lạ không.
select full_name, email, created_at
from profiles p
where status = 'active'
  and not exists (
    select 1 from audit_log a
    where a.entity_id = p.id::text and a.action in ('member.approve', 'member.reinstate')
  )
order by created_at desc;
```

Nếu thấy người lạ: `update profiles set status = 'pending' where email = '...';`. Sau đó họ sẽ nằm trong hàng đợi duyệt.

### 3.5 Tạo tài khoản owner

Owner là người có toàn quyền, kể cả cấp role cho người khác. Theo checklist ra mắt: **bạn của bạn giữ owner, còn bạn giữ một tài khoản admin riêng**. Mỗi người đăng ký tài khoản trên site như bình thường, rồi chạy trong SQL Editor:

```sql
-- người giữ owner (bạn của bạn)
update profiles set status = 'active' where email = 'ban-cua-ban@example.com';
insert into user_roles (user_id, role) select id, 'owner' from profiles where email = 'ban-cua-ban@example.com'
on conflict do nothing;

-- bạn (Edward) giữ admin
update profiles set status = 'active' where email = 'edward@example.com';
insert into user_roles (user_id, role) select id, 'admin' from profiles where email = 'edward@example.com'
on conflict do nothing;
```

Từ đó trở đi, việc cấp quyền làm trong Admin → Members → mở thành viên → Roles (chỉ owner làm được). Hệ thống không cho xoá owner cuối cùng và không cho ai tự thu hồi role của chính mình.

---

## 4. Biến môi trường trên Vercel

Vercel → project → **Settings → Environment Variables**. Bảng đầy đủ (★ = mới so với lần deploy trước):

| Biến | Production | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://<domain>` | **Không có dấu `/` ở cuối.** Dùng cho link trong email, link huỷ đăng ký và redirect OAuth. Nếu chưa có domain thì dùng URL `.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jzsgvmcrckaurxhkhpil.supabase.co` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key | **Bí mật.** Tuyệt đối không có tiền tố `NEXT_PUBLIC_` |
| `STRIPE_SECRET_KEY` | `sk_test_…` trong lúc test, `sk_live_…` khi thu tiền thật | |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | Lấy từ endpoint webhook (mục 6.3). Test và live có secret khác nhau |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` / `pk_live_…` | |
| `RESEND_API_KEY` | `re_…` | |
| `EMAIL_FROM` | `Martin Sawyer Reunion <hello@domain-cua-ban.com>` | Domain phải được xác thực trên Resend (mục 7) |
| `CRON_SECRET` | chuỗi ngẫu nhiên 32 byte | Tạo bằng `openssl rand -base64 32`, hoặc bất kỳ chuỗi dài nào. Vercel tự gửi nó trong header khi gọi cron |
| `ALERT_EMAIL` ★ | email của bạn | Tuỳ chọn. Webhook Stripe lỗi, cron crash hay digest gửi lỗi sẽ email về đây |
| `NEXT_PUBLIC_SITE_TIMEZONE` ★ | `America/New_York` | Tuỳ chọn, mặc định đã là giá trị này. Mọi giờ sự kiện hiển thị và nhập theo múi giờ này, **kể cả khi bạn nhập từ Việt Nam** |
| `R2_*` | để trống | Chỉ dùng khi chuyển ảnh sang Cloudflare R2 |

Lưu ý:
- `lib/env.ts` kiểm tra biến lúc build: thiếu biến bắt buộc thì build fail ngay. Như vậy dễ phát hiện hơn là lỗi ngầm lúc chạy.
- Biến `NEXT_PUBLIC_*` được nhúng lúc build, nên sau khi đổi phải **Redeploy**.
- Theo plan, Preview nên trỏ sang một project Supabase **dev** riêng. Nếu hiện bạn chỉ có project prod, đặt biến cho Production trước, Preview tính sau.

---

## 5. Cấu hình Supabase Dashboard

### 5.1 Authentication → URL Configuration
- **Site URL:** `https://<domain>`
- **Redirect URLs:** thêm
  - `https://<domain>/auth/callback`
  - `https://*.vercel.app/auth/callback` (để đăng nhập được trên bản preview)
  - `http://localhost:3000/auth/callback`

### 5.2 Authentication → Providers → Email
- Confirm email: **ON**
- Secure email change: **ON**
- Minimum password length: **10**; bật kiểm tra mật khẩu bị lộ (leaked password protection) nếu gói của bạn có

### 5.3 Authentication → SMTP (gửi email xác nhận qua Resend)
Email mặc định của Supabase chỉ gửi được khoảng 3 email/giờ, nên phải chuyển sang SMTP:
- Host `smtp.resend.com`, Port `465`, Username `resend`, Password = `RESEND_API_KEY`
- Sender email: trùng domain đã xác thực trên Resend

### 5.4 Google sign-in (Phase 9)
1. Google Cloud Console → APIs & Services → **OAuth consent screen**: điền tên app, email hỗ trợ.
2. **Credentials → Create credentials → OAuth client ID → Web application.**
   - Authorized redirect URI: `https://jzsgvmcrckaurxhkhpil.supabase.co/auth/v1/callback`
3. Copy Client ID và Client Secret → Supabase → Authentication → Providers → **Google** → bật lên và dán vào.
4. Nếu tài khoản Google của bạn vẫn đang bị khoá: cứ để nút Google trên trang (bấm vào sẽ hiện thông báo "Google sign in is not available right now" và người dùng đăng nhập bằng email). Bật provider sau cũng được.

### 5.5 Storage
Sau migration phải có hai bucket `media` và `avatars`, cả hai đều public, giới hạn 10MB, chỉ nhận JPEG/PNG/WebP/GIF. Không cần tạo tay.

---

## 6. Stripe

Lúc đầu làm toàn bộ ở **Test mode**. Chỉ chuyển sang Live khi mục 6.4 pass hết.

### 6.1 Products và Prices
Tạo 3 product, tên **trùng tên tier** (để script tự khớp):

| Product | Price | Kiểu |
|---|---|---|
| Supporter | 25 USD | Recurring, yearly |
| Patron | 100 USD | Recurring, yearly |
| Lifetime | 500 USD | One time |

### 6.2 Ghi price id vào database
Cách dễ nhất: trên site, đăng nhập bằng tài khoản owner → **Admin → Settings** → dán `price_…` vào từng tier → Save.

Seed ban đầu có price id giả (`price_fake_supporter`…). Nếu chưa thay, nút Upgrade sẽ lỗi, và webhook sẽ trả lỗi 500 với thông báo "Unmapped price" (cố ý, để không cấp sai tier).

### 6.3 Webhook
Stripe Dashboard → Developers → **Webhooks → Add endpoint**:
- URL: `https://<domain>/api/webhooks/stripe`
- Chỉ chọn 6 event: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET` trên Vercel → Redeploy.

**Customer portal:** Settings → Billing → Customer portal: cho phép huỷ (cuối kỳ), cập nhật thẻ, xem hoá đơn, đổi gói giữa Supporter và Patron.

### 6.4 Test (spec 05 yêu cầu pass hết 8 dòng)

| Kiểm tra | Cách làm | Kết quả đúng |
|---|---|---|
| Thanh toán thành công | Thẻ `4242 4242 4242 4242` | Về `/me/membership`, vài giây sau hiện "Your membership is now Supporter" |
| Thẻ bị từ chối | `4000 0000 0000 0002` | Stripe báo lỗi, tier không đổi |
| 3D Secure | `4000 0025 0000 3155` | Hiện màn xác thực, xong thì được cấp tier |
| Gia hạn thất bại | `4000 0000 0000 0341` | Status `past_due`, email "Update your card", dashboard admin có dòng "Payments failed" |
| Replay | Webhooks → event → **Resend** | Trả 200, không có dòng `payments` trùng |
| Huỷ | Huỷ trong portal | Hết kỳ thì về Free |
| Price chưa map | Tạo một price mới chưa map, rồi thanh toán | Webhook 500, Stripe tự retry, `ALERT_EMAIL` nhận được cảnh báo |
| Hoàn tiền | Theo README phần 1, "Refund a payment" | |

---

## 7. Resend (email)

1. resend.com → **Domains → Add domain** → thêm các bản ghi DNS (SPF, DKIM, có thể thêm MX) mà Resend đưa ra vào chỗ quản lý DNS của domain.
2. Đợi đến khi trạng thái là **Verified**.
3. Đặt `EMAIL_FROM` dùng đúng domain đó.

Gói free của Resend gửi được **3.000 email/tháng**. Digest hằng tuần gửi cho mọi thành viên đang bật nhận tin: 4.000 người × 4 tuần thì vượt mức. Khi đông thành viên, hãy nâng gói Resend hoặc cân nhắc gửi digest thưa hơn (sửa lịch trong `vercel.json`).

---

## 8. Domain

Vercel → Settings → **Domains** → thêm domain → trỏ DNS theo hướng dẫn (bản ghi A hoặc CNAME) → đợi chứng chỉ HTTPS. Thêm cả `www` và để Vercel redirect về domain chính. Sau đó cập nhật `NEXT_PUBLIC_SITE_URL` (mục 4), Site URL bên Supabase (mục 5.1) và URL webhook Stripe (mục 6.3).

---

## 9. Deploy code

Các commit mới hiện **chỉ nằm trên máy bạn**, chưa push lên GitHub.

```bash
git push origin main
```

Nếu project Vercel đã nối với GitHub (lần deploy trước của bạn), Vercel sẽ tự build. Theo dõi ở tab Deployments.

- **Cron:** `vercel.json` khai báo 2 cron: đối soát membership (07:00 UTC mỗi ngày) và digest (13:00 UTC thứ Hai). Xem ở Settings → **Cron Jobs**. Gói Hobby chỉ cho cron chạy tối đa 1 lần/ngày; cả hai cron đều nằm trong giới hạn đó.
- **Gói Vercel:** Hobby cấm dùng cho mục đích thương mại. Khi bật **Stripe Live** để thu tiền thật, hãy nâng **Pro** (20 USD/tháng). Xem plan, file `09`, mục 5.
- Nếu build báo lỗi về `maxDuration` (project cũ chưa bật Fluid compute): vào Settings → Functions và bật **Fluid compute**, hoặc sửa `export const maxDuration = 300` thành `60` trong `app/api/cron/announcement-digest/route.ts`.

---

## 10. Kiểm tra sau deploy

Làm lần lượt trên domain thật:

1. Trang chủ hiện font có chân (Newsreader) cho tiêu đề và font không chân (Karla) cho thân bài. Nếu vẫn ra Times New Roman là đang chạy bản cũ.
2. `/join` có danh sách 4 gói kèm quyền lợi.
3. Đăng ký một tài khoản mới → nhận email xác nhận (đi qua Resend) → làm onboarding → nhận email "We received your request" → vào `/hub` thì bị đưa về `/pending`.
4. Đăng nhập bằng tài khoản owner → `/admin` thấy dashboard → **Approvals** → Send approval → người kia nhận email "Welcome", tải lại trang thì vào được `/hub` mà không phải đăng nhập lại.
5. Thành viên đăng một bài trong feed → thành công (trước đây bước này luôn lỗi).
6. Admin → Content → tạo một event (giờ nhập theo giờ New York) → trang `/events/<slug>` hiện đúng giờ kèm "EDT"/"EST".
7. Admin → Content → tạo một album → thành viên upload ảnh → ảnh nằm trong **Moderation** → duyệt → ảnh hiện trong album.
8. `/me` → đổi avatar (ảnh dưới 10MB) → thành công.
9. Thử cron bằng tay (thay `<CRON_SECRET>` bằng giá trị thật):

   ```bash
   curl -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron/reconcile-memberships
   curl https://<domain>/api/cron/reconcile-memberships        # phải trả 401
   ```

10. Admin → **Audit log**: mỗi thao tác ở các bước 4–7 đều có một dòng tương ứng.

---

## 11. Giao cho bạn của bạn chỉnh nội dung

1. GitHub → repo `Thurstt23/family-hub` → Settings → **Collaborators** → mời tài khoản GitHub của họ (quyền Write).
2. Bảo vệ nhánh `main`: Settings → Branches → Add rule cho `main` → bật **Require a pull request before merging**. Họ làm trên nhánh riêng, bạn review rồi merge.
3. Gửi họ đường dẫn `docs/CONTENT_GUIDE.md`. Tài liệu này hướng dẫn họ cài đặt, cái gì được sửa, cái gì không, checklist nội dung trước khi ra mắt và các câu lệnh mẫu để đưa cho Claude. `CLAUDE.md` đã trỏ Claude của họ tới tài liệu đó.
4. Mỗi pull request sẽ có link **Preview** của Vercel để họ xem trước. Nếu Vercel chưa nối GitHub thì vào Vercel → Settings → Git để nối.
5. Nếu họ muốn chạy trên máy mình: gửi họ một `.env.local` trỏ tới project **dev/test** (không bao giờ là prod), không kèm `SUPABASE_SERVICE_ROLE_KEY` của prod. Gửi bằng kênh riêng tư (password manager), không qua email hay chat công khai.
6. Những gì họ có thể tự làm ngay trên site mà không cần code: nhánh, event, thông báo, album, tên/giá/quyền lợi của tier (họ là owner). Xem README phần 1.

**Nội dung còn là placeholder phải thay trước khi ra mắt** (đã liệt kê trong `CONTENT_GUIDE.md`, mục 4): câu chuyện "1961 / Savannah / leather-bound ledger", `contactEmail: hello@example.com`, 6 nhánh mẫu, ảnh hero, và quyền lợi tier (chỉ được hứa những gì code thực sự giới hạn).

---

## 12. Chạy đầy đủ trên máy và chạy test e2e (tuỳ chọn, cần Docker)

```bash
# cài Docker Desktop, mở nó lên, rồi:
pnpm exec supabase start
pnpm exec supabase db reset            # chạy 0001–0016 và seed.sql
pnpm exec supabase status -o env       # lấy API_URL, ANON_KEY, SERVICE_ROLE_KEY
```

Sửa `.env.local` cho trỏ về local (`http://127.0.0.1:54321` và các key vừa lấy), rồi:

```bash
pnpm dev                               # http://localhost:3000; email local xem ở http://127.0.0.1:54324
pnpm exec playwright install chromium
pnpm test:e2e                          # 6 luồng chính + ma trận bảo mật
pnpm race:rsvp                         # 100 người RSVP cùng lúc, không được vượt sức chứa
```

**Chưa từng chạy được trên máy này vì không có Docker**, nên lần chạy đầu có thể cần chỉnh nhỏ selector. Phần SQL đã được kiểm chứng bằng `pnpm test:db`. CI trên GitHub (`.github/workflows/ci.yml`) sẽ chạy cả bộ e2e mỗi khi push.

Test thanh toán end-to-end: cài Stripe CLI, chạy `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, rồi `STRIPE_E2E=1 pnpm test:e2e`.

---

## 13. Backup tự động (GitHub Actions)

Workflow `.github/workflows/backup.yml` dump database mỗi Chủ nhật, mã hoá rồi lưu 90 ngày. Cần thêm 2 secret ở GitHub → Settings → Secrets and variables → **Actions**:

| Secret | Giá trị |
|---|---|
| `SUPABASE_DB_URL` | Dashboard → Connect → **Session pooler** URI (có kèm mật khẩu) |
| `BACKUP_PASSPHRASE` | Chuỗi dài ngẫu nhiên. **Lưu một bản vào password manager chung của gia đình**; mất passphrase là backup vô dụng |

Chạy thử ngay: Actions → *Weekly database backup* → **Run workflow**. Sau đó diễn tập khôi phục một lần theo README, mục "Backups and restore" (đây là điều kiện đóng Phase 10).

---

## 14. Sự cố thường gặp

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Build fail, báo thiếu biến (zod) | Thiếu biến trong Vercel | Mục 4, rồi Redeploy |
| `/admin` báo lỗi `admin_dashboard_stats does not exist` | Chưa push migration | Mục 3 |
| Đăng ký xong không nhận email | SMTP chưa cấu hình hoặc domain Resend chưa verify | Mục 5.3 và 7; xem log ở Supabase → Auth Logs |
| Bấm Upgrade bị lỗi "Tier not found or missing price" | Tier còn price id giả | Mục 6.2 |
| Thanh toán xong mà tier không đổi | Webhook sai URL/secret, hoặc price chưa map | Stripe → Webhooks → xem event bị lỗi; sửa xong bấm Resend |
| Đăng nhập Google quay về trang lỗi | Redirect URL thiếu | Mục 5.1 và 5.4 |
| Giờ sự kiện lệch | Đặt sai `NEXT_PUBLIC_SITE_TIMEZONE` | Mục 4, rồi Redeploy |
| Cron không chạy | Thiếu `CRON_SECRET`, hoặc gói Hobby không cho lịch đó | Mục 4 và 9; thử curl như ở mục 10 |
| `supabase db push` muốn chạy lại `0001` | Lịch sử migration trên remote trống | Mục 3.1, trường hợp B |
| Project dev "biến mất" | Gói free pause project sau 7 ngày không dùng | Vào Dashboard → Restore |

---

## 15. Những gì còn lại (chưa làm trong code)

- **Rò rỉ liên hệ qua API:** RLS lọc theo dòng, nên một thành viên đã được duyệt có thể gọi API trực tiếp để đọc email và số điện thoại của thành viên khác, kể cả người đã chọn ẩn. Trang HTML thì không lộ, đúng như spec yêu cầu. Muốn chặn hẳn cần thu hồi quyền đọc các cột đó và đổi các trang sang dùng RPC. Đây là thay đổi lớn, nên làm trước khi mở rộng thành viên ra ngoài vòng thân thiết.
- Bulk action "thêm vào nhóm email" trong spec 06 chưa làm.
- "Supporters wall" và "archive documents" trong bảng quyền lợi ở spec 05 chưa được xây. Hiện site chỉ giới hạn được bài viết, sự kiện và album theo tier, nên quyền lợi mặc định của tier đã được viết đúng với những gì có thật.
- Diễn tập khôi phục backup, Lighthouse/axe trên domain thật: việc của người, làm theo checklist trong file `10`.
