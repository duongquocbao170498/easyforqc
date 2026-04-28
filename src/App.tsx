import AlertCircle from "lucide-react/dist/esm/icons/alert-circle.js";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.js";
import ClipboardList from "lucide-react/dist/esm/icons/clipboard-list.js";
import FileText from "lucide-react/dist/esm/icons/file-text.js";
import GitBranch from "lucide-react/dist/esm/icons/git-branch.js";
import KeyRound from "lucide-react/dist/esm/icons/key-round.js";
import Link from "lucide-react/dist/esm/icons/link.js";
import LockKeyhole from "lucide-react/dist/esm/icons/lock-keyhole.js";
import LogOut from "lucide-react/dist/esm/icons/log-out.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-2.js";
import Mail from "lucide-react/dist/esm/icons/mail.js";
import Map from "lucide-react/dist/esm/icons/map.js";
import Play from "lucide-react/dist/esm/icons/play.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import Save from "lucide-react/dist/esm/icons/save.js";
import Settings from "lucide-react/dist/esm/icons/settings.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import UploadCloud from "lucide-react/dist/esm/icons/upload-cloud.js";
import User from "lucide-react/dist/esm/icons/user.js";
import Wand2 from "lucide-react/dist/esm/icons/wand-2.js";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AiSettings,
  ArchetypeInfo,
  ConfluenceCredentials,
  Credentials,
  DefaultsResponse,
  IssueSummary,
  OutlineBranch,
  ProjectConfig,
  QaPlan,
  StructuredStep,
  TestCase,
  TestDesignOutline,
} from "./types";

type TabKey = "cases" | "design" | "run";
type BusyKey = "issue" | "docs" | "draft" | "save" | "xmind" | "attach" | "suite" | "cycle" | "";
type SettingsSection = "project" | "credentials" | "confluence" | "ai";

type AiProviderInfo = {
  enabled?: boolean;
  configured?: boolean;
  used?: boolean;
  provider?: string;
  model?: string;
  endpoint?: string;
  api_mode?: string;
  error?: string;
  usage?: unknown;
};

type GenerationStatus = {
  state: "idle" | "running" | "ai" | "fallback" | "error";
  title: string;
  detail: string;
  provider?: string;
  model?: string;
  endpoint?: string;
  apiMode?: string;
};

type ValidationErrors = Record<string, string>;

type DraftResponse = {
  archetypeKey: string;
  qaPlan?: QaPlan;
  testCases: TestCase[];
  outline: TestDesignOutline;
  aiGenerationUsed?: boolean;
  aiGenerationError?: string;
  aiProvider?: AiProviderInfo;
};
type ConfluenceDocument = { title: string; url: string; text: string; error?: string };

const emptyProject: ProjectConfig = {
  sourceRoot: "",
  jiraBaseUrl: "",
  projectKey: "AI",
  folderRoot: "/Bao QC",
  runRoot: "/AI Chatbot",
  outputDir: "",
  labelMode: "custom",
  testcaseLabels: "QA_Testcases",
  testdesignLabels: "QA_testdesign",
  testcaseStatusLabels: "TODO=TestCase1\nIN PROGRESS=TestCase1\nREADY TO TEST=TestCase2\nTESTING=TestCase3\nDONE=TestCase3",
  testdesignStatusLabels: "TODO=TestDesign1\nIN PROGRESS=TestDesign1\nREADY TO TEST=TestDesign2\nTESTING=TestDesign3\nDONE=TestDesign3",
};

const emptyCredentials: Credentials = {
  user: "",
  password: "",
  token: "",
};

const emptyConfluenceCredentials: ConfluenceCredentials = {
  baseUrl: "",
  user: "",
  password: "",
  token: "",
};

const emptyAiSettings: AiSettings = {
  enabled: false,
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
  model: "",
  apiKey: "",
  writingStyle: "",
  testCaseGuidelines: "",
  testDesignGuidelines: "",
  improvementNotes: "",
};

const idleGenerationStatus: GenerationStatus = {
  state: "idle",
  title: "",
  detail: "",
};

function projectFromDefaults(payload: DefaultsResponse): ProjectConfig {
  return {
    sourceRoot: payload.defaults.sourceRoot,
    jiraBaseUrl: payload.defaults.jiraBaseUrl,
    projectKey: payload.defaults.projectKey,
    folderRoot: payload.defaults.folderRoot,
    runRoot: payload.defaults.runRoot,
    outputDir: payload.defaults.outputDir,
    labelMode: payload.defaults.labelPolicy.mode,
    testcaseLabels: payload.defaults.labelPolicy.testcaseLabels,
    testdesignLabels: payload.defaults.labelPolicy.testdesignLabels,
    testcaseStatusLabels: payload.defaults.labelPolicy.testcaseStatusLabels,
    testdesignStatusLabels: payload.defaults.labelPolicy.testdesignStatusLabels,
  };
}

const emptyIssue: IssueSummary = {
  key: "",
  summary: "",
  description: "",
  status: "",
  issue_type: "",
};

function issueKeyFromText(value: string): string {
  return value.match(/\b[A-Z][A-Z0-9]+-\d+\b/i)?.[0].toUpperCase() || "";
}

function parseIssueReferenceBaseUrl(value: string): string {
  const text = value.trim();
  if (!/^https?:\/\//i.test(text)) return "";
  try {
    const url = new URL(text);
    const browseIndex = url.pathname.indexOf("/browse/");
    if (browseIndex >= 0) {
      return `${url.origin}${url.pathname.slice(0, browseIndex)}`.replace(/\/+$/, "");
    }
    return url.origin;
  } catch {
    return "";
  }
}

const emptyOutline = (issue: IssueSummary): TestDesignOutline => ({
  issue_key: issue.key,
  title: issue.key ? `[${issue.key}] ${issue.summary || "Test design"}` : issue.summary || "Test design",
  sheet_title: "Brace Map",
  template: "general",
  branches: [
    { title: "Luồng nghiệp vụ chính", items: ["Xác nhận behavior chính đúng với scope Jira"] },
    { title: "Regression và guardrails", items: ["Xác nhận luồng cũ liên quan không bị ảnh hưởng"] },
    { title: "Out of scope", items: ["Không kiểm thử thay đổi ngoài mô tả Jira task này"] },
  ],
});

const makeEmptyCase = (index: number, issueKey: string): TestCase => ({
  title: `[TC_${String(index).padStart(4, "0")}] Scenario mới`,
  objective: "Mục tiêu kiểm thử",
  priority: "Normal",
  technique: "Scenario flow",
  risk: "Rủi ro cần kiểm soát",
  requirement_ref: issueKey,
  coverage_tags: ["manual"],
  scenario_type: "general",
  precondition: "Môi trường test đã sẵn sàng.",
  test_data: '1. "Dữ liệu test"',
  expected_result: "- Kết quả đúng như mong đợi",
  structured_steps: [
    {
      description: "Thực hiện bước kiểm thử",
      test_data: "Dữ liệu test",
      expected_result: "- Kết quả đúng như mong đợi",
    },
  ],
});

function inferConfluenceBaseUrl(value: string) {
  const firstLink = value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .find((item) => /^https?:\/\//i.test(item));
  if (!firstLink) return "";
  try {
    const url = new URL(firstLink);
    if (url.pathname.startsWith("/wiki/")) return `${url.origin}/wiki`;
    for (const marker of ["/display/", "/spaces/", "/pages/", "/plugins/", "/secure/"]) {
      const index = url.pathname.indexOf(marker);
      if (index > 0) return `${url.origin}${url.pathname.slice(0, index)}`.replace(/\/+$/, "");
    }
    return url.origin;
  } catch {
    return "";
  }
}

function extractDocumentLinks(value: string) {
  const matches = value.match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
  return Array.from(
    new Set(
      matches
        .map((item) => item.replace(/[),.;\]]+$/g, ""))
        .filter((item) => /confluence|docs\.|\/display\/|\/wiki\/|\/pages\/|pageId=/i.test(item)),
    ),
  );
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || `HTTP ${response.status}`;
    const details = payload?.details ? `\n${JSON.stringify(payload.details, null, 2)}` : "";
    throw new Error(`${message}${details}`);
  }
  return payload;
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
  rows?: number;
  required?: boolean;
  error?: string;
}) {
  const errorId = props.error ? `field-error-${props.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : undefined;
  return (
    <label className={`field ${props.error ? "field-invalid" : ""}`}>
      <span>
        {props.label}
        {props.required ? <small className="required-mark"> *</small> : null}
      </span>
      {props.textarea ? (
        <textarea
          value={props.value}
          rows={props.rows || 4}
          placeholder={props.placeholder}
          onChange={(event) => props.onChange(event.target.value)}
          aria-invalid={Boolean(props.error)}
          aria-describedby={errorId}
          required={props.required}
        />
      ) : (
        <input
          value={props.value}
          type={props.type || "text"}
          placeholder={props.placeholder}
          onChange={(event) => props.onChange(event.target.value)}
          aria-invalid={Boolean(props.error)}
          aria-describedby={errorId}
          required={props.required}
        />
      )}
      {props.error ? (
        <small id={errorId} className="field-error">
          {props.error}
        </small>
      ) : null}
    </label>
  );
}

function StatusBadge({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span className={ok ? "status ok" : "status warn"}>
      {ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      {text}
    </span>
  );
}

function apiModeLabel(value?: string) {
  if (value === "responses") return "Responses API";
  if (value === "chat") return "Chat Completions";
  return "";
}

function generationStatusFromPayload(payload: {
  aiGenerationUsed?: boolean;
  aiGenerationError?: string;
  aiProvider?: AiProviderInfo;
  testCases?: TestCase[];
}): GenerationStatus {
  const provider = payload.aiProvider;
  const count = payload.testCases?.length || 0;
  if (payload.aiGenerationUsed) {
    return {
      state: "ai",
      title: `Đã dùng AI provider để tạo ${count} test case`,
      detail: [
        provider?.provider ? `Provider: ${provider.provider}` : "",
        provider?.model ? `Model: ${provider.model}` : "",
        provider?.api_mode ? `Mode: ${apiModeLabel(provider.api_mode)}` : "",
        provider?.endpoint ? `Endpoint: ${provider.endpoint}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      provider: provider?.provider,
      model: provider?.model,
      endpoint: provider?.endpoint,
      apiMode: provider?.api_mode,
    };
  }
  return {
    state: "fallback",
    title: `Đã dùng fallback local để tạo ${count} test case`,
    detail: payload.aiGenerationError || "AI Settings không được dùng trong lần generate này.",
    provider: provider?.provider,
    model: provider?.model,
    endpoint: provider?.endpoint,
    apiMode: provider?.api_mode,
  };
}

