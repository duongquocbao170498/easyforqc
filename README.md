# EasyForQC

Web app hỗ trợ QC/QA tạo test case và test design từ Jira task theo workflow portable QA hiện có.

## Chạy app

```bash
npm install
npm run dev
```

Mở:

```text
http://qa-studio.localhost:5173
```

Nếu database/auth được cấu hình, app sẽ hiển thị trang login riêng. Email mặc định từ `.env` hiện tại:

```text
qa@gmail.com
```

Fallback local URL:

```text
http://localhost:5173
```

## Deploy public miễn phí được chọn

Phương án miễn phí phù hợp nhất cho app hiện tại:

- App/backend Docker: Render Free Web Service.
- Database Postgres: Neon Free.
- Link public miễn phí: `https://easyforqc.onrender.com` nếu tên `easyforqc` còn trống trên Render. Nếu tên này đã bị dùng, Render sẽ yêu cầu đổi service name, ví dụ `easyforqc-qa.onrender.com`.

Lý do chọn hướng này: app đang là full-stack Node/Express + React + Python tool + Postgres, nên cần một hosting chạy được Docker/backend thật. Các nền tảng static hosting miễn phí như GitHub Pages/Cloudflare Pages không đủ cho backend và database của app này nếu không tách lại kiến trúc.

### 1. Tạo Neon Postgres

1. Vào `https://neon.com` và tạo project Postgres free.
2. Copy connection string dạng pooled hoặc direct, nên có `sslmode=require`.
3. Dùng connection string đó làm `DATABASE_URL` trên Render.

Ví dụ format:

```text
postgresql://user:password@host/dbname?sslmode=require
```

### 2. Đưa source lên GitHub

Tạo một repo private hoặc public trên GitHub rồi push toàn bộ source app này lên. Không commit file `.env` thật.

Các file example có thể commit:

```text
.env.example
.env.production.example
.env.render.example
```

Các file chứa secret thật không được commit:

```text
.env
.env.production
```

### 3. Tạo Render Web Service

Vào `https://render.com` và tạo Web Service/Blueprint từ repo GitHub. Nên dùng file `render.yaml` đã có sẵn trong repo để Render đọc sẵn Docker config.

Render cần các secret env vars sau:

```text
DATABASE_URL=connection string từ Neon
APP_SESSION_SECRET=chuoi-random-dai
APP_ADMIN_EMAIL=email-admin-cua-ban@gmail.com
APP_ADMIN_PASSWORD=mat-khau-admin-dai
GOOGLE_CLIENT_ID=client-id-google
GOOGLE_CLIENT_SECRET=client-secret-google
```

Tạo secret random bằng lệnh local:

```bash
openssl rand -hex 32
```

Các biến còn lại đã được set trong `render.yaml`:

```text
NODE_ENV=production
PORT=10000
DISPLAY_HOST=easyforqc.onrender.com
GOOGLE_CALLBACK_URL=https://easyforqc.onrender.com/api/auth/google/callback
JIRA_BASE_URL=https://jira.vexere.net
GOOGLE_ALLOWED_EMAILS=
```

Nếu Render bắt đổi service name, cập nhật lại `DISPLAY_HOST` và `GOOGLE_CALLBACK_URL` trên Render theo link thật mà Render cấp.

### 4. Cấu hình Google Login public

Trong Google OAuth Client, thêm Authorized redirect URI:

```text
https://easyforqc.onrender.com/api/auth/google/callback
```

Nếu Render cấp URL khác, dùng URL thật đó thay cho `easyforqc.onrender.com`.

Để mọi Gmail đều đăng nhập được, giữ `GOOGLE_ALLOWED_EMAILS` trống. Nếu chỉ muốn cho một số email, nhập danh sách email cách nhau bằng dấu phẩy.

### 5. Lưu ý của bản miễn phí

Render Free có thể sleep khi không có người dùng, lần mở đầu tiên sẽ chậm hơn. File output local như `.qa-runs/` và `qa/xmind-test-design/` trên Render có thể mất khi app restart hoặc redeploy, nên bản public nên dùng flow tạo và attach trực tiếp lên Jira. Database, account, mật khẩu, config Jira auth, Project config và AI Settings sẽ được lưu trong Neon.

### AI Settings theo từng account

Mỗi user đăng nhập có thể lưu AI Settings riêng:

- Provider, Base URL, Model và API key riêng.
- Phong cách viết.
- Guideline viết test case.
- Guideline làm test design.
- Improve skill notes để ghi nhớ các chỉnh sửa user muốn giữ cho lần sau.

API key và guideline được lưu mã hoá trong bảng `user_settings` bằng `APP_SESSION_SECRET`. Bản hiện tại chuẩn bị UI/storage trước; khi tích hợp AI generation, backend nên dùng AI key của chính user đang đăng nhập thay vì dùng một key chung của admin.

Khi muốn dùng domain đẹp như `easyforqc.com`, cần mua domain rồi trỏ DNS về service Render hoặc server riêng.

## Deploy public với domain riêng easyforqc.com

1. Mua domain `easyforqc.com` và trỏ DNS:

