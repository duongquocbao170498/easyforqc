import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const RUNS_DIR = path.join(ROOT_DIR, ".qa-runs");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const PURGE_GENERATED_OUTPUTS_ON_START = process.env.PURGE_GENERATED_OUTPUTS_ON_START === "true";
const OUTPUT_PURGE_MARKER = path.join(ROOT_DIR, ".qa-cleanup", "generated-output-purged-v1");
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "0.0.0.0";
const DISPLAY_HOST = process.env.DISPLAY_HOST || "easyforqc.com";
const APP_USER = process.env.APP_USER || "qa";
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const APP_ADMIN_EMAIL = String(process.env.APP_ADMIN_EMAIL || APP_USER || "qa@example.local").trim().toLowerCase();
const APP_ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD || APP_PASSWORD;
const APP_SESSION_SECRET = process.env.APP_SESSION_SECRET || APP_PASSWORD || crypto.randomBytes(32).toString("hex");
const NODE_ENV = String(process.env.NODE_ENV || "").toLowerCase();
const APP_COOKIE_SECURE = String(process.env.APP_COOKIE_SECURE || "").toLowerCase();
const SETTINGS_ENCRYPTION_SECRET = process.env.SETTINGS_ENCRYPTION_SECRET || APP_SESSION_SECRET;
const EXPOSE_DEBUG_DETAILS = process.env.EXPOSE_DEBUG_DETAILS === "true";
const SESSION_COOKIE = "qa_studio_session";
const SESSION_MAX_AGE_SECONDS = Number(process.env.APP_SESSION_MAX_AGE_SECONDS || 60 * 60 * 24 * 7);
const DATABASE_URL = process.env.DATABASE_URL || "";
const SETTINGS_CIPHER_VERSION = "v1";
const CONFLUENCE_DOC_TEXT_LIMIT = Number(process.env.CONFLUENCE_DOC_TEXT_LIMIT || 80000);
const CONFLUENCE_COMBINED_TEXT_LIMIT = Number(process.env.CONFLUENCE_COMBINED_TEXT_LIMIT || 200000);
const AI_DOC_CONTEXT_PROMPT_LIMIT = Number(process.env.AI_DOC_CONTEXT_PROMPT_LIMIT || 90000);
const AI_REFERENCE_PROMPT_LIMIT = Number(process.env.AI_REFERENCE_PROMPT_LIMIT || 30000);
const QA_EVIDENCE_FILE_LIMIT = Number(process.env.QA_EVIDENCE_FILE_LIMIT || 900);
const QA_EVIDENCE_FILE_BYTES = Number(process.env.QA_EVIDENCE_FILE_BYTES || 220000);
const QA_EVIDENCE_SNIPPET_LIMIT = Number(process.env.QA_EVIDENCE_SNIPPET_LIMIT || 10);
const GOOGLE_OAUTH_STATE_COOKIE = "qa_google_oauth_state";
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || "").trim();
const GOOGLE_CLIENT_SECRET = String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
const GOOGLE_CALLBACK_URL = String(process.env.GOOGLE_CALLBACK_URL || "").trim();
const GOOGLE_ALLOWED_EMAILS = String(process.env.GOOGLE_ALLOWED_EMAILS || "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
let db = null;
if (DATABASE_URL) {
  const { default: pg } = await import("pg");
  const { Pool } = pg;
  db = new Pool({ connectionString: DATABASE_URL });
}
let easyForQcUatStateSeedCache;

const HOME_DIR = process.env.HOME || "";
const LOCAL_OMNIAGENT_ROOT = path.join(HOME_DIR, "Vexere", "knowledge_base", "omniagent");
const LOCAL_QA_REFERENCE_DIR = path.join(HOME_DIR, "Vexere", "qa");
const VENDOR_DIR = path.join(ROOT_DIR, "vendor");
const DOCKER_OMNIAGENT_ROOT = "/omniagent";
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
const VENDOR_CHATWOOT_UAT_SKILL_ROOT = path.join(VENDOR_SOURCE_ROOT, "chatwoot-test-uat");
const LOCAL_CHATWOOT_UAT_SKILL_ROOT = path.join(LOCAL_OMNIAGENT_ROOT, ".agent", "skills", "chatwoot-test-uat");
const DOCKER_CHATWOOT_UAT_SKILL_ROOT = path.join(DOCKER_OMNIAGENT_ROOT, ".agent", "skills", "chatwoot-test-uat");
const DEFAULT_CHATWOOT_UAT_WEBHOOK_URL = process.env.CHATWOOT_UAT_DEFAULT_WEBHOOK_URL ||
  (fsSync.existsSync("/.dockerenv") ? "http://host.docker.internal:3000/webhook/chatwoot" : "http://localhost:3000/webhook/chatwoot");
const DEFAULT_CHATWOOT_UAT_HEALTHCHECK_URL = process.env.CHATWOOT_UAT_DEFAULT_HEALTHCHECK_URL ||
  (fsSync.existsSync("/.dockerenv") ? "http://host.docker.internal:3000/health" : "http://localhost:3000/health");
const DEFAULT_CHATWOOT_UAT_API_BASE = asText(process.env.CHATWOOT_UAT_API_BASE);
const DEFAULT_CHATWOOT_UAT_ACCOUNT_ID = asText(process.env.CHATWOOT_UAT_ACCOUNT_ID);
const DEFAULT_CHATWOOT_UAT_INBOX_ID = asText(process.env.CHATWOOT_UAT_INBOX_ID || "3062");
const DEFAULT_CHATWOOT_UAT_UI_INBOX_ID = asText(process.env.CHATWOOT_UAT_UI_INBOX_ID || DEFAULT_CHATWOOT_UAT_INBOX_ID);
const DEFAULT_CHATWOOT_UAT_CAPTAIN_ASSISTANT_ID = asText(process.env.CHATWOOT_UAT_CAPTAIN_ASSISTANT_ID || "80");
const CHATWOOT_UAT_API_KEY = asText(process.env.CHATWOOT_UAT_API_KEY);
const CHATWOOT_UAT_USER_API_KEY = asText(process.env.CHATWOOT_UAT_USER_API_KEY);
const CHATWOOT_UAT_JOBS = new Map();
const CHATWOOT_UAT_JOB_PROCESSES = new Map();
const QA_WORKSPACE_MEMORY = new Map();
const AI_548_CHATWOOT_SUITE_RELATIVE = path.join(
  "assets",
  "suites",
  "generated",
  "2026-05-07-ai-548-chatwoot-uat",
  "ai-548-create-booking-pending-chatwoot-uat.yml",
);
const AI_547_REFERENCE_FILES = [
  path.join(ROOT_DIR, "vendor", "qa-reference", "testcase-style", "ai_547_test_cases.json"),
  path.join(ROOT_DIR, "vendor", "qa-reference", "testcase-style", "ai_547_stop_catalog_additional_test_cases.json"),
];
const AI_547_CHATWOOT_SUITE_RELATIVE = path.join(
  "assets",
  "suites",
  "generated",
  "easyforqc",
  "imported-ai-547",
  "ai-547-bus-trip-tools-chatwoot-uat.yml",
);
const EASYFORQC_CHATWOOT_GENERATED_RELATIVE = path.join("assets", "suites", "generated", "easyforqc");
const EASYFORQC_UAT_STATE_SEED_FILE = path.join(ROOT_DIR, "server", "seeds", "easyforqc-uat-state.json");
const DEFAULT_SOURCE_ROOT = fsSync.existsSync(VENDOR_SOURCE_ROOT)
  ? VENDOR_SOURCE_ROOT
  : "/Users/gumball.bi/Vexere/knowledge_base/omniagent/.agent/skills";
const DEFAULT_REPO_INCLUDE_PATHS = [
  ".agent/skills",
  "AGENTS.md",
  "README.md",
  "docs",
  "guides",
  "sops",
  "system-prompts",
  "references",
  "scripts",
  "config",
  "src",
  "app",
  "tests",
  "packages",
  "articles",
  "researchs",
].join("\n");
const DEFAULT_REPO_EXCLUDE_PATHS = [
  "node_modules",
  ".git",
  ".idea",
  ".obsidian",
  ".venv",
  "dist",
  "build",
  "coverage",
  "backtests_v2",
  "docs/_generated",
  ".DS_Store",
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  "*secret*",
  "*token*",
].join("\n");

const DEFAULTS = {
  sourceRoot: process.env.QA_SOURCE_ROOT || DEFAULT_SOURCE_ROOT,
  jiraBaseUrl: process.env.JIRA_BASE_URL || "https://jira.vexere.net",
  projectKey: "AI",
  folderRoot: "/Bao QC",
  runRoot: "/AI Chatbot",
  jsonOutputDir: path.join(ROOT_DIR, "qa", "jira"),
  outputDir: path.join(ROOT_DIR, "qa", "xmind-test-design"),
  testCaseNumberTemplate: "TC_{0000}",
  chatwootMode: "adaptive",
  chatwootChatUiMode: "realistic",
  chatwootPlannerBackend: "openai-compatible",
  chatwootWebhookUrl: DEFAULT_CHATWOOT_UAT_WEBHOOK_URL,
  chatwootHealthcheckUrl: DEFAULT_CHATWOOT_UAT_HEALTHCHECK_URL,
  chatwootSkipHealthcheck: true,
  chatwootSkipLocalWebhookPost: true,
  chatwootApiBase: DEFAULT_CHATWOOT_UAT_API_BASE,
  chatwootInboxId: DEFAULT_CHATWOOT_UAT_INBOX_ID,
  chatwootUiInboxId: DEFAULT_CHATWOOT_UAT_UI_INBOX_ID,
  chatwootCaptainAssistantId: DEFAULT_CHATWOOT_UAT_CAPTAIN_ASSISTANT_ID,
  chatwootAccountId: DEFAULT_CHATWOOT_UAT_ACCOUNT_ID,
  chatwootMaxUserTurns: "10",
  chatwootPlannerModel: "gpt-5.4-mini",
  chatwootPlannerTimeoutSeconds: "60",
  chatwootLabels: "ai",
  chatwootAssigneeName: "Bot",
  chatwootPinnedConversationId: "",
  automationProfiles: [],
  repoContext: {
    enabled: process.env.QA_REPO_CONTEXT_ENABLED === "true",
    productRepoRoot: process.env.QA_PRODUCT_REPO_ROOT || (fsSync.existsSync(LOCAL_OMNIAGENT_ROOT) ? LOCAL_OMNIAGENT_ROOT : ""),
    qaReferenceDir: process.env.QA_REFERENCE_DIR || (fsSync.existsSync(LOCAL_QA_REFERENCE_DIR) ? LOCAL_QA_REFERENCE_DIR : ""),
    includePaths: process.env.QA_REPO_INCLUDE_PATHS || DEFAULT_REPO_INCLUDE_PATHS,
    excludePaths: process.env.QA_REPO_EXCLUDE_PATHS || DEFAULT_REPO_EXCLUDE_PATHS,
    maxSnippets: process.env.QA_REPO_MAX_SNIPPETS || "12",
  },
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

const OUTLINE_MAX_BRANCHES = 8;
const OUTLINE_MIN_IN_SCOPE_BRANCHES = 2;

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
  conversation_ui: {
    label: "Conversation UI / Message Annotation",
    keywords: [
      "amr",
      "score",
      "điểm",
      "highlight",
      "badge",
      "indicator",
      "bubble",
      "message",
      "tin nhắn",
      "conversation stream",
      "chat stream",
      "amr score",
    ],
    primary: ["Decision table", "Integration contract / field mapping"],
    supporting: ["State transition", "Realtime / refresh / pagination stability", "Boundary value analysis"],
    dimensions: [
      "mapping score đúng cặp AI -> CE message",
      "trạng thái pass, low, fail, missing và error",
      "vị trí badge/highlight trong message stream",
      "refresh/reload và dữ liệu đến trễ",
      "không highlight nhầm message ngoài cặp đánh giá",
    ],
    branches: [
      "Score badge và message binding",
      "Decision state và threshold",
      "Empty, error và dữ liệu đến trễ",
      "UI regression trong conversation stream",
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
      auth_entries_encrypted TEXT NOT NULL DEFAULT '',
      ai_settings_encrypted TEXT NOT NULL DEFAULT '',
      ai_settings_history JSONB NOT NULL DEFAULT '[]'::jsonb,
      repo_context_encrypted TEXT NOT NULL DEFAULT '',
      knowledge_articles JSONB NOT NULL DEFAULT '[]'::jsonb,
      qa_workspace_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS confluence_credentials_encrypted TEXT NOT NULL DEFAULT ''");
  await db.query("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS auth_entries_encrypted TEXT NOT NULL DEFAULT ''");
  await db.query("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_settings_encrypted TEXT NOT NULL DEFAULT ''");
  await db.query("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_settings_history JSONB NOT NULL DEFAULT '[]'::jsonb");
  await db.query("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS repo_context_encrypted TEXT NOT NULL DEFAULT ''");
  await db.query("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS knowledge_articles JSONB NOT NULL DEFAULT '[]'::jsonb");
  await db.query("ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS qa_workspace_items JSONB NOT NULL DEFAULT '[]'::jsonb");

  await db.query(`
    CREATE TABLE IF NOT EXISTS chatwoot_uat_runs (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'queued',
      suite_name TEXT NOT NULL DEFAULT '',
      suite_file TEXT NOT NULL DEFAULT '',
      run_dir TEXT NOT NULL DEFAULT '',
      request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      result_payload JSONB,
      error TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query("ALTER TABLE chatwoot_uat_runs ADD COLUMN IF NOT EXISTS suite_name TEXT NOT NULL DEFAULT ''");
  await db.query("ALTER TABLE chatwoot_uat_runs ADD COLUMN IF NOT EXISTS suite_file TEXT NOT NULL DEFAULT ''");
  await db.query("ALTER TABLE chatwoot_uat_runs ADD COLUMN IF NOT EXISTS run_dir TEXT NOT NULL DEFAULT ''");
  await db.query("ALTER TABLE chatwoot_uat_runs ADD COLUMN IF NOT EXISTS request_payload JSONB NOT NULL DEFAULT '{}'::jsonb");
  await db.query("ALTER TABLE chatwoot_uat_runs ADD COLUMN IF NOT EXISTS result_payload JSONB");
  await db.query("ALTER TABLE chatwoot_uat_runs ADD COLUMN IF NOT EXISTS error TEXT NOT NULL DEFAULT ''");
  await db.query("UPDATE chatwoot_uat_runs SET status = 'interrupted', finished_at = NOW(), updated_at = NOW() WHERE status IN ('queued', 'running')");

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

function shouldUseSecureCookie(req) {
  if (APP_COOKIE_SECURE === "true") return true;
  if (APP_COOKIE_SECURE === "false") return false;
  const proto = String(req?.headers?.["x-forwarded-proto"] || "").toLowerCase();
  if (req?.secure || proto.split(",").map((item) => item.trim()).includes("https")) return true;
  const host = String(req?.headers?.host || "").split(":")[0].toLowerCase();
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(host) || host.endsWith(".local");
  return NODE_ENV === "production" && Boolean(host) && !isLocalHost;
}

function sessionCookie(value, maxAgeSeconds = SESSION_MAX_AGE_SECONDS, req = null) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (shouldUseSecureCookie(req)) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function namedCookie(name, value, maxAgeSeconds, req = null) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (shouldUseSecureCookie(req)) {
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

function settingsCipherKey(secret = SETTINGS_ENCRYPTION_SECRET) {
  return crypto.createHash("sha256").update(secret || APP_SESSION_SECRET).digest();
}

function settingsCipherReadKeys() {
  return dedupeStrings([SETTINGS_ENCRYPTION_SECRET, APP_SESSION_SECRET]).map((secret) => settingsCipherKey(secret));
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
  for (const key of settingsCipherReadKeys()) {
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
      decipher.setAuthTag(Buffer.from(tagText, "base64url"));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedText, "base64url")),
        decipher.final(),
      ]);
      return JSON.parse(decrypted.toString("utf8"));
    } catch {
      continue;
    }
  }
  return {};
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

const SECRET_KEY_PATTERN = /(password|token|secret|api[_-]?key|authorization|cookie)/i;

function sensitiveEnvValues(extra = []) {
  const values = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (SECRET_KEY_PATTERN.test(key) && asText(value).length >= 4) {
      values.push(asText(value));
    }
  }
  for (const value of extra) {
    const text = asText(value);
    if (text.length >= 4) values.push(text);
  }
  return dedupeStrings(values).sort((a, b) => b.length - a.length);
}

function escapeRegExp(value) {
  return asText(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactText(value, extraSecrets = []) {
  let text = asText(value);
  for (const secret of sensitiveEnvValues(extraSecrets)) {
    text = text.replace(new RegExp(escapeRegExp(secret), "g"), "[redacted]");
  }
  return text
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, "$1[redacted]")
    .replace(/(Basic\s+)[A-Za-z0-9+/=]{8,}/gi, "$1[redacted]")
    .replace(/((?:password|token|secret|api[_-]?key)[\"'\s:=]+)[^\"'\s,}]+/gi, "$1[redacted]");
}

function redactValue(value, extraSecrets = []) {
  if (typeof value === "string") return redactText(value, extraSecrets);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, extraSecrets));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? "[redacted]" : redactValue(item, extraSecrets),
      ]),
    );
  }
  return value;
}

function secretValuesFromAuth(...items) {
  const values = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    values.push(item.password, item.jiraPassword, item.token, item.jiraToken, item.confluencePassword, item.confluenceToken, item.apiKey);
  }
  return values.map(asText).filter(Boolean);
}

function publicCredentials(credentials = {}) {
  const normalized = normalizeCredentials(credentials);
  return {
    enabled: normalized.enabled,
    user: normalized.user,
    password: "",
    token: "",
    saved: {
      hasPassword: Boolean(normalized.password),
      hasToken: Boolean(normalized.token),
    },
  };
}

function publicConfluenceCredentials(credentials = {}) {
  const normalized = normalizeConfluenceCredentials(credentials);
  return {
    enabled: normalized.enabled,
    baseUrl: "",
    user: normalized.user,
    password: "",
    token: "",
    saved: {
      hasPassword: Boolean(normalized.password),
      hasToken: Boolean(normalized.token),
    },
  };
}

function publicAuthEntries(entries = []) {
  return normalizeAuthEntries(entries).map((entry) => ({
    ...entry,
    password: "",
    token: "",
    saved: {
      hasPassword: Boolean(entry.password),
      hasToken: Boolean(entry.token),
    },
  }));
}

function publicAiSettings(settings = {}) {
  const normalized = normalizeAiSettings(settings);
  return {
    ...normalized,
    apiKey: "",
    knowledge: {
      ...normalized.knowledge,
      apiKey: "",
      saved: {
        hasApiKey: Boolean(normalized.knowledge?.apiKey),
      },
    },
    saved: {
      hasApiKey: Boolean(normalized.apiKey),
      hasKnowledgeApiKey: Boolean(normalized.knowledge?.apiKey),
    },
  };
}

function normalizeAiSettingsHistory(raw = []) {
  const items = Array.isArray(raw) ? raw : [];
  return items
    .map((item) => ({
      id: asText(item.id) || crypto.randomUUID(),
      createdAt: asText(item.createdAt || item.created_at) || new Date().toISOString(),
      section: asText(item.section) === "knowledgeAi" ? "knowledgeAi" : "ai",
      source: asText(item.source) || "manual_save",
      summary: asText(item.summary),
      changes: Array.isArray(item.changes)
        ? item.changes
            .map((change) => ({
              field: asText(change.field),
              label: asText(change.label || change.field),
              before: asText(change.before),
              after: asText(change.after),
              secret: Boolean(change.secret),
            }))
            .filter((change) => change.field)
            .slice(0, 40)
        : [],
    }))
    .filter((item) => item.changes.length || item.summary)
    .slice(0, 100);
}

function aiHistoryValue(value, secret = false) {
  if (secret) {
    return value ? "[secret updated]" : "[empty]";
  }
  const text = asText(value);
  if (!text) return "";
  return text;
}

function aiSettingsRevisionChanges(previousSettings = {}, nextSettings = {}, section = "ai") {
  const previous = normalizeAiSettings(previousSettings);
  const next = normalizeAiSettings(nextSettings);
  const fields =
    section === "knowledgeAi"
      ? [
          ["knowledge.enabled", "Bật Knowledge AI", false],
          ["knowledge.provider", "Knowledge provider", false],
          ["knowledge.baseUrl", "Knowledge Base URL", false],
          ["knowledge.model", "Knowledge model", false],
          ["knowledge.apiKey", "Knowledge API key", true],
          ["knowledge.writingStyle", "Phong cách viết Knowledge", false],
          ["knowledge.articleGuidelines", "Quy tắc viết bài Knowledge", false],
        ]
      : [
          ["enabled", "Bật AI", false],
          ["provider", "Provider", false],
          ["baseUrl", "Base URL", false],
          ["model", "Model", false],
          ["apiKey", "API key", true],
          ["promptGuidelines", "Prompt tạo test case/test design", false],
          ["stopConditionGuidelines", "Prompt sinh điều kiện dừng automation", false],
          ["writingStyle", "Phong cách viết", false],
          ["testCaseGuidelines", "Quy tắc test case", false],
          ["testDesignGuidelines", "Quy tắc test design", false],
          ["improvementNotes", "Ghi nhớ cải tiến", false],
        ];
  const getValue = (settings, field) =>
    field.split(".").reduce((value, key) => (value && typeof value === "object" ? value[key] : undefined), settings);
  return fields
    .map(([field, label, secret]) => {
      const beforeRaw = getValue(previous, field);
      const afterRaw = getValue(next, field);
      if (secret) {
        const beforeSecret = asText(beforeRaw);
        const afterSecret = asText(afterRaw);
        if (beforeSecret === afterSecret) return null;
        return {
          field,
          label,
          before: beforeSecret ? "[saved secret]" : "[empty]",
          after: afterSecret ? "[secret updated]" : "[empty]",
          secret: true,
        };
      }
      const beforeValue = aiHistoryValue(beforeRaw, Boolean(secret));
      const afterValue = aiHistoryValue(afterRaw, Boolean(secret));
      if (beforeValue === afterValue) return null;
      return {
        field,
        label,
        before: beforeValue,
        after: afterValue,
        secret: Boolean(secret),
      };
    })
    .filter(Boolean);
}

function buildAiSettingsHistoryEntry(previousSettings = {}, nextSettings = {}, meta = {}) {
  const section = meta.section === "knowledgeAi" ? "knowledgeAi" : "ai";
  const changes = aiSettingsRevisionChanges(previousSettings, nextSettings, section);
  if (!changes.length) return null;
  const source = asText(meta.source) || "manual_save";
  const defaultSummary = source === "ai_prompt_improve"
    ? "AI improved reusable prompt guidance"
    : section === "knowledgeAi"
      ? "Saved Knowledge AI Settings"
      : "Saved AI Settings";
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    section,
    source,
    summary: asText(meta.summary) || defaultSummary,
    changes,
  };
}

function publicUserSettings(settings = {}) {
  return {
    project: settings.project ? normalizeProject(settings.project) : null,
    credentials: settings.credentials ? publicCredentials(settings.credentials) : null,
    confluenceCredentials: settings.confluenceCredentials ? publicConfluenceCredentials(settings.confluenceCredentials) : null,
    authEntries: publicAuthEntries(settings.authEntries),
    aiSettings: settings.aiSettings ? publicAiSettings(settings.aiSettings) : null,
    aiSettingsHistory: normalizeAiSettingsHistory(settings.aiSettingsHistory),
    repoContext: settings.repoContext || null,
    knowledgeArticles: normalizeKnowledgeArticles(settings.knowledgeArticles),
    qaWorkspaceItems: normalizeQaWorkspaceItems(settings.qaWorkspaceItems),
  };
}

function readEasyForQcUatStateSeed() {
  if (easyForQcUatStateSeedCache !== undefined) return easyForQcUatStateSeedCache;
  try {
    const payload = JSON.parse(fsSync.readFileSync(EASYFORQC_UAT_STATE_SEED_FILE, "utf8"));
    easyForQcUatStateSeedCache = payload && typeof payload === "object" ? payload : null;
  } catch {
    easyForQcUatStateSeedCache = null;
  }
  return easyForQcUatStateSeedCache;
}

function seededPromptDefaults() {
  const seed = readEasyForQcUatStateSeed();
  const defaults = seed?.promptDefaults && typeof seed.promptDefaults === "object" ? seed.promptDefaults : {};
  return {
    promptGuidelines: asText(defaults.promptGuidelines),
    stopConditionGuidelines: asText(defaults.stopConditionGuidelines),
    writingStyle: asText(defaults.writingStyle),
    testCaseGuidelines: asText(defaults.testCaseGuidelines),
    testDesignGuidelines: asText(defaults.testDesignGuidelines),
    improvementNotes: asText(defaults.improvementNotes),
  };
}

function mergeSeededAiPromptDefaults(aiSettings = {}) {
  const normalized = normalizeAiSettings(aiSettings);
  const defaults = seededPromptDefaults();
  const fields = ["promptGuidelines", "stopConditionGuidelines", "writingStyle", "testCaseGuidelines", "testDesignGuidelines", "improvementNotes"];
  const hasSeed = fields.some((field) => asText(defaults[field]).trim());
  if (!hasSeed) return normalized;
  const next = { ...normalized };
  for (const field of fields) {
    if (!asText(next[field]).trim() && asText(defaults[field]).trim()) {
      next[field] = defaults[field];
    }
  }
  return next;
}

async function readUserSettings(email) {
  if (!db || !email) {
    return { project: null, credentials: {}, confluenceCredentials: {}, authEntries: [], aiSettings: mergeSeededAiPromptDefaults({}), aiSettingsHistory: [], repoContext: null, knowledgeArticles: [], qaWorkspaceItems: QA_WORKSPACE_MEMORY.get(normalizeEmail(email)) || [] };
  }
  const result = await db.query(
    `
      SELECT project_config, credentials_encrypted, confluence_credentials_encrypted, auth_entries_encrypted, ai_settings_encrypted, ai_settings_history, repo_context_encrypted, knowledge_articles, qa_workspace_items
      FROM user_settings
      WHERE user_email = $1
    `,
    [normalizeEmail(email)],
  );
  const row = result.rows[0];
  return {
    project: row?.project_config || null,
    credentials: decryptSettingsJson(row?.credentials_encrypted),
    confluenceCredentials: decryptSettingsJson(row?.confluence_credentials_encrypted),
    authEntries: normalizeAuthEntries(decryptSettingsJson(row?.auth_entries_encrypted)),
    aiSettings: mergeSeededAiPromptDefaults(decryptSettingsJson(row?.ai_settings_encrypted)),
    aiSettingsHistory: normalizeAiSettingsHistory(row?.ai_settings_history),
    repoContext: decryptSettingsJson(row?.repo_context_encrypted),
    knowledgeArticles: normalizeKnowledgeArticles(row?.knowledge_articles),
    qaWorkspaceItems: normalizeQaWorkspaceItems(row?.qa_workspace_items),
  };
}

async function requestUserSettings(req) {
  return readUserSettings(req.session?.email);
}

function mergeCredentialsWithStored(incoming = {}, stored = {}) {
  const current = normalizeCredentials(incoming);
  const saved = normalizeCredentials(stored);
  return {
    enabled: current.enabled,
    user: current.user || saved.user,
    password: current.password || saved.password,
    token: current.token || saved.token,
  };
}

function mergeConfluenceCredentialsWithStored(incoming = {}, stored = {}) {
  const current = normalizeConfluenceCredentials(incoming);
  const saved = normalizeConfluenceCredentials(stored);
  return {
    enabled: current.enabled,
    baseUrl: current.baseUrl || saved.baseUrl,
    user: current.user || saved.user,
    password: current.password || saved.password,
    token: current.token || saved.token,
  };
}

function mergeAuthEntriesWithStored(incoming = [], stored = []) {
  const savedById = new Map(normalizeAuthEntries(stored).map((entry) => [entry.id, entry]));
  return normalizeAuthEntries(incoming).map((entry) => {
    const saved = savedById.get(entry.id) || {};
    return {
      ...entry,
      password: entry.password || saved.password || "",
      token: entry.token || saved.token || "",
    };
  });
}

function mergeAiSettingsWithStored(incoming = {}, stored = {}) {
  const current = normalizeAiSettings(incoming);
  const saved = normalizeAiSettings(stored);
  return {
    ...current,
    apiKey: current.apiKey || saved.apiKey,
    knowledge: {
      ...current.knowledge,
      apiKey: current.knowledge.apiKey || saved.knowledge.apiKey,
    },
  };
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
    res.setHeader("Set-Cookie", sessionCookie(createSessionToken(user), SESSION_MAX_AGE_SECONDS, req));
    res.json({ authenticated: true, user: user.email, email: user.email });
    return;
  }
  if (!safeEqual(email, APP_ADMIN_EMAIL) || !safeEqual(password, APP_PASSWORD)) {
    res.status(401).json({ error: "Email hoặc password không đúng." });
    return;
  }
  res.setHeader("Set-Cookie", sessionCookie(createSessionToken(email), SESSION_MAX_AGE_SECONDS, req));
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
  res.setHeader("Set-Cookie", namedCookie(GOOGLE_OAUTH_STATE_COOKIE, state, 10 * 60, req));
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
      sessionCookie(createSessionToken(user), SESSION_MAX_AGE_SECONDS, req),
      namedCookie(GOOGLE_OAUTH_STATE_COOKIE, "", 0, req),
    ]);
    res.redirect("/");
  } catch (error) {
    redirectWithAuthError(res, error instanceof Error ? error.message : "Google login failed.");
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.setHeader("Set-Cookie", sessionCookie("", 0, req));
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

app.get("/api/download-file", async (req, res) => {
  try {
    const filePath = path.resolve(asText(req.query.path));
    if (!filePath || !isAllowedDownloadPath(filePath)) {
      res.status(403).json({ error: "File download chỉ cho phép trong thư mục output QA của app." });
      return;
    }
    await fs.access(filePath);
    res.download(filePath, path.basename(filePath));
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/view-file", async (req, res) => {
  try {
    const filePath = path.resolve(asText(req.query.path));
    if (!filePath || !isAllowedDownloadPath(filePath)) {
      res.status(403).json({ error: "File view chỉ cho phép trong thư mục output QA của app." });
      return;
    }
    await fs.access(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentTypes = {
      ".html": "text/html; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".yml": "text/yaml; charset=utf-8",
      ".yaml": "text/yaml; charset=utf-8",
      ".txt": "text/plain; charset=utf-8",
      ".log": "text/plain; charset=utf-8",
    };
    res.type(contentTypes[extension] || "application/octet-stream");
    res.sendFile(filePath);
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/user-settings", async (req, res) => {
  try {
    if (!db) {
      res.json({ project: null, credentials: null, confluenceCredentials: null, authEntries: [], aiSettings: null, aiSettingsHistory: [], repoContext: null, knowledgeArticles: [], qaWorkspaceItems: normalizeQaWorkspaceItems(QA_WORKSPACE_MEMORY.get(normalizeEmail(req.session?.email)) || []) });
      return;
    }
    res.json(publicUserSettings(await requestUserSettings(req)));
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
    const hasAuthEntries = Object.prototype.hasOwnProperty.call(body, "authEntries");
    const hasAiSettings = Object.prototype.hasOwnProperty.call(body, "aiSettings");
    const hasRepoContext = Object.prototype.hasOwnProperty.call(body, "repoContext");
    const stored = await readUserSettings(email);
    const project = hasProject ? normalizeProject(body.project) : stored.project || {};
    const credentials = hasCredentials
      ? mergeCredentialsWithStored(body.credentials, stored.credentials)
      : normalizeCredentials(stored.credentials);
    const confluenceCredentials = hasConfluenceCredentials
      ? mergeConfluenceCredentialsWithStored(body.confluenceCredentials, stored.confluenceCredentials)
      : normalizeConfluenceCredentials(stored.confluenceCredentials);
    const authEntries = hasAuthEntries
      ? mergeAuthEntriesWithStored(body.authEntries, stored.authEntries)
      : normalizeAuthEntries(stored.authEntries);
    const aiSettings = hasAiSettings
      ? mergeAiSettingsWithStored(body.aiSettings, stored.aiSettings)
      : normalizeAiSettings(stored.aiSettings);
    const repoContext = hasRepoContext ? normalizeRepoContext(body.repoContext) : stored.repoContext || {};
    const previousAiSettings = normalizeAiSettings(stored.aiSettings);
    const historyMeta = body.historyMeta || {};
    const historyEntry = hasAiSettings
      ? buildAiSettingsHistoryEntry(previousAiSettings, aiSettings, {
          section: body.settingsSection,
          source: historyMeta.source,
          summary: historyMeta.summary,
        })
      : null;
    const aiSettingsHistory = historyEntry
      ? normalizeAiSettingsHistory([historyEntry, ...(stored.aiSettingsHistory || [])])
      : normalizeAiSettingsHistory(stored.aiSettingsHistory);
    await db.query(
      `
        INSERT INTO user_settings (user_email, project_config, credentials_encrypted, confluence_credentials_encrypted, auth_entries_encrypted, ai_settings_encrypted, ai_settings_history, repo_context_encrypted)
        VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7::jsonb, $8)
        ON CONFLICT (user_email)
        DO UPDATE SET
          project_config = EXCLUDED.project_config,
          credentials_encrypted = EXCLUDED.credentials_encrypted,
          confluence_credentials_encrypted = EXCLUDED.confluence_credentials_encrypted,
          auth_entries_encrypted = EXCLUDED.auth_entries_encrypted,
          ai_settings_encrypted = EXCLUDED.ai_settings_encrypted,
          ai_settings_history = EXCLUDED.ai_settings_history,
          repo_context_encrypted = EXCLUDED.repo_context_encrypted,
          updated_at = NOW()
      `,
      [
        email,
        JSON.stringify(project),
        encryptSettingsJson(credentials),
        encryptSettingsJson(confluenceCredentials),
        encryptSettingsJson(authEntries),
        encryptSettingsJson(aiSettings),
        JSON.stringify(aiSettingsHistory),
        encryptSettingsJson(repoContext),
      ],
    );
    res.json({ saved: true, ...publicUserSettings({ project, credentials, confluenceCredentials, authEntries, aiSettings, aiSettingsHistory, repoContext }) });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/knowledge/generate", async (req, res) => {
  try {
    const body = req.body || {};
    const topic = asText(body.topic);
    if (!topic) {
      res.status(400).json({ error: "Cần nhập chủ đề kiến thức QA cần tạo." });
      return;
    }
    const stored = await requestUserSettings(req);
    const storedKnowledgeSettings = normalizeAiSettings(stored.aiSettings).knowledge;
    const incomingKnowledgeSettings = normalizeKnowledgeAiSettings(body.aiSettings);
    const knowledgeAiSettings = {
      ...incomingKnowledgeSettings,
      apiKey: incomingKnowledgeSettings.apiKey || storedKnowledgeSettings.apiKey,
    };
    if (!knowledgeAiSettings.enabled || !aiProviderReady(knowledgeAiSettings)) {
      res.status(400).json({
        error: "Cần bật Knowledge AI Settings và cấu hình đủ model/API key trước khi tạo bài viết kiến thức.",
      });
      return;
    }
    const messages = buildKnowledgeArticleMessages({
      topic,
      category: asText(body.category),
      audience: asText(body.audience),
      notes: asText(body.notes),
      language: body.language === "en" ? "en" : "vi",
      settings: knowledgeAiSettings,
    });
    const result = await callOpenAiCompatible(knowledgeAiSettings, messages);
    const article = normalizeGeneratedKnowledgeArticle(result.payload, {
      topic,
      category: asText(body.category),
      language: body.language === "en" ? "en" : "vi",
    });
    res.json({
      article,
      aiProvider: aiProviderResponseMeta(knowledgeAiSettings, true, "", result.usage),
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/knowledge/articles", async (req, res) => {
  try {
    if (!db) {
      res.status(400).json({ error: "Database chưa bật nên chưa thể lưu kiến thức QA." });
      return;
    }
    const email = normalizeEmail(req.session.email);
    const stored = await readUserSettings(email);
    const article = normalizeKnowledgeArticle({
      ...req.body?.article,
      id: req.body?.article?.id || crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      createdAt: req.body?.article?.createdAt || new Date().toISOString(),
    });
    if (!article.title || !article.content) {
      res.status(400).json({ error: "Cần title và content trước khi lưu kiến thức QA." });
      return;
    }
    const currentArticles = normalizeKnowledgeArticles(stored.knowledgeArticles);
    const nextArticles = [article, ...currentArticles.filter((item) => item.id !== article.id)].slice(0, 200);
    await db.query(
      `
        INSERT INTO user_settings (user_email, knowledge_articles)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (user_email)
        DO UPDATE SET knowledge_articles = EXCLUDED.knowledge_articles,
                      updated_at = NOW()
      `,
      [email, JSON.stringify(nextArticles)],
    );
    res.json({ saved: true, article, knowledgeArticles: nextArticles });
  } catch (error) {
    sendError(res, error);
  }
});

function asText(value) {
  return String(value ?? "").trim();
}

const URL_TEXT_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)]+\)/gi;

function stripReferenceUrls(value) {
  return asText(value)
    .replace(MARKDOWN_LINK_PATTERN, "$1")
    .replace(URL_TEXT_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isReferenceOnlyLine(value) {
  const text = asText(value);
  const normalized = normalizeSearchText(stripReferenceUrls(text))
    .replace(/[:：|()[\]{}<>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return /(?:https?:\/\/|www\.)/i.test(text);
  if (
    /^(repo|repository|source|source code|gitlab|github|link|links|url|urls|pr|mr|merge request|pull request|document link|doc link|docs|jira link|task link|attachment|attachments|screenshot|image|page id)(\s+[\w./-]+)?$/.test(
      normalized,
    )
  ) {
    return true;
  }
  return /^(repo|repository|source|link|url|pr|mr|docs?)\s*[:：-]\s*(?:https?:\/\/|www\.)/i.test(text);
}

function cleanContextLine(line) {
  if (isReferenceOnlyLine(line)) return "";
  let text = asText(line)
    .replace(/<[^>]+>/g, " ")
    .replace(MARKDOWN_LINK_PATTERN, "$1")
    .replace(URL_TEXT_PATTERN, " ")
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
      "repo",
      "repository",
      "source",
      "source code",
      "link",
      "url",
      "note",
      "ghi chu",
      "requirement",
      "boi canh",
      "context",
      "background",
      "steps",
      "step",
      "test data",
      "expected result",
      "ket qua mong doi",
    ].includes(headingOnly)
  ) {
    return "";
  }
  const headingWithContent = text.match(/^(mục tiêu|objective|acceptance criteria|user story|scope|phạm vi|requirement|bối cảnh|context|background)\s*[:：]\s*(.+)$/i);
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
    .replace(/[đĐ]/g, "d")
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
  const tokens = normalizeSearchText(value).match(/[a-z0-9]{3,}/g) || [];
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

function documentSignalScore(line, keywords = []) {
  const normalized = normalizeSearchText(line);
  const keywordScore = keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0);
  const toolScore = (line.match(/\b[a-z][a-z0-9_]*_tool\b/g) || []).length * 4;
  const contractScore = [
    "origin_selection_key",
    "destination_selection_key",
    "price_options",
    "surcharge",
    "meal_info",
    "discount_type",
    "resource_id",
    "SeatTemplateId",
    "route_stop",
    "Synthetic",
    "Hành trình ngược chiều",
    "passenger_count",
    "num_tickets",
    "ticket_quantity",
    "seat_group",
    "bus_stop_id",
  ].reduce((total, marker) => total + (line.includes(marker) || normalized.includes(normalizeSearchText(marker)) ? 3 : 0), 0);
  const exampleScore = /\b(ví dụ|example|sample|contract|runtime|source-of-truth|fallback|validation)\b/i.test(line) ? 2 : 0;
  return keywordScore + toolScore + contractScore + exampleScore;
}

function extractDocToolNames(docContext, limit = 10) {
  return dedupeStrings(asText(docContext).match(/\b[a-z][a-z0-9_]*_tool\b/g) || []).slice(0, limit);
}

function selectRelevantDocLines(docContext, anchorText, limit = 10) {
  const lines = uniqueLines(compactLines(docContext, 260), 160);
  if (!lines.length) return [];
  const keywords = keywordsFrom(anchorText, 40);
  if (!keywords.length) return lines.slice(0, Math.min(limit, 3));
  const ranked = lines
    .map((line) => {
      const score = documentSignalScore(line, keywords);
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
  const docLines = selectRelevantDocLines(rawDoc, anchorText, 12);
  const docToolNames = extractDocToolNames(rawDoc);
  const primaryLines = uniqueLines([...issueLines, ...qaNoteLines], 14);
  return {
    summary,
    description,
    issueLines,
    qaNoteLines,
    docLines,
    docToolNames,
    docContextLength: rawDoc.length,
    primaryLines: primaryLines.length ? primaryLines : [summary || "Phạm vi task"],
    docContextApplied: Boolean(docLines.length),
    docContextIgnored: Boolean(rawDoc && !docLines.length),
  };
}

const QA_EVIDENCE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".vue",
  ".py",
  ".rb",
  ".go",
  ".java",
  ".kt",
  ".php",
  ".md",
  ".json",
  ".yaml",
  ".yml",
  ".feature",
  ".txt",
]);

const QA_EVIDENCE_EXCLUDED_DIRS = new Set([
  ".git",
  ".idea",
  ".vscode",
  ".next",
  ".nuxt",
  ".cache",
  ".qa-runs",
  "coverage",
  "dist",
  "build",
  "node_modules",
  "__pycache__",
  ".venv",
  "venv",
]);

function detectTaskSignals(issue, context, archetypeKey) {
  const rawText = `${issue.summary} ${issue.description} ${issue.issue_type} ${context.docLines.join(" ")}`;
  const text = normalizeSearchText(rawText);
  const signals = [];
  const add = (id, label, reason, strength = 1) => {
    if (signals.some((item) => item.id === id)) return;
    signals.push({ id, label, reason, strength });
  };

  if (/\b(ui|screen|display|show|badge|indicator|highlight|bubble|modal|form|button)\b/.test(text) || /hien thi|lam noi bat|giao dien/.test(text)) {
    add("ui_surface", "UI surface", "Task thay đổi cách hiển thị hoặc trạng thái thị giác.");
  }
  if (/conversation stream|chat stream|message stream|tin nhan|cặp message|cap message|bubble/.test(text)) {
    add("message_stream", "Message stream", "Behavior nằm trong luồng chat/message nên cần kiểm mapping theo vị trí message.");
  }
  const hasScoreSubject = /amr|score|diem|điểm|vi pham|vi phạm/.test(text);
  const hasScoreStateTerm = /threshold|nguong|ngưỡng|low|fail|pass/.test(text);
  if (hasScoreSubject || (hasScoreStateTerm && /badge|highlight|indicator|danh gia|đánh giá|score/.test(text))) {
    add("score_state", "Score state matrix", "Output phụ thuộc score/trạng thái đánh giá nên cần bảng quyết định.");
  }
  if (/mapping|map|binding|pair|cap message|cặp message|ngay sau|field|payload|contract|selection_key|tool input|tool output/.test(text)) {
    add("field_mapping", "Field/message mapping", "Rủi ro chính là gắn sai source-of-truth vào UI/output.");
  }
  if (/\b(event|trace|metadata|telemetry|langfuse|log|logging)\b|ghi nhan event|ghi nhận event|on_[a-z0-9_]+/.test(text)) {
    add("event_logging", "Event/logging contract", "Task yêu cầu ghi nhận event/log/metadata nên cần kiểm payload và điều kiện phát sinh.");
  }
  if (/decision|outcome|classif|phan loai|phân loại|routing|route|n8n|create|update|patch|post|tao moi|tạo mới|cap nhat|cập nhật/.test(text)) {
    add("downstream_decision", "Downstream decision/routing", "Task có nhánh phân loại hoặc routing downstream nên cần bảng quyết định outcome.");
  }
  if (/fuzzy|chunk|section|article_sections|difflib|sequencematcher|threshold|similarity|markdown heading|heading|mapping.*section/.test(text)) {
    add("fuzzy_matching", "Fuzzy/matching algorithm", "Task có mapping theo thuật toán hoặc threshold nên cần kiểm match, mismatch và boundary.");
  }
  if (/audit|reasoning|review|ly do|lý do|reason|giai thich|giải thích/.test(text)) {
    add("audit_reasoning", "Audit/reasoning record", "Task yêu cầu lưu lý do/quyết định để review nên cần kiểm dữ liệu audit.");
  }
  if (/empty|null|missing|chua co|chưa có|khong xac dinh|không xác định|error|loi|lỗi|timeout|unavailable|partial/.test(text)) {
    add("fallback_state", "Fallback and empty/error states", "Task có yêu cầu xử lý missing/error/empty rõ ràng.");
  }
  if (/reload|refresh|realtime|real-time|live|delayed|den tre|đến trễ|pagination|stream/.test(text)) {
    add("refresh_stability", "Refresh/realtime stability", "Dữ liệu có thể thay đổi sau khi màn hình đã tải.");
  }
  if (/\b(api|callback|webhook|endpoint|payload|bms|vcms|tool)\b/.test(text)) {
    add("integration_contract", "Integration contract", "Task phụ thuộc API/tool/downstream contract.");
  }
  if (/retry|duplicate|idempotent|lap lai|lặp lại|gui lai|gửi lại/.test(text)) {
    add("retry_duplicate", "Retry/duplicate safety", "Có khả năng cùng event/action được gửi lại.");
  }
  if (/role|permission|quyen|quyền|\bce\b|agent|admin|team|inbox/.test(text)) {
    add("role_access", "Role/access matrix", "Behavior có actor/role cụ thể nên cần kiểm quyền truy cập hoặc visibility.");
  }
  if (context.docContextApplied || context.docToolNames.length) {
    add("doc_grounding", "Doc grounding", "Doc đã được cung cấp và có dòng liên quan tới Jira scope.", 0.8);
  }
  if (archetypeKey === "bugfix") {
    add("bug_regression", "Bug-history regression", "Task là bug/fix nên phải tái hiện failure shape và nearby regression.");
  }

  return signals;
}

function uniqueTechniqueList(items) {
  return dedupeStrings(arrayFromMaybe(items).map(asText).filter(Boolean));
}

function selectQaTechniques(archetype, signals) {
  const ids = new Set(signals.map((item) => item.id));
  const primary = uniqueTechniqueList(archetype.primary);
  const supporting = uniqueTechniqueList(archetype.supporting);
  const failSafe = [];
  const addPrimary = (technique) => {
    if (!primary.includes(technique)) primary.push(technique);
  };
  const addSupporting = (technique) => {
    if (!primary.includes(technique) && !supporting.includes(technique)) supporting.push(technique);
  };
  const addFailSafe = (technique) => {
    if (!failSafe.includes(technique)) failSafe.push(technique);
  };

  if (ids.has("score_state")) {
    addPrimary("Decision table");
    addSupporting("Boundary value analysis");
  }
  if (ids.has("field_mapping") || ids.has("message_stream")) {
    addPrimary("Integration contract / field mapping");
  }
  if (ids.has("event_logging")) {
    addPrimary("Integration contract / field mapping");
    addSupporting("Observability/log validation");
  }
  if (ids.has("downstream_decision")) {
    addPrimary("Decision table");
    addSupporting("State transition");
  }
  if (ids.has("fuzzy_matching")) {
    addSupporting("Boundary value analysis");
    addFailSafe("Fallback / partial failure / recovery");
  }
  if (ids.has("audit_reasoning")) {
    addSupporting("Risk-based regression");
  }
  if (ids.has("ui_surface") || ids.has("refresh_stability")) {
    addSupporting("Realtime / refresh / pagination stability");
    addSupporting("Risk-based regression");
  }
  if (ids.has("fallback_state") || ids.has("doc_grounding")) {
    addFailSafe("Fallback / partial failure / recovery");
  }
  if (ids.has("retry_duplicate")) {
    addFailSafe("Retry / idempotency / duplicate event");
  }
  if (ids.has("role_access")) {
    addSupporting("Permission / role matrix");
  }
  if (ids.has("bug_regression")) {
    addPrimary("Error guessing / bug-history based");
    addSupporting("Risk-based regression");
  }

  return {
    primary: primary.slice(0, 3),
    supporting: supporting.slice(0, 5),
    fail_safe: failSafe.slice(0, 3),
    all: uniqueTechniqueList([...primary, ...supporting, ...failSafe]),
  };
}

function coverageAxis(id, title, technique, risk, scenarioType, checks = [], inputs = []) {
  return {
    id,
    title,
    technique,
    risk,
    scenario_type: scenarioType,
    checks,
    inputs,
  };
}

function buildCoverageAxes(issue, archetype, context, signals, techniques) {
  const key = issue.key || "JIRA-TASK";
  const ids = new Set(signals.map((item) => item.id));
  const hasMessageContext = ids.has("message_stream") || ids.has("score_state");
  const axes = [];
  const summaryIntent = titleFromIntent(context.summary || issue.summary || "behavior chính");
  const representativeInput = hasMessageContext
    ? `Conversation có message đại diện cho: ${summaryIntent}`
    : ids.has("integration_contract")
      ? `Payload/request đại diện cho: ${summaryIntent}`
      : `Dataset hoặc màn hình đại diện cho: ${summaryIntent}`;

  axes.push(
    coverageAxis(
      "primary_business_rule",
      `${summaryIntent} đúng scope Jira`,
      techniques.primary[0] || archetype.primary[0] || "Use-case / scenario flow",
      "Main business rule pass thiếu nếu chỉ kiểm UI/output hời hợt.",
      "happy_path",
      [
        "Behavior chính khớp Jira summary/description và acceptance criteria.",
        "Không mở rộng sang flow ngoài scope.",
        "Tester đối chiếu được source-of-truth thay vì chỉ nhìn text hiển thị.",
      ],
      [`Build chứa task ${key}.`, representativeInput],
    ),
  );

  if (ids.has("score_state")) {
    axes.push(
      coverageAxis(
        "score_decision_matrix",
        "Score pass, low, fail, missing và error hiển thị đúng state",
        "Decision table",
        "Sai state badge/highlight làm CE debug nhầm message hoặc bỏ qua vi phạm.",
        "decision_table",
        [
          "Pass/normal không bị highlight như lỗi.",
          "Low/fail có indicator đủ rõ và đúng vị trí.",
          "Missing/error state hiển thị rõ thay vì im lặng ẩn mất.",
        ],
        [
          "AMR score pass trên ngưỡng.",
          "AMR score dưới ngưỡng hoặc fail.",
          "Không có score, mapping lỗi hoặc API trả lỗi.",
        ],
      ),
    );
  }

  if (ids.has("message_stream")) {
    axes.push(
      coverageAxis(
        "message_pair_mapping",
        "Score/highlight gắn đúng CE message ngay sau AI",
        "Integration contract / field mapping",
        "Mapping sai cặp AI -> CE làm UI báo lỗi đúng dữ liệu nhưng sai message.",
        "mapping",
        [
          "Score gắn với đúng CE follow-up đứng sau AI tương ứng.",
          "Message không thuộc cặp đánh giá không bị badge/highlight.",
          "Khi có nhiều cặp AI/CE liên tiếp, binding không bị lệch dòng.",
        ],
        [
          "Conversation có ít nhất 2 cặp AI -> CE liên tiếp.",
          "Một cặp pass và một cặp fail/low để đối chiếu vị trí.",
        ],
      ),
    );
  } else if (ids.has("field_mapping")) {
    axes.push(
      coverageAxis(
        "field_mapping_guardrail",
        "Mapping field/source-of-truth đúng với output hiển thị",
        "Integration contract / field mapping",
        "Mapping sai field làm UI/output nhìn có vẻ đúng nhưng lệch source-of-truth.",
        "mapping",
        [
          "Field hiển thị lấy đúng từ source-of-truth hiện hành.",
          "Không áp dụng nhầm field legacy hoặc field của entity khác.",
          "Partial/missing field không làm hệ thống bịa dữ liệu.",
        ],
        [
          "Record có đủ field hợp lệ.",
          "Record thiếu field optional hoặc có field legacy dễ nhầm.",
        ],
      ),
    );
  }

  if (ids.has("event_logging")) {
    axes.push(
      coverageAxis(
        "event_payload_contract",
        "Event/log payload ghi nhận đúng điều kiện và đủ context",
        "Integration contract / field mapping",
        "Event thiếu field hoặc bị log sai điều kiện sẽ làm downstream phân tích sai hoặc mất khả năng audit.",
        "mapping",
        [
          "Event chỉ được ghi khi đúng điều kiện phát sinh trong Jira.",
          "Payload có đủ reference chính như session/conversation, request, response/context và source-of-truth liên quan.",
          "Metadata/log không bị mất field, sai kiểu dữ liệu hoặc ghi nhầm context cũ.",
        ],
        [
          "Scenario có event hợp lệ cần ghi nhận.",
          "Scenario không đủ điều kiện để kiểm không log false positive.",
          "Payload/log mẫu để đối chiếu từng field.",
        ],
      ),
    );
  }

  if (ids.has("downstream_decision")) {
    axes.push(
      coverageAxis(
        "downstream_decision_routing",
        "Downstream decision chọn đúng outcome và route xử lý",
        "Decision table",
        "Sai nhánh create/update/route hoặc outcome làm hệ thống xử lý nhầm action phía sau.",
        "decision_table",
        [
          "Mỗi điều kiện chính map đúng một outcome/action.",
          "Outcome có đủ dữ liệu để gọi đúng API, workflow hoặc bước xử lý tiếp theo.",
          "Trường hợp ambiguous/missing được xử lý fail-safe thay vì tự đoán.",
        ],
        [
          "Input khớp entity/document/record hiện có.",
          "Input không tìm thấy entity/document/record phù hợp.",
          "Input ambiguous hoặc source-of-truth trả partial.",
        ],
      ),
    );
  }

  if (ids.has("fuzzy_matching")) {
    axes.push(
      coverageAxis(
        "fuzzy_matching_section_mapping",
        "Fuzzy/matching map đúng source section và xử lý threshold",
        "Boundary value analysis",
        "Thuật toán matching chọn nhầm section hoặc pass sai threshold khiến downstream cập nhật nhầm nội dung.",
        "boundary",
        [
          "Chunk/input đã normalize vẫn match đúng section/source tương ứng.",
          "Case dưới ngưỡng hoặc không match không được tự gán vào source sai.",
          "Nhiều chunk/section trùng hoặc gần giống được deduplicate và giữ đúng context.",
        ],
        [
          "Input match rõ source section.",
          "Input mất markdown/newline hoặc bị normalize.",
          "Input dưới threshold, duplicate hoặc gần giống nhiều section.",
        ],
      ),
    );
  }

  if (ids.has("ui_surface")) {
    const messageUiAxis = hasMessageContext;
    axes.push(
      messageUiAxis
        ? coverageAxis(
            "ui_density_regression",
            "Indicator scan nhanh nhưng không làm rối conversation stream",
            "Risk-based regression",
            "UI đúng dữ liệu nhưng gây nhiễu hoặc phá layout chat stream.",
            "ui_regression",
            [
              "Badge/indicator đủ gần message CE để hiểu score thuộc cặp nào.",
              "Long message, nhiều metadata hoặc nhiều badge không overlap.",
              "Conversation thường vẫn đọc được và không bị quá tải thị giác.",
            ],
            [
              "Conversation có message ngắn, message dài và nhiều metadata.",
              "Có cả message bình thường và message bị đánh giá vi phạm.",
            ],
          )
        : coverageAxis(
            "ui_surface_regression",
            "UI hiển thị rõ và không phá layout hiện có",
            "Risk-based regression",
            "UI đúng logic nhưng khó scan, overlap hoặc làm lệch layout hiện có.",
            "ui_regression",
            [
              "Nội dung/trạng thái mới hiển thị đúng vị trí và đúng wording.",
              "Text dài, dữ liệu rỗng hoặc metadata phụ không gây overlap.",
              "Luồng thao tác cũ trên cùng màn hình vẫn đọc và dùng được.",
            ],
            [
              "Màn hình có dữ liệu thường và dữ liệu dài.",
              "Viewport hoặc trạng thái UI gần với production.",
            ],
          ),
    );
  }

  if (ids.has("fallback_state")) {
    const messageFallbackAxis = hasMessageContext;
    axes.push(
      messageFallbackAxis
        ? coverageAxis(
            "empty_error_fallback",
            "Empty/error/mapping lỗi được hiển thị rõ và fail-safe",
            "Fallback / partial failure / recovery",
            "Ẩn im lặng khi score chưa có hoặc mapping lỗi khiến QA/CE tưởng không có vấn đề.",
            "fallback",
            [
              "Score chưa có hiển thị empty/loading state đúng quy ước.",
              "API lỗi hoặc mapping ambiguous có error state rõ.",
              "Không tự dựng score/highlight nếu source-of-truth không xác định.",
            ],
            [
              "AMR score chưa được trả về.",
              "Mapping id giữa AI message và CE message không xác định.",
              "API score trả lỗi hoặc timeout.",
            ],
          )
        : coverageAxis(
            "empty_error_fallback",
            "Empty/error/missing data được xử lý rõ và fail-safe",
            "Fallback / partial failure / recovery",
            "Ẩn im lặng khi dữ liệu chưa có hoặc dependency lỗi làm QA/CE hiểu nhầm trạng thái.",
            "fallback",
            [
              "Dữ liệu chưa có hiển thị empty/loading state đúng quy ước.",
              "API/dependency lỗi có error state rõ.",
              "Không tự dựng giá trị hiển thị nếu source-of-truth không xác định.",
            ],
            [
              "Dataset không có record phù hợp.",
              "API/dependency trả lỗi, timeout hoặc partial response.",
            ],
          ),
    );
  }

  if (ids.has("refresh_stability")) {
    const messageRefreshAxis = hasMessageContext;
    axes.push(
      messageRefreshAxis
        ? coverageAxis(
            "refresh_realtime_stability",
            "Refresh/reload hoặc dữ liệu đến trễ vẫn giữ đúng binding",
            "Realtime / refresh / pagination stability",
            "Score đến sau hoặc reload làm badge/highlight biến mất hoặc nhảy sang message khác.",
            "state_transition",
            [
              "Sau reload, badge/highlight vẫn khớp đúng message.",
              "Khi score đến trễ, UI cập nhật đúng state mà không cần rời màn hình nếu hệ thống hỗ trợ.",
              "Không duplicate indicator sau nhiều lần refresh.",
            ],
            [
              "Conversation load trước, AMR score có sau.",
              "Reload conversation sau khi score đã có.",
            ],
          )
        : coverageAxis(
            "refresh_realtime_stability",
            "Refresh/reload hoặc dữ liệu đến trễ vẫn giữ đúng state",
            "Realtime / refresh / pagination stability",
            "Dữ liệu đến sau hoặc reload làm UI mất state, stale data hoặc duplicate indicator.",
            "state_transition",
            [
              "Sau reload, UI vẫn hiển thị đúng trạng thái mới.",
              "Khi dữ liệu đến trễ, UI cập nhật đúng nếu hệ thống hỗ trợ.",
              "Không duplicate indicator/record sau nhiều lần refresh.",
            ],
            [
              "Màn hình load trước khi dữ liệu sẵn sàng.",
              "Reload màn hình sau khi dữ liệu đã có.",
            ],
          ),
    );
  }

  if (ids.has("integration_contract")) {
    axes.push(
      coverageAxis(
        "integration_contract_guardrail",
        "Contract input/output không lệch field hoặc source-of-truth",
        "Integration contract / field mapping",
        "Backend/API/tool trả đúng dữ liệu nhưng UI/generator đọc sai field.",
        "mapping",
        [
          "Required fields được đọc từ source-of-truth đúng tên.",
          "Không dùng field legacy nếu Jira/doc đã chỉ rõ contract mới.",
          "Partial response không làm UI/output bịa dữ liệu.",
        ],
        ["API/tool/downstream response có đủ happy path, missing field và partial field."],
      ),
    );
  }

  if (ids.has("retry_duplicate")) {
    axes.push(
      coverageAxis(
        "retry_duplicate_guardrail",
        "Retry hoặc duplicate event không tạo trùng dữ liệu/state",
        "Retry / idempotency / duplicate event",
        "Cùng action/event chạy lại có thể nhân đôi badge, record hoặc state.",
        "retry",
        [
          "Retry không tạo duplicate indicator/record.",
          "State cuối vẫn khớp source-of-truth mới nhất.",
          "Log/downstream không có side effect ngoài scope.",
        ],
        ["Gửi lại cùng event/action hoặc refresh liên tiếp nhiều lần."],
      ),
    );
  }

  if (ids.has("audit_reasoning")) {
    axes.push(
      coverageAxis(
        "audit_reasoning_record",
        "Decision/reasoning được lưu đủ để audit và review",
        "Risk-based regression",
        "Không lưu hoặc lưu thiếu reasoning khiến team không review được vì sao hệ thống chọn outcome.",
        "regression",
        [
          "Decision cuối cùng được lưu cùng reasoning ngắn gọn và source reference liên quan.",
          "Reasoning không chứa thông tin bịa hoặc mâu thuẫn với source-of-truth.",
          "Reviewer có thể truy vết từ record/audit log về input ban đầu.",
        ],
        [
          "Scenario có decision rõ ràng cần lưu reasoning.",
          "Scenario fallback/error vẫn cần audit trail tối thiểu.",
        ],
      ),
    );
  }

  if (!axes.some((axis) => axis.scenario_type === "fallback")) {
    axes.push(
      coverageAxis(
        "generic_missing_data",
        "Thiếu dữ liệu bắt buộc được xử lý rõ ràng",
        techniques.supporting[0] || "Equivalence partitioning",
        "Thiếu dữ liệu bắt buộc có thể làm task pass happy path nhưng fail production.",
        "missing_data",
        ["Null/empty/missing input không crash.", "Hệ thống không tạo output sai.", "Thông báo hoặc trạng thái lỗi đủ rõ để QA debug."],
        ["Input thiếu một required field hoặc dataset không có record phù hợp."],
      ),
    );
  }

  axes.push(
    coverageAxis(
      "nearby_regression",
      "Luồng cũ cùng module không bị ảnh hưởng",
      "Risk-based regression",
      "Thay đổi mới phá behavior lân cận dù scenario chính vẫn pass.",
      "regression",
      [
        "Behavior cũ trong cùng màn hình/module vẫn giữ nguyên.",
        "Không có side effect ngoài Jira scope.",
        "Không phát sinh lỗi layout, mapping hoặc state carry-forward ở luồng lân cận.",
      ],
      ["Dataset/flow cũ gần nhất với scope task nhưng không thuộc thay đổi chính."],
    ),
  );

  return axes.slice(0, 10);
}

function pathList(value) {
  return asText(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergePathRules(...values) {
  return dedupeStrings(values.flatMap((value) => pathList(value))).join("\n");
}

function isPathInside(parent, child) {
  if (!parent || !child) return false;
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return Boolean(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function inferOmniAgentRoot(rootDir) {
  const root = asText(rootDir);
  if (!root) return "";
  const resolved = path.resolve(root);
  if (path.basename(resolved).toLowerCase() === "omniagent") {
    return resolved;
  }
  const nested = path.join(resolved, "knowledge_base", "omniagent");
  if (fsSync.existsSync(nested)) {
    return nested;
  }
  return "";
}

function wildcardToRegExp(pattern) {
  const escaped = escapeRegExp(pattern).replace(/\\\*/g, ".*");
  return new RegExp(`(^|/)${escaped}($|/)`, "i");
}

function pathMatchesRule(relativePath, rules = []) {
  const normalized = relativePath.split(path.sep).join("/");
  return rules.some((rule) => {
    const clean = asText(rule).replace(/^\/+|\/+$/g, "");
    if (!clean) return false;
    if (clean.includes("*")) return wildcardToRegExp(clean).test(normalized);
    return normalized === clean || normalized.startsWith(`${clean}/`) || normalized.includes(`/${clean}/`) || normalized.endsWith(`/${clean}`);
  });
}

function isEvidenceFile(filePath) {
  const basename = path.basename(filePath).toLowerCase();
  if (
    basename.startsWith(".env") ||
    basename.endsWith(".local.json") ||
    /\.(pem|key|p12|pfx|crt|cer)$/i.test(basename) ||
    /(secret|credential|password|token)/i.test(basename)
  ) {
    return false;
  }
  return QA_EVIDENCE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function listEvidenceFiles(rootDir, maxFiles = QA_EVIDENCE_FILE_LIMIT, options = {}) {
  const root = path.resolve(asText(rootDir));
  const includeRules = pathList(options.includePaths);
  const excludeRules = pathList(options.excludePaths);
  const files = [];
  const stack = [root];
  while (stack.length && files.length < maxFiles) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      const fullPath = path.join(current, entry.name);
      const relativePath = path.relative(root, fullPath).split(path.sep).join("/");
      if (entry.isDirectory()) {
        if (!QA_EVIDENCE_EXCLUDED_DIRS.has(entry.name) && !pathMatchesRule(relativePath, excludeRules)) stack.push(fullPath);
        continue;
      }
      if (
        entry.isFile() &&
        isEvidenceFile(fullPath) &&
        !pathMatchesRule(relativePath, excludeRules) &&
        (!includeRules.length || pathMatchesRule(relativePath, includeRules))
      ) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

async function readFileHead(filePath, limit = QA_EVIDENCE_FILE_BYTES) {
  let handle = null;
  try {
    handle = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(limit);
    const { bytesRead } = await handle.read(buffer, 0, limit, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } catch {
    return "";
  } finally {
    if (handle) {
      await handle.close().catch(() => {});
    }
  }
}

function evidenceSnippetsFromText(text, keywords, limit = 3) {
  const priorityTerms = [
    "amr",
    "score",
    "low_amr",
    "on_message",
    "on_ce_message",
    "chatwoot",
    "conversation",
    "message",
    "highlight",
  ];
  const lines = asText(text)
    .split(/\r?\n/)
    .map((line, index) => ({ index: index + 1, text: line.trim() }))
    .filter((line) => line.text.length >= 8 && line.text.length <= 260);
  const scored = [];
  for (const line of lines) {
    const normalized = normalizeSearchText(line.text);
    const keywordHits = keywords.filter((keyword) => normalized.includes(keyword));
    const priorityScore = priorityTerms.reduce((total, term) => {
      if (!normalized.includes(normalizeSearchText(term))) return total;
      if (["amr", "low_amr", "on_message", "on_ce_message", "score"].includes(term)) return total + 18;
      return total + 7;
    }, 0);
    const keywordScore = keywordHits.reduce((total, keyword) => {
      if (["thi", "muc", "tieu", "ngay", "sau", "tin", "gui", "gia", "danh"].includes(keyword)) return total + 0.25;
      if (keyword.length >= 5) return total + 2;
      return total + 1;
    }, 0);
    const markerScore = /\b(test|spec|describe|it\(|expect|component|service|controller|tool|api|message|score|amr|highlight)\b/i.test(line.text)
      ? 2
      : 0;
    const score = keywordScore + priorityScore + markerScore;
    if (score > 0) {
      scored.push({ line: line.index, text: line.text, score });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function evidenceRootDescriptors(repoContext = {}) {
  if (!repoContext.enabled) return [];
  const descriptors = [];
  const seen = new Set();
  const addDescriptor = (descriptor) => {
    const root = asText(descriptor.root);
    if (!root) return;
    const resolved = path.resolve(root);
    if (seen.has(resolved)) return;
    seen.add(resolved);
    descriptors.push({ ...descriptor, root: resolved });
  };

  const envRoot = asText(process.env.QA_EVIDENCE_ROOT);
  if (envRoot) {
    addDescriptor({
      root: inferOmniAgentRoot(envRoot) || envRoot,
      source_type: inferOmniAgentRoot(envRoot) ? "product_omniagent" : "product_repo",
      configured_root: envRoot,
    });
  }

  const productRoot = asText(repoContext.productRepoRoot);
  if (productRoot) {
    const omniAgentRoot = inferOmniAgentRoot(productRoot);
    addDescriptor({
      root: omniAgentRoot || productRoot,
      source_type: omniAgentRoot ? "product_omniagent" : "product_repo",
      configured_root: productRoot,
    });
  }

  const qaReferenceDir = asText(repoContext.qaReferenceDir);
  if (qaReferenceDir) {
    addDescriptor({
      root: qaReferenceDir,
      source_type: "qa_reference",
      configured_root: qaReferenceDir,
    });
  }
  return descriptors;
}

function evidenceIncludePathsFor(descriptor, settings) {
  if (descriptor.source_type === "qa_reference") {
    return "";
  }
  return mergePathRules(settings.includePaths, DEFAULT_REPO_INCLUDE_PATHS);
}

function evidenceExcludePathsFor(descriptor, settings) {
  const excludes = pathList(settings.excludePaths);
  if (descriptor.source_type !== "qa_reference") {
    const qaReferenceDir = asText(settings.qaReferenceDir);
    if (qaReferenceDir && isPathInside(descriptor.root, qaReferenceDir)) {
      excludes.push(path.relative(descriptor.root, qaReferenceDir).split(path.sep).join("/"));
    }
    const nestedQaDir = path.join(descriptor.root, "qa");
    if (fsSync.existsSync(nestedQaDir)) {
      excludes.push("qa");
    }
  }
  return dedupeStrings(excludes).join("\n");
}

function evidencePathSignalScore(relativePath, sourceType) {
  const normalizedPath = relativePath.split(path.sep).join("/");
  const lowerPath = normalizeSearchText(normalizedPath);
  let score = sourceType === "product_omniagent" ? 90 : sourceType === "product_repo" ? 55 : -20;
  const productSignals = [
    [".agent/skills", 24],
    ["bot-quality-audits", 36],
    ["ai-agent-daily-improvement-loop", 34],
    ["audit-conversation", 28],
    ["query-omniagent-conversations", 26],
    ["backfill-langfuse-scores", 24],
    ["system-prompts", 20],
    ["references", 18],
    ["docs", 16],
    ["guides", 16],
    ["sops", 16],
    ["scripts", 12],
    ["config", 12],
    ["src", 10],
    ["app", 10],
    ["tests", 8],
  ];
  for (const [marker, markerScore] of productSignals) {
    if (lowerPath.includes(normalizeSearchText(marker))) score += markerScore;
  }
  if (sourceType !== "qa_reference" && /(^|\/)qa(\/|$)/i.test(normalizedPath)) {
    score -= 120;
  }
  if (sourceType === "qa_reference") {
    if (/(^|\/)jira(\/|$)/i.test(normalizedPath)) score += 8;
    if (/test_cases|test-design|xmind/i.test(normalizedPath)) score += 6;
  }
  return score;
}

function selectEvidenceSnippets(candidates, maxSnippets) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const product = sorted.filter((item) => item.source_type !== "qa_reference");
  const reference = sorted.filter((item) => item.source_type === "qa_reference");
  const referenceCap = product.length ? Math.min(2, Math.max(1, Math.floor(maxSnippets * 0.2))) : maxSnippets;
  const productTarget = Math.max(0, maxSnippets - referenceCap);
  const selected = [];
  selected.push(...product.slice(0, productTarget));
  selected.push(...reference.slice(0, Math.max(0, maxSnippets - selected.length)));
  if (selected.length < maxSnippets) {
    selected.push(...product.slice(productTarget, productTarget + (maxSnippets - selected.length)));
  }
  if (selected.length < maxSnippets) {
    selected.push(...reference.slice(referenceCap, referenceCap + (maxSnippets - selected.length)));
  }
  return selected.slice(0, maxSnippets);
}

async function buildRepoEvidencePack(issue, repoContext, context) {
  const settings = normalizeRepoContext(repoContext);
  if (process.env.QA_REPO_EVIDENCE_DISABLED === "true") {
    return { enabled: false, reason: "disabled_by_env", roots: [], snippets: [] };
  }
  if (!settings.enabled) {
    return { enabled: false, reason: "disabled_in_repo_context_settings", roots: [], snippets: [] };
  }
  const anchorText = [
    issue.key,
    issue.summary,
    issue.description,
    context.qaNoteLines.join("\n"),
    context.docLines.join("\n"),
  ].join("\n");
  const keywords = keywordsFrom(anchorText, 48);
  if (!keywords.length) {
    return { enabled: true, reason: "no_keywords", roots: [], snippets: [] };
  }
  const snippets = [];
  const scannedRoots = [];
  const rootStatus = [];
  const maxSnippets = clampNumber(Number(settings.maxSnippets || QA_EVIDENCE_SNIPPET_LIMIT) || QA_EVIDENCE_SNIPPET_LIMIT, 1, 30);
  const descriptors = evidenceRootDescriptors(settings);
  for (const descriptor of descriptors) {
    const root = descriptor.root;
    try {
      const stat = await fs.stat(root);
      if (!stat.isDirectory()) {
        rootStatus.push({
          root,
          configured_root: descriptor.configured_root,
          source_type: descriptor.source_type,
          exists: false,
          reason: "not_a_directory",
        });
        continue;
      }
    } catch {
      rootStatus.push({
        root,
        configured_root: descriptor.configured_root,
        source_type: descriptor.source_type,
        exists: false,
        reason: "not_found_or_inaccessible",
      });
      continue;
    }
    rootStatus.push({
      root,
      configured_root: descriptor.configured_root,
      source_type: descriptor.source_type,
      exists: true,
      reason: "",
    });
    scannedRoots.push(root);
    const files = await listEvidenceFiles(root, QA_EVIDENCE_FILE_LIMIT, {
      includePaths: evidenceIncludePathsFor(descriptor, settings),
      excludePaths: evidenceExcludePathsFor(descriptor, settings),
    });
    for (const filePath of files) {
      const relativePath = path.relative(root, filePath);
      const pathScore = keywords.reduce((total, keyword) => total + (normalizeSearchText(relativePath).includes(keyword) ? 2 : 0), 0);
      const text = await readFileHead(filePath);
      const lineSnippets = evidenceSnippetsFromText(text, keywords, 3);
      if (!lineSnippets.length) continue;
      const score =
        evidencePathSignalScore(relativePath, descriptor.source_type) +
        pathScore +
        lineSnippets.reduce((total, item) => total + item.score, 0);
      snippets.push({
        root,
        configured_root: descriptor.configured_root,
        source_type: descriptor.source_type,
        path: relativePath,
        score,
        snippets: lineSnippets.map((item) => ({ line: item.line, text: item.text })),
      });
    }
  }
  const selectedSnippets = selectEvidenceSnippets(snippets, maxSnippets);
  return {
    enabled: true,
    roots: scannedRoots,
    root_status: rootStatus,
    keywords: keywords.slice(0, 20),
    include_paths: pathList(settings.includePaths),
    exclude_paths: pathList(settings.excludePaths),
    source_mix: selectedSnippets.reduce((counts, item) => {
      counts[item.source_type] = (counts[item.source_type] || 0) + 1;
      return counts;
    }, {}),
    snippets: selectedSnippets,
  };
}

function buildPreconditionGuidelines(archetypeKey, signals, issue) {
  const ids = new Set(signals.map((item) => item.id));
  const key = issue.key || "task";
  const base = [`Build/môi trường test đã triển khai thay đổi của task ${key}.`];
  if (archetypeKey === "conversation_ui" || ids.has("message_stream")) {
    base.push("QA có conversation test gồm cặp message AI -> CE và dữ liệu AMR/score tương ứng với scenario.");
    base.push("QA có quyền mở conversation stream và log/API mapping nếu cần đối chiếu source-of-truth.");
  } else if (archetypeKey === "chatbot") {
    base.push("QA có conversation/session test phù hợp và có thể xem trace/tool call để đối chiếu.");
  } else if (archetypeKey === "tool_api" || ids.has("integration_contract")) {
    base.push("QA có payload/request mẫu và mock/live downstream response phù hợp với từng scenario.");
  } else if (archetypeKey === "reporting") {
    base.push("QA có dataset test kiểm soát được giá trị hiển thị, trạng thái rỗng và dữ liệu sau refresh.");
  } else {
    base.push("QA có dữ liệu test đại diện cho scenario đang kiểm thử.");
  }
  return {
    base,
    mapping: "Có source-of-truth hoặc log/API response để đối chiếu mapping từng field/message.",
    fallback: "Có thể giả lập hoặc chọn dữ liệu cho trạng thái empty/error/missing tương ứng.",
    boundary: "Có dữ liệu ở hai phía ngưỡng hoặc trạng thái pass/fail để kiểm boundary.",
    regression: "Có một luồng cũ cùng module để xác nhận không bị ảnh hưởng.",
  };
}

function buildCaseStrategy({ issue, archetypeKey, context, signals = [], coverageAxes = [] }) {
  const ids = new Set(signals.map((item) => item.id));
  const mode = workflowMode(issue, archetypeKey);
  const signalScore = Math.min(2, Math.floor(signals.length / 3));
  const axesScore = coverageAxes.length >= 8 ? 2 : coverageAxes.length >= 5 ? 1 : 0;
  const docScore =
    (context.docContextApplied ? 2 : 0) +
    (context.docLines.length >= 8 ? 1 : 0) +
    (context.docToolNames.length ? 1 : 0);
  const modeScore = mode.isConversation || mode.isIntegration || archetypeKey === "workflow" ? 1 : 0;
  const longScopeScore = context.description.length > 1800 ? 1 : 0;
  const specialRiskScore = Math.min(
    2,
    ["event_logging", "downstream_decision", "fuzzy_matching", "audit_reasoning"].filter((id) => ids.has(id)).length,
  );
  const targetCount = clampNumber(
    5 + signalScore + axesScore + docScore + modeScore + longScopeScore + specialRiskScore,
    5,
    12,
  );
  const minimumCount = clampNumber(targetCount - (targetCount >= 10 ? 2 : 1), 5, targetCount);
  const maximumCount = clampNumber(targetCount + 4, targetCount, 18);
  return {
    minimum_count: minimumCount,
    target_count: targetCount,
    maximum_count: maximumCount,
    complexity_tier: targetCount >= 10 ? "complex" : targetCount >= 7 ? "medium" : "small",
    rationale: [
      `signals=${signals.length}`,
      `coverage_axes=${coverageAxes.length}`,
      context.docContextApplied ? `doc_lines=${context.docLines.length}` : "",
      context.docToolNames.length ? `doc_tools=${context.docToolNames.length}` : "",
      mode.isConversation ? "conversation" : "",
      mode.isIntegration ? "integration" : "",
      specialRiskScore ? "event/decision/matching/audit risk" : "",
    ].filter(Boolean),
  };
}

async function buildQaPlan({ issue, archetypeKey, sourceInput = {}, aiCustomization = null, project = {} }) {
  const archetype = ARCHETYPES[archetypeKey] || ARCHETYPES.general;
  const context = sourceContextFrom(issue, sourceInput);
  const signals = detectTaskSignals(issue, context, archetypeKey);
  const techniques = selectQaTechniques(archetype, signals);
  const coverageAxes = buildCoverageAxes(issue, archetype, context, signals, techniques);
  const caseStrategy = buildCaseStrategy({ issue, archetypeKey, context, signals, coverageAxes });
  const repoEvidence = await buildRepoEvidencePack(issue, sourceInput.repoContext, context);
  const openQuestions = [];
  if (signals.some((item) => item.id === "score_state") && !/nguong|ngưỡng|threshold|low|fail|pass/i.test(`${issue.description} ${sourceInput.docContext || ""}`)) {
    openQuestions.push("Jira chưa nêu ngưỡng AMR pass/low/fail cụ thể; testcase nên dùng dataset đã biết expected state thay vì tự đoán threshold.");
  }
  if (context.docContextIgnored) {
    openQuestions.push("Doc context có được gửi lên nhưng không có keyword liên quan rõ với Jira description; cần QA xác nhận trước khi dùng làm scope.");
  }
  if (repoEvidence.enabled && !repoEvidence.roots?.length) {
    openQuestions.push("Repo Context đang bật nhưng không có Product repo root/QA reference dir nào truy cập được trên môi trường đang chạy app.");
  }
  return {
    version: "adaptive-qa-plan-v1",
    issue_key: issue.key || "",
    archetype_key: archetypeKey,
    archetype_label: archetype.label,
    signals,
    case_strategy: caseStrategy,
    selected_techniques: techniques,
    coverage_axes: coverageAxes,
    source_priority: [
      "Jira summary/description/Acceptance Criteria",
      "Doc context đã fetch hoặc nội dung người dùng paste, chỉ khi liên quan rõ scope",
      "Repo evidence loại product_omniagent/product_repo để hiểu domain, UI/API, system prompt và rule trong codebase",
      "QA notes và AI Settings guidance",
      "QA reference snippets chỉ dùng để học style/cấu trúc testcase, không dùng làm scope thay Jira/repo",
    ],
    precondition_guidelines: buildPreconditionGuidelines(archetypeKey, signals, issue),
    source_context_summary: {
      jira_scope_lines: context.primaryLines.slice(0, 10),
      doc_lines_used: context.docLines.slice(0, 8),
      doc_tool_names: context.docToolNames,
      doc_context_applied: context.docContextApplied,
      doc_context_ignored: context.docContextIgnored,
      case_strategy: caseStrategy,
      ai_customization_applied: Boolean(aiCustomization),
      ai_customization_guidance: aiGuidanceText(aiCustomization) || undefined,
    },
    repo_evidence: repoEvidence,
    open_questions: openQuestions,
  };
}

function attachQaPlanToOutline(outline = {}, qaPlan = null) {
  if (!qaPlan) return outline;
  return {
    ...outline,
    source_context: {
      ...(outline.source_context || {}),
      adaptive_qa_plan: {
        version: qaPlan.version,
        signals: qaPlan.signals,
        case_strategy: qaPlan.case_strategy,
        coverage_axes: qaPlan.coverage_axes.map((axis) => ({
          id: axis.id,
          title: axis.title,
          technique: axis.technique,
          scenario_type: axis.scenario_type,
        })),
        repo_evidence_count: qaPlan.repo_evidence?.snippets?.length || 0,
        open_questions: qaPlan.open_questions,
      },
    },
    design_rationale: {
      ...(outline.design_rationale || {}),
      archetype: qaPlan.archetype_label,
      primary_techniques: qaPlan.selected_techniques.primary,
      supporting_techniques: qaPlan.selected_techniques.supporting,
      fail_safe_techniques: qaPlan.selected_techniques.fail_safe,
      coverage_axes: qaPlan.coverage_axes.map((axis) => axis.title),
      open_questions: qaPlan.open_questions,
    },
  };
}

function workflowMode(issue, archetypeKey) {
  const text = normalizeSearchText(`${issue.summary} ${issue.description} ${issue.issue_type}`);
  const isConversation =
    archetypeKey === "chatbot" ||
    archetypeKey === "conversation_ui" ||
    /\b(chatbot|conversation|multi\s*turn|message|tin\s*nhan|agent|handoff|ce)\b/.test(text);
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
  let text = stripReferenceUrls(value)
    .replace(/^user story\s*[:：-]\s*/i, "")
    .replace(/^acceptance criteria\s*[:：-]\s*/i, "")
    .replace(/^expected\s*[:：-]\s*/i, "")
    .replace(/^bối cảnh\s*[:：-]\s*/i, "")
    .replace(/^context\s*[:：-]\s*/i, "")
    .replace(/^background\s*[:：-]\s*/i, "")
    .replace(/^rule\s*[:：-]\s*/i, "")
    .replace(/^tạo\s+(một\s+)?/i, "")
    .replace(/^kiểm tra\s+/i, "")
    .replace(/^đảm bảo\s+/i, "")
    .replace(/^hiển thị\s+/i, "Hiển thị ")
    .replace(/\s+/g, " ")
    .trim();
  if (isReferenceOnlyLine(text)) text = "";
  text = text.replace(/[.:;,\s]+$/g, "");
  if (!text) text = fallback;
  if (isReferenceOnlyLine(text)) text = "Kiểm tra behavior chính";
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
    .replace(/&#(\d+);/g, (_match, code) => {
      try {
        return String.fromCodePoint(Number(code));
      } catch {
        return " ";
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => {
      try {
        return String.fromCodePoint(parseInt(code, 16));
      } catch {
        return " ";
      }
    })
    .replace(/&([a-zA-Z]+);/g, (match, entity) => HTML_ENTITIES[entity] || match)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const HTML_ENTITIES = {
  apos: "'",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  lsquo: "'",
  rsquo: "'",
  ldquo: '"',
  rdquo: '"',
  aacute: "á",
  agrave: "à",
  acirc: "â",
  atilde: "ã",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  iacute: "í",
  igrave: "ì",
  oacute: "ó",
  ograve: "ò",
  ocirc: "ô",
  otilde: "õ",
  uacute: "ú",
  ugrave: "ù",
  yacute: "ý",
  Aacute: "Á",
  Agrave: "À",
  Acirc: "Â",
  Atilde: "Ã",
  Eacute: "É",
  Egrave: "È",
  Ecirc: "Ê",
  Iacute: "Í",
  Igrave: "Ì",
  Oacute: "Ó",
  Ograve: "Ò",
  Ocirc: "Ô",
  Otilde: "Õ",
  Uacute: "Ú",
  Ugrave: "Ù",
  Yacute: "Ý",
};

function confluenceAuthHeaders(credentials = {}) {
  const headers = { Accept: "application/json, text/html;q=0.8" };
  if (credentials.enabled === false || asText(credentials.enabled).toLowerCase() === "false") {
    return headers;
  }
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

function confluenceQueryPageFromUrl(url) {
  const spaceKey = url.searchParams.get("spaceKey") || url.searchParams.get("space");
  const title = url.searchParams.get("title") || url.searchParams.get("pageTitle");
  if (!spaceKey || !title) return null;
  return {
    spaceKey: decodeConfluencePathSegment(spaceKey),
    title: decodeConfluencePathSegment(title),
  };
}

function confluenceRootFromUrl(url) {
  if (url.pathname.startsWith("/wiki/")) {
    return `${url.origin}/wiki`;
  }
  for (const marker of ["/spaces/", "/pages/", "/display/", "/plugins/", "/secure/", "/content/"]) {
    const index = url.pathname.indexOf(marker);
    if (index > 0) {
      return `${url.origin}${url.pathname.slice(0, index)}`.replace(/\/+$/, "");
    }
    if (index === 0) {
      return url.origin;
    }
  }
  return url.origin;
}

function looksLikeConfluencePageUrl(url) {
  return Boolean(
    url.searchParams.get("pageId") ||
      /\/pages\/viewpage\.action/i.test(url.pathname) ||
      /\/pages\/\d+/i.test(url.pathname) ||
      /\/display\/[^/]+\/[^/]+/i.test(url.pathname) ||
      /\/content\/\d+/i.test(url.pathname),
  );
}

function confluenceBaseUrlFrom(url, credentials = {}) {
  const configured = asText(credentials.baseUrl);
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (looksLikeConfluencePageUrl(parsed)) {
        return confluenceRootFromUrl(parsed);
      }
      return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
    } catch {
      return configured.replace(/\/(pages|display|content|plugins|secure)\/.*$/i, "").replace(/\/+$/, "");
    }
  }
  return confluenceRootFromUrl(url);
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
      text: htmlToText(html).slice(0, CONFLUENCE_DOC_TEXT_LIMIT),
    };
  };
  if (pageId) {
    const baseUrl = confluenceBaseUrlFrom(url, credentials);
    const apiUrl = `${baseUrl}/rest/api/content/${encodeURIComponent(pageId)}?expand=body.storage,body.view,title,space`;
    return fetchRestContent(apiUrl);
  }

  const displayPage = confluenceDisplayPageFromUrl(url);
  const queryPage = confluenceQueryPageFromUrl(url);
  const titlePage = displayPage || queryPage;
  if (titlePage?.spaceKey && titlePage?.title) {
    const baseUrl = confluenceBaseUrlFrom(url, credentials);
    const params = new URLSearchParams({
      spaceKey: titlePage.spaceKey,
      title: titlePage.title,
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
    .slice(0, CONFLUENCE_COMBINED_TEXT_LIMIT);
  return { documents, combinedText };
}

function normalizeAutomationBoolean(rawValue, fallbackValue, defaultValue) {
  if (rawValue === false || asText(rawValue).toLowerCase() === "false") return false;
  if (rawValue === true || asText(rawValue).toLowerCase() === "true") return true;
  if (fallbackValue === false || asText(fallbackValue).toLowerCase() === "false") return false;
  if (fallbackValue === true || asText(fallbackValue).toLowerCase() === "true") return true;
  return defaultValue;
}

function normalizeAutomationProfileConfig(raw = {}, fallback = {}) {
  return {
    chatwootMode: raw.chatwootMode === "suite" || fallback.chatwootMode === "suite" ? "suite" : DEFAULTS.chatwootMode,
    chatwootChatUiMode: raw.chatwootChatUiMode === "webhook-only" || fallback.chatwootChatUiMode === "webhook-only" ? "webhook-only" : DEFAULTS.chatwootChatUiMode,
    chatwootPlannerBackend: ["openai-compatible", "heuristic", "codex-cli"].includes(asText(raw.chatwootPlannerBackend))
      ? asText(raw.chatwootPlannerBackend)
      : ["openai-compatible", "heuristic", "codex-cli"].includes(asText(fallback.chatwootPlannerBackend))
        ? asText(fallback.chatwootPlannerBackend)
        : DEFAULTS.chatwootPlannerBackend,
    chatwootWebhookUrl: asText(raw.chatwootWebhookUrl) || asText(fallback.chatwootWebhookUrl) || DEFAULTS.chatwootWebhookUrl,
    chatwootHealthcheckUrl: asText(raw.chatwootHealthcheckUrl) || asText(fallback.chatwootHealthcheckUrl) || DEFAULTS.chatwootHealthcheckUrl,
    chatwootSkipHealthcheck: normalizeAutomationBoolean(raw.chatwootSkipHealthcheck, fallback.chatwootSkipHealthcheck, DEFAULTS.chatwootSkipHealthcheck),
    chatwootSkipLocalWebhookPost: normalizeAutomationBoolean(raw.chatwootSkipLocalWebhookPost, fallback.chatwootSkipLocalWebhookPost, DEFAULTS.chatwootSkipLocalWebhookPost),
    chatwootApiBase: asText(raw.chatwootApiBase) || asText(fallback.chatwootApiBase) || DEFAULTS.chatwootApiBase,
    chatwootInboxId: asText(raw.chatwootInboxId) || asText(fallback.chatwootInboxId) || DEFAULTS.chatwootInboxId,
    chatwootUiInboxId: asText(raw.chatwootUiInboxId) || asText(fallback.chatwootUiInboxId) || DEFAULTS.chatwootUiInboxId,
    chatwootCaptainAssistantId: asText(raw.chatwootCaptainAssistantId) || asText(fallback.chatwootCaptainAssistantId) || DEFAULTS.chatwootCaptainAssistantId,
    chatwootAccountId: asText(raw.chatwootAccountId) || asText(fallback.chatwootAccountId) || DEFAULTS.chatwootAccountId,
    chatwootMaxUserTurns: asText(raw.chatwootMaxUserTurns) || asText(fallback.chatwootMaxUserTurns) || DEFAULTS.chatwootMaxUserTurns,
    chatwootPlannerModel: asText(raw.chatwootPlannerModel) || asText(fallback.chatwootPlannerModel) || DEFAULTS.chatwootPlannerModel,
    chatwootPlannerTimeoutSeconds: asText(raw.chatwootPlannerTimeoutSeconds) || asText(fallback.chatwootPlannerTimeoutSeconds) || DEFAULTS.chatwootPlannerTimeoutSeconds,
    chatwootLabels: asText(raw.chatwootLabels) || asText(fallback.chatwootLabels) || DEFAULTS.chatwootLabels,
    chatwootAssigneeName: asText(raw.chatwootAssigneeName) || asText(fallback.chatwootAssigneeName) || DEFAULTS.chatwootAssigneeName,
    chatwootPinnedConversationId: asText(raw.chatwootPinnedConversationId) || asText(fallback.chatwootPinnedConversationId) || DEFAULTS.chatwootPinnedConversationId,
  };
}

function normalizeAutomationProfiles(rawProfiles, fallbackProfiles = []) {
  const source = Array.isArray(rawProfiles) ? rawProfiles : Array.isArray(fallbackProfiles) ? fallbackProfiles : [];
  const seen = new Set();
  return source
    .map((profile, index) => {
      const rawName = asText(profile?.name) || `Automation ${index + 1}`;
      const normalizedName = rawName.slice(0, 120);
      const dedupeKey = normalizedName.toLowerCase();
      if (seen.has(dedupeKey)) return null;
      seen.add(dedupeKey);
      const targetType = ["chatwoot", "web", "api", "other"].includes(asText(profile?.targetType)) ? asText(profile.targetType) : "chatwoot";
      const now = new Date().toISOString();
      return {
        id: asText(profile?.id) || `automation-${index + 1}`,
        name: normalizedName,
        targetType,
        createdAt: asText(profile?.createdAt) || asText(profile?.updatedAt) || now,
        updatedAt: asText(profile?.updatedAt) || now,
        config: normalizeAutomationProfileConfig(profile?.config || profile || {}),
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeProject(raw = {}, fallback = {}) {
  const automationConfig = normalizeAutomationProfileConfig(raw, fallback);
  return {
    sourceRoot: asText(raw.sourceRoot) || asText(fallback.sourceRoot) || DEFAULTS.sourceRoot,
    jiraBaseUrl: asText(raw.jiraBaseUrl) || asText(fallback.jiraBaseUrl) || DEFAULTS.jiraBaseUrl,
    projectKey: asText(raw.projectKey) || asText(fallback.projectKey) || DEFAULTS.projectKey,
    folderRoot: asText(raw.folderRoot) || asText(fallback.folderRoot) || DEFAULTS.folderRoot,
    runRoot: asText(raw.runRoot) || asText(fallback.runRoot) || DEFAULTS.runRoot,
    jsonOutputDir: asText(raw.jsonOutputDir) || asText(fallback.jsonOutputDir) || DEFAULTS.jsonOutputDir,
    outputDir: asText(raw.outputDir) || asText(fallback.outputDir) || DEFAULTS.outputDir,
    testCaseNumberTemplate: asText(raw.testCaseNumberTemplate) || asText(fallback.testCaseNumberTemplate) || DEFAULTS.testCaseNumberTemplate,
    labelMode: asText(raw.labelMode) || "custom",
    testcaseLabels: asText(raw.testcaseLabels) || DEFAULTS.labelPolicy.testcaseLabels,
    testdesignLabels: asText(raw.testdesignLabels) || DEFAULTS.labelPolicy.testdesignLabels,
    testcaseStatusLabels: asText(raw.testcaseStatusLabels) || DEFAULTS.labelPolicy.testcaseStatusLabels,
    testdesignStatusLabels: asText(raw.testdesignStatusLabels) || DEFAULTS.labelPolicy.testdesignStatusLabels,
    ...automationConfig,
    automationProfiles: normalizeAutomationProfiles(raw.automationProfiles, fallback.automationProfiles),
  };
}

function resolveConfiguredPath(rawPath, fallbackPath) {
  const selected = asText(rawPath) || fallbackPath;
  return path.isAbsolute(selected) ? selected : path.resolve(ROOT_DIR, selected);
}

function fileDownloadMeta(filePath) {
  return {
    path: filePath,
    file: path.relative(ROOT_DIR, filePath),
    url: `/api/download-file?path=${encodeURIComponent(filePath)}`,
  };
}

function fileViewMeta(filePath) {
  return {
    ...fileDownloadMeta(filePath),
    url: `/api/view-file?path=${encodeURIComponent(filePath)}`,
    downloadUrl: `/api/download-file?path=${encodeURIComponent(filePath)}`,
  };
}

function isAllowedDownloadPath(filePath) {
  const resolved = path.resolve(filePath);
  const allowedRoots = [path.resolve(ROOT_DIR, "qa"), path.resolve(RUNS_DIR)];
  return allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
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
  if (credentials.enabled === false || asText(credentials.enabled).toLowerCase() === "false") {
    if (baseUrl) env.JIRA_BASE_URL = baseUrl;
    return env;
  }
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
  if (credentials.enabled === false || asText(credentials.enabled).toLowerCase() === "false") {
    return headers;
  }
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
    enabled: raw.enabled === false || asText(raw.enabled).toLowerCase() === "false" ? false : true,
    user: asText(raw.user || raw.jiraUser),
    password: asText(raw.password || raw.jiraPassword),
    token: asText(raw.token || raw.jiraToken),
  };
}

function normalizeConfluenceCredentials(raw = {}) {
  return {
    enabled: raw.enabled === false || asText(raw.enabled).toLowerCase() === "false" ? false : true,
    baseUrl: asText(raw.baseUrl || raw.confluenceBaseUrl),
    user: asText(raw.user || raw.confluenceUser),
    password: asText(raw.password || raw.confluencePassword),
    token: asText(raw.token || raw.confluenceToken),
  };
}

function normalizeAuthEntry(raw = {}) {
  const authType = asText(raw.authType || raw.type).toLowerCase();
  const normalizedType = authType === "basic" || authType === "apikey" || authType === "api_key" ? authType : "bearer";
  return {
    id: asText(raw.id) || crypto.randomUUID(),
    name: asText(raw.name || raw.label),
    baseUrl: asText(raw.baseUrl || raw.url || raw.host),
    authType: normalizedType === "apikey" || normalizedType === "api_key" ? "apiKey" : normalizedType,
    user: asText(raw.user || raw.username || raw.keyName),
    password: asText(raw.password),
    token: asText(raw.token || raw.apiKey),
    enabled: raw.enabled === true || asText(raw.enabled).toLowerCase() === "true",
    notes: asText(raw.notes || raw.description),
  };
}

function normalizeAuthEntries(raw = []) {
  const items = Array.isArray(raw) ? raw : [];
  return items
    .map(normalizeAuthEntry)
    .filter((entry) => entry.name || entry.baseUrl)
    .slice(0, 20);
}

function normalizeKnowledgeAiSettings(raw = {}) {
  const baseUrl = asText(raw.baseUrl || raw.apiBaseUrl);
  return {
    enabled: raw.enabled === true || asText(raw.enabled).toLowerCase() === "true",
    provider: asText(raw.provider) || "openai-compatible",
    baseUrl: baseUrl || "https://api.openai.com/v1",
    model: asText(raw.model),
    apiKey: asText(raw.apiKey || raw.token),
    writingStyle: asText(raw.writingStyle),
    articleGuidelines: asText(raw.articleGuidelines || raw.knowledgeGuidelines || raw.guidelines),
  };
}

function consolidatedAiPromptGuidelines(raw = {}) {
  const direct = asText(raw.promptGuidelines || raw.prompt_guidelines || raw.guidelines);
  if (direct.trim()) return direct;
  const sections = [
    asText(raw.writingStyle).trim() ? `Phong cách viết:\n${asText(raw.writingStyle).trim()}` : "",
    asText(raw.testCaseGuidelines).trim() ? `Cách viết test case:\n${asText(raw.testCaseGuidelines).trim()}` : "",
    asText(raw.testDesignGuidelines).trim() ? `Cách làm test design:\n${asText(raw.testDesignGuidelines).trim()}` : "",
    asText(raw.improvementNotes).trim() ? `Ghi nhớ cải tiến:\n${asText(raw.improvementNotes).trim()}` : "",
  ].filter(Boolean);
  return sections.join("\n\n");
}

function normalizeAiSettings(raw = {}) {
  const baseUrl = asText(raw.baseUrl || raw.apiBaseUrl);
  return {
    enabled: raw.enabled === true || asText(raw.enabled).toLowerCase() === "true",
    provider: asText(raw.provider) || "openai-compatible",
    baseUrl: baseUrl || "https://api.openai.com/v1",
    model: asText(raw.model),
    apiKey: asText(raw.apiKey || raw.token),
    promptGuidelines: consolidatedAiPromptGuidelines(raw),
    stopConditionGuidelines: asText(raw.stopConditionGuidelines || raw.stop_condition_guidelines || raw.stopConditionPrompt || raw.stop_condition_prompt),
    writingStyle: asText(raw.writingStyle),
    testCaseGuidelines: asText(raw.testCaseGuidelines),
    testDesignGuidelines: asText(raw.testDesignGuidelines),
    improvementNotes: asText(raw.improvementNotes),
    knowledge: normalizeKnowledgeAiSettings(raw.knowledge || raw.knowledgeAiSettings),
  };
}

function normalizeKnowledgeArticle(raw = {}) {
  const id = asText(raw.id) || crypto.randomUUID();
  const title = asText(raw.title);
  const content = asText(raw.content || raw.content_markdown || raw.markdown);
  return {
    id,
    title: title || "Untitled QA knowledge",
    summary: asText(raw.summary || raw.description),
    category: asText(raw.category),
    content,
    tags: Array.isArray(raw.tags) ? raw.tags.map(asText).filter(Boolean).slice(0, 12) : [],
    createdAt: asText(raw.createdAt || raw.created_at) || new Date().toISOString(),
    updatedAt: asText(raw.updatedAt || raw.updated_at) || new Date().toISOString(),
    source: asText(raw.source) || "ai",
  };
}

function normalizeKnowledgeArticles(raw = []) {
  const items = Array.isArray(raw) ? raw : [];
  return items
    .map(normalizeKnowledgeArticle)
    .filter((item) => item.title || item.content)
    .slice(0, 200);
}

function normalizeWorkspaceOutline(raw = {}, fallback = {}) {
  const branches = Array.isArray(raw?.branches)
    ? raw.branches
        .map((branch) => ({
          title: asText(branch?.title),
          items: Array.isArray(branch?.items)
            ? branch.items.map(asText).filter(Boolean)
            : asText(branch?.items)
                .split(/\r?\n/)
                .map((item) => item.trim())
                .filter(Boolean),
        }))
        .filter((branch) => branch.title || branch.items.length)
    : [];
  return {
    issue_key: asText(raw?.issue_key || raw?.issueKey || fallback.issueKey),
    title: asText(raw?.title) || fallback.title || "QA test design",
    sheet_title: asText(raw?.sheet_title || raw?.sheetTitle),
    template: asText(raw?.template || fallback.archetypeKey || "general"),
    source_context: raw?.source_context && typeof raw.source_context === "object" ? raw.source_context : {},
    design_rationale: raw?.design_rationale && typeof raw.design_rationale === "object" ? raw.design_rationale : {},
    branches,
  };
}

function normalizeWorkspaceStopPatterns(value, withFallback = true) {
  const rawValues = Array.isArray(value)
    ? value
    : asText(value)
        .split(/\r?\n/)
        .map((item) => item.trim());
  const patterns = rawValues
    .map(asText)
    .map(simplifyWorkspaceStopPattern)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.length <= 240)
    .slice(0, 6);
  return patterns.length || !withFallback ? patterns : ["(?i)https?://\\S+"];
}

function normalizeWorkspaceFailPatterns(value, withFallback = true) {
  const patterns = normalizeWorkspaceStopPatterns(value, false);
  return patterns.length || !withFallback
    ? patterns
    : ["(?i)(lỗi hệ thống|không thể xử lý|xin lỗi.*không thể|system error|technical error|failed|failure)"];
}

function simplifyWorkspaceStopPattern(value = "") {
  return asText(value)
    .replace(/\(\?:/g, "(")
    .replace(/\\b/g, "")
    .replace(/\[\^\\n\]\{0,(\d+)\}/g, ".{0,$1}")
    .replace(/\[\^\\n\]/g, ".")
    .replace(/booking\[_ \]\?code/gi, "booking[ _]?code")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWorkspaceConditionList(value, maxItems = 4) {
  const rawValues = Array.isArray(value)
    ? value
    : asText(value)
        .split(/\r?\n/)
        .map((item) => item.trim());
  const seen = new Set();
  const output = [];
  for (const item of rawValues.map(asText).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean)) {
    const normalized = item.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(item.slice(0, 260));
    if (output.length >= maxItems) break;
  }
  return output;
}

function workspaceStopConditionSource(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const direct = source.stop_conditions || source.stopConditions || {};
  return direct && typeof direct === "object" ? direct : {};
}

function humanizeWorkspaceStopPattern(pattern = "", kind = "pass") {
  const text = asText(pattern).toLowerCase();
  if (/(https\?|payment|thanh\s*to[aá]n|link)/i.test(text)) {
    return kind === "fail"
      ? "Bot không tạo được link thanh toán hoặc trả lời rằng không thể tiếp tục thanh toán."
      : "Bot trả về link thanh toán hoặc link hoàn tất đúng với mục tiêu test case.";
  }
  if (/(booking|ticket|mã|ma|code|\[a-z0-9\])/.test(text)) {
    return kind === "fail"
      ? "Bot không trả về mã booking/mã vé hợp lệ hoặc báo không tạo được mã theo dữ liệu test."
      : "Bot trả về mã booking/mã vé hợp lệ theo dữ liệu test.";
  }
  if (/(không|khong|hết|het|no\s*trip|not\s*available|unavailable|no-option|no option)/.test(text)) {
    return kind === "fail"
      ? "Bot đưa ra kết luận không có chuyến/lựa chọn sai với dữ liệu test hoặc không có hướng xử lý tiếp."
      : "Bot xác nhận đúng trạng thái không có chuyến hoặc không còn lựa chọn phù hợp với điều kiện tìm kiếm.";
  }
  if (/(handoff|agent|nhân viên|nhan vien|tư vấn|tu van)/.test(text)) {
    return kind === "fail"
      ? "Bot chuyển agent ngoài mong đợi hoặc dừng hội thoại khi test case cần bot tự xử lý."
      : "Bot chuyển hội thoại sang nhân viên tư vấn đúng lúc test case yêu cầu handoff.";
  }
  return kind === "fail"
    ? "Bot phản hồi sai ngữ cảnh, báo lỗi hoặc không đạt expected result của test case."
    : "Bot phản hồi đúng kết quả mong đợi và mục tiêu kiểm thử của test case đã đạt.";
}

function looksLikeWorkspaceRegex(value = "") {
  return /(\(\?i\)|\\[bdsw]|\[[^\]]+\]|\.\*|\.\{|\{\d|https\?:|[|])/.test(asText(value));
}

function sanitizeWorkspaceConditionText(items = [], kind = "pass") {
  return normalizeWorkspaceConditionList(items).map((item) =>
    looksLikeWorkspaceRegex(item) ? humanizeWorkspaceStopPattern(item, kind) : item,
  );
}

function fallbackStopConditionsForWorkspaceCase(testCase = {}) {
  const source = [
    testCase.title,
    testCase.objective,
    testCase.test_data,
    testCase.expected_result,
    ...(testCase.structured_steps || []).flatMap((step) => [step.description, step.test_data, step.expected_result]),
  ]
    .map(asText)
    .join("\n")
    .toLowerCase();
  const pass = [];
  if (/payment|thanh\s*to[aá]n|link|url|checkout/.test(source)) {
    pass.push("Bot trả về link thanh toán hoặc link hoàn tất đúng với dữ liệu test.");
  }
  if (/booking|ticket|m[aã]\s*(v[eé]|đặt chỗ)|mã đặt|code/.test(source)) {
    pass.push("Bot trả về mã booking/mã vé hợp lệ theo dữ liệu test.");
  }
  if (/kh[oô]ng\s+c[oó]\s+chuy[eế]n|hết chuyến|kh[oô]ng\s+tìm\s+thấy|no\s+trip|not\s+available|unavailable/.test(source)) {
    pass.push("Bot xác nhận đúng trạng thái không có chuyến hoặc không còn lựa chọn phù hợp với điều kiện tìm kiếm.");
  }
  if (/handoff|chuy[eể]n\s+agent|nh[aâ]n\s+vi[eê]n|tư\s+vấn\s+viên/.test(source)) {
    pass.push("Bot chuyển hội thoại sang nhân viên tư vấn đúng lúc test case yêu cầu handoff.");
  }
  return {
    pass: normalizeWorkspaceConditionList(pass.length ? pass : ["Bot phản hồi đúng expected result và mục tiêu kiểm thử của test case đã đạt."]),
    fail: normalizeWorkspaceConditionList([
      "Bot báo lỗi hệ thống, không thể xử lý yêu cầu hoặc dừng luồng ngoài mong đợi.",
      "Bot phản hồi sai ngữ cảnh, không bám theo dữ liệu test hoặc không đạt expected result của test case.",
    ]),
  };
}

function normalizeWorkspaceStopConditions(value = {}, testCase = {}) {
  const direct = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const source = workspaceStopConditionSource({ ...testCase, stop_conditions: direct });
  const passRaw =
    source.pass ||
    source.success ||
    source.pass_conditions ||
    source.passConditions ||
    source.success_conditions ||
    source.successConditions ||
    testCase.pass_conditions ||
    testCase.passConditions;
  const failRaw =
    source.fail ||
    source.failure ||
    source.fail_conditions ||
    source.failConditions ||
    source.failure_conditions ||
    source.failureConditions ||
    testCase.fail_conditions ||
    testCase.failConditions;
  const fallback = fallbackStopConditionsForWorkspaceCase(testCase);
  let pass = sanitizeWorkspaceConditionText(passRaw, "pass");
  let fail = sanitizeWorkspaceConditionText(failRaw, "fail");
  if (!pass.length) {
    const passPatterns = normalizeWorkspaceStopPatterns(
      testCase.stop_patterns || testCase.stopPatterns || testCase.stop_regex_any || testCase.stopRegexAny,
      false,
    );
    pass = sanitizeWorkspaceConditionText(passPatterns.map((pattern) => humanizeWorkspaceStopPattern(pattern, "pass")), "pass");
  }
  if (!fail.length) {
    const failPatterns = normalizeWorkspaceFailPatterns(
      testCase.fail_patterns || testCase.failPatterns || testCase.fail_regex_any || testCase.failRegexAny,
      false,
    );
    fail = sanitizeWorkspaceConditionText(failPatterns.map((pattern) => humanizeWorkspaceStopPattern(pattern, "fail")), "fail");
  }
  return {
    pass: pass.length ? pass : fallback.pass,
    fail: fail.length ? fail : fallback.fail,
  };
}

function isGenericWorkspaceStopPattern(pattern = "") {
  const normalized = asText(pattern).replace(/\s+/g, "").toLowerCase();
  return normalized === "(?i)https?://\\s+" || normalized === "https?://\\s+";
}

function workspaceCaseNeedsStopPatternRefresh(testCase = {}, options = {}) {
  const passPatterns = normalizeWorkspaceStopPatterns(
    testCase?.stop_patterns || testCase?.stopPatterns || testCase?.stop_regex_any || testCase?.stopRegexAny,
    false,
  );
  const failPatterns = normalizeWorkspaceFailPatterns(
    testCase?.fail_patterns || testCase?.failPatterns || testCase?.fail_regex_any || testCase?.failRegexAny,
    false,
  );
  const rawConditions = workspaceStopConditionSource(testCase);
  const passConditions = normalizeWorkspaceConditionList(rawConditions.pass || rawConditions.pass_conditions || rawConditions.passConditions || testCase.pass_conditions || testCase.passConditions);
  const failConditions = normalizeWorkspaceConditionList(rawConditions.fail || rawConditions.fail_conditions || rawConditions.failConditions || testCase.fail_conditions || testCase.failConditions);
  if (options.force) return true;
  if (!passPatterns.length || !failPatterns.length || !passConditions.length || !failConditions.length) return true;
  return Boolean(options.refreshGeneric && passPatterns.length && passPatterns.every(isGenericWorkspaceStopPattern) && !failPatterns.length);
}

function normalizeWorkspaceTestCases(raw = []) {
  const cases = Array.isArray(raw) ? raw : [];
  return cases
    .map((testCase, index) => {
      const steps = Array.isArray(testCase?.steps) ? testCase.steps.map(asText).filter(Boolean) : [];
      const testData = asText(testCase?.test_data || testCase?.testData);
      const expectedResult = asText(testCase?.expected_result || testCase?.expectedResult);
      const stopPatterns = normalizeWorkspaceStopPatterns(testCase?.stop_patterns || testCase?.stopPatterns || testCase?.stop_regex_any || testCase?.stopRegexAny, false);
      const failPatterns = normalizeWorkspaceFailPatterns(testCase?.fail_patterns || testCase?.failPatterns || testCase?.fail_regex_any || testCase?.failRegexAny, false);
      const structuredSteps = Array.isArray(testCase?.structured_steps)
        ? testCase.structured_steps
            .map((step) => ({
              description: asText(step?.description),
              test_data: asText(step?.test_data || step?.testData),
              expected_result: asText(step?.expected_result || step?.expectedResult),
            }))
            .filter((step) => step.description || step.test_data || step.expected_result)
        : [];
      return {
        title: asText(testCase?.title) || `[TC_${String(index + 1).padStart(4, "0")}] Chatwoot UAT case`,
        objective: asText(testCase?.objective),
        priority: asText(testCase?.priority) || "High",
        technique: asText(testCase?.technique) || "Conversation UAT",
        risk: asText(testCase?.risk),
        requirement_ref: asText(testCase?.requirement_ref || testCase?.requirementRef),
        coverage_tags: Array.isArray(testCase?.coverage_tags)
          ? testCase.coverage_tags.map(asText).filter(Boolean)
          : asText(testCase?.coverage_tags || testCase?.coverageTags)
              .split(/[,\n]/)
              .map((item) => item.trim())
              .filter(Boolean),
        scenario_type: asText(testCase?.scenario_type || testCase?.scenarioType) || "chatbot_uat",
        precondition: asText(testCase?.precondition),
        test_data: testData,
        expected_result: expectedResult,
        stop_conditions: normalizeWorkspaceStopConditions(testCase?.stop_conditions || testCase?.stopConditions, {
          ...testCase,
          test_data: testData,
          expected_result: expectedResult,
          stop_patterns: stopPatterns,
          fail_patterns: failPatterns,
          structured_steps: structuredSteps.length ? structuredSteps : structuredStepsFromDescriptions(steps, testData, expectedResult),
        }),
        stop_patterns: stopPatterns,
        fail_patterns: failPatterns,
        steps,
        structured_steps: structuredSteps.length ? structuredSteps : structuredStepsFromDescriptions(steps, testData, expectedResult),
      };
    })
    .filter((testCase) => testCase.title || testCase.test_data || testCase.structured_steps.length)
    .slice(0, 300);
}

function cleanImportedQaText(value = "") {
  return asText(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

async function readImportedTestCases(files = []) {
  const output = [];
  for (const filePath of files) {
    const payload = await readJsonFileIfExists(filePath);
    const testCases = Array.isArray(payload?.test_cases) ? payload.test_cases : [];
    for (const testCase of testCases) {
      output.push({
        ...testCase,
        title: cleanImportedQaText(testCase.title),
        precondition: cleanImportedQaText(testCase.precondition),
        objective: cleanImportedQaText(testCase.objective),
        risk: cleanImportedQaText(testCase.risk),
        requirement_ref: cleanImportedQaText(testCase.requirement_ref || testCase.requirementRef),
        test_data: cleanImportedQaText(testCase.test_data || testCase.testData),
        expected_result: cleanImportedQaText(testCase.expected_result || testCase.expectedResult),
        stop_conditions: normalizeWorkspaceStopConditions(testCase.stop_conditions || testCase.stopConditions, testCase),
        stop_patterns: normalizeWorkspaceStopPatterns(testCase.stop_patterns || testCase.stopPatterns || testCase.stop_regex_any, false),
        fail_patterns: normalizeWorkspaceFailPatterns(testCase.fail_patterns || testCase.failPatterns || testCase.fail_regex_any, false),
        steps: Array.isArray(testCase.steps) ? testCase.steps.map(cleanImportedQaText).filter(Boolean) : [],
        structured_steps: Array.isArray(testCase.structured_steps)
          ? testCase.structured_steps.map((step) => ({
              ...step,
              description: cleanImportedQaText(step.description),
              test_data: cleanImportedQaText(step.test_data || step.testData),
              expected_result: cleanImportedQaText(step.expected_result || step.expectedResult),
            }))
          : [],
      });
    }
  }
  return output;
}

function normalizeQaWorkspaceItem(raw = {}) {
  const now = new Date().toISOString();
  const issueKey = asText(raw.issueKey || raw.issue_key || raw.issue?.key).toUpperCase();
  const title = asText(raw.title || raw.issue?.summary || raw.outline?.title) || (issueKey ? `${issueKey} QA workspace` : "QA workspace item");
  const archetypeKey = asText(raw.archetypeKey || raw.archetype_key || raw.outline?.template || "general");
  const testCases = normalizeWorkspaceTestCases(raw.testCases || raw.test_cases);
  const outline = normalizeWorkspaceOutline(raw.outline || raw.testDesign || raw.test_design, {
    issueKey,
    title,
    archetypeKey,
  });
  return {
    id: asText(raw.id) || crypto.randomUUID(),
    issueKey,
    title,
    source: asText(raw.source) || "manual",
    sourceKey: asText(raw.sourceKey || raw.source_key || issueKey),
    createdAt: asText(raw.createdAt || raw.created_at) || now,
    updatedAt: asText(raw.updatedAt || raw.updated_at) || now,
    archetypeKey,
    testCases,
    outline,
    qaPlan: raw.qaPlan && typeof raw.qaPlan === "object" ? raw.qaPlan : null,
    chatwootSuiteFile: asText(raw.chatwootSuiteFile || raw.chatwoot_suite_file),
    chatwootSuiteName: asText(raw.chatwootSuiteName || raw.chatwoot_suite_name),
    files: raw.files && typeof raw.files === "object" ? raw.files : {},
  };
}

function normalizeQaWorkspaceItems(raw = []) {
  const items = Array.isArray(raw) ? raw : [];
  return items
    .map(normalizeQaWorkspaceItem)
    .filter((item) => item.title || item.issueKey || item.testCases.length || item.outline.branches.length)
    .slice(0, 100);
}

async function saveQaWorkspaceItems(email, items = []) {
  const userEmail = normalizeEmail(email);
  const normalized = normalizeQaWorkspaceItems(items);
  if (!db || !userEmail) {
    QA_WORKSPACE_MEMORY.set(userEmail || "default", normalized);
    return normalized;
  }
  await db.query(
    `
      INSERT INTO user_settings (user_email, qa_workspace_items)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (user_email)
      DO UPDATE SET qa_workspace_items = EXCLUDED.qa_workspace_items, updated_at = NOW()
    `,
    [userEmail, JSON.stringify(normalized)],
  );
  return normalized;
}

async function upsertQaWorkspaceItem(email, item) {
  const stored = await readUserSettings(email);
  const normalizedItem = normalizeQaWorkspaceItem({ ...item, updatedAt: new Date().toISOString() });
  const existing = normalizeQaWorkspaceItems(stored.qaWorkspaceItems);
  const next = [
    normalizedItem,
    ...existing.filter((entry) => entry.id !== normalizedItem.id && !(normalizedItem.sourceKey && entry.sourceKey === normalizedItem.sourceKey)),
  ];
  return {
    item: normalizedItem,
    items: await saveQaWorkspaceItems(email, next),
  };
}

function fallbackStopPatternsForWorkspaceCase(testCase = {}) {
  const source = [
    testCase.title,
    testCase.objective,
    testCase.test_data,
    testCase.expected_result,
    ...(testCase.structured_steps || []).flatMap((step) => [step.description, step.test_data, step.expected_result]),
  ]
    .map(asText)
    .join("\n")
    .toLowerCase();
  const patterns = [];
  if (/payment|thanh\s*to[aá]n|link|url|checkout/.test(source)) {
    patterns.push("(?i)https?://\\S+");
  }
  if (/booking|ticket|m[aã]\s*(v[eé]|đặt chỗ)|mã đặt|code/.test(source)) {
    patterns.push("(?i)(mã vé|mã đặt chỗ|booking code|ticket code|booking_code|ticket_code).{0,80}[A-Z0-9]{6,10}");
  }
  if (/kh[oô]ng\s+c[oó]\s+chuy[eế]n|hết chuyến|kh[oô]ng\s+tìm\s+thấy|no\s+trip|not\s+available|unavailable/.test(source)) {
    patterns.push("(?i)(không có chuyến|không tìm thấy chuyến|hết chuyến|không còn chuyến|no trips?|not available|unavailable)");
  }
  if (/handoff|chuy[eể]n\s+agent|nh[aâ]n\s+vi[eê]n|tư\s+vấn\s+viên/.test(source)) {
    patterns.push("(?i)(chuyển agent|chuyển cho nhân viên|nhân viên tư vấn|handoff|human agent)");
  }
  return normalizeWorkspaceStopPatterns(patterns.length ? patterns : ["(?i)https?://\\S+"]);
}

function fallbackFailPatternsForWorkspaceCase(testCase = {}) {
  const source = [
    testCase.title,
    testCase.objective,
    testCase.test_data,
    testCase.expected_result,
    ...(testCase.structured_steps || []).flatMap((step) => [step.description, step.test_data, step.expected_result]),
  ]
    .map(asText)
    .join("\n")
    .toLowerCase();
  const patterns = [
    "(?i)(lỗi hệ thống|không thể xử lý|xin lỗi.*không thể|system error|technical error)",
    "(?i)(không hiểu|chưa hiểu|không rõ yêu cầu|vui lòng cung cấp lại|I do not understand|I don't understand)",
  ];
  if (/payment|thanh\s*to[aá]n|link|url|checkout/.test(source)) {
    patterns.push("(?i)(không tạo được link|không thể thanh toán|payment failed|cannot create payment)");
  }
  if (/booking|ticket|m[aã]\s*(v[eé]|đặt chỗ)|mã đặt|code/.test(source)) {
    patterns.push("(?i)(không tạo được mã|không thể đặt chỗ|booking failed|cannot create booking)");
  }
  if (/kh[oô]ng\s+c[oó]\s+chuy[eế]n|hết chuyến|no\s+trip|not\s+available|unavailable/.test(source)) {
    patterns.push("(?i)(có chuyến|còn chuyến|available trips?)");
  }
  return normalizeWorkspaceFailPatterns(patterns);
}

function buildWorkspaceStopPatternMessages(item = {}, aiSettings = {}) {
  const settings = normalizeAiSettings(aiSettings);
  const userStopGuidelines = asText(settings.stopConditionGuidelines).trim();
  const cases = (item.testCases || []).slice(0, 80).map((testCase, index) => ({
    case_index: index + 1,
    title: testCase.title,
    objective: testCase.objective,
    test_data: truncateForPrompt(testCase.test_data, 1800),
    expected_result: truncateForPrompt(testCase.expected_result, 2200),
    steps: (testCase.structured_steps || []).slice(0, 8).map((step) => ({
      description: step.description,
      test_data: step.test_data,
      expected_result: step.expected_result,
    })),
  }));
  const system = [
    "You are EasyForQC's QA automation stop-condition designer.",
    "For each chatbot/automation test case, create human-readable pass/fail stop conditions and internal regex matchers.",
    "Return only one valid JSON object. Do not wrap it in markdown.",
  ].join("\n");
  const user = [
    "Generate two stop-condition groups for each test case.",
    "",
    "Meaning:",
    "- `pass_conditions` are short business-language sentences for QA users. When a real bot reply satisfies one, automation stops and marks the case passed.",
    "- `fail_conditions` are short business-language sentences for QA users. When a real bot reply satisfies one, automation stops and marks the case failed.",
    "- `pass_regex_any` and `fail_regex_any` are internal Python regex matchers for the runner. They are not shown to QA users.",
    "- Use title/objective as the test purpose. Use expected_result, test_data, and step expected results to decide both pass and fail signals.",
    "",
    "Rules:",
    "- Return 1-3 human sentences in `pass_conditions` and 1-3 human sentences in `fail_conditions`.",
    "- Return 1-4 regex strings in `pass_regex_any` and 1-4 regex strings in `fail_regex_any`.",
    "- Human sentences in `pass_conditions` and `fail_conditions` must be natural Vietnamese with full diacritics. Keep product names, Jira keys, tool names, API fields, and codes unchanged.",
    "- Do not write generic English phrases such as `Bot returns`, `The bot displays`, `system error`, or `expected result` in human condition text. Translate them into Vietnamese.",
    "- Human sentences must not be raw regex, not code, and not contain syntax like `(?i)`, `\\b`, `.*`, `[A-Z]`, or parentheses-heavy patterns.",
    "- Prefer precise pass signals: payment URL, booking code, ticket code, clear no-trip/no-option message, handoff message, or explicit final confirmation.",
    "- Prefer precise fail signals: bot reports system/tool failure, cannot process, answers out of context, uses wrong route/date/passenger data, or reaches a business outcome opposite to expected_result.",
    "- Keep regex readable for QA review. Prefer simple phrases, `|`, `.*`, `.{0,80}`, and character classes like `[A-Z0-9]{6,10}`.",
    "- Avoid noisy expert-only syntax unless truly needed: do not use `\\b`, non-capturing groups `(?:...)`, lookahead/lookbehind, nested groups, or `[^\\n]` spans.",
    "- Keep regex portable for Python `re` and safe for YAML/JSON.",
    "- Do not return broad patterns such as `.*`, `ok`, `success` alone, or patterns that match almost every bot reply.",
    "- If expected result mentions payment link, pass regex may include `(?i)https?://\\S+`, and fail regex should catch no-payment/cannot-pay messages.",
    "- If expected result mentions booking/ticket code, pass regex should require booking/ticket wording and a 6-10 char code.",
    "- If the case is a negative no-trip/no-option flow, pass condition should say the bot correctly confirms no availability; fail condition should catch the bot presenting an available trip or asking for payment incorrectly.",
    userStopGuidelines
      ? [
          "",
          "Additional user stop-condition guidance from AI Settings:",
          truncateForPrompt(userStopGuidelines, 5000),
          "",
          "Apply the additional guidance only when it is specific and does not conflict with the safety rules above.",
        ].join("\n")
      : "",
    "",
    "Required JSON schema:",
    JSON.stringify(
      {
        cases: [
          {
            case_index: 1,
            pass_conditions: ["Bot trả về link thanh toán đúng với dữ liệu test."],
            fail_conditions: ["Bot báo lỗi hệ thống hoặc không thể tạo link thanh toán."],
            pass_regex_any: ["(?i)https?://\\S+"],
            fail_regex_any: ["(?i)(lỗi hệ thống|không thể thanh toán|không tạo được link)"],
          },
        ],
      },
      null,
      2,
    ),
    "",
    "Workspace test cases:",
    jsonForPrompt(cases, 28000),
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function normalizeWorkspaceStopPatternAiPayload(payload = {}) {
  const rawCases = Array.isArray(payload?.cases) ? payload.cases : [];
  const byIndex = new Map();
  for (const rawCase of rawCases) {
    const index = Number(rawCase?.case_index || rawCase?.caseIndex || rawCase?.index);
    const passPatterns = normalizeWorkspaceStopPatterns(
      rawCase?.pass_regex_any || rawCase?.passRegexAny || rawCase?.stop_patterns || rawCase?.stopPatterns || rawCase?.stop_regex_any,
      false,
    );
    const failPatterns = normalizeWorkspaceFailPatterns(rawCase?.fail_regex_any || rawCase?.failRegexAny || rawCase?.fail_patterns || rawCase?.failPatterns, false);
    const stopConditions = normalizeWorkspaceStopConditions(
      rawCase?.stop_conditions || rawCase?.stopConditions || {
        pass: rawCase?.pass_conditions || rawCase?.passConditions || rawCase?.success_conditions || rawCase?.successConditions,
        fail: rawCase?.fail_conditions || rawCase?.failConditions || rawCase?.failure_conditions || rawCase?.failureConditions,
      },
      {
        title: rawCase?.title,
        objective: rawCase?.objective,
        expected_result: rawCase?.expected_result || rawCase?.expectedResult,
        stop_patterns: passPatterns,
        fail_patterns: failPatterns,
      },
    );
    if (Number.isFinite(index) && index > 0 && (passPatterns.length || failPatterns.length || stopConditions.pass.length || stopConditions.fail.length)) {
      byIndex.set(index, {
        stopConditions,
        passPatterns,
        failPatterns,
      });
    }
  }
  return byIndex;
}

async function enrichQaWorkspaceStopPatterns(item = {}, aiSettings = {}, options = {}) {
  const normalized = normalizeQaWorkspaceItem(item);
  if (!normalized.testCases.length) return normalized;
  const missingIndexes = normalized.testCases
    .map((testCase, index) => (workspaceCaseNeedsStopPatternRefresh(testCase, options) ? index + 1 : 0))
    .filter(Boolean);
  if (!missingIndexes.length) return normalized;
  let aiPatterns = new Map();
  const settings = normalizeAiSettings(aiSettings);
  if (aiProviderReady(settings)) {
    try {
      const result = await callOpenAiCompatible(settings, buildWorkspaceStopPatternMessages(normalized, settings));
      aiPatterns = normalizeWorkspaceStopPatternAiPayload(result.payload || parseMaybeJson(result.content));
    } catch (error) {
      console.warn("Could not generate QA Workspace stop conditions with AI", error.message);
    }
  }
  return normalizeQaWorkspaceItem({
    ...normalized,
    testCases: normalized.testCases.map((testCase, index) => {
      if (!workspaceCaseNeedsStopPatternRefresh(testCase, options)) return testCase;
      const aiCase = aiPatterns.get(index + 1);
      const fallbackConditions = fallbackStopConditionsForWorkspaceCase(testCase);
      return {
        ...testCase,
        stop_conditions: normalizeWorkspaceStopConditions(aiCase?.stopConditions || fallbackConditions, testCase),
        stop_patterns: normalizeWorkspaceStopPatterns(aiCase?.passPatterns || fallbackStopPatternsForWorkspaceCase(testCase)),
        fail_patterns: normalizeWorkspaceFailPatterns(aiCase?.failPatterns || fallbackFailPatternsForWorkspaceCase(testCase)),
      };
    }),
  });
}

function normalizeRepoContext(raw = {}) {
  raw = raw || {};
  const defaults = DEFAULTS.repoContext;
  return {
    enabled: raw.enabled === true || asText(raw.enabled).toLowerCase() === "true",
    productRepoRoot: asText(raw.productRepoRoot || raw.product_repo_root || raw.repoRoot || raw.repo_root),
    qaReferenceDir: asText(raw.qaReferenceDir || raw.qa_reference_dir || raw.referenceDir || raw.reference_dir),
    includePaths: asText(raw.includePaths || raw.include_paths) || defaults.includePaths,
    excludePaths: asText(raw.excludePaths || raw.exclude_paths) || defaults.excludePaths,
    maxSnippets: asText(raw.maxSnippets || raw.max_snippets) || defaults.maxSnippets,
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
    promptGuidelines: settings.promptGuidelines,
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
  if (aiCustomization.promptGuidelines) {
    return `Prompt tạo test case/test design:\n${aiCustomization.promptGuidelines}`;
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

function buildKnowledgeArticleMessages({ topic, category, audience, notes, language, settings }) {
  const outputLanguage = language === "en" ? "English" : "Vietnamese with full diacritics";
  const system = [
    "You are a senior QA/QC knowledge editor.",
    "Create practical tester knowledge articles grounded in widely accepted testing standards.",
    "Use ISTQB CTFL v4.0.1 and ISTQB Glossary concepts as the baseline when relevant.",
    "Do not invent hard facts, numbers, or definitions when unsure; mark them as needing confirmation.",
    "Write for working QC/QA testers who need actionable guidance for test case design, review, risk analysis, and bug reporting.",
    "Return only one valid JSON object.",
  ].join("\n");
  const user = [
    `Output language: ${outputLanguage}`,
    `Topic: ${topic}`,
    category ? `Knowledge category: ${category}` : "",
    audience ? `Audience/context: ${audience}` : "",
    notes ? `User notes/scope:\n${truncateForPrompt(notes, 8000)}` : "",
    settings?.writingStyle ? `Writing style:\n${truncateForPrompt(settings.writingStyle, 3000)}` : "",
    settings?.articleGuidelines ? `Knowledge article guidelines:\n${truncateForPrompt(settings.articleGuidelines, 6000)}` : "",
    "",
    "Required JSON schema:",
    JSON.stringify(
      {
        title: "Short article title",
        summary: "1-2 sentence summary",
        category: category || "QA knowledge category",
        content: "Markdown content with ## headings, bullet points, and concrete QA examples",
        tags: ["qa", "testing-technique"],
      },
      null,
      2,
    ),
    "",
    "Content requirements:",
    "- Make each rule/check actionable and testable.",
    "- Include examples when they help QA apply the concept.",
    "- Avoid generic filler and marketing language.",
    "- Keep terminology such as API, UI, Jira, Zephyr, BDD, AC, bug, regression, smoke test unchanged when appropriate.",
  ]
    .filter(Boolean)
    .join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function normalizeGeneratedKnowledgeArticle(payload = {}, fallback = {}) {
  const title = asText(payload.title) || fallback.topic || "QA knowledge article";
  const content = asText(payload.content || payload.content_markdown || payload.markdown);
  const summary = asText(payload.summary || payload.description);
  const tags = Array.isArray(payload.tags) ? payload.tags.map(asText).filter(Boolean) : [];
  return normalizeKnowledgeArticle({
    id: crypto.randomUUID(),
    title,
    summary,
    category: asText(payload.category) || fallback.category,
    content:
      content ||
      [
        `## ${title}`,
        "",
        summary || (fallback.language === "en" ? "Generated QA knowledge draft." : "Bản nháp kiến thức QA được tạo bằng AI."),
      ].join("\n"),
    tags,
    source: "ai",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function aiProviderReady(settings = {}) {
  return Boolean(settings.enabled && settings.apiKey && settings.model);
}

function aiProviderConfigured(settings = {}) {
  return Boolean(settings.apiKey && settings.model);
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

function localTestCaseStyleExamples(issueKey = "") {
  const dirs = [
    process.env.QA_REFERENCE_CASES_DIR,
    path.join(ROOT_DIR, "vendor", "qa-reference", "testcase-style"),
    "/Users/gumball.bi/Vexere/qa/jira",
    path.join(ROOT_DIR, "qa", "jira"),
  ].filter(Boolean);
  const issueNumber = asText(issueKey).match(/\d+/)?.[0] || "";
  const issueSpecificNames = issueNumber
    ? [
        `ai_${issueNumber}_bus_trip_tool_style.json`,
        `ai_${issueNumber}_test_cases.json`,
        `ai_${issueNumber}_test_cases_v2.json`,
      ]
    : [];
  const names = [
    ...issueSpecificNames,
    "ai_703_test_cases.json",
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
            (payload.purpose ? `Purpose: ${payload.purpose}\n` : "") +
            (Array.isArray(payload.rules) ? `Rules:\n${payload.rules.map((item) => `- ${item}`).join("\n")}\n` : "") +
            JSON.stringify(
              cases.slice(0, issueNumber && name.includes(`ai_${issueNumber}`) ? 8 : 2).map((item) => ({
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
        if (sections.length >= 4) return truncateForPrompt(sections.join("\n\n"), AI_REFERENCE_PROMPT_LIMIT);
      } catch {
        continue;
      }
    }
  }
  return truncateForPrompt(sections.join("\n\n"), AI_REFERENCE_PROMPT_LIMIT);
}

function jsonForPrompt(value, limit = 14000) {
  return truncateForPrompt(JSON.stringify(value, null, 2), limit);
}

function normalizedAiBaseUrl(settings = {}) {
  return (asText(settings.baseUrl) || "https://api.openai.com/v1").replace(/\/+$/, "");
}

function isOpenAiHostedUrl(baseUrl) {
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    return hostname === "api.openai.com";
  } catch {
    return /(^|\/\/)api\.openai\.com(?:[:/]|$)/i.test(baseUrl);
  }
}

function shouldUseResponsesApi(settings = {}) {
  const provider = asText(settings.provider).toLowerCase();
  const baseUrl = normalizedAiBaseUrl(settings);
  if (provider === "azure-openai") {
    return false;
  }
  if (/\/responses(?:\?|$)/i.test(baseUrl)) {
    return true;
  }
  return isOpenAiHostedUrl(baseUrl);
}

function aiEndpointUrl(settings = {}, mode = "chat") {
  const baseUrl = normalizedAiBaseUrl(settings);
  if (mode === "responses") {
    if (/\/responses(?:\?|$)/i.test(baseUrl)) {
      return baseUrl;
    }
    if (/\/chat\/completions(?:\?|$)/i.test(baseUrl)) {
      return baseUrl.replace(/\/chat\/completions(?:\?.*)?$/i, "/responses");
    }
    return `${baseUrl}/responses`;
  }
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

function sanitizeProviderText(value, secrets = []) {
  let text = asText(value);
  for (const secret of secrets.map(asText).filter(Boolean)) {
    text = text.replace(new RegExp(escapeRegExp(secret), "g"), "[redacted]");
  }
  return text
    .replace(/sk-proj-[A-Za-z0-9_-]{12,}/g, "[redacted-openai-key]")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[redacted-openai-key]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer [redacted]");
}

function providerOrigin(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function isQuotaOrBillingError(error) {
  const text = normalizeSearchText(
    [
      error?.message,
      error?.details?.response,
      error?.details?.provider_error_type,
      error?.details?.provider_error_code,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return /quota|billing|insufficient_quota|exceeded/.test(text);
}

function aiProviderDraftErrorMessage(error) {
  const providerMessage = error instanceof Error ? error.message : "Không tạo được AI draft.";
  if (isQuotaOrBillingError(error)) {
    return [
      "AI Settings đã gọi OpenAI thành công nhưng OpenAI từ chối vì API key/project đã hết quota hoặc chưa có billing/credit.",
      "Hãy kiểm tra Billing/Usage của project chứa API key, nạp credit hoặc đổi sang API key thuộc project còn quota.",
      "Nếu muốn dùng generator local tạm thời, tắt checkbox AI Settings rồi Generate lại.",
    ].join(" ");
  }
  return `AI Settings đang bật nên app dừng generate vì provider lỗi: ${providerMessage}`;
}

async function readAiProviderResponse(response, settings, url) {
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const rawMessage =
      payload?.error?.message ||
      payload?.message ||
      text.slice(0, 1200) ||
      `AI provider HTTP ${response.status}`;
    const message = sanitizeProviderText(rawMessage, [settings.apiKey]);
    throw Object.assign(new Error(message), {
      status: response.status,
      details: {
        provider: asText(settings.provider) || "openai-compatible",
        model: asText(settings.model),
        endpoint: providerOrigin(url),
        provider_error_type: payload?.error?.type || "",
        provider_error_code: payload?.error?.code || "",
        response: sanitizeProviderText(text.slice(0, 1200), [settings.apiKey]),
      },
    });
  }
  return payload;
}

function responseInputFromMessages(messages = []) {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: [{ type: "input_text", text: asText(message.content) }],
    }));
}

function extractResponsesOutputText(payload) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }
  const chunks = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    if (typeof item?.content === "string") {
      chunks.push(item.content);
    }
    if (typeof item?.text === "string") {
      chunks.push(item.text);
    }
    for (const part of Array.isArray(item?.content) ? item.content : []) {
      if (typeof part?.refusal === "string" && part.refusal.trim()) {
        throw new Error(`AI provider từ chối tạo JSON: ${part.refusal}`);
      }
      if (typeof part?.text === "string") {
        chunks.push(part.text);
      }
      if (typeof part?.content === "string") {
        chunks.push(part.content);
      }
    }
  }
  return chunks.join("\n").trim();
}

async function callOpenAiResponses(settings, messages) {
  const url = aiEndpointUrl(settings, "responses");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180000);
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${settings.apiKey}`,
  };
  const body = {
    model: settings.model,
    instructions: messages.find((message) => message.role === "system")?.content || undefined,
    input: responseInputFromMessages(messages),
    max_output_tokens: 12000,
    text: {
      format: { type: "json_object" },
    },
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await readAiProviderResponse(response, settings, url);
    if (payload?.status === "incomplete") {
      const reason = payload?.incomplete_details?.reason || "unknown";
      throw Object.assign(new Error(`AI provider trả response incomplete: ${reason}.`), {
        status: 502,
        details: {
          provider: asText(settings.provider) || "openai",
          model: asText(settings.model),
          endpoint: providerOrigin(url),
        },
      });
    }
    const content = extractResponsesOutputText(payload);
    const parsed = parseMaybeJson(content);
    if (!parsed) {
      throw Object.assign(new Error("AI provider không trả về JSON hợp lệ."), {
        status: 502,
        details: {
          provider: asText(settings.provider) || "openai",
          model: asText(settings.model),
          endpoint: providerOrigin(url),
          response: sanitizeProviderText(content.slice(0, 1200), [settings.apiKey]),
        },
      });
    }
    return { payload: parsed, usage: payload?.usage || null };
  } finally {
    clearTimeout(timer);
  }
}

async function callChatCompletionsCompatible(settings, messages) {
  const url = aiEndpointUrl(settings, "chat");
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
    const payload = await readAiProviderResponse(response, settings, url);
    const content =
      payload?.choices?.[0]?.message?.content ||
      payload?.choices?.[0]?.text ||
      payload?.output_text ||
      "";
    const parsed = parseMaybeJson(content);
    if (!parsed) {
      throw Object.assign(new Error("AI provider không trả về JSON hợp lệ."), {
        status: 502,
        details: {
          provider: asText(settings.provider) || "openai-compatible",
          model: asText(settings.model),
          endpoint: providerOrigin(url),
          response: sanitizeProviderText(content.slice(0, 1200), [settings.apiKey]),
        },
      });
    }
    return { payload: parsed, usage: payload?.usage || null };
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAiCompatible(settings, messages) {
  if (shouldUseResponsesApi(settings)) {
    return callOpenAiResponses(settings, messages);
  }
  return callChatCompletionsCompatible(settings, messages);
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

async function purgeGeneratedOutputsOnce() {
  if (!PURGE_GENERATED_OUTPUTS_ON_START) {
    return;
  }
  try {
    await fs.access(OUTPUT_PURGE_MARKER);
    return;
  } catch {
    // Continue and create the marker after the purge.
  }
  const dirs = [
    RUNS_DIR,
    path.join(ROOT_DIR, "qa", "jira"),
    path.join(ROOT_DIR, "qa", "xmind-test-design"),
  ];
  for (const dir of dirs) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      await Promise.all(
        entries.map((entry) => fs.rm(path.join(dir, entry.name), { recursive: true, force: true })),
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  await fs.mkdir(path.dirname(OUTPUT_PURGE_MARKER), { recursive: true });
  await fs.writeFile(OUTPUT_PURGE_MARKER, new Date().toISOString(), "utf8");
  console.log("Generated QA output folders purged once on startup.");
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
    const childSecrets = sensitiveEnvValues([
      ...Object.entries(options.env || {})
        .filter(([key]) => SECRET_KEY_PATTERN.test(key))
        .map(([, value]) => value),
      ...(options.secrets || []),
    ]);
    const child = spawn("python3", [script, ...args], {
      cwd: ROOT_DIR,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (typeof options.onChild === "function") {
      options.onChild(child);
    }
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(redactText(`Command timed out: python3 ${path.basename(script)} ${args.join(" ")}`, childSecrets)));
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
        const error = new Error(redactText(stderr || stdout || `Python command exited with ${code}`, childSecrets));
        error.status = 500;
        error.details = {
          code,
          stdout: redactText(stdout, childSecrets),
          stderr: redactText(stderr, childSecrets),
        };
        reject(error);
        return;
      }
      resolve({
        code,
        stdout,
        stderr,
        safeStdout: redactText(stdout, childSecrets),
        safeStderr: redactText(stderr, childSecrets),
        json,
      });
    });
  });
}

function commandAvailable(command, args = ["--version"], timeoutMs = 2500) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      env: process.env,
      stdio: ["ignore", "ignore", "ignore"],
    });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve(false);
    }, timeoutMs);
    child.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

function chatwootUatSkillRootCandidates() {
  return dedupeStrings([
    process.env.CHATWOOT_UAT_SKILL_ROOT,
    DOCKER_CHATWOOT_UAT_SKILL_ROOT,
    LOCAL_CHATWOOT_UAT_SKILL_ROOT,
    VENDOR_CHATWOOT_UAT_SKILL_ROOT,
  ]);
}

function resolveChatwootUatSkillRoot() {
  const candidates = chatwootUatSkillRootCandidates();
  const selected = candidates.find((candidate) => fsSync.existsSync(path.join(candidate, "SKILL.md")));
  return selected ? path.resolve(selected) : path.resolve(candidates[0] || VENDOR_CHATWOOT_UAT_SKILL_ROOT);
}

function chatwootUatConfigHasApiKey() {
  if (CHATWOOT_UAT_API_KEY) return true;
  return Boolean(chatwootUatConfigValue(["CHATWOOT_API_KEY", "chatwoot_api_key"]));
}

function chatwootUatConfigValue(keys = []) {
  const configPath = path.join(HOME_DIR, ".skills", "config.yml");
  try {
    const text = fsSync.readFileSync(configPath, "utf8");
    if (!/chatwoot-test-uat\s*:/i.test(text)) return "";
    for (const key of keys) {
      const match = text.match(new RegExp(`^\\s*${escapeRegExp(key)}\\s*:\\s*['"]?([^'"\\n#]+)`, "im"));
      if (match?.[1]) return match[1].trim();
    }
    return "";
  } catch {
    return "";
  }
}

function cleanYamlScalar(value = "") {
  return asText(value)
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

function summarizeChatwootExpectation(expectation = {}) {
  if (!expectation || typeof expectation !== "object") return asText(expectation);
  const chunks = [];
  const containsAny = Array.isArray(expectation.contains_any) ? expectation.contains_any.map(asText).filter(Boolean) : [];
  const regexAny = Array.isArray(expectation.regex_any) ? expectation.regex_any.map(asText).filter(Boolean) : [];
  if (containsAny.length) chunks.push(`Contains any: ${containsAny.join(", ")}`);
  if (regexAny.length) chunks.push(`Regex any: ${regexAny.join(", ")}`);
  if (chunks.length) return chunks.join("\n");
  const entries = Object.entries(expectation).filter(([, value]) =>
    Array.isArray(value) ? value.length : Boolean(asText(value)),
  );
  if (!entries.length) return "";
  try {
    return JSON.stringify(Object.fromEntries(entries), null, 2);
  } catch {
    return "";
  }
}

function normalizeChatwootSuiteStep(rawStep = {}, index = 1) {
  const step = rawStep && typeof rawStep === "object" ? rawStep : {};
  const prompt = typeof rawStep === "string"
    ? asText(rawStep)
    : asText(step.prompt || step.user_message || step.userMessage || step.message || step.content || step.text || step.description);
  const expected = typeof rawStep === "string"
    ? ""
    : asText(step.expected_result || step.expectedResult) || summarizeChatwootExpectation(step.expectation);
  const testData = typeof rawStep === "string" ? "" : asText(step.test_data || step.testData);
  return {
    index,
    prompt,
    expected,
    testData,
  };
}

function chatwootCasePlannedTurns(rawCase = {}, steps = []) {
  const sourceCase = rawCase && typeof rawCase === "object" ? rawCase : {};
  const metadata = sourceCase.metadata && typeof sourceCase.metadata === "object" ? sourceCase.metadata : {};
  const direct = metadata.planned_user_turns || metadata.plannedUserTurns || sourceCase.user_turns || sourceCase.userTurns || sourceCase.planned_user_turns || sourceCase.plannedUserTurns;
  const fromDirect = Array.isArray(direct)
    ? direct.map(asText).filter(Boolean)
    : parseChatwootUserTurns(direct);
  if (fromDirect.length) return uniqueChatwootTurns(fromDirect);
  const fromSteps = steps.map((step) => asText(step.prompt || step.testData)).filter(Boolean);
  if (fromSteps.length) return uniqueChatwootTurns(fromSteps);
  return uniqueChatwootTurns([sourceCase.opening_prompt || sourceCase.openingPrompt].map(asText).filter(Boolean));
}

function rawChatwootStopPatterns(rawCase = {}) {
  const sourceCase = rawCase && typeof rawCase === "object" ? rawCase : {};
  const raw = sourceCase.stop_regex_any || sourceCase.stopRegexAny || sourceCase.stop_patterns || sourceCase.stopPatterns;
  if (Array.isArray(raw)) return raw.map(asText).filter(Boolean).slice(0, 12);
  return asText(raw)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function rawChatwootFailPatterns(rawCase = {}) {
  const sourceCase = rawCase && typeof rawCase === "object" ? rawCase : {};
  const raw = sourceCase.fail_regex_any || sourceCase.failRegexAny || sourceCase.fail_patterns || sourceCase.failPatterns;
  if (Array.isArray(raw)) return raw.map(asText).filter(Boolean).slice(0, 12);
  return asText(raw)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function rawChatwootStopConditions(rawCase = {}) {
  const sourceCase = rawCase && typeof rawCase === "object" ? rawCase : {};
  const metadata = sourceCase.metadata && typeof sourceCase.metadata === "object" ? sourceCase.metadata : {};
  return normalizeWorkspaceStopConditions(
    sourceCase.stop_conditions || sourceCase.stopConditions || metadata.stop_conditions || metadata.stopConditions,
    {
      title: sourceCase.title,
      objective: sourceCase.objective,
      expected_result: sourceCase.expected_result || sourceCase.expectedResult || metadata.jira_expected_result,
      stop_patterns: rawChatwootStopPatterns(sourceCase),
      fail_patterns: rawChatwootFailPatterns(sourceCase),
    },
  );
}

function patternFromHumanStopCondition(value = "", kind = "pass") {
  const text = asText(value).toLowerCase();
  if (!text) return "";
  if (/link|url|payment|thanh\s*to[aá]n/.test(text)) {
    return kind === "fail"
      ? "(?i)(không tạo được link|không thể thanh toán|payment failed|cannot create payment|no payment link)"
      : "(?i)https?://\\S+";
  }
  if (/booking|ticket|mã|ma|code|vé|ve|đặt chỗ|dat cho/.test(text)) {
    return kind === "fail"
      ? "(?i)(không tạo được mã|không thể đặt chỗ|booking failed|cannot create booking|no booking code|no ticket code)"
      : "(?i)(mã vé|mã đặt chỗ|mã booking|booking code|ticket code|booking_code|ticket_code).{0,80}[A-Z0-9]{6,12}";
  }
  if (/không có chuyến|khong co chuyen|hết chuyến|het chuyen|không còn|no trip|no available|not available|unavailable/.test(text)) {
    return kind === "fail"
      ? "(?i)(có chuyến|còn chuyến|available trips?|payment|thanh toán)"
      : "(?i)(không có chuyến|không tìm thấy chuyến|hết chuyến|không còn chuyến|no trips?|not available|unavailable)";
  }
  if (/handoff|agent|nhân viên|nhan vien|tư vấn|tu van/.test(text)) {
    return "(?i)(chuyển agent|chuyển cho nhân viên|nhân viên tư vấn|handoff|human agent)";
  }
  if (kind === "fail" && /lỗi|loi|không thể|khong the|sai|wrong|error|failed|failure|không hiểu|khong hieu/.test(text)) {
    return "(?i)(lỗi hệ thống|không thể xử lý|xin lỗi.*không thể|system error|technical error|không hiểu|chưa hiểu|wrong|failed|failure)";
  }
  return "";
}

function patternsFromHumanStopConditions(conditions = [], kind = "pass", fallbackCase = {}) {
  const patterns = normalizeWorkspaceConditionList(conditions, 6)
    .map((condition) => patternFromHumanStopCondition(condition, kind))
    .filter(Boolean);
  return kind === "fail"
    ? normalizeWorkspaceFailPatterns(patterns.length ? patterns : fallbackFailPatternsForWorkspaceCase(fallbackCase))
    : normalizeWorkspaceStopPatterns(patterns.length ? patterns : fallbackStopPatternsForWorkspaceCase(fallbackCase));
}

function normalizeChatwootStopConditionOverrides(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return new Map();
  const overrides = new Map();
  for (const [caseId, rawConditions] of Object.entries(value)) {
    const key = asText(caseId);
    if (!key) continue;
    const source = rawConditions && typeof rawConditions === "object" && !Array.isArray(rawConditions) ? rawConditions : { pass: rawConditions };
    const pass = normalizeWorkspaceConditionList(source.pass || source.passConditions || source.pass_conditions);
    const fail = normalizeWorkspaceConditionList(source.fail || source.failConditions || source.fail_conditions);
    if (pass.length || fail.length) {
      overrides.set(key, { pass, fail });
    }
  }
  return overrides;
}

function applyChatwootStopConditionOverrides(cases = [], overrides = new Map()) {
  if (!overrides.size) return cases;
  return cases.map((testCase, index) => {
    const caseId = asText(testCase?.case_id || testCase?.caseId || `case-${index + 1}`);
    if (!overrides.has(caseId)) return testCase;
    const override = overrides.get(caseId) || {};
    const stopConditions = normalizeWorkspaceStopConditions(override, {
      ...testCase,
      stop_patterns: rawChatwootStopPatterns(testCase),
      fail_patterns: rawChatwootFailPatterns(testCase),
    });
    return {
      ...testCase,
      stop_conditions: stopConditions,
      metadata: {
        ...(testCase?.metadata && typeof testCase.metadata === "object" ? testCase.metadata : {}),
        stop_conditions: stopConditions,
      },
      stop_regex_any: override.pass?.length
        ? patternsFromHumanStopConditions(override.pass, "pass", testCase)
        : rawChatwootStopPatterns(testCase),
      fail_regex_any: override.fail?.length
        ? patternsFromHumanStopConditions(override.fail, "fail", testCase)
        : rawChatwootFailPatterns(testCase),
    };
  });
}

function chatwootSuiteCaseMeta(testCase = {}, index = 0) {
  const sourceCase = testCase && typeof testCase === "object" ? testCase : {};
  const rawSteps = Array.isArray(sourceCase.steps) ? sourceCase.steps : [];
  const normalizedSteps = rawSteps
    .map((step, stepIndex) => normalizeChatwootSuiteStep(step, stepIndex + 1))
    .filter((step) => step.prompt || step.testData || step.expected);
  const plannedTurns = chatwootCasePlannedTurns(sourceCase, normalizedSteps);
  const steps = normalizedSteps.length
    ? normalizedSteps
    : plannedTurns.map((turn, stepIndex) => ({
        index: stepIndex + 1,
        prompt: turn,
        expected: "",
        testData: turn,
      }));
  const metadata = sourceCase.metadata && typeof sourceCase.metadata === "object" ? sourceCase.metadata : {};
  const openingPrompt = asText(sourceCase.opening_prompt || sourceCase.openingPrompt || steps[0]?.prompt || plannedTurns[0]);
  const testData = plannedTurns.length
    ? plannedTurns.map((turn, turnIndex) => `${turnIndex + 1}. "${turn}"`).join("\n")
    : openingPrompt;
  const expectedResult = asText(
    sourceCase.expected_result ||
      sourceCase.expectedResult ||
      metadata.jira_expected_result ||
      metadata.expected_result ||
      metadata.expectedResult ||
      sourceCase.objective,
  );
  const plannerInstruction = asText(
    sourceCase.adaptive_instruction ||
      sourceCase.adaptiveInstruction ||
      metadata.adaptive_instruction ||
      metadata.adaptiveInstruction,
  );
  return {
    index: index + 1,
    caseId: asText(sourceCase.case_id || sourceCase.caseId || `case-${index + 1}`),
    title: asText(sourceCase.title || sourceCase.objective || sourceCase.case_id || `Case ${index + 1}`),
    objective: asText(sourceCase.objective),
    openingPrompt,
    testData,
    expectedResult,
    plannerInstruction,
    stopPatterns: rawChatwootStopPatterns(sourceCase),
    failPatterns: rawChatwootFailPatterns(sourceCase),
    stopConditions: rawChatwootStopConditions(sourceCase),
    steps,
  };
}

async function readChatwootSuiteMeta(filePath, skillRoot) {
  const text = await fs.readFile(filePath, "utf8");
  let payload = null;
  try {
    payload = await readYamlAsJson(filePath);
  } catch {
    payload = null;
  }
  const relativePath = path.relative(skillRoot, filePath);
  const cases = Array.isArray(payload?.cases)
    ? payload.cases.map((testCase, index) => chatwootSuiteCaseMeta(testCase, index))
    : [];
  const suiteName = asText(payload?.suite_name) || cleanYamlScalar(text.match(/^\s*suite_name\s*:\s*(.+?)\s*$/m)?.[1] || path.basename(filePath, path.extname(filePath)));
  const goalSummary = asText(payload?.goal_summary) || cleanYamlScalar(text.match(/^\s*goal_summary\s*:\s*(.+?)\s*$/m)?.[1] || "");
  const caseCount = cases.length || (text.match(/^\s*-\s+case_id\s*:/gm) || []).length || (text.match(/"case_id"\s*:/g) || []).length;
  const stat = await fs.stat(filePath);
  return {
    suiteName,
    goalSummary,
    caseCount,
    cases,
    path: filePath,
    relativePath,
    visibleInEasyForQc: shouldShowChatwootSuiteInEasyForQc(relativePath, payload),
    updatedAt: stat.mtime.toISOString(),
  };
}

function normalizedRelativePath(value = "") {
  return asText(value).split(path.sep).join("/");
}

function shouldShowChatwootSuiteInEasyForQc(relativePath, payload = {}) {
  const normalized = normalizedRelativePath(relativePath);
  if (normalized === normalizedRelativePath(AI_548_CHATWOOT_SUITE_RELATIVE)) return true;
  if (normalized === normalizedRelativePath(AI_547_CHATWOOT_SUITE_RELATIVE)) return true;
  if (normalized.startsWith(`${normalizedRelativePath(EASYFORQC_CHATWOOT_GENERATED_RELATIVE)}/`)) return true;
  const source = payload?.source && typeof payload.source === "object" ? payload.source : {};
  const sourceTrace = payload?.source_trace && typeof payload.source_trace === "object" ? payload.source_trace : {};
  return Boolean(source.easyforqc_generated || source.created_by === "easyforqc" || sourceTrace.easyforqc_generated);
}

async function walkFiles(root) {
  const files = [];
  async function visit(dir) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const itemPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(itemPath);
      } else if (entry.isFile()) {
        files.push(itemPath);
      }
    }
  }
  await visit(root);
  return files;
}

async function listChatwootUatSuites(skillRoot) {
  const suitesRoot = path.join(skillRoot, "assets", "suites");
  const suiteFiles = (await walkFiles(suitesRoot))
    .filter((filePath) => /\.ya?ml$/i.test(filePath))
    .sort((left, right) => {
      const leftDefault = path.basename(left) === "default_suite.yml" ? 1 : 0;
      const rightDefault = path.basename(right) === "default_suite.yml" ? 1 : 0;
      if (leftDefault !== rightDefault) return leftDefault - rightDefault;
      return right.localeCompare(left);
    });
  const suites = [];
  for (const filePath of suiteFiles) {
    try {
      const suite = await readChatwootSuiteMeta(filePath, skillRoot);
      if (suite.visibleInEasyForQc) suites.push(suite);
    } catch {
      const relativePath = path.relative(skillRoot, filePath);
      if (shouldShowChatwootSuiteInEasyForQc(relativePath, {})) {
        suites.push({
          suiteName: path.basename(filePath, path.extname(filePath)),
          goalSummary: "",
          caseCount: 0,
          cases: [],
          path: filePath,
          relativePath,
          updatedAt: "",
        });
      }
    }
  }
  return suites;
}

function runPythonJsonCommand(args, options = {}) {
  const childSecrets = [
    ...(options.secrets || []),
    ...Object.entries(options.env || {})
      .filter(([key]) => SECRET_KEY_PATTERN.test(key))
      .map(([, value]) => value),
  ];
  return new Promise((resolve, reject) => {
    const child = spawn("python3", args, {
      cwd: options.cwd || ROOT_DIR,
      env: { ...process.env, ...(options.env || {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(redactText(`Python command timed out: ${args.join(" ")}`, childSecrets)));
    }, options.timeoutMs || 120000);
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
      if (code !== 0) {
        const error = new Error(redactText(stderr || stdout || `Python command exited with ${code}`, childSecrets));
        error.status = 500;
        reject(error);
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(Object.assign(new Error(`Python command did not return JSON: ${redactText(stdout || stderr, childSecrets).slice(0, 500)}`), { status: 500 }));
      }
    });
  });
}

async function readYamlAsJson(filePath) {
  return runPythonJsonCommand(
    [
      "-c",
      [
        "import json, sys, yaml",
        "from pathlib import Path",
        "payload = yaml.safe_load(Path(sys.argv[1]).read_text(encoding='utf-8'))",
        "print(json.dumps(payload or {}, ensure_ascii=False))",
      ].join("; "),
      filePath,
    ],
    { timeoutMs: 120000 },
  );
}

function chatwootSuiteSlug(value) {
  return safeFileStem(value).replace(/_/g, "-") || "chatwoot-suite";
}

function cleanChatwootUserTurn(value = "") {
  return asText(value)
    .trim()
    .replace(/^\d+\s*[\.)]\s*/, "")
    .replace(/^["“”']+|["“”']+$/g, "")
    .trim();
}

function parseChatwootUserTurns(value = "") {
  const text = asText(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return [];
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const numbered = lines
    .filter((line) => /^\d+\s*[\.)]\s+/.test(line))
    .map(cleanChatwootUserTurn)
    .filter(Boolean);
  if (numbered.length) return numbered;
  const quoted = Array.from(text.matchAll(/["“]([^"”]+)["”]/g)).map((match) => cleanChatwootUserTurn(match[1])).filter(Boolean);
  if (quoted.length) return quoted;
  return lines.map(cleanChatwootUserTurn).filter(Boolean);
}

function chatwootContactForIndex(index) {
  const names = ["Khánh Thị Thiện", "Thiện Thị Khánh", "Nguyễn Minh Khánh", "Lê Khánh An", "Võ Khánh Linh"];
  return {
    name: `${names[(index - 1) % names.length]} ${String(index).padStart(3, "0")}`,
    phone: `090000${String(index).padStart(4, "0")}`,
    email: null,
  };
}

function buildChatwootStep(prompt) {
  return {
    prompt,
    timeout_seconds: null,
    expectation: {
      contains_any: [],
      regex_any: [],
    },
  };
}

function chatwootSuiteDefaults(body = {}) {
  const labels = asText(body.labels)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    webhook_url: asText(body.webhookUrl) || DEFAULT_CHATWOOT_UAT_WEBHOOK_URL,
    chat_ui_mode: body.chatUiMode === "webhook-only" ? "webhook-only" : "realistic",
    ui_inbox_id: asOptionalNumber(body.uiInboxId || DEFAULT_CHATWOOT_UAT_UI_INBOX_ID),
    labels: labels.length ? labels : ["ai"],
    assignee_name: asText(body.assigneeName) || "Bot",
    reply_timeout_seconds: 300,
    reply_settle_seconds: 3,
    poll_interval_seconds: 2,
    inbox_id: asOptionalNumber(body.inboxId || DEFAULT_CHATWOOT_UAT_INBOX_ID),
    captain_assistant_id: asOptionalNumber(body.captainAssistantId || DEFAULT_CHATWOOT_UAT_CAPTAIN_ASSISTANT_ID),
  };
}

function workspaceTestCaseTurns(testCase = {}) {
  const direct = parseChatwootUserTurns(testCase.test_data || testCase.testData);
  if (direct.length) return direct;
  const structured = Array.isArray(testCase.structured_steps) ? testCase.structured_steps : [];
  const structuredTurns = structured
    .flatMap((step) => parseChatwootUserTurns(step?.test_data || step?.testData || step?.description))
    .filter(Boolean);
  if (structuredTurns.length) return structuredTurns;
  if (Array.isArray(testCase.steps)) {
    return testCase.steps.map(cleanChatwootUserTurn).filter(Boolean);
  }
  return [];
}

function workspaceTestCaseToChatwootCase(testCase, index, body = {}) {
  const turns = workspaceTestCaseTurns(testCase);
  if (!turns.length) return null;
  const title = asText(testCase.title) || `Chatwoot UAT case ${index}`;
  const stopConditions = normalizeWorkspaceStopConditions(testCase.stop_conditions || testCase.stopConditions, testCase);
  return {
    case_id: chatwootSuiteSlug(`${index}-${title}`).slice(0, 100),
    title,
    objective: asText(testCase.objective) || title,
    opening_prompt: turns[0],
    metadata: {
      source: "easyforqc_workspace",
      planned_user_turns: turns,
      jira_expected_result: asText(testCase.expected_result || testCase.expectedResult),
      adaptive_instruction: "Treat planned_user_turns as ordered user intents. Adapt each next user message to the real bot reply.",
      stop_conditions: stopConditions,
    },
    conversation_id: null,
    contact_id: null,
    inbox_id: asOptionalNumber(body.inboxId || DEFAULT_CHATWOOT_UAT_INBOX_ID),
    captain_assistant_id: asOptionalNumber(body.captainAssistantId || DEFAULT_CHATWOOT_UAT_CAPTAIN_ASSISTANT_ID),
    ui_inbox_id: asOptionalNumber(body.uiInboxId || DEFAULT_CHATWOOT_UAT_UI_INBOX_ID),
    labels: chatwootSuiteDefaults(body).labels,
    assignee_name: asText(body.assigneeName) || "Bot",
    stop_conditions: stopConditions,
    stop_regex_any: normalizeWorkspaceStopPatterns(testCase.stop_patterns || testCase.stopPatterns || testCase.stop_regex_any),
    fail_regex_any: normalizeWorkspaceFailPatterns(testCase.fail_patterns || testCase.failPatterns || testCase.fail_regex_any),
    contact: chatwootContactForIndex(index),
    steps: turns.map(buildChatwootStep),
  };
}

function buildChatwootSuiteFromWorkspaceItem(item, body = {}) {
  const normalized = normalizeQaWorkspaceItem(item);
  const cases = normalized.testCases
    .map((testCase, index) => workspaceTestCaseToChatwootCase(testCase, index + 1, body))
    .filter(Boolean);
  if (!cases.length) {
    throw Object.assign(new Error("Workspace item này chưa có Test Data dạng user message để tạo Chatwoot UAT suite."), { status: 400 });
  }
  const suiteName = chatwootSuiteSlug(body.suiteName || normalized.chatwootSuiteName || `${normalized.issueKey || "workspace"}-${normalized.title}`);
  return {
    suite_name: suiteName,
    generated_at: new Date().toISOString(),
    goal_summary: `Chatwoot UAT suite generated from EasyForQC workspace item ${normalized.issueKey || normalized.title}. Cases=${cases.length}.`,
    defaults: chatwootSuiteDefaults(body),
    source: {
      type: "easyforqc_workspace",
      created_by: "easyforqc",
      easyforqc_generated: true,
      workspace_item_id: normalized.id,
      issue_key: normalized.issueKey,
    },
    cases,
  };
}

function manualChatwootScenarioTitle(turns = []) {
  const firstTurn = asText(turns[0]).replace(/\s+/g, " ").trim();
  if (!firstTurn) return "Kịch bản Chatwoot UAT tự nhập";
  return `Kịch bản user: ${firstTurn}`.slice(0, 120);
}

function extractRequestedChatwootCaseCount(value = "") {
  const text = asText(value).toLowerCase();
  const digitMatch =
    text.match(/(?:tạo|generate|sinh|viết|viet|làm|lam|create|build)\s+(\d{1,2})\s*(?:test\s*case|case|kịch bản|kich ban|scenario)/i);
  if (digitMatch) return Math.max(1, Math.min(Number(digitMatch[1]) || 1, 30));
  for (const match of text.matchAll(/\b(\d{1,2})\s*(?:test\s*case|cases|case|kịch bản|kich ban|scenario)\b/gi)) {
    const before = text.slice(Math.max(0, (match.index || 0) - 18), match.index || 0);
    if (/(?:thành|thanh|là|la)\s*$/i.test(before)) continue;
    return Math.max(1, Math.min(Number(match[1]) || 1, 30));
  }
  const wordNumbers = {
    "một": 1,
    mot: 1,
    "hai": 2,
    "ba": 3,
    "bốn": 4,
    bon: 4,
    "năm": 5,
    nam: 5,
    "sáu": 6,
    sau: 6,
    "bảy": 7,
    bay: 7,
    "tám": 8,
    tam: 8,
    "chín": 9,
    chin: 9,
    "mười": 10,
    muoi: 10,
  };
  for (const [word, count] of Object.entries(wordNumbers)) {
    const pattern = new RegExp(`(?:tạo|generate|sinh|viết|viet|làm|lam|create|build)\\s+${word}\\s*(?:test\\s*case|case|kịch bản|kich ban|scenario)`, "i");
    if (pattern.test(text)) return count;
  }
  return 0;
}

function stripManualChatwootCountInstruction(value = "") {
  return asText(value)
    .replace(/^\s*(?:hãy\s+|hay\s+)?(?:tạo|generate|sinh|viết|viet|làm|lam|create|build)\s+(?:\d{1,2}|một|mot|hai|ba|bốn|bon|năm|nam|sáu|sau|bảy|bay|tám|tam|chín|chin|mười|muoi)\s*(?:test\s*case|case|kịch bản|kich ban|scenario)\s*/i, "")
    .replace(/^[\s:,\-.]+/, "")
    .trim();
}

function extractManualChatwootCaseSegments(scenario = "") {
  const cleaned = stripManualChatwootCountInstruction(scenario).replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const markers = Array.from(cleaned.matchAll(/(?:thành|thanh|là|la)\s*(?:một|1)\s*test\s*case/gi));
  if (!markers.length) return [];
  const segments = [];
  let start = 0;
  for (const marker of markers) {
    const end = marker.index ?? 0;
    const segment = cleaned.slice(start, end).replace(/^[\s,;:.]+|[\s,;:.]+$/g, "").trim();
    if (segment) segments.push(segment);
    start = end + marker[0].length;
  }
  const tail = cleaned.slice(start).replace(/^[\s,;:.]+|[\s,;:.]+$/g, "").trim();
  if (tail) segments.push(tail);
  const baseContextMatch = cleaned.match(/^(.{12,180}?)(?=,\s*nếu\b|\s+nếu\b|,\s*if\b|\s+if\b)/i);
  const baseContext = baseContextMatch ? baseContextMatch[1].replace(/^[\s,;:.]+|[\s,;:.]+$/g, "").trim() : "";
  if (!baseContext) return segments;
  const baseKey = baseContext.slice(0, 40).toLowerCase();
  return segments.map((segment, index) => {
    if (index === 0 || segment.toLowerCase().includes(baseKey)) return segment;
    return `${baseContext}. ${segment}`;
  });
}

function manualChatwootCaseTitleFromText(text = "", index = 1, total = 1) {
  const cleaned = stripManualChatwootCountInstruction(text).replace(/\s+/g, " ").trim();
  const core = cleaned || `Kịch bản Chatwoot UAT ${index}`;
  const prefix = total > 1 ? `Case ${String(index).padStart(2, "0")}: ` : "";
  return `${prefix}${core}`.slice(0, 140);
}

function uniqueChatwootTurns(turns = []) {
  const seen = new Set();
  const output = [];
  for (const turn of turns.map(cleanChatwootUserTurn).filter(Boolean)) {
    const key = turn.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(turn);
  }
  return output;
}

function normalizeChatwootTurnSource(value) {
  if (typeof value === "string") return parseChatwootUserTurns(value);
  if (value && typeof value === "object") {
    return parseChatwootUserTurns(value.prompt || value.user_message || value.message || value.content || value.text || value.intent);
  }
  return [];
}

function normalizeChatwootCaseTurns(rawCase = {}, fallbackTurns = []) {
  const candidates = [];
  candidates.push(asText(rawCase.opening_prompt || rawCase.openingPrompt));
  for (const key of ["user_turns", "userTurns", "planned_user_turns", "plannedUserTurns", "messages", "steps"]) {
    const value = rawCase[key];
    if (Array.isArray(value)) {
      for (const item of value) candidates.push(...normalizeChatwootTurnSource(item));
    } else if (value) {
      candidates.push(...normalizeChatwootTurnSource(value));
    }
  }
  const turns = uniqueChatwootTurns(candidates);
  return turns.length ? turns : uniqueChatwootTurns(fallbackTurns);
}

function normalizeChatwootStopPatterns(rawCase = {}) {
  const raw = rawCase.stop_regex_any || rawCase.stopRegexAny || rawCase.stop_patterns || rawCase.stopPatterns;
  const values = Array.isArray(raw) ? raw : asText(raw).split(/\r?\n/);
  const patterns = values.map(asText).map((item) => item.trim()).filter(Boolean);
  return patterns.length ? patterns.slice(0, 8) : ["(?i)https?://\\S+"];
}

function normalizeChatwootFailPatterns(rawCase = {}) {
  const raw = rawCase.fail_regex_any || rawCase.failRegexAny || rawCase.fail_patterns || rawCase.failPatterns;
  const values = Array.isArray(raw) ? raw : asText(raw).split(/\r?\n/);
  const patterns = values.map(asText).map((item) => item.trim()).filter(Boolean);
  return patterns.length ? patterns.slice(0, 8) : normalizeWorkspaceFailPatterns([], true);
}

function buildManualChatwootFallbackCases(scenario = "", turns = [], requestedCount = 0) {
  const segments = extractManualChatwootCaseSegments(scenario);
  const count = Math.max(1, Math.min(Math.max(requestedCount || 0, segments.length || 0) || 1, 30));
  const sources = segments.length ? segments : [scenario || turns.join("\n")];
  return Array.from({ length: count }, (_, index) => {
    const source = sources[index] || sources[sources.length - 1] || scenario || turns.join("\n");
    const parsedTurns = parseChatwootUserTurns(source);
    const caseTurns = uniqueChatwootTurns(parsedTurns.length ? parsedTurns : turns);
    return {
      title: manualChatwootCaseTitleFromText(source, index + 1, count),
      objective: source || scenario,
      user_turns: caseTurns,
      expected_result: source || scenario,
      stop_conditions: fallbackStopConditionsForWorkspaceCase({
        title: source,
        objective: source || scenario,
        test_data: caseTurns.join("\n"),
        expected_result: source || scenario,
      }),
      stop_regex_any: fallbackStopPatternsForWorkspaceCase({
        title: source,
        objective: source || scenario,
        test_data: caseTurns.join("\n"),
        expected_result: source || scenario,
      }),
      fail_regex_any: fallbackFailPatternsForWorkspaceCase({
        title: source,
        objective: source || scenario,
        test_data: caseTurns.join("\n"),
        expected_result: source || scenario,
      }),
      adaptive_instruction: "Treat planned_user_turns as ordered user intents. Adapt each next user message to the real bot reply.",
      source: "manual_fallback",
    };
  });
}

function normalizeManualChatwootAiPlan(payload = {}, scenario = "", requestedCount = 0, fallbackTurns = []) {
  const rawCases = Array.isArray(payload?.cases) ? payload.cases : [];
  let cases = rawCases
    .map((rawCase, index) => {
      const turns = normalizeChatwootCaseTurns(rawCase, fallbackTurns);
      if (!turns.length) return null;
      const title = asText(rawCase.title || rawCase.name) || manualChatwootCaseTitleFromText(turns[0], index + 1, rawCases.length || requestedCount || 1);
      return {
        case_id: asText(rawCase.case_id || rawCase.caseId),
        title,
        objective: asText(rawCase.objective || rawCase.goal || rawCase.description) || title,
        opening_prompt: asText(rawCase.opening_prompt || rawCase.openingPrompt) || turns[0],
        user_turns: turns,
        expected_result: asText(rawCase.expected_result || rawCase.expectedResult || rawCase.expected) || "",
        stop_conditions: normalizeWorkspaceStopConditions(
          rawCase.stop_conditions || rawCase.stopConditions || {
            pass: rawCase.pass_conditions || rawCase.passConditions,
            fail: rawCase.fail_conditions || rawCase.failConditions,
          },
          rawCase,
        ),
        adaptive_instruction: asText(rawCase.adaptive_instruction || rawCase.adaptiveInstruction),
        stop_regex_any: normalizeChatwootStopPatterns(rawCase),
        fail_regex_any: normalizeChatwootFailPatterns(rawCase),
        source: "manual_ai",
      };
    })
    .filter(Boolean);
  if (requestedCount && cases.length > requestedCount) {
    cases = cases.slice(0, requestedCount);
  }
  if (requestedCount && cases.length < requestedCount) {
    const fallbackCases = buildManualChatwootFallbackCases(scenario, fallbackTurns, requestedCount);
    cases = [
      ...cases,
      ...fallbackCases.slice(cases.length).map((fallbackCase) => ({ ...fallbackCase, source: "manual_ai_fallback_fill" })),
    ];
  }
  return {
    suiteName: asText(payload.suite_name || payload.suiteName),
    goalSummary: asText(payload.goal_summary || payload.goalSummary),
    cases,
  };
}

function buildManualChatwootAiMessages({ scenario, requestedCount, settings }) {
  const schema = {
    suite_name: "short_slug_or_name",
    goal_summary: "short summary of the generated UAT suite",
    cases: [
      {
        case_id: "optional-stable-slug",
        title: "clear purpose of this test case",
        objective: "what this case validates",
        opening_prompt: "the first real user message sent to the bot",
        user_turns: ["ordered user messages or intents only"],
        expected_result: "pass/fail condition in business terms",
        pass_conditions: ["human-readable pass stop condition"],
        fail_conditions: ["human-readable fail stop condition"],
        adaptive_instruction: "how the runtime AI should adapt to bot replies while preserving the case goal",
        stop_regex_any: ["(?i)https?://\\S+"],
        fail_regex_any: ["(?i)(lỗi hệ thống|không thể xử lý)"],
      },
    ],
  };
  const system = [
    "You are a senior QA automation planner for adaptive Chatwoot UAT.",
    "Convert the user's request into executable chatbot test cases.",
    "Return only one valid JSON object. Do not wrap it in markdown.",
    "Do not answer the user scenario; design the automation cases.",
  ].join("\n");
  const user = [
    `Manual request:\n${truncateForPrompt(scenario, 8000)}`,
    "",
    `Explicit requested case count: ${requestedCount || "not specified"}`,
    settings?.promptGuidelines ? `EasyForQC prompt rules to preserve:\n${truncateForPrompt(settings.promptGuidelines, 4000)}` : "",
    "",
    "Rules:",
    "- If an explicit case count is provided, return exactly that many cases.",
    "- If no count is provided, choose the smallest number of cases that fully covers the requested scenario.",
    "- Each case must be independent and runnable from a fresh Chatwoot conversation.",
    "- Preserve concrete business details such as booking code, route, date, passenger count, fallback date, pickup/dropoff, and payment-link expectation.",
    "- user_turns must contain only user messages/intents to send to the bot. Do not put bot replies or assertions as user messages.",
    "- Put conditional logic in objective, expected_result, and adaptive_instruction. Example: if 20/5 has no trip, ask for 21/5; if both dates have no trip, stop without asking for payment.",
    "- For booking success cases, include a stop regex that catches a payment URL.",
    "- For every case, include pass_conditions and fail_conditions as natural language sentences for QA users, not regex.",
    "- Write pass_conditions and fail_conditions in Vietnamese with full diacritics. Keep product names, route names, Jira keys, tool/API identifiers, and codes unchanged.",
    "- For every case, include fail_regex_any to stop and mark failed when the bot hard-fails, answers out of context, or reaches the opposite business outcome.",
    "- For negative/no-option cases, include stop regex patterns that can stop when the bot clearly confirms no available trip/option.",
    "- Write concise Vietnamese titles when the input is Vietnamese.",
    "",
    "Required JSON schema:",
    JSON.stringify(schema, null, 2),
  ]
    .filter(Boolean)
    .join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

async function generateManualChatwootAiPlan({ scenario, aiSettings }) {
  const requestedCount = extractRequestedChatwootCaseCount(scenario);
  const result = await callOpenAiCompatible(aiSettings, buildManualChatwootAiMessages({ scenario, requestedCount, settings: aiSettings }));
  return normalizeManualChatwootAiPlan(result.payload, scenario, requestedCount, parseChatwootUserTurns(scenario));
}

function manualChatwootCaseToSuiteCase(rawCase = {}, index = 1, body = {}, fallbackTurns = [], scenario = "") {
  const defaults = chatwootSuiteDefaults(body);
  const turns = normalizeChatwootCaseTurns(rawCase, fallbackTurns);
  if (!turns.length) return null;
  const title = asText(rawCase.title) || manualChatwootScenarioTitle(turns);
  const expectedResult = asText(rawCase.expected_result || rawCase.expectedResult);
  const stopConditions = normalizeWorkspaceStopConditions(rawCase.stop_conditions || rawCase.stopConditions, rawCase);
  return {
    case_id: chatwootSuiteSlug(rawCase.case_id || rawCase.caseId || `${String(index).padStart(2, "0")}-${title}`).slice(0, 100),
    title,
    objective: asText(rawCase.objective) || expectedResult || scenario || title,
    opening_prompt: asText(rawCase.opening_prompt || rawCase.openingPrompt) || turns[0],
    metadata: {
      source: asText(rawCase.source) || "manual_scenario",
      planned_user_turns: turns,
      original_scenario: scenario,
      jira_expected_result: expectedResult,
      stop_conditions: stopConditions,
      adaptive_instruction:
        asText(rawCase.adaptive_instruction || rawCase.adaptiveInstruction) ||
        "Treat planned_user_turns as ordered user intents. Adapt each next user message to the real bot reply.",
    },
    conversation_id: null,
    contact_id: null,
    inbox_id: asOptionalNumber(body.inboxId || DEFAULT_CHATWOOT_UAT_INBOX_ID),
    captain_assistant_id: asOptionalNumber(body.captainAssistantId || DEFAULT_CHATWOOT_UAT_CAPTAIN_ASSISTANT_ID),
    ui_inbox_id: asOptionalNumber(body.uiInboxId || DEFAULT_CHATWOOT_UAT_UI_INBOX_ID),
    labels: defaults.labels,
    assignee_name: asText(body.assigneeName) || "Bot",
    stop_conditions: stopConditions,
    stop_regex_any: normalizeChatwootStopPatterns(rawCase),
    fail_regex_any: normalizeChatwootFailPatterns(rawCase),
    contact: chatwootContactForIndex(index),
    steps: turns.map(buildChatwootStep),
  };
}

function buildManualChatwootSuite(body = {}, aiPlan = null) {
  const scenario = asText(body.scenario || body.goal || body.script);
  const turns = parseChatwootUserTurns(body.userTurns || body.turns || scenario);
  if (!turns.length) {
    throw Object.assign(new Error("Cần nhập ít nhất một câu user hoặc kịch bản để tạo suite Chatwoot UAT."), { status: 400 });
  }
  const requestedCount = extractRequestedChatwootCaseCount(scenario);
  const plannedCases = Array.isArray(aiPlan?.cases) && aiPlan.cases.length ? aiPlan.cases : buildManualChatwootFallbackCases(scenario, turns, requestedCount);
  const cases = plannedCases
    .map((testCase, index) => manualChatwootCaseToSuiteCase(testCase, index + 1, body, turns, scenario))
    .filter(Boolean);
  if (!cases.length) {
    throw Object.assign(new Error("Không tạo được test case Chatwoot UAT từ kịch bản đã nhập."), { status: 400 });
  }
  const title = asText(body.title || body.suiteName || aiPlan?.suiteName) || manualChatwootScenarioTitle(turns);
  const suiteName = chatwootSuiteSlug(body.suiteName || title);
  return {
    suite_name: suiteName,
    generated_at: new Date().toISOString(),
    goal_summary: asText(aiPlan?.goalSummary) || scenario || `Manual Chatwoot UAT suite. Turns=${turns.length}.`,
    defaults: chatwootSuiteDefaults(body),
    source: {
      type: "easyforqc_manual_scenario",
      created_by: "easyforqc",
      easyforqc_generated: true,
      planning_mode: Array.isArray(aiPlan?.cases) && aiPlan.cases.length ? "ai" : "fallback",
    },
    cases,
  };
}

async function writeChatwootGeneratedSuite(skillRoot, suitePayload, preferredName = "") {
  const suitesRoot = path.join(skillRoot, EASYFORQC_CHATWOOT_GENERATED_RELATIVE);
  const suiteName = chatwootSuiteSlug(preferredName || suitePayload.suite_name || "easyforqc-chatwoot-suite");
  const datedDir = `${new Date().toISOString().slice(0, 10)}-${suiteName}`;
  const outputDir = path.join(suitesRoot, datedDir);
  await fs.mkdir(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${suiteName}.yml`);
  const markedPayload = {
    ...suitePayload,
    source: {
      ...(suitePayload.source && typeof suitePayload.source === "object" ? suitePayload.source : {}),
      created_by: "easyforqc",
      easyforqc_generated: true,
    },
  };
  await fs.writeFile(outputFile, JSON.stringify(markedPayload, null, 2) + "\n", "utf8");
  return {
    outputFile,
    suite: await readChatwootSuiteMeta(outputFile, skillRoot),
  };
}

function chatwootSuiteCaseToWorkspaceTestCase(chatCase = {}, index = 1, issueKey = "") {
  const metadata = chatCase.metadata && typeof chatCase.metadata === "object" ? chatCase.metadata : {};
  const turns = Array.isArray(metadata.planned_user_turns)
    ? metadata.planned_user_turns.map(asText).filter(Boolean)
    : Array.isArray(chatCase.steps)
      ? chatCase.steps.map((step) => asText(step?.prompt)).filter(Boolean)
      : [];
  const expected = asText(metadata.jira_expected_result || chatCase.expected_result);
  const stopConditions = normalizeWorkspaceStopConditions(chatCase.stop_conditions || chatCase.stopConditions || metadata.stop_conditions || metadata.stopConditions, chatCase);
  return {
    title: asText(chatCase.title) || `[TC_${String(index).padStart(4, "0")}] Chatwoot UAT case`,
    objective: asText(chatCase.objective || metadata.source_testcase_name),
    priority: "High",
    technique: "Adaptive Chatwoot UAT",
    risk: expected || "Bot có thể gọi tool sai thứ tự, mất context hoặc phản hồi không đúng ngữ cảnh.",
    requirement_ref: asText(metadata.source_testcase_key || issueKey),
    coverage_tags: ["chatwoot-uat", "ai-planner", "booking-flow", asText(metadata.source_testcase_key)].filter(Boolean),
    scenario_type: "chatbot_uat",
    precondition: "Chatwoot UAT auth đã cấu hình; BaoApiInbox 3062 và captain_assistant_id 80 sẵn sàng; AI planner đọc phản hồi bot theo từng turn.",
    test_data: turns.map((turn, turnIndex) => `${turnIndex + 1}. "${turn}"`).join("\n"),
    expected_result: expected,
    stop_conditions: stopConditions,
    stop_patterns: normalizeWorkspaceStopPatterns(chatCase.stop_regex_any || chatCase.stopRegexAny || chatCase.stop_patterns || chatCase.stopPatterns),
    fail_patterns: normalizeWorkspaceFailPatterns(chatCase.fail_regex_any || chatCase.failRegexAny || chatCase.fail_patterns || chatCase.failPatterns),
    steps: turns,
    structured_steps: turns.map((turn, turnIndex) => ({
      description: turnIndex === 0 ? "Gửi opening prompt vào Chatwoot UAT" : "Gửi user message tiếp theo theo ngữ cảnh bot",
      test_data: turn,
      expected_result: turnIndex === turns.length - 1 ? expected : "Bot phản hồi đúng ngữ cảnh và AI planner chọn được lượt user kế tiếp phù hợp.",
    })),
  };
}

function chatwootSuiteToWorkspaceItem(suite = {}, options = {}) {
  const issueKey = asText(options.issueKey || suite?.source?.key || "AI-548").toUpperCase();
  const cases = Array.isArray(suite.cases) ? suite.cases : [];
  const testCases = cases.map((chatCase, index) => chatwootSuiteCaseToWorkspaceTestCase(chatCase, index + 1, issueKey));
  const sourceKey = asText(options.sourceKey || issueKey || suite.suite_name);
  return normalizeQaWorkspaceItem({
    id: asText(options.id) || `workspace-${chatwootSuiteSlug(sourceKey || suite.suite_name)}`,
    issueKey,
    title: asText(options.title) || `[${issueKey}] ${asText(suite.suite_name) || "Chatwoot UAT suite"}`,
    source: "chatwoot_suite_import",
    sourceKey,
    archetypeKey: "chatwoot_uat",
    chatwootSuiteFile: asText(options.suiteFile),
    chatwootSuiteName: asText(suite.suite_name),
    testCases,
    outline: {
      issue_key: issueKey,
      title: `[${issueKey}] Chatwoot UAT coverage`,
      template: "chatwoot_uat",
      source_context: {
        imported_suite: asText(options.suiteFile),
        goal_summary: asText(suite.goal_summary),
      },
      design_rationale: {
        primary_techniques: ["Conversation flow", "Tool contract regression", "Adaptive AI planner"],
        supporting_techniques: ["Negative path", "State carry-forward", "Recovery/fallback"],
      },
      branches: [
        {
          title: "Booking pending và payment link",
          items: testCases.slice(0, 5).map((testCase) => testCase.title),
        },
        {
          title: "Tool contract và thứ tự gọi tool",
          items: testCases.filter((testCase) => /tool|bms|seat|payment/i.test(testCase.title)).slice(0, 6).map((testCase) => testCase.title),
        },
        {
          title: "Adaptive context và fallback",
          items: testCases.filter((testCase) => /đổi|thiếu|không|fallback|context|duplicate/i.test(`${testCase.title} ${testCase.expected_result}`)).slice(0, 6).map((testCase) => testCase.title),
        },
        {
          title: "Out of scope",
          items: ["Không kiểm production Chatwoot.", "Không validate thanh toán thật ngoài payment link UAT.", "Không thay đổi dữ liệu booking ngoài phạm vi UAT suite."],
        },
      ].filter((branch) => branch.items.length),
    },
  });
}

async function ensureAi548WorkspaceItem(email) {
  const stored = await readUserSettings(email);
  const existing = normalizeQaWorkspaceItems(stored.qaWorkspaceItems);
  const existingItem = existing.find((item) => item.sourceKey === "AI-548" || item.issueKey === "AI-548");
  const skillRoot = resolveChatwootUatSkillRoot();
  const suiteFile = resolveChatwootSuiteFile(skillRoot, AI_548_CHATWOOT_SUITE_RELATIVE);
  if (!fsSync.existsSync(suiteFile)) return existing;
  const suite = await readYamlAsJson(suiteFile);
  const item = chatwootSuiteToWorkspaceItem(suite, {
    ...(existingItem || {}),
    id: "workspace-ai-548-chatwoot-uat",
    issueKey: "AI-548",
    sourceKey: "AI-548",
    title: "[AI-548] Chatwoot UAT booking pending suite",
    suiteFile: path.relative(skillRoot, suiteFile),
  });
  if (
    existingItem &&
    existingItem.chatwootSuiteFile === item.chatwootSuiteFile &&
    existingItem.chatwootSuiteName === item.chatwootSuiteName &&
    existingItem.testCases.length >= item.testCases.length
  ) {
    return existing;
  }
  return (await upsertQaWorkspaceItem(email, item)).items;
}

async function ensureStableChatwootSuiteFile(skillRoot, relativePath, suitePayload) {
  const outputFile = path.join(skillRoot, relativePath);
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  const markedPayload = {
    ...suitePayload,
    source: {
      ...(suitePayload.source && typeof suitePayload.source === "object" ? suitePayload.source : {}),
      created_by: "easyforqc",
      easyforqc_generated: true,
    },
  };
  await fs.writeFile(outputFile, JSON.stringify(markedPayload, null, 2) + "\n", "utf8");
  return outputFile;
}

async function ensureAi547WorkspaceItem(email) {
  const stored = await readUserSettings(email);
  const existing = normalizeQaWorkspaceItems(stored.qaWorkspaceItems);
  const existingItem = existing.find((item) => item.sourceKey === "AI-547" || item.issueKey === "AI-547");
  const skillRoot = resolveChatwootUatSkillRoot();
  const suiteFilePath = path.join(skillRoot, AI_547_CHATWOOT_SUITE_RELATIVE);
  const suiteRelativePath = path.relative(skillRoot, suiteFilePath);
  const importedTestCases = await readImportedTestCases(AI_547_REFERENCE_FILES);
  const testCases = normalizeWorkspaceTestCases(importedTestCases.length ? importedTestCases : existingItem?.testCases || []);
  if (
    existingItem &&
    testCases.length <= existingItem.testCases.length &&
    fsSync.existsSync(suiteFilePath) &&
    existingItem.chatwootSuiteFile === suiteRelativePath
  ) {
    return existing;
  }
  if (!testCases.length) return existing;
  const baseItem = normalizeQaWorkspaceItem({
    ...(existingItem || {}),
    id: "workspace-ai-547-bus-trip-tools",
    issueKey: "AI-547",
    sourceKey: "AI-547",
    source: "omniagent_reference_import",
    title: "[AI-547] Bus trip tool catalog/pricing regression suite",
    archetypeKey: "chatbot",
    testCases,
    outline: {
      issue_key: "AI-547",
      title: "[AI-547] Bus trip tool catalog/pricing regression coverage",
      template: "chatbot_uat",
      branches: [
        {
          title: "Schedule catalog contract",
          items: [
            "Kiểm đúng thứ tự gọi `bus_trip_schedule_catalog_tool` trước các tool stop/price/seat map.",
            "Catalog phải group đúng theo base trip và không lộ field nội bộ cho user.",
            "Khi user đổi ngày/route/giờ, context discovery phải reset để không dùng lại trip cũ.",
          ],
        },
        {
          title: "Stop catalog selection key",
          items: [
            "Phân biệt endpoint/options/points khi bot cần báo giá mặc định hoặc xin khách chọn điểm.",
            "Không dedupe sai các điểm trùng tên nhưng khác selection key.",
            "Không tự xác nhận khi user nói gần đúng nhưng có nhiều candidate.",
          ],
        },
        {
          title: "Pricing and seat-map handoff",
          items: [
            "`bus_trip_price_options_tool` phải dùng selection key nguyên văn từ stop options.",
            "Mỗi price option chỉ đại diện đúng một ticket unit.",
            "Luồng happy path phải đi tiếp được đến seat map sau khi có price/stop context hợp lệ.",
          ],
        },
        {
          title: "Regression and out of scope",
          items: [
            "Cover regression cho đổi giờ trong cùng ngày, nearest match và thiếu/nhầm context.",
            "Không kiểm production Chatwoot.",
            "Không validate thanh toán thật ngoài payment link UAT.",
          ],
        },
      ],
    },
  });
  const suitePayload = buildChatwootSuiteFromWorkspaceItem(baseItem, {
    suiteName: "ai-547-bus-trip-tools-chatwoot-uat",
    inboxId: DEFAULT_CHATWOOT_UAT_INBOX_ID,
    uiInboxId: DEFAULT_CHATWOOT_UAT_UI_INBOX_ID,
    captainAssistantId: DEFAULT_CHATWOOT_UAT_CAPTAIN_ASSISTANT_ID,
    labels: "ai,ai-547",
    assigneeName: "Bot",
    chatUiMode: "realistic",
  });
  suitePayload.suite_name = "ai-547-bus-trip-tools-chatwoot-uat";
  suitePayload.goal_summary = `Chatwoot UAT suite imported from OmniAgent AI-547 test cases. Cases=${baseItem.testCases.length}.`;
  const suiteFile = await ensureStableChatwootSuiteFile(skillRoot, AI_547_CHATWOOT_SUITE_RELATIVE, suitePayload);
  const item = {
    ...baseItem,
    chatwootSuiteFile: path.relative(skillRoot, suiteFile),
    chatwootSuiteName: suitePayload.suite_name,
  };
  return (await upsertQaWorkspaceItem(email, item)).items;
}

function seededQaWorkspaceItems() {
  const seed = readEasyForQcUatStateSeed();
  return normalizeQaWorkspaceItems(Array.isArray(seed?.qaWorkspaceItems) ? seed.qaWorkspaceItems : []);
}

function qaWorkspaceItemPassFailReadyCount(item = {}) {
  return (item.testCases || []).filter((testCase) => {
    const conditions = normalizeWorkspaceStopConditions(testCase.stop_conditions || testCase.stopConditions, testCase);
    const passPatterns = normalizeWorkspaceStopPatterns(testCase.stop_patterns || testCase.stopPatterns || testCase.stop_regex_any, false);
    const failPatterns = normalizeWorkspaceFailPatterns(testCase.fail_patterns || testCase.failPatterns || testCase.fail_regex_any, false);
    return conditions.pass.length && conditions.fail.length && passPatterns.length && failPatterns.length;
  }).length;
}

function shouldApplySeededQaWorkspaceItem(seedItem = {}, existingItem = null) {
  if (!existingItem) return true;
  if ((seedItem.testCases || []).length > (existingItem.testCases || []).length) return true;
  const seedReady = qaWorkspaceItemPassFailReadyCount(seedItem);
  const existingReady = qaWorkspaceItemPassFailReadyCount(existingItem);
  return seedReady > existingReady;
}

async function ensureSeededQaWorkspaceItems(email) {
  const seedItems = seededQaWorkspaceItems();
  if (!seedItems.length) {
    const stored = await readUserSettings(email);
    return normalizeQaWorkspaceItems(stored.qaWorkspaceItems);
  }
  const stored = await readUserSettings(email);
  let next = normalizeQaWorkspaceItems(stored.qaWorkspaceItems);
  let changed = false;
  for (const seedItem of seedItems) {
    const existingItem = next.find(
      (item) =>
        item.id === seedItem.id ||
        (seedItem.sourceKey && item.sourceKey === seedItem.sourceKey) ||
        (seedItem.issueKey && item.issueKey === seedItem.issueKey),
    );
    if (!shouldApplySeededQaWorkspaceItem(seedItem, existingItem)) continue;
    const createdAt = existingItem?.createdAt || seedItem.createdAt;
    next = [
      normalizeQaWorkspaceItem({ ...seedItem, createdAt, updatedAt: seedItem.updatedAt || new Date().toISOString() }),
      ...next.filter(
        (item) =>
          item.id !== seedItem.id &&
          !(seedItem.sourceKey && item.sourceKey === seedItem.sourceKey) &&
          !(seedItem.issueKey && item.issueKey === seedItem.issueKey),
      ),
    ];
    changed = true;
  }
  return changed ? saveQaWorkspaceItems(email, next) : next;
}

async function ensureStandardQaWorkspaceItems(email) {
  await ensureAi547WorkspaceItem(email);
  await ensureAi548WorkspaceItem(email);
  return ensureSeededQaWorkspaceItems(email);
}

function resolveChatwootSuiteFile(skillRoot, suiteFile) {
  const suitesRoot = path.resolve(skillRoot, "assets", "suites");
  const requested = asText(suiteFile) || path.join("assets", "suites", "generated", "2026-05-07-ai-548-chatwoot-uat", "ai-548-create-booking-pending-chatwoot-uat.yml");
  const resolved = path.isAbsolute(requested) ? path.resolve(requested) : path.resolve(skillRoot, requested);
  if (!resolved.startsWith(`${suitesRoot}${path.sep}`) && resolved !== suitesRoot) {
    throw Object.assign(new Error("Suite file phải nằm trong assets/suites của skill chatwoot-test-uat."), { status: 400 });
  }
  if (!/\.ya?ml$/i.test(resolved)) {
    throw Object.assign(new Error("Suite file phải là YAML .yml hoặc .yaml."), { status: 400 });
  }
  return resolved;
}

function asOptionalNumber(value) {
  const text = asText(value);
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function chatwootConversationUrl(baseUrl, accountId, conversationId) {
  const base = asText(baseUrl)
    .replace(/\/api\/v\d+\/?$/i, "")
    .replace(/\/api\/?$/i, "")
    .replace(/\/+$/g, "");
  const account = asText(accountId);
  const conversation = asText(conversationId);
  if (!base || !account || !conversation) return "";
  return `${base}/app/accounts/${encodeURIComponent(account)}/conversations/${encodeURIComponent(conversation)}`;
}

async function readJsonFileIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function chatwootHtmlPathFromRaw(rawPath) {
  const stem = path.basename(rawPath, path.extname(rawPath)).replace(/-raw$/, "");
  return path.join(path.dirname(rawPath), `${stem}.html`);
}

function summarizeChatwootReport(rawPayload = {}) {
  const runtime = rawPayload?.runtime || {};
  const accountId = runtime.account_id;
  const results = Array.isArray(rawPayload?.results) ? rawPayload.results : [];
  return {
    suiteName: asText(rawPayload?.suite_name),
    mode: asText(rawPayload?.run_mode || rawPayload?.runtime?.chat_ui_mode || ""),
    total: Number(rawPayload?.total_case_count || rawPayload?.selected_case_count || results.length || 0),
    success: Number(rawPayload?.success_count || 0),
    handoff: Number(rawPayload?.handoff_count || 0),
    failure: Number(rawPayload?.failure_count || 0),
    runtime: {
      webhookUrl: asText(runtime.webhook_url),
      chatwootApiBase: asText(runtime.chatwoot_api_base),
      accountId: asText(accountId),
      chatUiMode: asText(runtime.chat_ui_mode),
      maxUserTurns: runtime.max_user_turns ?? null,
    },
    results: results.map((item) => ({
      caseId: asText(item.case_id),
      title: asText(item.title || item.case_id),
      succeeded: Boolean(item.succeeded),
      completedReason: asText(item.completed_reason),
      failureReason: asText(item.failure_reason),
      conversationId: asText(item.conversation_id),
      conversationUrl: chatwootConversationUrl(runtime.chatwoot_api_base, accountId, item.conversation_id),
      userTurnCount: Number(item.user_turn_count || 0),
      bookingCode: asText(item.booking_code),
      ticketCode: asText(item.ticket_code),
      paymentLink: asText(item.payment_link),
      handoffDetected: Boolean(item.handoff_detected || asText(item.completed_reason).includes("handoff")),
    })),
  };
}

function chatwootRunFiles(outputFile) {
  const rawFile = outputFile.replace(/\.ya?ml$/i, "-raw.json");
  const htmlFile = chatwootHtmlPathFromRaw(rawFile);
  return {
    report: fsSync.existsSync(htmlFile) ? fileViewMeta(htmlFile) : null,
    raw: fsSync.existsSync(rawFile) ? fileViewMeta(rawFile) : null,
    yaml: fsSync.existsSync(outputFile) ? fileViewMeta(outputFile) : null,
  };
}

function publicChatwootJob(raw = {}) {
  const request = raw.request || raw.request_payload || {};
  const result = raw.result || raw.result_payload || null;
  const caseStates = Array.isArray(raw.caseStates)
    ? raw.caseStates
    : Array.isArray(request.caseStates)
      ? request.caseStates
      : [];
  return {
    id: asText(raw.id),
    status: asText(raw.status || "queued"),
    suiteName: asText(raw.suiteName || raw.suite_name || result?.report?.suiteName || ""),
    suiteFile: asText(raw.suiteFile || raw.suite_file || request.suiteFile || ""),
    runDir: asText(raw.runDir || raw.run_dir || result?.runDir || ""),
    request,
    result,
    error: asText(raw.error),
    activeCaseId: asText(raw.activeCaseId || request.activeCaseId),
    caseStates,
    createdAt: (raw.createdAt || raw.created_at || new Date().toISOString()).toString(),
    startedAt: raw.startedAt || raw.started_at || null,
    finishedAt: raw.finishedAt || raw.finished_at || null,
    updatedAt: (raw.updatedAt || raw.updated_at || raw.createdAt || raw.created_at || new Date().toISOString()).toString(),
  };
}

async function persistChatwootJob(job) {
  CHATWOOT_UAT_JOBS.set(job.id, job);
  if (!db) return;
  await db.query(
    `
      INSERT INTO chatwoot_uat_runs (
        id, user_email, status, suite_name, suite_file, run_dir, request_payload,
        result_payload, error, created_at, started_at, finished_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13)
      ON CONFLICT (id)
      DO UPDATE SET
        status = EXCLUDED.status,
        suite_name = EXCLUDED.suite_name,
        suite_file = EXCLUDED.suite_file,
        run_dir = EXCLUDED.run_dir,
        request_payload = EXCLUDED.request_payload,
        result_payload = EXCLUDED.result_payload,
        error = EXCLUDED.error,
        started_at = EXCLUDED.started_at,
        finished_at = EXCLUDED.finished_at,
        updated_at = EXCLUDED.updated_at
    `,
    [
      job.id,
      normalizeEmail(job.userEmail),
      job.status,
      job.suiteName || "",
      job.suiteFile || "",
      job.runDir || "",
      JSON.stringify({
        ...(job.request || {}),
        caseStates: Array.isArray(job.caseStates) ? job.caseStates : [],
        activeCaseId: asText(job.activeCaseId),
      }),
      job.result ? JSON.stringify(job.result) : null,
      job.error || "",
      job.createdAt,
      job.startedAt,
      job.finishedAt,
      job.updatedAt,
    ],
  );
}

async function listChatwootJobs(email, limit = 20) {
  const userEmail = normalizeEmail(email);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  if (db) {
    const result = await db.query(
      `
        SELECT id, status, suite_name, suite_file, run_dir, request_payload, result_payload, error,
               created_at, started_at, finished_at, updated_at
        FROM chatwoot_uat_runs
        WHERE user_email = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [userEmail, safeLimit],
    );
    return result.rows.map(publicChatwootJob);
  }
  return [...CHATWOOT_UAT_JOBS.values()]
    .filter((job) => job.userEmail === userEmail)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, safeLimit)
    .map(publicChatwootJob);
}

async function findChatwootJob(email, id) {
  const userEmail = normalizeEmail(email);
  const jobId = asText(id);
  if (!jobId) return null;
  if (db) {
    const result = await db.query(
      `
        SELECT id, status, suite_name, suite_file, run_dir, request_payload, result_payload, error,
               created_at, started_at, finished_at, updated_at
        FROM chatwoot_uat_runs
        WHERE user_email = $1 AND id = $2
      `,
      [userEmail, jobId],
    );
    return result.rows[0] ? publicChatwootJob(result.rows[0]) : null;
  }
  const job = CHATWOOT_UAT_JOBS.get(jobId);
  return job?.userEmail === userEmail ? publicChatwootJob(job) : null;
}

async function prepareChatwootUatRun(body = {}, options = {}) {
  const skillRoot = resolveChatwootUatSkillRoot();
  if (!fsSync.existsSync(path.join(skillRoot, "SKILL.md"))) {
    throw Object.assign(new Error("Không tìm thấy skill chatwoot-test-uat. Hãy cấu hình CHATWOOT_UAT_SKILL_ROOT hoặc mount OmniAgent repo vào app."), { status: 400 });
  }
  const mode = body.mode === "suite" ? "suite" : "adaptive";
  const script = path.join(skillRoot, "scripts", mode === "suite" ? "run_chatwoot_suite.py" : "interactive_chatwoot_loop.py");
  if (!fsSync.existsSync(script)) {
    throw Object.assign(new Error(`Không tìm thấy script runner của skill: ${path.basename(script)}`), { status: 400 });
  }
  const suiteFile = resolveChatwootSuiteFile(skillRoot, body.suiteFile);
  await fs.access(suiteFile);
  let suiteMeta = await readChatwootSuiteMeta(suiteFile, skillRoot).catch(() => ({
    suiteName: path.basename(suiteFile, path.extname(suiteFile)),
    goalSummary: "",
    caseCount: 0,
    relativePath: path.relative(skillRoot, suiteFile),
    cases: [],
  }));
  const runDir = await makeRunDir("CHATWOOT-UAT");
  let effectiveSuiteFile = suiteFile;
  const selectedCaseIds = Array.isArray(body.selectedCaseIds)
    ? Array.from(new Set(body.selectedCaseIds.map(asText).filter(Boolean)))
    : [];
  const stopConditionOverrides = normalizeChatwootStopConditionOverrides(body.caseStopConditions || body.caseStopPatterns);
  if (selectedCaseIds.length || stopConditionOverrides.size) {
    const suitePayload = await readYamlAsJson(suiteFile);
    const rawCases = applyChatwootStopConditionOverrides(Array.isArray(suitePayload?.cases) ? suitePayload.cases : [], stopConditionOverrides);
    const selectedSet = new Set(selectedCaseIds);
    const effectiveCases = selectedCaseIds.length
      ? rawCases.filter((testCase, index) => {
          const caseId = asText(testCase?.case_id || testCase?.caseId || `case-${index + 1}`);
          return selectedSet.has(caseId);
        })
      : rawCases;
    if (!effectiveCases.length) {
      throw Object.assign(new Error("Không tìm thấy case nào khớp với danh sách case đã chọn."), { status: 400 });
    }
    const filteredSuitePayload = {
      ...suitePayload,
      cases: effectiveCases,
      source_trace: {
        ...(suitePayload?.source_trace && typeof suitePayload.source_trace === "object" ? suitePayload.source_trace : {}),
        easyforqc_source_suite_file: path.relative(skillRoot, suiteFile),
        easyforqc_selected_case_ids: selectedCaseIds,
        easyforqc_stop_condition_overrides: Array.from(stopConditionOverrides.keys()),
      },
    };
    effectiveSuiteFile = path.join(runDir, selectedCaseIds.length ? "selected-suite.yml" : "configured-suite.yml");
    await fs.writeFile(effectiveSuiteFile, JSON.stringify(filteredSuitePayload, null, 2), "utf8");
    suiteMeta = {
      ...suiteMeta,
      caseCount: effectiveCases.length,
      cases: effectiveCases.map((testCase, index) => chatwootSuiteCaseMeta(testCase, index)),
    };
  }
  const outputFile = path.join(runDir, "chatwoot-uat.yml");
  const args = [
    "--suite-file",
    effectiveSuiteFile,
    "--output-file",
    outputFile,
    "--chat-ui-mode",
    body.chatUiMode === "webhook-only" ? "webhook-only" : "realistic",
    "--webhook-url",
    asText(body.webhookUrl) || DEFAULT_CHATWOOT_UAT_WEBHOOK_URL,
    "--healthcheck-url",
    asText(body.healthcheckUrl) || DEFAULT_CHATWOOT_UAT_HEALTHCHECK_URL,
  ];
  if (body.skipHealthcheck !== false) {
    args.push("--skip-healthcheck");
  }
  const effectiveInboxId = asText(body.inboxId) || DEFAULT_CHATWOOT_UAT_INBOX_ID;
  const effectiveUiInboxId = asText(body.uiInboxId) || effectiveInboxId || DEFAULT_CHATWOOT_UAT_UI_INBOX_ID;
  const effectiveCaptainAssistantId = asText(body.captainAssistantId) || DEFAULT_CHATWOOT_UAT_CAPTAIN_ASSISTANT_ID;
  const numericArgs = [
    ["--ui-inbox-id", effectiveUiInboxId],
    ["--inbox-id", effectiveInboxId],
    ["--captain-assistant-id", effectiveCaptainAssistantId],
    ["--account-id", body.accountId],
    ["--case-index", body.caseIndex],
    ["--limit-cases", body.limitCases],
    ["--reply-timeout-seconds", body.replyTimeoutSeconds],
    ["--reply-settle-seconds", body.replySettleSeconds],
    ["--poll-interval-seconds", body.pollIntervalSeconds],
  ];
  for (const [flag, value] of numericArgs) {
    const number = asOptionalNumber(value);
    if (number !== null) args.push(flag, String(number));
  }
  const stringArgs = [
    ["--case-id", body.caseId],
    ["--pinned-conversation-id", body.pinnedConversationId],
    ["--labels", body.labels],
    ["--assignee-name", body.assigneeName],
  ];
  for (const [flag, value] of stringArgs) {
    const text = asText(value);
    if (text) args.push(flag, text);
  }
  let plannerBackend = "";
  const plannerAiSettings = normalizeAiSettings(options.plannerAiSettings || {});
  if (mode === "adaptive") {
    args.push("--mode", body.adaptiveMode === "manual" ? "manual" : "autonomous");
    const maxUserTurns = asOptionalNumber(body.maxUserTurns);
    if (maxUserTurns !== null) args.push("--max-user-turns", String(maxUserTurns));
    const requestedPlannerBackend = body.plannerBackend === "heuristic"
      ? "heuristic"
      : body.plannerBackend === "codex-cli"
        ? "codex-cli"
        : "openai-compatible";
    if (requestedPlannerBackend === "openai-compatible" && !aiProviderReady(plannerAiSettings)) {
      throw Object.assign(
        new Error("Cần cấu hình AI Settings đầy đủ để dùng AI planner cho Chatwoot UAT."),
        { status: 400 },
      );
    }
    plannerBackend = requestedPlannerBackend;
    args.push("--planner-backend", plannerBackend);
    if (plannerBackend === "codex-cli" || plannerBackend === "openai-compatible") {
      args.push("--planner-model", asText(body.plannerModel) || plannerAiSettings.model || "gpt-5.4-mini");
      const plannerTimeout = asOptionalNumber(body.plannerTimeoutSeconds);
      if (plannerTimeout !== null) args.push("--planner-timeout-seconds", String(plannerTimeout));
    }
    const guidanceFile = asText(body.plannerGuidanceFile);
    if (guidanceFile) args.push("--planner-guidance-file", guidanceFile);
  }
  const chatwootApiBase = asText(body.chatwootApiBase) || DEFAULT_CHATWOOT_UAT_API_BASE;
  if (chatwootApiBase) args.push("--chatwoot-api-base", chatwootApiBase);
  if (CHATWOOT_UAT_API_KEY) args.push("--chatwoot-api-key", CHATWOOT_UAT_API_KEY);
  if (CHATWOOT_UAT_USER_API_KEY) args.push("--user-chatwoot-api-key", CHATWOOT_UAT_USER_API_KEY);
  if (!args.includes("--account-id")) {
    const defaultAccountId = asOptionalNumber(DEFAULT_CHATWOOT_UAT_ACCOUNT_ID || chatwootUatConfigValue(["CHATWOOT_ACCOUNT_ID", "CHATWOOT_DEFAULT_ACCOUNT_ID", "account_id", "default_account_id"]));
    if (defaultAccountId !== null) args.push("--account-id", String(defaultAccountId));
  }
  const skipLocalWebhookPost = body.skipLocalWebhookPost !== false;
  return {
    mode,
    skillRoot,
    suiteFile: effectiveSuiteFile,
    sourceSuiteFile: suiteFile,
    suiteMeta,
    requestBody: { ...body },
    plannerAiSettings: options.plannerAiSettings || {},
    runDir,
    outputFile,
    script,
    args,
    env: {
      CHATWOOT_TEST_SKIP_LOCAL_WEBHOOK_POST: skipLocalWebhookPost ? "1" : "0",
      ...(mode === "adaptive" && plannerBackend === "openai-compatible"
        ? {
            CHATWOOT_PLANNER_OPENAI_BASE_URL: normalizedAiBaseUrl(plannerAiSettings),
            CHATWOOT_PLANNER_OPENAI_API_KEY: plannerAiSettings.apiKey,
            CHATWOOT_PLANNER_OPENAI_MODEL: asText(body.plannerModel) || plannerAiSettings.model,
          }
        : {}),
    },
    secrets: [CHATWOOT_UAT_API_KEY, CHATWOOT_UAT_USER_API_KEY, plannerAiSettings.apiKey],
    timeoutMs: mode === "adaptive" ? 1800000 : 1200000,
  };
}

async function executeChatwootUatRun(prepared) {
  let registeredJobId = "";
  try {
    const result = await runPython(prepared.script, prepared.args, {
      timeoutMs: prepared.timeoutMs,
      env: prepared.env,
      secrets: prepared.secrets,
      onChild: prepared.jobId
        ? (child) => {
            registeredJobId = prepared.jobId;
            CHATWOOT_UAT_JOB_PROCESSES.set(prepared.jobId, child);
          }
        : undefined,
    });
    const rawFile = prepared.outputFile.replace(/\.ya?ml$/i, "-raw.json");
    const rawPayload = await readJsonFileIfExists(rawFile);
    const report = rawPayload ? summarizeChatwootReport(rawPayload) : summarizeChatwootReport({});
    return {
      mode: prepared.mode,
      skillRoot: prepared.skillRoot,
      suiteFile: prepared.suiteFile,
      runDir: prepared.runDir,
      files: chatwootRunFiles(prepared.outputFile),
      report,
      ...commandOutputForClient(result),
    };
  } finally {
    if (registeredJobId) {
      CHATWOOT_UAT_JOB_PROCESSES.delete(registeredJobId);
    }
  }
}

function chatwootCaseStatesFromPrepared(prepared) {
  const cases = Array.isArray(prepared?.suiteMeta?.cases) ? prepared.suiteMeta.cases : [];
  return cases.map((testCase, index) => ({
    index: Number(testCase.index) || index + 1,
    caseId: asText(testCase.caseId || `case-${index + 1}`),
    title: asText(testCase.title || testCase.caseId || `Case ${index + 1}`),
    openingPrompt: asText(testCase.openingPrompt),
    testData: asText(testCase.testData),
    expectedResult: asText(testCase.expectedResult),
    plannerInstruction: asText(testCase.plannerInstruction),
    stopPatterns: Array.isArray(testCase.stopPatterns) ? testCase.stopPatterns.map(asText).filter(Boolean) : [],
    failPatterns: Array.isArray(testCase.failPatterns) ? testCase.failPatterns.map(asText).filter(Boolean) : [],
    stopConditions: testCase.stopConditions || { pass: [], fail: [] },
    steps: Array.isArray(testCase.steps) ? testCase.steps : [],
    status: "pending",
    startedAt: null,
    finishedAt: null,
    result: null,
    error: "",
  }));
}

function summarizeCaseRunResult(result, fallbackCase = {}) {
  const reportResult = Array.isArray(result?.report?.results) ? result.report.results[0] : null;
  return {
    caseId: asText(reportResult?.caseId || fallbackCase.caseId),
    title: asText(reportResult?.title || fallbackCase.title),
    succeeded: Boolean(reportResult?.succeeded),
    handoffDetected: Boolean(reportResult?.handoffDetected),
    conversationId: asText(reportResult?.conversationId),
    conversationUrl: asText(reportResult?.conversationUrl),
    paymentLink: asText(reportResult?.paymentLink),
    completedReason: asText(reportResult?.completedReason),
    failureReason: asText(reportResult?.failureReason),
    reportUrl: result?.files?.report?.url || "",
    rawUrl: result?.files?.raw?.url || "",
    yamlUrl: result?.files?.yaml?.url || "",
  };
}

function aggregateChatwootQueueResult(job, prepared, caseResults = []) {
  const results = caseResults.map((item) => item.result).filter(Boolean);
  const success = results.filter((item) => item.succeeded).length;
  const handoff = results.filter((item) => item.handoffDetected).length;
  const failure = results.filter((item) => !item.succeeded && !item.handoffDetected).length;
  return {
    mode: prepared.mode,
    skillRoot: prepared.skillRoot,
    suiteFile: prepared.sourceSuiteFile || prepared.suiteFile,
    runDir: prepared.runDir,
    files: {
      report: null,
      raw: null,
      yaml: null,
    },
    report: {
      suiteName: prepared.suiteMeta?.suiteName || job.suiteName || "Chatwoot UAT",
      mode: prepared.mode,
      total: results.length,
      success,
      handoff,
      failure,
      results,
    },
    stdout: caseResults.map((item) => item.stdout).filter(Boolean).join("\n\n"),
    stderr: caseResults.map((item) => item.stderr).filter(Boolean).join("\n\n"),
  };
}

async function executeChatwootCaseQueue(job, prepared) {
  const caseResults = [];
  for (const state of job.caseStates || []) {
    if (job.cancelRequested || job.status === "interrupted") break;
    if (state.status === "skipped") continue;
    const startedAt = new Date().toISOString();
    Object.assign(state, {
      status: "running",
      startedAt,
      finishedAt: null,
      error: "",
    });
    Object.assign(job, {
      activeCaseId: state.caseId,
      updatedAt: startedAt,
    });
    await persistChatwootJob(job);
    try {
      const casePrepared = await prepareChatwootUatRun(
        {
          ...(prepared.requestBody || {}),
          suiteFile: prepared.sourceSuiteFile || prepared.suiteFile,
          selectedCaseIds: [state.caseId],
          caseStopConditions: prepared.requestBody?.caseStopConditions || {},
        },
        { plannerAiSettings: prepared.plannerAiSettings || {} },
      );
      casePrepared.jobId = job.id;
      const result = await executeChatwootUatRun(casePrepared);
      const summary = summarizeCaseRunResult(result, state);
      const finishedAt = new Date().toISOString();
      Object.assign(state, {
        status: summary.succeeded ? "completed" : summary.handoffDetected ? "handoff" : "failed",
        finishedAt,
        result: summary,
        error: summary.failureReason || "",
      });
      caseResults.push({ result: summary, stdout: result.stdout, stderr: result.stderr });
    } catch (error) {
      const finishedAt = new Date().toISOString();
      const stoppedCurrentCase = job.cancelCurrentCaseId === state.caseId;
      Object.assign(state, {
        status: stoppedCurrentCase || job.cancelRequested ? "interrupted" : "failed",
        finishedAt,
        error: stoppedCurrentCase
          ? "Đã dừng test case theo yêu cầu."
          : error instanceof Error ? error.message : "Không chạy được test case.",
      });
      if (!job.cancelRequested && !stoppedCurrentCase) {
        caseResults.push({
          result: {
            caseId: state.caseId,
            title: state.title,
            succeeded: false,
            handoffDetected: false,
            failureReason: state.error,
          },
          stdout: "",
          stderr: state.error,
        });
      }
    } finally {
      if (job.cancelCurrentCaseId === state.caseId) {
        job.cancelCurrentCaseId = "";
      }
      job.activeCaseId = "";
      job.updatedAt = new Date().toISOString();
      await persistChatwootJob(job);
    }
  }
  return aggregateChatwootQueueResult(job, prepared, caseResults);
}

async function runChatwootJob(job, prepared) {
  prepared.jobId = job.id;
  const startedAt = new Date().toISOString();
  Object.assign(job, {
    status: "running",
    startedAt,
    updatedAt: startedAt,
  });
  await persistChatwootJob(job);
  try {
    const result = Array.isArray(job.caseStates) && job.caseStates.length
      ? await executeChatwootCaseQueue(job, prepared)
      : await executeChatwootUatRun(prepared);
    const finishedAt = new Date().toISOString();
    if (job.cancelRequested || job.status === "interrupted") {
      Object.assign(job, {
        status: "interrupted",
        error: job.error || "Đã dừng run Chatwoot UAT theo yêu cầu.",
        finishedAt,
        updatedAt: finishedAt,
      });
    } else {
      Object.assign(job, {
        status: "completed",
        result,
        error: "",
        finishedAt,
        updatedAt: finishedAt,
      });
    }
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const wasInterrupted = Boolean(job.cancelRequested || job.status === "interrupted");
    Object.assign(job, {
      status: wasInterrupted ? "interrupted" : "failed",
      error: wasInterrupted
        ? job.error || "Đã dừng run Chatwoot UAT theo yêu cầu."
        : error instanceof Error ? error.message : "Không chạy được Chatwoot UAT.",
      finishedAt,
      updatedAt: finishedAt,
    });
  }
  await persistChatwootJob(job);
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
    if (key === "conversation_ui") {
      const hasMessageSurface = /\b(message|conversation|chat stream|conversation stream|bubble|amr|score|highlight|badge|indicator)\b|tin nhắn|diem|điểm|hiển thị|hien thi/i.test(haystack);
      const hasUiOrScore = /\b(amr|score|highlight|badge|indicator|bubble)\b|diem|điểm|hiển thị|hien thi|làm nổi bật|lam noi bat/i.test(haystack);
      if (hasMessageSurface && hasUiOrScore) {
        score += 4;
      } else if (score < 2) {
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

const CASE_SELECTION_META_TAGS = new Set([
  "adaptive_qa_plan",
  "confluence_reference",
  "doc_grounding",
  "jira_description",
  "risk_based",
]);

const CASE_SELECTION_STRONG_SCENARIOS = new Set([
  "boundary",
  "decision_table",
  "fallback",
  "mapping",
  "missing_data",
  "reference_doc",
  "regression",
  "retry",
  "state_transition",
  "ui_regression",
]);

function caseCandidateTags(item = {}) {
  return Array.isArray(item.tags) ? item.tags.map(asText).filter(Boolean) : [];
}

function semanticCaseFamily(item = {}) {
  const tags = caseCandidateTags(item);
  const text = normalizeSearchText(`${item.title || ""} ${item.objective || ""} ${item.risk || ""} ${tags.join(" ")}`);
  if (/thiếu dữ liệu|required|missing|null|empty|rỗng|rong/.test(text)) return "missing_required_data";
  if (/fallback|timeout|partial|dependency|empty error/.test(text)) return "fallback_recovery";
  if (/retry|duplicate|idempotency|trùng|trung/.test(text)) return "retry_duplicate";
  if (/regression|luồng cũ|luong cu|side effect/.test(text)) return "nearby_regression";
  if (/mapping|field|payload|source of truth|contract/.test(text)) return "mapping_contract";
  if (/boundary|threshold|ngưỡng|nguong|limit/.test(text)) return "boundary_threshold";
  if (/out of scope|ngoài scope|ngoai scope/.test(text)) return "out_of_scope";
  return "";
}

function caseCoverageDimensions(item = {}) {
  const tags = caseCandidateTags(item)
    .map((tag) => normalizeSearchText(tag))
    .filter((tag) => tag && !CASE_SELECTION_META_TAGS.has(tag));
  const dimensions = new Set([
    normalizeSearchText(item.scenario || ""),
    normalizeSearchText(item.technique || ""),
    semanticCaseFamily(item),
    ...tags,
  ]);
  return [...dimensions].filter(Boolean);
}

function caseCoverageSignature(item = {}) {
  const scenario = normalizeSearchText(item.scenario || "coverage") || "coverage";
  const tags = caseCandidateTags(item)
    .map((tag) => normalizeSearchText(tag))
    .filter((tag) => tag && !CASE_SELECTION_META_TAGS.has(tag));
  const family = semanticCaseFamily(item);
  const titleKey = normalizeSearchText(stripTestCasePrefix(item.title || ""))
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join("_");
  if (tags.includes("jira_requirement")) return `${scenario}:${titleKey || "jira_requirement"}`;
  const primaryTag = tags[0] || family;
  if (primaryTag) return `${scenario}:${primaryTag}`;
  return `${scenario}:${titleKey || "case"}`;
}

function caseCandidateScore(item = {}) {
  const tags = caseCandidateTags(item);
  const scenario = asText(item.scenario);
  const priority = asText(item.priority).toLowerCase();
  let score = 0;
  if (tags.includes("happy_path")) score += 120;
  if (priority === "high") score += 60;
  else if (priority === "normal") score += 20;
  if (tags.includes("adaptive_qa_plan")) score += 55;
  if (tags.includes("confluence_reference")) score += 35;
  if (tags.includes("risk_based")) score += 20;
  if (CASE_SELECTION_STRONG_SCENARIOS.has(scenario)) score += 35;
  if (tags.includes("doc_grounding")) score -= 15;
  if (scenario === "requirement_coverage") score += 10;
  return score;
}

function isMustHaveCaseCandidate(item = {}) {
  const tags = caseCandidateTags(item);
  const scenario = asText(item.scenario);
  if (tags.includes("happy_path")) return true;
  if (tags.includes("adaptive_qa_plan")) return true;
  if (tags.includes("confluence_reference") && !tags.includes("doc_grounding")) return true;
  if (tags.includes("risk_based") && CASE_SELECTION_STRONG_SCENARIOS.has(scenario)) return true;
  return asText(item.priority).toLowerCase() === "high" && scenario !== "requirement_coverage";
}

function selectCoverageDrivenCases(candidates = [], qaPlan = null) {
  const targetCount = clampNumber(Number(qaPlan?.case_strategy?.target_count) || candidates.length || 0, 0, 32);
  const minimumCount = clampNumber(
    Number(qaPlan?.case_strategy?.minimum_count) || Math.max(5, targetCount - 2),
    0,
    Math.max(targetCount, 0),
  );
  const maximumCount = clampNumber(
    Number(qaPlan?.case_strategy?.maximum_count) || targetCount + 4,
    Math.max(targetCount, minimumCount),
    32,
  );
  const selected = [];
  const selectedIdentities = new Set();
  const selectedSignatures = new Set();
  const selectedDimensions = new Set();
  const enriched = candidates.map((item, index) => ({
    ...item,
    _order: Number.isFinite(item._order) ? item._order : index,
    _score: caseCandidateScore(item),
    _signature: caseCoverageSignature(item),
    _dimensions: caseCoverageDimensions(item),
    _mustHave: isMustHaveCaseCandidate(item),
  }));

  const tryAdd = (item, { requireNewCoverage = true, allowAboveTarget = false } = {}) => {
    if (selected.length >= maximumCount) return false;
    if (!allowAboveTarget && selected.length >= targetCount) return false;
    const identity = normalizedCaseIdentity({
      title: item.title,
      scenario_type: item.scenario,
      coverage_tags: item.tags,
    });
    if (identity && selectedIdentities.has(identity)) return false;
    if (selectedSignatures.has(item._signature)) return false;
    const addsCoverage = item._dimensions.some((dimension) => !selectedDimensions.has(dimension));
    if (requireNewCoverage && !addsCoverage && !caseCandidateTags(item).includes("happy_path")) return false;
    selected.push(item);
    if (identity) selectedIdentities.add(identity);
    selectedSignatures.add(item._signature);
    item._dimensions.forEach((dimension) => selectedDimensions.add(dimension));
    return true;
  };

  enriched
    .filter((item) => item._mustHave)
    .sort((left, right) => right._score - left._score || left._order - right._order)
    .forEach((item) => tryAdd(item, { requireNewCoverage: true, allowAboveTarget: true }));

  enriched
    .sort((left, right) => right._score - left._score || left._order - right._order)
    .forEach((item) => {
      if (selected.length >= minimumCount) return;
      tryAdd(item, { requireNewCoverage: true, allowAboveTarget: false });
    });

  enriched
    .sort((left, right) => right._score - left._score || left._order - right._order)
    .forEach((item) => {
      if (selected.length >= targetCount) return;
      if (item._score < 95) return;
      tryAdd(item, { requireNewCoverage: true, allowAboveTarget: false });
    });

  enriched
    .filter((item) => item._mustHave && item._score >= 95)
    .sort((left, right) => right._score - left._score || left._order - right._order)
    .forEach((item) => tryAdd(item, { requireNewCoverage: true, allowAboveTarget: true }));

  return selected.sort((left, right) => left._order - right._order);
}

function buildCases(issue, archetypeKey, sourceInput = {}, aiCustomization = null, qaPlan = null) {
  const archetype = ARCHETYPES[archetypeKey] || ARCHETYPES.general;
  const key = issue.key || "JIRA-TASK";
  const context = sourceContextFrom(issue, sourceInput);
  const planAxes = Array.isArray(qaPlan?.coverage_axes) ? qaPlan.coverage_axes : [];
  const preconditionGuidelines = qaPlan?.precondition_guidelines || null;
  const summary = context.summary || issue.title || "Phạm vi task";
  const rawDocText = asText(sourceInput?.docContext);
  const normalizedDocText = normalizeSearchText(rawDocText);
  const mode = workflowMode(issue, archetypeKey);
  const guidanceLines = compactLines(aiGuidanceText(aiCustomization), 4);
  const coverageLines = uniqueLines([...context.primaryLines, ...guidanceLines], 16);
  const pick = (index, fallback) => coverageLines[index % Math.max(coverageLines.length, 1)] || fallback;
  const targetCount = clampNumber(
    Number(qaPlan?.case_strategy?.target_count) ||
      4 +
        Math.min(context.issueLines.length || 1, 10) +
        Math.min(context.qaNoteLines.length, 2) +
        Math.min(context.docLines.length, 5) +
        (mode.isConversation || mode.isIntegration || archetypeKey === "workflow" ? 2 : 0) +
        (context.description.length > 1800 ? 2 : 0),
    5,
    22,
  );
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
  const preconditionFor = (item) => {
    const lines = preconditionGuidelines?.base?.length
      ? [...preconditionGuidelines.base]
      : [
          `Build/môi trường test đã triển khai thay đổi của task ${key}.`,
          mode.isConversation
            ? "QA có conversation/session test phù hợp và có thể xem trace/log nếu cần đối chiếu."
            : mode.isIntegration
              ? "QA có payload/request mẫu và dependency phù hợp với từng scenario."
              : "QA có dữ liệu test đại diện cho scenario đang kiểm thử.",
        ];
    const tags = new Set([item.scenario, ...(item.tags || [])].filter(Boolean));
    if (tags.has("mapping") && preconditionGuidelines?.mapping) lines.push(preconditionGuidelines.mapping);
    if ((tags.has("fallback") || tags.has("missing_data")) && preconditionGuidelines?.fallback) lines.push(preconditionGuidelines.fallback);
    if ((tags.has("boundary") || tags.has("decision_table")) && preconditionGuidelines?.boundary) lines.push(preconditionGuidelines.boundary);
    if ((tags.has("regression") || tags.has("ui_regression")) && preconditionGuidelines?.regression) lines.push(preconditionGuidelines.regression);
    return dedupeStrings(lines.map(asText).filter(Boolean)).join("\n");
  };
  const scenarioHints = (item) => {
    const text = normalizeSearchText(`${item.title} ${item.objective} ${item.risk} ${(item.tags || []).join(" ")} ${item.scenario}`);
    return {
      ui: /\b(ui|popup|modal|screen|button|form|field|textarea|tag|chon|hien thi|highlight|message|reload|refresh)\b/.test(text),
      multiSelect: /\b(multi|multiple|nhieu|tag|combination|select|deselect|bo chon)\b/.test(text),
      boundary: /\b(boundary|limit|counter|400|empty|null|missing|thieu|rong|ki tu|ky tu)\b/.test(text),
      submit: /\b(submit|gui|record|langfuse|score|event|telemetry|feedback)\b/.test(text),
      toolchain: /\b(tool|trace|langfuse|payload|api|response|mapping|trip|price|schedule|stop|seat)\b/.test(text),
      state: /\b(state|transition|reload|refresh|doi|stale|reuse|context)\b/.test(text),
    };
  };
  const defaultStepsFor = (item) => {
    const scenario = titleFromIntent(item.title || item.objective);
    const scope = shortText(summary, 90);
    const hints = scenarioHints(item);
    if (item.scenario === "decision_table" || item.tags?.includes("decision_table")) {
      return [
        `Chuẩn bị các biến thể dữ liệu cho bảng quyết định của ${scenario}.`,
        "Thực hiện biến thể pass/normal và ghi nhận trạng thái hiển thị hoặc output.",
        "Thực hiện biến thể low/fail/error/missing theo test data.",
        "Đối chiếu từng biến thể với expected state để bảo đảm không mapping hoặc highlight sai.",
      ];
    }
    if (item.scenario === "boundary" || item.tags?.includes("boundary")) {
      return [
        `Mở field/control hoặc dataset cần kiểm thử boundary cho ${scenario}.`,
        "Thực hiện biến thể ngay dưới ngưỡng hoặc trạng thái invalid gần nhất.",
        "Thực hiện biến thể đúng ngưỡng và ngay trên ngưỡng nếu có.",
        "Quan sát validation/state/output để bảo đảm boundary được xử lý nhất quán.",
      ];
    }
    if (item.scenario === "missing_data" || item.tags?.includes("missing_data")) {
      return [
        `Mở đúng flow/chức năng liên quan đến ${scope}.`,
        `Thực hiện scenario thiếu dữ liệu: ${scenario}.`,
        "Bỏ trống, xoá hoặc nhập giá trị rỗng cho dữ liệu bắt buộc cần kiểm tra.",
        "Quan sát validation, fallback message và trạng thái dữ liệu sau thao tác.",
      ];
    }
    if (item.scenario === "out_of_scope" || item.tags?.includes("out_of_scope")) {
      return [
        `Mở flow/chức năng trong phạm vi task ${key}.`,
        `Nhập hoặc thực hiện biến thể ngoài scope: ${scenario}.`,
        "Quan sát hệ thống có từ chối, hỏi lại hoặc giữ nguyên phạm vi xử lý hay không.",
        "Đối chiếu log/UI/output để bảo đảm không mở rộng sang flow hoặc tài liệu không thuộc task.",
      ];
    }
    if (item.scenario === "state_transition" || item.tags?.includes("state_transition")) {
      return [
        `Thiết lập state ban đầu đúng với precondition của ${scenario}.`,
        "Thực hiện thao tác làm thay đổi state hoặc context hiện tại.",
        "Lặp lại thao tác chuyển state theo biến thể ngược hoặc state kế tiếp nếu có.",
        "Đối chiếu dữ liệu sau cùng để bảo đảm không reuse state cũ hoặc mất context mới nhất.",
      ];
    }
    if (item.scenario === "mapping" || item.tags?.includes("mapping")) {
      return [
        "Chuẩn bị dữ liệu nguồn, trace hoặc payload chuẩn để đối chiếu mapping.",
        `Thực hiện scenario cần kiểm tra mapping: ${scenario}.`,
        "Mở UI/log/API response liên quan sau khi thao tác hoàn tất.",
        "Đối chiếu từng field quan trọng giữa source of truth và dữ liệu hệ thống hiển thị hoặc gửi đi.",
      ];
    }
    if (item.scenario === "fallback" || item.tags?.includes("fallback")) {
      return [
        `Chuẩn bị điều kiện lỗi, dữ liệu rỗng hoặc dependency không trả kết quả cho ${scenario}.`,
        "Thực hiện thao tác chính khi điều kiện fallback đang xảy ra.",
        "Quan sát thông báo, retry behavior và trạng thái UI/output sau fallback.",
        "Đối chiếu để bảo đảm hệ thống không tạo dữ liệu sai, không crash và không tự bịa kết quả.",
      ];
    }
    if (item.scenario === "retry" || item.tags?.includes("retry")) {
      return [
        "Chuẩn bị một request/action có thể retry hoặc bị gửi lại.",
        `Thực hiện lần đầu scenario: ${scenario}.`,
        "Gửi lại cùng request/action hoặc trigger retry theo cơ chế hiện tại.",
        "Kiểm tra dữ liệu sau retry để bảo đảm không duplicate, không ghi đè sai và không đổi trạng thái ngoài mong đợi.",
      ];
    }
    if (item.scenario === "ui_regression" || item.tags?.includes("ui_regression")) {
      return [
        `Mở màn hình hoặc popup liên quan đến ${scope}.`,
        `Thực hiện đúng biến thể UI: ${scenario}.`,
        "Refresh/reload hoặc đóng mở lại màn hình để kiểm tra tính ổn định.",
        "Đối chiếu layout, dữ liệu hiển thị và binding sau reload với trạng thái trước đó.",
      ];
    }
    if (item.scenario === "reference_doc" || item.tags?.includes("confluence_reference")) {
      return [
        "Đọc rule hoặc flow liên quan trong doc đã fetch cho task hiện tại.",
        `Chuẩn bị dữ liệu/điều kiện đại diện cho rule: ${scenario}.`,
        "Thực hiện scenario trên môi trường test và ghi nhận output thực tế.",
        "Đối chiếu output với Jira description trước, sau đó mới đối chiếu phần doc liên quan.",
      ];
    }
    if (hints.multiSelect) {
      return [
        `Mở đúng UI/flow chứa lựa chọn cho scenario: ${scenario}.`,
        "Chọn một giá trị hợp lệ trước để xác nhận trạng thái ban đầu.",
        "Chọn thêm hoặc bỏ bớt nhiều giá trị theo tổ hợp cần kiểm thử.",
        "Quan sát số lượng control, dữ liệu đã nhập và trạng thái cuối sau khi thay đổi tổ hợp.",
      ];
    }
    if (hints.boundary) {
      return [
        `Mở field/control cần kiểm thử boundary cho ${scenario}.`,
        "Nhập dữ liệu ở ngưỡng hợp lệ thấp nhất hoặc trạng thái rỗng/null.",
        "Nhập dữ liệu ở đúng ngưỡng tối đa hoặc vượt ngưỡng một đơn vị.",
        "Quan sát validation, counter, lưu dữ liệu và thông báo lỗi nếu có.",
      ];
    }
    if (hints.submit) {
      return [
        `Mở flow submit liên quan đến ${scenario}.`,
        "Nhập đầy đủ dữ liệu hợp lệ cho scenario này.",
        "Nhấn nút gửi/lưu/xác nhận đúng một lần và quan sát trạng thái ngay sau submit.",
        "Mở log, bảng dữ liệu hoặc hệ thống downstream để đối chiếu record/event vừa tạo.",
      ];
    }
    if (hints.toolchain) {
      return [
        `Mở conversation/trace hoặc chuẩn bị payload cho scenario: ${scenario}.`,
        "Thực hiện input đầu tiên để trigger tool/API đầu chuỗi.",
        "Đi tiếp các bước cần thiết để trigger tool/API kế tiếp theo đúng thứ tự.",
        "Đối chiếu trace, tool input/output và câu trả lời cuối với dữ liệu live.",
      ];
    }
    if (mode.isConversation) {
      return [
        `Mở conversation mới hoặc conversation có state phù hợp cho ${scenario}.`,
        "Gửi message đầu tiên trong bộ test data và chờ bot phản hồi.",
        "Gửi tiếp các message bổ sung của scenario nếu test data có nhiều turn.",
        "Đối chiếu phản hồi, trace/tool call và context cuối cùng với expected result.",
      ];
    }
    if (mode.isIntegration) {
      return [
        `Chuẩn bị payload/request và dependency cho ${scenario}.`,
        `Gửi request/callback/event cho scenario: ${scenario}.`,
        "Kiểm tra response chính và trạng thái hệ thống ngay sau xử lý.",
        "Đối chiếu log/dữ liệu downstream để bảo đảm mapping đúng và không phát sinh side effect ngoài scope.",
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
      _order: candidates.length,
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

  planAxes.slice(1, 9).forEach((axis, index) => {
    addCandidate({
      title: titleFromIntent(axis.title, "Coverage axis quan trọng"),
      objective: `Bao phủ trục kiểm thử adaptive: ${axis.title}`,
      priority: index <= 2 ? "High" : "Normal",
      technique: axis.technique || archetype.primary[0],
      risk: axis.risk || "Thiếu coverage cho trục này có thể làm suite bỏ sót rủi ro chính của task.",
      tags: [axis.id, axis.scenario_type, "adaptive_qa_plan"].filter(Boolean),
      scenario: axis.scenario_type || "coverage",
      inputs: axis.inputs?.length ? axis.inputs : testInputsFor(axis.title),
      action: `Thực hiện scenario theo coverage axis: ${titleFromIntent(axis.title)}.`,
      stepData: bulletList(axis.inputs || []),
      checks: axis.checks?.length
        ? axis.checks
        : [
            "Kết quả thực tế khớp đúng coverage axis đã chọn.",
            "Không phát sinh side effect ngoài Jira scope.",
          ],
    });
  });

  const hasDocTool = (name) => context.docToolNames.includes(name);
  const busDocTools = [
    "bus_trip_schedule_catalog_tool",
    "bus_trip_stop_catalog_tool",
    "bus_trip_price_options_tool",
    "bus_trip_seat_map_tool",
  ].filter(hasDocTool);
  if (context.docContextApplied && busDocTools.length) {
    const knownTools = busDocTools.join(" -> ");
    addCandidate({
      title: "Luồng bus discovery gọi đúng chuỗi tool theo doc kỹ thuật",
      objective: `Xác minh test case dùng đúng tool name từ doc thay vì gọi chung chung Tool 1/Tool 2/Tool 3: ${knownTools}`,
      priority: "High",
      technique: "Use-case / scenario flow",
      risk: "Draft hoặc bot bỏ qua doc nên không kiểm thử đúng chuỗi tool runtime đang chạy.",
      tags: ["confluence_reference", "doc_tool_contract", "tool_chain"],
      scenario: "reference_doc",
      inputs: [
        'User hỏi: "tối mai bmt đi sg còn vé giường dưới không"',
        `Tool names trong doc: ${knownTools}`,
        "Expected chain: resolve company/date -> schedule catalog -> stop catalog -> price options.",
      ],
      steps: [
        "Mở conversation mới và gửi câu hỏi có route/date/operator ở giai đoạn discovery.",
        "Kiểm tra trace đầu tiên có gọi `bus_trip_schedule_catalog_tool` với `company_id` và `departure_date`.",
        "Sau khi chọn đúng chuyến/base trip, kiểm tra trace gọi `bus_trip_stop_catalog_tool` để lấy `origin_options` và `destination_options`.",
        "Khi đã có điểm đón/trả, kiểm tra trace gọi `bus_trip_price_options_tool` bằng `origin_selection_key` và `destination_selection_key`.",
      ],
      checks: [
        "`bus_trip_schedule_catalog_tool`, `bus_trip_stop_catalog_tool` và `bus_trip_price_options_tool` được gọi theo đúng thứ tự khi doc mô tả 3 tool riêng.",
        "Không ghi generic `Tool 1`, `Tool 2`, `Tool 3` trong testcase hoặc expected result.",
        "Câu trả lời cuối dùng dữ liệu từ tool output, không tự bịa giá/còn chỗ/điểm đón trả.",
      ],
    });
  }

  if (context.docContextApplied && hasDocTool("bus_trip_schedule_catalog_tool")) {
    addCandidate({
      title: "bus_trip_schedule_catalog_tool trả catalog chuyến theo company_id và departure_date",
      objective: "Xác minh tool lịch chạy dùng đúng contract trong doc: liệt kê chuyến thực tế theo ngày, grouped theo base_trip_id.",
      priority: "High",
      technique: "Integration contract / field mapping",
      risk: "Tool discovery không chốt được trip_id/base_trip_id đúng nên các bước stop/price phía sau sai.",
      tags: ["confluence_reference", "schedule_catalog", "field_mapping"],
      scenario: "mapping",
      inputs: [
        "company_id hợp lệ của nhà xe có chuyến trong ngày test.",
        "departure_date có dữ liệu chuyến chạy thực tế.",
        "User chưa nói giờ cụ thể hoặc hỏi một giờ không có chuyến.",
      ],
      steps: [
        "Gửi câu hỏi discovery chỉ có route/date/operator và chưa chốt giờ cụ thể.",
        "Kiểm tra trace gọi `bus_trip_schedule_catalog_tool` trước các tool stop/price.",
        "Đối chiếu output có `routes[].base_trip_id`, `routes[].route_name`, `trip_schedules[].trip_id` và `trip_schedules[].time`.",
        "Kiểm tra bot hỏi lại giờ hoặc trả danh sách giờ đang có khi user chưa nói giờ/chọn giờ không tồn tại.",
      ],
      checks: [
        "Tool schedule không trả nhầm format single-tool cũ.",
        "Bot chốt được `trip_id` và `base_trip_id` từ output trước khi gọi tool kế tiếp.",
        "Không gọi pricing/availability dư thừa khi chưa có chuyến cụ thể.",
      ],
    });
  }

  if (context.docContextApplied && hasDocTool("bus_trip_stop_catalog_tool")) {
    addCandidate({
      title: "bus_trip_stop_catalog_tool map điểm đón trả thành selection_key đúng contract",
      objective: "Xác minh stop catalog trả đủ origin/destination options để LLM map pickup, dropoff, transfer theo base_trip_id đã chốt.",
      priority: "High",
      technique: "Integration contract / field mapping",
      risk: "Sai `origin_selection_key` hoặc `destination_selection_key` làm tính giá/đặt vé sai điểm.",
      tags: ["confluence_reference", "stop_catalog", "selection_key"],
      scenario: "mapping",
      inputs: [
        "`company_id`, `base_trip_id`, `departure_date` và `trip_id` đã chốt từ schedule catalog.",
        'User nói điểm đón/trả cụ thể, ví dụ "đón Ngã Tư Sở Sao, trả Hồ Tây Đắk Mil".',
      ],
      steps: [
        "Sau khi chốt chuyến, gọi/quan sát trace `bus_trip_stop_catalog_tool` với `company_id` và `base_trip_id`.",
        "Nếu có `trip_id` và `departure_date`, kiểm tra tool lọc đúng config theo chuyến thực tế.",
        "Đối chiếu output có `origin_options`, `destination_options`, endpoint, pickup/dropoff/transfer options.",
        "Kiểm tra LLM chọn đúng `origin_selection_key` và `destination_selection_key` từ options thay vì tự dựng key.",
      ],
      checks: [
        "`origin_options` và `destination_options` luôn có endpoint để chọn thống nhất hai phía.",
        "Selection key dùng đúng format `origin:pickup...`, `destination:dropoff...` hoặc transfer tương ứng.",
        "Nếu điểm mơ hồ, bot hỏi lại/gợi ý từ catalog thay vì tự chọn sai.",
      ],
    });
  }

  if (context.docContextApplied && hasDocTool("bus_trip_price_options_tool")) {
    addCandidate({
      title: "bus_trip_price_options_tool trả price_options source-of-truth và không tự nhân số vé",
      objective: "Xác minh pricing tool bám contract doc: chỉ nhận selection_key đã chốt và trả price_options theo ticket_unit.",
      priority: "High",
      technique: "Decision table",
      risk: "Tool hoặc bot dùng field legacy như passenger_count/num_tickets làm sai tổng tiền và surcharge.",
      tags: ["confluence_reference", "price_options", "legacy_guardrail"],
      scenario: "reference_doc",
      inputs: [
        "`company_id`, `departure_date`, `trip_id`, `base_trip_id` đã có từ hai tool trước.",
        "`origin_selection_key` và `destination_selection_key` đã chốt.",
        "Biến thể: user hỏi 1 vé, 3 vé, hoặc 3 người.",
      ],
      steps: [
        "Gọi/quan sát trace `bus_trip_price_options_tool` sau khi đã có selection key hai phía.",
        "Kiểm tra input không truyền `passenger_count`, `num_tickets` hoặc `ticket_quantity`.",
        "Đối chiếu output `price_options[]`, `final_price_before_surcharge`, `origin_selection.surcharge_rule` và `destination_selection.surcharge_rule`.",
        "Kiểm tra bot tự tính tổng ngoài tool khi user hỏi nhiều vé hoặc cần cộng surcharge.",
      ],
      checks: [
        "`price_options` luôn là array và là source-of-truth cho giá theo một ticket_unit.",
        "Surcharge không bị cộng trực tiếp sai vào từng option nếu doc quy định caller/LLM tự cộng ngoài tool.",
        "Legacy single-tool fields không xuất hiện trong testcase như contract chính.",
      ],
    });
  }

  if (context.docContextApplied && /route_stop|synthetic|hanh trinh nguoc chieu|hành trình ngược chiều/.test(normalizedDocText)) {
    addCandidate({
      title: "Route stop synthetic option và validation hành trình ngược chiều",
      objective: "Xác minh rule doc về synthetic route_stop, bypass API 404 và chặn hành trình đi ngược chiều.",
      priority: "Normal",
      technique: "Boundary / negative path",
      risk: "Điểm dừng trung gian bị ẩn hoặc chọn ngược chiều vẫn tính giá như endpoint, gây sai fare segment.",
      tags: ["confluence_reference", "route_stop", "negative"],
      scenario: "fallback",
      inputs: [
        "Điểm đón/trả dọc tuyến có `selection_key` dạng `origin:pickup:route_stop:<area_id>`.",
        "Biến thể hợp lệ: điểm đón trước điểm trả theo route_stop_ids.",
        "Biến thể lỗi: điểm đón có index >= điểm trả.",
      ],
      steps: [
        "Mở stop catalog của tuyến có route stops dọc đường theo doc.",
        "Chọn synthetic route_stop hợp lệ và gọi `bus_trip_price_options_tool`.",
        "Lặp lại với tổ hợp điểm đón/trả đi ngược chiều.",
        "Đối chiếu trace không gọi API pickup detail cho `list_id=route_stop` và response lỗi đúng khi ngược chiều.",
      ],
      checks: [
        "Synthetic route_stop được hiển thị như option hợp lệ với surcharge 0.",
        "Tool pricing dùng đúng fare segment của area_id route stop thay vì fallback sai về endpoint.",
        "Trường hợp ngược chiều bị block với validation error `Hành trình ngược chiều`.",
      ],
    });
  }

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

  const selected = selectCoverageDrivenCases(candidates, qaPlan || { case_strategy: { target_count: targetCount } });
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
      precondition: preconditionFor(item),
      test_data: testData,
      expected_result: expectedResult,
      steps: steps.map((itemStep) => itemStep.description),
      structured_steps: steps,
    };
  });
}

function isOutOfScopeBranchTitle(title) {
  return normalizeSearchText(title).includes("out of scope");
}

function outlineBranchItemsFromAxis(axis = {}, index, context, caseTitles = []) {
  const checks = Array.isArray(axis.checks) ? axis.checks.map(asText).filter(Boolean) : [];
  const inputs = Array.isArray(axis.inputs) ? axis.inputs.map(asText).filter(Boolean) : [];
  const scopeLine = context.primaryLines[index];
  const items = dedupeStrings([
    ...checks.slice(0, 3),
    ...inputs.slice(0, 2).map((input) => `Dữ liệu/biến thể: ${shortText(input, 140)}`),
    axis.risk ? `Rủi ro: ${shortText(axis.risk, 140)}` : "",
    caseTitles[index] ? `Liên kết testcase: ${shortText(caseTitles[index], 120)}` : "",
    scopeLine ? `Scope Jira: ${shortText(scopeLine, 140)}` : "",
  ]);
  return items.slice(0, 5);
}

function fallbackOutlineBranch(archetype, context, issue, index, caseTitles = [], docLines = []) {
  const fallbackTitles = (archetype.branches || []).filter((title) => !isOutOfScopeBranchTitle(title));
  const title = fallbackTitles[index] || `Coverage ${index + 1}`;
  const scopeLine = context.primaryLines[index] || context.primaryLines[0] || issue.summary || "scope Jira";
  const dimension = archetype.dimensions?.[index] || "điều kiện dữ liệu quan trọng";
  const items = dedupeStrings([
    `Xác nhận ${shortText(scopeLine, 140)}`,
    `Kiểm tra ${dimension}`,
    caseTitles[index] ? `Liên kết testcase: ${shortText(caseTitles[index], 120)}` : "",
    docLines[index] ? `Đối chiếu tài liệu liên quan: ${shortText(docLines[index], 120)}` : "",
  ]);
  return {
    title,
    items: items.slice(0, 5),
  };
}

function outOfScopeOutlineBranch(context) {
  return {
    title: "Out of scope",
    items: [
      "Không kiểm thử thay đổi ngoài mô tả Jira task này",
      context.docContextIgnored
        ? "Không dùng Confluence doc không có keyword liên quan tới Jira description"
        : "Không để tài liệu tham chiếu hoặc AI Settings lấn át Jira description/acceptance criteria",
      "Không xác nhận performance/load/security nếu Jira không yêu cầu",
    ],
  };
}

function buildFlexibleOutlineBranches({ archetype, axes = [], context, issue, caseTitles = [], docLines = [] }) {
  const maxInScopeBranches = OUTLINE_MAX_BRANCHES - 1;
  const normalizedAxes = axes
    .filter((axis) => axis?.title && !isOutOfScopeBranchTitle(axis.title))
    .slice(0, maxInScopeBranches);
  const branches = normalizedAxes.map((axis, index) => {
    const title = titleFromIntent(axis.title, archetype.branches?.[index] || `Coverage ${index + 1}`);
    const items = outlineBranchItemsFromAxis(axis, index, context, caseTitles);
    return {
      title,
      items: items.length ? items : fallbackOutlineBranch(archetype, context, issue, index, caseTitles, docLines).items,
    };
  });

  while (branches.length < OUTLINE_MIN_IN_SCOPE_BRANCHES) {
    branches.push(fallbackOutlineBranch(archetype, context, issue, branches.length, caseTitles, docLines));
  }

  return [...branches.slice(0, maxInScopeBranches), outOfScopeOutlineBranch(context)];
}

function buildOutline(issue, archetypeKey, cases = [], sourceInput = {}, aiCustomization = null, qaPlan = null) {
  const archetype = ARCHETYPES[archetypeKey] || ARCHETYPES.general;
  const title = issue.title || `[${issue.key || "JIRA-TASK"}] ${issue.summary || "Test design"}`;
  const context = sourceContextFrom(issue, sourceInput);
  const scopeLines = context.primaryLines.slice(0, 8);
  const docLines = context.docLines.slice(0, 4);
  const axes = Array.isArray(qaPlan?.coverage_axes) ? qaPlan.coverage_axes : [];
  const caseTitles = Array.isArray(cases)
    ? cases
        .map((testCase) => stripTestCasePrefix(testCase.title))
        .filter(Boolean)
        .slice(0, 8)
    : [];

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
      confluence_doc_context_length: context.docContextLength,
      confluence_doc_tool_names: context.docToolNames,
      confluence_doc_ignored_as_unrelated: context.docContextIgnored,
      repo_evidence_snippets: qaPlan?.repo_evidence?.snippets || [],
      adaptive_qa_plan: qaPlan
        ? {
            version: qaPlan.version,
            signals: qaPlan.signals,
            case_strategy: qaPlan.case_strategy,
            coverage_axes: qaPlan.coverage_axes.map((axis) => ({
              id: axis.id,
              title: axis.title,
              technique: axis.technique,
              scenario_type: axis.scenario_type,
            })),
            repo_evidence_count: qaPlan.repo_evidence?.snippets?.length || 0,
            open_questions: qaPlan.open_questions,
          }
        : undefined,
      ai_customization_applied: Boolean(aiCustomization),
      ai_customization_guidance: aiGuidanceText(aiCustomization) || undefined,
      ai_customization: aiCustomization || undefined,
    },
    design_rationale: {
      archetype: archetype.label,
      primary_techniques: qaPlan?.selected_techniques?.primary || archetype.primary,
      supporting_techniques: qaPlan?.selected_techniques?.supporting || archetype.supporting,
      fail_safe_techniques: qaPlan?.selected_techniques?.fail_safe || [],
      must_cover_dimensions: archetype.dimensions,
      coverage_axes: axes.map((axis) => axis.title),
      open_questions: qaPlan?.open_questions || [],
    },
    branches: buildFlexibleOutlineBranches({ archetype, axes, context, issue, caseTitles, docLines }),
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
    "boi canh",
    "context",
    "background",
    "conversation bao phu yeu cau",
    "yeu cau jira duoc dap ung",
  ].includes(normalized);
}

function fallbackTitleFromIssue(issue, fallback = "Kiểm tra behavior chính") {
  const summaryTitle = titleFromIntent(issue.summary || issue.title, "");
  if (summaryTitle && !genericCaseTitle(summaryTitle)) return summaryTitle;
  const line = compactLines(issue.description, 6).find((item) => !genericCaseTitle(item));
  return titleFromIntent(line || fallback, fallback);
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
  const fallbackCaseTitle = stripTestCasePrefix(fallbackCase.title || "");
  const fallbackTitle = genericCaseTitle(fallbackCaseTitle)
    ? fallbackTitleFromIssue(issue, `Kiểm tra behavior chính của ${issue.key || "task"}`)
    : titleFromIntent(fallbackCaseTitle, fallbackTitleFromIssue(issue, `Kiểm tra behavior chính của ${issue.key || "task"}`));
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
    .filter((branch) => branch.title && branch.items.length);

  const dedupedBranches = [];
  const seenTitles = new Set();
  for (const branch of branches) {
    const normalizedTitle = normalizeSearchText(branch.title);
    if (!normalizedTitle || seenTitles.has(normalizedTitle)) continue;
    seenTitles.add(normalizedTitle);
    dedupedBranches.push(branch);
  }
  const nonOutBranches = dedupedBranches.filter((branch) => !isOutOfScopeBranchTitle(branch.title));
  const outScopeBranch = dedupedBranches.find((branch) => isOutOfScopeBranchTitle(branch.title));
  const fallbackBranches = Array.isArray(fallbackOutline.branches) ? fallbackOutline.branches : [];
  const fallbackNonOutBranches = fallbackBranches.filter((branch) => !isOutOfScopeBranchTitle(branch.title));
  const fallbackOutScopeBranch = fallbackBranches.find((branch) => isOutOfScopeBranchTitle(branch.title));
  const baseBranches =
    nonOutBranches.length >= OUTLINE_MIN_IN_SCOPE_BRANCHES
      ? nonOutBranches
      : fallbackNonOutBranches.length
        ? fallbackNonOutBranches
        : nonOutBranches;
  const normalizedBranches = [
    ...baseBranches.slice(0, OUTLINE_MAX_BRANCHES - 1),
    outScopeBranch ||
      fallbackOutScopeBranch || {
        title: "Out of scope",
        items: [
          "Không kiểm thử thay đổi ngoài mô tả Jira task này.",
          "Không để tài liệu tham chiếu lấn át Jira description/acceptance criteria.",
        ],
      },
  ];
  return {
    issue_key: asText(rawOutline.issue_key || rawOutline.issueKey || issue.key),
    title: asText(rawOutline.title || fallbackOutline.title || issue.title || `[${issue.key}] ${issue.summary}`),
    sheet_title: asText(rawOutline.sheet_title || rawOutline.sheetTitle || fallbackOutline.sheet_title || "Brace Map"),
    template: asText(rawOutline.template || fallbackOutline.template || archetypeKey),
    source_context: rawOutline.source_context || fallbackOutline.source_context || {},
    design_rationale: rawOutline.design_rationale || rawOutline.designRationale || fallbackOutline.design_rationale || {},
    branches: normalizedBranches.slice(0, OUTLINE_MAX_BRANCHES),
  };
}

function normalizedCaseIdentity(testCase = {}) {
  const title = normalizeSearchText(stripTestCasePrefix(testCase.title || testCase.name || ""));
  const tags = arrayFromMaybe(testCase.coverage_tags || testCase.coverageTags).join(" ");
  return `${title}|${normalizeSearchText(testCase.scenario_type || testCase.scenarioType || "")}|${normalizeSearchText(tags)}`;
}

function completeAiCasesWithFallback(testCases = [], fallbackCases = [], qaPlan = null) {
  const qualityFloor = clampNumber(
    Number(qaPlan?.case_strategy?.minimum_count) || Math.min(testCases.length || fallbackCases.length || 0, 5),
    0,
    32,
  );
  if (!qualityFloor || testCases.length >= qualityFloor || !fallbackCases.length) {
    return testCases;
  }
  const selected = [...testCases];
  const seen = new Set(selected.map(normalizedCaseIdentity).filter(Boolean));
  const seenDimensions = new Set(selected.flatMap((testCase) => caseCoverageDimensions({
    title: testCase.title,
    objective: testCase.objective,
    risk: testCase.risk,
    tags: arrayFromMaybe(testCase.coverage_tags || testCase.coverageTags),
    scenario: testCase.scenario_type || testCase.scenarioType,
    technique: testCase.technique,
  })));
  for (const fallbackCase of fallbackCases) {
    if (selected.length >= qualityFloor) break;
    const key = normalizedCaseIdentity(fallbackCase);
    if (key && seen.has(key)) continue;
    const dimensions = caseCoverageDimensions({
      title: fallbackCase.title,
      objective: fallbackCase.objective,
      risk: fallbackCase.risk,
      tags: arrayFromMaybe(fallbackCase.coverage_tags || fallbackCase.coverageTags),
      scenario: fallbackCase.scenario_type || fallbackCase.scenarioType,
      technique: fallbackCase.technique,
    });
    if (dimensions.length && dimensions.every((dimension) => seenDimensions.has(dimension))) continue;
    seen.add(key);
    dimensions.forEach((dimension) => seenDimensions.add(dimension));
    selected.push(fallbackCase);
  }
  return selected;
}

function normalizeAiDraft(payload, issue, archetypeKey, fallbackCases, fallbackOutline, qaPlan = null, options = {}) {
  const rawCases = Array.isArray(payload?.test_cases)
    ? payload.test_cases
    : Array.isArray(payload?.testCases)
      ? payload.testCases
      : [];
  if (!rawCases.length) {
    throw new Error("AI provider trả về JSON nhưng thiếu `test_cases`.");
  }
  const aiCases = rawCases.slice(0, 32).map((rawCase, index) => normalizeAiCase(rawCase, index, issue, fallbackCases[index]));
  const testCases = options.completeFallback === false ? aiCases : completeAiCasesWithFallback(aiCases, fallbackCases, qaPlan);
  const outline = normalizeAiOutline(payload.outline || payload.test_design || payload.testDesign || {}, issue, archetypeKey, fallbackOutline);
  return { testCases, outline };
}

function removeNonTestPreconditionNoise(value) {
  const lines = asText(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/fetch(ed)?\s+(doc|confluence)|doc\s+confluence\s+.*fetch|confluence\s+.*(ky tu|ký tự|characters)/i.test(normalizeSearchText(line)));
  return lines.join("\n");
}

function polishDraftCases(cases = [], issue, qaPlan = null, project = {}) {
  const seen = new Map();
  return cases.map((testCase, index) => {
    const axis = qaPlan?.coverage_axes?.[index % Math.max(qaPlan.coverage_axes.length, 1)];
    const rawTitle = stripTestCasePrefix(testCase.title);
    const cleanTitle = genericCaseTitle(rawTitle)
      ? titleFromIntent(axis?.title || issue.summary || issue.title, `Kiểm tra behavior chính của ${issue.key || "task"}`)
      : titleFromIntent(rawTitle, axis?.title || issue.summary || "Kiểm tra behavior chính");
    const duplicateCount = seen.get(cleanTitle) || 0;
    seen.set(cleanTitle, duplicateCount + 1);
    const finalTitle = duplicateCount ? `${cleanTitle} - biến thể ${duplicateCount + 1}` : cleanTitle;
    const structuredSteps = Array.isArray(testCase.structured_steps) && testCase.structured_steps.length
      ? testCase.structured_steps
      : structuredStepsFromDescriptions(testCase.steps || ["Thực hiện scenario theo testcase."], testCase.test_data, testCase.expected_result);
    const expectedResult = ensureExpectedBullets(testCase.expected_result) || expectation("Kết quả thực tế khớp Jira description/AC.");
    return {
      ...testCase,
      title: `${testCaseTitlePrefix(project.testCaseNumberTemplate, index + 1)} ${finalTitle}`,
      objective: asText(testCase.objective) || `Xác nhận scenario: ${finalTitle}`,
      technique: asText(testCase.technique) || axis?.technique || qaPlan?.selected_techniques?.primary?.[0] || "Use-case / scenario flow",
      risk: asText(testCase.risk) || axis?.risk || "Thiếu coverage cho scenario này có thể làm task pass thiếu.",
      requirement_ref: asText(testCase.requirement_ref || issue.key),
      coverage_tags: Array.isArray(testCase.coverage_tags) ? testCase.coverage_tags.map(asText).filter(Boolean) : [],
      scenario_type: asText(testCase.scenario_type) || axis?.scenario_type || "coverage",
      precondition:
        removeNonTestPreconditionNoise(testCase.precondition) ||
        qaPlan?.precondition_guidelines?.base?.join("\n") ||
        `Build/môi trường test đã triển khai thay đổi của task ${issue.key || ""}.`,
      expected_result: expectedResult,
      steps: structuredSteps.map((item) => item.description).filter(Boolean),
      structured_steps: structuredSteps,
    };
  });
}

function draftQualityReport(cases = [], outline = {}, qaPlan = null) {
  const warnings = [];
  const titles = cases.map((testCase) => normalizeSearchText(stripTestCasePrefix(testCase.title)));
  const duplicateTitles = titles.filter((title, index) => title && titles.indexOf(title) !== index);
  if (duplicateTitles.length) warnings.push("Có testcase title trùng nhau sau khi normalize.");
  if (cases.some((testCase) => genericCaseTitle(stripTestCasePrefix(testCase.title)))) warnings.push("Có testcase title còn generic.");
  if (cases.some((testCase) => /fetch(ed)?\s+(doc|confluence)/i.test(normalizeSearchText(testCase.precondition)))) {
    warnings.push("Có precondition nói về thao tác fetch doc thay vì setup kiểm thử.");
  }
  if (cases.some((testCase) => !looksLikeMultilineBullets(testCase.expected_result))) warnings.push("Có expected result chưa ở dạng bullet.");
  if (!outline?.branches?.some((branch) => normalizeSearchText(branch.title).includes("out of scope"))) {
    warnings.push("Test design thiếu branch Out of scope.");
  }
  const minCaseCount = Number(qaPlan?.case_strategy?.minimum_count) || 0;
  if (minCaseCount && cases.length < minCaseCount) {
    warnings.push(`Số testcase (${cases.length}) thấp hơn minimum adaptive (${minCaseCount}).`);
  }
  return {
    warnings,
    case_count: cases.length,
    recommended_case_count: qaPlan?.case_strategy || null,
    branch_count: Array.isArray(outline?.branches) ? outline.branches.length : 0,
    adaptive_axes_covered: qaPlan?.coverage_axes?.map((axis) => axis.title) || [],
  };
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
  qaPlan,
}) {
  const system = [
    "You are EasyForQC, a senior QC/QA test design assistant.",
    "Generate reusable Jira Zephyr test cases and a compact XMind test-design outline.",
    "Follow the OmniAgent QA skill standards from the provided references.",
    "Write all human-readable testcase and test-design content in natural Vietnamese.",
    "Keep technical identifiers, tool names, API names, field names, status values, and JSON keys unchanged.",
    "Return strict JSON only. No markdown, no prose outside JSON.",
  ].join("\n");

  const user = [
    "## Source priority",
    "1. Jira summary and description are the primary source of scope.",
    "2. Confluence/doc context is supporting evidence only. Use it only when it clearly relates to the Jira task.",
    "3. Repo evidence with `source_type=product_omniagent` or `product_repo` is domain/code grounding. Prefer it over old QA examples when deciding concrete behavior, data, and nearby regression.",
    "4. Repo evidence with `source_type=qa_reference` and Local reference testcase style examples are writing/structure references only. Do not copy their scenario content unless it matches the current Jira.",
    "5. QA notes and AI Settings refine style/coverage; they must not override explicit Jira scope.",
    "",
    "## Output rules",
    "- Output language: Vietnamese for `title`, `precondition`, `objective`, `risk`, `steps`, `test_data`, `expected_result`, and test-design branch items. Keep Jira keys, field names, API names, tool names, AMR/CE/AI terms, and code identifiers unchanged.",
    "- Do not mix generic English phrasing into Vietnamese content, for example avoid `Verify`, `Check`, `Open question`, `Happy path`, unless it is a deliberate testing-technique label.",
    "- Do not create a fixed number of cases. Create as many as needed to cover the task well, and do not pad generic cases just to reach a count.",
    "- Use `Adaptive QA plan.case_strategy` as quality guidance, not a quota: stay near `target_count` when risks are distinct, stay under `maximum_count`, and go below `target_count` when all meaningful risk axes are already covered. Treat `minimum_count` as a warning floor for complex tasks, not permission to merge unrelated risks.",
    "- Each testcase title must be concise, scenario-specific, and immediately explain what the case covers.",
    "- Testcase titles must describe the purpose/risk being covered. Never use raw URLs, repo links, doc links, attachment names, or reference-only lines from Jira description as a title.",
    "- Never use generic titles such as `Mục tiêu`, `Bối cảnh`, `Context`, `Background`, `Description`, `Conversation bao phủ yêu cầu`, or `Yêu cầu Jira được đáp ứng`.",
    "- Always generate a fresh suite from the current Jira issue, current doc context, QA notes, and current AI Settings. Do not reuse old/generated/saved test cases as source content.",
    "- Use QC techniques deliberately: decision table, state transition, equivalence partitioning, boundary/null handling, regression, fallback/recovery, retry/idempotency, field mapping when relevant.",
    "- Follow the adaptive QA plan below. It is not a fixed template: it selects techniques and coverage axes from this Jira task's actual risks.",
    "- Do not force every task into the same cases. Convert each selected coverage axis into concrete cases only when it fits the current Jira scope.",
    "- Match the style of the existing OmniAgent QA suites such as `ai_703_test_cases.json` and `ai_707_test_cases_v2.json`: one testcase = one focused scenario, strong title, concrete precondition, realistic data, and 3-4 tester action steps.",
    "- If a current-issue reference style exists, use it as the closest writing and coverage example while still deriving the final output from the current Jira/doc context.",
    "- Do not copy the AI-703/AI-707 content unless the current Jira task is actually about that behavior. Use those suites only as writing/structure examples.",
    "- When Repo/local evidence snippets include OmniAgent docs, skills, SOPs, system prompts, references, scripts, or config, use those snippets to make the cases less generic and closer to the actual product behavior.",
    "- For bus booking toolchain tasks, cover each named tool independently and the full inter-tool chain. Use exact tool names from the Jira/doc such as `bus_trip_schedule_catalog_tool`, `bus_trip_stop_catalog_tool`, `bus_trip_price_options_tool`, and `bus_trip_seat_map_tool` when applicable.",
    "- Do not write vague labels like `Tool 1`, `Tool 2`, or `Tool 3` when explicit tool names are available.",
    "- `test_data` must contain realistic test data. For chatbot/conversation flows, use numbered quoted user messages: `1. \"...\"`.",
    "- `expected_result` must be multiline bullet points beginning with `- `.",
    "- `steps` must be an array of clear tester actions like the sample suites. Each item is one Zephyr Test Player row, not a paragraph.",
    "- Use `structured_steps` only when a row needs its own test data or expected result; otherwise `steps` plus case-level `test_data`/`expected_result` is preferred.",
    "- Test design branch count is flexible: use the smallest useful set for the current task, usually 3-8 branches total depending on complexity. Always include one branch named `Out of scope`; do not pad generic branches just to hit a number.",
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
    truncateForPrompt(localTestCaseStyleExamples(issue.key), AI_REFERENCE_PROMPT_LIMIT),
    "",
    "## Jira issue",
    jsonForPrompt(issue, 18000),
    "",
    "## Selected archetype",
    jsonForPrompt({ key: archetypeKey, ...archetype }, 4000),
    "",
    "## Adaptive QA plan for this specific task",
    jsonForPrompt(qaPlan || {}, 18000),
    "",
    "## Repo/local evidence snippets",
    jsonForPrompt(qaPlan?.repo_evidence || {}, 12000),
    "",
    "## QA notes",
    truncateForPrompt(sourceInput.qaNotes || "", 4000),
    "",
    "## Confluence/doc context for this task only",
    truncateForPrompt(sourceInput.docContext || "", AI_DOC_CONTEXT_PROMPT_LIMIT),
    "",
    "## User AI Settings guidance",
    truncateForPrompt(aiGuidanceText(aiCustomization), 6000),
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

async function generateAiDraft({ issue, archetypeKey, sourceInput, aiSettings, aiCustomization, fallbackCases, fallbackOutline, project, qaPlan }) {
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
    qaPlan,
  });
  const result = await callOpenAiCompatible(aiSettings, messages);
  return {
    ...normalizeAiDraft(result.payload, issue, archetypeKey, fallbackCases, fallbackOutline, qaPlan),
    usage: result.usage,
  };
}

function buildAiImproveDraftMessages({
  issue,
  archetypeKey,
  archetype,
  sourceInput,
  aiCustomization,
  currentCases,
  currentOutline,
  improveInstruction,
  sourceRoot,
  qaPlan,
}) {
  const system = [
    "You are EasyForQC, a senior QC/QA test design assistant.",
    "Improve an existing draft of Jira Zephyr test cases and an XMind test-design outline.",
    "The user's improve instruction is task-local feedback. Apply it carefully without losing useful risk coverage.",
    "Return a full revised draft as strict JSON only. Do not return patches, markdown, or prose outside JSON.",
  ].join("\n");

  const user = [
    "## Source priority",
    "1. Jira summary/description and acceptance criteria remain the primary source of truth.",
    "2. User improve instruction refines the current draft. It can request additions, removals, rewrites, coverage shifts, or title/style changes.",
    "3. Preserve strong existing cases when they are still relevant. Remove or merge cases only when the instruction clearly asks for it or they are duplicate/generic.",
    "4. Confluence/doc context and QA notes are supporting evidence only when clearly related to this Jira task.",
    "5. AI Settings guidance applies to style and coverage quality, but must not override explicit Jira scope.",
    "",
    "## Improve rules",
    "- Treat the instruction as a request to edit the current draft artifacts, not as a request to write prompt guidance.",
    "- First inspect all current test cases and outline branches, decide which artifacts are affected, then update every affected field consistently.",
    "- If the instruction targets `test_data` or sample values, update `test_data` in every relevant testcase and also update steps/expected_result when they mention the old data shape.",
    "- For value-format rules such as code length, prefix, suffix, enum, route, channel, product, status, or date/time format, produce concrete valid examples that match the requested rule.",
    "- Preserve testcase count when the instruction only asks to fix content inside existing cases. Add/remove cases only when the instruction clearly changes coverage scope.",
    "- Output language: Vietnamese with full diacritics for all human-readable testcase/test-design content.",
    "- Return the complete revised `test_cases` and `outline`, not a diff.",
    "- Do not simply append generic cases. Add cases only when they cover a distinct risk, edge case, fallback, validation, regression, mapping, or state transition.",
    "- If the user asks to rewrite titles, make titles business/risk specific and remove URLs/reference-noise.",
    "- If the user asks for more coverage, prioritize likely bug surfaces: validation, auth, empty/partial data, duplicate/retry, fallback, wrong mapping, state carry-forward, nearby regression.",
    "- Keep each testcase focused: one testcase = one scenario.",
    "- `expected_result` must be multiline bullet points beginning with `- `.",
    "- `steps` must be an array of clear tester actions.",
    "- Keep exactly one `Out of scope` branch in the outline.",
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
    "## User improve instruction",
    truncateForPrompt(improveInstruction, 8000),
    "",
    "## Jira issue",
    jsonForPrompt(issue, 16000),
    "",
    "## Selected archetype",
    jsonForPrompt({ key: archetypeKey, ...archetype }, 4000),
    "",
    "## Adaptive QA plan",
    jsonForPrompt(qaPlan || {}, 14000),
    "",
    "## Current draft test cases to improve",
    jsonForPrompt(currentCases, 22000),
    "",
    "## Current test-design outline to improve",
    jsonForPrompt(currentOutline, 12000),
    "",
    "## QA notes",
    truncateForPrompt(sourceInput.qaNotes || "", 4000),
    "",
    "## Confluence/doc context for this task only",
    truncateForPrompt(sourceInput.docContext || "", AI_DOC_CONTEXT_PROMPT_LIMIT),
    "",
    "## OmniAgent skill references",
    truncateForPrompt(omniSkillReference(sourceRoot), 12000),
    "",
    "## User AI Settings guidance",
    truncateForPrompt(aiGuidanceText(aiCustomization), 6000),
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function buildAiImprovePromptMessages({
  instruction,
  issue,
  currentCases,
  currentOutline,
  aiCustomization,
  language,
}) {
  const outputLanguage = language === "en" ? "English" : "Vietnamese with full diacritics";
  const currentPromptGuidance = aiCustomization?.promptGuidelines || aiGuidanceText(aiCustomization);
  const system = [
    "You are EasyForQC's senior QA prompt engineer.",
    "Convert task-local user feedback into reusable AI Settings guidance for future Jira test-case and test-design generation.",
    "Return a full revised version of the consolidated AI Settings prompt, not a patch and not only the user's new text.",
    "Return only one valid JSON object.",
  ].join("\n");

  const user = [
    `Output language: ${outputLanguage}`,
    "",
    "## Goal",
    "Revise the current consolidated prompt so it remains clean, deduplicated, and reusable across different Jira tasks.",
    "",
    "## Rules",
    "- Treat the current AI Settings guidance as the source document to edit, not as loose inspiration.",
    "- Preserve the existing prompt's important intent, writing style rules, title-quality rules, test-case structure, test-design rules, coverage rules, and open-question/assumption rules.",
    "- Make the smallest useful edit. If one existing sentence can be improved, edit that sentence and leave the rest unchanged.",
    "- Keep unrelated sections, bullets, examples, and formatting from the current prompt. Only remove text when it is truly duplicate, contradictory, obsolete, or directly replaced by better wording.",
    "- Preserve the current prompt's language, numbering style, and section order unless the user's request clearly requires a cleaner structure.",
    "- Never replace the whole prompt with only the user's request or only a short summary.",
    "- Read the current prompt first, then decide whether the user's request is already covered, partially covered, contradictory, or new.",
    "- If the request is already covered, refine the existing wording only when it makes the rule clearer; do not duplicate it.",
    "- If the request partially overlaps an existing rule, edit that existing rule in place instead of appending a near-duplicate rule.",
    "- If the request conflicts with an existing rule, keep the higher-quality/general rule and revise the prompt so there is no contradiction.",
    "- If the request adds a genuinely new reusable rule, insert it in the most relevant position and keep numbering/formatting tidy.",
    "- Generalize task-specific wording into testing rules, risk lenses, title rules, coverage expectations, or formatting guidance.",
    "- Do not include Jira keys, URLs, credentials, tokens, personal data, company-internal secrets, or one-off task facts unless they are necessary as a reusable pattern.",
    "- Preserve the user's real intent. Do not invent unrelated QA rules.",
    "- If the request asks for more coverage, name concrete bug surfaces such as validation, auth, empty/partial data, duplicate/retry, fallback, wrong mapping, state carry-forward, or nearby regression.",
    "- Keep the final prompt concise but complete. It may rewrite, merge, remove, or renumber existing content.",
    "- Always target `promptGuidelines`; do not split the result into multiple fields.",
    "- `improved_prompt` must contain the full final consolidated prompt after all edits, including unchanged rules that should remain. Do not include the label `Prompt tạo test case/test design:` unless it already belongs inside the prompt.",
    "- Never return only the new bullet, only a diff, or only a summary.",
    "",
    "## Allowed target field",
    "- `promptGuidelines`: consolidated prompt for writing style, test-case rules, test-design rules, risk coverage, and reusable improvement habits.",
    "",
    "## Required JSON schema",
    JSON.stringify(
      {
        updates: [
          {
            target_field: "promptGuidelines",
            improved_prompt: "Full revised consolidated prompt after merging, editing, deduplicating, and preserving useful existing rules.",
          },
        ],
        summary: "Short note describing how the consolidated AI Settings prompt was improved",
      },
      null,
      2,
    ),
    "",
    "## User refine request to generalize",
    truncateForPrompt(instruction, 5000),
    "",
    "## Current AI Settings guidance",
    truncateForPrompt(currentPromptGuidance, 20000),
    "",
    "## Current Jira context for de-specificating only",
    jsonForPrompt(
      {
        key: issue?.key,
        summary: issue?.summary,
        issue_type: issue?.issue_type,
        status: issue?.status,
      },
      5000,
    ),
    "",
    "## Current draft examples for de-specificating only",
    jsonForPrompt(
      {
        test_cases: Array.isArray(currentCases)
          ? currentCases.slice(0, 12).map((item) => ({
              title: stripTestCasePrefix(item?.title),
              test_data: asText(item?.test_data || item?.testData),
              steps: Array.isArray(item?.steps) ? item.steps.slice(0, 4) : [],
              expected_result: asText(item?.expected_result || item?.expectedResult),
            }))
          : [],
        outline_branches: Array.isArray(currentOutline?.branches) ? currentOutline.branches.slice(0, 8).map((branch) => branch?.title) : [],
      },
      12000,
    ),
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

const AI_PROMPT_IMPROVE_FIELDS = new Set(["promptGuidelines"]);

function normalizePromptImproveTargetField(value) {
  const raw = asText(value).trim();
  const compact = raw.replace(/[\s_-]+/g, "").toLowerCase();
  const aliases = {
    promptguidelines: "promptGuidelines",
    guidelines: "promptGuidelines",
    prompt: "promptGuidelines",
    writingstyle: "promptGuidelines",
    style: "promptGuidelines",
    tone: "promptGuidelines",
    language: "promptGuidelines",
    testcaseguidelines: "promptGuidelines",
    testcase: "promptGuidelines",
    testcases: "promptGuidelines",
    caseguidelines: "promptGuidelines",
    testdesignguidelines: "promptGuidelines",
    testdesign: "promptGuidelines",
    xmind: "promptGuidelines",
    mindmap: "promptGuidelines",
    improvementnotes: "promptGuidelines",
    improvements: "promptGuidelines",
    memory: "promptGuidelines",
    notes: "promptGuidelines",
  };
  const normalized = aliases[compact] || raw;
  return AI_PROMPT_IMPROVE_FIELDS.has(normalized) ? normalized : "promptGuidelines";
}

function normalizePromptImproveText(value) {
  return asText(value).trim();
}

function normalizeImprovedPromptPayload(payload = {}) {
  const rawUpdates = Array.isArray(payload.updates)
    ? payload.updates
    : Array.isArray(payload.prompt_updates)
      ? payload.prompt_updates
      : Array.isArray(payload.field_updates)
        ? payload.field_updates
        : [];
  const legacyPrompt = asText(
    payload.improved_prompt ||
      payload.improvedPrompt ||
      payload.prompt ||
      payload.guidance ||
      payload.content,
  );
  const updateItems = rawUpdates.length
    ? rawUpdates
    : legacyPrompt.trim()
      ? [{ target_field: payload.target_field || payload.targetField || "promptGuidelines", improved_prompt: legacyPrompt }]
      : [];
  const byField = new Map();
  for (const item of updateItems) {
    const targetField = normalizePromptImproveTargetField(item?.target_field || item?.targetField || item?.field);
    const text = normalizePromptImproveText(item?.improved_prompt || item?.improvedPrompt || item?.prompt || item?.guidance || item?.content || item?.text);
    if (!text) continue;
    const existing = byField.get(targetField);
    byField.set(targetField, existing ? `${existing}\n${text}` : text);
  }
  const updates = Array.from(byField.entries()).map(([targetField, improvedPrompt]) => ({
    targetField,
    improvedPrompt,
  }));
  if (!updates.length) {
    throw Object.assign(new Error("AI provider trả về JSON nhưng thiếu `updates[].improved_prompt`."), { status: 502 });
  }
  return {
    improvedPrompt: updates[0].improvedPrompt,
    targetField: updates[0].targetField,
    updates,
    summary: asText(payload.summary),
  };
}

function promptTokenSet(value = "") {
  const words = asText(value)
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}_]+/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !/^\d+$/.test(word));
  return new Set(words);
}

function promptTokenOverlapRatio(previousPrompt = "", nextPrompt = "") {
  const previousTokens = promptTokenSet(previousPrompt);
  if (!previousTokens.size) return 1;
  const nextTokens = promptTokenSet(nextPrompt);
  let matched = 0;
  for (const token of previousTokens) {
    if (nextTokens.has(token)) matched += 1;
  }
  return matched / previousTokens.size;
}

function promptConceptFlags(value = "") {
  const text = asText(value).toLowerCase();
  return {
    scope: /scope|jira|task|phạm vi|đối tượng|feature|flow|mục tiêu|acceptance|business rule/.test(text),
    writingStyle: /phong cách|tiếng việt|ngắn gọn|business rule|expected result|cụ thể/.test(text),
    titleQuality: /title|tiêu đề|tên test|scenario|đọc vào|mục đích/.test(text),
    testCaseStructure:
      /test\s*case|testcase|precondition|objective|priority|step|steps|test data|expected result|zephyr|tiền điều kiện|các bước|dữ liệu|kết quả mong đợi|ưu tiên/.test(text),
    coverage:
      /happy|negative|edge|regression|fallback|validation|duplicate|retry|boundary|empty|null|missing|partial|wrong|mapping|auth|permission|state|context|rủi ro|bao phủ|lỗi|biên|trùng|thiếu|sai|xác thực|phân quyền/.test(text),
    testDesign: /test\s*design|xmind|mindmap|branch|out of scope|nhánh|sơ đồ|góc nhìn/.test(text),
    uncertainty: /open question|assumption|scope chưa rõ|không đoán|tự đoán|thiếu scope|giả định|câu hỏi mở|thiếu thông tin|không đoán ngầm/.test(text),
  };
}

function missingPreservedPromptConcepts(previousPrompt = "", nextPrompt = "") {
  const before = promptConceptFlags(previousPrompt);
  const after = promptConceptFlags(nextPrompt);
  return Object.entries(before)
    .filter(([, existed]) => existed)
    .filter(([concept]) => !after[concept])
    .map(([concept]) => concept);
}

function validateImprovedPromptPreservesContext(previousPrompt = "", updates = []) {
  const currentPrompt = asText(previousPrompt).trim();
  if (currentPrompt.length < 500) return;
  for (const update of updates) {
    if (update.targetField !== "promptGuidelines") continue;
    const improvedPrompt = asText(update.improvedPrompt).trim();
    const lengthRatio = improvedPrompt.length / currentPrompt.length;
    const overlapRatio = promptTokenOverlapRatio(currentPrompt, improvedPrompt);
    const missingConcepts = missingPreservedPromptConcepts(currentPrompt, improvedPrompt);
    if (lengthRatio < 0.68 || overlapRatio < 0.52 || missingConcepts.length) {
      throw Object.assign(
        new Error(
          "AI trả về prompt mới thiếu quá nhiều nội dung cũ nên EasyForQC chưa lưu đè. Hãy thử Improve lại với yêu cầu cụ thể hơn, hoặc chỉnh prompt thủ công rồi nhấn Lưu.",
        ),
        {
          status: 502,
          details: {
            reason: "prompt_preservation_guard",
            length_ratio: Number(lengthRatio.toFixed(3)),
            token_overlap_ratio: Number(overlapRatio.toFixed(3)),
            missing_concepts: missingConcepts,
          },
        },
      );
    }
  }
}

async function generateAiImprovedDraft({
  issue,
  archetypeKey,
  sourceInput,
  aiSettings,
  aiCustomization,
  currentCases,
  currentOutline,
  improveInstruction,
  project,
  qaPlan,
}) {
  const archetype = ARCHETYPES[archetypeKey] || ARCHETYPES.general;
  const messages = buildAiImproveDraftMessages({
    issue,
    archetypeKey,
    archetype,
    sourceInput,
    aiCustomization,
    currentCases,
    currentOutline,
    improveInstruction,
    sourceRoot: project.sourceRoot,
    qaPlan,
  });
  const result = await callOpenAiCompatible(aiSettings, messages);
  return {
    ...normalizeAiDraft(result.payload, issue, archetypeKey, currentCases, currentOutline, qaPlan, { completeFallback: false }),
    usage: result.usage,
  };
}

async function generateAiImprovedPrompt({
  instruction,
  issue,
  aiSettings,
  aiCustomization,
  currentCases,
  currentOutline,
  language,
}) {
  async function runPromptImprove(promptInstruction) {
    const messages = buildAiImprovePromptMessages({
      instruction: promptInstruction,
      issue,
      currentCases,
      currentOutline,
      aiCustomization,
      language,
    });
    const result = await callOpenAiCompatible(aiSettings, messages);
    const improved = normalizeImprovedPromptPayload(result.payload);
    validateImprovedPromptPreservesContext(aiCustomization?.promptGuidelines || "", improved.updates);
    return {
      ...improved,
      usage: result.usage,
    };
  }

  try {
    return await runPromptImprove(instruction);
  } catch (error) {
    if (error?.details?.reason !== "prompt_preservation_guard") {
      throw error;
    }
    const retryInstruction = [
      instruction,
      "",
      "PRESERVATION RETRY:",
      "The previous improved prompt was rejected because it removed too much useful existing guidance.",
      `Length ratio: ${error.details.length_ratio}; token overlap ratio: ${error.details.token_overlap_ratio}.`,
      Array.isArray(error.details.missing_concepts) && error.details.missing_concepts.length
        ? `Missing concept groups that must be preserved: ${error.details.missing_concepts.join(", ")}.`
        : "",
      "Return a full revised prompt that keeps all unrelated existing rules, edits overlapping rules in place, and adds only genuinely reusable new guidance.",
    ]
      .filter(Boolean)
      .join("\n");
    return runPromptImprove(retryInstruction);
  }
}

function aiProviderResponseMeta(settings = {}, used = false, error = "", usage = null) {
  const normalized = normalizeAiSettings(settings);
  const mode = shouldUseResponsesApi(normalized) ? "responses" : "chat";
  return {
    enabled: normalized.enabled,
    configured: aiProviderConfigured(normalized),
    used: Boolean(used),
    provider: normalized.provider,
    model: normalized.model,
    endpoint: providerOrigin(aiEndpointUrl(normalized, mode)),
    api_mode: mode,
    error: asText(error),
    usage,
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
  return asText(title).replace(/^\[[^\]]{1,64}\]\s*/, "");
}

function normalizeTestCaseNumberTemplate(value) {
  return asText(value).trim().replace(/^\[/, "").replace(/\]$/, "").trim() || DEFAULTS.testCaseNumberTemplate;
}

function renderTestCaseNumber(template, index) {
  const safeIndex = Math.max(1, Math.floor(Number(index) || 1));
  const normalized = normalizeTestCaseNumberTemplate(template);
  const padded = (width) => String(safeIndex).padStart(Math.max(Number(width) || 1, 1), "0");
  if (/\{0+\}/.test(normalized)) {
    return normalized.replace(/\{0+\}/g, (match) => padded(match.length - 2));
  }
  if (/\{n\}/i.test(normalized)) {
    return normalized.replace(/\{n\}/gi, String(safeIndex));
  }
  if (/\d+/.test(normalized)) {
    return normalized.replace(/\d+(?!.*\d)/, (digits) => padded(digits.length));
  }
  return `${normalized}_${padded(4)}`;
}

function testCaseTitlePrefix(template, index) {
  return `[${renderTestCaseNumber(template, index)}]`;
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
      adaptive_qa_plan: sourceContext.adaptive_qa_plan || null,
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

function commandOutputForClient(result = {}) {
  if (!EXPOSE_DEBUG_DETAILS) {
    return { stdout: "", stderr: "" };
  }
  return {
    stdout: asText(result.safeStdout || result.stdout),
    stderr: asText(result.safeStderr || result.stderr),
  };
}

function sendError(res, error) {
  const status = error.status || 500;
  const details = EXPOSE_DEBUG_DETAILS ? redactValue(error.details || null) : null;
  res.status(status).json({
    error: redactText(error.message || "Unexpected error"),
    details,
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
    repoContext: DEFAULTS.repoContext,
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

app.get("/api/chatwoot-uat", async (req, res) => {
  try {
    const skillRoot = resolveChatwootUatSkillRoot();
    const skillExists = fsSync.existsSync(path.join(skillRoot, "SKILL.md"));
    if (skillExists) {
      await ensureStandardQaWorkspaceItems(req.session.email);
    }
    const suites = skillExists ? await listChatwootUatSuites(skillRoot) : [];
    const stored = await requestUserSettings(req);
    const plannerAiSettings = normalizeAiSettings(stored.aiSettings);
    res.json({
      skillRoot,
      skillExists,
      candidates: chatwootUatSkillRootCandidates(),
      defaultWebhookUrl: DEFAULT_CHATWOOT_UAT_WEBHOOK_URL,
      defaultHealthcheckUrl: DEFAULT_CHATWOOT_UAT_HEALTHCHECK_URL,
      defaultChatwootApiBase: DEFAULT_CHATWOOT_UAT_API_BASE || chatwootUatConfigValue(["CHATWOOT_API_BASE", "chatwoot_api_base", "api_base"]),
      defaultAccountId: DEFAULT_CHATWOOT_UAT_ACCOUNT_ID || chatwootUatConfigValue(["CHATWOOT_ACCOUNT_ID", "CHATWOOT_DEFAULT_ACCOUNT_ID", "account_id", "default_account_id"]),
      defaultInboxId: DEFAULT_CHATWOOT_UAT_INBOX_ID,
      defaultUiInboxId: DEFAULT_CHATWOOT_UAT_UI_INBOX_ID,
      defaultCaptainAssistantId: DEFAULT_CHATWOOT_UAT_CAPTAIN_ASSISTANT_ID,
      serverChatwootAuthReady: chatwootUatConfigHasApiKey(),
      plannerAiReady: aiProviderReady(plannerAiSettings),
      defaultPlannerModel: plannerAiSettings.model,
      codexCliAvailable: await commandAvailable("codex"),
      suites,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/chatwoot-uat/jobs", async (req, res) => {
  try {
    const jobs = await listChatwootJobs(req.session.email, req.query.limit);
    res.json({ jobs });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/chatwoot-uat/jobs/:id", async (req, res) => {
  try {
    const job = await findChatwootJob(req.session.email, req.params.id);
    if (!job) {
      res.status(404).json({ error: "Không tìm thấy run Chatwoot UAT." });
      return;
    }
    res.json({ job });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/chatwoot-uat/jobs", async (req, res) => {
  try {
    const stored = await requestUserSettings(req);
    const prepared = await prepareChatwootUatRun(req.body || {}, {
      plannerAiSettings: stored.aiSettings,
    });
    const now = new Date().toISOString();
    const job = {
      id: crypto.randomUUID(),
      userEmail: normalizeEmail(req.session.email),
      status: "queued",
      suiteName: prepared.suiteMeta.suiteName,
      suiteFile: prepared.suiteMeta.relativePath || path.relative(prepared.skillRoot, prepared.suiteFile),
      runDir: prepared.runDir,
      request: req.body || {},
      activeCaseId: "",
      caseStates: chatwootCaseStatesFromPrepared(prepared),
      result: null,
      error: "",
      createdAt: now,
      startedAt: null,
      finishedAt: null,
      updatedAt: now,
    };
    await persistChatwootJob(job);
    void runChatwootJob(job, prepared).catch((error) => {
      console.error("Chatwoot UAT background job failed", error);
    });
    res.status(202).json({ job: publicChatwootJob(job) });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/chatwoot-uat/jobs/:id/cancel", async (req, res) => {
  try {
    const jobId = asText(req.params.id);
    const job = CHATWOOT_UAT_JOBS.get(jobId);
    if (!job || job.userEmail !== normalizeEmail(req.session.email)) {
      res.status(404).json({ error: "Không tìm thấy run Chatwoot UAT đang chạy." });
      return;
    }
    if (!["queued", "running"].includes(job.status)) {
      res.json({ job: publicChatwootJob(job) });
      return;
    }
    const now = new Date().toISOString();
    Object.assign(job, {
      cancelRequested: true,
      status: "interrupted",
      error: "Đã dừng run Chatwoot UAT theo yêu cầu.",
      finishedAt: now,
      updatedAt: now,
    });
    const child = CHATWOOT_UAT_JOB_PROCESSES.get(job.id);
    if (child && !child.killed) {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      }, 2500).unref();
    }
    await persistChatwootJob(job);
    res.json({ job: publicChatwootJob(job) });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/chatwoot-uat/jobs/:id/cases/:caseId/cancel", async (req, res) => {
  try {
    const jobId = asText(req.params.id);
    const caseId = asText(req.params.caseId);
    const job = CHATWOOT_UAT_JOBS.get(jobId);
    if (!job || job.userEmail !== normalizeEmail(req.session.email)) {
      res.status(404).json({ error: "Không tìm thấy run Chatwoot UAT đang chạy." });
      return;
    }
    if (!["queued", "running"].includes(job.status)) {
      res.json({ job: publicChatwootJob(job) });
      return;
    }
    const state = Array.isArray(job.caseStates) ? job.caseStates.find((item) => item.caseId === caseId) : null;
    if (!state) {
      res.status(404).json({ error: "Không tìm thấy test case trong run hiện tại." });
      return;
    }
    const now = new Date().toISOString();
    if (state.status === "pending") {
      Object.assign(state, {
        status: "skipped",
        finishedAt: now,
        error: "Đã bỏ test case khỏi hàng đợi chạy.",
      });
    } else if (state.status === "running" && job.activeCaseId === caseId) {
      job.cancelCurrentCaseId = caseId;
      Object.assign(state, {
        error: "Đang dừng test case theo yêu cầu.",
      });
      const child = CHATWOOT_UAT_JOB_PROCESSES.get(job.id);
      if (child && !child.killed) {
        child.kill("SIGTERM");
        setTimeout(() => {
          if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        }, 2500).unref();
      }
    }
    job.updatedAt = now;
    await persistChatwootJob(job);
    res.json({ job: publicChatwootJob(job) });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/chatwoot-uat/run", async (req, res) => {
  try {
    const stored = await requestUserSettings(req);
    const prepared = await prepareChatwootUatRun(req.body || {}, {
      plannerAiSettings: stored.aiSettings,
    });
    const result = await executeChatwootUatRun(prepared);
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/qa-workspace", async (req, res) => {
  try {
    const items = await ensureStandardQaWorkspaceItems(req.session.email);
    res.json({ items });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/qa-workspace", async (req, res) => {
  try {
    const stored = await requestUserSettings(req);
    const item = await enrichQaWorkspaceStopPatterns(req.body?.item || req.body || {}, stored.aiSettings, {
      refreshGeneric: req.body?.refreshStopPatterns !== false,
      force: req.body?.forceStopPatterns === true,
    });
    if (!item.testCases.length && !item.outline.branches.length) {
      throw Object.assign(new Error("Cần test case hoặc test design để lưu vào QA Workspace."), { status: 400 });
    }
    const saved = await upsertQaWorkspaceItem(req.session.email, item);
    res.json(saved);
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/qa-workspace/:id/stop-patterns", async (req, res) => {
  try {
    const stored = await requestUserSettings(req);
    const id = asText(req.params.id);
    const items = normalizeQaWorkspaceItems(stored.qaWorkspaceItems);
    const item = items.find((entry) => entry.id === id);
    if (!item) {
      throw Object.assign(new Error("Không tìm thấy card QA Workspace cần cập nhật điều kiện dừng."), { status: 404 });
    }
    const refreshed = await enrichQaWorkspaceStopPatterns(item, stored.aiSettings, {
      refreshGeneric: true,
      force: req.body?.force === true,
    });
    const saved = await upsertQaWorkspaceItem(req.session.email, refreshed);
    res.json(saved);
  } catch (error) {
    sendError(res, error);
  }
});

app.delete("/api/qa-workspace/:id", async (req, res) => {
  try {
    const stored = await requestUserSettings(req);
    const id = asText(req.params.id);
    const items = normalizeQaWorkspaceItems(stored.qaWorkspaceItems).filter((item) => item.id !== id);
    res.json({ items: await saveQaWorkspaceItems(req.session.email, items) });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/chatwoot-uat/suites/manual", async (req, res) => {
  try {
    const skillRoot = resolveChatwootUatSkillRoot();
    if (!fsSync.existsSync(path.join(skillRoot, "SKILL.md"))) {
      throw Object.assign(new Error("Chưa tìm thấy skill chatwoot-test-uat để tạo suite."), { status: 400 });
    }
    const stored = await requestUserSettings(req);
    const aiSettings = normalizeAiSettings(stored.aiSettings);
    const scenario = asText(req.body?.scenario || req.body?.goal || req.body?.script);
    let aiPlan = null;
    let planningMode = "fallback";
    if (scenario && aiProviderReady(aiSettings)) {
      try {
        aiPlan = await generateManualChatwootAiPlan({ scenario, aiSettings });
        if (Array.isArray(aiPlan?.cases) && aiPlan.cases.length) {
          planningMode = "ai";
        }
      } catch (error) {
        console.warn("Manual Chatwoot AI planning failed; using fallback parser:", error?.message || error);
      }
    }
    const suitePayload = buildManualChatwootSuite(req.body || {}, aiPlan);
    const written = await writeChatwootGeneratedSuite(skillRoot, suitePayload, suitePayload.suite_name);
    res.json({
      suite: written.suite,
      outputFile: written.outputFile,
      suites: await listChatwootUatSuites(skillRoot),
      planningMode,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/chatwoot-uat/suites/workspace", async (req, res) => {
  try {
    const skillRoot = resolveChatwootUatSkillRoot();
    if (!fsSync.existsSync(path.join(skillRoot, "SKILL.md"))) {
      throw Object.assign(new Error("Chưa tìm thấy skill chatwoot-test-uat để tạo suite."), { status: 400 });
    }
    const storedItems = await ensureStandardQaWorkspaceItems(req.session.email);
    const workspaceItemId = asText(req.body?.workspaceItemId || req.body?.id);
    const item = storedItems.find((entry) => entry.id === workspaceItemId || entry.sourceKey === workspaceItemId);
    if (!item) {
      throw Object.assign(new Error("Không tìm thấy item QA Workspace để tạo Chatwoot UAT suite."), { status: 404 });
    }
    const suitePayload = buildChatwootSuiteFromWorkspaceItem(item, req.body || {});
    const written = await writeChatwootGeneratedSuite(skillRoot, suitePayload, suitePayload.suite_name);
    const updatedItem = {
      ...item,
      chatwootSuiteFile: written.suite.relativePath,
      chatwootSuiteName: written.suite.suiteName,
      updatedAt: new Date().toISOString(),
    };
    const saved = await upsertQaWorkspaceItem(req.session.email, updatedItem);
    res.json({
      suite: written.suite,
      outputFile: written.outputFile,
      workspaceItem: saved.item,
      workspaceItems: saved.items,
      suites: await listChatwootUatSuites(skillRoot),
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/chatwoot-uat/suites/jira-test-data", async (req, res) => {
  try {
    const skillRoot = resolveChatwootUatSkillRoot();
    const script = path.join(skillRoot, "scripts", "build_suite_from_jira_cases.py");
    if (!fsSync.existsSync(script)) {
      throw Object.assign(new Error("Chưa tìm thấy script build_suite_from_jira_cases.py trong skill chatwoot-test-uat."), { status: 400 });
    }
    const testRunKey = asText(req.body?.testRunKey || req.body?.test_run_key).toUpperCase();
    const testcaseKeys = asText(req.body?.testcaseKeys || req.body?.testcase_keys)
      .split(/[,\s]+/)
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    if (!testRunKey && !testcaseKeys.length) {
      throw Object.assign(new Error("Cần nhập Test run key hoặc danh sách testcase key để tạo suite từ Jira Test Data."), { status: 400 });
    }
    const stored = await requestUserSettings(req);
    const project = normalizeProject(req.body?.project || stored.project);
    const credentials = mergeCredentialsWithStored(req.body?.credentials, stored.credentials);
    const sourceKey = testRunKey || testcaseKeys.join("-");
    const suiteName = chatwootSuiteSlug(req.body?.suiteName || `jira-${sourceKey}-chatwoot-uat`);
    const outputDir = path.join(skillRoot, EASYFORQC_CHATWOOT_GENERATED_RELATIVE, `${new Date().toISOString().slice(0, 10)}-${suiteName}`);
    await fs.mkdir(outputDir, { recursive: true });
    const outputFile = path.join(outputDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${suiteName}.yml`);
    const args = [script];
    if (testRunKey) {
      args.push("--test-run-key", testRunKey);
    } else {
      for (const key of testcaseKeys) args.push("--testcase-key", key);
    }
    args.push("--mode", req.body?.jiraMode === "fixed" ? "fixed" : "adaptive");
    args.push("--suite-name", suiteName);
    args.push("--output-file", outputFile);
    const inboxId = asOptionalNumber(req.body?.inboxId || DEFAULT_CHATWOOT_UAT_INBOX_ID);
    const uiInboxId = asOptionalNumber(req.body?.uiInboxId || DEFAULT_CHATWOOT_UAT_UI_INBOX_ID);
    const captainAssistantId = asOptionalNumber(req.body?.captainAssistantId || DEFAULT_CHATWOOT_UAT_CAPTAIN_ASSISTANT_ID);
    if (inboxId !== null) args.push("--inbox-id", String(inboxId));
    if (uiInboxId !== null) args.push("--ui-inbox-id", String(uiInboxId));
    if (captainAssistantId !== null) args.push("--captain-assistant-id", String(captainAssistantId));
    for (const label of csvList(req.body?.labels || "ai")) args.push("--label", label);
    args.push("--assignee-name", asText(req.body?.assigneeName) || "Bot");
    if (project.jiraBaseUrl) args.push("--jira-base-url", project.jiraBaseUrl);
    const result = await runPythonJsonCommand(args, {
      cwd: skillRoot,
      env: credentialEnv(project, credentials),
      secrets: secretValuesFromAuth(credentials),
      timeoutMs: 420000,
    });
    const generatedFile = path.resolve(asText(result.output_file || outputFile));
    const suitePayload = await readYamlAsJson(generatedFile);
    suitePayload.defaults = {
      ...(suitePayload.defaults || {}),
      ...chatwootSuiteDefaults(req.body || {}),
    };
    suitePayload.source = {
      ...(suitePayload.source && typeof suitePayload.source === "object" ? suitePayload.source : {}),
      created_by: "easyforqc",
      easyforqc_generated: true,
    };
    suitePayload.generated_at = suitePayload.generated_at || new Date().toISOString();
    await fs.writeFile(generatedFile, JSON.stringify(suitePayload, null, 2) + "\n", "utf8");
    const suite = await readChatwootSuiteMeta(generatedFile, skillRoot);
    const workspaceItem = chatwootSuiteToWorkspaceItem(suitePayload, {
      id: `workspace-${chatwootSuiteSlug(sourceKey)}`,
      issueKey: asText(req.body?.issueKey || sourceKey).split(/[-,]/)[0] || "AI",
      sourceKey,
      title: `[${sourceKey}] Chatwoot UAT từ Jira Test Data`,
      suiteFile: suite.relativePath,
    });
    const saved = await upsertQaWorkspaceItem(req.session.email, workspaceItem);
    res.json({
      result,
      suite,
      outputFile: generatedFile,
      workspaceItem: saved.item,
      workspaceItems: saved.items,
      suites: await listChatwootUatSuites(skillRoot),
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/parse-jira", (req, res) => {
  res.json(parseIssueReference(req.body?.jiraUrl || req.body?.value || ""));
});

app.post("/api/confluence-docs", async (req, res) => {
  try {
    const stored = await requestUserSettings(req);
    const confluenceCredentials = mergeConfluenceCredentialsWithStored(
      req.body?.confluenceCredentials,
      stored.confluenceCredentials,
    );
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
    const stored = await requestUserSettings(req);
    const credentials = mergeCredentialsWithStored(req.body?.credentials, stored.credentials);
    const runDir = await makeRunDir(issue.key);
    const configPath = await writeConfig(runDir, project, { attachAll: false });
    const result = await runPython(
      XMIND_WRAPPER,
      ["--config-file", configPath, "issue", "--issue-key", issue.key],
      { env: credentialEnv(project, credentials), secrets: secretValuesFromAuth(credentials) },
    );
    const issueSummary = normalizeIssue(result.json, req.body?.jiraUrl);
    const remoteDocs = await fetchJiraDocumentLinks(project, credentials, issueSummary.key || issue.key);
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
      ...commandOutputForClient(result),
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
    const docContext = asText(req.body?.docContext);
    const referenceDocs = null;
    const sourceContext = {
      qaNotes: asText(req.body?.notes),
      docContext,
      repoContext: normalizeRepoContext(req.body?.repoContext),
    };
    const stored = await requestUserSettings(req);
    const aiSettings = mergeAiSettingsWithStored(req.body?.aiSettings, stored.aiSettings);
    const aiCustomization = aiCustomizationFromSettings(aiSettings);
    const qaPlan = await buildQaPlan({
      issue,
      archetypeKey,
      sourceInput: sourceContext,
      aiCustomization,
      project,
    });
    let testCases = polishDraftCases(buildCases(issue, archetypeKey, sourceContext, aiCustomization, qaPlan), issue, qaPlan, project);
    let outline = attachQaPlanToOutline(buildOutline(issue, archetypeKey, testCases, sourceContext, aiCustomization, qaPlan), qaPlan);
    let aiGenerationUsed = false;
    let aiGenerationError = "";
    let aiUsage = null;
    if (aiSettings.enabled && !aiProviderReady(aiSettings)) {
      throw Object.assign(new Error("AI Settings đang bật nhưng thiếu API key hoặc model. Hãy nhập đủ API key/model hoặc tắt AI Settings để dùng fallback local."), {
        status: 400,
      });
    } else if (!aiSettings.enabled && aiProviderConfigured(aiSettings)) {
      aiGenerationError = "AI Settings có API key/model nhưng checkbox đang tắt, nên request này dùng fallback local.";
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
          qaPlan,
        });
        testCases = polishDraftCases(aiDraft.testCases, issue, qaPlan, project);
        outline = attachQaPlanToOutline(aiDraft.outline, qaPlan);
        aiGenerationUsed = true;
        aiUsage = aiDraft.usage;
      } catch (error) {
        throw Object.assign(
          new Error(aiProviderDraftErrorMessage(error)),
          {
            status: error.status || 502,
            details: error.details || null,
          },
        );
      }
    }
    res.json({
      archetypeKey,
      archetype: ARCHETYPES[archetypeKey],
      aiCustomizationApplied: Boolean(aiCustomization),
      aiGenerationUsed,
      aiGenerationError,
      aiUsage,
      aiProvider: aiProviderResponseMeta(aiSettings, aiGenerationUsed, aiGenerationError, aiUsage),
      qaPlan,
      qaQuality: draftQualityReport(testCases, outline, qaPlan),
      sourceContext: outline.source_context,
      referenceDocsFetched: referenceDocs,
      testCases,
      outline,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/improve-draft", async (req, res) => {
  try {
    const parsed = parseIssueReference(req.body?.jiraUrl || "");
    const project = normalizeProject(req.body?.project, { jiraBaseUrl: parsed.baseUrl });
    const issue = normalizeIssue(req.body?.issue, req.body?.jiraUrl);
    if (!issue.key) issue.key = parsed.issueKey;
    if (!issue.summary && !issue.description) {
      throw Object.assign(new Error("Cần summary hoặc description của Jira task để refine draft."), { status: 400 });
    }
    const improveInstruction = asText(req.body?.improveInstruction || req.body?.instruction || req.body?.feedback);
    if (!improveInstruction.trim()) {
      throw Object.assign(new Error("Cần nhập nội dung muốn AI tinh chỉnh cho draft."), { status: 400 });
    }
    const currentCases = normalizeCasesForFile(req.body?.testCases);
    const currentOutline = req.body?.outline;
    if (!currentOutline || !Array.isArray(currentOutline.branches)) {
      throw Object.assign(new Error("Cần test design outline hiện tại để refine draft."), { status: 400 });
    }
    const archetypeKey = chooseArchetype(issue, req.body?.archetype || currentOutline.template);
    const sourceContext = {
      qaNotes: asText(req.body?.notes),
      docContext: asText(req.body?.docContext),
      repoContext: normalizeRepoContext(req.body?.repoContext),
    };
    const stored = await requestUserSettings(req);
    const aiSettings = mergeAiSettingsWithStored(req.body?.aiSettings, stored.aiSettings);
    if (!aiSettings.enabled) {
      throw Object.assign(new Error("Tinh chỉnh draft cần bật AI Settings. Hãy bật AI Settings và lưu API key/model trước khi chạy Improve draft."), {
        status: 400,
      });
    }
    if (!aiProviderReady(aiSettings)) {
      throw Object.assign(new Error("AI Settings đang bật nhưng thiếu API key hoặc model. Hãy nhập đủ API key/model trước khi Improve draft."), {
        status: 400,
      });
    }
    const aiCustomization = aiCustomizationFromSettings(aiSettings);
    const qaPlan =
      req.body?.qaPlan && typeof req.body.qaPlan === "object"
        ? req.body.qaPlan
        : await buildQaPlan({
            issue,
            archetypeKey,
            sourceInput: sourceContext,
            aiCustomization,
            project,
          });
    const aiDraft = await generateAiImprovedDraft({
      issue,
      archetypeKey,
      sourceInput: sourceContext,
      aiSettings,
      aiCustomization,
      currentCases,
      currentOutline,
      improveInstruction,
      project,
      qaPlan,
    }).catch((error) => {
      throw Object.assign(
        new Error(aiProviderDraftErrorMessage(error)),
        {
          status: error.status || 502,
          details: error.details || null,
        },
      );
    });
    const testCases = polishDraftCases(aiDraft.testCases, issue, qaPlan, project);
    const outline = attachQaPlanToOutline(aiDraft.outline, qaPlan);
    res.json({
      archetypeKey,
      archetype: ARCHETYPES[archetypeKey],
      aiCustomizationApplied: Boolean(aiCustomization),
      aiGenerationUsed: true,
      aiGenerationError: "",
      aiUsage: aiDraft.usage,
      aiProvider: aiProviderResponseMeta(aiSettings, true, "", aiDraft.usage),
      qaPlan,
      qaQuality: draftQualityReport(testCases, outline, qaPlan),
      sourceContext: outline.source_context,
      improveInstruction,
      testCases,
      outline,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/improve-prompt", async (req, res) => {
  try {
    const instruction = asText(req.body?.instruction || req.body?.improveInstruction || req.body?.feedback);
    if (!instruction.trim()) {
      throw Object.assign(new Error("Cần nhập yêu cầu tinh chỉnh để AI cải thiện thành prompt dùng lại."), { status: 400 });
    }
    const stored = await requestUserSettings(req);
    const aiSettings = mergeAiSettingsWithStored(req.body?.aiSettings, stored.aiSettings);
    if (!aiSettings.enabled) {
      throw Object.assign(new Error("Improve prompt bằng AI cần bật AI Settings trước."), { status: 400 });
    }
    if (!aiProviderReady(aiSettings)) {
      throw Object.assign(new Error("AI Settings đang thiếu API key hoặc model nên chưa thể Improve prompt."), { status: 400 });
    }
    const issue = normalizeIssue(req.body?.issue, req.body?.jiraUrl);
    const aiCustomization = aiCustomizationFromSettings(aiSettings);
    const improved = await generateAiImprovedPrompt({
      instruction,
      issue,
      aiSettings,
      aiCustomization,
      currentCases: Array.isArray(req.body?.testCases) ? req.body.testCases : [],
      currentOutline: req.body?.outline && typeof req.body.outline === "object" ? req.body.outline : null,
      language: req.body?.language === "en" ? "en" : "vi",
    }).catch((error) => {
      throw Object.assign(new Error(aiProviderDraftErrorMessage(error)), {
        status: error.status || 502,
        details: error.details || null,
      });
    });
    res.json({
      improvedPrompt: improved.improvedPrompt,
      targetField: improved.targetField,
      updates: improved.updates,
      summary: improved.summary,
      aiProvider: aiProviderResponseMeta(aiSettings, true, "", improved.usage),
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/test-connection", async (req, res) => {
  try {
    const target = asText(req.body?.target || req.body?.type).trim();
    const stored = await requestUserSettings(req);
    if (target === "jira") {
      const parsed = parseIssueReference(req.body?.jiraUrl || "");
      const project = normalizeProject(req.body?.project, { jiraBaseUrl: parsed.baseUrl });
      const credentials = mergeCredentialsWithStored(req.body?.credentials, stored.credentials);
      const payload = await jiraJson(project, credentials, "/rest/api/2/myself");
      res.json({
        ok: true,
        message: `Jira OK: ${asText(payload.displayName || payload.name || payload.emailAddress || credentials.user || project.jiraBaseUrl)}`,
      });
      return;
    }
    if (target === "confluence") {
      const confluenceCredentials = mergeConfluenceCredentialsWithStored(
        req.body?.confluenceCredentials,
        stored.confluenceCredentials,
      );
      const rawBaseUrl = asText(confluenceCredentials.baseUrl || req.body?.baseUrl);
      if (!rawBaseUrl) {
        throw Object.assign(new Error("Thiếu Confluence Base URL để test connection."), { status: 400 });
      }
      let parsedBaseUrl;
      try {
        parsedBaseUrl = new URL(rawBaseUrl);
      } catch {
        throw Object.assign(new Error("Confluence Base URL không hợp lệ."), { status: 400 });
      }
      const baseUrl = confluenceBaseUrlFrom(parsedBaseUrl, confluenceCredentials);
      if (!/^https?:\/\//i.test(baseUrl)) {
        throw Object.assign(new Error("Thiếu Confluence Base URL để test connection."), { status: 400 });
      }
      const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/rest/api/space?limit=1`, {
        headers: confluenceAuthHeaders(confluenceCredentials),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw Object.assign(new Error(payload.message || payload.errorMessage || `Confluence HTTP ${response.status}`), { status: response.status });
      }
      res.json({ ok: true, message: `Confluence OK: ${baseUrl}` });
      return;
    }
    if (target === "ai" || target === "knowledgeAi") {
      const normalizedSettings = target === "knowledgeAi"
        ? (() => {
            const storedKnowledge = normalizeAiSettings(stored.aiSettings).knowledge;
            const incomingKnowledge = normalizeKnowledgeAiSettings(req.body?.aiSettings || req.body?.knowledgeAiSettings);
            return {
              ...incomingKnowledge,
              apiKey: incomingKnowledge.apiKey || storedKnowledge.apiKey,
            };
          })()
        : mergeAiSettingsWithStored(req.body?.aiSettings, stored.aiSettings);
      if (!normalizedSettings.enabled) {
        throw Object.assign(new Error("AI Settings đang tắt."), { status: 400 });
      }
      if (!aiProviderReady(normalizedSettings)) {
        throw Object.assign(new Error("AI Settings đang thiếu API key hoặc model."), { status: 400 });
      }
      const result = await callOpenAiCompatible(normalizedSettings, [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: JSON.stringify({ ok: true, task: "connection_test" }) },
      ]);
      res.json({
        ok: true,
        message: `AI OK: ${normalizedSettings.model}`,
        aiProvider: aiProviderResponseMeta(normalizedSettings, true, "", result.usage),
      });
      return;
    }
    throw Object.assign(new Error("Target test connection không hợp lệ."), { status: 400 });
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
    const project = normalizeProject(req.body?.project);
    const stem = safeFileStem(issue.key);
    const jiraDir = resolveConfiguredPath(project.jsonOutputDir, DEFAULTS.jsonOutputDir);
    const designDir = resolveConfiguredPath(project.outputDir, DEFAULTS.outputDir);
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
      files: {
        cases: fileDownloadMeta(casesPath),
        design: fileDownloadMeta(designPath),
      },
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
    const stored = await requestUserSettings(req);
    const credentials = mergeCredentialsWithStored(req.body?.credentials, stored.credentials);
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
      env: credentialEnv(project, credentials),
      secrets: secretValuesFromAuth(credentials),
      timeoutMs: 360000,
    });
    const outputPaths = result.json?.paths || {};
    res.json({
      result: result.json,
      runDir,
      configPath,
      outlinePath,
      files: {
        xmind: outputPaths.xmind ? fileDownloadMeta(outputPaths.xmind) : null,
        png: outputPaths.png ? fileDownloadMeta(outputPaths.png) : null,
      },
      ...commandOutputForClient(result),
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/create-suite", async (req, res) => {
  try {
    const project = normalizeProject(req.body?.project);
    const stored = await requestUserSettings(req);
    const credentials = mergeCredentialsWithStored(req.body?.credentials, stored.credentials);
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
      env: credentialEnv(project, credentials),
      secrets: secretValuesFromAuth(credentials),
      timeoutMs: 420000,
    });
    res.json({
      result: result.json,
      createdCaseKeys: caseKeysFromResult(result.json),
      runDir,
      configPath,
      casesPath,
      ...commandOutputForClient(result),
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/create-cycle", async (req, res) => {
  try {
    const project = normalizeProject(req.body?.project);
    const stored = await requestUserSettings(req);
    const credentials = mergeCredentialsWithStored(req.body?.credentials, stored.credentials);
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
      env: credentialEnv(project, credentials),
      secrets: secretValuesFromAuth(credentials),
      timeoutMs: 420000,
    });
    res.json({
      result: result.json,
      runDir,
      configPath,
      ...commandOutputForClient(result),
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

await purgeGeneratedOutputsOnce();
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
