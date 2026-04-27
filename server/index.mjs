import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import express from "express";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const RUNS_DIR = path.join(ROOT_DIR, ".qa-runs");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "0.0.0.0";
const DISPLAY_HOST = process.env.DISPLAY_HOST || "easyforqc.com";
const APP_USER = process.env.APP_USER || "qa";
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const APP_ADMIN_EMAIL = String(process.env.APP_ADMIN_EMAIL || APP_USER || "qa@example.local").trim().toLowerCase();
const APP_ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD || APP_PASSWORD;
const APP_SESSION_SECRET = process.env.APP_SESSION_SECRET || APP_PASSWORD || crypto.randomBytes(32).toString("hex");
const APP_COOKIE_SECURE = process.env.APP_COOKIE_SECURE === "true";
const SESSION_COOKIE = "qa_studio_session";
const SESSION_MAX_AGE_SECONDS = Number(process.env.APP_SESSION_MAX_AGE_SECONDS || 60 * 60 * 24 * 7);
const DATABASE_URL = process.env.DATABASE_URL || "";
const SETTINGS_CIPHER_VERSION = "v1";
const GOOGLE_OAUTH_STATE_COOKIE = "qa_google_oauth_state";
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || "").trim();
const GOOGLE_CLIENT_SECRET = String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
const GOOGLE_CALLBACK_URL = String(process.env.GOOGLE_CALLBACK_URL || "").trim();
const GOOGLE_ALLOWED_EMAILS = String(process.env.GOOGLE_ALLOWED_EMAILS || "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
const { Pool } = pg;
const db = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;

const HOME_DIR = process.env.HOME || "";
const VENDOR_DIR = path.join(ROOT_DIR, "vendor");
const VENDOR_JIRA_WRAPPER = path.join(
  VENDOR_DIR,
  "portable-skills",
  "create-portable-jira-test-cases",
  "scripts",
  "create_portable_jira_test_cases.py",
);
const VENDOR_XMIND_WRAPPER = path.join(
  VENDOR_DIR,
  "portable-skills",
  "create-portable-xmind-test-design",
  "scripts",
  "create_portable_xmind_test_design.py",
);
const HOME_JIRA_WRAPPER = path.join(
  HOME_DIR,
  ".codex",
  "skills",
  "create-portable-jira-test-cases",
  "scripts",
  "create_portable_jira_test_cases.py",
);
const HOME_XMIND_WRAPPER = path.join(
  HOME_DIR,
  ".codex",
  "skills",
  "create-portable-xmind-test-design",
  "scripts",
  "create_portable_xmind_test_design.py",
);
const JIRA_WRAPPER =
  process.env.JIRA_WRAPPER_PATH ||
  (fsSync.existsSync(VENDOR_JIRA_WRAPPER) ? VENDOR_JIRA_WRAPPER : HOME_JIRA_WRAPPER);
const XMIND_WRAPPER =
  process.env.XMIND_WRAPPER_PATH ||
  (fsSync.existsSync(VENDOR_XMIND_WRAPPER) ? VENDOR_XMIND_WRAPPER : HOME_XMIND_WRAPPER);
const VENDOR_SOURCE_ROOT = path.join(VENDOR_DIR, "qa-source");
const DEFAULT_SOURCE_ROOT = fsSync.existsSync(VENDOR_SOURCE_ROOT)
  ? VENDOR_SOURCE_ROOT
  : "/Users/gumball.bi/Vexere/knowledge_base/omniagent/.agent/skills";

const DEFAULTS = {
  sourceRoot: process.env.QA_SOURCE_ROOT || DEFAULT_SOURCE_ROOT,
  jiraBaseUrl: process.env.JIRA_BASE_URL || "https://jira.vexere.net",
  projectKey: "AI",
  folderRoot: "/Bao QC",
  runRoot: "/AI Chatbot",
  outputDir: path.join(ROOT_DIR, "qa", "xmind-test-design"),
  labelPolicy: {
    mode: "custom",
    testcaseLabels: "QA_Testcases",
    testdesignLabels: "QA_testdesign",
    testcaseStatusLabels: "TODO=TestCase1\nIN PROGRESS=TestCase1\nREADY TO TEST=TestCase2\nTESTING=TestCase3\nDONE=TestCase3",
    testdesignStatusLabels: "TODO=TestDesign1\nIN PROGRESS=TestDesign1\nREADY TO TEST=TestDesign2\nTESTING=TestDesign3\nDONE=TestDesign3",
  },
};

const STATUS_LABELS = {
  testCases: {
    todo: "TestCase1",
    "to do": "TestCase1",
    "in progress": "TestCase1",
    "ready to test": "TestCase2",
    testing: "TestCase3",
    done: "TestCase3",
  },
  testDesign: {
    todo: "TestDesign1",
    "to do": "TestDesign1",
    "in progress": "TestDesign1",
    "ready to test": "TestDesign2",
    testing: "TestDesign3",
    done: "TestDesign3",
  },
};

const ARCHETYPES = {
  reporting: {
    label: "UI Reporting / Dashboard / Default Sort",
    keywords: ["dashboard", "report", "báo cáo", "sort", "sắp xếp", "thống kê", "pagination"],
    primary: ["Decision table", "Regression"],
    supporting: ["Boundary value analysis", "State transition"],
    dimensions: [
      "quy tắc nhóm hoặc thứ tự hiển thị",
      "giá trị trống, null hoặc thiếu dữ liệu",
      "ổn định sau refresh/reload",
      "phân trang và dữ liệu ở trang kế tiếp",
      "row binding và tính đúng dữ liệu hiển thị",
    ],
    branches: [
      "Quy tắc hiển thị và sắp xếp",
      "Dữ liệu hiển thị và row binding",
      "Refresh, realtime và phân trang",
      "Fallback, dữ liệu rỗng và regression",
      "Out of scope",
    ],
  },
  tool_api: {
    label: "Tool / API / Mapping / Callback",
    keywords: ["api", "callback", "mapping", "map", "tool", "webhook", "payload", "field", "bms", "vcms"],
    primary: ["Integration contract / field mapping", "Decision table"],
    supporting: ["Retry / idempotency / duplicate event", "Fallback / partial failure / recovery"],
    dimensions: [
      "required fields",
      "mapping sai hoặc thiếu field",
      "duplicate event hoặc retry",
      "state carry-forward",
      "downstream trả rỗng hoặc lỗi một phần",
    ],
    branches: [
      "Luồng tích hợp chính",
      "Mapping, required fields và validation",
      "State carry-forward và side effects",
      "Retry, fallback và regression",
      "Out of scope",
    ],
  },
  workflow: {
    label: "Workflow / Routing / Assignment",
    keywords: ["workflow", "routing", "route", "assign", "assignment", "phân công", "điều phối", "trạng thái"],
    primary: ["State transition", "Decision table"],
    supporting: ["Permission / role matrix", "Risk-based regression"],
    dimensions: [
      "state carry-forward",
      "nhánh quyết định",
      "misrouting",
      "retry hoặc duplicate action",
      "fallback khi thiếu dữ liệu",
    ],
    branches: [
      "State transition chính",
      "Decision branch và routing",
      "Role, permission và dữ liệu thiếu",
      "Retry, duplicate và regression",
      "Out of scope",
    ],
  },
  chatbot: {
    label: "Chatbot / Tool-Orchestrated Conversation",
    keywords: ["chatbot", "conversation", "bot", "multi-turn", "handoff", "tin nhắn", "agent"],
    primary: ["Use-case / scenario flow", "Integration contract / field mapping"],
    supporting: ["State transition", "Fallback / partial failure / recovery"],
    dimensions: [
      "multi-turn context carry-forward",
      "chọn đúng tool",
      "thiếu thông tin bắt buộc",
      "user input mơ hồ",
      "handoff boundary",
    ],
    branches: [
      "Luồng hội thoại chính",
      "Tool choice và data grounding",
      "Context carry-forward và state",
      "Fallback, handoff và regression",
      "Out of scope",
    ],
  },
  bugfix: {
    label: "Bug Fix",
    keywords: ["bug", "fix", "lỗi", "sửa lỗi", "hotfix", "regression"],
    primary: ["Error guessing / bug-history based", "Regression"],
    supporting: ["Original failure reproduction", "Nearby negative variant"],
    dimensions: [
      "tái hiện lỗi gốc",
      "hành vi đúng sau fix",
      "nearby negative behavior",
      "retry hoặc duplicate nếu có liên quan",
      "regression quanh vùng sửa",
    ],
    branches: [
      "Tái hiện lỗi gốc và xác nhận fix",
      "Nearby negative path",
      "Regression quanh vùng thay đổi",
      "Retry, duplicate hoặc fallback liên quan",
      "Out of scope",
    ],
  },
  general: {
    label: "General Feature",
    keywords: [],
    primary: ["Use-case / scenario flow", "Decision table"],
    supporting: ["Boundary value analysis", "Regression"],
    dimensions: [
      "happy path",
      "validation",
      "negative path",
      "edge case",
      "regression",
    ],
    branches: [
      "Luồng nghiệp vụ chính",
      "Validation và điều kiện dữ liệu",
      "Negative path và edge cases",
      "Regression và guardrails",
      "Out of scope",
    ],
  },
};

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "5mb" }));

const authAttempts = new Map();

function rateLimit({ windowMs, max, message }) {
  return (req, res, next) => {
    const key = `${req.ip || req.socket.remoteAddress || "unknown"}:${req.path}`;
    const now = Date.now();
    const current = authAttempts.get(key);
    if (!current || current.resetAt <= now) {
      authAttempts.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    current.count += 1;
    if (current.count > max) {
      res.status(429).json({ error: message });
      return;
    }
    next();
  };
}

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Đăng nhập quá nhiều lần. Hãy thử lại sau vài phút.",
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, app: "EasyForQC" });
});

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeEmail(value) {
  return asText(value).toLowerCase();
}

async function initializeDatabase() {
  if (!db) {
    return;
  }

  let lastError = null;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await db.query("SELECT 1");
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  if (lastError) {
    throw lastError;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      google_sub TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT");
  await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT");

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
      project_config JSONB NOT NULL DEFAULT '{}'::jsonb,
      credentials_encrypted TEXT NOT NULL DEFAULT '',
      confluence_credentials_encrypted TEXT NOT NULL DEFAULT '',
      ai_settings_encrypted TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS confluence_credentials_encrypted TEXT NOT NULL DEFAULT ''");
  await db.query("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_settings_encrypted TEXT NOT NULL DEFAULT ''");

  const adminEmail = normalizeEmail(APP_ADMIN_EMAIL);
  if (!adminEmail || !APP_ADMIN_PASSWORD) {
    return;
  }

  const existing = await findUserByEmail(adminEmail);
  if (!existing) {
    const passwordHash = await bcrypt.hash(APP_ADMIN_PASSWORD, 12);
    await db.query(
      `
        INSERT INTO users (id, email, display_name, password_hash)
        VALUES ($1, $2, $3, $4)
      `,
      [crypto.randomUUID(), adminEmail, "QA Admin", passwordHash],
    );
  }
}

async function findUserByEmail(email) {
  if (!db) {
    return null;
  }
  const result = await db.query(
    "SELECT id, email, display_name, password_hash, created_at, updated_at, password_changed_at FROM users WHERE email = $1",
    [normalizeEmail(email)],
  );
  return result.rows[0] || null;
}

async function verifyPassword(user, password) {
  if (!user || !password || !user.password_hash) {
    return false;
  }
  return bcrypt.compare(password, user.password_hash);
}

async function upsertGoogleUser(profile) {
  if (!db) {
    throw Object.assign(new Error("Database chưa bật nên chưa thể dùng Google login."), { status: 400 });
  }
  const email = normalizeEmail(profile.email);
  const displayName = asText(profile.name) || email;
  const googleSub = asText(profile.sub);
  const avatarUrl = asText(profile.picture);
  const result = await db.query(
    `
      INSERT INTO users (id, email, display_name, password_hash, google_sub, avatar_url)
      VALUES ($1, $2, $3, '', $4, $5)
      ON CONFLICT (email)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        google_sub = EXCLUDED.google_sub,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW()
      RETURNING id, email, display_name, password_hash, created_at, updated_at, password_changed_at
    `,
    [crypto.randomUUID(), email, displayName, googleSub, avatarUrl],
  );
  return result.rows[0];
}

async function changeUserPassword(email, currentPassword, newPassword) {
  const user = await findUserByEmail(email);
  if (!(await verifyPassword(user, currentPassword))) {
    const error = new Error("Mật khẩu hiện tại không đúng.");
    error.status = 401;
    throw error;
  }
  const nextPassword = asText(newPassword);
  if (nextPassword.length < 10) {
    const error = new Error("Mật khẩu mới cần tối thiểu 10 ký tự.");
    error.status = 400;
    throw error;
  }
  const passwordHash = await bcrypt.hash(nextPassword, 12);
  await db.query(
    `
      UPDATE users
      SET password_hash = $1,
          password_changed_at = NOW(),
          updated_at = NOW()
      WHERE email = $2
    `,
    [passwordHash, normalizeEmail(email)],
  );
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex < 0) return [part, ""];
        return [part.slice(0, separatorIndex), decodeURIComponent(part.slice(separatorIndex + 1))];
      }),
  );
}