```text
A     easyforqc.com      -> IP server
CNAME www.easyforqc.com  -> easyforqc.com
```

2. Trên server đã cài Docker, tạo env production:

```bash
cp .env.production.example .env.production
```

3. Điền secret thật trong `.env.production`, đặc biệt:

```text
APP_SESSION_SECRET=...
POSTGRES_PASSWORD=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://easyforqc.com/api/auth/google/callback
GOOGLE_ALLOWED_EMAILS=
```

Để public cho mọi Gmail, giữ `GOOGLE_ALLOWED_EMAILS` trống. Nếu muốn chỉ invite một số email, nhập danh sách cách nhau bằng dấu phẩy.

4. Trong Google OAuth Client, thêm redirect URI production:

```text
https://easyforqc.com/api/auth/google/callback
```

5. Chạy production stack:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Caddy sẽ tự cấp HTTPS cho:

```text
https://easyforqc.com
https://www.easyforqc.com
```

Production compose không public Postgres/pgAdmin. Nếu cần xem DB, dùng SSH tunnel hoặc backup nội bộ, không mở pgAdmin ra internet.

## Chạy trên server cá nhân

Không public app này nếu chưa bật password và HTTPS. App có quyền nhận Jira credential và tạo dữ liệu lên Jira/Zephyr.

### Chạy bằng Docker Compose

Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

Sửa ít nhất:

```text
APP_ADMIN_EMAIL=email-cua-ban@gmail.com
APP_ADMIN_PASSWORD=mat-khau-rieng-that-dai
APP_SESSION_SECRET=chuoi-random-that-dai
POSTGRES_PASSWORD=mat-khau-postgres
PGADMIN_PASSWORD=mat-khau-pgadmin
DISPLAY_HOST=qa-studio.your-domain.com
```

Build và chạy:

```bash
docker compose up -d --build
```

Mở:

```text
http://<server-ip>:5173
```

pgAdmin4:

```text
http://<server-ip>:5050
```

Thông tin database mặc định trong Docker:

```text
Host: postgres
Port: 5432
Database: qa_studio
Username: qa_studio
Password: POSTGRES_PASSWORD trong .env
```

Trong pgAdmin, login bằng:

```text
Email: PGADMIN_EMAIL trong .env
Password: PGADMIN_PASSWORD trong .env
```

Sau khi login app, dùng nút `Đổi mật khẩu` ở góc trên để cập nhật mật khẩu tài khoản. Mật khẩu được hash bằng bcrypt trước khi lưu trong Postgres.

### Google/Gmail Login

App hỗ trợ `Login with Google` qua OAuth. Tạo OAuth Client trong Google Cloud với redirect URI:

```text
http://localhost:5173/api/auth/google/callback
```

Sau đó điền vào `.env`:

```text
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5173/api/auth/google/callback
GOOGLE_ALLOWED_EMAILS=email-cua-ban@gmail.com
```

Restart Docker sau khi đổi `.env`:

```bash
PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH" docker compose up -d
```

Nếu có domain riêng, trỏ DNS về server rồi dùng reverse proxy HTTPS. Có file mẫu:

```text
deploy/Caddyfile.example
```

### Chạy không dùng Docker

```bash
npm ci
npm run build
DATABASE_URL=postgres://qa_studio:mat-khau-postgres@localhost:5432/qa_studio \
APP_ADMIN_EMAIL=email-cua-ban@gmail.com \
APP_ADMIN_PASSWORD=mat-khau-rieng \
APP_SESSION_SECRET=chuoi-random-that-dai \
PORT=5173 npm run start
```

Khi deploy lên internet, nên đặt app sau reverse proxy HTTPS như Caddy/Nginx.

## Luồng sử dụng

1. Dán Jira URL hoặc nhập issue key.
2. Nhấn `Parse` để lấy issue key hoặc `Fetch` để đọc Jira task bằng credential đã nhập.
3. Bổ sung summary, description, acceptance criteria hoặc ghi chú QA nếu cần.
4. Chọn archetype thủ công hoặc để `Auto archetype`.
5. Nhấn `Generate draft`.
6. Sửa test cases và XMind outline trực tiếp trên UI.
7. Vào tab `Run`:
   - `Build local`: tạo `.xmind` và `.png` local.
   - `Build and attach`: tạo file và attach lên Jira.
   - `Create suite`: tạo Zephyr test cases.
   - `Create cycle`: tạo Zephyr test cycle từ testcase keys.

## Output local

- Run temp/config: `.qa-runs/`
- XMind/PNG: `qa/xmind-test-design/`

Hai thư mục này đã được ignore khỏi git vì có thể chứa dữ liệu task hoặc output tạm.

## Workflow được dùng

Backend gọi các portable skill đã cài trong Codex:

- `vendor/portable-skills/create-portable-jira-test-cases/scripts/create_portable_jira_test_cases.py`
- `vendor/portable-skills/create-portable-xmind-test-design/scripts/create_portable_xmind_test_design.py`

Source skill mặc định:

```text
vendor/qa-source
```

Credential Jira không được ghi vào repo. App truyền credential qua environment variables khi gọi script.
