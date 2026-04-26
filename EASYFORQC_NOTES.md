# EasyForQC Notes

File này dùng để nhớ các nơi đang lưu source, app, database và config quan trọng. Không ghi secret thật vào file này.

## Link Chính

| Mục | Link / vị trí | Ghi chú |
| --- | --- | --- |
| Web public | https://easyforqc.onrender.com | App public trên Render. Free instance có thể chậm khi mở lần đầu sau thời gian không dùng. |
| GitHub source | https://github.com/duongquocbao170498/easyforqc | Nơi lưu source code để Render deploy. |
| Source local | `/Users/gumball.bi/Documents/New project` | Thư mục code trên máy Mac. |
| Web local | http://localhost:5173 | Dùng khi chạy Docker/local. |
| pgAdmin local | http://localhost:5050 | Chỉ dùng local, không public ra internet. |

## Nơi Lưu Trữ Và Cấu Hình

| Nơi | Đang lưu gì | Thông tin quan trọng | Không gian/thư mục liên quan |
| --- | --- | --- | --- |
| GitHub | Source code EasyForQC, Dockerfile, README, render.yaml, portable QA scripts | Repo: `duongquocbao170498/easyforqc`; branch: `main` | Root source trên GitHub tương ứng với local `/Users/gumball.bi/Documents/New project` |
| Render | Web service public chạy Docker app | Service: `easyforqc`; URL: `https://easyforqc.onrender.com`; Docker build từ GitHub | Container app dùng `/app`; source nằm trong `/app`; output local trong container có thể mất khi redeploy/restart |
| Render Environment | Secret/config runtime của app | `DATABASE_URL`, `APP_SESSION_SECRET`, `APP_ADMIN_EMAIL`, `APP_ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GOOGLE_ALLOWED_EMAILS` | Vào Render service > Environment để xem/sửa. Không lưu giá trị thật vào GitHub |
| Neon | Postgres database production | Lưu account app, Gmail login user, password hash, Project config, Jira auth, Confluence auth và AI Settings đã mã hoá | Database hiện dùng connection string Neon; xem trong Neon dashboard |
| Neon tables | Dữ liệu app | `users`: tài khoản/password hash/Gmail profile; `user_settings`: Project config, Jira auth, Confluence auth và AI Settings mã hoá theo từng account | Không sửa tay nếu không cần backup/debug |
| Google Cloud OAuth | OAuth Client cho nút Login with Google | Lưu `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, redirect URI | Authorized redirect URI production: `https://easyforqc.onrender.com/api/auth/google/callback` |
| Google Cloud OAuth consent | Màn xin quyền login Google | Cần app name, support email, test users nếu app còn Testing | Nếu muốn ai cũng login được thật, cần publish OAuth consent app hoặc cấu hình user access phù hợp |
| Docker local | Chạy app, Postgres, pgAdmin trên máy | Compose file: `docker-compose.yml` | Volumes: `qa_runs`, `qa_output`, `postgres_data`, `pgadmin_data` |
| Local Postgres | Database local khi chạy Docker | DB: `qa_studio`; user: `qa_studio`; port máy Mac: `5433` | Dữ liệu nằm trong Docker volume `postgres_data` |
| Local output | File XMind/PNG và run config khi chạy local | `.qa-runs/`, `qa/xmind-test-design/` | Hai thư mục này bị ignore khỏi Git vì có thể chứa dữ liệu task/Jira |
| Skill/source QA | Script tạo test case/test design | Portable scripts và source skill đã được vendor vào repo | `vendor/portable-skills/`, `vendor/qa-source/` |

## Secret Cần Nhớ Là Để Ở Đâu

| Secret | Để ở đâu | Ghi chú |
| --- | --- | --- |
| GitHub token | GitHub Settings > Developer settings > Personal access tokens | Chỉ dùng để push code. Token đã paste vào chat nên nên revoke và tạo token mới khi cần. |
| Neon `DATABASE_URL` | Render Environment và Neon dashboard | Có password DB, không gửi vào chat/không commit. |
| `APP_SESSION_SECRET` | Render Environment và `.env` local | Dùng để ký session/cookie và mã hoá Jira auth. Nếu đổi giá trị này, Jira auth đã lưu có thể không decrypt được. |
| `APP_ADMIN_PASSWORD` | Render Environment và `.env` local | Mật khẩu admin app. Trong DB chỉ lưu password hash. |
| Google Client Secret | Google Cloud OAuth Client và Render Environment | Nếu từng bị lộ, reset secret trong Google Cloud rồi cập nhật lại Render. |
| Jira auth/token của QC | Database Neon/local, bảng `user_settings`, field encrypted | App mã hoá bằng `APP_SESSION_SECRET`; lưu theo từng account đăng nhập. |
| Confluence auth/token của QC | Database Neon/local, bảng `user_settings`, field `confluence_credentials_encrypted` | Dùng để fetch doc links trong Task context. Nếu Confluence nội bộ không public, paste nội dung doc thủ công vào app. |
| AI API key của từng QC | Database Neon/local, bảng `user_settings`, field `ai_settings_encrypted` | Lưu mã hoá theo từng account. Người khác dùng key riêng của họ, không ảnh hưởng token/chi phí của bạn. |
| AI writing style/guidelines | Database Neon/local, bảng `user_settings`, field `ai_settings_encrypted` | Khi bật checkbox AI Settings: prompt mặc định của skill + guideline riêng. Khi tắt checkbox: chỉ dùng prompt mặc định của skill. |

## Các File Cấu Hình Quan Trọng Trong Source

| File | Dùng để làm gì |
| --- | --- |
| `render.yaml` | Blueprint Render Free Web Service. |
| `Dockerfile` | Build Docker image cho app. |
| `docker-compose.yml` | Chạy local gồm app + Postgres + pgAdmin. |
| `docker-compose.prod.yml` | Chạy server riêng với Caddy HTTPS + Postgres private. |
| `.env.example` | Mẫu env local. |
| `.env.render.example` | Mẫu secret cần nhập trên Render. |
| `.env.production.example` | Mẫu env cho server riêng/domain riêng. |
| `server/index.mjs` | Backend Express, auth, Google OAuth, DB, gọi script QA. |
| `src/App.tsx` | Frontend web app. |
| `README.md` | Hướng dẫn chạy local/deploy public. |

## Việc Cần Làm Khi Có Lỗi Login Google

1. Kiểm tra Render service > Environment có đúng `GOOGLE_CALLBACK_URL`.
2. Kiểm tra Google Cloud OAuth Client có Authorized redirect URI:

```text
https://easyforqc.onrender.com/api/auth/google/callback
```

3. Nếu Google báo `redirect_uri_mismatch`, thêm/sửa redirect URI rồi chờ 1-3 phút.
4. Nếu OAuth consent app còn ở Testing, thêm Gmail cần dùng vào Test users hoặc publish app.

## Việc Cần Làm Khi Deploy Bản Mới

```bash
cd "/Users/gumball.bi/Documents/New project"
git status
git add .
git commit -m "Update EasyForQC"
git push
```

Render sẽ tự deploy lại từ branch `main`.