function GenerationBanner({ status }: { status: GenerationStatus }) {
  if (status.state === "idle") return null;
  const ok = status.state === "ai";
  const warn = status.state === "fallback" || status.state === "running";
  return (
    <div className={`generation-banner ${ok ? "ok" : warn ? "warn" : "error"}`}>
      <div className="generation-icon">
        {ok ? <CheckCircle2 size={18} /> : status.state === "running" ? <Loader2 className="spin" size={18} /> : <AlertCircle size={18} />}
      </div>
      <div>
        <strong>{status.title}</strong>
        {status.detail ? <span>{status.detail}</span> : null}
      </div>
    </div>
  );
}

function IconButton(props: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  title?: string;
}) {
  return (
    <button
      className={`button ${props.variant || "secondary"}`}
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
    >
      {props.icon}
      <span>{props.children}</span>
    </button>
  );
}

function LoginPage(props: {
  email: string;
  password: string;
  error: string;
  busy: boolean;
  googleEnabled: boolean;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: () => void;
  onGoogleLogin: () => void;
}) {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <div className="login-mark">
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="eyebrow">Public QA workspace</p>
            <h1>EasyForQC</h1>
          </div>
        </div>
        <p className="login-copy">
          Đăng nhập để tạo test case, test design và chạy automation lên Jira/Zephyr.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            props.onSubmit();
          }}
        >
          <Field label="Email" value={props.email} onChange={props.onEmail} placeholder="qa@gmail.com" />
          <Field label="Password" value={props.password} type="password" onChange={props.onPassword} placeholder="Password riêng của app" />
          {props.error ? <div className="notice">{props.error}</div> : null}
          <button className="button primary login-submit" type="submit" disabled={props.busy}>
            {props.busy ? <Loader2 className="spin" size={16} /> : <LockKeyhole size={16} />}
            <span>Login</span>
          </button>
          <div className="login-divider">hoặc</div>
          <button
            className="button google-submit"
            type="button"
            disabled={!props.googleEnabled}
            onClick={props.onGoogleLogin}
            title={props.googleEnabled ? "Login bằng Gmail" : "Google login chưa được cấu hình trong .env"}
          >
            <Mail size={16} />
            <span>Login with Google</span>
          </button>
        </form>
      </section>
      <aside className="login-aside">
        <div className="login-aside-inner">
          <h2>Designed for QC/QA review</h2>
          <p>Nhập Jira task, generate draft, chỉnh nội dung theo ý QA rồi mới build hoặc tạo dữ liệu thật.</p>
          <div className="login-checks">
            <span>Editable test cases</span>
            <span>XMind outline editor</span>
            <span>Jira/Zephyr automation</span>
          </div>
        </div>
      </aside>
    </main>
  );
}