function sessionSignature(payload) {
  return crypto.createHmac("sha256", APP_SESSION_SECRET).update(payload).digest("base64url");
}

function createSessionToken(user) {
  const email = typeof user === "string" ? user : user.email;
  const payload = Buffer.from(
    JSON.stringify({
      user: email,
      email,
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${sessionSignature(payload)}`;
}

function createSignedPayload(payload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sessionSignature(encoded)}`;
}

function readSignedPayload(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature || !safeEqual(signature, sessionSignature(payload))) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.exp && parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readSession(req) {
  if (!APP_PASSWORD && !db) {
    return { user: APP_ADMIN_EMAIL, email: APP_ADMIN_EMAIL };
  }
  const token = parseCookies(req)[SESSION_COOKIE] || "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sessionSignature(payload))) {
    return null;
  }
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (session.exp < Date.now() || !session.email) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function sessionCookie(value, maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (APP_COOKIE_SECURE) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function namedCookie(name, value, maxAgeSeconds) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (APP_COOKIE_SECURE) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function googleAuthEnabled() {
  return Boolean(db && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

function googleRedirectUri(req) {
  if (GOOGLE_CALLBACK_URL) {
    return GOOGLE_CALLBACK_URL;
  }
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  return `${proto}://${req.get("host")}/api/auth/google/callback`;
}

function redirectWithAuthError(res, message) {
  res.redirect(`/?auth_error=${encodeURIComponent(message)}`);
}

async function fetchGoogleProfile(code, redirectUri) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description || tokenPayload.error || "Google token exchange failed.");
  }

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
  });
  const profile = await profileResponse.json().catch(() => ({}));
  if (!profileResponse.ok || !profile.email) {
    throw new Error(profile.error_description || profile.error || "Google profile fetch failed.");
  }
  return profile;
}

function settingsCipherKey() {
  return crypto.createHash("sha256").update(APP_SESSION_SECRET).digest();
}

function encryptSettingsJson(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", settingsCipherKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload || {}), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    SETTINGS_CIPHER_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

function decryptSettingsJson(value) {
  const text = asText(value);
  if (!text) return {};
  const [version, ivText, tagText, encryptedText] = text.split(":");
  if (version !== SETTINGS_CIPHER_VERSION || !ivText || !tagText || !encryptedText) {
    return {};
  }
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", settingsCipherKey(), Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedText, "base64url")),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return {};
  }
}

function requireSession(req, res, next) {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: "Bạn cần đăng nhập để dùng QA Test Studio." });
    return;
  }
  req.session = session;
  next();
}

app.get("/api/auth/status", (req, res) => {
  const session = readSession(req);
  res.json({
    authEnabled: Boolean(APP_PASSWORD || db),
    authenticated: Boolean(session),
    user: session?.email || session?.user || null,
    email: session?.email || null,
    databaseEnabled: Boolean(db),
    googleAuthEnabled: googleAuthEnabled(),
  });
});

app.post("/api/auth/login", authRateLimit, async (req, res) => {
  if (!APP_PASSWORD && !db) {
    res.json({ authenticated: true, user: APP_ADMIN_EMAIL, email: APP_ADMIN_EMAIL });
    return;
  }
  const email = normalizeEmail(req.body?.email || req.body?.username);
  const password = asText(req.body?.password);
  if (db) {
    const user = await findUserByEmail(email);
    if (!(await verifyPassword(user, password))) {
      res.status(401).json({ error: "Email hoặc password không đúng." });
      return;
    }
    res.setHeader("Set-Cookie", sessionCookie(createSessionToken(user)));
    res.json({ authenticated: true, user: user.email, email: user.email });
    return;
  }
  if (!safeEqual(email, APP_ADMIN_EMAIL) || !safeEqual(password, APP_PASSWORD)) {
    res.status(401).json({ error: "Email hoặc password không đúng." });
    return;
  }
  res.setHeader("Set-Cookie", sessionCookie(createSessionToken(email)));
  res.json({ authenticated: true, user: email, email });
});

app.get("/api/auth/google", authRateLimit, (req, res) => {
  if (!googleAuthEnabled()) {
    redirectWithAuthError(res, "Google login chưa được cấu hình. Cần GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trong .env.");
    return;
  }
  const state = createSignedPayload({
    nonce: crypto.randomBytes(24).toString("base64url"),
    exp: Date.now() + 10 * 60 * 1000,
  });
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", googleRedirectUri(req));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");
  res.setHeader("Set-Cookie", namedCookie(GOOGLE_OAUTH_STATE_COOKIE, state, 10 * 60));
  res.redirect(authUrl.toString());
});

app.get("/api/auth/google/callback", async (req, res) => {
  try {
    if (!googleAuthEnabled()) {
      redirectWithAuthError(res, "Google login chưa được cấu hình.");
      return;
    }
    if (req.query.error) {
      redirectWithAuthError(res, `Google login bị hủy hoặc lỗi: ${req.query.error}`);
      return;
    }
    const state = asText(req.query.state);
    const expectedState = parseCookies(req)[GOOGLE_OAUTH_STATE_COOKIE] || "";
    if (!state || !expectedState || !safeEqual(state, expectedState) || !readSignedPayload(state)) {
      redirectWithAuthError(res, "Google login state không hợp lệ. Hãy thử lại.");
      return;
    }
    const profile = await fetchGoogleProfile(asText(req.query.code), googleRedirectUri(req));
    const email = normalizeEmail(profile.email);
    if (profile.email_verified === false) {
      redirectWithAuthError(res, "Email Google chưa được verify.");
      return;
    }
    if (GOOGLE_ALLOWED_EMAILS.length && !GOOGLE_ALLOWED_EMAILS.includes(email)) {
      redirectWithAuthError(res, "Gmail này chưa được cho phép đăng nhập app.");
      return;
    }
    const user = await upsertGoogleUser(profile);
    res.setHeader("Set-Cookie", [
      sessionCookie(createSessionToken(user)),
      namedCookie(GOOGLE_OAUTH_STATE_COOKIE, "", 0),
    ]);
    res.redirect("/");
  } catch (error) {
    redirectWithAuthError(res, error instanceof Error ? error.message : "Google login failed.");
  }
});

app.post("/api/auth/logout", (_req, res) => {
  res.setHeader("Set-Cookie", sessionCookie("", 0));
  res.json({ authenticated: false });
});

app.use("/api", requireSession);

