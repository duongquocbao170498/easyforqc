import AlertCircle from "lucide-react/dist/esm/icons/alert-circle.js";
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
import Wand2 from "lucide-react/dist/esm/icons/wand-2.js";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type {
  AiSettings,
  ArchetypeInfo,
  ConfluenceCredentials,
  Credentials,
  DefaultsResponse,
  IssueSummary,
  OutlineBranch,
  ProjectConfig,
  StructuredStep,
  TestCase,
  TestDesignOutline,
} from "./types";

type TabKey = "cases" | "design" | "run";
type BusyKey = "issue" | "docs" | "draft" | "save" | "xmind" | "attach" | "suite" | "cycle" | "";
type SettingsSection = "project" | "credentials" | "confluence" | "ai";
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
  provider: "openai-compatible",
  baseUrl: "https://api.openai.com/v1",
  model: "",
  apiKey: "",
  writingStyle: "",
  testCaseGuidelines: "",
  testDesignGuidelines: "",
  improvementNotes: "",
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

const emptyOutline = (issue: IssueSummary): TestDesignOutline => ({
  issue_key: issue.key,
  title: issue.key ? `[${issue.key}] ${issue.summary || "Test design"}` : issue.summary || "Test design",
  sheet_title: "Brace Map",
  template: "general",
  branches: [
    { title: "Luồng nghiệp vụ chính", items: ["Xác nhận behavior chính đúng với scope Jira"] },
    { title: "Validation và điều kiện dữ liệu", items: ["Kiểm tra input thiếu, sai format hoặc null"] },
    { title: "Negative path và edge cases", items: ["Kiểm tra fallback khi dependency lỗi hoặc trả rỗng"] },
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
}) {
  return (
    <label className="field">
      <span>{props.label}</span>
      {props.textarea ? (
        <textarea
          value={props.value}
          rows={props.rows || 4}
          placeholder={props.placeholder}
          onChange={(event) => props.onChange(event.target.value)}
        />
      ) : (
        <input
          value={props.value}
          type={props.type || "text"}
          placeholder={props.placeholder}
          onChange={(event) => props.onChange(event.target.value)}
        />
      )}
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
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [outline, setOutline] = useState<TestDesignOutline>(emptyOutline(emptyIssue));
  const [activeTab, setActiveTab] = useState<TabKey>("cases");
  const [busy, setBusy] = useState<BusyKey>("");
  const [message, setMessage] = useState("");
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

  function setProjectValue(key: keyof ProjectConfig, value: string) {
    setProject((current) => ({ ...current, [key]: value }));
  }

  function setCredentialValue(key: keyof Credentials, value: string) {
    setCredentials((current) => ({ ...current, [key]: value }));
  }

  function setConfluenceCredentialValue(key: keyof ConfluenceCredentials, value: string) {
    setConfluenceCredentials((current) => ({ ...current, [key]: value }));
  }

  function setAiSettingValue<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    setAiSettings((current) => ({ ...current, [key]: value }));
  }

  function resetGeneratedDraft(nextIssueKey: string) {
    const nextIssue = { ...emptyIssue, key: nextIssueKey };
    setTestCases([]);
    setOutline(emptyOutline(nextIssue));
    setCaseKeys("");
    setOutput("");
    setSavedFiles(null);
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
    setBusyRun("draft", async () => {
      const effectiveIssueKey = issueKeyFromText(jiraUrl) || issue.key;
      const effectiveIssue = { ...issue, key: effectiveIssueKey };
      const shouldUseConfluenceDocs = Boolean((docContext.trim() || confluenceLinks.trim()) && (!docIssueKey || docIssueKey === effectiveIssueKey));
      setTestCases([]);
      setOutline(emptyOutline(effectiveIssue));
      setCaseKeys("");
      setSavedFiles(null);
      setOutput("");
      setActiveTab("cases");
      const payload = await apiPost<{
        archetypeKey: string;
        testCases: TestCase[];
        outline: TestDesignOutline;
        aiGenerationUsed?: boolean;
        aiGenerationError?: string;
      }>("/api/draft", {
        ...requestBody,
        issue: effectiveIssue,
        confluenceLinks: shouldUseConfluenceDocs ? confluenceLinks : "",
        docContext: shouldUseConfluenceDocs ? docContext : "",
      });
      setArchetypeKey(payload.archetypeKey);
      setTestCases(payload.testCases);
      setOutline(payload.outline);
      setActiveTab("cases");
      setOutput(JSON.stringify(payload, null, 2));
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
          <Field label="Jira URL hoặc issue key" value={jiraUrl} onChange={handleJiraUrlChange} placeholder="https://jira.vexere.net/browse/AI-707" />
          <Field
            label="Confluence Base URL cho task này"
            value={confluenceBaseUrl}
            onChange={(value) => {
              setConfluenceBaseUrl(value);
              clearFetchedDocs(value.trim() && confluenceLinks.trim() ? "Base URL đã đổi. Nhấn Fetch docs để đọc lại doc cho task hiện tại." : "");
            }}
            placeholder="Optional, ví dụ https://confluence.vexere.net"
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
          <Field label="Jira base URL" value={project.jiraBaseUrl} onChange={(value) => setProjectValue("jiraBaseUrl", value)} />
          <Field label="Project key" value={project.projectKey} onChange={(value) => setProjectValue("projectKey", value)} />
          <Field label="Test case folder root" value={project.folderRoot} onChange={(value) => setProjectValue("folderRoot", value)} />
          <Field label="Test cycle run root" value={project.runRoot} onChange={(value) => setProjectValue("runRoot", value)} />
          <Field label="XMind output dir" value={project.outputDir} onChange={(value) => setProjectValue("outputDir", value)} />
          <Field label="Source root" value={project.sourceRoot} onChange={(value) => setProjectValue("sourceRoot", value)} />
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
            />
            <Field
              label="Test design required labels"
              value={project.testdesignLabels}
              onChange={(value) => setProjectValue("testdesignLabels", value)}
              placeholder="QA_testdesign"
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
          <Field label="User" value={credentials.user} onChange={(value) => setCredentialValue("user", value)} placeholder="name@example.com" />
          <Field label="Password" value={credentials.password} type="password" onChange={(value) => setCredentialValue("password", value)} />
          <Field label="Token" value={credentials.token} type="password" onChange={(value) => setCredentialValue("token", value)} />
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
          <Field label="User" value={confluenceCredentials.user} onChange={(value) => setConfluenceCredentialValue("user", value)} placeholder="name@example.com" />
          <Field label="Password" value={confluenceCredentials.password} type="password" onChange={(value) => setConfluenceCredentialValue("password", value)} />
          <Field label="Token" value={confluenceCredentials.token} type="password" onChange={(value) => setConfluenceCredentialValue("token", value)} />
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
              <option value="openai-compatible">OpenAI compatible</option>
              <option value="openai">OpenAI</option>
              <option value="azure-openai">Azure OpenAI</option>
              <option value="custom">Custom endpoint</option>
            </select>
          </label>
          <Field
            label="Base URL"
            value={aiSettings.baseUrl}
            onChange={(value) => setAiSettingValue("baseUrl", value)}
            placeholder="https://api.openai.com/v1"
          />
          <Field
            label="Model"
            value={aiSettings.model}
            onChange={(value) => setAiSettingValue("model", value)}
            placeholder="Nhập model mà user muốn dùng"
          />
          <Field
            label="API key"
            value={aiSettings.apiKey}
            type="password"
            onChange={(value) => setAiSettingValue("apiKey", value)}
            placeholder="Key riêng của từng user"
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
            API key và guideline được lưu mã hoá theo account. Nếu bỏ tích, các thông tin này vẫn được lưu nhưng không áp dụng khi generate.
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
            {authUser ? <span className="user-pill">{authUser}</span> : null}
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
            <IconButton icon={<KeyRound size={16} />} onClick={() => setPasswordDialogOpen(true)} disabled={isWorking}>
              Đổi mật khẩu
            </IconButton>
            <IconButton icon={<LogOut size={16} />} onClick={logout} disabled={isWorking}>
              Logout
            </IconButton>
          </div>
        </header>

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
              <Field label="Issue key" value={issue.key} onChange={(value) => setIssueValue("key", value.toUpperCase())} placeholder="AI-707" />
              <Field label="Status" value={issue.status} onChange={(value) => setIssueValue("status", value)} placeholder="Ready To Test" />
              <Field label="Issue type" value={issue.issue_type} onChange={(value) => setIssueValue("issue_type", value)} placeholder="Task / Bug / Story" />
              <Field label="Project key từ Jira" value={issue.project_key || ""} onChange={(value) => setIssueValue("project_key", value)} placeholder="AI" />
            </div>
            <Field label="Summary" value={issue.summary} onChange={(value) => setIssueValue("summary", value)} placeholder="[Payment] Route callback..." />
            <Field label="Description / acceptance criteria" value={issue.description} onChange={(value) => setIssueValue("description", value)} textarea rows={8} />
            <Field
              label="Confluence / doc links"
              value={confluenceLinks}
              onChange={(value) => {
                setConfluenceLinks(value);
                const inferredBaseUrl = confluenceBaseUrl.trim() ? "" : inferConfluenceBaseUrl(value);
                if (inferredBaseUrl) {
                  setConfluenceBaseUrl(inferredBaseUrl);
                }
                clearFetchedDocs(value.trim() ? "Đã nhận link doc. Nhấn Fetch docs để đọc nội dung vào Task context." : "");
              }}
              textarea
              rows={3}
              placeholder="Mỗi dòng một link Confluence hoặc tài liệu liên quan"
            />
            <div className="button-row">
              <IconButton
                icon={busy === "docs" ? <Loader2 className="spin" size={16} /> : <FileText size={16} />}
                onClick={fetchConfluenceDocs}
                disabled={isWorking || !confluenceLinks.trim()}
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
                <p>Renderer yêu cầu 4-5 branch và bắt buộc có branch Out of scope.</p>
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