function ChangePasswordDialog(props: {
  busy: boolean;
  error: string;
  success: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  onCurrentPassword: (value: string) => void;
  onNewPassword: (value: string) => void;
  onConfirmPassword: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
        <div className="section-heading">
          <div>
            <h2 id="change-password-title">Đổi mật khẩu</h2>
            <p>Mật khẩu mới sẽ được hash và lưu trong Postgres.</p>
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            props.onSubmit();
          }}
        >
          <Field label="Mật khẩu hiện tại" value={props.currentPassword} type="password" onChange={props.onCurrentPassword} />
          <Field label="Mật khẩu mới" value={props.newPassword} type="password" onChange={props.onNewPassword} />
          <Field label="Nhập lại mật khẩu mới" value={props.confirmPassword} type="password" onChange={props.onConfirmPassword} />
          {props.error ? <div className="notice">{props.error}</div> : null}
          {props.success ? <div className="notice ok">{props.success}</div> : null}
          <div className="modal-actions">
            <button className="button" type="button" onClick={props.onClose} disabled={props.busy}>
              Cancel
            </button>
            <button className="button primary" type="submit" disabled={props.busy}>
              {props.busy ? <Loader2 className="spin" size={16} /> : <KeyRound size={16} />}
              <span>Update password</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("qa@gmail.com");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [settingsBusy, setSettingsBusy] = useState<SettingsSection | "">("");
  const [settingsStatus, setSettingsStatus] = useState<Record<SettingsSection, string>>({
    project: "",
    credentials: "",
    confluence: "",
    ai: "",
  });
  const [defaults, setDefaults] = useState<DefaultsResponse | null>(null);
  const [project, setProject] = useState<ProjectConfig>(emptyProject);
  const [credentials, setCredentials] = useState<Credentials>(emptyCredentials);
  const [confluenceCredentials, setConfluenceCredentials] = useState<ConfluenceCredentials>(emptyConfluenceCredentials);
  const [aiSettings, setAiSettings] = useState<AiSettings>(emptyAiSettings);
  const [jiraUrl, setJiraUrl] = useState("");
  const [issue, setIssue] = useState<IssueSummary>(emptyIssue);
  const [confluenceBaseUrl, setConfluenceBaseUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [confluenceLinks, setConfluenceLinks] = useState("");
  const [docContext, setDocContext] = useState("");
  const [docIssueKey, setDocIssueKey] = useState("");
  const [docStatus, setDocStatus] = useState("");
  const [docSources, setDocSources] = useState<ConfluenceDocument[]>([]);
  const [archetypeKey, setArchetypeKey] = useState("auto");
  const [qaPlan, setQaPlan] = useState<QaPlan | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [outline, setOutline] = useState<TestDesignOutline>(emptyOutline(emptyIssue));
  const [activeTab, setActiveTab] = useState<TabKey>("cases");
  const [busy, setBusy] = useState<BusyKey>("");
  const [message, setMessage] = useState("");
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(idleGenerationStatus);
  const [output, setOutput] = useState("");
  const [caseKeys, setCaseKeys] = useState("");
  const [savedFiles, setSavedFiles] = useState<{ casesFile: string; designFile: string } | null>(null);

  function applyDefaults(payload: DefaultsResponse) {
    setDefaults(payload);
    setProject(projectFromDefaults(payload));
  }

  async function loadDefaults() {
    const response = await fetch("/api/defaults");
    if (!response.ok) {
      throw new Error(`Không load được cấu hình mặc định: HTTP ${response.status}`);
    }
    const payload = (await response.json()) as DefaultsResponse;
    setDefaults(payload);
    let nextProject = projectFromDefaults(payload);
    let nextCredentials = emptyCredentials;
    let nextConfluenceCredentials = emptyConfluenceCredentials;
    let nextAiSettings = emptyAiSettings;
    const settingsResponse = await fetch("/api/user-settings");
    if (settingsResponse.ok) {
      const settings = (await settingsResponse.json()) as {
        project?: Partial<ProjectConfig> | null;
        credentials?: Partial<Credentials> | null;
        confluenceCredentials?: Partial<ConfluenceCredentials> | null;
        aiSettings?: Partial<AiSettings> | null;
      };
      if (settings.project) {
        nextProject = { ...nextProject, ...settings.project };
      }
      if (settings.credentials) {
        nextCredentials = { ...nextCredentials, ...settings.credentials };
      }
      if (settings.confluenceCredentials) {
        const { baseUrl: _taskBaseUrl, ...savedAuth } = settings.confluenceCredentials;
        nextConfluenceCredentials = { ...nextConfluenceCredentials, ...savedAuth, baseUrl: "" };
      }
      if (settings.aiSettings) {
        nextAiSettings = { ...nextAiSettings, ...settings.aiSettings };
      }
    }
    setProject(nextProject);
    setCredentials(nextCredentials);
    setConfluenceCredentials(nextConfluenceCredentials);
    setAiSettings(nextAiSettings);
  }

  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get("auth_error");
    if (authError) {
      setLoginError(authError);
      window.history.replaceState({}, "", window.location.pathname);
    }
    fetch("/api/auth/status")
      .then((response) => response.json())
      .then(async (payload: { authenticated: boolean; user: string | null; googleAuthEnabled?: boolean }) => {
        setAuthenticated(payload.authenticated);
        setAuthUser(payload.user);
        setGoogleAuthEnabled(Boolean(payload.googleAuthEnabled));
        if (payload.authenticated) {
          await loadDefaults();
        }
      })
      .catch((error) => setLoginError(error.message))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;

    function closeUserMenuOnOutsideClick(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    function closeUserMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeUserMenuOnOutsideClick);
    document.addEventListener("keydown", closeUserMenuOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeUserMenuOnOutsideClick);
      document.removeEventListener("keydown", closeUserMenuOnEscape);
    };
  }, [userMenuOpen]);

  const selectedArchetype = useMemo<ArchetypeInfo | null>(() => {
    if (!defaults || archetypeKey === "auto") return null;
    return defaults.archetypes[archetypeKey] || null;
  }, [defaults, archetypeKey]);

  const taskConfluenceCredentials = {
    ...confluenceCredentials,
    baseUrl: confluenceBaseUrl.trim(),
  };

  const requestBody = {
    jiraUrl,
    issue,
    project,
    credentials,
    confluenceCredentials: taskConfluenceCredentials,
    confluenceLinks,
    docContext: docIssueKey === issue.key ? docContext : "",
    aiSettings,
    notes,
    archetype: archetypeKey === "auto" ? undefined : archetypeKey,
  };

  function clearValidationErrors(keys: string[]) {
    setValidationErrors((current) => {
      if (!keys.some((key) => current[key])) return current;
      const next = { ...current };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  }

  function setValidationFailure(errors: ValidationErrors, messageText: string) {
    setValidationErrors(errors);
    setMessage(messageText);
  }

  function addJiraAuthValidationErrors(errors: ValidationErrors, reason: string) {
    const hasToken = Boolean(credentials.token.trim());
    const hasUserPassword = Boolean(credentials.user.trim() && credentials.password.trim());
    if (hasToken || hasUserPassword) return;

    const suffix = reason ? ` ${reason}` : "";
    if (!credentials.user.trim()) {
      errors["credentials.user"] = `Cần nhập Jira User nếu không dùng Token.${suffix}`;
    }
    if (!credentials.password.trim()) {
      errors["credentials.password"] = `Cần nhập Jira Password nếu không dùng Token.${suffix}`;
    }
    if (!credentials.token.trim()) {
      errors["credentials.token"] = `Cần nhập Jira Token hoặc đủ User + Password.${suffix}`;
    }
  }

  function addRequiredProjectErrors(errors: ValidationErrors) {
    if (!project.jiraBaseUrl.trim()) errors["project.jiraBaseUrl"] = "Jira base URL bắt buộc để map Jira API và link issue.";
    if (!project.projectKey.trim()) errors["project.projectKey"] = "Project key bắt buộc để map Jira project và tạo testcase/design.";
    if (!project.folderRoot.trim()) errors["project.folderRoot"] = "Test case folder root bắt buộc để biết nơi tạo testcase.";
    if (!project.runRoot.trim()) errors["project.runRoot"] = "Test cycle run root bắt buộc để biết nơi tạo test cycle.";
    if (!project.outputDir.trim()) errors["project.outputDir"] = "XMind output dir bắt buộc để lưu file .xmind/.png.";
    if (!project.sourceRoot.trim()) errors["project.sourceRoot"] = "Source root bắt buộc để đọc skill/template generate.";
    if (project.labelMode === "custom" && !project.testcaseLabels.trim()) {
      errors["project.testcaseLabels"] = "Label testcase bắt buộc khi mode là custom.";
    }
    if (project.labelMode === "custom" && !project.testdesignLabels.trim()) {
      errors["project.testdesignLabels"] = "Label test design bắt buộc khi mode là custom.";
    }
  }

  function validateJiraFetch() {
    const errors: ValidationErrors = {};
    const parsedBaseUrl = parseIssueReferenceBaseUrl(jiraUrl);
    if (!issueKeyFromText(jiraUrl) && !issue.key.trim()) {
      errors.jiraUrl = "Cần nhập Jira URL hoặc issue key để đọc Jira task.";
      errors["issue.key"] = "Hoặc nhập issue key tại đây, ví dụ AI-707.";
    }
    if (!project.jiraBaseUrl.trim() && !parsedBaseUrl) {
      errors["project.jiraBaseUrl"] = "Cần Jira base URL để gọi Jira API, ví dụ https://jira.vexere.net.";
    }
    addJiraAuthValidationErrors(errors, "Field này dùng để đọc Jira link/task.");
    return errors;
  }

  function validateConfluenceFetch() {
    const errors: ValidationErrors = {};
    if (!confluenceLinks.trim()) {
      errors.confluenceLinks = "Cần nhập ít nhất 1 link Confluence/doc trước khi Fetch docs.";
    }
    if (!confluenceBaseUrl.trim()) {
      errors.confluenceBaseUrl = "Cần Confluence Base URL cho task này trước khi Fetch docs.";
    }
    if (!confluenceCredentials.user.trim()) {
      errors["confluence.user"] = "Cần nhập Confluence User để fetch docs.";
    }
    if (!confluenceCredentials.password.trim()) {
      errors["confluence.password"] = "Cần nhập Confluence Password để fetch docs.";
    }
    if (!confluenceCredentials.token.trim()) {
      errors["confluence.token"] = "Cần nhập Confluence Token để fetch docs.";
    }
    return errors;
  }

  function validateGenerateDraft() {
    const errors: ValidationErrors = {};
    const effectiveIssueKey = issueKeyFromText(jiraUrl) || issue.key.trim();
    const hasIssueContext = Boolean(issue.summary.trim() || issue.description.trim());
    if (!effectiveIssueKey) {
      errors.jiraUrl = "Cần nhập Jira URL hoặc issue key trước khi Generate draft.";
      errors["issue.key"] = "Issue key bắt buộc nếu Jira URL không có key.";
    }
    if (!hasIssueContext) {
      errors["issue.summary"] = "Cần summary hoặc description để tạo draft. Có thể nhấn Fetch Jira task trước.";
      errors["issue.description"] = "Cần description/acceptance criteria hoặc summary để tạo draft.";
      addJiraAuthValidationErrors(errors, "Cần auth để Fetch Jira task trước khi Generate nếu chưa có context.");
    }
    addRequiredProjectErrors(errors);
    if (aiSettings.enabled) {
      if (!aiSettings.baseUrl.trim()) errors["ai.baseUrl"] = "Base URL bắt buộc khi bật AI Settings.";
      if (!aiSettings.model.trim()) errors["ai.model"] = "Model bắt buộc khi bật AI Settings.";
      if (!aiSettings.apiKey.trim()) errors["ai.apiKey"] = "API key bắt buộc khi bật AI Settings.";
    }
    return errors;
  }

  function setProjectValue(key: keyof ProjectConfig, value: string) {
    clearValidationErrors(key === "labelMode" ? ["project.testcaseLabels", "project.testdesignLabels"] : [`project.${key}`]);
    setProject((current) => ({ ...current, [key]: value }));
  }

  function setCredentialValue(key: keyof Credentials, value: string) {
    clearValidationErrors(["credentials.user", "credentials.password", "credentials.token"]);
    setCredentials((current) => ({ ...current, [key]: value }));
  }

  function setConfluenceCredentialValue(key: keyof ConfluenceCredentials, value: string) {
    clearValidationErrors([`confluence.${key}`]);
    setConfluenceCredentials((current) => ({ ...current, [key]: value }));
  }

  function setAiSettingValue<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    clearValidationErrors(key === "enabled" ? ["ai.baseUrl", "ai.model", "ai.apiKey"] : [`ai.${String(key)}`]);
    setAiSettings((current) => ({ ...current, [key]: value }));
  }

  function resetGeneratedDraft(nextIssueKey: string) {
    const nextIssue = { ...emptyIssue, key: nextIssueKey };
    setTestCases([]);
    setOutline(emptyOutline(nextIssue));
    setCaseKeys("");
    setOutput("");
    setSavedFiles(null);
    setQaPlan(null);
    setGenerationStatus(idleGenerationStatus);
    setActiveTab("cases");
  }

  function clearTaskSpecificContext() {
    setConfluenceBaseUrl("");
    setNotes("");
    setConfluenceLinks("");
    setDocContext("");
    setDocIssueKey("");
    setDocStatus("");
    setDocSources([]);
  }

  function clearFetchedDocs(nextStatus = "") {
    setDocContext("");
    setDocIssueKey("");
    setDocStatus(nextStatus);
    setDocSources([]);
  }

  function handleJiraUrlChange(value: string) {
    clearValidationErrors(["jiraUrl", "issue.key"]);
    setJiraUrl(value);
    const nextIssueKey = issueKeyFromText(value);
    if (nextIssueKey && nextIssueKey !== issue.key) {
      setIssue({ ...emptyIssue, key: nextIssueKey });
      resetGeneratedDraft(nextIssueKey);
      clearTaskSpecificContext();
      setMessage(`Đã chuyển sang ${nextIssueKey}. Nhấn Fetch để đọc Jira task mới.`);
    }
  }

  function setIssueValue(key: keyof IssueSummary, value: string) {
    clearValidationErrors(
      key === "summary" || key === "description"
        ? ["issue.summary", "issue.description"]
        : key === "key"
          ? ["issue.key", "jiraUrl"]
          : [`issue.${String(key)}`],
    );
    setIssue((current) => ({ ...current, [key]: value }));
    if (key === "key") {
      setOutline((current) => ({ ...current, issue_key: value }));
      if (value && value !== issue.key) {
        resetGeneratedDraft(value);
        clearTaskSpecificContext();
      }
    }
  }

  function setBusyRun(key: BusyKey, task: () => Promise<void>) {
    setBusy(key);
    setMessage("");
    task()
      .catch((error) => setMessage(error.message))
      .finally(() => setBusy(""));
  }

  async function login() {
    setLoginBusy(true);
    setLoginError("");
    try {
      const payload = await apiPost<{ authenticated: boolean; user: string; email?: string }>("/api/auth/login", {
        email: loginEmail,
        password: loginPassword,
      });
      setAuthenticated(payload.authenticated);
      setAuthUser(payload.email || payload.user);
      setLoginPassword("");
      await loadDefaults();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoginBusy(false);
    }
  }

  function googleLogin() {
    window.location.href = "/api/auth/google";
  }

  async function logout() {
    setUserMenuOpen(false);
    await apiPost("/api/auth/logout", {});
    setAuthenticated(false);
    setAuthUser(null);
    setDefaults(null);
    setOutput("");
    setMessage("");
  }

  async function changePassword() {
    setPasswordBusy(true);
    setPasswordError("");
    setPasswordSuccess("");
    try {
      if (newPassword !== confirmPassword) {
        throw new Error("Mật khẩu mới nhập lại chưa khớp.");
      }
      await apiPost("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Không đổi được mật khẩu.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function saveUserSettings(section: SettingsSection) {
    const savedConfluenceCredentials = { ...confluenceCredentials, baseUrl: "" };
    const body =
      section === "project"
        ? { project }
        : section === "credentials"
          ? { credentials }
          : section === "confluence"
            ? { confluenceCredentials: savedConfluenceCredentials }
            : { aiSettings };
    const label =
      section === "project"
        ? "Project config"
        : section === "credentials"
          ? "Jira auth"
          : section === "confluence"
            ? "Confluence auth"
            : "AI Settings";
    setSettingsBusy(section);
    setSettingsStatus((current) => ({ ...current, [section]: "" }));
    try {
      await apiPost("/api/user-settings", body);
      const text = `Đã lưu ${label} cho tài khoản này.`;
      setSettingsStatus((current) => ({ ...current, [section]: text }));
      setMessage(text);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không lưu được cấu hình.";
      setSettingsStatus((current) => ({ ...current, [section]: text }));
      setMessage(text);
    } finally {
      setSettingsBusy("");
    }
  }

  function parseJiraLink() {
    if (!jiraUrl.trim()) {
      setValidationFailure({ jiraUrl: "Cần nhập Jira URL hoặc issue key trước khi Parse." }, "Vui lòng bổ sung field bắt buộc đang được highlight.");
      return;
    }
    clearValidationErrors(["jiraUrl"]);
    setBusyRun("issue", async () => {
      const parsed = await apiPost<{ issueKey: string; baseUrl: string }>("/api/parse-jira", { jiraUrl });
      if (parsed.issueKey && parsed.issueKey !== issue.key) {
        resetGeneratedDraft(parsed.issueKey);
        clearTaskSpecificContext();
      }
      setIssue((current) => ({ ...current, key: parsed.issueKey || current.key }));
      if (parsed.baseUrl) {
        setProject((current) => ({ ...current, jiraBaseUrl: parsed.baseUrl }));
      }
      setMessage(parsed.issueKey ? `Đã đọc issue key ${parsed.issueKey}.` : "Chưa tìm thấy issue key trong link.");
    });
  }

  function fetchIssue() {
    const errors = validateJiraFetch();
    if (Object.keys(errors).length) {
      setValidationFailure(errors, "Vui lòng bổ sung Jira URL/base URL/auth trước khi Fetch Jira task.");
      return;
    }
    setValidationErrors({});
    setBusyRun("issue", async () => {
      const nextIssueKey = issueKeyFromText(jiraUrl) || issue.key;
      const payload = await apiPost<{ issue: IssueSummary; stdout: string }>("/api/issue", {
        jiraUrl,
        issueKey: nextIssueKey,
        project,
        credentials,
      });
      const fetchedIssueKey = payload.issue.key || nextIssueKey;
      const generatedIssueKey = outline.issue_key || testCases[0]?.requirement_ref || "";
      if (fetchedIssueKey && (testCases.length || generatedIssueKey)) {
        resetGeneratedDraft(fetchedIssueKey);
      }
      setIssue((current) => ({
        ...current,
        ...payload.issue,
        issue_type: payload.issue.issue_type || current.issue_type,
      }));
      setOutline((current) => ({ ...current, issue_key: payload.issue.key || current.issue_key }));
      const detectedDocLinks = Array.from(
        new Set([...(payload.issue.doc_links || []), ...extractDocumentLinks(`${payload.issue.description}\n${payload.issue.summary}`)]),
      );
      if (detectedDocLinks.length && !confluenceLinks.trim()) {
        const linksText = detectedDocLinks.join("\n");
        setConfluenceLinks(linksText);
        const inferredBaseUrl = confluenceBaseUrl.trim() || inferConfluenceBaseUrl(linksText);
        if (inferredBaseUrl) {
          setConfluenceBaseUrl(inferredBaseUrl);
        }
        clearFetchedDocs(`Tìm thấy ${detectedDocLinks.length} link doc từ Jira task/Issue links. Nhấn Fetch docs để đọc nội dung vào Task context.`);
      } else if (payload.issue.doc_link_error) {
        setDocStatus(`Không đọc được Jira issue links: ${payload.issue.doc_link_error}`);
      }
      setOutput(JSON.stringify(payload.issue, null, 2));
      setMessage(`Đã fetch Jira task ${payload.issue.key}.`);
    });
  }

  function fetchConfluenceDocs() {
    const errors = validateConfluenceFetch();
    if (Object.keys(errors).length) {
      setValidationFailure(errors, "Vui lòng bổ sung link, Base URL và đủ Confluence auth trước khi Fetch docs.");
      return;
    }
    setValidationErrors({});
    setBusyRun("docs", async () => {
      const currentIssueKey = issueKeyFromText(jiraUrl) || issue.key;
      const payload = await apiPost<{ documents: ConfluenceDocument[]; combinedText: string }>(
        "/api/confluence-docs",
        {
          links: confluenceLinks,
          confluenceCredentials: taskConfluenceCredentials,
        },
      );
      const loadedDocs = payload.documents.filter((item) => item.text);
      const failedDocs = payload.documents.filter((item) => item.error);
      setDocContext(payload.combinedText);
      setDocIssueKey(payload.combinedText ? currentIssueKey : "");
      setDocSources(payload.documents);
      setOutput(JSON.stringify(payload.documents, null, 2));
      const nextStatus = loadedDocs.length
        ? `Doc context đã gắn với ${currentIssueKey}: đọc được ${loadedDocs.length}/${payload.documents.length} doc, ${payload.combinedText.length.toLocaleString()} ký tự. Generate draft sẽ dùng doc này cho đúng task hiện tại.`
        : `Chưa đọc được nội dung doc cho ${currentIssueKey}. Kiểm tra lại Base URL, auth hoặc link Confluence.`;
      setDocStatus(nextStatus);
      setMessage(
        failedDocs.length
          ? `Đã đọc ${loadedDocs.length}/${payload.documents.length} Confluence doc. Có ${failedDocs.length} doc lỗi.`
          : `Đã đọc ${payload.documents.length} Confluence doc.`,
      );
    });
  }

  function generateDraft() {
    const errors = validateGenerateDraft();
    if (Object.keys(errors).length) {
      setValidationFailure(errors, "Vui lòng bổ sung các field bắt buộc đang được highlight trước khi Generate draft.");
      setGenerationStatus({
        state: "error",
        title: "Thiếu field bắt buộc",
        detail: "Bổ sung các field đang được highlight rồi Generate draft lại.",
      });
      return;
    }
    setValidationErrors({});
    setBusyRun("draft", async () => {
      const effectiveIssueKey = issueKeyFromText(jiraUrl) || issue.key;
      const effectiveIssue = { ...issue, key: effectiveIssueKey };
      const shouldUseConfluenceDocs = Boolean(docContext.trim() && (!docIssueKey || docIssueKey === effectiveIssueKey));
      setTestCases([]);
      setOutline(emptyOutline(effectiveIssue));
      setCaseKeys("");
      setSavedFiles(null);
      setOutput("");
      setQaPlan(null);
      setGenerationStatus({
        state: "running",
        title: aiSettings.enabled ? "Đang gọi AI provider" : "Đang generate bằng fallback local",
        detail: aiSettings.enabled
          ? [
              aiSettings.provider ? `Provider: ${aiSettings.provider}` : "",
              aiSettings.model ? `Model: ${aiSettings.model}` : "",
              aiSettings.baseUrl ? `Base URL: ${aiSettings.baseUrl}` : "",
            ]
              .filter(Boolean)
              .join(" · ")
          : "AI Settings đang tắt.",
      });
      setActiveTab("cases");
      let payload: DraftResponse;
      try {
        payload = await apiPost<DraftResponse>("/api/draft", {
          ...requestBody,
          issue: effectiveIssue,
          confluenceLinks: shouldUseConfluenceDocs ? confluenceLinks : "",
          docContext: shouldUseConfluenceDocs ? docContext : "",
        });
      } catch (error) {
        const text = error instanceof Error ? error.message : "Generate draft lỗi.";
        setGenerationStatus({
          state: "error",
          title: aiSettings.enabled ? "AI provider lỗi" : "Generate draft lỗi",
          detail: text.split("\n")[0],
          provider: aiSettings.provider,
          model: aiSettings.model,
          endpoint: aiSettings.baseUrl,
        });
        throw error;
      }
      setArchetypeKey(payload.archetypeKey);
      setQaPlan(payload.qaPlan || null);
      setTestCases(payload.testCases);
      setOutline(payload.outline);
      setActiveTab("cases");
      setOutput(JSON.stringify(payload, null, 2));
      setGenerationStatus(generationStatusFromPayload(payload));
      const generationMode = payload.aiGenerationUsed ? "bằng AI provider" : "bằng fallback local";
      setMessage(
        payload.aiGenerationError
          ? `Đã tạo ${payload.testCases.length} test case và test design draft ${generationMode}. ${payload.aiGenerationError}`
          : `Đã tạo ${payload.testCases.length} test case và test design draft ${generationMode}.`,
      );
    });
  }

  function saveDraftFiles() {
    setBusyRun("save", async () => {
      const payload = await apiPost<{ saved: boolean; casesFile: string; designFile: string; casesPath: string; designPath: string }>("/api/save-draft", {
        jiraUrl,
        issue,
        testCases,
        outline,
        archetypeKey,
      });
      setSavedFiles({ casesFile: payload.casesFile, designFile: payload.designFile });
      setOutput(JSON.stringify(payload, null, 2));
      setMessage(`Đã lưu JSON test case và test design vào source.`);
    });
  }

  function buildXmind(attachAll: boolean) {
    setBusyRun(attachAll ? "attach" : "xmind", async () => {
      const payload = await apiPost<{ result: unknown; stdout: string }>("/api/build-xmind", {
        outline,
        issueKey: issue.key,
        project,
        credentials,
        attachAll,
        replaceExisting: true,
      });
      setOutput(JSON.stringify(payload.result || payload, null, 2));
      setMessage(attachAll ? "Đã build và attach test design lên Jira." : "Đã build XMind/PNG local.");
    });
  }

  function createSuite() {
    setBusyRun("suite", async () => {
      const payload = await apiPost<{ result: unknown; createdCaseKeys: string[] }>("/api/create-suite", {
        issueKey: issue.key,
        testCases,
        project,
        credentials,
      });
      if (payload.createdCaseKeys?.length) {
        setCaseKeys(payload.createdCaseKeys.join(","));
      }
      setOutput(JSON.stringify(payload.result || payload, null, 2));
      setMessage(`Đã tạo test suite cho ${issue.key}.`);
    });
  }

  function createCycle() {
    setBusyRun("cycle", async () => {
      const payload = await apiPost<{ result: unknown }>("/api/create-cycle", {
        issueKey: issue.key,
        caseKeys,
        project,
        credentials,
      });
      setOutput(JSON.stringify(payload.result || payload, null, 2));
      setMessage(`Đã tạo test cycle cho ${issue.key}.`);
    });
  }

  function updateCase(index: number, patch: Partial<TestCase>) {
    setTestCases((current) => current.map((testCase, itemIndex) => (itemIndex === index ? { ...testCase, ...patch } : testCase)));
  }

  function updateStep(caseIndex: number, stepIndex: number, patch: Partial<StructuredStep>) {
    setTestCases((current) =>
      current.map((testCase, itemIndex) => {
        if (itemIndex !== caseIndex) return testCase;
        return {
          ...testCase,
          structured_steps: testCase.structured_steps.map((step, currentStepIndex) =>
            currentStepIndex === stepIndex ? { ...step, ...patch } : step,
          ),
        };
      }),
    );
  }

  function addCase() {
    setTestCases((current) => [...current, makeEmptyCase(current.length + 1, issue.key)]);
  }

  function removeCase(index: number) {
    setTestCases((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateBranch(index: number, patch: Partial<OutlineBranch>) {
    setOutline((current) => ({
      ...current,
      branches: current.branches.map((branch, itemIndex) => (itemIndex === index ? { ...branch, ...patch } : branch)),
    }));
  }

  function addBranch() {
    setOutline((current) => ({
      ...current,
      branches: [...current.branches, { title: "Nhánh mới", items: ["Nội dung kiểm thử"] }],
    }));
  }

  function removeBranch(index: number) {
    setOutline((current) => ({
      ...current,
      branches: current.branches.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  const isWorking = Boolean(busy);

  if (!authChecked) {
    return (
      <main className="login-shell">
        <section className="login-panel loading-panel">
          <Loader2 className="spin" size={24} />
          <h1>EasyForQC</h1>
          <p>Đang kiểm tra phiên đăng nhập...</p>
        </section>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <LoginPage
        email={loginEmail}
        password={loginPassword}
        error={loginError}
        busy={loginBusy}
        onEmail={setLoginEmail}
        onPassword={setLoginPassword}
        onSubmit={login}
        googleEnabled={googleAuthEnabled}
        onGoogleLogin={googleLogin}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <ClipboardList size={26} />
          <div>
            <h1>EasyForQC</h1>
            <p>Jira to test case and test design</p>
          </div>
        </div>

        <section className="panel compact">
          <div className="panel-title">
            <Link size={18} />
            <h2>Jira task</h2>
          </div>
          <Field
            label="Jira URL hoặc issue key"
            value={jiraUrl}
            onChange={handleJiraUrlChange}
            placeholder="https://jira.vexere.net/browse/AI-707"
            required
            error={validationErrors.jiraUrl}
          />
          <Field
            label="Confluence Base URL cho task này"
            value={confluenceBaseUrl}
            onChange={(value) => {
              clearValidationErrors(["confluenceBaseUrl"]);
              setConfluenceBaseUrl(value);
              clearFetchedDocs(value.trim() && confluenceLinks.trim() ? "Base URL đã đổi. Nhấn Fetch docs để đọc lại doc cho task hiện tại." : "");
            }}
            placeholder="Optional, ví dụ https://confluence.vexere.net"
            required={Boolean(confluenceLinks.trim())}
            error={validationErrors.confluenceBaseUrl}
          />
          <div className="mini-note">Bỏ trống nếu task này không cần đọc doc Confluence.</div>
          <div className="button-row">
            <IconButton icon={<RefreshCw size={16} />} onClick={parseJiraLink} disabled={isWorking} title="Đọc issue key từ link">
              Parse
            </IconButton>
            <IconButton icon={busy === "issue" ? <Loader2 className="spin" size={16} /> : <FileText size={16} />} onClick={fetchIssue} disabled={isWorking}>
              Fetch
            </IconButton>
          </div>
        </section>

        <section className="panel compact">
          <div className="panel-title">
            <Settings size={18} />
            <h2>Project config</h2>
          </div>
          <Field label="Jira base URL" value={project.jiraBaseUrl} onChange={(value) => setProjectValue("jiraBaseUrl", value)} required error={validationErrors["project.jiraBaseUrl"]} />
          <Field label="Project key" value={project.projectKey} onChange={(value) => setProjectValue("projectKey", value)} required error={validationErrors["project.projectKey"]} />
          <Field label="Test case folder root" value={project.folderRoot} onChange={(value) => setProjectValue("folderRoot", value)} required error={validationErrors["project.folderRoot"]} />
          <Field label="Test cycle run root" value={project.runRoot} onChange={(value) => setProjectValue("runRoot", value)} required error={validationErrors["project.runRoot"]} />
          <Field label="XMind output dir" value={project.outputDir} onChange={(value) => setProjectValue("outputDir", value)} required error={validationErrors["project.outputDir"]} />
          <Field label="Source root" value={project.sourceRoot} onChange={(value) => setProjectValue("sourceRoot", value)} required error={validationErrors["project.sourceRoot"]} />
          <div className="label-policy">
            <div className="subhead">
              <span>Label policy</span>
            </div>
            <label className="field">
              <span>Mode</span>
              <select value={project.labelMode} onChange={(event) => setProjectValue("labelMode", event.target.value)}>
                <option value="custom">custom - thay bằng label dưới đây</option>
                <option value="passthrough">passthrough - giữ label từ skill</option>
                <option value="none">none - không gắn label tự động</option>
              </select>
            </label>
            <Field
              label="Test case required labels"
              value={project.testcaseLabels}
              onChange={(value) => setProjectValue("testcaseLabels", value)}
              placeholder="QA_Testcases"
              required={project.labelMode === "custom"}
              error={validationErrors["project.testcaseLabels"]}
            />
            <Field
              label="Test design required labels"
              value={project.testdesignLabels}
              onChange={(value) => setProjectValue("testdesignLabels", value)}
              placeholder="QA_testdesign"
              required={project.labelMode === "custom"}
              error={validationErrors["project.testdesignLabels"]}
            />
            <Field
              label="Test case status labels"
              value={project.testcaseStatusLabels}
              onChange={(value) => setProjectValue("testcaseStatusLabels", value)}
              textarea
              rows={5}
            />
            <Field
              label="Test design status labels"
              value={project.testdesignStatusLabels}
              onChange={(value) => setProjectValue("testdesignStatusLabels", value)}
              textarea
              rows={5}
            />
          </div>
          <div className="button-row">
            <IconButton
              icon={settingsBusy === "project" ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
              onClick={() => saveUserSettings("project")}
              disabled={Boolean(settingsBusy)}
              variant="primary"
            >
              Lưu
            </IconButton>
          </div>
          {settingsStatus.project ? <div className="mini-note">{settingsStatus.project}</div> : null}
        </section>

        <section className="panel compact">
          <div className="panel-title">
            <UploadCloud size={18} />
            <h2>Jira auth</h2>
          </div>
          <Field label="User" value={credentials.user} onChange={(value) => setCredentialValue("user", value)} placeholder="name@example.com" error={validationErrors["credentials.user"]} />
          <Field label="Password" value={credentials.password} type="password" onChange={(value) => setCredentialValue("password", value)} error={validationErrors["credentials.password"]} />
          <Field label="Token" value={credentials.token} type="password" onChange={(value) => setCredentialValue("token", value)} error={validationErrors["credentials.token"]} />
          <div className="button-row">
            <IconButton
              icon={settingsBusy === "credentials" ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
              onClick={() => saveUserSettings("credentials")}
              disabled={Boolean(settingsBusy)}
              variant="primary"
            >
              Lưu
            </IconButton>
          </div>
          {settingsStatus.credentials ? <div className="mini-note">{settingsStatus.credentials}</div> : null}
          {defaults ? (
            <div className="status-stack">
              <StatusBadge ok={defaults.wrappers.jiraExists} text="Jira wrapper" />
              <StatusBadge ok={defaults.wrappers.xmindExists} text="XMind wrapper" />
              <StatusBadge ok={defaults.wrappers.sourceRootExists} text="Source root" />
            </div>
          ) : null}
        </section>

        <section className="panel compact">
          <div className="panel-title">
            <FileText size={18} />
            <h2>Confluence auth</h2>
          </div>
          <Field label="User" value={confluenceCredentials.user} onChange={(value) => setConfluenceCredentialValue("user", value)} placeholder="name@example.com" required error={validationErrors["confluence.user"]} />
          <Field label="Password" value={confluenceCredentials.password} type="password" onChange={(value) => setConfluenceCredentialValue("password", value)} required error={validationErrors["confluence.password"]} />
          <Field label="Token" value={confluenceCredentials.token} type="password" onChange={(value) => setConfluenceCredentialValue("token", value)} required error={validationErrors["confluence.token"]} />
          <div className="button-row">
            <IconButton
              icon={settingsBusy === "confluence" ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
              onClick={() => saveUserSettings("confluence")}
              disabled={Boolean(settingsBusy)}
              variant="primary"
            >
              Lưu
            </IconButton>
          </div>
          {settingsStatus.confluence ? <div className="mini-note">{settingsStatus.confluence}</div> : null}
          <div className="mini-note">
            Chỉ lưu thông tin đăng nhập. Base URL nhập riêng theo từng task ở mục Jira task.
          </div>
        </section>

        <section className="panel compact">
          <div className="panel-title">
            <Wand2 size={18} />
            <h2>AI Settings</h2>
          </div>
          <p className="panel-help">
            Khi bật và có API key/model, app gọi AI provider riêng của user với prompt mặc định của skill và guideline bên dưới. Khi tắt, app dùng generator mặc định trong app.
          </p>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={aiSettings.enabled}
              onChange={(event) => setAiSettingValue("enabled", event.target.checked)}
            />
            <span className="checkbox-copy">
              <strong>Áp dụng AI Settings khi generate</strong>
              <small>Bật: gọi AI provider bằng key riêng. Tắt: dùng fallback local không gọi AI.</small>
            </span>
          </label>
          <label className="field">
            <span>Provider</span>
            <select value={aiSettings.provider} onChange={(event) => setAiSettingValue("provider", event.target.value)}>
              <option value="openai">OpenAI</option>
              <option value="openai-compatible">OpenAI compatible</option>
              <option value="azure-openai">Azure OpenAI</option>
              <option value="custom">Custom endpoint</option>
            </select>
          </label>
          <Field
            label="Base URL"
            value={aiSettings.baseUrl}
            onChange={(value) => setAiSettingValue("baseUrl", value)}
            placeholder="https://api.openai.com/v1"
            required={aiSettings.enabled}
            error={validationErrors["ai.baseUrl"]}
          />
          <Field
            label="Model"
            value={aiSettings.model}
            onChange={(value) => setAiSettingValue("model", value)}
            placeholder="Nhập model mà user muốn dùng"
            required={aiSettings.enabled}
            error={validationErrors["ai.model"]}
          />
          <Field
            label="API key"
            value={aiSettings.apiKey}
            type="password"
            onChange={(value) => setAiSettingValue("apiKey", value)}
            placeholder="Key riêng của từng user"
            required={aiSettings.enabled}
            error={validationErrors["ai.apiKey"]}
          />
          <Field
            label="Phong cách viết"
            value={aiSettings.writingStyle}
            onChange={(value) => setAiSettingValue("writingStyle", value)}
            textarea
            rows={4}
            placeholder="Ví dụ: viết ngắn gọn, rõ precondition, expected result dạng bullet..."
          />
          <Field
            label="Cách viết test case"
            value={aiSettings.testCaseGuidelines}
            onChange={(value) => setAiSettingValue("testCaseGuidelines", value)}
            textarea
            rows={5}
            placeholder="Các đầu mục, format step, rule đặt tên, priority, coverage tag..."
          />
          <Field
            label="Cách làm test design"
            value={aiSettings.testDesignGuidelines}
            onChange={(value) => setAiSettingValue("testDesignGuidelines", value)}
            textarea
            rows={5}
            placeholder="Cách chia branch, rule Out of scope, risk lens, edge case..."
          />
          <Field
            label="Improve skill notes"
            value={aiSettings.improvementNotes}
            onChange={(value) => setAiSettingValue("improvementNotes", value)}
            textarea
            rows={5}
            placeholder="Những điều user đã chỉnh và muốn app ghi nhớ cho lần sau"
          />
          <div className="button-row">
            <IconButton
              icon={settingsBusy === "ai" ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
              onClick={() => saveUserSettings("ai")}
              disabled={Boolean(settingsBusy)}
              variant="primary"
            >
              Lưu
            </IconButton>
          </div>
          {settingsStatus.ai ? <div className="mini-note">{settingsStatus.ai}</div> : null}
          <div className="mini-note">
            API key và guideline được lưu mã hoá theo account. Base URL chính thức `api.openai.com` dùng Responses API; các OpenAI-compatible/custom proxy như llmproxy dùng Chat Completions. Khi bật AI Settings, app bắt buộc gọi AI provider thành công; nếu lỗi sẽ báo lỗi thay vì dùng fallback local.
          </div>
        </section>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">QC / QA automation workspace</p>
            <h2>{issue.key || "Nhập Jira task để bắt đầu"}</h2>
          </div>
          <div className="top-actions">
            <div className="user-menu" ref={userMenuRef}>
              <button
                className="user-menu-trigger"
                type="button"
                onClick={() => setUserMenuOpen((current) => !current)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label="User menu"
              >
                <User size={16} />
                <span>User</span>
                <ChevronDown size={14} />
              </button>
              {userMenuOpen ? (
                <div className="user-menu-popover" role="menu">
                  {authUser ? <div className="user-menu-email">{authUser}</div> : null}
                  <button
                    className="user-menu-item"
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setPasswordDialogOpen(true);
                    }}
                    disabled={isWorking}
                    role="menuitem"
                  >
                    <KeyRound size={16} />
                    <span>Đổi mật khẩu</span>
                  </button>
                  <button className="user-menu-item danger" type="button" onClick={logout} disabled={isWorking} role="menuitem">
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              ) : null}
            </div>
            <select value={archetypeKey} onChange={(event) => setArchetypeKey(event.target.value)}>
              <option value="auto">Auto archetype</option>
              {defaults
                ? Object.entries(defaults.archetypes).map(([key, archetype]) => (
                    <option value={key} key={key}>
                      {archetype.label}
                    </option>
                  ))
                : null}
            </select>
            <IconButton icon={busy === "draft" ? <Loader2 className="spin" size={16} /> : <Wand2 size={16} />} onClick={generateDraft} disabled={isWorking} variant="primary">
              Generate draft
            </IconButton>
          </div>
        </header>

        <GenerationBanner status={generationStatus} />

        {passwordDialogOpen ? (
          <ChangePasswordDialog
            busy={passwordBusy}
            error={passwordError}
            success={passwordSuccess}
            currentPassword={currentPassword}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            onCurrentPassword={setCurrentPassword}
            onNewPassword={setNewPassword}
            onConfirmPassword={setConfirmPassword}
            onClose={() => {
              setPasswordDialogOpen(false);
              setPasswordError("");
              setPasswordSuccess("");
            }}
            onSubmit={changePassword}
          />
        ) : null}

        <section className="issue-grid">
          <div className="panel">
            <div className="panel-title">
              <FileText size={18} />
              <h2>Task context</h2>
            </div>
            <div className="form-grid">
              <Field label="Issue key" value={issue.key} onChange={(value) => setIssueValue("key", value.toUpperCase())} placeholder="AI-707" required error={validationErrors["issue.key"]} />
              <Field label="Status" value={issue.status} onChange={(value) => setIssueValue("status", value)} placeholder="Ready To Test" />
              <Field label="Issue type" value={issue.issue_type} onChange={(value) => setIssueValue("issue_type", value)} placeholder="Task / Bug / Story" />
              <Field label="Project key từ Jira" value={issue.project_key || ""} onChange={(value) => setIssueValue("project_key", value)} placeholder="AI" />
            </div>
            <Field label="Summary" value={issue.summary} onChange={(value) => setIssueValue("summary", value)} placeholder="[Payment] Route callback..." error={validationErrors["issue.summary"]} />
            <Field label="Description / acceptance criteria" value={issue.description} onChange={(value) => setIssueValue("description", value)} textarea rows={8} error={validationErrors["issue.description"]} />
            <Field
              label="Confluence / doc links"
              value={confluenceLinks}
              onChange={(value) => {
                clearValidationErrors(["confluenceLinks"]);
                setConfluenceLinks(value);
                const inferredBaseUrl = confluenceBaseUrl.trim() ? "" : inferConfluenceBaseUrl(value);
                if (inferredBaseUrl) {
                  setConfluenceBaseUrl(inferredBaseUrl);
                  clearValidationErrors(["confluenceBaseUrl"]);
                }
                clearFetchedDocs(value.trim() ? "Đã nhận link doc. Nhấn Fetch docs để đọc nội dung vào Task context." : "");
              }}
              textarea
              rows={3}
              placeholder="Mỗi dòng một link Confluence hoặc tài liệu liên quan"
              error={validationErrors.confluenceLinks}
            />
            <div className="button-row">
              <IconButton
                icon={busy === "docs" ? <Loader2 className="spin" size={16} /> : <FileText size={16} />}
                onClick={fetchConfluenceDocs}
                disabled={isWorking}
              >
                Fetch docs
              </IconButton>
            </div>
            {docStatus ? <div className="mini-note">{docStatus}</div> : null}
            {docSources.length ? (
              <div className="doc-source-list">
                {docSources.map((doc) => (
                  <div className={doc.error ? "doc-source error" : "doc-source"} key={doc.url}>
                    <strong>{doc.title || doc.url}</strong>
                    <span>{doc.url}</span>
                    <small>{doc.error ? `Lỗi: ${doc.error}` : `${doc.text.length.toLocaleString()} ký tự đã fetch`}</small>
                  </div>
                ))}
              </div>
            ) : null}
            <Field
              label="Nội dung doc đã fetch / paste thêm"
              value={docContext}
              onChange={(value) => {
                setDocContext(value);
                setDocIssueKey(value.trim() ? issueKeyFromText(jiraUrl) || issue.key : "");
                setDocStatus(value.trim() ? `Doc context thủ công đang gắn với ${issueKeyFromText(jiraUrl) || issue.key}. Generate draft sẽ dùng nội dung này nếu Base URL vẫn có giá trị.` : "");
                setDocSources([]);
              }}
              textarea
              rows={5}
              placeholder="Nội dung Confluence sẽ tự đổ vào đây, hoặc QA có thể paste thủ công nếu link không truy cập được"
            />
            <Field label="Ghi chú thêm của QA" value={notes} onChange={setNotes} textarea rows={4} placeholder="Risk, data seed, out of scope, known bug..." />
          </div>

          <div className="panel">
            <div className="panel-title">
              <GitBranch size={18} />
              <h2>Design lens</h2>
            </div>
            {selectedArchetype ? (
              <div className="lens">
                <h3>{selectedArchetype.label}</h3>
                <p>Primary: {selectedArchetype.primary.join(", ")}</p>
                <p>Supporting: {selectedArchetype.supporting.join(", ")}</p>
                <ul>
                  {selectedArchetype.dimensions.map((dimension) => (
                    <li key={dimension}>{dimension}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="lens">
                <h3>Auto classification</h3>
                <p>App sẽ đọc summary, description và issue type để chọn archetype gần nhất.</p>
                <p>QA vẫn có thể đổi archetype trước khi generate lại draft.</p>
              </div>
            )}
            {qaPlan ? (
              <div className="qa-plan">
                <h3>Adaptive QA plan</h3>
                <p>{qaPlan.archetype_label}</p>
                <div className="pill-row">
                  {[
                    ...qaPlan.selected_techniques.primary,
                    ...qaPlan.selected_techniques.supporting.slice(0, 2),
                    ...qaPlan.selected_techniques.fail_safe.slice(0, 1),
                  ].map((technique) => (
                    <span key={technique}>{technique}</span>
                  ))}
                </div>
                <ul>
                  {qaPlan.coverage_axes.slice(0, 4).map((axis) => (
                    <li key={axis.id}>
                      <strong>{axis.title}</strong>
                      <small>{axis.technique}</small>
                    </li>
                  ))}
                </ul>
                {qaPlan.repo_evidence?.snippets?.length ? (
                  <p>{qaPlan.repo_evidence.snippets.length} repo/local evidence snippet được dùng để định hướng draft.</p>
                ) : null}
                {qaPlan.repo_evidence?.root_status?.length ? (
                  <div className="status-stack">
                    {qaPlan.repo_evidence.root_status.map((item) => (
                      <StatusBadge key={item.root} ok={item.exists} text={item.root} />
                    ))}
                  </div>
                ) : null}
                {qaPlan.open_questions?.length ? <p>Câu hỏi mở: {qaPlan.open_questions[0]}</p> : null}
              </div>
            ) : null}
            <div className="metric-row">
              <div>
                <strong>{testCases.length}</strong>
                <span>Test cases</span>
              </div>
              <div>
                <strong>{outline.branches.length}</strong>
                <span>Branches</span>
              </div>
              <div>
                <strong>{caseKeys ? caseKeys.split(",").filter(Boolean).length : 0}</strong>
                <span>Created keys</span>
              </div>
            </div>
          </div>
        </section>

        <nav className="tabs">
          <button className={activeTab === "cases" ? "active" : ""} onClick={() => setActiveTab("cases")} type="button">
            <ClipboardList size={16} />
            Test cases
          </button>
          <button className={activeTab === "design" ? "active" : ""} onClick={() => setActiveTab("design")} type="button">
            <Map size={16} />
            Test design
          </button>
          <button className={activeTab === "run" ? "active" : ""} onClick={() => setActiveTab("run")} type="button">
            <Play size={16} />
            Run
          </button>
        </nav>

        {activeTab === "cases" ? (
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Editable test cases</h2>
                <p>Mỗi case giữ schema import được vào Zephyr Scale: precondition, test data, expected result và step-by-step.</p>
              </div>
              <IconButton icon={<Plus size={16} />} onClick={addCase}>
                Add case
              </IconButton>
            </div>
            <div className="case-list">
              {testCases.map((testCase, index) => (
                <article className="case-card" key={`${testCase.title}-${index}`}>
                  <div className="case-head">
                    <strong>{testCase.title || `Case ${index + 1}`}</strong>
                    <button className="icon-only danger" type="button" onClick={() => removeCase(index)} title="Xóa test case">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <Field label="Title" value={testCase.title} onChange={(value) => updateCase(index, { title: value })} />
                    <Field label="Priority" value={testCase.priority} onChange={(value) => updateCase(index, { priority: value })} />
                    <Field label="Technique" value={testCase.technique} onChange={(value) => updateCase(index, { technique: value })} />
                    <Field label="Scenario type" value={testCase.scenario_type} onChange={(value) => updateCase(index, { scenario_type: value })} />
                  </div>
                  <Field label="Objective" value={testCase.objective} onChange={(value) => updateCase(index, { objective: value })} />
                  <Field label="Risk" value={testCase.risk} onChange={(value) => updateCase(index, { risk: value })} />
                  <div className="form-grid">
                    <Field label="Requirement ref" value={testCase.requirement_ref} onChange={(value) => updateCase(index, { requirement_ref: value })} />
                    <Field
                      label="Coverage tags"
                      value={testCase.coverage_tags.join(", ")}
                      onChange={(value) => updateCase(index, { coverage_tags: value.split(",").map((item) => item.trim()).filter(Boolean) })}
                    />
                  </div>
                  <Field label="Precondition" value={testCase.precondition} onChange={(value) => updateCase(index, { precondition: value })} textarea rows={3} />
                  <div className="form-grid two">
                    <Field label="Test Data" value={testCase.test_data} onChange={(value) => updateCase(index, { test_data: value })} textarea rows={4} />
                    <Field label="Expected Result" value={testCase.expected_result} onChange={(value) => updateCase(index, { expected_result: value })} textarea rows={4} />
                  </div>
                  <div className="steps">
                    <div className="subhead">
                      <span>Steps</span>
                      <button
                        type="button"
                        className="tiny"
                        onClick={() =>
                          updateCase(index, {
                            structured_steps: [
                              ...testCase.structured_steps,
                              { description: "Bước mới", test_data: "", expected_result: "" },
                            ],
                          })
                        }
                      >
                        <Plus size={14} />
                        Step
                      </button>
                    </div>
                    {testCase.structured_steps.map((caseStep, stepIndex) => (
                      <div className="step-row" key={`${caseStep.description}-${stepIndex}`}>
                        <Field label={`Step ${stepIndex + 1}`} value={caseStep.description} onChange={(value) => updateStep(index, stepIndex, { description: value })} />
                        <Field label="Data" value={caseStep.test_data} onChange={(value) => updateStep(index, stepIndex, { test_data: value })} />
                        <Field label="Expected" value={caseStep.expected_result} onChange={(value) => updateStep(index, stepIndex, { expected_result: value })} />
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "design" ? (
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Editable XMind outline</h2>
                <p>Branch linh hoạt theo độ phức tạp task; bắt buộc có branch Out of scope.</p>
              </div>
              <IconButton icon={<Plus size={16} />} onClick={addBranch}>
                Add branch
              </IconButton>
            </div>
            <Field label="Mindmap title" value={outline.title} onChange={(value) => setOutline((current) => ({ ...current, title: value }))} />
            <div className="branch-list">
              {outline.branches.map((branch, index) => (
                <article className="branch-card" key={`${branch.title}-${index}`}>
                  <div className="case-head">
                    <strong>Branch {index + 1}</strong>
                    <button className="icon-only danger" type="button" onClick={() => removeBranch(index)} title="Xóa branch">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <Field label="Branch title" value={branch.title} onChange={(value) => updateBranch(index, { title: value })} />
                  <Field
                    label="Items, mỗi dòng là một bullet"
                    value={branch.items.join("\n")}
                    onChange={(value) => updateBranch(index, { items: value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) })}
                    textarea
                    rows={5}
                  />
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "run" ? (
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Automation run</h2>
                <p>Chạy local trước để QA review, sau đó mới attach hoặc tạo dữ liệu thật trên Jira/Zephyr.</p>
              </div>
            </div>
            <div className="run-grid">
              <div className="run-block">
                <h3>Local storage</h3>
                <p>Lưu draft hiện tại thành JSON giống cách repo Omni lưu trong `qa/jira` và `qa/xmind-test-design`.</p>
                <IconButton icon={busy === "save" ? <Loader2 className="spin" size={16} /> : <Save size={16} />} onClick={saveDraftFiles} disabled={isWorking || testCases.length === 0} variant="primary">
                  Save JSON
                </IconButton>
                {savedFiles ? (
                  <div className="mini-note">
                    Test cases: {savedFiles.casesFile}
                    <br />
                    Test design: {savedFiles.designFile}
                  </div>
                ) : null}
              </div>
              <div className="run-block">
                <h3>Test design</h3>
                <p>Build file `.xmind` và `.png` từ outline đang chỉnh.</p>
                <div className="button-row">
                  <IconButton icon={busy === "xmind" ? <Loader2 className="spin" size={16} /> : <Map size={16} />} onClick={() => buildXmind(false)} disabled={isWorking}>
                    Build local
                  </IconButton>
                  <IconButton icon={busy === "attach" ? <Loader2 className="spin" size={16} /> : <UploadCloud size={16} />} onClick={() => buildXmind(true)} disabled={isWorking} variant="primary">
                    Build and attach
                  </IconButton>
                </div>
              </div>
              <div className="run-block">
                <h3>Test cases</h3>
                <p>Tạo Zephyr testcase folder và import toàn bộ case đang chỉnh.</p>
                <IconButton icon={busy === "suite" ? <Loader2 className="spin" size={16} /> : <ClipboardList size={16} />} onClick={createSuite} disabled={isWorking || testCases.length === 0} variant="primary">
                  Create suite
                </IconButton>
              </div>
              <div className="run-block">
                <h3>Test cycle</h3>
                <p>Tạo test cycle và link về Jira task từ testcase keys.</p>
                <Field label="Case keys" value={caseKeys} onChange={setCaseKeys} placeholder="AI-T2004,AI-T2005" />
                <IconButton icon={busy === "cycle" ? <Loader2 className="spin" size={16} /> : <Play size={16} />} onClick={createCycle} disabled={isWorking || !caseKeys} variant="primary">
                  Create cycle
                </IconButton>
              </div>
            </div>
            <div className="output">
              <div className="subhead">
                <span>Output</span>
                {message ? <small>{message}</small> : null}
              </div>
              {message ? <div className={message.startsWith("Đã") ? "notice ok" : "notice"}>{message}</div> : null}
              {output ? <pre>{output}</pre> : <p className="empty">Kết quả từ API/script sẽ hiển thị ở đây.</p>}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;
