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

function compactLines(text, limit = 8) {
  return asText(text)
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*#\s]+/, "").trim())
    .filter((line) => line.length >= 8)
    .slice(0, limit);
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
  return asText(input)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index);
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
  if (pageId) {
    const baseUrl = confluenceBaseUrlFrom(url, credentials);
    const apiUrl = `${baseUrl}/rest/api/content/${encodeURIComponent(pageId)}?expand=body.storage,body.view,title,space`;
    const response = await fetch(apiUrl, { headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(payload.message || payload.errorMessage || `Confluence HTTP ${response.status}`), {
        status: response.status,
      });
    }
    const html = payload?.body?.storage?.value || payload?.body?.view?.value || "";
    return {
      title: asText(payload.title) || link,
      url: link,
      text: htmlToText(html).slice(0, 12000),
    };
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
    const score = archetype.keywords.reduce((total, keyword) => {
      return total + (haystack.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
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
    description,
    test_data: testData,
    expected_result: expectedResult,
  };
}

function buildCases(issue, archetypeKey, notes = "", aiCustomization = null) {
  const archetype = ARCHETYPES[archetypeKey] || ARCHETYPES.general;
  const key = issue.key || "JIRA-TASK";
  const summary = issue.summary || issue.title || "Phạm vi task";
  const scopeLines = compactLines(`${issue.description}\n${notes}`, 16);
  const guidanceLines = compactLines(aiGuidanceText(aiCustomization), 6);
  const contextLines = [...scopeLines, ...archetype.dimensions, ...guidanceLines].filter(Boolean);
  const pick = (index, fallback) => contextLines[index % Math.max(contextLines.length, 1)] || fallback;
  const mainRule = scopeLines[0] || summary;
  const secondRule = scopeLines[1] || archetype.dimensions[0];
  const isToolOrChatbot =
    ["tool_api", "chatbot"].includes(archetypeKey) ||
    /\b(tool|bot|chat|agent|conversation|bus|route|trip|endpoint|callback|api)\b/i.test(`${summary} ${issue.description}`);
  const precondition = [
    `Task ${key} đã có build hoặc môi trường test sẵn sàng.`,
    "QA có dữ liệu test phù hợp với scope trong Jira.",
    "Các dependency liên quan đã được cấu hình đúng trên môi trường test.",
  ].join("\n");

  const quoteLines = (messages) =>
    messages
      .filter(Boolean)
      .map((message, index) => `${index + 1}. "${message.replace(/"/g, '\\"')}"`)
      .join("\n");
  const unitName = (index) => (isToolOrChatbot ? `Tool ${Math.max(1, Math.ceil(index / 5))}` : "Feature");
  const userMessages = (index, intent) => {
    if (isToolOrChatbot) {
      return [
        `${intent} cho ${summary}`,
        "Em liệt kê giúp anh các lựa chọn phù hợp và giải thích ngắn gọn nhé.",
      ];
    }
    return [
      `Mở chức năng ${summary}`,
      `Thực hiện kiểm tra: ${intent}`,
    ];
  };
  const makeStructuredSteps = (item) => [
    step(
      isToolOrChatbot ? "Mở một conversation mới với bot/agent." : "Chuẩn bị dữ liệu và mở màn hình/chức năng cần kiểm thử.",
      quoteLines(item.messages),
      "",
    ),
    step(item.action, item.stepData || "", ""),
    step("Kiểm tra kết quả hiển thị, dữ liệu trả về và side effect liên quan.", "", expectation(...item.checks)),
  ];

  const seed = [
    {
      title: `${unitName(1)} xử lý đúng luồng chính của ${summary}`,
      objective: `Chứng minh business rule chính: ${mainRule}`,
      priority: "High",
      technique: archetype.primary[0],
      risk: "Sai rule chính làm task không đạt acceptance intent.",
      tags: ["happy_path", "business_rule"],
      scenario: "happy_path",
      messages: userMessages(1, mainRule),
      action: "Thực hiện luồng chính từ đầu đến cuối theo mô tả Jira/Confluence.",
      stepData: `Task: ${key}\nRule: ${mainRule}`,
      checks: ["Hệ thống xử lý thành công.", "Kết quả cuối cùng đúng với mô tả Jira/Confluence.", "Không phát sinh lỗi ngoài scope."],
    },
    {
      title: `${unitName(1)} chỉ xử lý khi đủ điều kiện bắt buộc của ${summary}`,
      objective: "Bao phủ các nhánh điều kiện quan trọng thay vì chỉ test happy path.",
      priority: "High",
      technique: archetype.primary[1] || "Decision table",
      risk: "Một nhánh điều kiện phụ xử lý sai nhưng không bị phát hiện bởi happy path.",
      tags: ["decision_table", "branching"],
      scenario: "validation",
      messages: userMessages(2, secondRule),
      action: "Thử các tổ hợp điều kiện chính và điều kiện phụ có thể làm đổi kết quả.",
      stepData: archetype.dimensions.map((item, index) => `${index + 1}. ${item}`).join("\n"),
      checks: ["Các nhánh chính, nhánh phụ và nhánh default được xác định rõ.", "Mỗi tổ hợp trả đúng outcome mong đợi.", "Không có tổ hợp bị rơi vào default sai."],
    },
    {
      title: `${unitName(1)} không được xử lý khi thiếu dữ liệu bắt buộc`,
      objective: "Đảm bảo hệ thống không xử lý sai khi input thiếu hoặc không hợp lệ.",
      priority: "High",
      technique: archetype.supporting[0] || "Boundary value analysis",
      risk: "Thiếu dữ liệu làm sai mapping, sai hiển thị hoặc sai trạng thái.",
      tags: ["validation", "missing_data"],
      scenario: "negative_path",
      messages: userMessages(3, `thiếu ${pick(2, "dữ liệu bắt buộc")}`),
      action: "Gửi/tạo dữ liệu thiếu required field, null hoặc rỗng.",
      stepData: `Required/critical data: ${archetype.dimensions.slice(0, 3).join(", ")}`,
      checks: ["Hệ thống hiển thị hoặc ghi nhận lỗi rõ ràng.", "Không gọi downstream hoặc lưu dữ liệu sai.", "Không crash, không lưu trạng thái không nhất quán."],
    },
    {
      title: `${unitName(1)} trả nearest match hoặc fallback đúng khi không có dữ liệu khớp hoàn toàn`,
      objective: "Đảm bảo hệ thống xử lý đúng khi dữ liệu gần đúng hoặc thiếu match trực tiếp.",
      priority: "High",
      technique: "Fallback / partial failure / recovery",
      risk: "Không có match trực tiếp nhưng hệ thống trả sai dữ liệu hoặc im lặng.",
      tags: ["fallback", "nearest_match"],
      scenario: "edge_case",
      messages: userMessages(4, `không có dữ liệu khớp hoàn toàn cho ${pick(3, "điều kiện lọc")}`),
      action: "Tạo request có dữ liệu gần đúng, thiếu match hoặc kết quả rỗng.",
      stepData: `Fallback dimension: ${pick(3, "empty downstream response")}`,
      checks: ["Hệ thống trả fallback/nearest match theo rule.", "Không tự bịa dữ liệu ngoài source of truth.", "Thông báo đủ rõ để user biết cần bổ sung điều kiện."],
    },
    {
      title: `${unitName(1)} không reuse stale context khi user đổi điều kiện`,
      objective: "Đảm bảo context mới ghi đè context cũ đúng rule.",
      priority: "Normal",
      technique: "State transition",
      risk: "Bot hoặc flow dùng lại context cũ khiến kết quả sai.",
      tags: ["state_transition", "stale_context"],
      scenario: "workflow",
      messages: ["Tạo điều kiện ban đầu cho task.", "Đổi sang điều kiện khác trước khi hệ thống trả kết quả cuối."],
      action: "Thực hiện multi-turn flow có thay đổi input quan trọng giữa chừng.",
      stepData: `Context cần reset/carry-forward: ${pick(4, "state carry-forward")}`,
      checks: ["Context mới được ưu tiên đúng rule.", "Không reuse dữ liệu cũ khi user đã đổi điều kiện.", "Trace/log thể hiện input cuối cùng được dùng."],
    },
    {
      title: `${unitName(2)} gọi đúng endpoint hoặc downstream key mặc định`,
      objective: "Kiểm tra integration contract và key mapping tới downstream.",
      priority: "High",
      technique: "Integration contract / field mapping",
      risk: "Sai endpoint/key làm downstream trả sai dữ liệu dù UI nhìn có vẻ hợp lệ.",
      tags: ["integration_contract", "mapping"],
      scenario: "integration",
      messages: userMessages(6, `mapping ${pick(5, "endpoint/key")}`),
      action: "Theo dõi request tới downstream/tool và response trả về.",
      stepData: `Expected mapping: ${pick(5, "required fields / endpoint")}`,
      checks: ["Bot/service gọi đúng tool hoặc endpoint cần dùng.", "Payload không thiếu field bắt buộc.", "Không dùng field nội bộ hoặc key không thuộc scope user."],
    },
    {
      title: `${unitName(2)} trả đúng catalog hoặc danh sách dữ liệu theo group`,
      objective: "Đảm bảo danh sách trả về được group/sort đúng với source.",
      priority: "Normal",
      technique: "Decision table",
      risk: "Danh sách/group sai làm user chọn nhầm option.",
      tags: ["catalog", "grouping"],
      scenario: "validation",
      messages: userMessages(7, `group/sort theo ${pick(6, "business rule")}`),
      action: "Đối chiếu output với source data sau khi tool trả danh sách.",
      stepData: `Grouping/sort rule: ${pick(6, "grouping / ordering rule")}`,
      checks: ["Danh sách trả về được group đúng rule.", "Không trộn dữ liệu giữa các group.", "Các field hiển thị đủ để user phân biệt option."],
    },
    {
      title: `${unitName(2)} bám source of truth khi user nhập dữ liệu mơ hồ`,
      objective: "Kiểm tra ambiguity handling và không xác nhận sai dữ liệu.",
      priority: "Normal",
      technique: "Equivalence partitioning",
      risk: "Input mơ hồ bị hiểu thành dữ liệu cụ thể không đúng.",
      tags: ["ambiguous_input", "source_of_truth"],
      scenario: "negative_path",
      messages: userMessages(8, `input mơ hồ quanh ${pick(7, "selection")}`),
      action: "Gửi input thiếu định danh hoặc có nhiều khả năng match.",
      stepData: `Ambiguous field: ${pick(7, "ambiguous user input")}`,
      checks: ["Bot/service không tự xác nhận option chưa đủ bằng chứng.", "Hệ thống hỏi lại hoặc trả danh sách lựa chọn phù hợp.", "Không ghi nhận state cuối khi chưa chốt."],
    },
  ];

  seed.push(
    ...[
      ["không xác nhận dữ liệu ngoài phạm vi hợp lệ", "Boundary value analysis", "invalid_data", "Dữ liệu ngoài danh mục/ngoài route/ngoài rule không được chấp nhận."],
      ["giữ đúng lựa chọn user ở bước trước khi chuyển sang bước sau", "State transition", "carry_forward", "Selection key/state được carry-forward đúng qua multi-turn."],
      ["chuẩn hóa price/options hoặc output format trước khi trả user", "Integration contract / field mapping", "output_mapping", "Output được chuẩn hóa đúng format và không mất field quan trọng."],
      ["xử lý phụ phí, điều kiện bổ sung hoặc metadata đi kèm", "Decision table", "metadata", "Metadata/điều kiện phụ không bị bỏ sót khi tạo kết quả cuối."],
      ["trả nhiều nhóm dữ liệu nhưng vẫn giữ applicable option rõ ràng", "Pairwise / combinatorial", "multi_group", "Nhiều group/option vẫn phân biệt rõ và không lẫn điều kiện áp dụng."],
      ["resolve lại selection key qua bước trước khi user chọn option", "State transition", "selection_key", "Key lựa chọn được resolve lại từ source, không dựa vào text hiển thị đơn thuần."],
      ["hỏi lại khi user chưa chốt đủ thông tin", "Use-case / scenario flow", "clarification", "Luồng hỏi lại đủ ngắn gọn và không gọi tool quá sớm."],
      ["fallback đúng khi downstream timeout hoặc trả lỗi", "Fallback / partial failure / recovery", "downstream_failure", "Timeout/5xx/empty response được xử lý fail-safe."],
      ["không tạo duplicate khi retry cùng request", "Retry / idempotency / duplicate event", "retry", "Retry không tạo dữ liệu/trạng thái trùng ngoài rule."],
      ["không rò rỉ context giữa conversation hoặc user khác", "Risk-based regression", "cross_context", "Context không bị lẫn giữa user/session/entity khác."],
      ["regression luồng cũ cùng module vẫn hoạt động", "Regression", "regression", "Luồng cũ gần vùng thay đổi vẫn giữ behavior trước đó."],
      ["ghi nhận out-of-scope hoặc unsupported request đúng cách", "Error guessing / bug-history based", "out_of_scope", "Unsupported/out-of-scope được từ chối hoặc hướng dẫn rõ ràng."],
    ].map(([title, technique, tag, check], offset) => {
      const index = offset + 9;
      return {
        title: `${unitName(index)} ${title} cho ${summary}`,
        objective: `Bao phủ ${title}.`,
        priority: index === 16 ? "High" : "Normal",
        technique,
        risk: check,
        tags: [tag, "omni_v2_coverage"],
        scenario: tag,
        messages: userMessages(index, pick(index, title)),
        action: `Thực hiện biến thể kiểm thử: ${title}.`,
        stepData: `Coverage reference: ${pick(index, check)}`,
        checks: [check, "Kết quả bám đúng Jira/Confluence và source of truth.", "Không phát sinh side effect ngoài scope."],
      };
    }),
  );

  return seed.map((item, index) => {
    const steps = makeStructuredSteps(item);
    const testData = quoteLines(item.messages);
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
      structured_steps: steps,
    };
  });
}

function buildOutline(issue, archetypeKey, cases = [], notes = "", aiCustomization = null) {
  const archetype = ARCHETYPES[archetypeKey] || ARCHETYPES.general;
  const title = issue.title || `[${issue.key || "JIRA-TASK"}] ${issue.summary || "Test design"}`;
  const scopeLines = compactLines(`${issue.description}\n${notes}`, 8);
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
      "Kết quả cuối cùng khớp mô tả và acceptance intent",
    ],
    [
      `Kiểm tra ${archetype.dimensions[0]}`,
      `Kiểm tra ${archetype.dimensions[1]}`,
      `Kiểm tra ${archetype.dimensions[2] || "các biến thể dữ liệu quan trọng"}`,
    ],
    [
      `Không xử lý sai khi ${archetype.dimensions[3] || "dữ liệu không đầy đủ"}`,
      `Không mất context khi chuyển state hoặc reload`,
      `Không tạo side effect ngoài scope của ${issue.key || "task"}`,
    ],
    [
      `Regression từ case: ${caseTitles[0] || "luồng cũ cùng module"}`,
      `Retry/duplicate vẫn nhất quán với rule mới`,
      "Fallback rõ ràng khi dependency lỗi, timeout hoặc trả rỗng",
    ],
    [
      "Không kiểm thử thay đổi ngoài mô tả Jira task này",
      "Không xác nhận performance/load test nếu Jira không yêu cầu",
      "Không thay đổi dữ liệu production hoặc cấu hình thật ngoài môi trường test",
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

function normalizeCasesForFile(cases) {
  if (!Array.isArray(cases) || cases.length === 0) {
    throw Object.assign(new Error("Cần ít nhất một test case."), { status: 400 });
  }
  return cases;
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
    if (!asText(confluenceCredentials.baseUrl)) {
      throw Object.assign(new Error("Nhập Confluence Base URL cho task này trước khi Fetch docs."), { status: 400 });
    }
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
    res.json({
      issue: result.json,
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
    const issue = normalizeIssue(req.body?.issue, req.body?.jiraUrl);
    if (!issue.key) issue.key = parsed.issueKey;
    if (!issue.summary && !issue.description) {
      throw Object.assign(new Error("Cần summary hoặc description của Jira task để tạo bản nháp."), { status: 400 });
    }
    const archetypeKey = chooseArchetype(issue, req.body?.archetype);
    const confluenceCredentials = normalizeConfluenceCredentials(req.body?.confluenceCredentials);
    const allowConfluenceDocs = Boolean(asText(confluenceCredentials.baseUrl));
    let docContext = allowConfluenceDocs ? asText(req.body?.docContext) : "";
    let referenceDocs = null;
    if (allowConfluenceDocs && !docContext && asText(req.body?.confluenceLinks)) {
      referenceDocs = await fetchConfluenceDocuments(
        req.body?.confluenceLinks,
        confluenceCredentials,
      );
      docContext = referenceDocs.combinedText;
    }
    const notes = [asText(req.body?.notes), docContext ? `Confluence/reference docs:\n${docContext}` : ""]
      .filter(Boolean)
      .join("\n\n");
    const aiCustomization = aiCustomizationFromSettings(req.body?.aiSettings);
    const testCases = buildCases(issue, archetypeKey, notes, aiCustomization);
    const outline = buildOutline(issue, archetypeKey, testCases, notes, aiCustomization);
    res.json({
      archetypeKey,
      archetype: ARCHETYPES[archetypeKey],
      aiCustomizationApplied: Boolean(aiCustomization),
      referenceDocsFetched: referenceDocs,
      testCases,
      outline,
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