app.post("/api/auth/change-password", async (req, res) => {
  try {
    if (!db) {
      res.status(400).json({ error: "Database chưa bật nên chưa thể đổi mật khẩu trong app." });
      return;
    }
    await changeUserPassword(req.session.email, req.body?.currentPassword, req.body?.newPassword);
    res.json({ changed: true });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/user-settings", async (req, res) => {
  try {
    if (!db) {
      res.json({ project: null, credentials: null, confluenceCredentials: null, aiSettings: null });
      return;
    }
    const result = await db.query(
      `
        SELECT project_config, credentials_encrypted, confluence_credentials_encrypted, ai_settings_encrypted
        FROM user_settings
        WHERE user_email = $1
      `,
      [normalizeEmail(req.session.email)],
    );
    const row = result.rows[0];
    res.json({
      project: row?.project_config || null,
      credentials: decryptSettingsJson(row?.credentials_encrypted),
      confluenceCredentials: decryptSettingsJson(row?.confluence_credentials_encrypted),
      aiSettings: decryptSettingsJson(row?.ai_settings_encrypted),
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/user-settings", async (req, res) => {
  try {
    if (!db) {
      res.status(400).json({ error: "Database chưa bật nên chưa thể lưu cấu hình." });
      return;
    }
    const email = normalizeEmail(req.session.email);
    const body = req.body || {};
    const hasProject = Object.prototype.hasOwnProperty.call(body, "project");
    const hasCredentials = Object.prototype.hasOwnProperty.call(body, "credentials");
    const hasConfluenceCredentials = Object.prototype.hasOwnProperty.call(body, "confluenceCredentials");
    const hasAiSettings = Object.prototype.hasOwnProperty.call(body, "aiSettings");
    const existing = await db.query(
      `
        SELECT project_config, credentials_encrypted, confluence_credentials_encrypted, ai_settings_encrypted
        FROM user_settings
        WHERE user_email = $1
      `,
      [email],
    );
    const row = existing.rows[0];
    const project = hasProject ? normalizeProject(body.project) : row?.project_config || {};
    const credentials = hasCredentials ? normalizeCredentials(body.credentials) : decryptSettingsJson(row?.credentials_encrypted);
    const confluenceCredentials = hasConfluenceCredentials
      ? normalizeConfluenceCredentials(body.confluenceCredentials)
      : decryptSettingsJson(row?.confluence_credentials_encrypted);
    const aiSettings = hasAiSettings ? normalizeAiSettings(body.aiSettings) : decryptSettingsJson(row?.ai_settings_encrypted);
    await db.query(
      `
        INSERT INTO user_settings (user_email, project_config, credentials_encrypted, confluence_credentials_encrypted, ai_settings_encrypted)
        VALUES ($1, $2::jsonb, $3, $4, $5)
        ON CONFLICT (user_email)
        DO UPDATE SET
          project_config = EXCLUDED.project_config,
          credentials_encrypted = EXCLUDED.credentials_encrypted,
          confluence_credentials_encrypted = EXCLUDED.confluence_credentials_encrypted,
          ai_settings_encrypted = EXCLUDED.ai_settings_encrypted,
          updated_at = NOW()
      `,
      [
        email,
        JSON.stringify(project),
        encryptSettingsJson(credentials),
        encryptSettingsJson(confluenceCredentials),
        encryptSettingsJson(aiSettings),
      ],
    );
    res.json({
      saved: true,
      project,
      credentials,
      confluenceCredentials,
      aiSettings,
    });
  } catch (error) {
    sendError(res, error);
  }
});

function asText(value) {
  return String(value ?? "").trim();
}

function cleanContextLine(line) {
  let text = asText(line)
    .replace(/<[^>]+>/g, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[-*#\s]+/, "")
    .replace(/[*_`]+$/g, "")
    .trim();
  text = text.replace(/^\d+[.)]\s+/, "").trim();
  const headingOnly = normalizeSearchText(text).replace(/[:：*_`]+$/g, "").trim();
  if (
    [
      "muc tieu",
      "objective",
      "description",
      "acceptance criteria",
      "user story",
      "scope",
      "pham vi",
      "tai lieu",
      "document",
      "note",
      "ghi chu",
      "requirement",
      "steps",
      "step",
      "test data",
      "expected result",
      "ket qua mong doi",
    ].includes(headingOnly)
  ) {
    return "";
  }
  const headingWithContent = text.match(/^(mục tiêu|objective|acceptance criteria|user story|scope|phạm vi|requirement)\s*[:：]\s*(.+)$/i);
  if (headingWithContent) {
    text = headingWithContent[2].trim();
  }
  return text;
}

function compactLines(text, limit = 8) {
  return asText(text)
    .replace(/\r/g, "\n")
    .split(/\n|[•●▪◦]/)
    .map(cleanContextLine)
    .filter((line) => line.length >= 8)
    .slice(0, limit);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeSearchText(value) {
  return asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const CONTEXT_STOP_WORDS = new Set([
  "about",
  "after",
  "base",
  "case",
  "confluence",
  "data",
  "description",
  "display",
  "docs",
  "field",
  "from",
  "jira",
  "link",
  "page",
  "task",
  "technical",
  "test",
  "that",
  "this",
  "tool",
  "user",
  "value",
  "with",
  "bang",
  "cac",
  "cho",
  "cua",
  "duoc",
  "hien",
  "khong",
  "khi",
  "nguoi",
  "nhung",
  "testcase",
  "trong",
  "tren",
  "voi",
]);

function keywordsFrom(value, limit = 32) {
  const seen = new Set();
  const tokens = normalizeSearchText(value).match(/[a-z0-9]{4,}/g) || [];
  const keywords = [];
  for (const token of tokens) {
    if (CONTEXT_STOP_WORDS.has(token) || seen.has(token)) continue;
    seen.add(token);
    keywords.push(token);
    if (keywords.length >= limit) break;
  }
  return keywords;
}

function uniqueLines(lines, limit = 12) {
  const seen = new Set();
  const result = [];
  for (const line of lines.map(asText).filter(Boolean)) {
    const key = normalizeSearchText(line).replace(/\s+/g, " ");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(line);
    if (result.length >= limit) break;
  }
  return result;
}

function selectRelevantDocLines(docContext, anchorText, limit = 5) {
  const lines = uniqueLines(compactLines(docContext, 40), 40);
  if (!lines.length) return [];
  const keywords = keywordsFrom(anchorText, 40);
  if (!keywords.length) return lines.slice(0, Math.min(limit, 3));
  const ranked = lines
    .map((line) => {
      const normalized = normalizeSearchText(line);
      const score = keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0);
      return { line, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.line)
    .slice(0, limit);
  return ranked.length ? ranked : lines.slice(0, Math.min(limit, 4));
}

function sourceContextFrom(issue, sourceInput = {}) {
  const structured = sourceInput && typeof sourceInput === "object" && !Array.isArray(sourceInput);
  const rawNotes = structured ? asText(sourceInput.qaNotes || sourceInput.notes) : asText(sourceInput);
  const rawDoc = structured ? asText(sourceInput.docContext) : "";
  const summary = asText(issue.summary || issue.title);
  const description = asText(issue.description);
  const issueLines = uniqueLines(compactLines(description || summary, 12), 12);
  const qaNoteLines = uniqueLines(compactLines(rawNotes, 4), 4);
  const anchorText = [summary, description, rawNotes].filter(Boolean).join("\n");
  const docLines = selectRelevantDocLines(rawDoc, anchorText, 6);
  const primaryLines = uniqueLines([...issueLines, ...qaNoteLines], 14);
  return {
    summary,
    description,
    issueLines,
    qaNoteLines,
    docLines,
    primaryLines: primaryLines.length ? primaryLines : [summary || "Phạm vi task"],
    docContextApplied: Boolean(docLines.length),
    docContextIgnored: Boolean(rawDoc && !docLines.length),
  };
}

function workflowMode(issue, archetypeKey) {
  const text = normalizeSearchText(`${issue.summary} ${issue.description} ${issue.issue_type}`);
  const isConversation = archetypeKey === "chatbot" || /\b(chatbot|conversation|multi\s*turn|message|tin\s*nhan|agent|handoff|ce)\b/.test(text);
  const isIntegration =
    archetypeKey === "tool_api" ||
    /\b(api|callback|endpoint|payload|webhook|mapping|downstream|bms|vcms|contract)\b/.test(text);
  return {
    isConversation,
    isIntegration,
    unit: isConversation ? "Conversation" : isIntegration ? "Integration" : "Feature",
  };
}

function shortText(value, limit = 96) {
  const text = asText(value).replace(/\s+/g, " ");
  return text.length > limit ? `${text.slice(0, limit - 1).trim()}...` : text;
}

function titleFromIntent(value, fallback = "Kiểm tra behavior chính") {
  let text = asText(value)
    .replace(/^user story\s*[:：-]\s*/i, "")
    .replace(/^acceptance criteria\s*[:：-]\s*/i, "")
    .replace(/^expected\s*[:：-]\s*/i, "")
    .replace(/^rule\s*[:：-]\s*/i, "")
    .replace(/^tạo\s+(một\s+)?/i, "")
    .replace(/^kiểm tra\s+/i, "")
    .replace(/^đảm bảo\s+/i, "")
    .replace(/^hiển thị\s+/i, "Hiển thị ")
    .replace(/\s+/g, " ")
    .trim();
  text = text.replace(/[.:;,\s]+$/g, "");
  if (!text) text = fallback;
  const words = text.split(/\s+/).slice(0, 12).join(" ");
  return shortText(words.charAt(0).toUpperCase() + words.slice(1), 86);
}

function bulletList(items) {
  return items
    .map(asText)
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

function parseIssueReference(input) {
  const text = asText(input);
  const keyMatch = text.match(/\b[A-Z][A-Z0-9]+-\d+\b/i);
  let baseUrl = "";
  try {
    if (/^https?:\/\//i.test(text)) {
      const url = new URL(text);
      baseUrl = `${url.protocol}//${url.host}`;
    }
  } catch {
    baseUrl = "";
  }
  return {
    issueKey: keyMatch ? keyMatch[0].toUpperCase() : "",
    baseUrl,
  };
}

function parseDocumentLinks(input) {
  const text = asText(input);
  const explicitLinks = text.match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
  const lineLinks = text
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => /^https?:\/\//i.test(item));
  return dedupeStrings([...lineLinks, ...explicitLinks].map((item) => item.replace(/[),.;\]]+$/g, "")))
    .filter((item, index, items) => items.indexOf(item) === index);
}

function extractDocumentLinksFromText(input) {
  const matches = asText(input).match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
  return dedupeStrings(matches.map((item) => item.replace(/[),.;\]]+$/g, ""))).filter(isDocumentUrl);
}

function htmlToText(html) {
  return asText(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6]|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function confluenceAuthHeaders(credentials = {}) {
  const headers = { Accept: "application/json, text/html;q=0.8" };
  const user = asText(credentials.user);
  const password = asText(credentials.password);
  const token = asText(credentials.token);
  if (user && (password || token)) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${password || token}`).toString("base64")}`;
  } else if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function confluencePageIdFromUrl(url) {
  const pageId = url.searchParams.get("pageId");
  if (pageId) return pageId;
  const pageMatch = url.pathname.match(/\/pages\/(\d+)(?:\/|$)/);
  if (pageMatch) return pageMatch[1];
  const contentMatch = url.pathname.match(/\/content\/(\d+)(?:\/|$)/);
  if (contentMatch) return contentMatch[1];
  return "";
}

function decodeConfluencePathSegment(value) {
  try {
    return decodeURIComponent(asText(value).replace(/\+/g, "%20"));
  } catch {
    return asText(value).replace(/\+/g, " ");
  }
}

function confluenceDisplayPageFromUrl(url) {
  const match = url.pathname.match(/\/display\/([^/]+)\/([^?#]+)/);
  if (!match) return null;
  return {
    spaceKey: decodeConfluencePathSegment(match[1]),
    title: decodeConfluencePathSegment(match[2]),
  };
}

function confluenceBaseUrlFrom(url, credentials = {}) {
  const configured = asText(credentials.baseUrl);
  if (configured) {
    try {
      const parsed = new URL(configured);
      return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
    } catch {
      return configured.replace(/\/+$/, "");
    }
  }
  if (url.pathname.startsWith("/wiki/")) {
    return `${url.origin}/wiki`;
  }
  for (const marker of ["/spaces/", "/pages/", "/display/", "/plugins/", "/secure/"]) {
    const index = url.pathname.indexOf(marker);
    if (index > 0) {
      return `${url.origin}${url.pathname.slice(0, index)}`.replace(/\/+$/, "");
    }
  }
  return url.origin;
}

async function fetchConfluenceDocument(link, credentials = {}) {
  const url = new URL(link);
  const pageId = confluencePageIdFromUrl(url);
  const headers = confluenceAuthHeaders(credentials);
  const fetchRestContent = async (apiUrl) => {
    const response = await fetch(apiUrl, { headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(payload.message || payload.errorMessage || `Confluence HTTP ${response.status}`), {
        status: response.status,
      });
    }
    const page = Array.isArray(payload.results) ? payload.results[0] : payload;
    if (!page) {
      throw Object.assign(new Error("Không tìm thấy page Confluence từ link đã nhập."), { status: 404 });
    }
    const html = page?.body?.storage?.value || page?.body?.view?.value || "";
    return {
      title: asText(page.title) || link,
      url: link,
      text: htmlToText(html).slice(0, 12000),
    };
  };
  if (pageId) {
    const baseUrl = confluenceBaseUrlFrom(url, credentials);
    const apiUrl = `${baseUrl}/rest/api/content/${encodeURIComponent(pageId)}?expand=body.storage,body.view,title,space`;
    return fetchRestContent(apiUrl);
  }

  const displayPage = confluenceDisplayPageFromUrl(url);
  if (displayPage?.spaceKey && displayPage?.title) {
    const baseUrl = confluenceBaseUrlFrom(url, credentials);
    const params = new URLSearchParams({
      spaceKey: displayPage.spaceKey,
      title: displayPage.title,
      expand: "body.storage,body.view,title,space",
    });
    const apiUrl = `${baseUrl}/rest/api/content?${params.toString()}`;
    return fetchRestContent(apiUrl);
  }

  const response = await fetch(link, { headers: { ...headers, Accept: "text/html,application/json;q=0.8" } });
  const text = await response.text();
  if (!response.ok) {
    throw Object.assign(new Error(`Confluence HTTP ${response.status}`), { status: response.status });
  }
  const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return {
    title: htmlToText(titleMatch?.[1] || link),
    url: link,
    text: htmlToText(text).slice(0, 12000),
  };
}

async function fetchConfluenceDocuments(linksText, credentials = {}) {
  const links = parseDocumentLinks(linksText);
  const documents = [];
  for (const link of links) {
    try {
      if (!/^https?:\/\//i.test(link)) {
        throw Object.assign(new Error("Link doc phải bắt đầu bằng http hoặc https."), { status: 400 });
      }
      documents.push(await fetchConfluenceDocument(link, credentials));
    } catch (error) {
      documents.push({
        title: link,
        url: link,
        text: "",
        error: error instanceof Error ? error.message : "Không đọc được doc.",
      });
    }
  }
  const combinedText = documents
    .filter((item) => item.text)
    .map((item) => `# ${item.title}\nSource: ${item.url}\n${item.text}`)
    .join("\n\n---\n\n")
    .slice(0, 30000);
  return { documents, combinedText };
}

function normalizeProject(raw = {}, fallback = {}) {
  return {
    sourceRoot: asText(raw.sourceRoot) || asText(fallback.sourceRoot) || DEFAULTS.sourceRoot,
    jiraBaseUrl: asText(raw.jiraBaseUrl) || asText(fallback.jiraBaseUrl) || DEFAULTS.jiraBaseUrl,
    projectKey: asText(raw.projectKey) || asText(fallback.projectKey) || DEFAULTS.projectKey,
    folderRoot: asText(raw.folderRoot) || asText(fallback.folderRoot) || DEFAULTS.folderRoot,
    runRoot: asText(raw.runRoot) || asText(fallback.runRoot) || DEFAULTS.runRoot,
    outputDir: asText(raw.outputDir) || asText(fallback.outputDir) || DEFAULTS.outputDir,
    labelMode: asText(raw.labelMode) || "custom",
    testcaseLabels: asText(raw.testcaseLabels) || DEFAULTS.labelPolicy.testcaseLabels,
    testdesignLabels: asText(raw.testdesignLabels) || DEFAULTS.labelPolicy.testdesignLabels,
    testcaseStatusLabels: asText(raw.testcaseStatusLabels) || DEFAULTS.labelPolicy.testcaseStatusLabels,
    testdesignStatusLabels: asText(raw.testdesignStatusLabels) || DEFAULTS.labelPolicy.testdesignStatusLabels,
  };
}

function normalizeIssue(raw = {}, jiraUrl = "") {
  const parsed = parseIssueReference(jiraUrl || raw.url || raw.key || "");
  return {
    key: asText(parsed.issueKey || raw.key || raw.issueKey).toUpperCase(),
    summary: asText(raw.summary),
    title: asText(raw.title),
    description: asText(raw.description),
    status: asText(raw.status),
    issue_type: asText(raw.issue_type || raw.issueType),
    project_key: asText(raw.project_key || raw.projectKey),
    doc_links: Array.isArray(raw.doc_links || raw.docLinks)
      ? dedupeStrings(raw.doc_links || raw.docLinks).filter(isDocumentUrl)
      : [],
    doc_link_sources: Array.isArray(raw.doc_link_sources || raw.docLinkSources) ? raw.doc_link_sources || raw.docLinkSources : [],
  };
}

function credentialEnv(project, credentials = {}) {
  const env = {};
  const baseUrl = asText(project.jiraBaseUrl);
  const user = asText(credentials.user || credentials.jiraUser);
  const password = asText(credentials.password || credentials.jiraPassword);
  const token = asText(credentials.token || credentials.jiraToken);
  if (baseUrl) env.JIRA_BASE_URL = baseUrl;
  if (user) env.JIRA_USER = user;
  if (password) env.JIRA_PASSWORD = password;
  if (token) env.JIRA_TOKEN = token;
  return env;
}

function jiraAuthHeaders(credentials = {}) {
  const headers = { Accept: "application/json" };
  const user = asText(credentials.user || credentials.jiraUser);
  const password = asText(credentials.password || credentials.jiraPassword);
  const token = asText(credentials.token || credentials.jiraToken);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (user && password) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  }
  return headers;
}

function isDocumentUrl(value) {
  const text = asText(value);
  return /^https?:\/\//i.test(text) && /confluence|docs\.|\/display\/|\/wiki\/|\/pages\/|pageId=/i.test(text);
}

function dedupeStrings(items) {
  const seen = new Set();
  const result = [];
  for (const item of items.map(asText).filter(Boolean)) {
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

async function jiraJson(project, credentials, apiPath, params = {}) {
  const baseUrl = asText(project.jiraBaseUrl).replace(/\/+$/, "");
  if (!baseUrl) {
    throw Object.assign(new Error("Thiếu Jira base URL."), { status: 400 });
  }
  const url = new URL(`${baseUrl}${apiPath}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  const response = await fetch(url, { headers: jiraAuthHeaders(credentials) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(payload.errorMessages?.join("\n") || payload.message || `Jira HTTP ${response.status}`), {
      status: response.status,
    });
  }
  return payload;
}

function remoteLinkUrl(item = {}) {
  return asText(item?.object?.url || item?.globalId || item?.url);
}

function remoteLinkTitle(item = {}) {
  return asText(item?.object?.title || item?.relationship || item?.title);
}

async function fetchJiraDocumentLinks(project, credentials, issueKey) {
  const links = [];
  try {
    const remoteLinks = await jiraJson(project, credentials, `/rest/api/2/issue/${encodeURIComponent(issueKey)}/remotelink`);
    if (Array.isArray(remoteLinks)) {
      for (const item of remoteLinks) {
        const url = remoteLinkUrl(item);
        if (isDocumentUrl(url)) {
          links.push({ title: remoteLinkTitle(item) || url, url, source: "jira_remote_link" });
        }
      }
    }
  } catch (error) {
    return {
      links: [],
      error: error instanceof Error ? error.message : "Không đọc được Jira remote links.",
    };
  }
  return { links: dedupeStrings(links.map((item) => item.url)).map((url) => links.find((item) => item.url === url)) };
}

function normalizeCredentials(raw = {}) {
  return {
    user: asText(raw.user || raw.jiraUser),
    password: asText(raw.password || raw.jiraPassword),
    token: asText(raw.token || raw.jiraToken),
  };
}

function normalizeConfluenceCredentials(raw = {}) {
  return {
    baseUrl: asText(raw.baseUrl || raw.confluenceBaseUrl),
    user: asText(raw.user || raw.confluenceUser),
    password: asText(raw.password || raw.confluencePassword),
    token: asText(raw.token || raw.confluenceToken),
  };
}

function normalizeAiSettings(raw = {}) {
  const baseUrl = asText(raw.baseUrl || raw.apiBaseUrl);
  return {
    enabled: raw.enabled === true || asText(raw.enabled).toLowerCase() === "true",
    provider: asText(raw.provider) || "openai-compatible",
    baseUrl: baseUrl || "https://api.openai.com/v1",
    model: asText(raw.model),
    apiKey: asText(raw.apiKey || raw.token),
    writingStyle: asText(raw.writingStyle),
    testCaseGuidelines: asText(raw.testCaseGuidelines),
    testDesignGuidelines: asText(raw.testDesignGuidelines),
    improvementNotes: asText(raw.improvementNotes),
  };
}

function aiCustomizationFromSettings(raw = {}) {
  const settings = normalizeAiSettings(raw);
  if (!settings.enabled) {
    return null;
  }
  const guidance = {
    prompt_mode: "default_skill_prompt_plus_user_ai_settings",
    provider: settings.provider,
    baseUrl: settings.baseUrl,
    model: settings.model,
    writingStyle: settings.writingStyle,
    testCaseGuidelines: settings.testCaseGuidelines,
    testDesignGuidelines: settings.testDesignGuidelines,
    improvementNotes: settings.improvementNotes,
  };
  return Object.fromEntries(Object.entries(guidance).filter(([, value]) => Boolean(value)));
}

function aiGuidanceText(aiCustomization) {
  if (!aiCustomization) {
    return "";
  }
  return [
    aiCustomization.writingStyle ? `Phong cách viết: ${aiCustomization.writingStyle}` : "",
    aiCustomization.testCaseGuidelines ? `Cách viết test case: ${aiCustomization.testCaseGuidelines}` : "",
    aiCustomization.testDesignGuidelines ? `Cách làm test design: ${aiCustomization.testDesignGuidelines}` : "",
    aiCustomization.improvementNotes ? `Improve skill notes: ${aiCustomization.improvementNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function aiProviderReady(settings = {}) {
  return Boolean(settings.enabled && settings.apiKey && settings.model);
}

function truncateForPrompt(value, limit = 12000) {
  const text = asText(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}\n...[truncated ${text.length - limit} chars]`;
}

function readReferenceFile(sourceRoot, relativePath, limit = 8000) {
  try {
    const filePath = path.join(sourceRoot || DEFAULTS.sourceRoot, relativePath);
    return truncateForPrompt(fsSync.readFileSync(filePath, "utf8"), limit);
  } catch {
    return "";
  }
}

function omniSkillReference(sourceRoot) {
  const files = [
    ["create-jira-test-cases/SKILL.md", 9000],
    ["create-xmind-test-design/SKILL.md", 8000],
    ["_shared-test-design/test-design-techniques.md", 5000],
    ["_shared-test-design/task-archetype-matrix.md", 5000],
  ];
  return files
    .map(([relativePath, limit]) => {
      const content = readReferenceFile(sourceRoot, relativePath, limit);
      return content ? `## ${relativePath}\n${content}` : "";
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function localTestCaseStyleExamples() {
  const dirs = [
    process.env.QA_REFERENCE_CASES_DIR,
    "/Users/gumball.bi/Vexere/qa/jira",
    path.join(ROOT_DIR, "qa", "jira"),
  ].filter(Boolean);
  const names = [
    "ai_703_test_cases.json",
    "ai_704_test_cases.json",
    "ai_707_test_cases_v2.json",
    "ai_707_test_cases.json",
  ];
  const sections = [];
  for (const dir of dirs) {
    for (const name of names) {
      const filePath = path.join(dir, name);
      try {
        if (!fsSync.existsSync(filePath)) continue;
        const payload = JSON.parse(fsSync.readFileSync(filePath, "utf8"));
        const cases = Array.isArray(payload) ? payload : Array.isArray(payload.test_cases) ? payload.test_cases : [];
        if (!cases.length) continue;
        sections.push(
          `### ${name}\n` +
            JSON.stringify(
              cases.slice(0, 2).map((item) => ({
                title: stripTestCasePrefix(item.title),
                precondition: item.precondition,
                objective: item.objective,
                priority: item.priority,
                technique: item.technique,
                risk: item.risk,
                requirement_ref: item.requirement_ref,
                coverage_tags: item.coverage_tags,
                steps: item.steps,
                test_data: item.test_data,
                expected_result: item.expected_result,
              })),
              null,
              2,
            ),
        );
        if (sections.length >= 3) return truncateForPrompt(sections.join("\n\n"), 16000);
      } catch {
        continue;
      }
    }
  }
  return "";
}

function jsonForPrompt(value, limit = 14000) {
  return truncateForPrompt(JSON.stringify(value, null, 2), limit);
}

function aiEndpointUrl(settings = {}) {
  const baseUrl = (asText(settings.baseUrl) || "https://api.openai.com/v1").replace(/\/+$/, "");
  if (/\/chat\/completions(?:\?|$)/i.test(baseUrl)) {
    return baseUrl;
  }
  if (settings.provider === "azure-openai") {
    const deployment = encodeURIComponent(settings.model);
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}/openai/deployments/${deployment}/chat/completions${separator}api-version=2024-10-21`;
  }
  return `${baseUrl}/chat/completions`;
}

async function callOpenAiCompatible(settings, messages) {
  const url = aiEndpointUrl(settings);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180000);
  const isAzure = settings.provider === "azure-openai";
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${settings.apiKey}`,
  };
  if (isAzure) {
    headers["api-key"] = settings.apiKey;
  }
  const body = {
    messages,
    temperature: 0.2,
    max_tokens: 9000,
    response_format: { type: "json_object" },
  };
  if (!isAzure) {
    body.model = settings.model;
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.message ||
        text.slice(0, 1200) ||
        `AI provider HTTP ${response.status}`;
      throw Object.assign(new Error(message), { status: response.status });
    }
    const content =
      payload?.choices?.[0]?.message?.content ||
      payload?.choices?.[0]?.text ||
      payload?.output_text ||
      "";
    const parsed = parseMaybeJson(content);
    if (!parsed) {
      throw new Error("AI provider không trả về JSON hợp lệ.");
    }
    return { payload: parsed, usage: payload?.usage || null };
  } finally {
    clearTimeout(timer);
  }
}

function csvList(value) {
  return asText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseStatusLabels(value, fallback = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, label]) => [asText(key).toLowerCase(), asText(label)])
        .filter(([key, label]) => key && label),
    );
  }
  const parsed = {};
  for (const line of asText(value).split(/\r?\n|,/)) {
    const match = line.match(/^\s*([^:=]+)\s*[:=]\s*(.+?)\s*$/);
    if (!match) continue;
    const status = asText(match[1]).toLowerCase();
    const label = asText(match[2]);
    if (status && label) parsed[status] = label;
  }
  return Object.keys(parsed).length ? parsed : fallback;
}

async function makeRunDir(issueKey = "QA") {
  await fs.mkdir(RUNS_DIR, { recursive: true });
  const safeKey = asText(issueKey).replace(/[^A-Z0-9_-]/gi, "_") || "QA";
  const runDir = path.join(RUNS_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}_${safeKey}_${crypto.randomUUID().slice(0, 8)}`);
  await fs.mkdir(runDir, { recursive: true });
  return runDir;
}

async function writeConfig(runDir, project, options = {}) {
  const outputDir = path.isAbsolute(project.outputDir)
    ? project.outputDir
    : path.resolve(ROOT_DIR, project.outputDir);
  const payload = {
    source_root: project.sourceRoot,
    jira: {
      base_url: project.jiraBaseUrl,
    },
    jira_test_cases: {
      project_key: project.projectKey,
      folder_root: project.folderRoot,
      run_root: project.runRoot,
      label_policy: {
        mode: project.labelMode,
        always_labels: csvList(project.testcaseLabels),
        status_labels: parseStatusLabels(project.testcaseStatusLabels, STATUS_LABELS.testCases),
      },
    },
    xmind_test_design: {
      output_dir: outputDir,
      default_template: "auto",
      attach_all: Boolean(options.attachAll),
      replace_existing: Boolean(options.replaceExisting),
      label_policy: {
        mode: project.labelMode,
        always_labels: csvList(project.testdesignLabels),
        status_labels: parseStatusLabels(project.testdesignStatusLabels, STATUS_LABELS.testDesign),
      },
    },
  };
  const configPath = path.join(runDir, "qa-automation.json");
  await fs.writeFile(configPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return configPath;
}

function parseMaybeJson(text) {
  const trimmed = asText(text);
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const firstBracket = trimmed.indexOf("[");
    const startCandidates = [firstBrace, firstBracket].filter((index) => index >= 0);
    if (!startCandidates.length) return null;
    const start = Math.min(...startCandidates);
    try {
      return JSON.parse(trimmed.slice(start));
    } catch {
      return null;
    }
  }
}

function runPython(script, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [script, ...args], {
      cwd: ROOT_DIR,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Command timed out: python3 ${path.basename(script)} ${args.join(" ")}`));
    }, options.timeoutMs || 300000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const json = parseMaybeJson(stdout);
      if (code !== 0) {
        const error = new Error(stderr || stdout || `Python command exited with ${code}`);
        error.status = 500;
        error.details = { code, stdout, stderr };
        reject(error);
        return;
      }
      resolve({ code, stdout, stderr, json });
    });
  });
}

function chooseArchetype(issue, forced) {
  if (forced && ARCHETYPES[forced]) return forced;
  const haystack = `${issue.summary} ${issue.description} ${issue.issue_type}`.toLowerCase();
  let best = "general";
  let bestScore = 0;
  for (const [key, archetype] of Object.entries(ARCHETYPES)) {
    let score = archetype.keywords.reduce((total, keyword) => {
      return total + (haystack.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
    if (key === "tool_api") {
      const hasStrongIntegrationTerm = /\b(api|callback|endpoint|payload|webhook|mapping|bms|vcms|downstream|contract)\b/i.test(haystack);
      if (!hasStrongIntegrationTerm && score < 2) {
        score = 0;
      }
    }
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}

function expectation(...items) {
  return items
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

function step(description, testData, expectedResult) {
  return {
    description: asText(description),
    test_data: asText(testData),
    expected_result: asText(expectedResult),
  };
}

function structuredStepsFromDescriptions(descriptions, testData, expectedResult) {
  const normalized = arrayFromMaybe(descriptions).map(asText).filter(Boolean);
  if (!normalized.length) return [];
  return normalized.map((description, index) =>
    step(
      description,
      index === 0 ? testData : "",
      index === normalized.length - 1 ? ensureExpectedBullets(expectedResult) : "",
    ),
  );
}

function aggregateStepField(steps, field) {
  if (!Array.isArray(steps)) return "";
  return steps
    .map((item) => asText(item?.[field]))
    .filter(Boolean)
    .join("\n");
}

function looksLikeMultilineBullets(value) {
  return /(^|\n)\s*[-*•]\s+\S/.test(asText(value));
}

function ensureExpectedBullets(value) {
  const text = asText(value);
  if (!text) return "";
  if (looksLikeMultilineBullets(text)) return text;
  return text
    .split(/\r?\n|;+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `- ${item.replace(/^[-*•]\s*/, "")}`)
    .join("\n");
}

function numberedQuotedLines(items) {
  return items
    .map(asText)
    .filter(Boolean)
    .map((item, index) => `${index + 1}. "${item.replace(/^"+|"+$/g, "").replace(/"/g, '\\"')}"`)
    .join("\n");
}

function buildCases(issue, archetypeKey, sourceInput = {}, aiCustomization = null) {
  const archetype = ARCHETYPES[archetypeKey] || ARCHETYPES.general;
  const key = issue.key || "JIRA-TASK";
  const context = sourceContextFrom(issue, sourceInput);
  const summary = context.summary || issue.title || "Phạm vi task";
  const mode = workflowMode(issue, archetypeKey);
  const guidanceLines = compactLines(aiGuidanceText(aiCustomization), 4);
  const coverageLines = uniqueLines([...context.primaryLines, ...guidanceLines], 16);
  const pick = (index, fallback) => coverageLines[index % Math.max(coverageLines.length, 1)] || fallback;
  const targetCount = clampNumber(
    4 +
      Math.min(context.issueLines.length || 1, 10) +
      Math.min(context.qaNoteLines.length, 2) +
      Math.min(context.docLines.length, 5) +
      (mode.isConversation || mode.isIntegration || archetypeKey === "workflow" ? 2 : 0) +
      (context.description.length > 1800 ? 2 : 0),
    6,
    22,
  );
  const precondition = [
    `Task ${key} đã được fetch đúng Jira summary, description và status mới nhất.`,
    "QA có môi trường test và dữ liệu test phù hợp với scope trong Jira.",
    context.docContextApplied
      ? "Doc Confluence được dùng như tài liệu tham chiếu bổ sung, không thay thế acceptance criteria trong Jira."
      : "Không dùng Confluence doc nếu task hiện tại không nhập Base URL/doc link hoặc doc không liên quan tới Jira description.",
  ].join("\n");

  const quoteLines = (items) => numberedQuotedLines(items);
  const testInputsFor = (intent) => {
    if (mode.isConversation) {
      return [
        `User hỏi/tương tác theo scenario: ${titleFromIntent(intent)}`,
        "User bổ sung thông tin còn thiếu nếu bot hỏi lại.",
      ];
    }
    if (mode.isIntegration) {
      return [
        `Payload/request có dữ liệu đại diện cho: ${titleFromIntent(intent)}`,
        "Mock/downstream response đúng với scope task.",
      ];
    }
    return [
      `Môi trường test có build chứa task ${key}.`,
      `Dữ liệu test đại diện cho scenario: ${titleFromIntent(intent)}`,
    ];
  };
  const testDataFor = (item) => {
    if (mode.isConversation) return quoteLines(item.inputs);
    return bulletList(item.inputs);
  };
  const setupDataFor = (item) =>
    mode.isConversation
      ? bulletList([`Conversation/state: ${titleFromIntent(item.objective || item.title)}`, `Task Jira: ${key}`])
      : bulletList(item.inputs);
  const defaultStepsFor = (item) => {
    const scenario = titleFromIntent(item.title || item.objective);
    const scope = shortText(summary, 90);
    if (mode.isConversation) {
      return [
        "Mở conversation mới hoặc conversation có state đúng với precondition của testcase.",
        "Gửi lần lượt từng message user trong bộ dữ liệu kiểm tra.",
        `Quan sát phản hồi, tool call hoặc handoff cho scenario: ${scenario}.`,
        "Kiểm tra context mới nhất, nguồn dữ liệu và side effect sau lượt hội thoại.",
      ];
    }
    if (mode.isIntegration) {
      return [
        "Chuẩn bị payload/request và dependency đúng với precondition của testcase.",
        `Gửi request/callback/event cho scenario: ${scenario}.`,
        "Kiểm tra response, mapping field và trạng thái được ghi nhận sau xử lý.",
        "Retry hoặc đối chiếu log/dữ liệu downstream để bảo đảm không phát sinh duplicate hoặc side effect ngoài scope.",
      ];
    }
    if (archetypeKey === "reporting") {
      return [
        `Mở môi trường test và đi tới khu vực báo cáo/màn hình liên quan đến "${scope}".`,
        `Chuẩn bị hoặc chọn dataset đúng biến thể: ${scenario}.`,
        "Quan sát dữ liệu hiển thị sau khi màn hình/card tải xong.",
        "Đối chiếu thứ tự, giá trị hiển thị và mapping dòng với nguồn dữ liệu chuẩn.",
      ];
    }
    return [
      `Mở chức năng liên quan đến task ${key} và xác nhận precondition đã sẵn sàng.`,
      `Thực hiện scenario: ${scenario}.`,
      "Quan sát kết quả chính sau thao tác.",
      "Đối chiếu regression, side effect và phạm vi không bị mở rộng ngoài Jira task.",
    ];
  };
  const makeStructuredSteps = (item) => {
    const descriptions = item.steps?.length ? item.steps : defaultStepsFor(item);
    const stepTestData = testDataFor(item) || setupDataFor(item);
    return structuredStepsFromDescriptions(descriptions, stepTestData, expectation(...item.checks));
  };

  const candidates = [];
  const addCandidate = (item) => {
    candidates.push({
      priority: "Normal",
      technique: archetype.primary[0],
      tags: [],
      scenario: "coverage",
      ...item,
    });
  };

  context.primaryLines.slice(0, 10).forEach((line, index) => {
    const isMain = index === 0;
    addCandidate({
      title: titleFromIntent(line, isMain ? "Luồng chính đúng scope Jira" : "Yêu cầu Jira được đáp ứng"),
      objective: `Xác nhận requirement trong Jira: ${line}`,
      priority: isMain ? "High" : index <= 3 ? "High" : "Normal",
      technique: isMain ? archetype.primary[0] : archetype.primary[index % archetype.primary.length] || "Use-case / scenario flow",
      risk: "Nếu requirement này bị hiểu sai, draft test case sẽ pass nhưng task vẫn không đạt acceptance intent.",
      tags: [isMain ? "happy_path" : "jira_requirement", "jira_description"],
      scenario: isMain ? "happy_path" : "requirement_coverage",
      inputs: testInputsFor(line),
      action: `Thực hiện scenario: ${titleFromIntent(line)}.`,
      stepData: bulletList([`Requirement Jira: ${line}`]),
      checks: [
        "Kết quả thực tế khớp đúng intent trong Jira description/AC.",
        "Không lấy rule từ tài liệu khác nếu Jira task không yêu cầu.",
        "Không phát sinh side effect ngoài phạm vi task này.",
      ],
    });
  });

  context.docLines.slice(0, 6).forEach((line, index) => {
    addCandidate({
      title: `${titleFromIntent(line, "Rule trong doc được áp dụng đúng")} theo doc`,
      objective: `Đối chiếu doc liên quan với Jira scope, chỉ áp dụng phần có keyword khớp task: ${line}`,
      priority: index <= 1 ? "High" : "Normal",
      technique: "Reference doc validation",
      risk: "Doc hỗ trợ bị bỏ qua hoặc áp dụng sai phần không thuộc scope task.",
      tags: ["confluence_reference", "doc_grounding"],
      scenario: "reference_doc",
      inputs: testInputsFor(line),
      action: `Thực hiện scenario theo rule trong doc: ${titleFromIntent(line)}.`,
      stepData: bulletList([`Rule từ doc: ${line}`, "Đối chiếu với Jira description để chỉ giữ phần đúng scope."]),
      checks: [
        "Chỉ rule trong doc có liên quan tới Jira description được áp dụng.",
        "Nếu Jira và doc lệch nhau, Jira description/AC được ưu tiên.",
        "Output không kéo thêm tool/flow ngoài phạm vi task hiện tại.",
      ],
    });
  });

  const guardrails = [
    {
      title: "Thiếu dữ liệu bắt buộc",
      technique: archetype.supporting[0] || "Boundary value analysis",
      tag: "missing_data",
      applies: true,
      check: "Thiếu required data/null/empty được xử lý rõ ràng, không tạo trạng thái hoặc kết quả sai.",
    },
    {
      title: "Input ngoài scope task",
      technique: "Negative path / out-of-scope",
      tag: "out_of_scope",
      applies: true,
      check: "Request ngoài mô tả Jira task không được tự mở rộng sang doc/tool khác.",
    },
    {
      title: "Không reuse context cũ",
      technique: "State transition",
      tag: "state_transition",
      applies: mode.isConversation || archetypeKey === "workflow",
      check: "Context mới nhất được ưu tiên, không reuse dữ liệu hoặc doc của task/turn trước.",
    },
    {
      title: "Mapping request/response đúng",
      technique: "Integration contract / field mapping",
      tag: "mapping",
      applies: mode.isIntegration || mode.isConversation,
      check: "Payload, field hiển thị và response mapping đúng source of truth của task.",
    },
    {
      title: "Fallback khi dependency lỗi",
      technique: "Fallback / partial failure / recovery",
      tag: "fallback",
      applies: mode.isIntegration || mode.isConversation || archetypeKey === "workflow",
      check: "Timeout/empty/error response được xử lý fail-safe và có thông báo phù hợp.",
    },
    {
      title: "Không duplicate khi retry",
      technique: "Retry / idempotency / duplicate event",
      tag: "retry",
      applies: mode.isIntegration || archetypeKey === "workflow",
      check: "Retry không tạo kết quả/trạng thái trùng hoặc ghi nhận sai.",
    },
    {
      title: "Dữ liệu đúng sau reload",
      technique: "Regression",
      tag: "ui_regression",
      applies: archetypeKey === "reporting" || /\b(hiển thị|highlight|display|screen|ui|message)\b/i.test(`${issue.summary} ${issue.description}`),
      check: "Dữ liệu vẫn đúng sau reload/refresh và không bị mất binding.",
    },
    {
      title: "Regression luồng cũ liên quan",
      technique: "Risk-based regression",
      tag: "regression",
      applies: true,
      check: "Luồng cũ cùng module vẫn giữ behavior trước khi task được triển khai.",
    },
  ];

  guardrails
    .filter((item) => item.applies)
    .forEach((item, index) => {
      const reference = pick(index, item.check);
      addCandidate({
        title: item.title,
        objective: `Bao phủ rủi ro: ${item.check}`,
        priority: index <= 1 ? "High" : "Normal",
        technique: item.technique,
        risk: item.check,
        tags: [item.tag, "risk_based"],
        scenario: item.tag,
        inputs: testInputsFor(reference),
        action: `Thực hiện biến thể: ${item.title}.`,
        stepData: bulletList([`Dữ liệu/điều kiện biến thể: ${reference}`]),
        checks: [item.check, "Kết quả vẫn bám Jira description/AC.", "Không phát sinh side effect ngoài scope."],
      });
    });

  const docCandidates = candidates.filter((item) => item.tags?.includes("confluence_reference"));
  const nonDocCandidates = candidates.filter((item) => !item.tags?.includes("confluence_reference"));
  const docQuota = context.docContextApplied ? Math.min(docCandidates.length, Math.max(2, Math.ceil(targetCount * 0.25))) : 0;
  const coreCandidates = nonDocCandidates.slice(0, Math.max(0, targetCount - docQuota));
  const selected = [
    ...coreCandidates.slice(0, Math.min(3, coreCandidates.length)),
    ...docCandidates.slice(0, docQuota),
    ...coreCandidates.slice(Math.min(3, coreCandidates.length)),
  ];
  for (const candidate of nonDocCandidates.slice(Math.max(0, targetCount - docQuota))) {
    if (selected.length >= targetCount) break;
    selected.push(candidate);
  }
  return selected.map((item, index) => {
    const steps = makeStructuredSteps(item);
    const testData = testDataFor(item);
    const expectedResult = steps
      .flatMap((itemStep) => itemStep.expected_result.split("\n"))
      .filter(Boolean)
      .join("\n");
    return {
      title: `[TC_${String(index + 1).padStart(4, "0")}] ${item.title}`,
      objective: item.objective,
      priority: item.priority,
      technique: item.technique,
      risk: item.risk,
      requirement_ref: key,
      coverage_tags: item.tags,
      scenario_type: item.scenario,
      precondition,
      test_data: testData,
      expected_result: expectedResult,
      steps: steps.map((itemStep) => itemStep.description),
      structured_steps: steps,
    };
  });
}

function buildOutline(issue, archetypeKey, cases = [], sourceInput = {}, aiCustomization = null) {
  const archetype = ARCHETYPES[archetypeKey] || ARCHETYPES.general;
  const title = issue.title || `[${issue.key || "JIRA-TASK"}] ${issue.summary || "Test design"}`;
  const context = sourceContextFrom(issue, sourceInput);
  const scopeLines = context.primaryLines.slice(0, 8);
  const docLines = context.docLines.slice(0, 4);
  const caseTitles = Array.isArray(cases)
    ? cases
        .map((testCase) => asText(testCase.title).replace(/^\[TC[_-]\d{4}\]\s*/, ""))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  const branchItems = [
    [
      `Xác nhận business rule chính: ${scopeLines[0] || issue.summary || "đúng scope Jira"}`,
      `Bao phủ luồng thành công cho ${issue.key || "task"}`,
      "Kết quả cuối cùng khớp mô tả và acceptance intent trong Jira",
    ],
    [
      `Kiểm tra ${scopeLines[1] || archetype.dimensions[0]}`,
      `Kiểm tra ${scopeLines[2] || archetype.dimensions[1]}`,
      `Kiểm tra ${scopeLines[3] || archetype.dimensions[2] || "các biến thể dữ liệu quan trọng"}`,
    ],
    [
      `Không xử lý sai khi ${scopeLines[4] || archetype.dimensions[3] || "dữ liệu không đầy đủ"}`,
      `Không mất context khi chuyển state hoặc reload`,
      `Không tạo side effect ngoài scope của ${issue.key || "task"}`,
    ],
    [
      `Regression từ case: ${caseTitles[0] || "luồng cũ cùng module"}`,
      docLines[0] ? `Đối chiếu doc liên quan: ${shortText(docLines[0], 120)}` : "Retry/duplicate vẫn nhất quán với rule mới",
      docLines[1] ? `Không áp dụng nhầm doc ngoài scope: ${shortText(docLines[1], 120)}` : "Fallback rõ ràng khi dependency lỗi, timeout hoặc trả rỗng",
    ],
    [
      "Không kiểm thử thay đổi ngoài mô tả Jira task này",
      context.docContextIgnored ? "Không dùng Confluence doc không có keyword liên quan tới Jira description" : "Không để tài liệu tham chiếu lấn át Jira description/AC",
      "Không xác nhận performance/load test nếu Jira không yêu cầu",
    ],
  ];

  return {
    issue_key: issue.key || "",
    title,
    sheet_title: "Brace Map",
    template: archetypeKey,
    source_context: {
      summary: issue.summary,
      status: issue.status,
      issue_type: issue.issue_type,
      description_excerpt: asText(issue.description).slice(0, 1600),
      jira_scope_lines: scopeLines,
      confluence_doc_lines_used: docLines,
      confluence_doc_ignored_as_unrelated: context.docContextIgnored,
      ai_customization_applied: Boolean(aiCustomization),
      ai_customization_guidance: aiGuidanceText(aiCustomization) || undefined,
      ai_customization: aiCustomization || undefined,
    },
    design_rationale: {
      archetype: archetype.label,
      primary_techniques: archetype.primary,
      supporting_techniques: archetype.supporting,
      must_cover_dimensions: archetype.dimensions,
    },
    branches: archetype.branches.map((branchTitle, index) => ({
      title: branchTitle,
      items: branchItems[index],
    })),
  };
}

function arrayFromMaybe(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function textFromMaybeList(value, bullet = false) {
  if (Array.isArray(value)) {
    return value
      .map(asText)
      .filter(Boolean)
      .map((item) => (bullet && !/^[-*•]/.test(item) ? `- ${item}` : item))
      .join("\n");
  }
  return asText(value).replace(/<br\s*\/?>/gi, "\n");
}

function genericCaseTitle(value) {
  const normalized = normalizeSearchText(value).replace(/[^a-z0-9\s]+/g, "").trim();
  return [
    "muc tieu",
    "objective",
    "requirement",
    "description",
    "acceptance criteria",
    "conversation bao phu yeu cau",
    "yeu cau jira duoc dap ung",
  ].includes(normalized);
}

function normalizeAiSteps(rawCase, fallbackCase) {
  const rawStructured = Array.isArray(rawCase.structured_steps) ? rawCase.structured_steps : [];
  const structured = rawStructured
    .map((item) => {
      if (typeof item === "string") {
        return step(item, "", "");
      }
      return step(
        item?.description || item?.step || item?.action,
        item?.test_data || item?.testData,
        ensureExpectedBullets(item?.expected_result || item?.expectedResult),
      );
    })
    .filter((item) => item.description);
  if (structured.length) return structured;

  const rawSteps = arrayFromMaybe(rawCase.steps || rawCase.step);
  if (rawSteps.length) {
    return rawSteps.map((item) => {
      if (typeof item === "string") return step(item, "", "");
      return step(
        item?.description || item?.step || item?.action,
        item?.test_data || item?.testData,
        ensureExpectedBullets(item?.expected_result || item?.expectedResult),
      );
    }).filter((item) => item.description);
  }

  if (Array.isArray(fallbackCase?.structured_steps) && fallbackCase.structured_steps.length) {
    return fallbackCase.structured_steps;
  }
  return [step("Thực hiện scenario theo title test case.", "", "")];
}

function normalizeAiCase(rawCase = {}, index, issue, fallbackCase = {}) {
  const rawTitle = stripTestCasePrefix(rawCase.title || rawCase.name || fallbackCase.title || "");
  const fallbackTitle = stripTestCasePrefix(fallbackCase.title || `Kiểm tra behavior chính của ${issue.key || "task"}`);
  const cleanTitle = genericCaseTitle(rawTitle) ? fallbackTitle : titleFromIntent(rawTitle, fallbackTitle);
  let structuredSteps = normalizeAiSteps(rawCase, fallbackCase);
  const fallbackSteps = Array.isArray(fallbackCase.structured_steps) ? fallbackCase.structured_steps : [];
  const stepExpectedResult = aggregateStepField(structuredSteps, "expected_result") || aggregateStepField(fallbackSteps, "expected_result");
  const stepTestData = aggregateStepField(structuredSteps, "test_data") || aggregateStepField(fallbackSteps, "test_data");
  const expectedResult =
    ensureExpectedBullets(
      textFromMaybeList(rawCase.expected_result || rawCase.expectedResult || rawCase.expected || stepExpectedResult || fallbackCase.expected_result, true),
    ) ||
    expectation("Kết quả thực tế khớp đúng Jira description/acceptance criteria.");
  const testData =
    textFromMaybeList(rawCase.test_data || rawCase.testData || rawCase.data || stepTestData || fallbackCase.test_data) ||
    `Dữ liệu kiểm tra:\n1. "Dữ liệu đại diện cho ${cleanTitle}"`;
  if (structuredSteps.length && !structuredSteps.some((item) => item.test_data || item.expected_result)) {
    structuredSteps = structuredStepsFromDescriptions(
      structuredSteps.map((item) => item.description),
      testData,
      expectedResult,
    );
  }
  return {
    title: `[TC_${String(index + 1).padStart(4, "0")}] ${cleanTitle}`,
    objective: asText(rawCase.objective || fallbackCase.objective || `Xác nhận scenario: ${cleanTitle}`),
    priority: asText(rawCase.priority || fallbackCase.priority || "Normal"),
    technique: asText(rawCase.technique || fallbackCase.technique || "Use-case / scenario flow"),
    risk: asText(rawCase.risk || fallbackCase.risk || "Thiếu coverage cho scenario này có thể làm task pass thiếu."),
    requirement_ref: asText(rawCase.requirement_ref || rawCase.requirementRef || fallbackCase.requirement_ref || issue.key),
    coverage_tags: arrayFromMaybe(rawCase.coverage_tags || rawCase.coverageTags || fallbackCase.coverage_tags).map(asText).filter(Boolean),
    scenario_type: asText(rawCase.scenario_type || rawCase.scenarioType || fallbackCase.scenario_type || "coverage"),
    precondition: asText(rawCase.precondition || fallbackCase.precondition || `Task ${issue.key || ""} đã được triển khai trên môi trường test.`),
    test_data: testData,
    expected_result: expectedResult,
    steps: structuredSteps.map((item) => item.description),
    structured_steps: structuredSteps,
  };
}

function normalizeAiOutline(rawOutline = {}, issue, archetypeKey, fallbackOutline = {}) {
  const rawBranches = Array.isArray(rawOutline.branches) ? rawOutline.branches : [];
  const branches = rawBranches
    .map((branch) => {
      if (typeof branch === "string") {
        return { title: titleFromIntent(branch, "Coverage branch"), items: [] };
      }
      return {
        title: titleFromIntent(branch?.title || branch?.name, "Coverage branch"),
        items: arrayFromMaybe(branch?.items || branch?.bullets || branch?.children).map(asText).filter(Boolean).slice(0, 6),
      };
    })
    .filter((branch) => branch.title && branch.items.length)
    .slice(0, 5);

  const normalizedBranches = branches.length >= 3 ? [...branches] : [...(fallbackOutline.branches || [])];
  if (!normalizedBranches.some((branch) => normalizeSearchText(branch.title).includes("out of scope"))) {
    normalizedBranches.push({
      title: "Out of scope",
      items: [
        "Không kiểm thử thay đổi ngoài mô tả Jira task này.",
        "Không để tài liệu tham chiếu lấn át Jira description/acceptance criteria.",
      ],
    });
  }
  return {
    issue_key: asText(rawOutline.issue_key || rawOutline.issueKey || issue.key),
    title: asText(rawOutline.title || fallbackOutline.title || issue.title || `[${issue.key}] ${issue.summary}`),
    sheet_title: asText(rawOutline.sheet_title || rawOutline.sheetTitle || fallbackOutline.sheet_title || "Brace Map"),
    template: asText(rawOutline.template || fallbackOutline.template || archetypeKey),
    source_context: rawOutline.source_context || fallbackOutline.source_context || {},
    design_rationale: rawOutline.design_rationale || rawOutline.designRationale || fallbackOutline.design_rationale || {},
    branches: normalizedBranches.slice(0, 5),
  };
}

function normalizeAiDraft(payload, issue, archetypeKey, fallbackCases, fallbackOutline) {
  const rawCases = Array.isArray(payload?.test_cases)
    ? payload.test_cases
    : Array.isArray(payload?.testCases)
      ? payload.testCases
      : [];
  if (!rawCases.length) {
    throw new Error("AI provider trả về JSON nhưng thiếu `test_cases`.");
  }
  const testCases = rawCases.slice(0, 32).map((rawCase, index) => normalizeAiCase(rawCase, index, issue, fallbackCases[index]));
  const outline = normalizeAiOutline(payload.outline || payload.test_design || payload.testDesign || {}, issue, archetypeKey, fallbackOutline);
  return { testCases, outline };
}

function buildAiDraftMessages({
  issue,
  archetypeKey,
  archetype,
  sourceInput,
  aiCustomization,
  fallbackCases,
  fallbackOutline,
  sourceRoot,
}) {
  const system = [
    "You are EasyForQC, a senior QC/QA test design assistant.",
    "Generate reusable Jira Zephyr test cases and a compact XMind test-design outline.",
    "Follow the OmniAgent QA skill standards from the provided references.",
    "Return strict JSON only. No markdown, no prose outside JSON.",
  ].join("\n");

  const user = [
    "## Source priority",
    "1. Jira summary and description are the primary source of scope.",
    "2. Confluence/doc context is supporting evidence only. Use it only when it clearly relates to the Jira task.",
    "3. QA notes and AI Settings refine style/coverage; they must not override explicit Jira scope.",
    "",
    "## Output rules",
    "- Do not create a fixed number of cases. Create as many as needed to cover the task well.",
    "- Each testcase title must be concise, scenario-specific, and immediately explain what the case covers.",
    "- Never use generic titles such as `Mục tiêu`, `Description`, `Conversation bao phủ yêu cầu`, or `Yêu cầu Jira được đáp ứng`.",
    "- Use QC techniques deliberately: decision table, state transition, equivalence partitioning, boundary/null handling, regression, fallback/recovery, retry/idempotency, field mapping when relevant.",
    "- Match the style of the existing OmniAgent QA suites such as `ai_703_test_cases.json` and `ai_707_test_cases_v2.json`: one testcase = one focused scenario, strong title, concrete precondition, realistic data, and 3-4 tester action steps.",
    "- Do not copy the AI-703/AI-707 content unless the current Jira task is actually about that behavior. Use those suites only as writing/structure examples.",
    "- `test_data` must contain realistic test data. For chatbot/conversation flows, use numbered quoted user messages: `1. \"...\"`.",
    "- `expected_result` must be multiline bullet points beginning with `- `.",
    "- `steps` must be an array of clear tester actions like the sample suites. Each item is one Zephyr Test Player row, not a paragraph.",
    "- Use `structured_steps` only when a row needs its own test data or expected result; otherwise `steps` plus case-level `test_data`/`expected_result` is preferred.",
    "- Test design must have 4-5 branches and one branch named `Out of scope`.",
    "",
    "## Required JSON schema",
    JSON.stringify(
      {
        test_cases: [
          {
            title: "Scenario-specific title without TC prefix",
            precondition: "Precondition text",
            objective: "Objective text",
            priority: "High | Normal | Low",
            technique: "Decision table",
            risk: "Risk covered by this case",
            requirement_ref: issue.key || "Jira issue / doc source",
            coverage_tags: ["short-tag"],
            scenario_type: "happy_path | negative | regression | boundary | fallback | mapping | state_transition",
            steps: ["One clear tester action", "Another concrete verification action"],
            test_data: "Dữ liệu kiểm tra:\\n1. \"...\"",
            expected_result: "- Expected 1\\n- Expected 2",
          },
        ],
        outline: {
          issue_key: issue.key,
          title: `[${issue.key}] ${issue.summary}`,
          sheet_title: "Brace Map",
          template: archetypeKey,
          source_context: {},
          design_rationale: {
            archetype: archetype.label,
            primary_techniques: archetype.primary,
            supporting_techniques: archetype.supporting,
            assumptions: [],
            open_questions: [],
          },
          branches: [{ title: "Branch title", items: ["Concrete bullet"] }],
        },
      },
      null,
      2,
    ),
    "",
    "## OmniAgent skill references",
    truncateForPrompt(omniSkillReference(sourceRoot), 22000),
    "",
    "## Local reference testcase style examples",
    truncateForPrompt(localTestCaseStyleExamples(), 16000),
    "",
    "## Jira issue",
    jsonForPrompt(issue, 18000),
    "",
    "## Selected archetype",
    jsonForPrompt({ key: archetypeKey, ...archetype }, 4000),
    "",
    "## QA notes",
    truncateForPrompt(sourceInput.qaNotes || "", 4000),
    "",
    "## Confluence/doc context for this task only",
    truncateForPrompt(sourceInput.docContext || "", 26000),
    "",
    "## User AI Settings guidance",
    truncateForPrompt(aiGuidanceText(aiCustomization), 6000),
    "",
    "## Local fallback draft for structure reference only",
    jsonForPrompt({ test_cases: fallbackCases.slice(0, 8), outline: fallbackOutline }, 18000),
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

async function generateAiDraft({ issue, archetypeKey, sourceInput, aiSettings, aiCustomization, fallbackCases, fallbackOutline, project }) {
  const archetype = ARCHETYPES[archetypeKey] || ARCHETYPES.general;
  const messages = buildAiDraftMessages({
    issue,
    archetypeKey,
    archetype,
    sourceInput,
    aiCustomization,
    fallbackCases,
    fallbackOutline,
    sourceRoot: project.sourceRoot,
  });
  const result = await callOpenAiCompatible(aiSettings, messages);
  return {
    ...normalizeAiDraft(result.payload, issue, archetypeKey, fallbackCases, fallbackOutline),
    usage: result.usage,
  };
}

function normalizeCasesForFile(cases) {
  if (!Array.isArray(cases) || cases.length === 0) {
    throw Object.assign(new Error("Cần ít nhất một test case."), { status: 400 });
  }
  return cases;
}

function safeFileStem(value) {
  return asText(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "jira_task";
}

function stripTestCasePrefix(title) {
  return asText(title).replace(/^\[TC[_-]\d{4}\]\s*/, "");
}

function savedTestCasesPayload(issue, outline, cases, archetypeKey) {
  const sourceContext = outline?.source_context || {};
  const designRationale = outline?.design_rationale || {};
  return {
    issue_key: issue.key,
    design_profile: {
      archetype: outline?.template || archetypeKey || "general",
      primary_techniques: designRationale.primary_techniques || [],
      supporting_techniques: designRationale.supporting_techniques || [],
      assumptions: [
        "Jira summary và description là source chính của scope.",
        sourceContext.confluence_doc_lines_used?.length
          ? "Confluence/doc links được dùng để bổ sung scenario, guardrail và rule chi tiết."
          : "Không có doc bổ sung được áp dụng cho draft này.",
      ],
      open_questions: sourceContext.confluence_doc_ignored_as_unrelated
        ? ["Doc được cung cấp không có keyword liên quan rõ với Jira description, cần QA xác nhận trước khi áp dụng."]
        : [],
    },
    test_cases: cases.map((testCase) => ({
      title: stripTestCasePrefix(testCase.title),
      precondition: asText(testCase.precondition),
      objective: asText(testCase.objective),
      priority: asText(testCase.priority) || "Normal",
      technique: asText(testCase.technique),
      risk: asText(testCase.risk),
      requirement_ref: asText(testCase.requirement_ref || issue.key),
      coverage_tags: Array.isArray(testCase.coverage_tags) ? testCase.coverage_tags.map(asText).filter(Boolean) : [],
      steps:
        Array.isArray(testCase.structured_steps) && testCase.structured_steps.length
          ? testCase.structured_steps.map((item) => asText(item.description)).filter(Boolean)
          : Array.isArray(testCase.steps)
            ? testCase.steps.map(asText).filter(Boolean)
            : [],
      test_data: asText(testCase.test_data),
      expected_result: asText(testCase.expected_result),
    })),
  };
}

function caseKeysFromResult(payload) {
  const created = Array.isArray(payload?.created) ? payload.created : [];
  return created.map((item) => asText(item.key)).filter(Boolean);
}

function sendError(res, error) {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message || "Unexpected error",
    details: error.details || null,
  });
}

app.get("/api/defaults", async (_req, res) => {
  const exists = async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  };
  res.json({
    defaults: DEFAULTS,
    archetypes: Object.fromEntries(
      Object.entries(ARCHETYPES).map(([key, value]) => [
        key,
        {
          label: value.label,
          primary: value.primary,
          supporting: value.supporting,
          dimensions: value.dimensions,
        },
      ]),
    ),
    wrappers: {
      jira: JIRA_WRAPPER,
      xmind: XMIND_WRAPPER,
      jiraExists: await exists(JIRA_WRAPPER),
      xmindExists: await exists(XMIND_WRAPPER),
      sourceRootExists: await exists(DEFAULTS.sourceRoot),
    },
  });
});

app.post("/api/parse-jira", (req, res) => {
  res.json(parseIssueReference(req.body?.jiraUrl || req.body?.value || ""));
});

app.post("/api/confluence-docs", async (req, res) => {
  try {
    const confluenceCredentials = normalizeConfluenceCredentials(req.body?.confluenceCredentials);
    const result = await fetchConfluenceDocuments(req.body?.links, confluenceCredentials);
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/issue", async (req, res) => {
  try {
    const parsed = parseIssueReference(req.body?.jiraUrl || "");
    const project = normalizeProject(req.body?.project, { jiraBaseUrl: parsed.baseUrl });
    const issue = normalizeIssue({ key: req.body?.issueKey || parsed.issueKey }, req.body?.jiraUrl);
    if (!issue.key) {
      throw Object.assign(new Error("Không tìm thấy issue key trong link Jira."), { status: 400 });
    }
    const runDir = await makeRunDir(issue.key);
    const configPath = await writeConfig(runDir, project, { attachAll: false });
    const result = await runPython(
      XMIND_WRAPPER,
      ["--config-file", configPath, "issue", "--issue-key", issue.key],
      { env: credentialEnv(project, req.body?.credentials) },
    );
    const issueSummary = normalizeIssue(result.json, req.body?.jiraUrl);
    const remoteDocs = await fetchJiraDocumentLinks(project, req.body?.credentials, issueSummary.key || issue.key);
    const descriptionDocLinks = extractDocumentLinksFromText(`${issueSummary.description}\n${issueSummary.summary}`);
    issueSummary.doc_links = dedupeStrings([
      ...(issueSummary.doc_links || []),
      ...descriptionDocLinks,
      ...remoteDocs.links.map((item) => item.url),
    ]);
    issueSummary.doc_link_sources = remoteDocs.links;
    if (remoteDocs.error) {
      issueSummary.doc_link_error = remoteDocs.error;
    }
    res.json({
      issue: issueSummary,
      runDir,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/draft", async (req, res) => {
  try {
    const parsed = parseIssueReference(req.body?.jiraUrl || "");
    const project = normalizeProject(req.body?.project, { jiraBaseUrl: parsed.baseUrl });
    const issue = normalizeIssue(req.body?.issue, req.body?.jiraUrl);
    if (!issue.key) issue.key = parsed.issueKey;
    if (!issue.summary && !issue.description) {
      throw Object.assign(new Error("Cần summary hoặc description của Jira task để tạo bản nháp."), { status: 400 });
    }
    const archetypeKey = chooseArchetype(issue, req.body?.archetype);
    const confluenceCredentials = normalizeConfluenceCredentials(req.body?.confluenceCredentials);
    const allowConfluenceDocs = Boolean(asText(confluenceCredentials.baseUrl) || asText(req.body?.confluenceLinks) || asText(req.body?.docContext));
    let docContext = allowConfluenceDocs ? asText(req.body?.docContext) : "";
    let referenceDocs = null;
    if (allowConfluenceDocs && !docContext && asText(req.body?.confluenceLinks)) {
      referenceDocs = await fetchConfluenceDocuments(
        req.body?.confluenceLinks,
        confluenceCredentials,
      );
      docContext = referenceDocs.combinedText;
    }
    const sourceContext = {
      qaNotes: asText(req.body?.notes),
      docContext,
    };
    const aiSettings = normalizeAiSettings(req.body?.aiSettings);
    const aiCustomization = aiCustomizationFromSettings(aiSettings);
    let testCases = buildCases(issue, archetypeKey, sourceContext, aiCustomization);
    let outline = buildOutline(issue, archetypeKey, testCases, sourceContext, aiCustomization);
    let aiGenerationUsed = false;
    let aiGenerationError = "";
    let aiUsage = null;
    if (aiSettings.enabled && !aiProviderReady(aiSettings)) {
      aiGenerationError = "AI Settings đang bật nhưng thiếu API key hoặc model, nên app dùng fallback local.";
    } else if (aiProviderReady(aiSettings)) {
      try {
        const aiDraft = await generateAiDraft({
          issue,
          archetypeKey,
          sourceInput: sourceContext,
          aiSettings,
          aiCustomization,
          fallbackCases: testCases,
          fallbackOutline: outline,
          project,
        });
        testCases = aiDraft.testCases;
        outline = aiDraft.outline;
        aiGenerationUsed = true;
        aiUsage = aiDraft.usage;
      } catch (error) {
        aiGenerationError = `AI provider lỗi, app dùng fallback local: ${error instanceof Error ? error.message : "Không tạo được AI draft."}`;
      }
    }
    res.json({
      archetypeKey,
      archetype: ARCHETYPES[archetypeKey],
      aiCustomizationApplied: Boolean(aiCustomization),
      aiGenerationUsed,
      aiGenerationError,
      aiUsage,
      sourceContext: outline.source_context,
      referenceDocsFetched: referenceDocs,
      testCases,
      outline,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/save-draft", async (req, res) => {
  try {
    const issue = normalizeIssue(req.body?.issue, req.body?.jiraUrl);
    if (!issue.key) {
      throw Object.assign(new Error("Cần issue key để lưu draft."), { status: 400 });
    }
    const cases = normalizeCasesForFile(req.body?.testCases);
    const outline = req.body?.outline;
    if (!outline || !Array.isArray(outline.branches)) {
      throw Object.assign(new Error("Cần test design outline hợp lệ để lưu draft."), { status: 400 });
    }
    const stem = safeFileStem(issue.key);
    const jiraDir = path.join(ROOT_DIR, "qa", "jira");
    const designDir = path.join(ROOT_DIR, "qa", "xmind-test-design");
    await fs.mkdir(jiraDir, { recursive: true });
    await fs.mkdir(designDir, { recursive: true });
    const casesPath = path.join(jiraDir, `${stem}_test_cases.json`);
    const designPath = path.join(designDir, `${stem}_test_design.json`);
    const casesPayload = savedTestCasesPayload(issue, outline, cases, req.body?.archetypeKey);
    const designPayload = {
      issue_key: issue.key,
      title: outline.title,
      template: outline.template || req.body?.archetypeKey || "general",
      source_context: outline.source_context || {},
      design_rationale: outline.design_rationale || {},
      branches: outline.branches,
    };
    await fs.writeFile(casesPath, JSON.stringify(casesPayload, null, 2) + "\n", "utf8");
    await fs.writeFile(designPath, JSON.stringify(designPayload, null, 2) + "\n", "utf8");
    res.json({
      saved: true,
      casesPath,
      designPath,
      casesFile: path.relative(ROOT_DIR, casesPath),
      designFile: path.relative(ROOT_DIR, designPath),
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/build-xmind", async (req, res) => {
  try {
    const outline = req.body?.outline;
    if (!outline || !Array.isArray(outline.branches)) {
      throw Object.assign(new Error("Outline không hợp lệ."), { status: 400 });
    }
    const project = normalizeProject(req.body?.project);
    const issueKey = asText(outline.issue_key || req.body?.issueKey);
    const runDir = await makeRunDir(issueKey || "XMIND");
    const configPath = await writeConfig(runDir, project, {
      attachAll: Boolean(req.body?.attachAll),
      replaceExisting: Boolean(req.body?.replaceExisting),
    });
    const outlinePath = path.join(runDir, "outline.json");
    await fs.writeFile(outlinePath, JSON.stringify(outline, null, 2) + "\n", "utf8");
    const args = ["--config-file", configPath, "build", "--outline-file", outlinePath];
    if (issueKey) args.push("--issue-key", issueKey);
    const result = await runPython(XMIND_WRAPPER, args, {
      env: credentialEnv(project, req.body?.credentials),
      timeoutMs: 360000,
    });
    res.json({
      result: result.json,
      runDir,
      configPath,
      outlinePath,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/create-suite", async (req, res) => {
  try {
    const project = normalizeProject(req.body?.project);
    const issueKey = asText(req.body?.issueKey || req.body?.issue?.key).toUpperCase();
    if (!issueKey) {
      throw Object.assign(new Error("Cần issue key để tạo test suite."), { status: 400 });
    }
    const cases = normalizeCasesForFile(req.body?.testCases);
    const runDir = await makeRunDir(issueKey);
    const configPath = await writeConfig(runDir, project, { attachAll: false });
    const casesPath = path.join(runDir, "test-cases.json");
    await fs.writeFile(casesPath, JSON.stringify({ test_cases: cases }, null, 2) + "\n", "utf8");
    const args = ["--config-file", configPath, "create-suite", "--issue-key", issueKey, "--cases-file", casesPath];
    if (req.body?.folderName) args.push("--folder-name", asText(req.body.folderName));
    const result = await runPython(JIRA_WRAPPER, args, {
      env: credentialEnv(project, req.body?.credentials),
      timeoutMs: 420000,
    });
    res.json({
      result: result.json,
      createdCaseKeys: caseKeysFromResult(result.json),
      runDir,
      configPath,
      casesPath,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/create-cycle", async (req, res) => {
  try {
    const project = normalizeProject(req.body?.project);
    const issueKey = asText(req.body?.issueKey || req.body?.issue?.key).toUpperCase();
    const rawKeys = Array.isArray(req.body?.caseKeys) ? req.body.caseKeys.join(",") : asText(req.body?.caseKeys);
    const caseKeys = rawKeys
      .split(/[,\s]+/)
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
      .join(",");
    if (!issueKey || !caseKeys) {
      throw Object.assign(new Error("Cần issue key và danh sách testcase key để tạo test cycle."), { status: 400 });
    }
    const runDir = await makeRunDir(issueKey);
    const configPath = await writeConfig(runDir, project, { attachAll: false });
    const args = ["--config-file", configPath, "create-cycle", "--issue-key", issueKey, "--case-keys", caseKeys];
    if (req.body?.folderName) args.push("--folder-name", asText(req.body.folderName));
    if (req.body?.cycleName) args.push("--cycle-name", asText(req.body.cycleName));
    const result = await runPython(JIRA_WRAPPER, args, {
      env: credentialEnv(project, req.body?.credentials),
      timeoutMs: 420000,
    });
    res.json({
      result: result.json,
      runDir,
      configPath,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    sendError(res, error);
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(DIST_DIR));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
    root: ROOT_DIR,
  });
  app.use(vite.middlewares);
}

await initializeDatabase();

app.listen(PORT, HOST, () => {
  console.log(`EasyForQC: http://${DISPLAY_HOST}:${PORT}`);
  console.log(`Local fallback: http://localhost:${PORT}`);
  if (APP_PASSWORD || db) {
    console.log(`Access protection: enabled for "${APP_ADMIN_EMAIL}"`);
  } else {
    console.log("Access protection: disabled. Set APP_PASSWORD before exposing the app outside your machine.");
  }
  console.log(`Database: ${db ? "postgres" : "disabled"}`);
});
