import AlertCircle from "lucide-react/dist/esm/icons/alert-circle.js";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.js";
import BookOpen from "lucide-react/dist/esm/icons/book-open.js";
import Bot from "lucide-react/dist/esm/icons/bot.js";
import Brain from "lucide-react/dist/esm/icons/brain.js";
import Bug from "lucide-react/dist/esm/icons/bug.js";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.js";
import ClipboardList from "lucide-react/dist/esm/icons/clipboard-list.js";
import Download from "lucide-react/dist/esm/icons/download.js";
import FileText from "lucide-react/dist/esm/icons/file-text.js";
import GitBranch from "lucide-react/dist/esm/icons/git-branch.js";
import GraduationCap from "lucide-react/dist/esm/icons/graduation-cap.js";
import KeyRound from "lucide-react/dist/esm/icons/key-round.js";
import Languages from "lucide-react/dist/esm/icons/languages.js";
import Layers from "lucide-react/dist/esm/icons/layers.js";
import Link from "lucide-react/dist/esm/icons/link.js";
import ListChecks from "lucide-react/dist/esm/icons/list-checks.js";
import LockKeyhole from "lucide-react/dist/esm/icons/lock-keyhole.js";
import LogOut from "lucide-react/dist/esm/icons/log-out.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-2.js";
import Mail from "lucide-react/dist/esm/icons/mail.js";
import Map from "lucide-react/dist/esm/icons/map.js";
import Maximize2 from "lucide-react/dist/esm/icons/maximize-2.js";
import Moon from "lucide-react/dist/esm/icons/moon.js";
import Play from "lucide-react/dist/esm/icons/play.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import Save from "lucide-react/dist/esm/icons/save.js";
import ScanSearch from "lucide-react/dist/esm/icons/scan-search.js";
import Settings from "lucide-react/dist/esm/icons/settings.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import Square from "lucide-react/dist/esm/icons/square.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import UploadCloud from "lucide-react/dist/esm/icons/upload-cloud.js";
import User from "lucide-react/dist/esm/icons/user.js";
import Wand2 from "lucide-react/dist/esm/icons/wand-2.js";
import X from "lucide-react/dist/esm/icons/x.js";
import type { ReactNode } from "react";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  AiSettings,
  AiSettingsHistoryChange,
  AiSettingsHistoryEntry,
  AutomationProfile,
  ArchetypeInfo,
  AuthEntry,
  ConfluenceCredentials,
  Credentials,
  DefaultsResponse,
  IssueSummary,
  OutlineBranch,
  ProjectConfig,
  QaPlan,
  StopConditions,
  StructuredStep,
  TestCase,
  TestDesignOutline,
} from "./types";

type TabKey = "cases" | "design" | "run";
type BusyKey = "issue" | "docs" | "draft" | "promptImprove" | "save" | "workspace" | "stopPatterns" | "xmind" | "attach" | "suite" | "cycle" | "";
type SettingsSection = "project" | "auth" | "automation" | "ai" | "knowledgeAi";
type KnowledgeSection = "principles" | "process" | "techniques" | "levels" | "reviews" | "defects" | "aiWriter";
type StaticKnowledgeSection = Exclude<KnowledgeSection, "aiWriter">;
type AppView = "run" | "workspace" | "settings" | "knowledge" | "chatwoot";
type ThemeMode = "dark" | "light";
type LanguageMode = "vi" | "en";

const AUTOMATION_PROFILE_LIMIT = 20;

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

type ChatwootSuiteCase = {
  index: number;
  caseId: string;
  title: string;
  openingPrompt: string;
  objective?: string;
  testData?: string;
  expectedResult?: string;
  plannerInstruction?: string;
  stopPatterns?: string[];
  failPatterns?: string[];
  stopConditions?: StopConditions;
  steps?: ChatwootSuiteStep[];
};

type ChatwootSuiteStep = {
  index: number;
  prompt: string;
  expected?: string;
  testData?: string;
};

type ChatwootStopConditionEdit = {
  pass: string;
  fail: string;
};

type ChatwootUatSuite = {
  suiteName: string;
  goalSummary: string;
  caseCount: number;
  cases?: ChatwootSuiteCase[];
  path: string;
  relativePath: string;
  updatedAt: string;
};

type ChatwootUatInfo = {
  skillRoot: string;
  skillExists: boolean;
  candidates: string[];
  defaultWebhookUrl: string;
  defaultHealthcheckUrl: string;
  defaultChatwootApiBase: string;
  defaultAccountId: string;
  defaultInboxId: string;
  defaultUiInboxId: string;
  defaultCaptainAssistantId: string;
  plannerAiReady: boolean;
  defaultPlannerModel: string;
  serverChatwootAuthReady: boolean;
  codexCliAvailable: boolean;
  suites: ChatwootUatSuite[];
};

type ChatwootUatRunForm = {
  suiteFile: string;
  mode: "adaptive" | "suite";
  chatUiMode: "realistic" | "webhook-only";
  plannerBackend: "openai-compatible" | "heuristic" | "codex-cli";
  webhookUrl: string;
  healthcheckUrl: string;
  skipHealthcheck: boolean;
  skipLocalWebhookPost: boolean;
  chatwootApiBase: string;
  inboxId: string;
  uiInboxId: string;
  captainAssistantId: string;
  accountId: string;
  caseId: string;
  caseIndex: string;
  limitCases: string;
  maxUserTurns: string;
  plannerModel: string;
  plannerTimeoutSeconds: string;
  labels: string;
  assigneeName: string;
  pinnedConversationId: string;
};

type ChatwootSuiteSource = "workspace" | "manual";

type ChatwootSuiteDraftForm = {
  source: ChatwootSuiteSource;
  title: string;
  scenario: string;
  workspaceItemId: string;
};

type ChatwootUatRunResult = {
  mode: string;
  skillRoot: string;
  suiteFile: string;
  runDir: string;
  files: {
    report?: DownloadFileMeta | null;
    raw?: DownloadFileMeta | null;
    yaml?: DownloadFileMeta | null;
  };
  report: {
    suiteName: string;
    mode: string;
    total: number;
    success: number;
    handoff: number;
    failure: number;
    runtime: {
      webhookUrl: string;
      chatwootApiBase: string;
      accountId: string;
      chatUiMode: string;
      maxUserTurns?: number | null;
    };
    results: {
      caseId: string;
      title: string;
      succeeded: boolean;
      completedReason: string;
      failureReason: string;
      conversationId: string;
      conversationUrl: string;
      userTurnCount: number;
      bookingCode: string;
      ticketCode: string;
      paymentLink: string;
      handoffDetected: boolean;
    }[];
  };
  stdout: string;
  stderr: string;
};

type ChatwootUatRunPayload = ChatwootUatRunForm & {
  selectedCaseIds?: string[];
  caseStopPatterns?: Record<string, string[]>;
  caseStopConditions?: Record<string, StopConditions>;
  agentId?: string;
  agentName?: string;
};

type ChatwootJobCaseState = {
  index: number;
  caseId: string;
  title: string;
  openingPrompt?: string;
  testData?: string;
  expectedResult?: string;
  plannerInstruction?: string;
  stopPatterns?: string[];
  failPatterns?: string[];
  stopConditions?: StopConditions;
  steps?: ChatwootSuiteStep[];
  status: "pending" | "running" | "completed" | "failed" | "handoff" | "interrupted" | "skipped" | string;
  startedAt?: string | null;
  finishedAt?: string | null;
  result?: Partial<ChatwootUatRunResult["report"]["results"][number]> & {
    reportUrl?: string;
    rawUrl?: string;
    yamlUrl?: string;
  } | null;
  error?: string;
};

type ChatwootUatJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "interrupted" | string;
  suiteName: string;
  suiteFile: string;
  runDir: string;
  request: Partial<ChatwootUatRunPayload>;
  result?: ChatwootUatRunResult | null;
  error: string;
  activeCaseId?: string;
  caseStates?: ChatwootJobCaseState[];
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt: string;
};
type PromptImproveResponse = {
  improvedPrompt: string;
  targetField?: AiImproveField;
  updates?: PromptImproveUpdate[];
  summary?: string;
  aiProvider?: AiProviderInfo;
};
type AiImproveField = "promptGuidelines";
type PromptImproveUpdate = {
  targetField: AiImproveField;
  improvedPrompt: string;
};
type PromptImproveProposal = {
  source: "settings" | "draft";
  instruction: string;
  beforePrompt: string;
  updates: PromptImproveUpdate[];
  nextAiSettings: AiSettings;
  changedFields: AiImproveField[];
  changedLabels: string;
  summary?: string;
};
type PromptCompareDialog = {
  label: string;
  summary: string;
  before: string;
  after: string;
};
type ConfluenceDocument = { title: string; url: string; text: string; error?: string };
type DownloadFileMeta = { file: string; path: string; url: string; downloadUrl?: string };
type SavedDraftFiles = {
  cases: DownloadFileMeta;
  design: DownloadFileMeta;
};
type BuiltDesignFiles = {
  xmind?: DownloadFileMeta | null;
  png?: DownloadFileMeta | null;
};
type QaWorkspaceItem = {
  id: string;
  issueKey: string;
  title: string;
  source: string;
  sourceKey: string;
  createdAt: string;
  updatedAt: string;
  archetypeKey: string;
  testCases: TestCase[];
  outline: TestDesignOutline;
  qaPlan?: QaPlan | null;
  chatwootSuiteFile?: string;
  chatwootSuiteName?: string;
  files?: Record<string, unknown>;
};
type CaseFilter = "all" | "happy" | "negative" | "edge" | "regression" | "auth" | "validation" | "doc";
type QualityItem = {
  id: string;
  label: string;
  detail: string;
  ok: boolean;
  severity: "good" | "warn" | "bad";
};
type CoverageRow = {
  id: string;
  title: string;
  source: string;
  matchedIndexes: number[];
};
type ReadinessItem = {
  id: string;
  label: string;
  detail: string;
  ok: boolean;
};
type PipelineItem = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
};
type ConnectionTarget = "jira" | "confluence" | "ai" | "knowledgeAi";
type DraftHistoryEntry = {
  id: string;
  createdAt: string;
  issueKey: string;
  source: string;
  testCases: TestCase[];
  outline: TestDesignOutline;
  qaPlan?: QaPlan | null;
};
type KnowledgeArticle = {
  id: string;
  title: string;
  summary: string;
  category: string;
  content: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  source?: string;
};
type SecretStatus = {
  jira: {
    hasPassword: boolean;
    hasToken: boolean;
  };
  confluence: {
    hasPassword: boolean;
    hasToken: boolean;
  };
  ai: {
    hasApiKey: boolean;
    hasKnowledgeApiKey: boolean;
  };
};

const emptyProject: ProjectConfig = {
  sourceRoot: "",
  jiraBaseUrl: "",
  projectKey: "AI",
  folderRoot: "/Bao QC",
  runRoot: "/AI Chatbot",
  jsonOutputDir: "",
  outputDir: "",
  testCaseNumberTemplate: "TC_{0000}",
  labelMode: "custom",
  testcaseLabels: "QA_Testcases",
  testdesignLabels: "QA_testdesign",
  testcaseStatusLabels: "TODO=TestCase1\nIN PROGRESS=TestCase1\nREADY TO TEST=TestCase2\nTESTING=TestCase3\nDONE=TestCase3",
  testdesignStatusLabels: "TODO=TestDesign1\nIN PROGRESS=TestDesign1\nREADY TO TEST=TestDesign2\nTESTING=TestDesign3\nDONE=TestDesign3",
  chatwootMode: "adaptive",
  chatwootChatUiMode: "realistic",
  chatwootPlannerBackend: "openai-compatible",
  chatwootWebhookUrl: "",
  chatwootHealthcheckUrl: "",
  chatwootSkipHealthcheck: true,
  chatwootSkipLocalWebhookPost: true,
  chatwootApiBase: "https://uat-omniagent.vexere.net",
  chatwootInboxId: "3062",
  chatwootUiInboxId: "3062",
  chatwootCaptainAssistantId: "80",
  chatwootAccountId: "3",
  chatwootMaxUserTurns: "10",
  chatwootPlannerModel: "gpt-5.4-mini",
  chatwootPlannerTimeoutSeconds: "60",
  chatwootLabels: "ai",
  chatwootAssigneeName: "Bot",
  chatwootPinnedConversationId: "",
  automationProfiles: [],
};

const emptyCredentials: Credentials = {
  enabled: true,
  user: "",
  password: "",
  token: "",
};

const emptyConfluenceCredentials: ConfluenceCredentials = {
  enabled: true,
  baseUrl: "",
  user: "",
  password: "",
  token: "",
};

const DEFAULT_AI_PROMPT_GUIDELINES = `1. Bám sát scope Jira/task trước tiên. Chỉ test đúng đối tượng, feature, kênh, flow hoặc rule mà task yêu cầu. Không mở rộng sang module/kênh/feature khác nếu user không yêu cầu rõ.

2. Phân loại task trước khi viết:
   - UI/report: decision table, empty/null, refresh, pagination, data binding.
   - Workflow/routing/assignment: state transition, branching, misrouting, retry.
   - Chatbot/tool flow: user journey, context carry-forward, tool choice, fallback, handoff.
   - API/tool/callback: field mapping, required/missing data, duplicate event, idempotency.
   - Bug fix: reproduce bug, verify fix, nearby regression.

3. Mỗi suite phải cover tối thiểu:
   - Happy path chính.
   - Negative/fail-safe path.
   - Edge case hoặc platform limitation.
   - State/context carry-forward nếu có nhiều bước.
   - Regression gần nhất có khả năng bị ảnh hưởng.

4. Nếu task nói "hoạt động như / ổn định như / parity với X", thì chỉ test đối tượng chính của task. X chỉ là baseline trong expected result, không tạo case riêng cho X trừ khi user yêu cầu regression X rõ ràng.

5. Test data phải là dữ liệu/chính câu user thật sẽ dùng để chạy test. Expected result phải cụ thể, quan sát được, và không mâu thuẫn với limitation đã nêu trong task.

6. Test design nên có 4-5 nhánh ngắn, task-specific, luôn có \`Out of scope\`. Không dùng nhánh chung chung nếu có thể đặt tên theo rủi ro/flow thật của task.

7. Nếu scope chưa rõ, ghi \`Open question\` thay vì tự đoán. Nếu đã tạo sai scope, xoá artifact sai trước khi tạo lại để không có hai bộ test cạnh tranh.`;

function createEmptyAuthEntry(): AuthEntry {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `auth-${Date.now()}`,
    name: "",
    baseUrl: "",
    authType: "bearer",
    user: "",
    password: "",
    token: "",
    enabled: false,
    notes: "",
  };
}

function safeAuthEntry(entry: Partial<AuthEntry> = {}): AuthEntry {
  const empty = createEmptyAuthEntry();
  return {
    ...empty,
    ...entry,
    id: entry.id || empty.id,
    password: "",
    token: "",
    saved: entry.saved || {
      hasPassword: false,
      hasToken: false,
    },
  };
}

const emptyAiSettings: AiSettings = {
  enabled: false,
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
  model: "",
  apiKey: "",
  promptGuidelines: DEFAULT_AI_PROMPT_GUIDELINES,
  stopConditionGuidelines: "",
  writingStyle: "",
  testCaseGuidelines: "",
  testDesignGuidelines: "",
  improvementNotes: "",
  knowledge: {
    enabled: false,
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "",
    apiKey: "",
    writingStyle: "",
    articleGuidelines: "",
  },
};

const emptySecretStatus: SecretStatus = {
  jira: { hasPassword: false, hasToken: false },
  confluence: { hasPassword: false, hasToken: false },
  ai: { hasApiKey: false, hasKnowledgeApiKey: false },
};

const emptyChatwootUatForm: ChatwootUatRunForm = {
  suiteFile: "",
  mode: "adaptive",
  chatUiMode: "realistic",
  plannerBackend: "openai-compatible",
  webhookUrl: "",
  healthcheckUrl: "",
  skipHealthcheck: true,
  skipLocalWebhookPost: true,
  chatwootApiBase: "",
  inboxId: "3062",
  uiInboxId: "3062",
  captainAssistantId: "80",
  accountId: "",
  caseId: "",
  caseIndex: "",
  limitCases: "",
  maxUserTurns: "10",
  plannerModel: "gpt-5.4-mini",
  plannerTimeoutSeconds: "60",
  labels: "ai",
  assigneeName: "Bot",
  pinnedConversationId: "",
};

const emptyChatwootSuiteDraft: ChatwootSuiteDraftForm = {
  source: "workspace",
  title: "",
  scenario: "",
  workspaceItemId: "",
};

const idleGenerationStatus: GenerationStatus = {
  state: "idle",
  title: "",
  detail: "",
};

const THEME_STORAGE_KEY = "easyforqc-theme";
const LANGUAGE_STORAGE_KEY = "easyforqc-language";

function initialThemeMode(): ThemeMode {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function initialLanguageMode(): LanguageMode {
  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === "en" ? "en" : "vi";
    document.documentElement.lang = storedLanguage;
    return storedLanguage;
  } catch {
    return "vi";
  }
}

const UI_TEXT = {
  vi: {
    publicQaWorkspace: "Không gian QA công khai",
    loginCopy: "Đăng nhập để tạo test case, test design và chạy automation lên Jira/Zephyr.",
    email: "Email",
    password: "Mật khẩu",
    appPasswordPlaceholder: "Mật khẩu riêng của app",
    login: "Đăng nhập",
    loginDivider: "hoặc",
    loginWithGoogle: "Đăng nhập bằng Google",
    googleLoginEnabledTitle: "Đăng nhập bằng Gmail",
    googleLoginDisabledTitle: "Google login chưa được cấu hình trong .env",
    loginAsideTitle: "Thiết kế cho QC/QA review",
    loginAsideCopy: "Nhập Jira task, tạo draft, chỉnh nội dung theo ý QA rồi mới build hoặc tạo dữ liệu thật.",
    loginEditableCases: "Test case chỉnh sửa được",
    loginXmindEditor: "Trình chỉnh outline XMind",
    loginAutomation: "Automation Jira/Zephyr",
    loadingSession: "Đang kiểm tra phiên đăng nhập...",
    changePassword: "Đổi mật khẩu",
    changePasswordNote: "Mật khẩu mới sẽ được hash và lưu trong Postgres.",
    currentPassword: "Mật khẩu hiện tại",
    newPassword: "Mật khẩu mới",
    confirmNewPassword: "Nhập lại mật khẩu mới",
    cancel: "Hủy",
    updatePassword: "Cập nhật mật khẩu",
    brandSubtitle: "Jira sang test case và test design",
    jiraTask: "Jira task",
    jiraUrlIssueKey: "Jira URL hoặc issue key",
    confluenceBaseUrlTask: "Confluence Base URL cho task này",
    confluenceBaseUrlPlaceholder: "Không bắt buộc, ví dụ https://docs.vexere.net hoặc link page Confluence",
    confluenceBaseUrlNote: "Bỏ trống nếu task này không cần đọc doc. Nếu dán full page URL ở đây, app vẫn sẽ dùng nó như doc link khi Fetch.",
    parseButton: "Lấy key",
    parseTitle: "Đọc issue key từ link",
    fetchButton: "Đọc Jira",
    appNavigationLabel: "Điều hướng app",
    generateTask: "Tạo task",
    qaWorkspace: "QA Workspace",
    knowledge: "Kiến thức QA",
    chatwootUat: "Chatwoot UAT",
    workspaceSettings: "Cài đặt workspace",
    automationSettings: "Cấu hình automation",
    automationSettingsHelp: "Tạo connector cho từng web hội thoại. Màn chạy chỉ cần chọn connector, chọn test case và bấm chạy.",
    automationProfiles: "Cấu hình đã lưu",
    automationProfileName: "Tên cấu hình",
    automationProfileNamePlaceholder: "Ví dụ: Omni UAT - BaoApiInbox",
    chatwootAgents: "Agent UAT đã lưu",
    chatwootAgent: "Agent xử lý",
    chatwootAgentEditor: "Tạo / cập nhật connector",
    chatwootSavedAgentList: "Connector đã lưu",
    chatwootAgentName: "Tên connector",
    chatwootAgentNamePlaceholder: "Ví dụ: Bus Tiến Oanh, Flight Vexere, Train Vexere...",
    chatwootNoAgents: "Chưa có connector Chatwoot UAT đã lưu. Nhập website, Inbox ID/Captain assistant rồi lưu connector trước khi chạy.",
    chatwootAgentRequired: "Cần chọn Agent xử lý đã lưu trong Cấu hình automation trước khi chuẩn bị hoặc chạy test.",
    chatwootSelectedAgent: "Agent đang chọn",
    automationTargetType: "Loại web/công cụ",
    automationTargetChatwoot: "Chatwoot / OmniAgent",
    automationTargetWeb: "Web app",
    automationTargetApi: "API service",
    automationTargetOther: "Khác",
    saveAutomationProfile: "Lưu cấu hình hiện tại",
    saveChatwootAgent: "Lưu connector hiện tại",
    createConnector: "Tạo connector",
    editConnector: "Sửa",
    cancelConnector: "Quay lại",
    backToConnectors: "Quay lại danh sách connector",
    applyAutomationProfile: "Áp dụng",
    deleteAutomationProfile: "Xóa",
    noAutomationProfiles: "Chưa có cấu hình automation đã lưu.",
    automationProfileSaved: "Đã lưu cấu hình automation",
    automationProfileApplied: "Đã áp dụng cấu hình automation",
    automationProfileDeleted: "Đã xóa cấu hình automation",
    automationProfileDeleteConfirm: "Xóa cấu hình automation này?",
    automationProfileChangedFields: "Thường đổi theo từng web",
    automationProfileStableFields: "Thường giữ nguyên",
    automationProfileChangedFieldsCopy: "Web/API base, auth server, account/inbox/assistant ID, labels, assignee.",
    automationProfileStableFieldsCopy: "Kiểu chạy, AI planner, model từ AI Settings, timeout và số lượt user.",
    automationConnectorTitle: "Connector cho web hội thoại",
    automationConnectorIntro: "Mỗi connector đại diện cho một web hoặc agent bot có thể chạy test. Khách thường chỉ cần gửi link quản lý hội thoại, token/API key và các ID xử lý.",
    automationConnectorStepPlatform: "1. Chọn nền tảng",
    automationConnectorStepPlatformCopy: "Chatwoot/OmniAgent dùng runner hiện tại. Web/API khác sẽ cần map cách gửi và đọc tin nhắn.",
    automationConnectorStepConnection: "2. Nhập kết nối",
    automationConnectorStepConnectionCopy: "Web/API base, auth server, account/inbox/assistant ID và link xem hội thoại.",
    automationConnectorStepRun: "3. Lưu và chạy",
    automationConnectorStepRunCopy: "Sau khi lưu, màn Chatwoot UAT chỉ chọn connector và bộ test để chạy automation.",
    automationCustomerNeeds: "Khách cần gửi",
    automationCustomerNeedLink: "Link web quản lý hội thoại",
    automationCustomerNeedAuth: "API key/token hoặc cách đăng nhập",
    automationCustomerNeedIds: "Account, inbox, agent/assistant ID",
    automationCustomerNeedRule: "Dấu hiệu pass/fail hoặc link report",
    automationConnectionSection: "Kết nối website hội thoại",
    automationConnectionHelp: "Với Chatwoot/OmniAgent, Web/API base thường là domain UAT. Webhook/healthcheck chỉ cần khi runner phải gọi qua service nội bộ.",
    automationAgentSection: "Agent / kênh xử lý",
    automationAgentHelp: "Inbox xử lý quyết định bot nào trả lời. Inbox hiển thị dùng để mở đúng hội thoại cho QA xem lại.",
    automationRunSection: "Cách chạy AI",
    automationRunBehaviorHelp: "Adaptive + AI planner phù hợp kiểm thử thông minh. Hỏi đúng data test phù hợp regression/debug theo script cố định.",
    automationAdvancedSection: "Nâng cao",
    automationAdvancedHelp: "Labels, assignee, conversation cố định và toggle chỉ cần chỉnh khi debug hoặc chạy một luồng đặc biệt.",
    qaWorkspaceEyebrow: "Thư viện test artifact",
    qaWorkspaceTitle: "QA Workspace",
    qaWorkspaceIntro: "Lưu bộ test case, test design và suite UAT để theo dõi lại, mở vào Tạo task hoặc dùng làm nguồn chạy automation.",
    qaWorkspaceEmpty: "Chưa có bộ test nào trong QA Workspace.",
    saveToWorkspace: "Lưu vào QA Workspace",
    workspaceSaved: "Đã lưu vào QA Workspace.",
    workspaceSavedWithStopPatterns: "Đã lưu vào QA Workspace và cập nhật điều kiện Pass/Fail cho test case.",
    workspaceSavedStopPatternsPartial: "Đã lưu vào QA Workspace. Một số điều kiện Pass/Fail vẫn cần AI cập nhật thêm.",
    workspaceRefreshStopPatterns: "AI tạo/cập nhật Pass/Fail",
    workspaceStopPatternsUpdated: "Đã cập nhật điều kiện Pass/Fail cho QA Workspace.",
    workspaceStopPatternsReady: "Pass/Fail sẵn sàng",
    workspaceRefreshStopPatternsAgain: "AI cập nhật lại Pass/Fail",
    workspaceStopPatternsNeedUpdate: "cần cập nhật Pass/Fail",
    workspaceStopPatternMetric: "Pass/Fail",
    workspaceOpenItem: "Mở draft",
    workspaceUseSuite: "Dùng suite",
    workspaceCreateChatwootSuite: "Tạo suite Chatwoot",
    workspaceDelete: "Xóa khỏi workspace",
    workspaceImportedAi547: "AI-547 được import từ bộ test case OmniAgent chuẩn mới.",
    workspaceImportedAi548: "AI-548 được import từ suite Chatwoot UAT chuẩn khác.",
    workspaceCaseCount: "test case",
    workspaceBranchCount: "nhánh design",
    workspaceSuiteReady: "Suite sẵn sàng",
    knowledgeEyebrow: "QC / QA knowledge base",
    knowledgeTitle: "Kiến thức tester nền tảng",
    knowledgeIntro: "Tổng hợp nhanh các kiến thức tester chuẩn để QA tra cứu khi thiết kế test case, review scope và đánh giá risk.",
    knowledgeSource: "Chuẩn tham chiếu: ISTQB CTFL v4.0.1 và ISTQB Glossary.",
    knowledgeAiWriter: "Bổ sung bằng AI",
    knowledgeAiWriterTitle: "Bổ sung kiến thức QA bằng AI",
    knowledgeAiWriterHelp: "Nhập chủ đề hoặc ghi chú, AI sẽ tạo một bài kiến thức QA dạng Markdown để bạn review rồi lưu vào Knowledge.",
    knowledgeTopic: "Chủ đề kiến thức",
    knowledgeTopicPlaceholder: "Ví dụ: Pairwise testing cho flow đặt vé",
    knowledgeCategory: "Nhóm kiến thức",
    knowledgeAudience: "Ngữ cảnh áp dụng",
    knowledgeAudiencePlaceholder: "Ví dụ: QC test API, chatbot, workflow n8n...",
    knowledgeNotes: "Ghi chú / scope muốn AI bám theo",
    knowledgeNotesPlaceholder: "Rule nội bộ, ví dụ thực tế, điều cần tránh, format mong muốn...",
    generateKnowledge: "Tạo bài viết",
    saveKnowledge: "Lưu vào Knowledge",
    generatedKnowledgeDraft: "Bản nháp AI",
    savedKnowledgeArticles: "Bài đã lưu",
    noSavedKnowledge: "Chưa có bài kiến thức do bạn lưu.",
    knowledgeAiSettings: "Knowledge AI",
    knowledgeAiPanelHelp: "Cấu hình AI riêng cho chức năng tạo bài viết kiến thức QA. Có thể dùng model/API key khác với phần generate test case.",
    applyKnowledgeAiTitle: "Áp dụng Knowledge AI khi tạo bài viết",
    applyKnowledgeAiDescription: "Bật: dùng provider/model riêng bên dưới. Tắt: không cho gọi AI tạo kiến thức.",
    knowledgeArticleGuidelines: "Cách viết bài kiến thức QA",
    knowledgeArticleGuidelinesPlaceholder: "Ví dụ: viết ngắn, có ví dụ tester thực tế, ưu tiên ISTQB, không bịa số liệu...",
    userMenuLabel: "Menu người dùng",
    userFallback: "User",
    languageTarget: "English",
    themeLight: "Giao diện sáng",
    themeDark: "Giao diện tối",
    logout: "Đăng xuất",
    settingsEyebrow: "Cấu hình workspace",
    project: "Dự án",
    authentication: "Xác thực",
    jiraAuth: "Xác thực Jira",
    confluence: "Confluence",
    aiSettings: "Cài đặt AI",
    projectConfig: "Cấu hình dự án",
    jiraBaseUrl: "Jira base URL",
    projectKey: "Project key",
    testCaseFolderRoot: "Thư mục gốc test case",
    testCycleRunRoot: "Thư mục gốc test cycle",
    testCaseNumbering: "Số thứ tự test case",
    testCaseNumberTemplate: "Mẫu số thứ tự",
    testCaseNumberTemplateHint: "Dùng {0000}, {000} hoặc {n}. Ví dụ AI-{000} sẽ hiển thị [AI-001]. Nếu chỉ nhập QA, app tự hiển thị [QA_0001].",
    testCaseNumberPreview: "Preview",
    labelPolicy: "Quy tắc label",
    mode: "Chế độ",
    labelModeCustom: "custom - thay bằng label dưới đây",
    labelModePassthrough: "passthrough - giữ label từ skill",
    labelModeNone: "none - không gắn label tự động",
    testCaseRequiredLabels: "Label bắt buộc cho test case",
    testDesignRequiredLabels: "Label bắt buộc cho test design",
    testCaseStatusLabels: "Label theo trạng thái test case",
    testDesignStatusLabels: "Label theo trạng thái test design",
    save: "Lưu",
    user: "User",
    confluenceAuth: "Xác thực Confluence",
    authenticationPanelHelp: "Lưu các thông tin đăng nhập dùng để đọc Jira, Confluence và các hệ thống tài liệu khác. Secret đã lưu chỉ nằm ở server và không trả lại browser.",
    coreAuth: "Xác thực chính",
    customAuth: "Xác thực mở rộng",
    customAuthHelp: "Tạo thêm cấu hình auth cho website/tool khác. Sau khi có auth, bật mục cần dùng để đánh dấu connector đó là cấu hình đang active.",
    addAuth: "Tạo auth",
    authName: "Tên auth",
    authNamePlaceholder: "Ví dụ: Notion, Linear, GitLab Wiki...",
    authBaseUrl: "Website / Base URL",
    authBaseUrlPlaceholder: "https://example.company.com",
    authType: "Kiểu auth",
    authTypeBasic: "Basic user/password",
    authTypeBearer: "Bearer token",
    authTypeApiKey: "API key",
    authEnabled: "Sử dụng auth này",
    authNotes: "Ghi chú sử dụng",
    authNotesPlaceholder: "Tool này dùng cho team nào, đọc tài liệu nào, lưu ý quyền truy cập...",
    deleteAuth: "Xóa auth",
    noCustomAuth: "Chưa có auth mở rộng. Nhấn Tạo auth để thêm cấu hình cho website khác.",
    jiraSecretNote: "Jira secret đã lưu chỉ dùng ở server; browser không đọc lại token/password đã lưu.",
    confluenceSecretNote: "Confluence secret đã lưu chỉ dùng ở server; browser không đọc lại token/password đã lưu.",
    confluenceAuthNote: "Chỉ lưu thông tin đăng nhập. Base URL nhập riêng theo từng task ở mục Jira task.",
    aiPanelHelp: "Khi bật và có API key/model, app gọi AI provider riêng của user với prompt mặc định của skill và guideline bên dưới. Khi tắt, app dùng generator mặc định trong app.",
    applyAiTitle: "Áp dụng AI Settings khi generate",
    applyAiDescription: "Bật: gọi AI provider bằng key riêng. Tắt: dùng fallback local không gọi AI.",
    provider: "Nhà cung cấp",
    baseUrl: "Base URL",
    model: "Model",
    modelPlaceholder: "Nhập model mà user muốn dùng",
    apiKey: "API key",
    apiKeyPlaceholder: "Key riêng của từng user",
    aiPromptGuidelines: "Prompt tạo test case/test design",
    aiPromptGuidelinesPlaceholder: DEFAULT_AI_PROMPT_GUIDELINES,
    aiStopConditionGuidelines: "Prompt sinh điều kiện Pass/Fail automation",
    aiStopConditionGuidelinesPlaceholder: "Ví dụ: Sinh 2 nhóm điều kiện: Pass khi bot đạt đúng mục tiêu test case, Fail khi bot báo lỗi/sai ngữ cảnh/sai dữ liệu. Nội dung hiển thị phải là câu dễ hiểu cho QA, regex chỉ dùng nội bộ.",
    writingStyle: "Phong cách viết",
    writingStylePlaceholder: "Ví dụ: viết ngắn gọn, rõ precondition, expected result dạng bullet...",
    improveSkillNotes: "Ghi nhớ cải tiến",
    improveSkillPlaceholder: "Những điều user đã chỉnh và muốn app ghi nhớ cho lần sau",
    testCaseGuidelines: "Cách viết test case",
    testCaseGuidelinesPlaceholder: "Các đầu mục, format step, rule đặt tên, priority, coverage tag...",
    testDesignGuidelines: "Cách làm test design",
    testDesignGuidelinesPlaceholder: "Cách chia branch, rule Out of scope, risk lens, edge case...",
    aiSecretNote: "AI API key đã lưu chỉ dùng ở server; browser không đọc lại key đã lưu.",
    aiFootnote: "API key và guideline được lưu mã hoá theo account. Base URL chính thức `api.openai.com` dùng Responses API; các OpenAI-compatible/custom proxy như llmproxy dùng Chat Completions. Khi bật AI Settings, app bắt buộc gọi AI provider thành công; nếu lỗi sẽ báo lỗi thay vì dùng fallback local.",
    runEyebrow: "Workspace tự động hóa QC / QA",
    runTitleEmpty: "Nhập Jira task để bắt đầu",
    draftResultTitle: "Kết quả draft",
    draftResultHelp: "Review test case/test design trước. Nguồn Jira, doc và góc nhìn thiết kế được thu gọn bên dưới để mở lại khi cần sửa.",
    sourceConfigTitle: "Nguồn & cấu hình task",
    sourceConfigHelp: "Jira, Confluence/doc context, archetype và góc nhìn thiết kế dùng để tạo draft.",
    editSourceConfig: "Sửa input",
    regenerateDraft: "Tạo lại draft",
    autoArchetype: "Tự chọn archetype",
    generateDraft: "Tạo draft",
    improveDraftTitle: "Tinh chỉnh draft bằng AI",
    improveDraftHelp: "AI sẽ cập nhật test case/test design bên dưới theo yêu cầu tinh chỉnh trước, sau đó mới tạo đề xuất cải thiện Prompt AI để bạn xem và tự quyết định lưu.",
    improveDraftInput: "Yêu cầu tinh chỉnh",
    improveDraftPlaceholder: "Ví dụ: Bổ sung negative case cho thiếu auth Confluence, title viết rõ risk hơn, bỏ case trùng...",
    aiSettingsImproveTitle: "Improve prompt AI",
    aiSettingsImproveHelp: "Dùng khi muốn cải thiện riêng prompt trong Cài đặt AI. AI tạo đề xuất Trước/Sau; chỉ khi bạn áp dụng thì app mới lưu prompt mới.",
    aiSettingsImproveInput: "Yêu cầu improve prompt",
    aiSettingsImprovePlaceholder: "Ví dụ: Test case title cần nêu rõ risk hơn, expected result phải kiểm được, test design cần thêm branch regression...",
    improveDraftButton: "Tinh chỉnh draft & gợi ý prompt AI",
    improvePromptButton: "Improve prompt bằng AI",
    improvePromptRequiresInput: "Cần nhập yêu cầu tinh chỉnh trước khi chạy AI.",
    improveDraftDonePrefix: "Đã tinh chỉnh draft theo yêu cầu",
    improvePromptDonePrefix: "Đã cải thiện prompt từ yêu cầu tinh chỉnh",
    improvePromptSavedToAiSettings: "Đã lưu vào Cài đặt AI và tạo lịch sử chỉnh sửa.",
    improvePromptUpdatedFields: "Đã cập nhật",
    promptImprovePreviewTitle: "Đề xuất cải thiện prompt",
    promptImprovePreviewHelp: "Kiểm tra nội dung Trước/Sau. Prompt mới chỉ được lưu khi bạn bấm áp dụng.",
    promptImprovePreviewReady: "AI đã tạo đề xuất cải thiện prompt. Hãy kiểm tra Trước/Sau trước khi áp dụng.",
    draftPromptProposalReady: "AI đã tạo đề xuất cập nhật Prompt AI từ cách tinh chỉnh task này. Hãy kiểm tra Trước/Sau trước khi lưu.",
    draftImproveAndPromptReady: "Đã cập nhật draft theo yêu cầu và tạo đề xuất Prompt AI để bạn xem trước.",
    applyPromptImprove: "Áp dụng & lưu",
    applyPromptImproveAndRegenerate: "Áp dụng và tạo lại draft",
    discardPromptImprove: "Bỏ đề xuất",
    promptImproveApplied: "Đã áp dụng prompt mới và lưu lịch sử chỉnh sửa.",
    improveRequiresDraft: "Cần tạo draft trước khi tinh chỉnh bằng AI.",
    improveRequiresAi: "Cần bật AI Settings và có API key/model để dùng tính năng AI này.",
    improvePromptRegeneratedDraft: "Đã tạo lại draft mới bằng prompt vừa cải thiện.",
    aiSettingsPendingImprove: "AI vừa cập nhật prompt trong Cài đặt AI. Mở Lịch sử chỉnh sửa để xem Trước/Sau.",
    aiImprovedBadge: "AI cải thiện",
    aiSettingsUnsavedGuard: "Có thể mở Lịch sử chỉnh sửa để xem lại nội dung Trước/Sau.",
    aiSettingsHistory: "Lịch sử chỉnh sửa",
    noAiSettingsHistory: "Chưa có lịch sử chỉnh sửa Cài đặt AI.",
    historyBefore: "Trước",
    historyAfter: "Sau",
    historyManualSave: "Lưu thủ công",
    historyAiPromptImprove: "AI improve prompt",
    historyChangedItems: "mục thay đổi",
    historyExpandChange: "Mở rộng so sánh",
    historyCompareTitle: "So sánh thay đổi",
    restorePrevious: "Khôi phục bản trước",
    restorePreviousTitle: "Đưa nội dung Trước vào form, chưa lưu ngay",
    readinessTitle: "Sẵn sàng tạo draft",
    qualityTitle: "Kiểm tra chất lượng draft",
    qualityGood: "Bộ test đang đạt các checkpoint chính.",
    coverageTitle: "Ma trận coverage",
    caseFilterLabel: "Lọc theo risk",
    allCases: "Tất cả",
    happyPath: "Happy path",
    negativePath: "Negative",
    edgeCase: "Edge",
    regression: "Regression",
    authRisk: "Auth",
    validationRisk: "Validation",
    docCoverage: "Doc coverage",
    pipelineTitle: "Pipeline chạy QA",
    designPreview: "Preview PNG test design",
    projectAdvanced: "Cấu hình nâng cao",
    knowledgeSearch: "Tìm kiến thức",
    knowledgeSearchPlaceholder: "Tìm theo nguyên lý, kỹ thuật, risk, ví dụ...",
    bookmark: "Bookmark",
    bookmarked: "Đã lưu",
    applyToAiPrompt: "Dùng làm prompt rule",
    appliedKnowledgePrompt: "Đã đưa kiến thức này vào Yêu cầu improve prompt trong Cài đặt AI.",
    testConnection: "Test connection",
    connectionOk: "Kết nối thành công",
    chatwootUatEyebrow: "OmniAgent UAT automation",
    chatwootUatTitle: "Chạy Chatwoot UAT từ skill OmniAgent",
    chatwootUatIntro: "Chọn bộ test Chatwoot UAT, chạy thật trên UAT, rồi xem conversation/report ngay trong EasyForQC.",
    chatwootSkillStatus: "Trạng thái skill",
    chatwootSkillReady: "Đã tìm thấy skill chatwoot-test-uat.",
    chatwootSkillMissing: "Chưa tìm thấy skill. Cần mount OmniAgent repo hoặc cấu hình CHATWOOT_UAT_SKILL_ROOT.",
    chatwootSuite: "Bộ test sẽ chạy",
    chatwootRunnerMode: "Kiểu chạy",
    chatwootAdaptiveMode: "Adaptive + AI planner",
    chatwootSuiteMode: "Hỏi đúng data test",
    chatwootRunModeForThisRun: "Cách chạy lượt này",
    chatwootPlannerForThisRun: "Planner lượt này",
    chatwootRunOverrideHint: "Mặc định lấy theo Agent đã lưu; đổi ở đây chỉ áp dụng cho lượt chạy hiện tại.",
    chatwootPlannerDisabledForFixed: "Không dùng Planner khi hỏi đúng data test.",
    chatwootPlannerBackend: "Planner",
    chatwootPlannerAi: "AI planner từ AI Settings",
    chatwootPlannerHeuristic: "Heuristic trong skill",
    chatwootPlannerCodex: "Codex CLI",
    chatwootPlannerAiHelp: "Dùng model/API key trong AI Settings để đọc phản hồi bot thật và quyết định câu chat tiếp theo theo ngữ cảnh. Đây là lựa chọn nên dùng cho kiểm thử thông minh.",
    chatwootPlannerHeuristicHelp: "Dùng luật cố định có sẵn trong skill, không gọi AI. Phù hợp debug nhanh nhưng kém linh hoạt khi bot đổi flow hoặc option.",
    chatwootPlannerCodexHelp: "Dùng Codex CLI làm planner để suy luận lượt chat tiếp theo. Phù hợp dev nội bộ vì phụ thuộc môi trường CLI trên server/local.",
    chatwootPlannerModelSource: "Model planner",
    chatwootPlannerModelAiSettings: "Tự lấy từ Cài đặt AI đã lưu.",
    chatwootPlannerModelMissing: "Chưa có model trong AI Settings",
    chatwootPlannerModelNotUsed: "Không dùng model AI",
    chatwootPlannerModelNotUsedHelp: "Heuristic chạy bằng luật có sẵn nên không cần model hoặc timeout planner.",
    chatwootPlannerCodexModelHelp: "Chỉ dùng khi chọn Codex CLI.",
    chatwootPlannerTimeoutNotUsedHelp: "Heuristic không gọi planner AI nên timeout này không áp dụng.",
    chatwootChatUiMode: "Chế độ Chat UI",
    chatwootChatRealistic: "Chat thật trên UI",
    chatwootChatWebhookOnly: "Chỉ chạy webhook",
    chatwootWebhookUrl: "Webhook URL",
    chatwootHealthcheckUrl: "Healthcheck URL",
    chatwootApiBase: "Web/API base hội thoại",
    chatwootSkipHealthcheck: "Bỏ qua healthcheck",
    chatwootSkipLocalWebhookPost: "Dùng xử lý native của UAT Chatwoot",
    chatwootInboxId: "Inbox ID xử lý",
    chatwootUiInboxId: "Inbox ID hiển thị hội thoại",
    chatwootCaptainAssistantId: "Captain assistant ID",
    chatwootAccountId: "Account ID",
    chatwootCaseId: "Case ID",
    chatwootCaseIndex: "Case index",
    chatwootLimitCases: "Giới hạn số case",
    chatwootCaseSelection: "Chọn case để chạy",
    chatwootCaseSelectionHelp: "Mặc định chạy toàn bộ case trong suite. Bỏ tick những case không muốn chạy hoặc chọn từng case cần chạy.",
    chatwootCaseSearch: "Tìm test case",
    chatwootCaseDetails: "Chi tiết",
    chatwootCaseCollapse: "Thu gọn",
    chatwootOpeningPrompt: "Tin nhắn mở đầu",
    chatwootCaseRunData: "Test data dùng để chạy",
    chatwootCaseSteps: "Các bước / user turns",
    chatwootCaseExpected: "Kết quả mong đợi",
    chatwootCaseStopPatterns: "Điều kiện Pass/Fail",
    chatwootCaseStopPatternsEdit: "Sửa điều kiện Pass/Fail",
    chatwootCaseStopPatternsHelp: "Mỗi dòng là một câu nghiệp vụ. Pass sẽ dừng và đánh dấu đạt; Fail sẽ dừng và đánh dấu lỗi.",
    chatwootCasePassConditions: "Điều kiện Pass",
    chatwootCaseFailConditions: "Điều kiện Fail",
    chatwootCasePlannerContext: "Planner theo ngữ cảnh",
    chatwootCasePlannerContextHelp: "Planner đọc phản hồi bot sau mỗi lượt, đối chiếu test data/steps của case này và chọn câu user tiếp theo phù hợp thay vì chỉ gửi cứng từng dòng.",
    chatwootCaseNoDetails: "Case này chưa có steps/test data chi tiết trong suite.",
    chatwootRunAllCases: "Tất cả case",
    chatwootSelectAllCases: "Chọn tất cả",
    chatwootClearSelection: "Bỏ chọn",
    chatwootSelectedCases: "case được chọn",
    chatwootWillRunAllCases: "Sẽ chạy toàn bộ",
    chatwootNoCaseMetadata: "Suite này chưa có metadata case để chọn từng case; app sẽ chạy theo cấu hình trong suite.",
    chatwootRunConfigSummary: "Cấu hình run cho lượt chạy này",
    chatwootOpenAutomationSettings: "Mở cấu hình automation",
    chatwootStopCase: "Dừng case",
    chatwootSkipPendingCase: "Bỏ case khỏi lượt chạy",
    chatwootCasePending: "Chờ chạy",
    chatwootCaseRunning: "Đang chạy",
    chatwootCaseCompleted: "Đã chạy xong",
    chatwootCaseSkipped: "Đã bỏ qua",
    chatwootCaseInterrupted: "Đã dừng",
    chatwootCaseHandoff: "Chuyển agent",
    chatwootCaseFailed: "Lỗi",
    chatwootCaseLocked: "Case đã khóa theo lượt chạy hiện tại.",
    chatwootCaseStopQueued: "Đã gửi yêu cầu dừng/bỏ test case.",
    chatwootMaxUserTurns: "Số lượt user tối đa",
    chatwootLabels: "Labels",
    chatwootAssigneeName: "Assignee",
    chatwootPinnedConversationId: "Conversation ID cố định",
    chatwootPlannerTimeoutSeconds: "Timeout planner (giây)",
    chatwootRun: "Bắt đầu kiểm thử",
    chatwootStartRun: "Bắt đầu chạy",
    chatwootStopRun: "Dừng chạy",
    chatwootConfirmTitle: "Xác nhận chạy UAT thật",
    chatwootConfirmCopy: "Run này sẽ gửi message thật vào môi trường UAT. Kiểm tra bộ test và case trước khi bắt đầu.",
    chatwootCancelRun: "Hủy",
    chatwootJobQueued: "Đã tạo job Chatwoot UAT. App sẽ tự cập nhật khi có kết quả.",
    chatwootJobRunning: "Đang chạy Chatwoot UAT...",
    chatwootJobFailed: "Chatwoot UAT thất bại.",
    chatwootRunHistory: "Lịch sử run",
    chatwootSuiteSearch: "Tìm suite",
    chatwootStatus: "Trạng thái",
    chatwootNoHistory: "Chưa có lịch sử run Chatwoot UAT.",
    chatwootReloadSuites: "Tải lại bộ test",
    chatwootReloadHistory: "Tải lại lịch sử",
    chatwootResult: "Kết quả Chatwoot UAT",
    chatwootOpenReport: "Mở report HTML",
    chatwootOpenRaw: "Mở raw JSON",
    chatwootOpenYaml: "Mở YAML",
    chatwootConversation: "Hội thoại UAT",
    chatwootPaymentLink: "Link thanh toán",
    chatwootMetricTotal: "Tổng",
    chatwootMetricPass: "Đạt",
    chatwootMetricHandoff: "Chuyển agent",
    chatwootMetricFail: "Lỗi",
    chatwootRunCountUnit: "lượt chạy",
    chatwootNoSuites: "Chưa có bộ test Chatwoot UAT nào.",
    chatwootCodexReady: "Codex CLI đã sẵn sàng.",
    chatwootCodexUnavailable: "Codex CLI chưa có trong môi trường server; nếu chọn Codex CLI, command có thể lỗi. Heuristic vẫn chạy được.",
    chatwootServerAuthReady: "Server đã có Chatwoot UAT API key.",
    chatwootServerAuthMissing: "Server chưa có Chatwoot UAT API key; cần cấu hình env hoặc ~/.skills/config.yml trước khi chạy thật.",
    chatwootPlannerAiReady: "AI planner đã sẵn sàng từ AI Settings.",
    chatwootPlannerAiMissing: "AI planner cần cấu hình đủ model và API key trong AI Settings.",
    chatwootReadiness: "Điều kiện chạy",
    chatwootReady: "Sẵn sàng",
    chatwootNeedConfig: "Cần cấu hình",
    chatwootShowReadiness: "Xem chi tiết",
    chatwootHideReadiness: "Ẩn chi tiết",
    chatwootReadinessHint: "Các trạng thái này chỉ là kiểm tra môi trường hiện tại; chỉnh agent/inbox ở Cấu hình automation, chỉnh AI ở Cài đặt AI, còn API key server nằm trong env hoặc ~/.skills/config.yml.",
    chatwootFailureSummary: "Case lỗi cần kiểm tra",
    chatwootCaseStatusPassed: "Đạt",
    chatwootCaseStatusFailed: "Lỗi",
    chatwootCaseStatusHandoff: "Chuyển agent",
    chatwootFailureReason: "Lý do lỗi",
    chatwootCompletionReason: "Điều kiện kết thúc",
    chatwootFailureHint: "Gợi ý kiểm tra",
    chatwootUnknownFailure: "Không có failure_reason trong report; mở raw JSON hoặc hội thoại UAT để kiểm tra thêm.",
    chatwootRunDone: "Đã chạy Chatwoot UAT xong.",
    chatwootRunStopped: "Đã dừng run Chatwoot UAT.",
    chatwootSuiteBuilderTitle: "Chuẩn bị bộ test automation",
    chatwootSuiteBuilderHelp: "Chọn bộ test đã lưu trong QA Workspace hoặc nhập nhanh một kịch bản user trước khi chạy UAT thật.",
    chatwootSuiteSource: "Nguồn bộ test",
    chatwootSourceWorkspace: "QA Workspace",
    chatwootSourceManual: "Nhập kịch bản",
    chatwootSuiteTitle: "Tên bộ test",
    chatwootWorkspaceItem: "Bộ test trong QA Workspace",
    chatwootManualScenario: "Kịch bản user",
    chatwootManualScenarioPlaceholder: "Nhập yêu cầu để AI tạo test case, ví dụ: Tạo 2 test case đổi vé máy bay sang ngày 20/5...",
    chatwootCreateSuiteFromSource: "Lấy test case để chuẩn bị chạy",
    chatwootAiCreateCases: "AI tạo test case",
    chatwootWorkspacePrepareHint: "Chọn bộ test trong QA Workspace rồi nhấn Lấy test case để chuẩn bị chạy.",
    chatwootManualPrepareHint: "Nhập kịch bản user rồi nhấn AI tạo test case để app sinh đúng số case cần chạy.",
    chatwootSuiteCreated: "Đã lấy test case và sẵn sàng chạy.",
    chatwootSuiteCreatedAi: "AI đã tạo test case và sẵn sàng chạy.",
    chatwootSuiteCreatedFallback: "Chưa có AI Settings sẵn sàng; app đã tạm tạo test case từ kịch bản nhập.",
    taskContext: "Ngữ cảnh task",
    issueKey: "Issue key",
    status: "Trạng thái",
    issueType: "Loại issue",
    jiraProjectKey: "Project key từ Jira",
    summary: "Tóm tắt",
    descriptionAcceptance: "Mô tả / acceptance criteria",
    confluenceDocLinks: "Confluence / doc links",
    confluenceDocLinksPlaceholder: "Mỗi dòng một link Confluence hoặc tài liệu liên quan",
    fetchedDocContext: "Nội dung doc đã fetch / paste thêm",
    fetchedDocContextPlaceholder: "Nội dung Confluence sẽ tự đổ vào đây, hoặc QA có thể paste thủ công nếu link không truy cập được",
    qaNotes: "Ghi chú thêm của QA",
    qaNotesPlaceholder: "Risk, data seed, out of scope, known bug...",
    designLens: "Góc nhìn thiết kế",
    primary: "Chính",
    supporting: "Bổ trợ",
    autoClassification: "Tự phân loại",
    autoClassificationCopy1: "App sẽ đọc summary, description và issue type để chọn archetype gần nhất.",
    autoClassificationCopy2: "QA vẫn có thể đổi archetype trước khi generate lại draft.",
    adaptiveQaPlan: "Kế hoạch QA linh hoạt",
    repoEvidenceUsed: "repo/local evidence snippet được dùng để định hướng draft.",
    openQuestion: "Câu hỏi mở",
    testCasesMetric: "Test case",
    branchesMetric: "Nhánh",
    createdKeysMetric: "Key đã tạo",
    testCasesTab: "Test case",
    testDesignTab: "Test design",
    runTab: "Chạy",
    editableTestCases: "Chỉnh sửa test case",
    editableTestCasesHelp: "Mỗi case giữ schema import được vào Zephyr Scale: precondition, test data, expected result và step-by-step.",
    addCase: "Thêm case",
    deleteTestCase: "Xóa test case",
    caseDetails: "Chi tiết",
    caseCollapse: "Thu gọn",
    title: "Tiêu đề",
    priority: "Mức ưu tiên",
    technique: "Kỹ thuật",
    scenarioType: "Loại scenario",
    objective: "Mục tiêu",
    risk: "Rủi ro",
    requirementRef: "Requirement ref",
    coverageTags: "Coverage tags",
    precondition: "Tiền điều kiện",
    testData: "Dữ liệu test",
    expectedResult: "Kết quả mong đợi",
    steps: "Các bước",
    addStep: "Bước",
    step: "Bước",
    data: "Dữ liệu",
    expected: "Kết quả mong đợi",
    editableXmindOutline: "Chỉnh sửa outline XMind",
    editableXmindHelp: "Branch linh hoạt theo độ phức tạp task; bắt buộc có branch Out of scope.",
    addBranch: "Thêm branch",
    mindmapTitle: "Tiêu đề mindmap",
    branch: "Nhánh",
    deleteBranch: "Xóa branch",
    branchTitle: "Tiêu đề nhánh",
    branchItems: "Mỗi dòng là một bullet",
    automationRun: "Chạy automation",
    automationRunHelp: "Chạy local trước để QA review, sau đó mới attach hoặc tạo dữ liệu thật trên Jira/Zephyr.",
    testDesignRunHelp: "Build file `.xmind` và `.png` từ outline đang chỉnh vào thư mục QA local.",
    buildLocalFiles: "Build file local",
    buildAndAttach: "Build và attach",
    downloadXmind: "Tải XMind",
    downloadPng: "Tải PNG",
    buildBeforeDownload: "Cần Build local files trước khi tải XMind/PNG.",
    testCasesRunHelp: "Tải test cases JSON hoặc tạo Zephyr testcase folder và import toàn bộ case đang chỉnh.",
    downloadJson: "Tải JSON",
    createSuite: "Tạo suite",
    testCasesSaved: "Test cases",
    testCycle: "Test cycle",
    testCycleHelp: "Tạo test cycle và link về Jira task từ testcase keys.",
    caseKeys: "Key testcase",
    createCycle: "Tạo cycle",
    output: "Kết quả",
    emptyOutput: "Kết quả từ API/script sẽ hiển thị ở đây.",
  },
  en: {
    publicQaWorkspace: "Public QA workspace",
    loginCopy: "Sign in to create test cases, test designs, and run Jira/Zephyr automation.",
    email: "Email",
    password: "Password",
    appPasswordPlaceholder: "App password",
    login: "Login",
    loginDivider: "or",
    loginWithGoogle: "Login with Google",
    googleLoginEnabledTitle: "Login with Gmail",
    googleLoginDisabledTitle: "Google login is not configured in .env",
    loginAsideTitle: "Designed for QC/QA review",
    loginAsideCopy: "Enter a Jira task, generate a draft, review the QA content, then build local files or create real data.",
    loginEditableCases: "Editable test cases",
    loginXmindEditor: "XMind outline editor",
    loginAutomation: "Jira/Zephyr automation",
    loadingSession: "Checking login session...",
    changePassword: "Change password",
    changePasswordNote: "The new password will be hashed and stored in Postgres.",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmNewPassword: "Confirm new password",
    cancel: "Cancel",
    updatePassword: "Update password",
    brandSubtitle: "Jira to test case and test design",
    jiraTask: "Jira task",
    jiraUrlIssueKey: "Jira URL or issue key",
    confluenceBaseUrlTask: "Confluence Base URL for this task",
    confluenceBaseUrlPlaceholder: "Optional, for example https://docs.vexere.net or a Confluence page URL",
    confluenceBaseUrlNote: "Leave this empty when the task does not need docs. If you paste a full page URL here, the app will use it as a doc link when fetching.",
    parseButton: "Parse",
    parseTitle: "Read the issue key from the link",
    fetchButton: "Fetch",
    appNavigationLabel: "App navigation",
    generateTask: "Generate Task",
    qaWorkspace: "QA Workspace",
    knowledge: "Knowledge",
    chatwootUat: "Chatwoot UAT",
    workspaceSettings: "Workspace Settings",
    automationSettings: "Automation config",
    automationSettingsHelp: "Create connectors for each conversation website. The run screen only needs a connector, selected cases, and run.",
    automationProfiles: "Saved configs",
    automationProfileName: "Config name",
    automationProfileNamePlaceholder: "Example: Omni UAT - BaoApiInbox",
    chatwootAgents: "Saved UAT agents",
    chatwootAgent: "Processing agent",
    chatwootAgentEditor: "Create / update connector",
    chatwootSavedAgentList: "Saved connectors",
    chatwootAgentName: "Connector name",
    chatwootAgentNamePlaceholder: "Example: Tien Oanh Bus, Vexere Flight, Vexere Train...",
    chatwootNoAgents: "No saved Chatwoot UAT connectors yet. Enter the website, Inbox ID/Captain assistant, then save a connector before running.",
    chatwootAgentRequired: "Choose a saved processing agent from Automation config before preparing or running tests.",
    chatwootSelectedAgent: "Selected agent",
    automationTargetType: "Website/tool type",
    automationTargetChatwoot: "Chatwoot / OmniAgent",
    automationTargetWeb: "Web app",
    automationTargetApi: "API service",
    automationTargetOther: "Other",
    saveAutomationProfile: "Save current config",
    saveChatwootAgent: "Save current connector",
    createConnector: "Create connector",
    editConnector: "Edit",
    cancelConnector: "Back",
    backToConnectors: "Back to connector list",
    applyAutomationProfile: "Apply",
    deleteAutomationProfile: "Delete",
    noAutomationProfiles: "No saved automation configs yet.",
    automationProfileSaved: "Saved automation config",
    automationProfileApplied: "Applied automation config",
    automationProfileDeleted: "Deleted automation config",
    automationProfileDeleteConfirm: "Delete this automation config?",
    automationProfileChangedFields: "Usually changes per website",
    automationProfileStableFields: "Usually stays stable",
    automationProfileChangedFieldsCopy: "Web/API base, server auth, account/inbox/assistant IDs, labels, assignee.",
    automationProfileStableFieldsCopy: "Run mode, AI planner, AI Settings model, timeout, and max user turns.",
    automationConnectorTitle: "Conversation website connector",
    automationConnectorIntro: "Each connector represents one website or bot agent that can run tests. A customer usually provides the conversation console URL, token/API key, and processing IDs.",
    automationConnectorStepPlatform: "1. Choose platform",
    automationConnectorStepPlatformCopy: "Chatwoot/OmniAgent uses the current runner. Other web/API systems need a mapping for sending and reading messages.",
    automationConnectorStepConnection: "2. Enter connection",
    automationConnectorStepConnectionCopy: "Web/API base, server auth, account/inbox/assistant IDs, and the conversation viewer link.",
    automationConnectorStepRun: "3. Save and run",
    automationConnectorStepRunCopy: "After saving, Chatwoot UAT only selects a connector and test set to run automation.",
    automationCustomerNeeds: "Customer should provide",
    automationCustomerNeedLink: "Conversation console URL",
    automationCustomerNeedAuth: "API key/token or login method",
    automationCustomerNeedIds: "Account, inbox, agent/assistant IDs",
    automationCustomerNeedRule: "Pass/fail signal or report link",
    automationConnectionSection: "Conversation website connection",
    automationConnectionHelp: "For Chatwoot/OmniAgent, Web/API base is usually the UAT domain. Webhook/healthcheck are only needed when the runner calls an internal service.",
    automationAgentSection: "Agent / processing channel",
    automationAgentHelp: "The processing inbox decides which bot replies. The visible inbox opens the correct conversation for QA review.",
    automationRunSection: "AI run behavior",
    automationRunBehaviorHelp: "Adaptive + AI planner is best for smart testing. Exact test data is best for fixed regression/debug runs.",
    automationAdvancedSection: "Advanced",
    automationAdvancedHelp: "Labels, assignee, pinned conversation, and toggles are mostly for debugging or special runs.",
    qaWorkspaceEyebrow: "Test artifact library",
    qaWorkspaceTitle: "QA Workspace",
    qaWorkspaceIntro: "Save test cases, test design outlines, and UAT suites so QA can reopen, review, or use them as automation sources.",
    qaWorkspaceEmpty: "No saved test suites in QA Workspace yet.",
    saveToWorkspace: "Save to QA Workspace",
    workspaceSaved: "Saved to QA Workspace.",
    workspaceSavedWithStopPatterns: "Saved to QA Workspace and updated test-case pass/fail conditions.",
    workspaceSavedStopPatternsPartial: "Saved to QA Workspace. Some pass/fail conditions still need AI update.",
    workspaceRefreshStopPatterns: "AI create/update Pass/Fail",
    workspaceStopPatternsUpdated: "Updated QA Workspace pass/fail conditions.",
    workspaceStopPatternsReady: "Pass/Fail ready",
    workspaceRefreshStopPatternsAgain: "AI update Pass/Fail again",
    workspaceStopPatternsNeedUpdate: "need pass/fail update",
    workspaceStopPatternMetric: "Pass/Fail",
    workspaceOpenItem: "Open draft",
    workspaceUseSuite: "Use suite",
    workspaceCreateChatwootSuite: "Create Chatwoot suite",
    workspaceDelete: "Remove from workspace",
    workspaceImportedAi547: "AI-547 was imported from the new OmniAgent reference test cases.",
    workspaceImportedAi548: "AI-548 was imported from the standards-specific Chatwoot UAT suite.",
    workspaceCaseCount: "test cases",
    workspaceBranchCount: "design branches",
    workspaceSuiteReady: "Suite ready",
    knowledgeEyebrow: "QC / QA knowledge base",
    knowledgeTitle: "Tester knowledge base",
    knowledgeIntro: "A compact reference for designing test cases, reviewing scope, and assessing product risk.",
    knowledgeSource: "Reference baseline: ISTQB CTFL v4.0.1 and the ISTQB Glossary.",
    knowledgeAiWriter: "Add with AI",
    knowledgeAiWriterTitle: "Add QA knowledge with AI",
    knowledgeAiWriterHelp: "Enter a topic or notes, then AI creates a Markdown QA knowledge draft for review and saving.",
    knowledgeTopic: "Knowledge topic",
    knowledgeTopicPlaceholder: "Example: Pairwise testing for booking flows",
    knowledgeCategory: "Knowledge category",
    knowledgeAudience: "Application context",
    knowledgeAudiencePlaceholder: "Example: QC testing APIs, chatbots, n8n workflows...",
    knowledgeNotes: "Notes / scope for AI",
    knowledgeNotesPlaceholder: "Internal rules, practical examples, things to avoid, desired format...",
    generateKnowledge: "Generate article",
    saveKnowledge: "Save to Knowledge",
    generatedKnowledgeDraft: "AI draft",
    savedKnowledgeArticles: "Saved articles",
    noSavedKnowledge: "No saved knowledge articles yet.",
    knowledgeAiSettings: "Knowledge AI",
    knowledgeAiPanelHelp: "Configure a separate AI provider for QA knowledge article generation. This can use a different model/API key from test-case generation.",
    applyKnowledgeAiTitle: "Apply Knowledge AI when creating articles",
    applyKnowledgeAiDescription: "On: use the provider/model below. Off: block AI article generation.",
    knowledgeArticleGuidelines: "QA knowledge article guidelines",
    knowledgeArticleGuidelinesPlaceholder: "Example: concise, practical tester examples, prefer ISTQB, do not invent numbers...",
    userMenuLabel: "User menu",
    userFallback: "User",
    languageTarget: "Tiếng Việt",
    themeLight: "Light mode",
    themeDark: "Dark mode",
    logout: "Logout",
    settingsEyebrow: "Workspace configuration",
    project: "Project",
    authentication: "Authentication",
    jiraAuth: "Jira auth",
    confluence: "Confluence",
    aiSettings: "AI Settings",
    projectConfig: "Project config",
    jiraBaseUrl: "Jira base URL",
    projectKey: "Project key",
    testCaseFolderRoot: "Test case folder root",
    testCycleRunRoot: "Test cycle run root",
    testCaseNumbering: "Test case numbering",
    testCaseNumberTemplate: "Number template",
    testCaseNumberTemplateHint: "Use {0000}, {000}, or {n}. Example: AI-{000} displays [AI-001]. If you enter QA only, the app displays [QA_0001].",
    testCaseNumberPreview: "Preview",
    labelPolicy: "Label policy",
    mode: "Mode",
    labelModeCustom: "custom - replace with labels below",
    labelModePassthrough: "passthrough - keep labels from the skill",
    labelModeNone: "none - do not attach labels automatically",
    testCaseRequiredLabels: "Test case required labels",
    testDesignRequiredLabels: "Test design required labels",
    testCaseStatusLabels: "Test case status labels",
    testDesignStatusLabels: "Test design status labels",
    save: "Save",
    user: "User",
    confluenceAuth: "Confluence auth",
    authenticationPanelHelp: "Save credentials used to read Jira, Confluence, and other documentation systems. Saved secrets stay server-side and are never returned to the browser.",
    coreAuth: "Core auth",
    customAuth: "Custom auth",
    customAuthHelp: "Create additional auth configs for other websites/tools. After an auth exists, enable the connectors that should be active.",
    addAuth: "Add auth",
    authName: "Auth name",
    authNamePlaceholder: "Example: Notion, Linear, GitLab Wiki...",
    authBaseUrl: "Website / Base URL",
    authBaseUrlPlaceholder: "https://example.company.com",
    authType: "Auth type",
    authTypeBasic: "Basic user/password",
    authTypeBearer: "Bearer token",
    authTypeApiKey: "API key",
    authEnabled: "Use this auth",
    authNotes: "Usage notes",
    authNotesPlaceholder: "Which team/tool/docs this auth is for, access notes...",
    deleteAuth: "Delete auth",
    noCustomAuth: "No custom auth yet. Click Create auth to add credentials for another website.",
    jiraSecretNote: "Saved Jira secrets are used only on the server; the browser cannot read saved tokens/passwords.",
    confluenceSecretNote: "Saved Confluence secrets are used only on the server; the browser cannot read saved tokens/passwords.",
    confluenceAuthNote: "Only credentials are saved here. Enter the task-specific Base URL in the Jira task section.",
    aiPanelHelp: "When enabled with an API key/model, the app calls the user's AI provider with the default skill prompt and the guidelines below. When disabled, the app uses the built-in generator.",
    applyAiTitle: "Apply AI Settings when generating",
    applyAiDescription: "On: call the AI provider with this user's key. Off: use the built-in local fallback.",
    provider: "Provider",
    baseUrl: "Base URL",
    model: "Model",
    modelPlaceholder: "Enter the model this user wants to use",
    apiKey: "API key",
    apiKeyPlaceholder: "User-specific key",
    aiPromptGuidelines: "Test case/test design prompt",
    aiPromptGuidelinesPlaceholder: DEFAULT_AI_PROMPT_GUIDELINES,
    aiStopConditionGuidelines: "Automation Pass/Fail condition prompt",
    aiStopConditionGuidelinesPlaceholder: "Example: Generate two groups: Pass when the bot reaches the test goal; Fail when the bot errors, goes out of context, or uses wrong data. Visible text must be readable QA sentences; regex is internal only.",
    writingStyle: "Writing style",
    writingStylePlaceholder: "Example: concise writing, clear preconditions, bullet expected results...",
    improveSkillNotes: "Improve skill notes",
    improveSkillPlaceholder: "Things the user adjusted and wants the app to remember next time",
    testCaseGuidelines: "Test case guidelines",
    testCaseGuidelinesPlaceholder: "Sections, step format, naming rules, priority, coverage tags...",
    testDesignGuidelines: "Test design guidelines",
    testDesignGuidelinesPlaceholder: "Branching rules, Out of scope rules, risk lens, edge cases...",
    aiSecretNote: "The saved AI API key is used only on the server; the browser cannot read it.",
    aiFootnote: "API keys and guidelines are encrypted per account. The official `api.openai.com` Base URL uses the Responses API; OpenAI-compatible/custom proxies such as llmproxy use Chat Completions. When AI Settings are enabled, the app must call the AI provider successfully; errors are shown instead of falling back silently.",
    runEyebrow: "QC / QA automation workspace",
    runTitleEmpty: "Enter a Jira task to start",
    draftResultTitle: "Draft results",
    draftResultHelp: "Review test cases/test design first. Jira source, docs, and design lens are collapsed below and can be reopened when needed.",
    sourceConfigTitle: "Task source & config",
    sourceConfigHelp: "Jira, Confluence/doc context, archetype, and design lens used to generate this draft.",
    editSourceConfig: "Edit input",
    regenerateDraft: "Regenerate draft",
    autoArchetype: "Auto archetype",
    generateDraft: "Generate draft",
    improveDraftTitle: "Refine this draft with AI",
    improveDraftHelp: "AI updates the test cases/test design below from your refine request first, then creates an AI prompt improvement proposal for you to review and save manually.",
    improveDraftInput: "Improve request",
    improveDraftPlaceholder: "Example: Add negative cases for missing Confluence auth, make titles risk-specific, remove duplicates...",
    aiSettingsImproveTitle: "Improve AI prompt",
    aiSettingsImproveHelp: "Use this to improve AI Settings prompts independently. AI creates a Before/After proposal; the app saves the new prompt only after you apply it.",
    aiSettingsImproveInput: "Prompt improve request",
    aiSettingsImprovePlaceholder: "Example: Make test case titles risk-specific, make expected results verifiable, add regression branches to test design...",
    improveDraftButton: "Refine draft & suggest AI prompt",
    improvePromptButton: "Improve prompt with AI",
    improvePromptRequiresInput: "Enter an improve request before running AI.",
    improveDraftDonePrefix: "Refined draft from request",
    improvePromptDonePrefix: "Improved prompt from refine request",
    improvePromptSavedToAiSettings: "Saved to AI Settings and created a revision history entry.",
    improvePromptUpdatedFields: "Updated",
    promptImprovePreviewTitle: "Prompt improvement proposal",
    promptImprovePreviewHelp: "Review the Before/After diff. The new prompt is saved only after you apply it.",
    promptImprovePreviewReady: "AI created a prompt improvement proposal. Review Before/After before applying it.",
    draftPromptProposalReady: "AI created a reusable AI prompt proposal from this task refinement. Review Before/After before saving it.",
    draftImproveAndPromptReady: "Updated the draft from your request and created an AI prompt proposal for review.",
    applyPromptImprove: "Apply & save",
    applyPromptImproveAndRegenerate: "Apply and regenerate draft",
    discardPromptImprove: "Discard proposal",
    promptImproveApplied: "Applied the new prompt and saved revision history.",
    improveRequiresDraft: "Generate a draft before improving it with AI.",
    improveRequiresAi: "Enable AI Settings with API key/model before using this AI action.",
    improvePromptRegeneratedDraft: "Regenerated a new draft using the improved prompt.",
    aiSettingsPendingImprove: "AI updated the AI Settings prompt. Open Revision history to review Before/After.",
    aiImprovedBadge: "AI improved",
    aiSettingsUnsavedGuard: "Open Revision history to review the Before/After content.",
    aiSettingsHistory: "Revision history",
    noAiSettingsHistory: "No AI Settings revision history yet.",
    historyBefore: "Before",
    historyAfter: "After",
    historyManualSave: "Manual save",
    historyAiPromptImprove: "AI prompt improve",
    historyChangedItems: "changed fields",
    historyExpandChange: "Open comparison",
    historyCompareTitle: "Change comparison",
    restorePrevious: "Restore before",
    restorePreviousTitle: "Put the Before content back into the form without saving yet",
    readinessTitle: "Ready to generate",
    qualityTitle: "Draft quality check",
    qualityGood: "The suite passes the main quality checkpoints.",
    coverageTitle: "Coverage matrix",
    caseFilterLabel: "Filter by risk",
    allCases: "All",
    happyPath: "Happy path",
    negativePath: "Negative",
    edgeCase: "Edge",
    regression: "Regression",
    authRisk: "Auth",
    validationRisk: "Validation",
    docCoverage: "Doc coverage",
    pipelineTitle: "QA run pipeline",
    designPreview: "Test design PNG preview",
    projectAdvanced: "Advanced settings",
    knowledgeSearch: "Search knowledge",
    knowledgeSearchPlaceholder: "Search by principle, technique, risk, example...",
    bookmark: "Bookmark",
    bookmarked: "Saved",
    applyToAiPrompt: "Use as prompt rule",
    appliedKnowledgePrompt: "Added this knowledge to the AI Settings prompt improve request.",
    testConnection: "Test connection",
    connectionOk: "Connection successful",
    chatwootUatEyebrow: "OmniAgent UAT automation",
    chatwootUatTitle: "Run Chatwoot UAT from the OmniAgent skill",
    chatwootUatIntro: "Select a Chatwoot UAT test set, run it against UAT, then review the conversation/report in EasyForQC.",
    chatwootSkillStatus: "Skill status",
    chatwootSkillReady: "Found the chatwoot-test-uat skill.",
    chatwootSkillMissing: "Skill not found. Mount the OmniAgent repo or configure CHATWOOT_UAT_SKILL_ROOT.",
    chatwootSuite: "Test set to run",
    chatwootRunnerMode: "Run mode",
    chatwootAdaptiveMode: "Adaptive + AI planner",
    chatwootSuiteMode: "Use exact test data",
    chatwootRunModeForThisRun: "Run behavior",
    chatwootPlannerForThisRun: "Planner for this run",
    chatwootRunOverrideHint: "Defaults come from the saved Agent; changes here apply only to the current run.",
    chatwootPlannerDisabledForFixed: "Planner is not used when running exact test data.",
    chatwootPlannerBackend: "Planner",
    chatwootPlannerAi: "AI planner from AI Settings",
    chatwootPlannerHeuristic: "Skill heuristic",
    chatwootPlannerCodex: "Codex CLI",
    chatwootPlannerAiHelp: "Uses the model/API key from AI Settings to read real bot replies and decide the next user message from context. This is the recommended smart-testing mode.",
    chatwootPlannerHeuristicHelp: "Uses fixed rules inside the skill without calling AI. Useful for quick debugging, but less flexible when the bot flow or options change.",
    chatwootPlannerCodexHelp: "Uses Codex CLI as the planner for the next chat turn. Best for internal development because it depends on CLI availability on the server/local machine.",
    chatwootPlannerModelSource: "Planner model",
    chatwootPlannerModelAiSettings: "Automatically uses the saved AI Settings model.",
    chatwootPlannerModelMissing: "No model in AI Settings",
    chatwootPlannerModelNotUsed: "No AI model used",
    chatwootPlannerModelNotUsedHelp: "Heuristic mode runs fixed rules, so it does not need a model or planner timeout.",
    chatwootPlannerCodexModelHelp: "Only used when Codex CLI is selected.",
    chatwootPlannerTimeoutNotUsedHelp: "Heuristic does not call an AI planner, so this timeout does not apply.",
    chatwootChatUiMode: "Chat UI mode",
    chatwootChatRealistic: "Realistic UI chat",
    chatwootChatWebhookOnly: "Webhook only",
    chatwootWebhookUrl: "Webhook URL",
    chatwootHealthcheckUrl: "Healthcheck URL",
    chatwootApiBase: "Conversation Web/API base",
    chatwootSkipHealthcheck: "Skip healthcheck",
    chatwootSkipLocalWebhookPost: "Use native UAT Chatwoot processing",
    chatwootInboxId: "Processing inbox ID",
    chatwootUiInboxId: "Visible conversation inbox ID",
    chatwootCaptainAssistantId: "Captain assistant ID",
    chatwootAccountId: "Account ID",
    chatwootCaseId: "Case ID",
    chatwootCaseIndex: "Case index",
    chatwootLimitCases: "Limit cases",
    chatwootCaseSelection: "Select cases to run",
    chatwootCaseSelectionHelp: "By default the app runs every case in the suite. Uncheck cases you do not want to run or select only the cases needed.",
    chatwootCaseSearch: "Search test cases",
    chatwootCaseDetails: "Details",
    chatwootCaseCollapse: "Collapse",
    chatwootOpeningPrompt: "Opening prompt",
    chatwootCaseRunData: "Test data used for the run",
    chatwootCaseSteps: "Steps / user turns",
    chatwootCaseExpected: "Expected result",
    chatwootCaseStopPatterns: "Pass/Fail conditions",
    chatwootCaseStopPatternsEdit: "Edit Pass/Fail conditions",
    chatwootCaseStopPatternsHelp: "One business sentence per line. Pass stops and marks the case passed; Fail stops and marks the case failed.",
    chatwootCasePassConditions: "Pass conditions",
    chatwootCaseFailConditions: "Fail conditions",
    chatwootCasePlannerContext: "Context-aware planner",
    chatwootCasePlannerContextHelp: "The planner reads each real bot reply, compares it with this case's test data/steps, then chooses the next suitable user message instead of blindly sending fixed lines.",
    chatwootCaseNoDetails: "This case does not include detailed steps/test data in the suite.",
    chatwootRunAllCases: "All cases",
    chatwootSelectAllCases: "Select all",
    chatwootClearSelection: "Clear selection",
    chatwootSelectedCases: "selected cases",
    chatwootWillRunAllCases: "Will run all",
    chatwootNoCaseMetadata: "This suite has no case metadata for per-case selection; the app will run the suite configuration.",
    chatwootRunConfigSummary: "Run config for this test run",
    chatwootOpenAutomationSettings: "Open automation config",
    chatwootStopCase: "Stop case",
    chatwootSkipPendingCase: "Remove case from this run",
    chatwootCasePending: "Pending",
    chatwootCaseRunning: "Running",
    chatwootCaseCompleted: "Completed",
    chatwootCaseSkipped: "Skipped",
    chatwootCaseInterrupted: "Stopped",
    chatwootCaseHandoff: "Handoff",
    chatwootCaseFailed: "Failed",
    chatwootCaseLocked: "This case is locked by the current run.",
    chatwootCaseStopQueued: "Sent the stop/remove request for this test case.",
    chatwootMaxUserTurns: "Max user turns",
    chatwootLabels: "Labels",
    chatwootAssigneeName: "Assignee",
    chatwootPinnedConversationId: "Pinned conversation ID",
    chatwootPlannerTimeoutSeconds: "Planner timeout seconds",
    chatwootRun: "Start test run",
    chatwootStartRun: "Start run",
    chatwootStopRun: "Stop run",
    chatwootConfirmTitle: "Confirm real UAT run",
    chatwootConfirmCopy: "This run will send real messages into UAT. Check the test set and cases before starting.",
    chatwootCancelRun: "Cancel",
    chatwootJobQueued: "Created the Chatwoot UAT job. The app will update when results are ready.",
    chatwootJobRunning: "Chatwoot UAT is running...",
    chatwootJobFailed: "Chatwoot UAT failed.",
    chatwootRunHistory: "Run history",
    chatwootSuiteSearch: "Search suites",
    chatwootStatus: "Status",
    chatwootNoHistory: "No Chatwoot UAT run history yet.",
    chatwootReloadSuites: "Reload suites",
    chatwootReloadHistory: "Reload history",
    chatwootResult: "Chatwoot UAT result",
    chatwootOpenReport: "Open HTML report",
    chatwootOpenRaw: "Open raw JSON",
    chatwootOpenYaml: "Open YAML",
    chatwootConversation: "UAT conversation",
    chatwootPaymentLink: "Payment link",
    chatwootMetricTotal: "Total",
    chatwootMetricPass: "Pass",
    chatwootMetricHandoff: "Handoff",
    chatwootMetricFail: "Fail",
    chatwootRunCountUnit: "runs",
    chatwootNoSuites: "No Chatwoot UAT test sets found.",
    chatwootCodexReady: "Codex CLI is ready.",
    chatwootCodexUnavailable: "Codex CLI is not available in the server environment; choosing Codex CLI may fail. Heuristic mode can still run.",
    chatwootServerAuthReady: "Server has the Chatwoot UAT API key.",
    chatwootServerAuthMissing: "Server does not have the Chatwoot UAT API key; configure env or ~/.skills/config.yml before a real run.",
    chatwootPlannerAiReady: "AI planner is ready from AI Settings.",
    chatwootPlannerAiMissing: "AI planner needs model and API key in AI Settings.",
    chatwootReadiness: "Run readiness",
    chatwootReady: "Ready",
    chatwootNeedConfig: "Needs config",
    chatwootShowReadiness: "Show details",
    chatwootHideReadiness: "Hide details",
    chatwootReadinessHint: "These statuses are checks against the current environment; edit agent/inbox in Automation config, edit AI in AI Settings, and server API keys in env or ~/.skills/config.yml.",
    chatwootFailureSummary: "Failed cases to inspect",
    chatwootCaseStatusPassed: "Passed",
    chatwootCaseStatusFailed: "Failed",
    chatwootCaseStatusHandoff: "Handoff",
    chatwootFailureReason: "Failure reason",
    chatwootCompletionReason: "Completion reason",
    chatwootFailureHint: "Check hint",
    chatwootUnknownFailure: "No failure_reason was returned in the report; open raw JSON or the UAT conversation for more detail.",
    chatwootRunDone: "Chatwoot UAT run finished.",
    chatwootRunStopped: "Stopped the Chatwoot UAT run.",
    chatwootSuiteBuilderTitle: "Prepare automation test set",
    chatwootSuiteBuilderHelp: "Use a saved QA Workspace test set or enter a quick user scenario before running real UAT.",
    chatwootSuiteSource: "Test set source",
    chatwootSourceWorkspace: "QA Workspace",
    chatwootSourceManual: "Manual scenario",
    chatwootSuiteTitle: "Test set name",
    chatwootWorkspaceItem: "QA Workspace item",
    chatwootManualScenario: "User scenario",
    chatwootManualScenarioPlaceholder: "Enter an AI prompt, for example: Create 2 test cases for changing a flight ticket to May 20...",
    chatwootCreateSuiteFromSource: "Load test cases to prepare run",
    chatwootAiCreateCases: "AI create test cases",
    chatwootWorkspacePrepareHint: "Select a QA Workspace test set, then load test cases to prepare the run.",
    chatwootManualPrepareHint: "Enter a user scenario, then let AI create the exact test cases to run.",
    chatwootSuiteCreated: "Loaded test cases and ready to run.",
    chatwootSuiteCreatedAi: "AI created test cases and they are ready to run.",
    chatwootSuiteCreatedFallback: "AI Settings are not ready; the app created temporary test cases from the scenario.",
    taskContext: "Task context",
    issueKey: "Issue key",
    status: "Status",
    issueType: "Issue type",
    jiraProjectKey: "Project key from Jira",
    summary: "Summary",
    descriptionAcceptance: "Description / acceptance criteria",
    confluenceDocLinks: "Confluence / doc links",
    confluenceDocLinksPlaceholder: "One Confluence or related document link per line",
    fetchedDocContext: "Fetched / pasted document content",
    fetchedDocContextPlaceholder: "Confluence content will be filled automatically, or QA can paste it manually if the link is inaccessible",
    qaNotes: "Additional QA notes",
    qaNotesPlaceholder: "Risk, data seed, out of scope, known bug...",
    designLens: "Design lens",
    primary: "Primary",
    supporting: "Supporting",
    autoClassification: "Auto classification",
    autoClassificationCopy1: "The app reads the summary, description, and issue type to choose the closest archetype.",
    autoClassificationCopy2: "QA can still change the archetype before regenerating the draft.",
    adaptiveQaPlan: "Adaptive QA plan",
    repoEvidenceUsed: "repo/local evidence snippet was used to guide the draft.",
    openQuestion: "Open question",
    testCasesMetric: "Test cases",
    branchesMetric: "Branches",
    createdKeysMetric: "Created keys",
    testCasesTab: "Test cases",
    testDesignTab: "Test design",
    runTab: "Run",
    editableTestCases: "Editable test cases",
    editableTestCasesHelp: "Each case keeps the Zephyr Scale import schema: precondition, test data, expected result, and step-by-step details.",
    addCase: "Add case",
    deleteTestCase: "Delete test case",
    caseDetails: "Details",
    caseCollapse: "Collapse",
    title: "Title",
    priority: "Priority",
    technique: "Technique",
    scenarioType: "Scenario type",
    objective: "Objective",
    risk: "Risk",
    requirementRef: "Requirement ref",
    coverageTags: "Coverage tags",
    precondition: "Precondition",
    testData: "Test Data",
    expectedResult: "Expected Result",
    steps: "Steps",
    addStep: "Step",
    step: "Step",
    data: "Data",
    expected: "Expected",
    editableXmindOutline: "Editable XMind outline",
    editableXmindHelp: "Branches adapt to task complexity; the Out of scope branch is required.",
    addBranch: "Add branch",
    mindmapTitle: "Mindmap title",
    branch: "Branch",
    deleteBranch: "Delete branch",
    branchTitle: "Branch title",
    branchItems: "Items, one bullet per line",
    automationRun: "Automation run",
    automationRunHelp: "Run locally first for QA review, then attach or create real Jira/Zephyr data.",
    testDesignRunHelp: "Build `.xmind` and `.png` files from the current outline into the local QA folder.",
    buildLocalFiles: "Build local files",
    buildAndAttach: "Build and attach",
    downloadXmind: "Download XMind",
    downloadPng: "Download PNG",
    buildBeforeDownload: "Build local files before downloading XMind/PNG.",
    testCasesRunHelp: "Download the test cases JSON or create a Zephyr testcase folder and import all edited cases.",
    downloadJson: "Download JSON",
    createSuite: "Create suite",
    testCasesSaved: "Test cases",
    testCycle: "Test cycle",
    testCycleHelp: "Create a test cycle and link it back to the Jira task from testcase keys.",
    caseKeys: "Case keys",
    createCycle: "Create cycle",
    output: "Output",
    emptyOutput: "API/script output will appear here.",
  },
} as const;

type UiText = Record<keyof (typeof UI_TEXT)["vi"], string>;

function formatHistoryDate(value: string, language: LanguageMode) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function aiHistorySourceLabel(source: string, ui: UiText) {
  return source === "ai_prompt_improve" ? ui.historyAiPromptImprove : ui.historyManualSave;
}

function aiImproveFieldLabel(field: AiImproveField, ui: UiText) {
  const labels: Record<AiImproveField, string> = {
    promptGuidelines: ui.aiPromptGuidelines,
  };
  return labels[field];
}

function promptImproveNoticeClass(status: string, ui: UiText) {
  const isOk =
    status.startsWith(ui.improveDraftDonePrefix) ||
    status.startsWith(ui.improvePromptDonePrefix) ||
    status.startsWith(ui.draftPromptProposalReady) ||
    status.startsWith(ui.draftImproveAndPromptReady) ||
    status.startsWith(ui.promptImprovePreviewReady) ||
    status.startsWith(ui.promptImproveApplied);
  return isOk ? "notice ok improve-status" : "notice improve-status";
}

const AI_IMPROVE_FIELD_SET = new Set<AiImproveField>(["promptGuidelines"]);

function normalizeAiImproveField(value: unknown): AiImproveField {
  const raw = typeof value === "string" ? value : "";
  return AI_IMPROVE_FIELD_SET.has(raw as AiImproveField) ? (raw as AiImproveField) : "promptGuidelines";
}

function normalizePromptImproveUpdates(payload: PromptImproveResponse): PromptImproveUpdate[] {
  const fromUpdates = Array.isArray(payload.updates)
    ? payload.updates
        .map((update) => ({
          targetField: normalizeAiImproveField(update?.targetField),
          improvedPrompt: typeof update?.improvedPrompt === "string" ? update.improvedPrompt.trim() : "",
        }))
        .filter((update) => Boolean(update.improvedPrompt))
    : [];
  if (fromUpdates.length) return fromUpdates;
  const improvedPrompt = typeof payload.improvedPrompt === "string" ? payload.improvedPrompt.trim() : "";
  return improvedPrompt
    ? [
        {
          targetField: normalizeAiImproveField(payload.targetField),
          improvedPrompt,
        },
      ]
    : [];
}

type DiffSegment = {
  kind: "equal" | "delete" | "insert";
  text: string;
};

function tokenizeDiffText(value: string) {
  return value.split(/(\s+)/).filter(Boolean);
}

function appendDiffSegment(segments: DiffSegment[], kind: DiffSegment["kind"], text: string) {
  if (!text) return;
  const previous = segments[segments.length - 1];
  if (previous?.kind === kind) {
    previous.text += text;
    return;
  }
  segments.push({ kind, text });
}

function diffTextSegments(beforeValue: string, afterValue: string): DiffSegment[] {
  const before = tokenizeDiffText(beforeValue);
  const after = tokenizeDiffText(afterValue);
  if (!before.length && !after.length) return [];
  const dp = Array.from({ length: before.length + 1 }, () => new Uint16Array(after.length + 1));
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      dp[i][j] = before[i] === after[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      appendDiffSegment(segments, "equal", after[j]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      appendDiffSegment(segments, "delete", before[i]);
      i += 1;
    } else {
      appendDiffSegment(segments, "insert", after[j]);
      j += 1;
    }
  }
  while (i < before.length) {
    appendDiffSegment(segments, "delete", before[i]);
    i += 1;
  }
  while (j < after.length) {
    appendDiffSegment(segments, "insert", after[j]);
    j += 1;
  }
  return segments;
}

function DiffText(props: { before: string; after: string; className?: string }) {
  const before = props.before || "";
  const after = props.after || "";
  const segments = diffTextSegments(before, after);
  return (
    <pre className={`history-diff-render ${props.className || ""}`}>
      {segments.length
        ? segments.map((segment, index) => (
            <span className={`diff-${segment.kind}`} key={`${segment.kind}-${index}`}>
              {segment.text}
            </span>
          ))
        : "(empty)"}
    </pre>
  );
}

function PromptImprovePreview(props: {
  ui: UiText;
  proposal: PromptImproveProposal;
  applyLabel: string;
  busy: boolean;
  onCompare: () => void;
  onApply: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="prompt-improve-preview">
      <div className="section-heading compact-heading prompt-improve-preview-heading">
        <div>
          <h3>{props.ui.promptImprovePreviewTitle}</h3>
          <p>{props.ui.promptImprovePreviewHelp}</p>
        </div>
        <button
          className="tiny prompt-compare-button"
          type="button"
          onClick={props.onCompare}
          title={props.ui.historyExpandChange}
          aria-label={props.ui.historyExpandChange}
        >
          <Maximize2 size={14} />
          {props.ui.historyExpandChange}
        </button>
      </div>
      <div className="history-diff-grid prompt-improve-diff">
        <div>
          <span>{props.ui.historyBefore}</span>
          <pre>{props.proposal.beforePrompt || "(empty)"}</pre>
        </div>
        <div>
          <span>{props.ui.historyAfter}</span>
          <DiffText before={props.proposal.beforePrompt} after={props.proposal.nextAiSettings.promptGuidelines} />
        </div>
      </div>
      <div className="button-row prompt-improve-preview-actions">
        <IconButton icon={props.busy ? <Loader2 className="spin" size={16} /> : <Save size={16} />} onClick={props.onApply} disabled={props.busy} variant="primary">
          {props.applyLabel}
        </IconButton>
        <IconButton icon={<X size={16} />} onClick={props.onDiscard} disabled={props.busy}>
          {props.ui.discardPromptImprove}
        </IconButton>
      </div>
    </div>
  );
}

type KnowledgeCard = {
  title: string;
  description: string;
  points: string[];
  example?: string;
};

type KnowledgeContent = {
  nav: string;
  title: string;
  summary: string;
  cards: KnowledgeCard[];
};

const KNOWLEDGE_CONTENT: Record<LanguageMode, Record<StaticKnowledgeSection, KnowledgeContent>> = {
  vi: {
    principles: {
      nav: "7 nguyên lý kiểm thử",
      title: "7 nguyên lý kiểm thử",
      summary: "Dùng để nhắc QA không rơi vào bẫy kiểm thử quá hẹp, kiểm thử quá muộn hoặc tin rằng toàn bộ ca đều đạt nghĩa là sản phẩm không còn lỗi.",
      cards: [
        {
          title: "Kiểm thử cho thấy lỗi có thể tồn tại",
          description: "Kiểm thử giúp phát hiện lỗi, nhưng không thể chứng minh hệ thống hoàn toàn sạch lỗi.",
          points: ["Toàn bộ ca kiểm thử đều đạt chỉ nói rằng chưa tìm thấy lỗi trong phạm vi đã kiểm.", "Khi rủi ro cao, cần bổ sung kiểm thử thăm dò, kiểm thử âm và hồi quy thay vì chỉ tin vào luồng thành công."],
          example: "Một luồng thanh toán đạt 20 ca kiểm thử vẫn có thể lỗi ở tổ hợp ngân hàng, hết thời gian chờ hoặc thử lại chưa được bao phủ.",
        },
        {
          title: "Không thể kiểm thử vét cạn",
          description: "Số tổ hợp đầu vào, trạng thái, thiết bị, quyền và dữ liệu thường quá lớn để kiểm thử toàn bộ.",
          points: ["Ưu tiên theo rủi ro, mức ảnh hưởng và tần suất sử dụng.", "Dùng phân vùng tương đương, giá trị biên và kiểm thử cặp để chọn đại diện thay vì liệt kê vô hạn ca."],
        },
        {
          title: "Kiểm thử càng sớm càng tiết kiệm",
          description: "Rà soát yêu cầu, tiêu chí chấp nhận, thiết kế và hợp đồng API sớm giúp giảm chi phí sửa lỗi về sau.",
          points: ["QA nên bắt đầu từ giai đoạn làm rõ yêu cầu, không đợi bản dựng xong.", "Phạm vi thiếu, câu chữ mơ hồ và quy tắc xung đột nên được nêu ra trước khi lập trình viên triển khai."],
        },
        {
          title: "Lỗi thường tập trung theo cụm",
          description: "Một vài mô-đun, điểm tích hợp hoặc quy tắc phức tạp thường chứa phần lớn lỗi.",
          points: ["Theo dõi lịch sử lỗi để chọn vùng cần kiểm thử hồi quy sâu.", "Mô-đun hay lỗi cần thêm dữ liệu kiểm thử, nhật ký, giám sát và danh sách kiểm tra riêng."],
        },
        {
          title: "Nghịch lý thuốc trừ sâu",
          description: "Một bộ kiểm thử lặp lại mãi sẽ giảm dần hiệu quả trong việc phát hiện lỗi mới.",
          points: ["Cập nhật ca kiểm thử theo lỗi mới, thay đổi quy tắc nghiệp vụ và hành vi người dùng thật.", "Thêm mục tiêu kiểm thử thăm dò sau các bản phát hành có thay đổi lớn."],
        },
        {
          title: "Kiểm thử phụ thuộc ngữ cảnh",
          description: "Chiến lược kiểm thử cho thanh toán, chatbot, giao diện quản trị hay tác vụ chạy lô không giống nhau.",
          points: ["Tác vụ rủi ro cao cần kiểm thử âm, bảo mật, thử lại, kiểm toán và tính nhất quán dữ liệu.", "Tác vụ giao diện nhỏ có thể tập trung trạng thái hiển thị, xác thực dữ liệu, trạng thái rỗng/lỗi/đang tải."],
        },
        {
          title: "Không có lỗi lập trình vẫn có thể sai nhu cầu",
          description: "Sản phẩm có thể chạy đúng đặc tả nhưng đặc tả không giải quyết đúng vấn đề người dùng.",
          points: ["QA cần so kết quả mong đợi với mục tiêu nghiệp vụ, không chỉ so với cách triển khai.", "Nếu tiêu chí chấp nhận thiếu quy tắc quan trọng, ghi giả định hoặc câu hỏi mở trước khi xác nhận hoàn tất."],
        },
      ],
    },
    process: {
      nav: "Quy trình kiểm thử",
      title: "Quy trình kiểm thử chuẩn",
      summary: "Một vòng kiểm thử tốt không bắt đầu từ lúc bấm chạy kiểm thử và không kết thúc ngay khi ca kiểm thử đạt.",
      cards: [
        {
          title: "Lập kế hoạch kiểm thử",
          description: "Xác định phạm vi, mục tiêu, rủi ro, nguồn lực, môi trường, tiêu chí bắt đầu/kết thúc và cách báo cáo.",
          points: ["Đọc tóm tắt Jira, mô tả, tiêu chí chấp nhận, liên kết tài liệu và phụ thuộc.", "Chọn mức kiểm thử phù hợp: smoke test, chức năng, tích hợp, hồi quy hoặc thăm dò."],
        },
        {
          title: "Giám sát và điều khiển kiểm thử",
          description: "Theo dõi tiến độ, điểm nghẽn, xu hướng lỗi và điều chỉnh kiểm thử khi rủi ro thay đổi.",
          points: ["Nếu bản dựng lỗi hoặc thiếu dữ liệu, cập nhật trạng thái sớm.", "Nếu phát hiện vùng rủi ro mới, thêm ca kiểm thử thay vì cố chạy đúng danh sách cũ."],
        },
        {
          title: "Phân tích kiểm thử",
          description: "Phân tích test basis để xác định điều kiện kiểm thử.",
          points: ["Tách quy tắc bắt buộc, tùy chọn, ngoại lệ, quyền, trạng thái và ràng buộc dữ liệu.", "Tìm chỗ mơ hồ: thiếu giá trị mặc định, hết thời gian chờ, phương án dự phòng hoặc kiểm toán."],
        },
        {
          title: "Thiết kế kiểm thử",
          description: "Biến điều kiện kiểm thử thành ca kiểm thử, dữ liệu kiểm thử và kết quả mong đợi cụ thể.",
          points: ["Mỗi ca nên bao phủ một kịch bản rõ mục đích.", "Kết quả mong đợi phải kiểm được, tránh câu chung như hoạt động đúng."],
        },
        {
          title: "Triển khai và thực thi kiểm thử",
          description: "Chuẩn bị dữ liệu/môi trường, chạy kiểm thử, ghi bằng chứng và báo lỗi khi kết quả thực tế khác mong đợi.",
          points: ["Luôn ghi dữ liệu đã dùng, tài khoản, môi trường, phiên bản và thời điểm khi cần truy vết.", "Báo cáo lỗi tốt cần bước thực hiện, kết quả thực tế, kết quả mong đợi, bằng chứng, mức ảnh hưởng và tần suất."],
        },
        {
          title: "Hoàn tất kiểm thử",
          description: "Tổng kết kết quả, lỗi còn mở, rủi ro còn lại và bài học cho kiểm thử hồi quy sau này.",
          points: ["Không chỉ ghi đạt/không đạt; cần nêu rủi ro chưa bao phủ và lý do.", "Ca tạo từ lỗi production nên đưa vào hồi quy nếu còn giá trị."],
        },
      ],
    },
    techniques: {
      nav: "Kỹ thuật thiết kế kiểm thử",
      title: "Kỹ thuật thiết kế ca kiểm thử",
      summary: "Các kỹ thuật này giúp chọn ca kiểm thử có sức bắt lỗi cao mà không cần tăng số lượng một cách máy móc.",
      cards: [
        {
          title: "Phân vùng tương đương",
          description: "Chia đầu vào/đầu ra thành nhóm tương đương; mỗi nhóm chọn đại diện để kiểm thử.",
          points: ["Dùng cho quy tắc theo nhóm tuổi, loại vé, trạng thái đơn, vai trò người dùng.", "Cần có cả phân vùng hợp lệ và không hợp lệ."],
          example: "Tuổi khách: dưới 6, 6-11, từ 12 trở lên, giá trị rỗng hoặc chữ.",
        },
        {
          title: "Phân tích giá trị biên",
          description: "Tập trung quanh điểm biên vì lỗi thường xuất hiện tại giá trị ngay trước, đúng tại và ngay sau ngưỡng.",
          points: ["Dùng cho giá trị nhỏ nhất/lớn nhất, thời hạn, số lượng, trọng lượng, giá tiền.", "Nếu quy tắc là >= 24h, kiểm 23h59, 24h00 và 24h01."],
        },
        {
          title: "Kiểm thử bảng quyết định",
          description: "Dùng bảng điều kiện - kết quả khi nhiều quy tắc kết hợp với nhau.",
          points: ["Phù hợp cho định giá, phân quyền, chính sách, khuyến mãi và điều hướng xử lý.", "Giúp tránh bỏ sót tổ hợp điều kiện quan trọng."],
        },
        {
          title: "Kiểm thử chuyển trạng thái",
          description: "Kiểm tra hệ thống chuyển trạng thái đúng và chặn chuyển trạng thái không hợp lệ.",
          points: ["Dùng cho đặt chỗ, thanh toán, vòng đời vé và quy trình phê duyệt.", "Kiểm cả đường đi hợp lệ, quay lại, thử lại, hủy và thao tác ở trạng thái cuối."],
        },
        {
          title: "Kiểm thử ca sử dụng / kịch bản",
          description: "Mô phỏng luồng người dùng đầu-cuối để kiểm tra luồng nghiệp vụ thực tế.",
          points: ["Dùng cho đặt chỗ, thanh toán, hướng dẫn người dùng mới và chatbot nhiều lượt.", "Cần bao phủ luồng thành công chính, luồng thay thế và luồng ngoại lệ."],
        },
        {
          title: "Kiểm thử hộp trắng",
          description: "Dựa trên cấu trúc mã nguồn/API để kiểm tra câu lệnh, nhánh hoặc đường đi quan trọng.",
          points: ["Hữu ích khi rà soát logic if/else, bộ ánh xạ, bộ phân tích cú pháp, thử lại và dự phòng.", "Không thay thế kiểm thử nghiệp vụ, nhưng giúp bắt nhánh mã bị bỏ sót."],
        },
        {
          title: "Kiểm thử dựa trên kinh nghiệm",
          description: "Dựa trên kinh nghiệm, lịch sử lỗi và hiểu biết miền nghiệp vụ để tìm lỗi khó thấy trong đặc tả.",
          points: ["Đoán lỗi: thử giá trị rỗng, trùng lặp, hết thời gian chờ, dữ liệu cũ, quyền sai.", "Kiểm thử thăm dò: vừa học hệ thống, vừa thiết kế và thực thi kiểm thử có mục tiêu."],
        },
      ],
    },
    levels: {
      nav: "Cấp độ & loại kiểm thử",
      title: "Cấp độ kiểm thử và loại kiểm thử",
      summary: "Phân biệt cấp độ/loại kiểm thử giúp QA không nhầm giữa phạm vi kiểm thử, mục tiêu kiểm thử và kỹ thuật kiểm thử.",
      cards: [
        {
          title: "Kiểm thử thành phần",
          description: "Kiểm tra một đơn vị nhỏ như hàm, thành phần, mô-đun hoặc logic dịch vụ.",
          points: ["Thường gần mã nguồn và có nhiều giả lập.", "Tập trung quy tắc nội bộ, đầu vào biên và logic phân nhánh."],
        },
        {
          title: "Kiểm thử tích hợp",
          description: "Kiểm tra các module/service kết nối đúng với nhau.",
          points: ["Tập trung hợp đồng API, ánh xạ trường, xác thực, thử lại, hết thời gian chờ và tính không đổi kết quả khi gọi lặp.", "Rất quan trọng với Jira, Confluence, Chatwoot, RAG, n8n hoặc cổng thanh toán."],
        },
        {
          title: "Kiểm thử hệ thống",
          description: "Kiểm tra hệ thống hoàn chỉnh từ góc nhìn user hoặc business.",
          points: ["Bao phủ quy trình đầu-cuối, lưu dữ liệu, thông báo và kiểm toán.", "Nên có bộ kiểm thử khói cho bản phát hành nhanh."],
        },
        {
          title: "Kiểm thử chấp nhận",
          description: "Xác nhận hệ thống đáp ứng nhu cầu business và acceptance criteria.",
          points: ["Có thể là UAT, alpha/beta hoặc kiểm thử chấp nhận vận hành.", "QA cần đối chiếu với mục tiêu tác vụ, không chỉ kiểm giao diện/API hoạt động."],
        },
        {
          title: "Kiểm thử chức năng và phi chức năng",
          description: "Kiểm thử chức năng kiểm hành vi nghiệp vụ; kiểm thử phi chức năng kiểm chất lượng như hiệu năng, tính dễ dùng, bảo mật, độ tin cậy.",
          points: ["Tác vụ nhỏ vẫn có thể cần phi chức năng nếu ảnh hưởng tốc độ, bảo mật hoặc khả dụng.", "Ví dụ: không lộ token, không hết thời gian chờ khi tài liệu dài, giao diện không vỡ ở màn nhỏ."],
        },
        {
          title: "Kiểm thử xác nhận và hồi quy",
          description: "Kiểm thử xác nhận kiểm lại lỗi đã sửa; kiểm thử hồi quy xác nhận phần liên quan không bị ảnh hưởng.",
          points: ["Sửa lỗi cần ca tái hiện lỗi gốc và ca xác nhận đã sửa.", "Hồi quy nên chọn vùng gần logic thay đổi, không chạy tràn lan nếu không có rủi ro."],
        },
      ],
    },
    reviews: {
      nav: "Rà soát & kiểm thử tĩnh",
      title: "Kiểm thử tĩnh và rà soát",
      summary: "Kiểm thử tĩnh tìm lỗi trước khi chạy phần mềm, đặc biệt hiệu quả với yêu cầu, hợp đồng API và ca kiểm thử.",
      cards: [
        {
          title: "Rà soát yêu cầu / tiêu chí chấp nhận",
          description: "Tìm mơ hồ, thiếu quy tắc, mâu thuẫn, giả định ẩn và thiếu ngoại lệ.",
          points: ["Câu hỏi tốt: ai được làm, khi nào được làm, dữ liệu thiếu thì sao, lỗi hệ thống phía sau thì sao.", "Tiêu chí chấp nhận tốt phải có kết quả mong đợi kiểm được."],
        },
        {
          title: "Rà soát ca kiểm thử",
          description: "Đảm bảo mỗi case có mục tiêu rõ, dữ liệu test đủ và expected result cụ thể.",
          points: ["Không gom nhiều kịch bản rời rạc vào một ca.", "Tiêu đề phải nói rõ ca bao phủ vấn đề gì, không chỉ copy liên kết Jira hoặc mô tả."],
        },
        {
          title: "Rà soát API / hợp đồng sự kiện",
          description: "Kiểm trường bắt buộc, tùy chọn, enum, khả năng nhận null, tương thích ngược và quyền sở hữu dữ liệu.",
          points: ["Với luồng theo sự kiện, phải kiểm payload tối thiểu, trùng lặp, thử lại và thứ tự xử lý.", "Nhật ký/kiểm toán cần đủ ngữ cảnh để gỡ lỗi sau production."],
        },
        {
          title: "BDD / lập bản đồ ví dụ",
          description: "Dùng ví dụ cụ thể để làm rõ quy tắc nghiệp vụ trước khi viết mã.",
          points: ["Given/When/Then nên diễn tả hành vi, không mô tả cách triển khai.", "Ví dụ tốt phải có dữ liệu cụ thể và kết quả mong đợi rõ ràng."],
        },
      ],
    },
    defects: {
      nav: "Lỗi & báo cáo",
      title: "Báo cáo lỗi và thói quen QA tốt",
      summary: "Báo cáo lỗi tốt giúp lập trình viên tái hiện nhanh, PM hiểu mức ảnh hưởng và team quyết định phát hành rõ ràng.",
      cards: [
        {
          title: "Báo cáo lỗi tối thiểu",
          description: "Một lỗi nên có tiêu đề rõ, môi trường, phiên bản/bản dựng, tiền điều kiện, bước thực hiện, thực tế, mong đợi, bằng chứng và mức ảnh hưởng.",
          points: ["Tiêu đề nên nêu triệu chứng + điều kiện, không viết chung chung.", "Bằng chứng nên gồm ảnh chụp, video, nhật ký hoặc phản hồi API nếu có."],
        },
        {
          title: "Mức độ nghiêm trọng và mức ưu tiên",
          description: "Mức độ nghiêm trọng nói mức ảnh hưởng kỹ thuật/nghiệp vụ; mức ưu tiên nói thứ tự cần xử lý.",
          points: ["Lỗi sập luồng thanh toán production thường có mức độ nghiêm trọng cao.", "Lỗi chính tả nhỏ ở màn ít dùng có thể nghiêm trọng thấp nhưng ưu tiên vẫn tăng nếu sắp demo."],
        },
        {
          title: "Khả năng tái hiện",
          description: "QA cần chỉ rõ lỗi luôn xảy ra, thỉnh thoảng xảy ra hay chỉ xảy ra với data/state cụ thể.",
          points: ["Ghi tài khoản, vai trò, ID dữ liệu, trình duyệt/thiết bị, thời điểm và cờ tính năng nếu liên quan.", "Lỗi chập chờn cần nhật ký và mẫu xảy ra, không chỉ ghi không ổn định."],
        },
        {
          title: "Ghi nhớ hồi quy",
          description: "Lỗi quan trọng nên trở thành kiến thức hồi quy cho các tác vụ sau.",
          points: ["Gắn lỗi với ca kiểm thử hoặc danh sách kiểm tra để không quên.", "Nếu lỗi do yêu cầu mơ hồ, cập nhật hướng dẫn/thiết kế kiểm thử để tránh lặp lại."],
        },
      ],
    },
  },
  en: {
    principles: {
      nav: "7 testing principles",
      title: "7 testing principles",
      summary: "A reminder that passing tests does not prove a product is defect-free, and that test effort must follow risk and context.",
      cards: [
        { title: "Testing can reveal defects", description: "Testing finds evidence of problems, but it cannot prove that no problems remain.", points: ["A fully passing suite only means no defect was found in the tested scope.", "High-risk areas still need negative, exploratory, and regression coverage."], example: "A payment flow can pass normal cases and still fail on bank timeout or retry behavior." },
        { title: "Exhaustive testing is impossible", description: "Input, state, permission, device, and data combinations are usually too large to test completely.", points: ["Prioritize by risk, impact, and usage frequency.", "Use partitioning, boundary values, and pairwise thinking instead of listing endless cases."] },
        { title: "Early testing saves cost", description: "Reviewing requirements, AC, design, and API contracts early reduces late rework.", points: ["QA should join refinement, not only start after a build is ready.", "Raise unclear wording, missing defaults, and conflicting rules before implementation."] },
        { title: "Defects cluster", description: "A small number of modules, integrations, or complex rules often contain most defects.", points: ["Use defect history to choose where regression should go deeper.", "High-defect areas deserve focused data, logs, monitoring, and checklists."] },
        { title: "Old tests lose power", description: "A suite repeated unchanged can stop finding new kinds of defects.", points: ["Refresh tests after new bugs, rule changes, and real user behavior.", "Add exploratory charters after releases with large changes."] },
        { title: "Testing is context-dependent", description: "A payment feature, chatbot, admin UI, and batch workflow need different test strategies.", points: ["High-risk tasks need negative, security, retry, audit, and consistency coverage.", "Small UI tasks may focus on visual states, validation, empty/error/loading states."] },
        { title: "No code defect can still mean wrong product", description: "A system can match the written spec but fail the real user or business need.", points: ["Compare expected behavior with business goals, not only with implementation.", "If AC misses an important rule, capture an assumption or open question before sign-off."] },
      ],
    },
    process: {
      nav: "Test process",
      title: "Standard test process",
      summary: "Good testing starts before execution and continues after the last case is marked pass.",
      cards: [
        { title: "Test planning", description: "Define scope, objectives, risks, resources, environments, entry/exit criteria, and reporting.", points: ["Read the Jira summary, description, AC, docs, and dependencies.", "Choose the right effort: smoke, functional, integration, regression, or exploratory."] },
        { title: "Monitoring & control", description: "Track progress, blockers, defect trends, and adjust test effort when risk changes.", points: ["Report blocked builds or missing data early.", "When a new risk appears, add coverage instead of following an outdated checklist."] },
        { title: "Test analysis", description: "Analyze the test basis to identify test conditions.", points: ["Separate required rules, optional rules, exceptions, permissions, states, and data constraints.", "Look for missing defaults, timeouts, fallbacks, and audit rules."] },
        { title: "Test design", description: "Turn conditions into concrete test cases, data, and expected results.", points: ["Each case should cover one clear scenario.", "Expected results must be checkable, not generic."] },
        { title: "Implementation & execution", description: "Prepare data/env, execute, collect evidence, and log defects when actual differs from expected.", points: ["Record data, account, environment, version, and timestamp when traceability matters.", "A useful bug has steps, actual, expected, evidence, impact, and frequency."] },
        { title: "Completion", description: "Summarize results, open defects, remaining risk, and lessons for future regression.", points: ["Do not only report pass/fail; call out uncovered risks and reasons.", "Production bug cases should be added to regression when still valuable."] },
      ],
    },
    techniques: {
      nav: "Test design techniques",
      title: "Test design techniques",
      summary: "These techniques increase bug-finding power without blindly increasing the number of cases.",
      cards: [
        { title: "Equivalence Partitioning", description: "Split inputs/outputs into equivalent groups and choose representatives.", points: ["Use for age groups, ticket types, order states, or user roles.", "Include both valid and invalid partitions."], example: "Passenger age: under 6, 6-11, 12+, empty value, non-numeric value." },
        { title: "Boundary Value Analysis", description: "Focus around thresholds because defects often appear just before, at, or after boundaries.", points: ["Use for min/max, deadlines, quantity, weight, and money.", "If the rule is >= 24h, test 23:59, 24:00, and 24:01."] },
        { title: "Decision Table Testing", description: "Use condition-result tables when several rules combine.", points: ["Useful for pricing, permission, policy, promotion, and routing.", "Prevents missing important condition combinations."] },
        { title: "State Transition Testing", description: "Verify valid state changes and blocked invalid transitions.", points: ["Use for booking, payment, ticket lifecycle, and approval workflows.", "Test valid paths, rollback, retry, cancel, and actions in final states."] },
        { title: "Use Case / Scenario Testing", description: "Model realistic end-to-end user flows.", points: ["Use for booking, checkout, onboarding, and multi-turn chatbots.", "Cover main success, alternate, and exception paths."] },
        { title: "White-box coverage", description: "Use code/API structure to cover important statements, branches, or paths.", points: ["Useful for if/else logic, mappers, parsers, retry, and fallback.", "It complements business testing; it does not replace it."] },
        { title: "Experience-based testing", description: "Use tester experience, defect history, and domain knowledge to find issues missing from the spec.", points: ["Error guessing: try null, duplicates, timeout, stale data, wrong permission.", "Exploratory testing: learn, design, and execute tests around a focused mission."] },
      ],
    },
    levels: {
      nav: "Levels & types",
      title: "Test levels and test types",
      summary: "Separate the scope of testing from the objective and the technique being used.",
      cards: [
        { title: "Component testing", description: "Test a small unit such as a function, component, module, or service rule.", points: ["Usually close to code and often uses mocks.", "Focus on internal rules, edge inputs, and branch logic."] },
        { title: "Integration testing", description: "Test that modules/services connect and exchange data correctly.", points: ["Focus on API contracts, field mapping, auth, retry, timeout, and idempotency.", "Important for Jira, Confluence, Chatwoot, RAG, n8n, and payment gateways."] },
        { title: "System testing", description: "Test the complete system from a user or business point of view.", points: ["Cover workflow, persistence, notification, and audit.", "Keep a smoke suite for fast release checks."] },
        { title: "Acceptance testing", description: "Confirm the system satisfies business needs and acceptance criteria.", points: ["Can be UAT, alpha/beta, or operational acceptance.", "Compare with the task objective, not only with visible UI/API behavior."] },
        { title: "Functional vs non-functional", description: "Functional testing checks business behavior; non-functional testing checks quality attributes.", points: ["Small tasks may still need performance, security, usability, or reliability checks.", "Examples: no token leakage, no timeout with long docs, UI not broken on small screens."] },
        { title: "Confirmation & regression", description: "Confirmation verifies a fix; regression verifies related behavior is still intact.", points: ["Bug fixes need a reproduction case and a fix confirmation case.", "Regression should follow nearby risk, not expand randomly."] },
      ],
    },
    reviews: {
      nav: "Reviews & static test",
      title: "Static testing and reviews",
      summary: "Static testing finds defects before software execution, especially in requirements, contracts, and test cases.",
      cards: [
        { title: "Requirement / AC review", description: "Find ambiguity, missing rules, contradictions, hidden assumptions, and missing exceptions.", points: ["Ask who can do it, when it is allowed, what happens with missing data, and how downstream failures behave.", "Good AC has checkable expected results."] },
        { title: "Test case review", description: "Ensure each case has a clear purpose, enough test data, and a concrete expected result.", points: ["Do not combine unrelated scenarios into one case.", "The title should explain what the case covers, not copy a Jira link or description."] },
        { title: "API / event contract review", description: "Check required fields, optional fields, enum values, nullability, compatibility, and data ownership.", points: ["Event-driven flows must cover minimum payload, duplicates, retry, and ordering.", "Logs/audit data must include enough context for production debugging."] },
        { title: "BDD / Example mapping", description: "Use concrete examples to clarify business rules before implementation.", points: ["Given/When/Then should describe behavior, not implementation.", "A good example includes concrete data and a clear outcome."] },
      ],
    },
    defects: {
      nav: "Bugs & reporting",
      title: "Defect reporting and strong QA habits",
      summary: "A good bug report helps developers reproduce quickly, PMs understand impact, and the team make release decisions.",
      cards: [
        { title: "Minimum bug report", description: "A bug should include a clear title, environment, version/build, preconditions, steps, actual, expected, evidence, and impact.", points: ["The title should describe symptom and condition.", "Evidence should include screenshots, videos, logs, or API responses when useful."] },
        { title: "Severity and priority", description: "Severity describes business/technical impact; priority describes scheduling urgency.", points: ["A production payment crash is usually high severity.", "A small typo may be low severity but high priority before a demo."] },
        { title: "Reproducibility", description: "State whether the bug always happens, happens intermittently, or needs specific data/state.", points: ["Record account, role, data ID, browser/device, time, and feature flags when relevant.", "Flaky issues need logs and patterns, not only a note that they are unstable."] },
        { title: "Regression memory", description: "Important bugs should become regression knowledge for future tasks.", points: ["Link defects to cases or checklists so they are not forgotten.", "If a bug came from unclear requirements, update guidelines or test design rules."] },
      ],
    },
  },
};

const KNOWLEDGE_SOURCE_LINKS = [
  { label: "ISTQB CTFL v4.0.1 Syllabus", url: "https://www.istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf" },
  { label: "ISTQB Glossary", url: "https://glossary.istqb.org/" },
];

const VI_KNOWLEDGE_DEEP_DIVE: Partial<Record<StaticKnowledgeSection, Record<string, string[]>>> = {
  principles: {
    "Kiểm thử cho thấy lỗi có thể tồn tại": [
      "Theo ISTQB, kiểm thử giúp phát hiện lỗi và cung cấp thông tin về chất lượng, nhưng không phải bằng chứng tuyệt đối rằng hệ thống không còn lỗi.",
      "Khi báo cáo kết quả, QA nên ghi rõ phạm vi đã kiểm, dữ liệu đã dùng, môi trường và rủi ro còn lại để tránh hiểu nhầm “đạt = không còn lỗi”.",
      "Với tính năng có mức ảnh hưởng cao, luôn bổ sung luồng âm, quyền truy cập, hết thời gian chờ, thử lại, dữ liệu biên và hồi quy gần vùng thay đổi.",
    ],
    "Không thể kiểm thử vét cạn": [
      "Kiểm thử vét cạn chỉ khả thi với bài toán cực nhỏ; sản phẩm thật thường có quá nhiều đầu vào, trạng thái, vai trò, trình duyệt, thiết bị và phụ thuộc.",
      "QA cần chọn ca bằng kiểm thử dựa trên rủi ro: ưu tiên nơi có xác suất lỗi cao, mức ảnh hưởng lớn, nghiệp vụ trọng yếu hoặc được người dùng dùng thường xuyên.",
      "Các kỹ thuật như phân vùng tương đương, phân tích giá trị biên, bảng quyết định và kiểm thử cặp giúp giảm số ca nhưng vẫn giữ độ bao phủ có ý nghĩa.",
    ],
    "Kiểm thử càng sớm càng tiết kiệm": [
      "Lỗi yêu cầu hoặc tiêu chí chấp nhận nếu phát hiện ở giai đoạn làm rõ/rà soát thường rẻ hơn nhiều so với phát hiện sau khi dev đã code, deploy và tạo dữ liệu kiểm thử.",
      "QA nên rà soát sớm các quy tắc như giá trị mặc định, xác thực dữ liệu, quyền, kiểm toán, dự phòng, hết thời gian chờ và hành vi khi hệ thống phía sau lỗi.",
      "Một ca kiểm thử tốt có thể bắt đầu từ câu hỏi đúng: “Nếu trường này rỗng?”, “Nếu API hết thời gian chờ?”, “Nếu người dùng không đủ quyền?”, “Nếu dữ liệu bị trùng?”.",
    ],
    "Lỗi thường tập trung theo cụm": [
      "Lỗi thường dồn vào mô-đun phức tạp, mã mới, điểm tích hợp nhiều phụ thuộc hoặc khu vực từng có lỗi trước đó.",
      "Khi có lỗi mới, QA nên hỏi lỗi này thuộc cụm nào: phân tích cú pháp, ánh xạ dữ liệu, phân quyền, chuyển trạng thái, thử lại, cache hay xác thực giao diện.",
      "Kiểm thử hồi quy nên đào sâu vùng liên quan đến cụm lỗi thay vì chạy lan man toàn hệ thống mà không dựa trên rủi ro.",
    ],
    "Nghịch lý thuốc trừ sâu": [
      "Nghịch lý thuốc trừ sâu nhắc rằng một bộ ca lặp lại mãi sẽ quen với lỗi cũ và dễ bỏ sót lỗi mới sinh ra từ thay đổi mới.",
      "Sau mỗi lỗi production hoặc lỗi nghiêm trọng, QA nên cập nhật ca/danh sách kiểm tra để biến lỗi đó thành kiến thức hồi quy.",
      "Khi quy tắc nghiệp vụ đổi, cần rà soát lại tiêu đề, tiền điều kiện, dữ liệu kiểm thử và kết quả mong đợi; không chỉ copy bộ ca cũ sang sprint mới.",
    ],
    "Kiểm thử phụ thuộc ngữ cảnh": [
      "Kiểm thử phụ thuộc ngữ cảnh nghĩa là chiến lược kiểm thử phụ thuộc miền nghiệp vụ, rủi ro, kiến trúc, hạn chót, người dùng, dữ liệu và hậu quả khi lỗi xảy ra.",
      "Chatbot cần ngữ cảnh nhiều lượt và hợp đồng công cụ; thanh toán cần tính không đổi kết quả khi gọi lặp và bảo mật; giao diện quản trị cần vai trò/quyền; quy trình n8n cần thử lại và kiểm toán.",
      "Một tác vụ nhỏ vẫn có thể cần độ bao phủ sâu nếu chạm xác thực, token, thanh toán, dữ liệu khách hàng, tác vụ production hoặc luồng nhiều hệ thống.",
    ],
    "Không có lỗi lập trình vẫn có thể sai nhu cầu": [
      "Ngụy biện “không thấy lỗi” xảy ra khi phần mềm chạy đúng đặc tả nhưng đặc tả không giải quyết đúng nhu cầu nghiệp vụ/người dùng.",
      "QA cần đối chiếu kết quả mong đợi với mục tiêu Jira, tiêu chí chấp nhận, hành vi người dùng và rủi ro vận hành, không chỉ xác nhận giao diện/API trả 200.",
      "Nếu yêu cầu thiếu quy tắc quan trọng, nên ghi giả định/câu hỏi mở và yêu cầu xác nhận trước khi xác nhận hoàn tất.",
    ],
  },
  process: {
    "Lập kế hoạch kiểm thử": [
      "Lập kế hoạch xác định mục tiêu kiểm thử, phạm vi trong/ngoài, rủi ro chính, môi trường, dữ liệu, công cụ, người phụ trách và tiêu chí dừng/hoàn thành.",
      "Với tác vụ Jira, QA nên tách rõ phần phải kiểm, phần hồi quy gần liên quan và phần ngoài phạm vi để tránh bộ ca bị phình không kiểm soát.",
      "Kết quả thực tế có thể là hướng kiểm thử ngắn, danh sách rủi ro, bộ ca kiểm thử ưu tiên hoặc mindmap thiết kế kiểm thử.",
    ],
    "Giám sát và điều khiển kiểm thử": [
      "Giám sát là theo dõi trạng thái kiểm thử: ca đã chạy, lỗi còn mở, điểm nghẽn, môi trường, dữ liệu, độ bao phủ và rủi ro còn lại.",
      "Điều khiển là điều chỉnh kế hoạch khi có thay đổi: bản dựng lỗi, yêu cầu đổi, phát hiện rủi ro mới hoặc hạn chót bị rút ngắn.",
      "Báo cáo tốt không chỉ ghi số đạt/không đạt mà phải nói vùng nào chưa kiểm, lý do chưa kiểm và mức ảnh hưởng nếu phát hành.",
    ],
    "Phân tích kiểm thử": [
      "Phân tích biến cơ sở kiểm thử như Jira, tiêu chí chấp nhận, thiết kế, hợp đồng API, nhật ký hoặc tài liệu thành các điều kiện kiểm thử có thể kiểm.",
      "QA cần bóc tách quy tắc theo tác nhân, trạng thái, đầu vào, đầu ra, xác thực dữ liệu, ngoại lệ, quyền, kiểm toán và phụ thuộc.",
      "Dấu hiệu cần hỏi lại: từ mơ hồ như “hợp lý”, “đầy đủ”, “nhanh”, “tự động”, thiếu kết quả mong đợi hoặc thiếu quy tắc khi lỗi xảy ra.",
    ],
    "Thiết kế kiểm thử": [
      "Thiết kế chọn kỹ thuật phù hợp và biến điều kiện kiểm thử thành kịch bản, dữ liệu kiểm thử, bước thực hiện và kết quả mong đợi cụ thể.",
      "Một ca tốt nên có tiêu đề nói rõ mục đích, tiền điều kiện đủ thiết lập, dữ liệu đủ tái hiện và kết quả mong đợi kiểm được bằng giao diện/API/nhật ký.",
      "Nếu có nhiều quy tắc kết hợp, dùng bảng quyết định; nếu có trạng thái, dùng chuyển trạng thái; nếu có ngưỡng, dùng giá trị biên.",
    ],
    "Triển khai và thực thi kiểm thử": [
      "Triển khai chuẩn bị bộ kiểm thử, dữ liệu, tài khoản, giả lập, môi trường, script tự động hoặc danh sách kiểm tra trước khi chạy.",
      "Thực thi phải ghi kết quả thực tế, bằng chứng, liên kết lỗi và dữ liệu đã dùng để người khác tái hiện được.",
      "Khi thực tế khác mong đợi, QA cần phân biệt lỗi sản phẩm, lỗi dữ liệu, lỗi môi trường, lỗi ca kiểm thử hay yêu cầu chưa rõ.",
    ],
    "Hoàn tất kiểm thử": [
      "Hoàn tất kiểm thử tổng kết độ bao phủ, lỗi còn mở, rủi ro còn lại, bài học rút ra và tài sản kiểm thử cần giữ cho hồi quy.",
      "Nên lưu lại ca hiệu quả, dữ liệu seed, mẫu lỗi, truy vấn/nhật ký hữu ích và ghi chú môi trường để sprint sau tái sử dụng.",
      "Nếu không thể kiểm hết, báo cáo phải nêu rõ phần chưa kiểm và lý do: thiếu dữ liệu, thiếu quyền, phụ thuộc lỗi hoặc ngoài phạm vi.",
    ],
  },
  techniques: {
    "Phân vùng tương đương": [
      "Chia dữ liệu thành nhóm mà hệ thống dự kiến xử lý giống nhau; kiểm một đại diện tốt cho mỗi nhóm thay vì kiểm tất cả giá trị.",
      "Luôn tách phân vùng hợp lệ và không hợp lệ, ví dụ vai trò hợp lệ/vai trò không đủ quyền, trạng thái đơn đúng/sai, định dạng ngày đúng/sai.",
      "Rủi ro thường gặp là chia phân vùng quá rộng làm mất lỗi; nếu quy tắc nghiệp vụ khác nhau thì phải tách thành phân vùng riêng.",
    ],
    "Phân tích giá trị biên": [
      "Giá trị biên phù hợp khi quy tắc có ngưỡng: nhỏ nhất/lớn nhất, dưới/trên, trước/sau, số lượng, thời gian, trọng lượng, tiền hoặc độ dài chuỗi.",
      "Tối thiểu nên kiểm ngay dưới biên, đúng biên và ngay trên biên; với biên kép thì kiểm cả biên dưới và biên trên.",
      "Lỗi hay nằm ở toán tử >, >=, <, <=, múi giờ, làm tròn, đơn vị đo hoặc phân tích định dạng thời gian.",
    ],
    "Kiểm thử bảng quyết định": [
      "Bảng quyết định giúp nhìn rõ tổ hợp điều kiện và kết quả, đặc biệt khi quy tắc có nhiều if/else hoặc nhiều chính sách chồng nhau.",
      "Mỗi cột thường là một quy tắc/kịch bản; mỗi dòng là điều kiện hoặc hành động/kết quả mong đợi.",
      "Sau khi lập bảng, QA nên loại tổ hợp bất khả thi nhưng giữ các tổ hợp rủi ro cao như xung đột quy tắc, thiếu dữ liệu và ghi đè.",
    ],
    "Kiểm thử chuyển trạng thái": [
      "Dùng khi đối tượng có vòng đời trạng thái: đặt chỗ, thanh toán, vé, quy trình phê duyệt, hội thoại hoặc hàng đợi tác vụ.",
      "Cần kiểm chuyển trạng thái hợp lệ, chuyển trạng thái bị chặn, thao tác lặp lại, hoàn tác, thử lại, hủy và tải lại sau khi đổi trạng thái.",
      "Kết quả mong đợi nên kiểm cả trạng thái giao diện, trạng thái API/lưu DB, nhật ký/kiểm toán và tác động phụ như thông báo hoặc tác vụ phía sau.",
    ],
    "Kiểm thử ca sử dụng / kịch bản": [
      "Mô phỏng cách người dùng đạt mục tiêu thật, thường đi qua nhiều màn hình, API, dịch vụ hoặc lượt chat.",
      "Một kịch bản tốt có tác nhân, mục tiêu, tác nhân kích hoạt, tiền điều kiện, luồng chính, luồng thay thế và luồng ngoại lệ.",
      "Không nên chỉ kiểm luồng thành công; cần thêm người dùng hủy giữa chừng, thiếu thông tin, đổi lựa chọn, tải lại hoặc quay lại bước trước.",
    ],
    "Kiểm thử hộp trắng": [
      "Kiểm thử hộp trắng dựa trên hiểu biết cấu trúc mã nguồn để tìm nhánh chưa được kiểm, điều kiện chưa bao phủ hoặc đường dự phòng bị bỏ quên.",
      "Rất hữu ích với bộ phân tích cú pháp, bộ ánh xạ, kiểm tra quyền, thử lại/dự phòng, cờ tính năng, migration hoặc bộ xử lý sự kiện.",
      "Độ bao phủ mã nguồn cao không đảm bảo đúng nghiệp vụ, nên cần kết hợp với kiểm thử hộp đen và kiểm thử chấp nhận.",
    ],
    "Kiểm thử dựa trên kinh nghiệm": [
      "Dựa trên kinh nghiệm miền nghiệp vụ, lịch sử lỗi, trực giác và mục tiêu kiểm thử thăm dò để tìm lỗi không viết rõ trong đặc tả.",
      "Đoán lỗi nên thử giá trị null, rỗng, trùng lặp, dữ liệu cũ, quyền sai, mạng hết thời gian chờ, thao tác đồng thời và dữ liệu rất dài.",
      "Kiểm thử thăm dò tốt cần giới hạn thời gian, mục tiêu rõ, ghi chú phát hiện, bằng chứng và ca theo dõi nếu tìm được lỗi/rủi ro mới.",
    ],
  },
  levels: {
    "Kiểm thử thành phần": [
      "Mục tiêu là kiểm tra đơn vị nhỏ nhất có thể kiểm độc lập, thường do dev viết bằng kiểm thử đơn vị/thành phần.",
      "Nên bao phủ quy tắc nội bộ, logic phân nhánh, xác thực dữ liệu, xử lý lỗi và hợp đồng của hàm/thành phần.",
      "Giả lập/stub giúp cô lập phụ thuộc, nhưng QA vẫn cần nhớ giả lập có thể che mất lỗi tích hợp thật.",
    ],
    "Kiểm thử tích hợp": [
      "Tập trung vào giao diện kết nối giữa các thành phần/dịch vụ: yêu cầu/phản hồi, schema, xác thực, ánh xạ, hết thời gian chờ và tác động phụ.",
      "Với hệ thống nhiều công cụ như Jira/Confluence/Chatwoot/RAG/n8n, kiểm thử tích hợp phải kiểm payload thật và lỗi từ hệ thống phía sau.",
      "Ca quan trọng: thiếu trường bắt buộc, sai enum, sự kiện trùng, thử lại nhiều lần, tính không đổi kết quả khi gọi lặp và tương thích ngược.",
    ],
    "Kiểm thử hệ thống": [
      "Kiểm toàn hệ thống đã tích hợp từ góc nhìn người dùng cuối/nghiệp vụ, thường trên môi trường gần production hơn.",
      "Nên bao phủ luồng đầu-cuối, dữ liệu lưu lại, quyền, thông báo, kiểm toán, báo cáo và hành vi sau tải lại/thử lại.",
      "Kiểm thử khói ở cấp hệ thống giúp quyết định bản dựng có đủ ổn để kiểm sâu hơn hay phải trả lại dev ngay.",
    ],
    "Kiểm thử chấp nhận": [
      "Kiểm thử chấp nhận xác nhận sản phẩm đáp ứng nhu cầu nghiệp vụ, tiêu chí chấp nhận và mức sẵn sàng để sử dụng/vận hành.",
      "UAT tập trung người dùng/nghiệp vụ; kiểm thử chấp nhận vận hành có thể kiểm sao lưu, giám sát, quyền, runbook hoặc luồng hỗ trợ.",
      "QA nên kiểm cả “đúng tính năng” và “đủ dùng cho mục tiêu tác vụ”, đặc biệt khi đặc tả thiếu kịch bản người dùng thật.",
    ],
    "Kiểm thử chức năng và phi chức năng": [
      "Kiểm thử chức năng trả lời câu hỏi hệ thống làm đúng hành vi không; kiểm thử phi chức năng trả lời hệ thống làm tốt đến mức nào.",
      "Phi chức năng gồm hiệu năng, tính dễ dùng, khả năng tiếp cận, độ tin cậy, tương thích, bảo mật, khả năng bảo trì và khả năng di chuyển.",
      "Không phải tác vụ nào cũng kiểm sâu phi chức năng, nhưng nếu chạm token, dữ liệu nhạy cảm, tệp lớn hoặc nhiều thiết bị thì phải có tiêu chí bảo vệ.",
    ],
    "Kiểm thử xác nhận và hồi quy": [
      "Kiểm thử xác nhận chạy lại ca tái hiện lỗi để xác nhận bản sửa thật sự xử lý lỗi gốc.",
      "Kiểm thử hồi quy chọn vùng có khả năng bị ảnh hưởng bởi thay đổi mã/cấu hình/dữ liệu, không phải chạy lại mọi thứ một cách máy móc.",
      "Bản sửa lỗi tốt nên có ít nhất: ca tái hiện lỗi, ca xác nhận sửa lỗi và ca hồi quy gần logic thay đổi.",
    ],
  },
  reviews: {
    "Rà soát yêu cầu / tiêu chí chấp nhận": [
      "Rà soát tĩnh có thể tìm lỗi trước khi có bản dựng, đặc biệt là lỗi trong yêu cầu, tiêu chí chấp nhận, luồng, dữ liệu và hợp đồng API.",
      "Danh sách rà soát nên hỏi: tác nhân là ai, quy tắc áp dụng khi nào, ngoại lệ là gì, lỗi hệ thống phía sau xử lý sao, nhật ký/kiểm toán cần gì.",
      "Nếu yêu cầu dùng từ mơ hồ, QA nên yêu cầu ví dụ cụ thể hoặc kết quả mong đợi đo/quan sát được.",
    ],
    "Rà soát ca kiểm thử": [
      "Rà soát ca kiểm thử để đảm bảo ca đúng phạm vi, không trùng lặp, không quá rộng và có kết quả mong đợi kiểm chứng được.",
      "Tiêu đề nên nói rõ rủi ro/kịch bản, ví dụ “Thiếu token Confluence hiển thị lỗi xác thực” thay vì “Kiểm Confluence”.",
      "Tiền điều kiện không nên chứa bước hành động; bước thực hiện không nên chứa nhiều mục tiêu; kết quả mong đợi không nên viết chung chung.",
    ],
    "Rà soát API / hợp đồng sự kiện": [
      "Rà soát hợp đồng cần kiểm trường bắt buộc/tùy chọn, kiểu dữ liệu, enum, khả năng nhận null, giá trị mặc định, phiên bản, tương thích ngược và quyền sở hữu.",
      "Luồng theo sự kiện cần thêm quy tắc về trùng lặp, thứ tự xử lý, thử lại, tính không đổi kết quả khi gọi lặp, hàng đợi lỗi, mã truy vết và metadata kiểm toán.",
      "Nếu payload dùng để hệ thống phía sau ra quyết định, cần kiểm thiếu ngữ cảnh, ngữ cảnh sai, nguồn tham chiếu rỗng và dữ liệu quá dài.",
    ],
    "BDD / lập bản đồ ví dụ": [
      "BDD giúp team thống nhất hành vi bằng ví dụ cụ thể trước khi triển khai, tránh mỗi người hiểu tiêu chí chấp nhận theo một cách.",
      "Given/When/Then nên viết ở ngôn ngữ nghiệp vụ; tránh nhét chi tiết triển khai như tên hàm hoặc truy vấn DB.",
      "Lập bản đồ ví dụ tốt thường phát hiện quy tắc thiếu, ngoại lệ chưa nói rõ và câu hỏi cần PO/BA xác nhận.",
    ],
  },
  defects: {
    "Báo cáo lỗi tối thiểu": [
      "Báo cáo lỗi tốt phải giúp người khác tái hiện mà không cần hỏi lại quá nhiều: môi trường, bản dựng, tài khoản/vai trò, tiền điều kiện, dữ liệu, bước thực hiện.",
      "Kết quả thực tế nên mô tả hệ thống thật sự làm gì; kết quả mong đợi nên gắn với tiêu chí chấp nhận/đặc tả/quy tắc nghiệp vụ cụ thể.",
      "Bằng chứng nên đủ để gỡ lỗi: ảnh chụp/video, yêu cầu/phản hồi, nhật ký console/network, mã truy vết, thời điểm hoặc ID bản ghi nếu có.",
    ],
    "Mức độ nghiêm trọng và mức ưu tiên": [
      "Mức độ nghiêm trọng đo mức ảnh hưởng khi lỗi xảy ra: chặn hoàn toàn, nghiêm trọng, lớn, nhỏ hoặc không đáng kể tùy quy ước team.",
      "Mức ưu tiên đo mức cần xử lý sớm: có thể cao vì hạn chót/demo/khách hàng dù mức độ nghiêm trọng không quá cao.",
      "QA nên nêu mức ảnh hưởng rõ để PM/dev phân loại: ảnh hưởng bao nhiêu người dùng, có cách xử lý tạm không, có mất tiền/dữ liệu/bảo mật không.",
    ],
    "Khả năng tái hiện": [
      "Luôn ghi tần suất: 100%, thỉnh thoảng, chỉ với dữ liệu cụ thể, chỉ trên trình duyệt/thiết bị/môi trường cụ thể.",
      "Nếu lỗi chập chờn, cần gom mẫu xảy ra: thời điểm, kích thước dữ liệu, mạng, thao tác đồng thời, vai trò tài khoản, nhật ký hoặc mã truy vết.",
      "Nếu chưa tái hiện lại được, báo cáo nên ghi rõ đã thử những gì và còn thiếu thông tin nào.",
    ],
    "Ghi nhớ hồi quy": [
      "Lỗi quan trọng nên được chuyển thành ca hồi quy hoặc danh sách kiểm tra để tránh tái diễn ở sprint sau.",
      "Nên lưu mẫu lỗi theo mô-đun/nguyên nhân gốc: xác thực dữ liệu, quyền, cache, ánh xạ, thử lại, tranh chấp đồng thời, múi giờ.",
      "Khi tạo ca kiểm thử cho tác vụ mới, QA có thể dùng lịch sử lỗi để bổ sung ca biên gần vùng thay đổi.",
    ],
  },
};

function knowledgeCardDetailPoints(language: LanguageMode, section: StaticKnowledgeSection, card: KnowledgeCard) {
  const deepDive = language === "vi" ? VI_KNOWLEDGE_DEEP_DIVE[section]?.[card.title] || [] : [];
  return [...card.points, ...deepDive];
}

function projectFromDefaults(payload: DefaultsResponse): ProjectConfig {
  return {
    sourceRoot: payload.defaults.sourceRoot,
    jiraBaseUrl: payload.defaults.jiraBaseUrl,
    projectKey: payload.defaults.projectKey,
    folderRoot: payload.defaults.folderRoot,
    runRoot: payload.defaults.runRoot,
    jsonOutputDir: payload.defaults.jsonOutputDir,
    outputDir: payload.defaults.outputDir,
    testCaseNumberTemplate: payload.defaults.testCaseNumberTemplate || "TC_{0000}",
    chatwootMode: payload.defaults.chatwootMode === "suite" ? "suite" : "adaptive",
    chatwootChatUiMode: payload.defaults.chatwootChatUiMode === "webhook-only" ? "webhook-only" : "realistic",
    chatwootPlannerBackend: ["openai-compatible", "heuristic", "codex-cli"].includes(payload.defaults.chatwootPlannerBackend)
      ? payload.defaults.chatwootPlannerBackend
      : "openai-compatible",
    chatwootWebhookUrl: payload.defaults.chatwootWebhookUrl || "",
    chatwootHealthcheckUrl: payload.defaults.chatwootHealthcheckUrl || "",
    chatwootSkipHealthcheck: payload.defaults.chatwootSkipHealthcheck !== false,
    chatwootSkipLocalWebhookPost: payload.defaults.chatwootSkipLocalWebhookPost !== false,
    chatwootApiBase: payload.defaults.chatwootApiBase || "https://uat-omniagent.vexere.net",
    chatwootInboxId: payload.defaults.chatwootInboxId || "3062",
    chatwootUiInboxId: payload.defaults.chatwootUiInboxId || payload.defaults.chatwootInboxId || "3062",
    chatwootCaptainAssistantId: payload.defaults.chatwootCaptainAssistantId || "80",
    chatwootAccountId: payload.defaults.chatwootAccountId || "3",
    chatwootMaxUserTurns: payload.defaults.chatwootMaxUserTurns || "10",
    chatwootPlannerModel: payload.defaults.chatwootPlannerModel || "gpt-5.4-mini",
    chatwootPlannerTimeoutSeconds: payload.defaults.chatwootPlannerTimeoutSeconds || "60",
    chatwootLabels: payload.defaults.chatwootLabels || "ai",
    chatwootAssigneeName: payload.defaults.chatwootAssigneeName || "Bot",
    chatwootPinnedConversationId: payload.defaults.chatwootPinnedConversationId || "",
    automationProfiles: Array.isArray(payload.defaults.automationProfiles) ? payload.defaults.automationProfiles : [],
    labelMode: payload.defaults.labelPolicy.mode,
    testcaseLabels: payload.defaults.labelPolicy.testcaseLabels,
    testdesignLabels: payload.defaults.labelPolicy.testdesignLabels,
    testcaseStatusLabels: payload.defaults.labelPolicy.testcaseStatusLabels,
    testdesignStatusLabels: payload.defaults.labelPolicy.testdesignStatusLabels,
  };
}

function projectSettingsSnapshot(project: ProjectConfig) {
  return JSON.stringify({
    sourceRoot: project.sourceRoot,
    jiraBaseUrl: project.jiraBaseUrl,
    projectKey: project.projectKey,
    folderRoot: project.folderRoot,
    runRoot: project.runRoot,
    jsonOutputDir: project.jsonOutputDir,
    outputDir: project.outputDir,
    testCaseNumberTemplate: project.testCaseNumberTemplate,
    labelMode: project.labelMode,
    testcaseLabels: project.testcaseLabels,
    testdesignLabels: project.testdesignLabels,
    testcaseStatusLabels: project.testcaseStatusLabels,
    testdesignStatusLabels: project.testdesignStatusLabels,
  });
}

function automationProfileConfigFromProject(project: ProjectConfig): AutomationProfile["config"] {
  return {
    chatwootMode: project.chatwootMode,
    chatwootChatUiMode: project.chatwootChatUiMode,
    chatwootPlannerBackend: project.chatwootPlannerBackend,
    chatwootWebhookUrl: project.chatwootWebhookUrl,
    chatwootHealthcheckUrl: project.chatwootHealthcheckUrl,
    chatwootSkipHealthcheck: project.chatwootSkipHealthcheck,
    chatwootSkipLocalWebhookPost: project.chatwootSkipLocalWebhookPost,
    chatwootApiBase: project.chatwootApiBase,
    chatwootInboxId: project.chatwootInboxId,
    chatwootUiInboxId: project.chatwootUiInboxId,
    chatwootCaptainAssistantId: project.chatwootCaptainAssistantId,
    chatwootAccountId: project.chatwootAccountId,
    chatwootMaxUserTurns: project.chatwootMaxUserTurns,
    chatwootPlannerModel: project.chatwootPlannerModel,
    chatwootPlannerTimeoutSeconds: project.chatwootPlannerTimeoutSeconds,
    chatwootLabels: project.chatwootLabels,
    chatwootAssigneeName: project.chatwootAssigneeName,
    chatwootPinnedConversationId: project.chatwootPinnedConversationId,
  };
}

function blankAutomationProfileConfig(): AutomationProfile["config"] {
  return {
    chatwootMode: "adaptive",
    chatwootChatUiMode: "realistic",
    chatwootPlannerBackend: "openai-compatible",
    chatwootWebhookUrl: "",
    chatwootHealthcheckUrl: "",
    chatwootSkipHealthcheck: true,
    chatwootSkipLocalWebhookPost: true,
    chatwootApiBase: "",
    chatwootInboxId: "",
    chatwootUiInboxId: "",
    chatwootCaptainAssistantId: "",
    chatwootAccountId: "",
    chatwootMaxUserTurns: "",
    chatwootPlannerModel: "",
    chatwootPlannerTimeoutSeconds: "",
    chatwootLabels: "",
    chatwootAssigneeName: "",
    chatwootPinnedConversationId: "",
  };
}

function automationSettingsSnapshot(project: ProjectConfig) {
  return JSON.stringify({
    ...automationProfileConfigFromProject(project),
    automationProfiles: project.automationProfiles,
  });
}

function projectWithAutomationProfileConfig(project: ProjectConfig, config: AutomationProfile["config"]): ProjectConfig {
  return {
    ...project,
    ...config,
  };
}

function createAutomationProfileId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `automation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultAutomationProfileName(project: ProjectConfig) {
  const base = project.chatwootApiBase.replace(/^https?:\/\//i, "").replace(/\/$/, "") || "Automation";
  const inbox = project.chatwootUiInboxId || project.chatwootInboxId;
  return inbox ? `${base} - Inbox ${inbox}` : base;
}

function authSettingsSnapshot(credentials: Credentials, confluenceCredentials: ConfluenceCredentials, authEntries: AuthEntry[]) {
  return JSON.stringify({
    jira: {
      enabled: credentials.enabled,
      user: credentials.user,
      password: credentials.password,
      token: credentials.token,
    },
    confluence: {
      enabled: confluenceCredentials.enabled,
      user: confluenceCredentials.user,
      password: confluenceCredentials.password,
      token: confluenceCredentials.token,
    },
    custom: authEntries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      baseUrl: entry.baseUrl,
      authType: entry.authType,
      user: entry.user,
      password: entry.password,
      token: entry.token,
      enabled: entry.enabled,
      notes: entry.notes,
    })),
  });
}

function aiCoreSettingsSnapshot(aiSettings: AiSettings) {
  return JSON.stringify({
    enabled: aiSettings.enabled,
    provider: aiSettings.provider,
    baseUrl: aiSettings.baseUrl,
    model: aiSettings.model,
    apiKey: aiSettings.apiKey,
    promptGuidelines: aiSettings.promptGuidelines,
    stopConditionGuidelines: aiSettings.stopConditionGuidelines,
    writingStyle: aiSettings.writingStyle,
    testCaseGuidelines: aiSettings.testCaseGuidelines,
    testDesignGuidelines: aiSettings.testDesignGuidelines,
    improvementNotes: aiSettings.improvementNotes,
  });
}

function aiPromptGuidelinesFromSettings(aiSettings: Partial<AiSettings>) {
  if (aiSettings.promptGuidelines?.trim()) return aiSettings.promptGuidelines;
  const legacySections = [
    aiSettings.writingStyle?.trim() ? `Phong cách viết:\n${aiSettings.writingStyle.trim()}` : "",
    aiSettings.testCaseGuidelines?.trim() ? `Cách viết test case:\n${aiSettings.testCaseGuidelines.trim()}` : "",
    aiSettings.testDesignGuidelines?.trim() ? `Cách làm test design:\n${aiSettings.testDesignGuidelines.trim()}` : "",
    aiSettings.improvementNotes?.trim() ? `Ghi nhớ cải tiến:\n${aiSettings.improvementNotes.trim()}` : "",
  ].filter(Boolean);
  return legacySections.length ? legacySections.join("\n\n") : DEFAULT_AI_PROMPT_GUIDELINES;
}

function knowledgeAiSettingsSnapshot(aiSettings: AiSettings) {
  const knowledge = aiSettings.knowledge || emptyAiSettings.knowledge!;
  return JSON.stringify({
    enabled: knowledge.enabled,
    provider: knowledge.provider,
    baseUrl: knowledge.baseUrl,
    model: knowledge.model,
    apiKey: knowledge.apiKey,
    writingStyle: knowledge.writingStyle,
    articleGuidelines: knowledge.articleGuidelines,
  });
}

function settingsSnapshots(
  project: ProjectConfig,
  credentials: Credentials,
  confluenceCredentials: ConfluenceCredentials,
  authEntries: AuthEntry[],
  aiSettings: AiSettings,
): Record<SettingsSection, string> {
  return {
    project: projectSettingsSnapshot(project),
    auth: authSettingsSnapshot(credentials, confluenceCredentials, authEntries),
    automation: automationSettingsSnapshot(project),
    ai: aiCoreSettingsSnapshot(aiSettings),
    knowledgeAi: knowledgeAiSettingsSnapshot(aiSettings),
  };
}

function knowledgeArticleSnapshot(article: KnowledgeArticle | null) {
  if (!article) return "";
  return JSON.stringify({
    id: article.id,
    title: article.title,
    summary: article.summary,
    category: article.category,
    content: article.content,
    tags: article.tags || [],
    source: article.source,
  });
}

const initialSavedSettingsSnapshot = settingsSnapshots(
  emptyProject,
  emptyCredentials,
  emptyConfluenceCredentials,
  [],
  emptyAiSettings,
);

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

function normalizeTestCaseNumberTemplate(value: string) {
  return value.trim().replace(/^\[/, "").replace(/\]$/, "").trim() || "TC_{0000}";
}

function renderTestCaseNumber(template: string, index: number) {
  const safeIndex = Math.max(1, Math.floor(index));
  const normalized = normalizeTestCaseNumberTemplate(template);
  const padded = (width: number) => String(safeIndex).padStart(Math.max(width, 1), "0");
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

function testCaseTitlePrefix(template: string, index: number) {
  return `[${renderTestCaseNumber(template, index)}]`;
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

const makeEmptyCase = (index: number, issueKey: string, numberTemplate: string): TestCase => ({
  title: `${testCaseTitlePrefix(numberTemplate, index)} Scenario mới`,
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

function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}_]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripCaseNumberPrefix(value: string) {
  return value.replace(/^\s*\[[^\]]+\]\s*/, "").trim();
}

function testCaseSearchText(testCase: TestCase) {
  return normalizeComparableText(
    [
      testCase.title,
      testCase.objective,
      testCase.priority,
      testCase.technique,
      testCase.risk,
      testCase.requirement_ref,
      testCase.coverage_tags.join(" "),
      testCase.scenario_type,
      testCase.precondition,
      testCase.test_data,
      testCase.expected_result,
      ...(testCase.structured_steps || []).flatMap((step) => [step.description, step.test_data, step.expected_result]),
    ].join(" "),
  );
}

function caseMatchesFilter(testCase: TestCase, filter: CaseFilter) {
  if (filter === "all") return true;
  const text = testCaseSearchText(testCase);
  const patterns: Record<Exclude<CaseFilter, "all">, RegExp> = {
    happy: /\b(happy|success|positive|main|primary|chinh|thanh cong|hop le)\b/,
    negative: /\b(negative|fail|invalid|missing|wrong|empty|null|deny|error|loi|thieu|sai|khong)\b/,
    edge: /\b(edge|boundary|limit|partial|timeout|large|small|max|min|bien|gioi han)\b/,
    regression: /\b(regression|nearby|existing|legacy|old flow|hoi quy|luong cu)\b/,
    auth: /\b(auth|token|permission|role|login|credential|xac thuc|phan quyen)\b/,
    validation: /\b(validation|required|format|mapping|field|payload|schema|validate|bat buoc)\b/,
    doc: /\b(doc|document|confluence|article|reference|chunk|source|knowledge|tai lieu)\b/,
  };
  return patterns[filter].test(text);
}

function testCaseStopPatterns(testCase: TestCase) {
  const raw = testCase.stop_patterns || (testCase as TestCase & { stopPatterns?: string[] }).stopPatterns || [];
  return raw.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeStopConditionLines(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
  return raw.map((item) => String(item || "").replace(/\s+/g, " ").trim()).filter(Boolean);
}

function humanizeStopPatternForUi(pattern = "", kind: "pass" | "fail" = "pass") {
  const text = pattern.toLowerCase();
  if (/https|payment|thanh\s*to[aá]n|link/.test(text)) {
    return kind === "fail"
      ? "Bot không tạo được link thanh toán hoặc trả lời rằng không thể tiếp tục thanh toán."
      : "Bot trả về link thanh toán hoặc link hoàn tất đúng với mục tiêu test case.";
  }
  if (/booking|ticket|mã|ma|code/.test(text)) {
    return kind === "fail"
      ? "Bot không trả về mã booking/mã vé hợp lệ hoặc báo không tạo được mã theo dữ liệu test."
      : "Bot trả về mã booking/mã vé hợp lệ theo dữ liệu test.";
  }
  if (/không|khong|hết|het|no\s*trip|not\s*available|unavailable/.test(text)) {
    return kind === "fail"
      ? "Bot đưa ra kết luận không có chuyến/lựa chọn sai với dữ liệu test hoặc không có hướng xử lý tiếp."
      : "Bot xác nhận đúng trạng thái không có chuyến hoặc không còn lựa chọn phù hợp với điều kiện tìm kiếm.";
  }
  if (/handoff|agent|nhân viên|nhan vien|tư vấn|tu van/.test(text)) {
    return kind === "fail"
      ? "Bot chuyển agent ngoài mong đợi hoặc dừng hội thoại khi test case cần bot tự xử lý."
      : "Bot chuyển hội thoại sang nhân viên tư vấn đúng lúc test case yêu cầu handoff.";
  }
  return kind === "fail"
    ? "Bot phản hồi sai ngữ cảnh, báo lỗi hoặc không đạt expected result của test case."
    : "Bot phản hồi đúng expected result và mục tiêu kiểm thử của test case đã đạt.";
}

function looksLikeRegexForUi(value = "") {
  return /(\(\?i\)|\\[bdsw]|\[[^\]]+\]|\.\*|\.\{|\{\d|https\?:|[|])/.test(value);
}

function sanitizeStopConditionsForUi(values: string[], kind: "pass" | "fail") {
  return normalizeStopConditionLines(values).map((value) => (looksLikeRegexForUi(value) ? humanizeStopPatternForUi(value, kind) : value));
}

function testCaseStopConditions(testCase: TestCase): StopConditions {
  const raw = (testCase.stop_conditions || (testCase as TestCase & { stopConditions?: StopConditions }).stopConditions || {}) as Partial<StopConditions>;
  let pass = sanitizeStopConditionsForUi(normalizeStopConditionLines(raw.pass), "pass");
  let fail = sanitizeStopConditionsForUi(normalizeStopConditionLines(raw.fail), "fail");
  if (!pass.length) {
    pass = testCaseStopPatterns(testCase).map((pattern) => humanizeStopPatternForUi(pattern, "pass"));
  }
  if (!fail.length) {
    const rawFail = testCase.fail_patterns || (testCase as TestCase & { failPatterns?: string[] }).failPatterns || [];
    fail = normalizeStopConditionLines(rawFail).map((pattern) => humanizeStopPatternForUi(pattern, "fail"));
  }
  return {
    pass: pass.length ? pass : ["Bot phản hồi đúng expected result và mục tiêu kiểm thử của test case đã đạt."],
    fail: fail.length ? fail : ["Bot phản hồi sai ngữ cảnh, báo lỗi hoặc không đạt expected result của test case."],
  };
}

function isGenericStopPattern(pattern = "") {
  const normalized = pattern.replace(/\s+/g, "").toLowerCase();
  return normalized === "(?i)https?://\\s+" || normalized === "https?://\\s+";
}

function stopPatternStats(testCases: TestCase[]) {
  const total = testCases.length;
  const ready = testCases.filter((testCase) => {
    const conditions = testCaseStopConditions(testCase);
    const passPatterns = testCaseStopPatterns(testCase);
    const failPatterns = normalizeStopConditionLines(testCase.fail_patterns || (testCase as TestCase & { failPatterns?: string[] }).failPatterns || []);
    return conditions.pass.length > 0 && conditions.fail.length > 0 && passPatterns.length > 0 && failPatterns.length > 0;
  }).length;
  return {
    total,
    ready,
    needs: Math.max(total - ready, 0),
  };
}

function buildQualityItems(testCases: TestCase[], outline: TestDesignOutline, docContext: string, issueKey: string, ui: UiText): QualityItem[] {
  if (!testCases.length) return [];
  const allText = testCases.map(testCaseSearchText).join(" ");
  const genericTitles = testCases.filter((testCase) => {
    const title = normalizeComparableText(stripCaseNumberPrefix(testCase.title));
    return title.length < 18 || /^(test|kiem thu|scenario|case)\b/.test(title) || !/[a-z0-9]{4,}/i.test(title);
  });
  const missingSteps = testCases.filter((testCase) => !(testCase.structured_steps || []).length);
  const weakExpected = testCases.filter((testCase) => normalizeComparableText(testCase.expected_result).length < 28);
  const missingRequirement = issueKey ? testCases.filter((testCase) => normalizeComparableText(testCase.requirement_ref) !== normalizeComparableText(issueKey)) : [];
  const missingTags = testCases.filter((testCase) => !testCase.coverage_tags?.length);
  const hasNegative = /\b(negative|fail|invalid|missing|wrong|empty|null|error|loi|thieu|sai|khong)\b/.test(allText);
  const hasRegression = /\b(regression|nearby|existing|legacy|old flow|hoi quy|luong cu)\b/.test(allText);
  const hasEdge = /\b(edge|boundary|limit|partial|timeout|max|min|bien|gioi han)\b/.test(allText);
  const hasOutOfScope = outline.branches.some((branch) => /out\s*of\s*scope|ngoai pham vi|khong kiem thu/i.test(normalizeComparableText(branch.title)));
  const hasDocCoverage = !docContext.trim() || /\b(doc|document|confluence|article|reference|chunk|source|knowledge|tai lieu)\b/.test(allText);
  return [
    {
      id: "title",
      label: ui.title,
      detail: genericTitles.length ? `${genericTitles.length} title còn ngắn hoặc chung chung.` : "Title đã đủ rõ để scan nhanh.",
      ok: genericTitles.length === 0,
      severity: genericTitles.length ? "warn" : "good",
    },
    {
      id: "steps",
      label: ui.steps,
      detail: missingSteps.length ? `${missingSteps.length} case thiếu structured_steps.` : "Mỗi case có step kiểm thử có thể thao tác.",
      ok: missingSteps.length === 0,
      severity: missingSteps.length ? "bad" : "good",
    },
    {
      id: "expected",
      label: ui.expectedResult,
      detail: weakExpected.length ? `${weakExpected.length} expected result còn quá ngắn, khó kiểm chứng.` : "Expected result đủ cụ thể để review.",
      ok: weakExpected.length === 0,
      severity: weakExpected.length ? "warn" : "good",
    },
    {
      id: "risk",
      label: ui.caseFilterLabel,
      detail: hasNegative && hasEdge && hasRegression ? "Đã có negative, edge và regression lens." : "Nên có đủ negative, edge và regression để bắt bug tốt hơn.",
      ok: hasNegative && hasEdge && hasRegression,
      severity: hasNegative && hasEdge && hasRegression ? "good" : "warn",
    },
    {
      id: "design",
      label: ui.testDesignTab,
      detail: hasOutOfScope ? "Test design có nhánh Out of scope." : "Test design nên có đúng 1 nhánh Out of scope.",
      ok: hasOutOfScope,
      severity: hasOutOfScope ? "good" : "warn",
    },
    {
      id: "refs",
      label: ui.requirementRef,
      detail: missingRequirement.length ? `${missingRequirement.length} case chưa map về ${issueKey}.` : "Requirement ref đang map đúng issue.",
      ok: missingRequirement.length === 0,
      severity: missingRequirement.length ? "warn" : "good",
    },
    {
      id: "tags",
      label: ui.coverageTags,
      detail: missingTags.length ? `${missingTags.length} case thiếu coverage tag.` : "Coverage tag đã có ở các case.",
      ok: missingTags.length === 0,
      severity: missingTags.length ? "warn" : "good",
    },
    {
      id: "doc",
      label: ui.docCoverage,
      detail: hasDocCoverage ? "Doc context đã có dấu hiệu được dùng trong coverage." : "Có doc context nhưng case chưa thể hiện rõ doc/reference coverage.",
      ok: hasDocCoverage,
      severity: hasDocCoverage ? "good" : "warn",
    },
  ];
}

function keywordsFromCoverageText(value: string) {
  const stopWords = new Set(["test", "case", "task", "jira", "scope", "kiem", "thu", "luong", "risk", "rule", "happy", "path"]);
  return normalizeComparableText(value)
    .split(" ")
    .filter((word) => word.length >= 4 && !stopWords.has(word))
    .slice(0, 8);
}

function buildCoverageRows(issue: IssueSummary, qaPlan: QaPlan | null, testCases: TestCase[]): CoverageRow[] {
  const sourceRows = qaPlan?.coverage_axes?.length
    ? qaPlan.coverage_axes.slice(0, 8).map((axis) => ({
        id: axis.id,
        title: axis.title,
        source: [axis.technique, axis.risk].filter(Boolean).join(" · "),
      }))
    : [
        ...issue.description
          .split(/\r?\n/)
          .map((line) => line.replace(/^[\s*#>-]+/, "").trim())
          .filter((line) => line.length >= 18)
          .slice(0, 6)
          .map((line, index) => ({ id: `desc-${index}`, title: line, source: "Jira description/AC" })),
        issue.summary ? { id: "summary", title: issue.summary, source: "Jira summary" } : null,
      ].filter(Boolean) as Array<{ id: string; title: string; source: string }>;
  return sourceRows.slice(0, 8).map((row) => {
    const keywords = keywordsFromCoverageText(`${row.title} ${row.source}`);
    const matchedIndexes = testCases
      .map((testCase, index) => ({ index, text: testCaseSearchText(testCase) }))
      .filter(({ text }) => keywords.some((keyword) => text.includes(keyword)))
      .map(({ index }) => index);
    return { ...row, matchedIndexes };
  });
}

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

function looksLikeConfluencePageUrl(value: string) {
  const text = value.trim();
  if (!/^https?:\/\//i.test(text)) return false;
  try {
    const url = new URL(text);
    return Boolean(
      url.searchParams.get("pageId") ||
        (url.searchParams.get("spaceKey") && url.searchParams.get("title")) ||
        /\/pages\//i.test(url.pathname) ||
        /\/display\/[^/]+\/[^/]+/i.test(url.pathname) ||
        /\/content\/\d+/i.test(url.pathname),
    );
  } catch {
    return false;
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

function triggerDownload(file?: DownloadFileMeta | null) {
  if (!file?.url) return;
  const anchor = document.createElement("a");
  anchor.href = file.url;
  anchor.download = file.file.split("/").pop() || "";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
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
  savedIndicator?: boolean;
  savedIndicatorLabel?: string;
  badge?: ReactNode;
}) {
  const fieldId = useId();
  const [expanded, setExpanded] = useState(false);
  const errorId = props.error ? `${fieldId}-error` : undefined;
  const modalTitleId = `${fieldId}-expand-title`;
  const inputType = props.type || "text";
  const canExpand = inputType !== "password";
  const showSavedIndicator = Boolean(props.savedIndicator && !props.value);
  const currentLanguage = typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "vi";
  const expandLabel = currentLanguage === "en" ? `Expand ${props.label}` : `Mở rộng ${props.label}`;
  const closeExpandLabel = currentLanguage === "en" ? "Close expanded field" : "Đóng ô nhập mở rộng";
  const control = props.textarea ? (
    <textarea
      id={fieldId}
      value={props.value}
      rows={props.rows || 4}
      placeholder={props.placeholder}
      autoComplete="off"
      onChange={(event) => props.onChange(event.target.value)}
      aria-invalid={Boolean(props.error)}
      aria-describedby={errorId}
      required={props.required}
    />
  ) : (
    <input
      id={fieldId}
      value={props.value}
      type={inputType}
      placeholder={props.placeholder}
      autoComplete="off"
      onChange={(event) => props.onChange(event.target.value)}
      aria-invalid={Boolean(props.error)}
      aria-describedby={errorId}
      required={props.required}
    />
  );
  return (
    <div className={`field ${props.error ? "field-invalid" : ""}`}>
      <label className="field-label" htmlFor={fieldId}>
        {props.label}
        {props.required ? <small className="required-mark"> *</small> : null}
        {props.badge ? <span className="field-ai-badge">{props.badge}</span> : null}
      </label>
      <div className={`field-control-wrap ${canExpand ? "has-expand" : ""} ${showSavedIndicator ? "has-saved-secret" : ""}`}>
        {control}
        {showSavedIndicator ? (
          <span
            className="secret-saved-stroke"
            aria-label={props.savedIndicatorLabel || (currentLanguage === "en" ? "Saved securely" : "Đã lưu bảo mật")}
          />
        ) : null}
        {canExpand ? (
          <button
            className="field-expand-button"
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={expandLabel}
            title={expandLabel}
          >
            <Maximize2 size={12} />
          </button>
        ) : null}
      </div>
      {props.error ? (
        <small id={errorId} className="field-error">
          {props.error}
        </small>
      ) : null}
      {canExpand && expanded ? (
        <div className="field-expand-backdrop" role="presentation" onMouseDown={() => setExpanded(false)}>
          <section
            className="field-expand-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="field-expand-header">
              <h2 id={modalTitleId}>{props.label}</h2>
              <button className="field-expand-close" type="button" onClick={() => setExpanded(false)} aria-label={closeExpandLabel}>
                <X size={18} />
              </button>
            </div>
            <textarea
              className="field-expand-editor"
              value={props.value}
              placeholder={props.placeholder}
              onChange={(event) => props.onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setExpanded(false);
                }
              }}
              autoFocus
            />
          </section>
        </div>
      ) : null}
    </div>
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
  variant?: "primary" | "secondary" | "success" | "danger";
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
  text: UiText;
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
            <p className="eyebrow">{props.text.publicQaWorkspace}</p>
            <h1>EasyForQC</h1>
          </div>
        </div>
        <p className="login-copy">
          {props.text.loginCopy}
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            props.onSubmit();
          }}
        >
          <Field label={props.text.email} value={props.email} onChange={props.onEmail} placeholder="qa@gmail.com" />
          <Field label={props.text.password} value={props.password} type="password" onChange={props.onPassword} placeholder={props.text.appPasswordPlaceholder} />
          {props.error ? <div className="notice">{props.error}</div> : null}
          <button className="button primary login-submit" type="submit" disabled={props.busy}>
            {props.busy ? <Loader2 className="spin" size={16} /> : <LockKeyhole size={16} />}
            <span>{props.text.login}</span>
          </button>
          <div className="login-divider">{props.text.loginDivider}</div>
          <button
            className="button google-submit"
            type="button"
            disabled={!props.googleEnabled}
            onClick={props.onGoogleLogin}
            title={props.googleEnabled ? props.text.googleLoginEnabledTitle : props.text.googleLoginDisabledTitle}
          >
            <Mail size={16} />
            <span>{props.text.loginWithGoogle}</span>
          </button>
        </form>
      </section>
      <aside className="login-aside">
        <div className="login-aside-inner">
          <h2>{props.text.loginAsideTitle}</h2>
          <p>{props.text.loginAsideCopy}</p>
          <div className="login-checks">
            <span>{props.text.loginEditableCases}</span>
            <span>{props.text.loginXmindEditor}</span>
            <span>{props.text.loginAutomation}</span>
          </div>
        </div>
      </aside>
    </main>
  );
}

function ChangePasswordDialog(props: {
  text: UiText;
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
            <h2 id="change-password-title">{props.text.changePassword}</h2>
            <p>{props.text.changePasswordNote}</p>
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            props.onSubmit();
          }}
        >
          <Field label={props.text.currentPassword} value={props.currentPassword} type="password" onChange={props.onCurrentPassword} />
          <Field label={props.text.newPassword} value={props.newPassword} type="password" onChange={props.onNewPassword} />
          <Field label={props.text.confirmNewPassword} value={props.confirmPassword} type="password" onChange={props.onConfirmPassword} />
          {props.error ? <div className="notice">{props.error}</div> : null}
          {props.success ? <div className="notice ok">{props.success}</div> : null}
          <div className="modal-actions">
            <button className="button" type="button" onClick={props.onClose} disabled={props.busy}>
              {props.text.cancel}
            </button>
            <button className="button primary" type="submit" disabled={props.busy}>
              {props.busy ? <Loader2 className="spin" size={16} /> : <KeyRound size={16} />}
              <span>{props.text.updatePassword}</span>
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
  const [appView, setAppView] = useState<AppView>("run");
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSection>("project");
  const [settingsNavOpen, setSettingsNavOpen] = useState(false);
  const [activeKnowledgeSection, setActiveKnowledgeSection] = useState<KnowledgeSection>("principles");
  const [expandedKnowledgeCards, setExpandedKnowledgeCards] = useState<string[]>([]);
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [bookmarkedKnowledgeCards, setBookmarkedKnowledgeCards] = useState<string[]>([]);
  const [projectAdvancedOpen, setProjectAdvancedOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialThemeMode);
  const [languageMode, setLanguageMode] = useState<LanguageMode>(initialLanguageMode);
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
    auth: "",
    automation: "",
    ai: "",
    knowledgeAi: "",
  });
  const [automationProfileName, setAutomationProfileName] = useState("");
  const [automationProfileTargetType, setAutomationProfileTargetType] = useState<AutomationProfile["targetType"]>("chatwoot");
  const [automationEditorOpen, setAutomationEditorOpen] = useState(false);
  const [automationEditorBackupConfig, setAutomationEditorBackupConfig] = useState<AutomationProfile["config"] | null>(null);
  const [selectedChatwootAgentId, setSelectedChatwootAgentId] = useState("");
  const [connectionBusy, setConnectionBusy] = useState<ConnectionTarget | "">("");
  const [connectionStatus, setConnectionStatus] = useState<Partial<Record<ConnectionTarget, string>>>({});
  const [savedSettingsSnapshot, setSavedSettingsSnapshot] = useState<Record<SettingsSection, string>>(initialSavedSettingsSnapshot);
  const [defaults, setDefaults] = useState<DefaultsResponse | null>(null);
  const [project, setProject] = useState<ProjectConfig>(emptyProject);
  const [credentials, setCredentials] = useState<Credentials>(emptyCredentials);
  const [confluenceCredentials, setConfluenceCredentials] = useState<ConfluenceCredentials>(emptyConfluenceCredentials);
  const [authEntries, setAuthEntries] = useState<AuthEntry[]>([]);
  const [aiSettings, setAiSettings] = useState<AiSettings>(emptyAiSettings);
  const [savedAiSettings, setSavedAiSettings] = useState<AiSettings>(emptyAiSettings);
  const [aiSettingsHistory, setAiSettingsHistory] = useState<AiSettingsHistoryEntry[]>([]);
  const [secretStatus, setSecretStatus] = useState<SecretStatus>(emptySecretStatus);
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
  const [draftHistory, setDraftHistory] = useState<DraftHistoryEntry[]>([]);
  const [detailCaseIndex, setDetailCaseIndex] = useState<number | null>(null);
  const [caseFilter, setCaseFilter] = useState<CaseFilter>("all");
  const [outline, setOutline] = useState<TestDesignOutline>(emptyOutline(emptyIssue));
  const [sourceConfigOpen, setSourceConfigOpen] = useState(true);
  const [improvePanelOpen, setImprovePanelOpen] = useState(false);
  const [improveInstruction, setImproveInstruction] = useState("");
  const [lastImproveInstruction, setLastImproveInstruction] = useState("");
  const [settingsImproveInstruction, setSettingsImproveInstruction] = useState("");
  const [settingsPromptImproveStatus, setSettingsPromptImproveStatus] = useState("");
  const [settingsPromptImproveBusy, setSettingsPromptImproveBusy] = useState(false);
  const [settingsPromptApplyBusy, setSettingsPromptApplyBusy] = useState(false);
  const [settingsPromptProposal, setSettingsPromptProposal] = useState<PromptImproveProposal | null>(null);
  const [draftPromptProposal, setDraftPromptProposal] = useState<PromptImproveProposal | null>(null);
  const [promptImproveStatus, setPromptImproveStatus] = useState("");
  const [aiSettingsImprovePending, setAiSettingsImprovePending] = useState(false);
  const [aiSettingsImprovedFields, setAiSettingsImprovedFields] = useState<AiImproveField[]>([]);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([]);
  const [historyCompare, setHistoryCompare] = useState<{ entry: AiSettingsHistoryEntry; change: AiSettingsHistoryChange } | null>(null);
  const [promptCompare, setPromptCompare] = useState<PromptCompareDialog | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("cases");
  const [busy, setBusy] = useState<BusyKey>("");
  const [message, setMessage] = useState("");
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(idleGenerationStatus);
  const [output, setOutput] = useState("");
  const [caseKeys, setCaseKeys] = useState("");
  const [savedFiles, setSavedFiles] = useState<SavedDraftFiles | null>(null);
  const [builtDesignFiles, setBuiltDesignFiles] = useState<BuiltDesignFiles | null>(null);
  const [knowledgeTopic, setKnowledgeTopic] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState("");
  const [knowledgeAudience, setKnowledgeAudience] = useState("");
  const [knowledgeNotes, setKnowledgeNotes] = useState("");
  const [knowledgeArticleDraft, setKnowledgeArticleDraft] = useState<KnowledgeArticle | null>(null);
  const [savedKnowledgeDraftSnapshot, setSavedKnowledgeDraftSnapshot] = useState("");
  const [knowledgeArticles, setKnowledgeArticles] = useState<KnowledgeArticle[]>([]);
  const [knowledgeBusy, setKnowledgeBusy] = useState<"generate" | "save" | "">("");
  const [knowledgeMessage, setKnowledgeMessage] = useState("");
  const [qaWorkspaceItems, setQaWorkspaceItems] = useState<QaWorkspaceItem[]>([]);
  const [workspaceBusy, setWorkspaceBusy] = useState<"load" | "save" | "delete" | "">("");
  const [workspaceStopPatternBusyId, setWorkspaceStopPatternBusyId] = useState("");
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [chatwootInfo, setChatwootInfo] = useState<ChatwootUatInfo | null>(null);
  const [chatwootForm, setChatwootForm] = useState<ChatwootUatRunForm>(emptyChatwootUatForm);
  const [chatwootBusy, setChatwootBusy] = useState<"load" | "run" | "history" | "cancel" | "">("");
  const [chatwootSuiteDraft, setChatwootSuiteDraft] = useState<ChatwootSuiteDraftForm>(emptyChatwootSuiteDraft);
  const [chatwootSuiteBusy, setChatwootSuiteBusy] = useState(false);
  const [chatwootMessage, setChatwootMessage] = useState("");
  const [chatwootResult, setChatwootResult] = useState<ChatwootUatRunResult | null>(null);
  const [chatwootJobs, setChatwootJobs] = useState<ChatwootUatJob[]>([]);
  const [chatwootActiveJob, setChatwootActiveJob] = useState<ChatwootUatJob | null>(null);
  const [chatwootConfirmOpen, setChatwootConfirmOpen] = useState(false);
  const [chatwootCaseSearch, setChatwootCaseSearch] = useState("");
  const [chatwootRunAllCases, setChatwootRunAllCases] = useState(true);
  const [chatwootSelectedCaseIds, setChatwootSelectedCaseIds] = useState<string[]>([]);
  const [expandedChatwootCaseIds, setExpandedChatwootCaseIds] = useState<string[]>([]);
  const [chatwootCaseStopConditionEdits, setChatwootCaseStopConditionEdits] = useState<Record<string, ChatwootStopConditionEdit>>({});
  const [chatwootPreparedSource, setChatwootPreparedSource] = useState<ChatwootSuiteSource | "">("");
  const [chatwootReadinessOpen, setChatwootReadinessOpen] = useState(false);
  const [plannerMenuOpen, setPlannerMenuOpen] = useState(false);
  const ui: UiText = UI_TEXT[languageMode];
  const automationTargetLabels: Record<AutomationProfile["targetType"], string> = {
    chatwoot: ui.automationTargetChatwoot,
    web: ui.automationTargetWeb,
    api: ui.automationTargetApi,
    other: ui.automationTargetOther,
  };
  const chatwootAgentProfiles = useMemo(
    () => project.automationProfiles.filter((profile) => profile.targetType === "chatwoot"),
    [project.automationProfiles],
  );
  const selectedChatwootAgent =
    chatwootAgentProfiles.find((profile) => profile.id === selectedChatwootAgentId) || chatwootAgentProfiles[0] || null;
  const chatwootAutomationConfig = selectedChatwootAgent?.config || automationProfileConfigFromProject(project);
  const effectiveChatwootRunMode = chatwootForm.mode || chatwootAutomationConfig.chatwootMode;
  const effectiveChatwootChatUiMode = chatwootForm.chatUiMode || chatwootAutomationConfig.chatwootChatUiMode;
  const effectiveChatwootPlannerBackend = chatwootForm.plannerBackend || chatwootAutomationConfig.chatwootPlannerBackend;
  const chatwootRunUsesPlanner = effectiveChatwootRunMode === "adaptive";
  const chatwootPreparedSuiteReady = Boolean(chatwootForm.suiteFile && chatwootPreparedSource === chatwootSuiteDraft.source);
  const selectedChatwootSuite = useMemo(
    () => (chatwootPreparedSuiteReady ? chatwootInfo?.suites.find((suite) => suite.relativePath === chatwootForm.suiteFile) || null : null),
    [chatwootForm.suiteFile, chatwootInfo?.suites, chatwootPreparedSuiteReady],
  );
  const selectedChatwootCases = useMemo(
    () =>
      (selectedChatwootSuite?.cases || []).map((testCase) => {
        const edited = chatwootCaseStopConditionEdits[testCase.caseId];
        if (edited === undefined) return testCase;
        return {
          ...testCase,
          stopConditions: {
            pass: normalizeStopConditionLines(edited.pass),
            fail: normalizeStopConditionLines(edited.fail),
          },
        };
      }),
    [chatwootCaseStopConditionEdits, selectedChatwootSuite?.cases],
  );
  const chatwootHasActiveJob = Boolean(chatwootActiveJob && ["queued", "running"].includes(chatwootActiveJob.status));
  const activeChatwootRunMatchesSuite = Boolean(
    chatwootHasActiveJob &&
      chatwootActiveJob?.request?.suiteFile &&
      chatwootActiveJob.request.suiteFile === chatwootForm.suiteFile,
  );
  const chatwootCaseStateById = useMemo(() => {
    const states = activeChatwootRunMatchesSuite ? chatwootActiveJob?.caseStates || [] : [];
    return new globalThis.Map(states.map((state) => [state.caseId, state]));
  }, [activeChatwootRunMatchesSuite, chatwootActiveJob?.caseStates]);
  const filteredChatwootCases = useMemo(() => {
    const query = chatwootCaseSearch.trim().toLowerCase();
    if (!query) return selectedChatwootCases;
    return selectedChatwootCases.filter((testCase) =>
      [
        testCase.caseId,
        testCase.title,
        testCase.openingPrompt,
        testCase.testData,
        testCase.expectedResult,
        testCase.plannerInstruction,
        ...(testCase.steps || []).flatMap((step) => [step.prompt, step.testData, step.expected]),
      ].some((value) => (value || "").toLowerCase().includes(query)),
    );
  }, [chatwootCaseSearch, selectedChatwootCases]);
  const chatwootEffectiveSelectedCaseCount = chatwootRunAllCases ? selectedChatwootCases.length : chatwootSelectedCaseIds.length;
  const chatwootFailedResults = useMemo(
    () => chatwootResult?.report.results.filter((result) => !result.succeeded) || [],
    [chatwootResult],
  );
  const qaWorkspaceTestItems = useMemo(
    () => qaWorkspaceItems.filter((item) => item.testCases.length > 0),
    [qaWorkspaceItems],
  );
  const selectedWorkspaceItem = useMemo(
    () => qaWorkspaceTestItems.find((item) => item.id === chatwootSuiteDraft.workspaceItemId) || null,
    [chatwootSuiteDraft.workspaceItemId, qaWorkspaceTestItems],
  );
  const chatwootReadinessItems = useMemo(
    () => [
      {
        key: "skill",
        label: ui.chatwootSkillStatus,
        ready: Boolean(chatwootInfo?.skillExists),
        detail: chatwootInfo?.skillExists ? ui.chatwootSkillReady : ui.chatwootSkillMissing,
      },
      {
        key: "codex",
        label: "Codex CLI",
        ready: Boolean(chatwootInfo?.codexCliAvailable),
        optional: true,
        detail: chatwootInfo?.codexCliAvailable ? ui.chatwootCodexReady : ui.chatwootCodexUnavailable,
      },
      {
        key: "planner",
        label: ui.chatwootPlannerAi,
        ready: Boolean(chatwootInfo?.plannerAiReady),
        detail: chatwootInfo?.plannerAiReady ? ui.chatwootPlannerAiReady : ui.chatwootPlannerAiMissing,
      },
      {
        key: "auth",
        label: "Chatwoot UAT auth",
        ready: Boolean(chatwootInfo?.serverChatwootAuthReady),
        detail: chatwootInfo?.serverChatwootAuthReady ? ui.chatwootServerAuthReady : ui.chatwootServerAuthMissing,
      },
    ],
    [chatwootInfo, ui],
  );
  const chatwootBlockingReadinessCount = chatwootReadinessItems.filter((item) => !item.ready && !item.optional).length;
  const aiSettingsPlannerModel =
    (savedAiSettings.model || aiSettings.model || chatwootInfo?.defaultPlannerModel || "gpt-5.4-mini").trim();

  function applyDefaults(payload: DefaultsResponse) {
    setDefaults(payload);
    const nextProject = projectFromDefaults(payload);
    setProject(nextProject);
    setSavedSettingsSnapshot((current) => ({
      ...current,
      project: projectSettingsSnapshot(nextProject),
      automation: automationSettingsSnapshot(nextProject),
    }));
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
    let nextAuthEntries: AuthEntry[] = [];
    let nextAiSettings = emptyAiSettings;
    let nextSecretStatus = emptySecretStatus;
    const settingsResponse = await fetch("/api/user-settings");
    if (settingsResponse.ok) {
      const settings = (await settingsResponse.json()) as {
        project?: Partial<ProjectConfig> | null;
        credentials?: Partial<Credentials> | null;
        confluenceCredentials?: Partial<ConfluenceCredentials> | null;
        authEntries?: Partial<AuthEntry>[] | null;
        aiSettings?: Partial<AiSettings> | null;
        aiSettingsHistory?: AiSettingsHistoryEntry[] | null;
        knowledgeArticles?: KnowledgeArticle[] | null;
        qaWorkspaceItems?: QaWorkspaceItem[] | null;
      };
      if (settings.project) {
        nextProject = { ...nextProject, ...settings.project };
      }
      if (settings.credentials) {
        const { saved, ...safeCredentials } = settings.credentials;
        nextCredentials = { ...nextCredentials, ...safeCredentials, password: "", token: "" };
        nextSecretStatus = {
          ...nextSecretStatus,
          jira: {
            hasPassword: Boolean(saved?.hasPassword),
            hasToken: Boolean(saved?.hasToken),
          },
        };
      }
      if (settings.confluenceCredentials) {
        const { baseUrl: _taskBaseUrl, saved, ...savedAuth } = settings.confluenceCredentials;
        nextConfluenceCredentials = { ...nextConfluenceCredentials, ...savedAuth, baseUrl: "", password: "", token: "" };
        nextSecretStatus = {
          ...nextSecretStatus,
          confluence: {
            hasPassword: Boolean(saved?.hasPassword),
            hasToken: Boolean(saved?.hasToken),
          },
        };
      }
      if (Array.isArray(settings.authEntries)) {
        nextAuthEntries = settings.authEntries.map(safeAuthEntry);
      }
      if (settings.aiSettings) {
        const { saved, knowledge, ...safeAiSettings } = settings.aiSettings;
        nextAiSettings = {
          ...nextAiSettings,
          ...safeAiSettings,
          apiKey: "",
          knowledge: {
            ...emptyAiSettings.knowledge!,
            ...nextAiSettings.knowledge,
            ...(knowledge || {}),
            apiKey: "",
          },
        };
        nextAiSettings.promptGuidelines = aiPromptGuidelinesFromSettings(nextAiSettings);
        nextSecretStatus = {
          ...nextSecretStatus,
          ai: {
            hasApiKey: Boolean(saved?.hasApiKey),
            hasKnowledgeApiKey: Boolean(saved?.hasKnowledgeApiKey || knowledge?.saved?.hasApiKey),
          },
        };
      }
      if (Array.isArray(settings.knowledgeArticles)) {
        setKnowledgeArticles(settings.knowledgeArticles);
      }
      if (Array.isArray(settings.aiSettingsHistory)) {
        setAiSettingsHistory(settings.aiSettingsHistory);
      }
      if (Array.isArray(settings.qaWorkspaceItems)) {
        setQaWorkspaceItems(settings.qaWorkspaceItems);
      }
    }
    setProject(nextProject);
    setCredentials(nextCredentials);
    setConfluenceCredentials(nextConfluenceCredentials);
    setAuthEntries(nextAuthEntries);
    setAiSettings(nextAiSettings);
    setSavedAiSettings(nextAiSettings);
    setSecretStatus(nextSecretStatus);
    setSavedSettingsSnapshot(settingsSnapshots(nextProject, nextCredentials, nextConfluenceCredentials, nextAuthEntries, nextAiSettings));
    setAiSettingsImprovePending(false);
    setAiSettingsImprovedFields([]);
    setSettingsPromptProposal(null);
    setDraftPromptProposal(null);
    setSavedKnowledgeDraftSnapshot("");
  }

  async function loadChatwootUatInfo() {
    setChatwootBusy((current) => current || "load");
    try {
      const response = await fetch("/api/chatwoot-uat");
      const payload = (await response.json()) as ChatwootUatInfo & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      setChatwootInfo(payload);
      setChatwootForm((current) => ({
        ...current,
        suiteFile: current.suiteFile && !current.suiteFile.endsWith("default_suite.yml") ? current.suiteFile : "",
      }));
      if (chatwootPreparedSource && chatwootPreparedSource !== chatwootSuiteDraft.source) {
        setChatwootPreparedSource("");
      }
      setChatwootMessage(payload.skillExists ? "" : ui.chatwootSkillMissing);
    } catch (error) {
      setChatwootMessage(error instanceof Error ? error.message : "Không load được Chatwoot UAT.");
    } finally {
      setChatwootBusy((current) => (current === "load" ? "" : current));
    }
  }

  async function loadChatwootJobs() {
    setChatwootBusy((current) => current || "history");
    try {
      const response = await fetch("/api/chatwoot-uat/jobs");
      const payload = (await response.json()) as { jobs?: ChatwootUatJob[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      const jobs = payload.jobs || [];
      setChatwootJobs(jobs);
      const latestActive = jobs.find((job) => job.status === "queued" || job.status === "running");
      if (latestActive) {
        setChatwootActiveJob(latestActive);
      }
    } catch (error) {
      setChatwootMessage(error instanceof Error ? error.message : "Không load được lịch sử Chatwoot UAT.");
    } finally {
      setChatwootBusy((current) => (current === "history" ? "" : current));
    }
  }

  async function loadQaWorkspace() {
    setWorkspaceBusy((current) => current || "load");
    try {
      const response = await fetch("/api/qa-workspace");
      const payload = (await response.json()) as { items?: QaWorkspaceItem[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      const items = payload.items || [];
      setQaWorkspaceItems(items);
      setChatwootSuiteDraft((current) => {
        if (current.workspaceItemId && items.some((item) => item.id === current.workspaceItemId)) return current;
        const preferred = items.find((item) => /AI-548/i.test(`${item.issueKey} ${item.sourceKey} ${item.title}`)) || items[0];
        return { ...current, workspaceItemId: preferred?.id || "" };
      });
      setWorkspaceMessage(items.length ? "" : ui.qaWorkspaceEmpty);
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : "Không load được QA Workspace.");
    } finally {
      setWorkspaceBusy((current) => (current === "load" ? "" : current));
    }
  }

  async function refreshChatwootJob(jobId: string) {
    const response = await fetch(`/api/chatwoot-uat/jobs/${encodeURIComponent(jobId)}`);
    const payload = (await response.json()) as { job?: ChatwootUatJob; error?: string };
    if (!response.ok || !payload.job) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    const job = payload.job;
    setChatwootActiveJob(job);
    setChatwootJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
    if (job.status === "completed" && job.result) {
      setChatwootResult(job.result);
      setChatwootMessage(ui.chatwootRunDone);
    } else if (job.status === "interrupted") {
      setChatwootMessage(job.error || ui.chatwootRunStopped);
    } else if (job.status === "failed") {
      setChatwootMessage(job.error || ui.chatwootJobFailed);
    } else {
      setChatwootMessage(ui.chatwootJobRunning);
    }
    return job;
  }

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage failures; the selected theme still applies for this session.
    }
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.lang = languageMode;
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, languageMode);
    } catch {
      // Ignore storage failures; the selected language still applies for this session.
    }
  }, [languageMode]);

  useEffect(() => {
    setExpandedKnowledgeCards([]);
  }, [activeKnowledgeSection, languageMode]);

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
    if (authenticated) {
      void loadQaWorkspace();
      void loadChatwootUatInfo();
      void loadChatwootJobs();
    }
  }, [authenticated]);

  useEffect(() => {
    if (!chatwootActiveJob || !["queued", "running"].includes(chatwootActiveJob.status)) return;
    const timer = window.setInterval(() => {
      void refreshChatwootJob(chatwootActiveJob.id).catch((error) => {
        setChatwootMessage(error instanceof Error ? error.message : "Không cập nhật được trạng thái Chatwoot UAT.");
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [chatwootActiveJob?.id, chatwootActiveJob?.status]);

  useEffect(() => {
    if (!chatwootAgentProfiles.length) {
      if (selectedChatwootAgentId) setSelectedChatwootAgentId("");
      return;
    }
    if (!selectedChatwootAgentId || !chatwootAgentProfiles.some((profile) => profile.id === selectedChatwootAgentId)) {
      setSelectedChatwootAgentId(chatwootAgentProfiles[0].id);
    }
  }, [chatwootAgentProfiles, selectedChatwootAgentId]);

  useEffect(() => {
    if (!selectedChatwootAgent) return;
    setChatwootForm((current) => ({
      ...current,
      mode: selectedChatwootAgent.config.chatwootMode,
      chatUiMode: selectedChatwootAgent.config.chatwootChatUiMode,
      plannerBackend: selectedChatwootAgent.config.chatwootPlannerBackend,
      maxUserTurns: selectedChatwootAgent.config.chatwootMaxUserTurns || current.maxUserTurns,
      plannerModel: selectedChatwootAgent.config.chatwootPlannerModel || current.plannerModel,
      plannerTimeoutSeconds: selectedChatwootAgent.config.chatwootPlannerTimeoutSeconds || current.plannerTimeoutSeconds,
    }));
    setPlannerMenuOpen(false);
  }, [
    selectedChatwootAgent?.id,
    selectedChatwootAgent?.config.chatwootMode,
    selectedChatwootAgent?.config.chatwootChatUiMode,
    selectedChatwootAgent?.config.chatwootPlannerBackend,
    selectedChatwootAgent?.config.chatwootMaxUserTurns,
    selectedChatwootAgent?.config.chatwootPlannerModel,
    selectedChatwootAgent?.config.chatwootPlannerTimeoutSeconds,
  ]);

  useEffect(() => {
    setChatwootRunAllCases(true);
    setChatwootSelectedCaseIds([]);
    setChatwootCaseSearch("");
    setExpandedChatwootCaseIds([]);
    setChatwootCaseStopConditionEdits({});
  }, [chatwootForm.suiteFile]);

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
  const knowledgeContent = KNOWLEDGE_CONTENT[languageMode];
  const activeKnowledge = activeKnowledgeSection === "aiWriter" ? null : knowledgeContent[activeKnowledgeSection];
  const knowledgeSections: Array<{ key: KnowledgeSection; icon: ReactNode }> = [
    { key: "aiWriter", icon: <Wand2 size={16} /> },
    { key: "principles", icon: <GraduationCap size={16} /> },
    { key: "process", icon: <ListChecks size={16} /> },
    { key: "techniques", icon: <Brain size={16} /> },
    { key: "levels", icon: <Layers size={16} /> },
    { key: "reviews", icon: <ScanSearch size={16} /> },
    { key: "defects", icon: <Bug size={16} /> },
  ];
  const settingsDirty = useMemo(
    () => ({
      project: projectSettingsSnapshot(project) !== savedSettingsSnapshot.project,
      auth: authSettingsSnapshot(credentials, confluenceCredentials, authEntries) !== savedSettingsSnapshot.auth,
      automation: automationSettingsSnapshot(project) !== savedSettingsSnapshot.automation,
      ai: aiCoreSettingsSnapshot(aiSettings) !== savedSettingsSnapshot.ai,
      knowledgeAi: knowledgeAiSettingsSnapshot(aiSettings) !== savedSettingsSnapshot.knowledgeAi,
    }),
    [project, credentials, confluenceCredentials, authEntries, aiSettings, savedSettingsSnapshot],
  );
  const knowledgeDraftDirty = useMemo(
    () => Boolean(knowledgeArticleDraft && knowledgeArticleSnapshot(knowledgeArticleDraft) !== savedKnowledgeDraftSnapshot),
    [knowledgeArticleDraft, savedKnowledgeDraftSnapshot],
  );
  const readinessItems = useMemo<ReadinessItem[]>(() => {
    const effectiveIssueKey = issueKeyFromText(jiraUrl) || issue.key;
    const jiraAuthReady = !credentials.enabled || Boolean(credentials.user.trim() && (credentials.password.trim() || credentials.token.trim() || secretStatus.jira.hasPassword || secretStatus.jira.hasToken));
    const hasDocInput = Boolean(confluenceLinks.trim() || looksLikeConfluencePageUrl(confluenceBaseUrl));
    const confluenceAuthReady =
      !hasDocInput ||
      !confluenceCredentials.enabled ||
      Boolean(confluenceCredentials.user.trim() && (confluenceCredentials.password.trim() || confluenceCredentials.token.trim() || secretStatus.confluence.hasPassword || secretStatus.confluence.hasToken));
    const aiReady = !savedAiSettings.enabled || Boolean(savedAiSettings.model.trim() && (savedAiSettings.apiKey.trim() || secretStatus.ai.hasApiKey));
    return [
      {
        id: "jira-input",
        label: ui.jiraTask,
        detail: effectiveIssueKey ? `${effectiveIssueKey} đã sẵn sàng.` : "Cần nhập Jira URL hoặc issue key.",
        ok: Boolean(effectiveIssueKey),
      },
      {
        id: "jira-auth",
        label: ui.jiraAuth,
        detail: jiraAuthReady ? "Có đủ auth để đọc Jira khi cần." : "Thiếu user + token/password Jira.",
        ok: jiraAuthReady,
      },
      {
        id: "task-context",
        label: ui.taskContext,
        detail: issue.summary || issue.description ? "Đã có summary/description để generate." : "Nên Đọc Jira hoặc nhập context thủ công.",
        ok: Boolean(issue.summary || issue.description),
      },
      {
        id: "docs",
        label: ui.confluenceDocLinks,
        detail: hasDocInput
          ? docContext.trim()
            ? `${docContext.length.toLocaleString()} ký tự doc sẽ được dùng.`
            : confluenceAuthReady
              ? "Có link/auth, nên Đọc Jira để fetch doc trước khi generate."
              : "Có link doc nhưng thiếu Confluence auth."
          : "Task không có doc link, có thể generate bằng Jira context.",
        ok: !hasDocInput || Boolean(docContext.trim()),
      },
      {
        id: "ai",
        label: ui.aiSettings,
        detail: savedAiSettings.enabled ? (aiReady ? `${savedAiSettings.model || "AI model"} đã cấu hình.` : "AI đang bật nhưng thiếu model/API key.") : "AI tắt, app sẽ dùng fallback local.",
        ok: aiReady,
      },
      {
        id: "wrappers",
        label: ui.automationRun,
        detail: defaults?.wrappers.xmindExists && defaults?.wrappers.jiraExists ? "Wrapper Jira/XMind có sẵn." : "Một số wrapper local chưa sẵn sàng.",
        ok: Boolean(defaults?.wrappers.xmindExists && defaults?.wrappers.jiraExists),
      },
    ];
  }, [jiraUrl, issue, credentials, confluenceCredentials, confluenceLinks, confluenceBaseUrl, docContext, savedAiSettings, secretStatus, defaults, ui]);
  const qualityItems = useMemo(
    () => buildQualityItems(testCases, outline, docContext, issueKeyFromText(jiraUrl) || issue.key, ui),
    [testCases, outline, docContext, jiraUrl, issue.key, ui],
  );
  const currentStopPatternStats = useMemo(() => stopPatternStats(testCases), [testCases]);
  const coverageRows = useMemo(
    () => buildCoverageRows(issue, qaPlan, testCases),
    [issue, qaPlan, testCases],
  );
  const filteredTestCases = useMemo(
    () => testCases.map((testCase, index) => ({ testCase, index })).filter(({ testCase }) => caseMatchesFilter(testCase, caseFilter)),
    [testCases, caseFilter],
  );
  const caseFilterCounts = useMemo(() => {
    const filters: CaseFilter[] = ["all", "happy", "negative", "edge", "regression", "auth", "validation", "doc"];
    return Object.fromEntries(filters.map((filter) => [filter, testCases.filter((testCase) => caseMatchesFilter(testCase, filter)).length])) as Record<CaseFilter, number>;
  }, [testCases]);
  const runPipelineItems = useMemo<PipelineItem[]>(
    () => [
      {
        id: "draft",
        label: ui.generateDraft,
        detail: testCases.length ? `${testCases.length} test case, ${outline.branches.length} branch.` : "Chưa có draft để chạy.",
        done: Boolean(testCases.length && outline.branches.length),
      },
      {
        id: "json",
        label: ui.downloadJson,
        detail: savedFiles ? savedFiles.cases.file : "Chưa lưu JSON test case/test design.",
        done: Boolean(savedFiles),
      },
      {
        id: "design",
        label: ui.buildLocalFiles,
        detail: builtDesignFiles?.xmind || builtDesignFiles?.png ? "Đã build file local." : "Chưa build XMind/PNG.",
        done: Boolean(builtDesignFiles?.xmind || builtDesignFiles?.png),
      },
      {
        id: "suite",
        label: ui.createSuite,
        detail: caseKeys ? `${caseKeys.split(",").filter(Boolean).length} key đã tạo.` : "Chưa tạo suite/test case trên Jira.",
        done: Boolean(caseKeys),
      },
    ],
    [testCases, outline.branches.length, savedFiles, builtDesignFiles, caseKeys, ui],
  );
  const knowledgeSearchText = normalizeComparableText(knowledgeSearch);

  function toggleLanguageMode() {
    const nextLanguage = languageMode === "vi" ? "en" : "vi";
    document.documentElement.lang = nextLanguage;
    setLanguageMode(nextLanguage);
  }

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
    aiSettings: savedAiSettings,
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
    if (credentials.enabled === false) {
      errors["credentials.user"] = `Cần bật ${ui.jiraAuth} để đọc Jira link/task.`;
      return;
    }
    const hasToken = Boolean(credentials.token.trim() || secretStatus.jira.hasToken);
    const hasUserPassword = Boolean(credentials.user.trim() && (credentials.password.trim() || secretStatus.jira.hasPassword));
    if (hasToken || hasUserPassword) return;

    const suffix = reason ? ` ${reason}` : "";
    if (!credentials.user.trim()) {
      errors["credentials.user"] = `Cần nhập Jira User nếu không dùng Token.${suffix}`;
    }
    if (!credentials.password.trim()) {
      errors["credentials.password"] = `Cần nhập Jira Password nếu không dùng Token, hoặc lưu Jira password trước đó.${suffix}`;
    }
    if (!credentials.token.trim()) {
      errors["credentials.token"] = `Cần nhập Jira Token hoặc đủ User + Password, hoặc dùng token đã lưu.${suffix}`;
    }
  }

  function addRequiredProjectErrors(errors: ValidationErrors) {
    if (!project.jiraBaseUrl.trim()) errors["project.jiraBaseUrl"] = "Jira base URL bắt buộc để map Jira API và link issue.";
    if (!project.projectKey.trim()) errors["project.projectKey"] = "Project key bắt buộc để map Jira project và tạo testcase/design.";
    if (!project.folderRoot.trim()) errors["project.folderRoot"] = "Test case folder root bắt buộc để biết nơi tạo testcase.";
    if (!project.runRoot.trim()) errors["project.runRoot"] = "Test cycle run root bắt buộc để biết nơi tạo test cycle.";
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

  function validateConfluenceFetch(linksText = confluenceLinks, baseUrlText = confluenceBaseUrl) {
    const fetchInput = resolveConfluenceFetchInput(linksText, baseUrlText);
    const errors: ValidationErrors = {};
    if (!fetchInput.linksText.trim()) {
      errors.confluenceLinks = "Cần nhập ít nhất 1 link Confluence/doc trước khi Fetch docs.";
    }
    if (!fetchInput.baseUrlText.trim()) {
      errors.confluenceBaseUrl = "Cần Confluence Base URL cho task này trước khi Fetch docs.";
    }
    if (confluenceCredentials.enabled === false) {
      errors["confluence.user"] = `Cần bật ${ui.confluenceAuth} để fetch docs.`;
      return errors;
    }
    if (!confluenceCredentials.user.trim()) {
      errors["confluence.user"] = "Cần nhập Confluence User để fetch docs.";
    }
    if (!confluenceCredentials.password.trim() && !secretStatus.confluence.hasPassword) {
      errors["confluence.password"] = "Cần nhập Confluence Password để fetch docs hoặc lưu password trước đó.";
    }
    if (!confluenceCredentials.token.trim() && !secretStatus.confluence.hasToken) {
      errors["confluence.token"] = "Cần nhập Confluence Token để fetch docs hoặc lưu token trước đó.";
    }
    return errors;
  }

  function resolveConfluenceFetchInput(linksText = confluenceLinks, baseUrlText = confluenceBaseUrl) {
    const rawLinks = linksText.trim();
    const rawBaseUrl = baseUrlText.trim();
    const linksFromBaseUrl = rawLinks ? "" : looksLikeConfluencePageUrl(rawBaseUrl) ? rawBaseUrl : "";
    const effectiveLinks = rawLinks || linksFromBaseUrl;
    const effectiveBaseUrl = rawBaseUrl
      ? looksLikeConfluencePageUrl(rawBaseUrl)
        ? inferConfluenceBaseUrl(rawBaseUrl) || rawBaseUrl
        : rawBaseUrl
      : inferConfluenceBaseUrl(effectiveLinks);
    return {
      linksText: effectiveLinks,
      baseUrlText: effectiveBaseUrl,
      usedBaseUrlAsDocLink: Boolean(linksFromBaseUrl),
    };
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
    if (savedAiSettings.enabled) {
      if (!savedAiSettings.baseUrl.trim()) errors["ai.baseUrl"] = "Base URL bắt buộc khi bật AI Settings.";
      if (!savedAiSettings.model.trim()) errors["ai.model"] = "Model bắt buộc khi bật AI Settings.";
      if (!savedAiSettings.apiKey.trim() && !secretStatus.ai.hasApiKey) errors["ai.apiKey"] = "API key bắt buộc khi bật AI Settings hoặc đã được lưu trước đó.";
    }
    return errors;
  }

  function setProjectValue<K extends keyof ProjectConfig>(key: K, value: ProjectConfig[K]) {
    clearValidationErrors(key === "labelMode" ? ["project.testcaseLabels", "project.testdesignLabels"] : [`project.${key}`]);
    setProject((current) => ({ ...current, [key]: value }));
  }

  function setChatwootPlannerBackend(value: ProjectConfig["chatwootPlannerBackend"]) {
    clearValidationErrors(["project.chatwootPlannerBackend", "project.chatwootPlannerModel"]);
    setProject((current) => ({
      ...current,
      chatwootPlannerBackend: value,
      chatwootPlannerModel: value === "openai-compatible" ? aiSettingsPlannerModel : current.chatwootPlannerModel || aiSettingsPlannerModel,
    }));
  }

  function setCredentialValue(key: "user" | "password" | "token", value: string) {
    clearValidationErrors(["credentials.user", "credentials.password", "credentials.token"]);
    setCredentials((current) => ({ ...current, [key]: value }));
  }

  function setJiraAuthEnabled(enabled: boolean) {
    clearValidationErrors(["credentials.user", "credentials.password", "credentials.token"]);
    setCredentials((current) => ({ ...current, enabled }));
  }

  function setConfluenceCredentialValue(key: "user" | "password" | "token", value: string) {
    clearValidationErrors([`confluence.${key}`]);
    setConfluenceCredentials((current) => ({ ...current, [key]: value }));
  }

  function setConfluenceAuthEnabled(enabled: boolean) {
    clearValidationErrors(["confluence.user", "confluence.password", "confluence.token"]);
    setConfluenceCredentials((current) => ({ ...current, enabled }));
  }

  function setAuthEntryValue<K extends keyof AuthEntry>(id: string, key: K, value: AuthEntry[K]) {
    setAuthEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, [key]: value } : entry)));
  }

  function addAuthEntry() {
    setAuthEntries((current) => [...current, createEmptyAuthEntry()]);
  }

  function removeAuthEntry(id: string) {
    setAuthEntries((current) => current.filter((entry) => entry.id !== id));
  }

  function setAiSettingValue<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    clearValidationErrors(key === "enabled" ? ["ai.baseUrl", "ai.model", "ai.apiKey"] : [`ai.${String(key)}`]);
    setSettingsPromptProposal(null);
    setDraftPromptProposal(null);
    setAiSettings((current) => ({ ...current, [key]: value }));
  }

  function setKnowledgeAiSettingValue<K extends keyof NonNullable<AiSettings["knowledge"]>>(key: K, value: NonNullable<AiSettings["knowledge"]>[K]) {
    clearValidationErrors(key === "enabled" ? ["knowledgeAi.baseUrl", "knowledgeAi.model", "knowledgeAi.apiKey"] : [`knowledgeAi.${String(key)}`]);
    setAiSettings((current) => ({
      ...current,
      knowledge: {
        ...(current.knowledge || emptyAiSettings.knowledge!),
        [key]: value,
      },
    }));
  }

  function applyPromptImproveUpdates(baseSettings: AiSettings, updates: PromptImproveUpdate[]) {
    const next = { ...baseSettings };
    for (const update of updates) {
      next[update.targetField] = update.improvedPrompt.trim();
    }
    return next;
  }

  function createPromptImproveProposal(
    source: PromptImproveProposal["source"],
    instruction: string,
    baseSettings: AiSettings,
    updates: PromptImproveUpdate[],
    summary?: string,
  ): PromptImproveProposal {
    const changedFields = Array.from(new Set(updates.map((update) => update.targetField)));
    const changedLabels = changedFields.map((field) => aiImproveFieldLabel(field, ui)).join(", ");
    return {
      source,
      instruction,
      beforePrompt: aiPromptGuidelinesFromSettings(baseSettings),
      updates,
      nextAiSettings: applyPromptImproveUpdates(baseSettings, updates),
      changedFields,
      changedLabels,
      summary,
    };
  }

  function aiSettingsSavePayloadFromForm(nextAiSettingsForm: AiSettings) {
    return {
      ...savedAiSettings,
      enabled: nextAiSettingsForm.enabled,
      provider: nextAiSettingsForm.provider,
      baseUrl: nextAiSettingsForm.baseUrl,
      model: nextAiSettingsForm.model,
      apiKey: nextAiSettingsForm.apiKey,
      promptGuidelines: nextAiSettingsForm.promptGuidelines,
      stopConditionGuidelines: nextAiSettingsForm.stopConditionGuidelines,
      writingStyle: nextAiSettingsForm.writingStyle,
      testCaseGuidelines: nextAiSettingsForm.testCaseGuidelines,
      testDesignGuidelines: nextAiSettingsForm.testDesignGuidelines,
      improvementNotes: nextAiSettingsForm.improvementNotes,
      knowledge: savedAiSettings.knowledge || emptyAiSettings.knowledge!,
    };
  }

  async function persistImprovedAiSettings(proposal: PromptImproveProposal) {
    const aiSettingsForSave = aiSettingsSavePayloadFromForm(proposal.nextAiSettings);
    const savedPayload = await apiPost<{ aiSettingsHistory?: AiSettingsHistoryEntry[] }>("/api/user-settings", {
      aiSettings: aiSettingsForSave,
      settingsSection: "ai",
      historyMeta: {
        source: "ai_prompt_improve",
        summary:
          proposal.source === "settings"
            ? `AI improve prompt từ Cài đặt AI${proposal.changedLabels ? ` | Cập nhật: ${proposal.changedLabels}` : ""}`
            : `AI improve prompt${proposal.changedLabels ? ` | Cập nhật: ${proposal.changedLabels}` : ""}`,
      },
    });
    if (Array.isArray(savedPayload.aiSettingsHistory)) {
      setAiSettingsHistory(savedPayload.aiSettingsHistory);
    }
    const nextSavedAiSettings = { ...aiSettingsForSave, apiKey: "" };
    const nextFormAiSettings = { ...proposal.nextAiSettings, apiKey: "" };
    setSecretStatus((current) => ({
      ...current,
      ai: {
        ...current.ai,
        hasApiKey: Boolean(proposal.nextAiSettings.apiKey.trim() || current.ai.hasApiKey),
      },
    }));
    setAiSettings(nextFormAiSettings);
    setSavedAiSettings(nextSavedAiSettings);
    setSavedSettingsSnapshot((current) => ({
      ...current,
      ai: aiCoreSettingsSnapshot(nextFormAiSettings),
    }));
    setAiSettingsImprovePending(true);
    setAiSettingsImprovedFields(proposal.changedFields);
    setSettingsStatus((current) => ({ ...current, ai: "" }));
    return nextSavedAiSettings;
  }

  function resetGeneratedDraft(nextIssueKey: string) {
    const nextIssue = { ...emptyIssue, key: nextIssueKey };
    setTestCases([]);
    setDetailCaseIndex(null);
    setCaseFilter("all");
    setOutline(emptyOutline(nextIssue));
    setCaseKeys("");
    setOutput("");
    setSavedFiles(null);
    setBuiltDesignFiles(null);
    setQaPlan(null);
    setImproveInstruction("");
    setLastImproveInstruction("");
    setPromptImproveStatus("");
    setDraftPromptProposal(null);
    setSourceConfigOpen(true);
    setImprovePanelOpen(false);
    setGenerationStatus(idleGenerationStatus);
    setActiveTab("cases");
  }

  function recordDraftHistory(source: string, nextTestCases: TestCase[], nextOutline: TestDesignOutline, nextQaPlan?: QaPlan | null) {
    if (!nextTestCases.length) return;
    const entry: DraftHistoryEntry = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `draft-${Date.now()}`,
      createdAt: new Date().toISOString(),
      issueKey: nextOutline.issue_key || issue.key || issueKeyFromText(jiraUrl),
      source,
      testCases: JSON.parse(JSON.stringify(nextTestCases)) as TestCase[],
      outline: JSON.parse(JSON.stringify(nextOutline)) as TestDesignOutline,
      qaPlan: nextQaPlan ? (JSON.parse(JSON.stringify(nextQaPlan)) as QaPlan) : null,
    };
    setDraftHistory((current) => [entry, ...current.filter((item) => item.issueKey !== entry.issueKey || item.source !== entry.source || item.createdAt !== entry.createdAt)].slice(0, 8));
  }

  function restoreDraftHistory(entry: DraftHistoryEntry) {
    setTestCases(JSON.parse(JSON.stringify(entry.testCases)) as TestCase[]);
    setOutline(JSON.parse(JSON.stringify(entry.outline)) as TestDesignOutline);
    setQaPlan(entry.qaPlan ? (JSON.parse(JSON.stringify(entry.qaPlan)) as QaPlan) : null);
    setDetailCaseIndex(null);
    setCaseFilter("all");
    setActiveTab("cases");
    setSourceConfigOpen(false);
    setImprovePanelOpen(false);
    setMessage(`Đã khôi phục draft ${entry.issueKey} từ ${new Date(entry.createdAt).toLocaleString(languageMode === "en" ? "en-US" : "vi-VN")}.`);
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
    setAiSettings(emptyAiSettings);
    setSavedAiSettings(emptyAiSettings);
    setAiSettingsHistory([]);
    setSavedSettingsSnapshot(initialSavedSettingsSnapshot);
    setAiSettingsImprovePending(false);
    setSettingsImproveInstruction("");
    setSettingsPromptImproveStatus("");
    setSettingsPromptImproveBusy(false);
    setSettingsPromptApplyBusy(false);
    setConnectionBusy("");
    setConnectionStatus({});
    setSettingsPromptProposal(null);
    setDraftPromptProposal(null);
    setOutput("");
    setMessage("");
    setSavedFiles(null);
    setBuiltDesignFiles(null);
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
    if (!settingsDirty[section]) return;
    const savedConfluenceCredentials = { ...confluenceCredentials, baseUrl: "" };
    const aiSettingsForSave =
      section === "ai"
        ? {
            ...savedAiSettings,
            enabled: aiSettings.enabled,
            provider: aiSettings.provider,
            baseUrl: aiSettings.baseUrl,
            model: aiSettings.model,
            apiKey: aiSettings.apiKey,
            promptGuidelines: aiSettings.promptGuidelines,
            stopConditionGuidelines: aiSettings.stopConditionGuidelines,
            writingStyle: aiSettings.writingStyle,
            testCaseGuidelines: aiSettings.testCaseGuidelines,
            testDesignGuidelines: aiSettings.testDesignGuidelines,
            improvementNotes: aiSettings.improvementNotes,
            knowledge: savedAiSettings.knowledge || emptyAiSettings.knowledge!,
          }
        : section === "knowledgeAi"
          ? {
              ...savedAiSettings,
              knowledge: aiSettings.knowledge || emptyAiSettings.knowledge!,
            }
          : aiSettings;
    const body =
      section === "project" || section === "automation"
        ? { project }
        : section === "auth"
          ? { credentials, confluenceCredentials: savedConfluenceCredentials, authEntries }
          : { aiSettings: aiSettingsForSave };
    const label =
      section === "project"
        ? "Project config"
        : section === "automation"
          ? "Automation config"
        : section === "auth"
          ? "Authentication"
          : section === "knowledgeAi"
            ? "Knowledge AI Settings"
            : "AI Settings";
    const historyMeta = { source: "manual_save", summary: label };
    setSettingsBusy(section);
    setSettingsStatus((current) => ({ ...current, [section]: "" }));
    try {
      const payload = await apiPost<{ aiSettingsHistory?: AiSettingsHistoryEntry[] }>("/api/user-settings", {
        ...body,
        settingsSection: section,
        historyMeta,
      });
      if (Array.isArray(payload.aiSettingsHistory)) {
        setAiSettingsHistory(payload.aiSettingsHistory);
      }
      if (section === "project" || section === "automation") {
        setSavedSettingsSnapshot((current) => ({
          ...current,
          project: projectSettingsSnapshot(project),
          automation: automationSettingsSnapshot(project),
        }));
      }
      if (section === "auth") {
        const nextCredentials = { ...credentials, password: "", token: "" };
        const nextConfluenceCredentials = { ...confluenceCredentials, baseUrl: "", password: "", token: "" };
        const nextAuthEntries = authEntries.map((entry) => ({
          ...entry,
          password: "",
          token: "",
          saved: {
            hasPassword: Boolean(entry.password.trim() || entry.saved?.hasPassword),
            hasToken: Boolean(entry.token.trim() || entry.saved?.hasToken),
          },
        }));
        setSecretStatus((current) => ({
          ...current,
          jira: {
            hasPassword: Boolean(credentials.password.trim() || current.jira.hasPassword),
            hasToken: Boolean(credentials.token.trim() || current.jira.hasToken),
          },
          confluence: {
            hasPassword: Boolean(confluenceCredentials.password.trim() || current.confluence.hasPassword),
            hasToken: Boolean(confluenceCredentials.token.trim() || current.confluence.hasToken),
          },
        }));
        setCredentials(nextCredentials);
        setConfluenceCredentials(nextConfluenceCredentials);
        setAuthEntries(nextAuthEntries);
        setSavedSettingsSnapshot((current) => ({
          ...current,
          auth: authSettingsSnapshot(nextCredentials, nextConfluenceCredentials, nextAuthEntries),
        }));
      }
      if (section === "ai") {
        const nextSavedAiSettings = { ...aiSettingsForSave, apiKey: "" };
        const nextFormAiSettings = { ...aiSettings, apiKey: "" };
        setSecretStatus((current) => ({
          ...current,
          ai: {
            ...current.ai,
            hasApiKey: Boolean(aiSettings.apiKey.trim() || current.ai.hasApiKey),
          },
        }));
        setAiSettings(nextFormAiSettings);
        setSavedAiSettings(nextSavedAiSettings);
        setSavedSettingsSnapshot((current) => ({
          ...current,
          ai: aiCoreSettingsSnapshot(nextFormAiSettings),
        }));
        setAiSettingsImprovePending(false);
        setAiSettingsImprovedFields([]);
        setSettingsPromptProposal(null);
        setDraftPromptProposal(null);
      }
      if (section === "knowledgeAi") {
        const nextSavedAiSettings = {
          ...savedAiSettings,
          knowledge: {
            ...(aiSettings.knowledge || emptyAiSettings.knowledge!),
            apiKey: "",
          },
        };
        const nextFormAiSettings = {
          ...aiSettings,
          knowledge: {
            ...(aiSettings.knowledge || emptyAiSettings.knowledge!),
            apiKey: "",
          },
        };
        setSecretStatus((current) => ({
          ...current,
          ai: {
            ...current.ai,
            hasKnowledgeApiKey: Boolean(aiSettings.knowledge?.apiKey?.trim() || current.ai.hasKnowledgeApiKey),
          },
        }));
        setAiSettings(nextFormAiSettings);
        setSavedAiSettings(nextSavedAiSettings);
        setSavedSettingsSnapshot((current) => ({
          ...current,
          knowledgeAi: knowledgeAiSettingsSnapshot(nextFormAiSettings),
        }));
      }
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

  async function persistAutomationProjectSettings(nextProject: ProjectConfig, successText: string, summary: string) {
    setSettingsBusy("automation");
    setSettingsStatus((current) => ({ ...current, automation: "" }));
    try {
      await apiPost("/api/user-settings", {
        project: nextProject,
        settingsSection: "automation",
        historyMeta: { source: "manual_save", summary },
      });
      setProject(nextProject);
      setSavedSettingsSnapshot((current) => ({
        ...current,
        project: projectSettingsSnapshot(nextProject),
        automation: automationSettingsSnapshot(nextProject),
      }));
      setSettingsStatus((current) => ({ ...current, automation: successText }));
      setMessage(successText);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không lưu được cấu hình automation.";
      setSettingsStatus((current) => ({ ...current, automation: text }));
      setMessage(text);
    } finally {
      setSettingsBusy("");
    }
  }

  async function saveAutomationProfile() {
    const name = automationProfileName.trim() || defaultAutomationProfileName(project);
    const existingProfile = project.automationProfiles.find((profile) => profile.name.trim().toLowerCase() === name.toLowerCase());
    const now = new Date().toISOString();
    const nextProfile: AutomationProfile = {
      id: existingProfile?.id || createAutomationProfileId(),
      name,
      targetType: automationProfileTargetType,
      createdAt: existingProfile?.createdAt || now,
      updatedAt: now,
      config: automationProfileConfigFromProject(project),
    };
    const nextProfiles = [
      nextProfile,
      ...project.automationProfiles.filter((profile) => profile.id !== nextProfile.id && profile.name.trim().toLowerCase() !== name.toLowerCase()),
    ].slice(0, AUTOMATION_PROFILE_LIMIT);
    const nextProject = { ...project, automationProfiles: nextProfiles };
    await persistAutomationProjectSettings(nextProject, `${ui.automationProfileSaved}: ${name}`, `Automation profile: ${name}`);
    if (nextProfile.targetType === "chatwoot") {
      setSelectedChatwootAgentId(nextProfile.id);
    }
    setAutomationProfileName("");
    setAutomationEditorBackupConfig(null);
    setAutomationEditorOpen(false);
  }

  function openNewAutomationConnector() {
    setAutomationEditorBackupConfig((currentBackup) => currentBackup || automationProfileConfigFromProject(project));
    setProject((current) => projectWithAutomationProfileConfig(current, blankAutomationProfileConfig()));
    setAutomationProfileName("");
    setAutomationProfileTargetType("chatwoot");
    setAutomationEditorOpen(true);
    setSettingsStatus((current) => ({ ...current, automation: "" }));
  }

  function editAutomationProfile(profile: AutomationProfile) {
    setAutomationEditorBackupConfig((currentBackup) => currentBackup || automationProfileConfigFromProject(project));
    const nextProject = projectWithAutomationProfileConfig(project, profile.config);
    setProject(nextProject);
    setAutomationProfileName(profile.name);
    setAutomationProfileTargetType(profile.targetType);
    setAutomationEditorOpen(true);
    if (profile.targetType === "chatwoot") {
      setSelectedChatwootAgentId(profile.id);
    }
  }

  function applyAutomationProfile(profile: AutomationProfile) {
    const nextProject = projectWithAutomationProfileConfig(project, profile.config);
    setProject(nextProject);
    setAutomationProfileName(profile.name);
    setAutomationProfileTargetType(profile.targetType);
    setAutomationEditorBackupConfig(null);
    setAutomationEditorOpen(false);
    if (profile.targetType === "chatwoot") {
      setSelectedChatwootAgentId(profile.id);
    }
    const text = `${ui.automationProfileApplied}: ${profile.name}`;
    setSettingsStatus((current) => ({ ...current, automation: text }));
    setMessage(text);
  }

  function closeAutomationConnectorEditor() {
    if (automationEditorBackupConfig) {
      setProject((current) => projectWithAutomationProfileConfig(current, automationEditorBackupConfig));
    }
    setAutomationProfileName("");
    setAutomationEditorBackupConfig(null);
    setAutomationEditorOpen(false);
  }

  async function deleteAutomationProfile(profile: AutomationProfile) {
    if (!window.confirm(ui.automationProfileDeleteConfirm)) return;
    const nextProject = {
      ...project,
      automationProfiles: project.automationProfiles.filter((item) => item.id !== profile.id),
    };
    await persistAutomationProjectSettings(nextProject, `${ui.automationProfileDeleted}: ${profile.name}`, `Delete automation profile: ${profile.name}`);
    if (selectedChatwootAgentId === profile.id) {
      const nextAgent = nextProject.automationProfiles.find((item) => item.targetType === "chatwoot");
      setSelectedChatwootAgentId(nextAgent?.id || "");
    }
  }

  async function testConnection(target: ConnectionTarget) {
    setConnectionBusy(target);
    setConnectionStatus((current) => ({ ...current, [target]: "" }));
    try {
      const payload = await apiPost<{ ok: boolean; message?: string }>("/api/test-connection", {
        target,
        jiraUrl,
        project,
        credentials,
        confluenceCredentials: { ...confluenceCredentials, baseUrl: confluenceBaseUrl || confluenceCredentials.baseUrl },
        aiSettings: target === "knowledgeAi" ? knowledgeAiSettings : aiSettings,
      });
      const text = payload.message || ui.connectionOk;
      setConnectionStatus((current) => ({ ...current, [target]: text }));
      setMessage(text);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Không test được connection.";
      setConnectionStatus((current) => ({ ...current, [target]: text }));
      setMessage(text);
    } finally {
      setConnectionBusy("");
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
      setOutput(JSON.stringify(payload.issue, null, 2));
      const detectedDocLinks = Array.from(
        new Set([...(payload.issue.doc_links || []), ...extractDocumentLinks(`${payload.issue.description}\n${payload.issue.summary}`)]),
      );
      const manualDocInput = resolveConfluenceFetchInput(confluenceLinks, confluenceBaseUrl);
      let docsAutoHandled = false;
      if (manualDocInput.linksText || detectedDocLinks.length) {
        const linksText = manualDocInput.linksText || detectedDocLinks.join("\n");
        if (!confluenceLinks.trim() && linksText) {
          setConfluenceLinks(linksText);
        }
        const inferredBaseUrl = manualDocInput.baseUrlText || inferConfluenceBaseUrl(linksText);
        if (inferredBaseUrl) {
          setConfluenceBaseUrl(inferredBaseUrl);
        }
        await loadConfluenceDocs(linksText, inferredBaseUrl, fetchedIssueKey || payload.issue.key || nextIssueKey, {
          sourceLabel: manualDocInput.linksText ? "link doc thủ công" : "Jira task",
          validationMessage: manualDocInput.linksText
            ? "Đã có link doc thủ công nhưng chưa fetch được vì thiếu Confluence config/auth."
            : `Tìm thấy ${detectedDocLinks.length} link doc từ Jira task nhưng chưa fetch được vì thiếu Confluence config/auth.`,
        });
        docsAutoHandled = true;
      } else if (payload.issue.doc_link_error) {
        setDocStatus(`Không đọc được Jira issue links: ${payload.issue.doc_link_error}`);
      }
      if (!docsAutoHandled) {
        setMessage(`Đã fetch Jira task ${payload.issue.key}.`);
      }
    });
  }

  async function loadConfluenceDocs(
    linksText: string,
    baseUrlText: string,
    currentIssueKey: string,
    options: { validationMessage?: string; sourceLabel?: string } = {},
  ) {
    const fetchInput = resolveConfluenceFetchInput(linksText, baseUrlText);
    const errors = validateConfluenceFetch(fetchInput.linksText, fetchInput.baseUrlText);
    if (Object.keys(errors).length) {
      clearFetchedDocs(options.validationMessage || "Vui lòng bổ sung link, Base URL và đủ Confluence auth trước khi Fetch docs.");
      setValidationFailure(errors, options.validationMessage || "Vui lòng bổ sung link, Base URL và đủ Confluence auth trước khi Fetch docs.");
      return false;
    }
    setValidationErrors({});
    const docCount = fetchInput.linksText.split(/\r?\n|,/).filter((item) => item.trim()).length;
    setDocStatus(`Đang fetch ${docCount} Confluence doc từ ${options.sourceLabel || "Jira task"}...`);
    const payload = await apiPost<{ documents: ConfluenceDocument[]; combinedText: string }>(
      "/api/confluence-docs",
      {
        links: fetchInput.linksText,
        confluenceCredentials: { ...confluenceCredentials, baseUrl: fetchInput.baseUrlText },
      },
    );
    const loadedDocs = payload.documents.filter((item) => item.text);
    const failedDocs = payload.documents.filter((item) => item.error);
    setDocContext(payload.combinedText);
    setDocIssueKey(payload.combinedText ? currentIssueKey : "");
    setDocSources(payload.documents);
    setOutput(JSON.stringify(payload.documents, null, 2));
    const nextStatus = loadedDocs.length
      ? `Doc context đã tự động gắn với ${currentIssueKey}: đọc được ${loadedDocs.length}/${payload.documents.length} doc, ${payload.combinedText.length.toLocaleString()} ký tự. Generate draft sẽ dùng doc này cho đúng task hiện tại.`
      : `Chưa đọc được nội dung doc cho ${currentIssueKey}. Kiểm tra lại Base URL, auth hoặc link Confluence.`;
    setDocStatus(nextStatus);
    setMessage(
      failedDocs.length
        ? `Đã fetch Jira task ${currentIssueKey} và tự đọc ${loadedDocs.length}/${payload.documents.length} Confluence doc. Có ${failedDocs.length} doc lỗi.`
        : `Đã fetch Jira task ${currentIssueKey} và tự đọc ${payload.documents.length} Confluence doc.`,
    );
    return true;
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
      setDetailCaseIndex(null);
      setCaseFilter("all");
      setOutline(emptyOutline(effectiveIssue));
      setCaseKeys("");
      setSavedFiles(null);
      setBuiltDesignFiles(null);
      setOutput("");
      setQaPlan(null);
      setImproveInstruction("");
      setLastImproveInstruction("");
      setPromptImproveStatus("");
      setDraftPromptProposal(null);
      const generationAiSettings = savedAiSettings;
      setGenerationStatus({
        state: "running",
        title: generationAiSettings.enabled ? "Đang gọi AI provider" : "Đang generate bằng fallback local",
        detail: generationAiSettings.enabled
          ? [
              generationAiSettings.provider ? `Provider: ${generationAiSettings.provider}` : "",
              generationAiSettings.model ? `Model: ${generationAiSettings.model}` : "",
              generationAiSettings.baseUrl ? `Base URL: ${generationAiSettings.baseUrl}` : "",
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
          title: generationAiSettings.enabled ? "AI provider lỗi" : "Generate draft lỗi",
          detail: text.split("\n")[0],
          provider: generationAiSettings.provider,
          model: generationAiSettings.model,
          endpoint: generationAiSettings.baseUrl,
        });
        throw error;
      }
      setArchetypeKey(payload.archetypeKey);
      setQaPlan(payload.qaPlan || null);
      setTestCases(payload.testCases);
      setDetailCaseIndex(null);
      setOutline(payload.outline);
      setActiveTab("cases");
      setSourceConfigOpen(false);
      setImprovePanelOpen(false);
      setOutput(JSON.stringify(payload, null, 2));
      setGenerationStatus(generationStatusFromPayload(payload));
      recordDraftHistory(payload.aiGenerationUsed ? "AI generate" : "Fallback generate", payload.testCases, payload.outline, payload.qaPlan || null);
      const generationMode = payload.aiGenerationUsed ? "bằng AI provider" : "bằng fallback local";
      setMessage(
        payload.aiGenerationError
          ? `Đã tạo ${payload.testCases.length} test case và test design draft ${generationMode}. ${payload.aiGenerationError}`
          : `Đã tạo ${payload.testCases.length} test case và test design draft ${generationMode}.`,
      );
    });
  }

  function improveDraftWithAi() {
    const trimmedInstruction = improveInstruction.trim() || lastImproveInstruction.trim();
    const activeAiSettings = savedAiSettings;
    if (!trimmedInstruction) {
      setMessage(ui.improvePromptRequiresInput);
      setPromptImproveStatus(ui.improvePromptRequiresInput);
      return;
    }
    if (!activeAiSettings.enabled || (!activeAiSettings.apiKey.trim() && !secretStatus.ai.hasApiKey) || !activeAiSettings.model.trim()) {
      setMessage(ui.improveRequiresAi);
      setPromptImproveStatus(ui.improveRequiresAi);
      return;
    }
    if (!testCases.length || !outline.branches.length) {
      setMessage(ui.improveRequiresDraft);
      setPromptImproveStatus(ui.improveRequiresDraft);
      return;
    }
    const draftErrors = validateGenerateDraft();
    if (Object.keys(draftErrors).length) {
      setValidationFailure(draftErrors, "Vui lòng bổ sung các field bắt buộc đang được highlight trước khi tinh chỉnh draft.");
      return;
    }
    setBusyRun("promptImprove", async () => {
      setPromptImproveStatus("");
      setDraftPromptProposal(null);
      setPromptCompare(null);
      const effectiveIssueKey = issueKeyFromText(jiraUrl) || issue.key;
      const effectiveIssue = { ...issue, key: effectiveIssueKey };
      const shouldUseConfluenceDocs = Boolean(docContext.trim() && (!docIssueKey || docIssueKey === effectiveIssueKey));
      setGenerationStatus({
        state: "running",
        title: ui.improveDraftTitle,
        detail: trimmedInstruction,
        provider: activeAiSettings.provider,
        model: activeAiSettings.model,
        endpoint: activeAiSettings.baseUrl,
      });
      const payload = await apiPost<DraftResponse>("/api/improve-draft", {
        ...requestBody,
        issue: effectiveIssue,
        aiSettings: activeAiSettings,
        improveInstruction: trimmedInstruction,
        testCases,
        outline,
        qaPlan,
        confluenceLinks: shouldUseConfluenceDocs ? confluenceLinks : "",
        docContext: shouldUseConfluenceDocs ? docContext : "",
      }).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "Không tinh chỉnh được draft.";
        setPromptImproveStatus(errorMessage);
        setGenerationStatus({
          state: "error",
          title: "Tinh chỉnh draft lỗi",
          detail: errorMessage.split("\n")[0],
          provider: activeAiSettings.provider,
          model: activeAiSettings.model,
          endpoint: activeAiSettings.baseUrl,
        });
        throw error;
      });
      setArchetypeKey(payload.archetypeKey);
      setQaPlan(payload.qaPlan || null);
      setTestCases(payload.testCases);
      setDetailCaseIndex(null);
      setCaseFilter("all");
      setOutline(payload.outline);
      setActiveTab("cases");
      setSourceConfigOpen(false);
      setOutput(JSON.stringify(payload, null, 2));
      setGenerationStatus({
        ...generationStatusFromPayload(payload),
        title: `Đã tinh chỉnh ${payload.testCases.length} test case/test design bằng AI provider`,
      });
      recordDraftHistory("AI refine draft", payload.testCases, payload.outline, payload.qaPlan || null);
      setLastImproveInstruction(trimmedInstruction);
      let promptProposalCreated = false;
      try {
        const promptPayload = await apiPost<PromptImproveResponse>("/api/improve-prompt", {
          instruction: trimmedInstruction,
          jiraUrl,
          issue: effectiveIssue,
          aiSettings: activeAiSettings,
          testCases: payload.testCases,
          outline: payload.outline,
          language: languageMode,
        });
        const updates = normalizePromptImproveUpdates(promptPayload);
        if (updates.length) {
          const proposal = createPromptImproveProposal("draft", trimmedInstruction, activeAiSettings, updates, promptPayload.summary);
          setPromptCompare(null);
          setDraftPromptProposal(proposal);
          promptProposalCreated = true;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Không tạo được đề xuất Prompt AI.";
        const successWithPromptError = `${ui.improveDraftDonePrefix}: "${trimmedInstruction}". Không tạo được đề xuất Prompt AI: ${errorMessage}`;
        setPromptImproveStatus(successWithPromptError);
        setMessage(successWithPromptError);
        return;
      }
      const successText = promptProposalCreated ? ui.draftImproveAndPromptReady : `${ui.improveDraftDonePrefix}: "${trimmedInstruction}"`;
      setPromptImproveStatus(successText);
      setMessage(successText);
    });
  }

  function applyDraftPromptProposal() {
    if (!draftPromptProposal) return;
    const proposal = draftPromptProposal;
    setBusyRun("promptImprove", async () => {
      setPromptImproveStatus("");
      await persistImprovedAiSettings(proposal);
      setDraftPromptProposal(null);
      setPromptCompare(null);
      setLastImproveInstruction(proposal.instruction);
      const successText = `${ui.promptImproveApplied} ${ui.aiSettingsUnsavedGuard}`;
      setPromptImproveStatus(successText);
      setMessage(successText);
    });
  }

  async function improveAiSettingsPromptOnly() {
    const trimmedInstruction = settingsImproveInstruction.trim();
    const activeAiSettings = {
      ...aiSettings,
      promptGuidelines: aiPromptGuidelinesFromSettings(aiSettings),
    };
    if (!trimmedInstruction) {
      setSettingsPromptImproveStatus(ui.improvePromptRequiresInput);
      setMessage(ui.improvePromptRequiresInput);
      return;
    }
    if (!activeAiSettings.enabled || (!activeAiSettings.apiKey.trim() && !secretStatus.ai.hasApiKey) || !activeAiSettings.model.trim()) {
      setSettingsPromptImproveStatus(ui.improveRequiresAi);
      setMessage(ui.improveRequiresAi);
      return;
    }
    setSettingsPromptImproveBusy(true);
    setSettingsPromptImproveStatus("");
    setSettingsStatus((current) => ({ ...current, ai: "" }));
    try {
      const payload = await apiPost<PromptImproveResponse>("/api/improve-prompt", {
        instruction: trimmedInstruction,
        jiraUrl,
        issue,
        aiSettings: activeAiSettings,
        testCases,
        outline,
        language: languageMode,
      });
      const updates = normalizePromptImproveUpdates(payload);
      if (!updates.length) {
        throw new Error("AI chưa trả về prompt cải thiện hợp lệ.");
      }
      const proposal = createPromptImproveProposal("settings", trimmedInstruction, activeAiSettings, updates, payload.summary);
      setPromptCompare(null);
      setSettingsPromptProposal(proposal);
      setSettingsPromptImproveStatus(ui.promptImprovePreviewReady);
      setMessage(ui.promptImprovePreviewReady);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Không cải thiện được prompt.";
      setSettingsPromptImproveStatus(errorMessage);
      setMessage(errorMessage);
    } finally {
      setSettingsPromptImproveBusy(false);
    }
  }

  async function applySettingsPromptProposal() {
    if (!settingsPromptProposal) return;
    const proposal = settingsPromptProposal;
    setSettingsPromptApplyBusy(true);
    setSettingsPromptImproveStatus("");
    try {
      await persistImprovedAiSettings(proposal);
      setSettingsPromptProposal(null);
      setPromptCompare(null);
      const successText = `${ui.promptImproveApplied} ${ui.aiSettingsUnsavedGuard}`;
      setSettingsPromptImproveStatus(successText);
      setMessage(successText);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Không tự lưu được Cài đặt AI sau khi áp dụng prompt.";
      setSettingsPromptImproveStatus(errorMessage);
      setMessage(errorMessage);
    } finally {
      setSettingsPromptApplyBusy(false);
    }
  }

  function restoreAiSettingsHistoryEntry(entry: AiSettingsHistoryEntry) {
    const next: AiSettings = {
      ...aiSettings,
      knowledge: {
        ...(aiSettings.knowledge || emptyAiSettings.knowledge!),
      },
    };
    for (const change of entry.changes) {
      if (change.secret) continue;
      const before = change.before;
      if (entry.section === "knowledgeAi" || change.field.startsWith("knowledge.")) {
        const key = change.field.replace(/^knowledge\./, "") as keyof NonNullable<AiSettings["knowledge"]>;
        if (key === "enabled") {
          next.knowledge!.enabled = before === "true";
        } else if (key in next.knowledge!) {
          (next.knowledge as Record<string, unknown>)[key] = before;
        }
      } else if (change.field === "enabled") {
        next.enabled = before === "true";
      } else if (change.field in next) {
        (next as unknown as Record<string, unknown>)[change.field] = before;
      }
    }
    setAiSettings(next);
    setSettingsPromptProposal(null);
    setDraftPromptProposal(null);
    setPromptCompare(null);
    setSettingsStatus((current) => ({
      ...current,
      [entry.section]: `${ui.restorePrevious}: ${entry.summary || aiHistorySourceLabel(entry.source, ui)}. Nhấn Lưu để áp dụng chính thức.`,
    }));
    setMessage(`${ui.restorePrevious}: ${entry.summary || aiHistorySourceLabel(entry.source, ui)}.`);
  }

  function applyKnowledgeCardToAiPrompt(section: StaticKnowledgeSection, card: KnowledgeCard) {
    const detailPoints = knowledgeCardDetailPoints(languageMode, section, card).slice(0, 4);
    const nextInstruction = [
      `Hãy bổ sung kiến thức QA "${card.title}" thành rule reusable trong prompt tạo test case/test design.`,
      `Ý chính: ${card.description}`,
      detailPoints.length ? `Các điểm cần áp dụng:\n${detailPoints.map((point) => `- ${point}`).join("\n")}` : "",
      card.example ? `Ví dụ/risk lens: ${card.example}` : "",
      "Chỉ gộp vào prompt nếu chưa có rule tương đương; nếu đã có thì refine wording để rõ hơn.",
    ]
      .filter(Boolean)
      .join("\n\n");
    setSettingsImproveInstruction(nextInstruction);
    setSettingsPromptProposal(null);
    setSettingsPromptImproveStatus("");
    setAppView("settings");
    setSettingsNavOpen(true);
    setActiveSettingsSection("ai");
    setMessage(ui.appliedKnowledgePrompt);
  }

  function saveDraftFiles() {
    setBusyRun("save", async () => {
      const payload = await apiPost<{
        saved: boolean;
        casesFile: string;
        designFile: string;
        casesPath: string;
        designPath: string;
        files: SavedDraftFiles;
      }>("/api/save-draft", {
        jiraUrl,
        issue,
        testCases,
        outline,
        archetypeKey,
        project,
      });
      setSavedFiles(payload.files);
      setOutput(JSON.stringify(payload, null, 2));
      triggerDownload(payload.files.cases);
      setMessage("Đã lưu test cases JSON vào thư mục QA đã cấu hình. Bản tải qua Chrome sẽ nằm theo cấu hình Downloads của trình duyệt.");
    });
  }

  function buildXmind(attachAll: boolean) {
    setBusyRun(attachAll ? "attach" : "xmind", async () => {
      if (!attachAll) {
        setBuiltDesignFiles(null);
      }
      const payload = await apiPost<{ result: unknown; stdout: string; files?: BuiltDesignFiles }>("/api/build-xmind", {
        outline,
        issueKey: issue.key,
        project,
        credentials,
        attachAll,
        replaceExisting: true,
      });
      if (payload.files) {
        setBuiltDesignFiles(payload.files);
      }
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

  function currentWorkspacePayload(): QaWorkspaceItem {
    const effectiveIssueKey = (outline.issue_key || issue.key || issueKeyFromText(jiraUrl)).toUpperCase();
    const sourceKey = effectiveIssueKey || `draft-${Date.now()}`;
    const existing = qaWorkspaceItems.find((item) => item.sourceKey === sourceKey || item.issueKey === effectiveIssueKey);
    return {
      id: existing?.id || "",
      issueKey: effectiveIssueKey,
      title: issue.summary || outline.title || (effectiveIssueKey ? `[${effectiveIssueKey}] QA draft` : "QA draft"),
      source: "easyforqc_draft",
      sourceKey,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archetypeKey: archetypeKey === "auto" ? outline.template || "auto" : archetypeKey,
      testCases,
      outline,
      qaPlan,
      chatwootSuiteFile: existing?.chatwootSuiteFile || "",
      chatwootSuiteName: existing?.chatwootSuiteName || "",
      files: {
        savedFiles,
        builtDesignFiles,
      },
    };
  }

  function saveCurrentToWorkspace() {
    if (!testCases.length) {
      const text = languageMode === "en"
        ? "Generate or import at least one test case before saving to QA Workspace."
        : "Cần generate hoặc import ít nhất 1 test case trước khi lưu vào QA Workspace.";
      setWorkspaceMessage(text);
      setMessage(text);
      return;
    }
    setBusyRun("workspace", async () => {
      const payload = await apiPost<{ item: QaWorkspaceItem; items: QaWorkspaceItem[] }>("/api/qa-workspace", {
        item: currentWorkspacePayload(),
        refreshStopPatterns: true,
        forceStopPatterns: true,
      });
      setQaWorkspaceItems(payload.items || []);
      if (payload.item?.testCases?.length) {
        setTestCases(payload.item.testCases);
      }
      const savedStopStats = stopPatternStats(payload.item?.testCases || []);
      const savedText = savedStopStats.total && savedStopStats.needs === 0
        ? ui.workspaceSavedWithStopPatterns
        : savedStopStats.ready
          ? ui.workspaceSavedStopPatternsPartial
          : ui.workspaceSaved;
      setWorkspaceMessage(savedText);
      setMessage(savedText);
      if (!chatwootSuiteDraft.workspaceItemId) {
        setChatwootSuiteDraft((current) => ({ ...current, workspaceItemId: payload.item.id }));
      }
    });
  }

  function openWorkspaceItem(item: QaWorkspaceItem) {
    const nextIssue = {
      ...emptyIssue,
      key: item.issueKey,
      summary: item.title,
      title: item.title,
    };
    setIssue(nextIssue);
    setJiraUrl(item.issueKey);
    setArchetypeKey(item.archetypeKey || "auto");
    setQaPlan(item.qaPlan || null);
    setTestCases(JSON.parse(JSON.stringify(item.testCases || [])) as TestCase[]);
    setOutline(item.outline ? (JSON.parse(JSON.stringify(item.outline)) as TestDesignOutline) : emptyOutline(nextIssue));
    setDetailCaseIndex(null);
    setCaseFilter("all");
    setSavedFiles(null);
    setBuiltDesignFiles(null);
    setSourceConfigOpen(false);
    setImprovePanelOpen(false);
    if (item.chatwootSuiteFile) {
      updateChatwootSuiteFile(item.chatwootSuiteFile, "workspace");
    }
    setActiveTab("cases");
    setAppView("run");
    setMessage(languageMode === "en" ? `Opened ${item.title} from QA Workspace.` : `Đã mở ${item.title} từ QA Workspace.`);
  }

  async function deleteWorkspaceItem(item: QaWorkspaceItem) {
    setWorkspaceBusy("delete");
    try {
      const response = await fetch(`/api/qa-workspace/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const payload = (await response.json()) as { items?: QaWorkspaceItem[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      setQaWorkspaceItems(payload.items || []);
      setWorkspaceMessage(languageMode === "en" ? "Removed from QA Workspace." : "Đã xóa khỏi QA Workspace.");
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : "Không xóa được khỏi QA Workspace.");
    } finally {
      setWorkspaceBusy("");
    }
  }

  function applyWorkspaceStopPatternPayload(item: QaWorkspaceItem, items: QaWorkspaceItem[]) {
    setQaWorkspaceItems(items || []);
    if (item.testCases?.length && (item.id === chatwootSuiteDraft.workspaceItemId || item.issueKey === issue.key || item.sourceKey === issue.key)) {
      setTestCases(item.testCases);
    }
    const text = stopPatternStats(item.testCases || []).needs === 0 ? ui.workspaceStopPatternsUpdated : ui.workspaceSavedStopPatternsPartial;
    setWorkspaceMessage(text);
    setMessage(text);
  }

  function refreshCurrentStopPatterns() {
    if (!testCases.length) return;
    setBusyRun("stopPatterns", async () => {
      const payload = await apiPost<{ item: QaWorkspaceItem; items: QaWorkspaceItem[] }>("/api/qa-workspace", {
        item: currentWorkspacePayload(),
        refreshStopPatterns: true,
      });
      applyWorkspaceStopPatternPayload(payload.item, payload.items || []);
    });
  }

  async function refreshWorkspaceStopPatterns(item: QaWorkspaceItem) {
    setWorkspaceStopPatternBusyId(item.id);
    try {
      const payload = await apiPost<{ item: QaWorkspaceItem; items: QaWorkspaceItem[] }>(
        `/api/qa-workspace/${encodeURIComponent(item.id)}/stop-patterns`,
        { force: true },
      );
      applyWorkspaceStopPatternPayload(payload.item, payload.items || []);
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : "Không cập nhật được điều kiện dừng.");
    } finally {
      setWorkspaceStopPatternBusyId("");
    }
  }

  async function generateKnowledgeArticle() {
    if (!knowledgeTopic.trim()) {
      setKnowledgeMessage(languageMode === "en" ? "Enter a QA knowledge topic first." : "Cần nhập chủ đề kiến thức QA trước.");
      return;
    }
    setKnowledgeBusy("generate");
    setKnowledgeMessage("");
    try {
      const payload = await apiPost<{ article: KnowledgeArticle }>("/api/knowledge/generate", {
        topic: knowledgeTopic,
        category: knowledgeCategory,
        audience: knowledgeAudience,
        notes: knowledgeNotes,
        language: languageMode,
        aiSettings: savedKnowledgeAiSettings,
      });
      setKnowledgeArticleDraft(payload.article);
      setSavedKnowledgeDraftSnapshot("");
      setKnowledgeMessage(languageMode === "en" ? "AI draft created. Review before saving." : "Đã tạo bản nháp AI. Hãy review trước khi lưu.");
    } catch (error) {
      setKnowledgeMessage(error instanceof Error ? error.message : languageMode === "en" ? "Could not generate knowledge article." : "Không tạo được bài kiến thức.");
    } finally {
      setKnowledgeBusy("");
    }
  }

  async function saveKnowledgeArticle() {
    if (!knowledgeArticleDraft) return;
    setKnowledgeBusy("save");
    setKnowledgeMessage("");
    try {
      const payload = await apiPost<{ article: KnowledgeArticle; knowledgeArticles: KnowledgeArticle[] }>("/api/knowledge/articles", {
        article: knowledgeArticleDraft,
      });
      setKnowledgeArticleDraft(payload.article);
      setSavedKnowledgeDraftSnapshot(knowledgeArticleSnapshot(payload.article));
      setKnowledgeArticles(payload.knowledgeArticles);
      setKnowledgeMessage(languageMode === "en" ? "Saved to Knowledge." : "Đã lưu vào Knowledge.");
    } catch (error) {
      setKnowledgeMessage(error instanceof Error ? error.message : languageMode === "en" ? "Could not save knowledge article." : "Không lưu được bài kiến thức.");
    } finally {
      setKnowledgeBusy("");
    }
  }

  function updateChatwootForm<K extends keyof ChatwootUatRunForm>(key: K, value: ChatwootUatRunForm[K]) {
    setChatwootForm((current) => ({ ...current, [key]: value }));
  }

  function updateChatwootSuiteFile(value: string, source: ChatwootSuiteSource | "" = value ? chatwootSuiteDraft.source : "") {
    setChatwootForm((current) => ({ ...current, suiteFile: value }));
    setChatwootPreparedSource(value ? source : "");
    setChatwootRunAllCases(true);
    setChatwootSelectedCaseIds([]);
    setChatwootCaseSearch("");
    setExpandedChatwootCaseIds([]);
    setChatwootCaseStopConditionEdits({});
  }

  function setChatwootCaseChecked(caseId: string, checked: boolean) {
    const allCaseIds = selectedChatwootCases.map((testCase) => testCase.caseId).filter(Boolean);
    if (!allCaseIds.length) return;
    const baseline = chatwootRunAllCases ? allCaseIds : chatwootSelectedCaseIds;
    const nextIds = checked
      ? Array.from(new Set([...baseline, caseId]))
      : baseline.filter((item) => item !== caseId);
    setChatwootRunAllCases(false);
    setChatwootSelectedCaseIds(nextIds);
  }

  function selectAllChatwootCases() {
    setChatwootRunAllCases(false);
    setChatwootSelectedCaseIds(selectedChatwootCases.map((testCase) => testCase.caseId).filter(Boolean));
  }

  function runAllChatwootCases() {
    setChatwootRunAllCases(true);
    setChatwootSelectedCaseIds([]);
  }

  function clearChatwootCaseSelection() {
    setChatwootRunAllCases(false);
    setChatwootSelectedCaseIds([]);
  }

  function toggleChatwootCaseDetails(caseId: string) {
    setExpandedChatwootCaseIds((current) =>
      current.includes(caseId) ? current.filter((item) => item !== caseId) : [...current, caseId],
    );
  }

  function updateChatwootCaseStopCondition(caseId: string, key: keyof ChatwootStopConditionEdit, value: string) {
    setChatwootCaseStopConditionEdits((current) => ({
      ...current,
      [caseId]: {
        pass: current[caseId]?.pass ?? "",
        fail: current[caseId]?.fail ?? "",
        [key]: value,
      },
    }));
  }

  function chatwootCaseStopConditionOverrides(): Record<string, StopConditions> {
    return Object.fromEntries(
      Object.entries(chatwootCaseStopConditionEdits).map(([caseId, value]) => [
        caseId,
        {
          pass: normalizeStopConditionLines(value.pass),
          fail: normalizeStopConditionLines(value.fail),
        },
      ]),
    );
  }

  function chatwootCaseStatusLabel(status = "") {
    if (status === "pending") return ui.chatwootCasePending;
    if (status === "running") return ui.chatwootCaseRunning;
    if (status === "completed") return ui.chatwootCaseCompleted;
    if (status === "skipped") return ui.chatwootCaseSkipped;
    if (status === "interrupted") return ui.chatwootCaseInterrupted;
    if (status === "failed") return ui.chatwootCaseFailed;
    if (status === "handoff") return ui.chatwootCaseHandoff;
    return status;
  }

  function chatwootJobStatusLabel(status = "") {
    if (status === "queued") return ui.chatwootCasePending;
    if (status === "running") return ui.chatwootCaseRunning;
    if (status === "completed") return ui.chatwootCaseCompleted;
    if (status === "failed") return ui.chatwootCaseFailed;
    if (status === "interrupted") return ui.chatwootCaseInterrupted;
    return status;
  }

  function chatwootModeLabel(value = "") {
    if (value === "adaptive") return ui.chatwootAdaptiveMode;
    if (value === "suite") return ui.chatwootSuiteMode;
    return value;
  }

  function chatwootChatUiModeLabel(value = "") {
    if (value === "realistic") return ui.chatwootChatRealistic;
    if (value === "webhook-only") return ui.chatwootChatWebhookOnly;
    return value;
  }

  function chatwootPlannerBackendLabel(value = "") {
    if (value === "openai-compatible") return ui.chatwootPlannerAi;
    if (value === "heuristic") return ui.chatwootPlannerHeuristic;
    if (value === "codex-cli") return ui.chatwootPlannerCodex;
    return value;
  }

  function chatwootPlannerBackendHelp(value = "") {
    if (value === "openai-compatible") return ui.chatwootPlannerAiHelp;
    if (value === "heuristic") return ui.chatwootPlannerHeuristicHelp;
    if (value === "codex-cli") return ui.chatwootPlannerCodexHelp;
    return "";
  }

  function chatwootPlannerModelLabel(
    backend: ProjectConfig["chatwootPlannerBackend"],
    configuredModel = "",
  ) {
    if (backend === "openai-compatible") return aiSettingsPlannerModel || ui.chatwootPlannerModelMissing;
    if (backend === "heuristic") return ui.chatwootPlannerModelNotUsed;
    return configuredModel || aiSettingsPlannerModel || "gpt-5.4-mini";
  }

  function compactChatwootReasons(...values: string[]) {
    return Array.from(
      new Set(
        values
          .flatMap((value) => String(value || "").split(/\s*[·|]\s*/))
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
  }

  function chatwootCaseResultStatus(result: ChatwootUatRunResult["report"]["results"][number]) {
    if (result.succeeded) return { label: ui.chatwootCaseStatusPassed, className: "passed" };
    if (result.handoffDetected) return { label: ui.chatwootCaseStatusHandoff, className: "handoff" };
    return { label: ui.chatwootCaseStatusFailed, className: "failed" };
  }

  function chatwootCaseResultReasons(result: ChatwootUatRunResult["report"]["results"][number]) {
    return compactChatwootReasons(result.failureReason, result.completedReason);
  }

  function chatwootFailureHint(reasons: string[]) {
    const reasonText = reasons.join(" ").toLowerCase();
    if (!reasonText) return ui.chatwootUnknownFailure;
    if (reasonText.includes("max_user_turns")) {
      return languageMode === "en"
        ? "The bot did not finish before the max user-turn limit. Increase max user turns or inspect whether the bot/tool got stuck."
        : "Bot chưa hoàn tất trước giới hạn số lượt user. Tăng Số lượt user tối đa hoặc kiểm tra bot/tool có bị kẹt không.";
    }
    if (reasonText.includes("timeout")) {
      return languageMode === "en"
        ? "The run hit a timeout. Check the UAT conversation and planner timeout/config."
        : "Run bị timeout. Kiểm tra hội thoại UAT và timeout/cấu hình planner.";
    }
    if (reasonText.includes("handoff")) {
      return languageMode === "en"
        ? "The conversation was handed off. Check whether this is expected for the selected agent and scenario."
        : "Hội thoại đã chuyển agent. Kiểm tra đây có phải expected result của agent/kịch bản đang chạy không.";
    }
    if (reasonText.includes("success")) {
      return languageMode === "en"
        ? "The stop condition was reached. If the case is still marked failed, inspect the raw report for assertion mismatch."
        : "Đã đạt điều kiện dừng. Nếu case vẫn bị đánh lỗi, mở raw report để kiểm tra assertion bị lệch.";
    }
    return languageMode === "en"
      ? "Open the UAT conversation/raw report to inspect the exact bot response and tool trace."
      : "Mở hội thoại UAT/raw report để kiểm tra câu trả lời bot và tool trace cụ thể.";
  }

  function requireSelectedChatwootAgent() {
    if (selectedChatwootAgent) return true;
    setChatwootMessage(ui.chatwootAgentRequired);
    return false;
  }

  async function cancelChatwootCase(caseId: string) {
    if (!chatwootActiveJob || !["queued", "running"].includes(chatwootActiveJob.status)) return;
    setChatwootBusy("cancel");
    setChatwootMessage("");
    try {
      const payload = await apiPost<{ job: ChatwootUatJob }>(
        `/api/chatwoot-uat/jobs/${encodeURIComponent(chatwootActiveJob.id)}/cases/${encodeURIComponent(caseId)}/cancel`,
        {},
      );
      setChatwootActiveJob(payload.job);
      setChatwootJobs((current) => [payload.job, ...current.filter((job) => job.id !== payload.job.id)]);
      setChatwootMessage(ui.chatwootCaseStopQueued);
    } catch (error) {
      setChatwootMessage(error instanceof Error ? error.message : languageMode === "en" ? "Could not stop this test case." : "Không dừng được test case này.");
    } finally {
      setChatwootBusy("");
    }
  }

  function buildChatwootRunPayload(): ChatwootUatRunPayload {
    return {
      ...chatwootForm,
      mode: effectiveChatwootRunMode,
      chatUiMode: effectiveChatwootChatUiMode,
      plannerBackend: effectiveChatwootPlannerBackend,
      webhookUrl: chatwootAutomationConfig.chatwootWebhookUrl,
      healthcheckUrl: chatwootAutomationConfig.chatwootHealthcheckUrl,
      skipHealthcheck: chatwootAutomationConfig.chatwootSkipHealthcheck,
      skipLocalWebhookPost: chatwootAutomationConfig.chatwootSkipLocalWebhookPost,
      chatwootApiBase: chatwootAutomationConfig.chatwootApiBase,
      inboxId: chatwootAutomationConfig.chatwootInboxId,
      uiInboxId: chatwootAutomationConfig.chatwootUiInboxId,
      captainAssistantId: chatwootAutomationConfig.chatwootCaptainAssistantId,
      accountId: chatwootAutomationConfig.chatwootAccountId,
      caseId: "",
      caseIndex: "",
      limitCases: "",
      maxUserTurns: chatwootForm.maxUserTurns || chatwootAutomationConfig.chatwootMaxUserTurns,
      plannerModel:
        !chatwootRunUsesPlanner
          ? ""
          : effectiveChatwootPlannerBackend === "openai-compatible"
            ? aiSettingsPlannerModel
            : effectiveChatwootPlannerBackend === "codex-cli"
              ? chatwootForm.plannerModel || chatwootAutomationConfig.chatwootPlannerModel || aiSettingsPlannerModel
              : "",
      plannerTimeoutSeconds: chatwootForm.plannerTimeoutSeconds || chatwootAutomationConfig.chatwootPlannerTimeoutSeconds,
      labels: chatwootAutomationConfig.chatwootLabels,
      assigneeName: chatwootAutomationConfig.chatwootAssigneeName,
      pinnedConversationId: chatwootAutomationConfig.chatwootPinnedConversationId,
      selectedCaseIds: chatwootRunAllCases ? [] : chatwootSelectedCaseIds,
      caseStopConditions: chatwootCaseStopConditionOverrides(),
      agentId: selectedChatwootAgent?.id,
      agentName: selectedChatwootAgent?.name,
    };
  }

  function updateChatwootSuiteDraft<K extends keyof ChatwootSuiteDraftForm>(key: K, value: ChatwootSuiteDraftForm[K]) {
    setChatwootSuiteDraft((current) => ({ ...current, [key]: value }));
  }

  async function createChatwootSuiteFromSource(override: Partial<ChatwootSuiteDraftForm> = {}) {
    if (!requireSelectedChatwootAgent()) return;
    const draft = { ...chatwootSuiteDraft, ...override };
    const workspaceItemId = draft.workspaceItemId || selectedWorkspaceItem?.id || "";
    const workspaceItem = qaWorkspaceItems.find((item) => item.id === workspaceItemId || item.sourceKey === workspaceItemId);
    const commonPayload = {
      suiteName: draft.source === "workspace" ? draft.title : "",
      inboxId: chatwootAutomationConfig.chatwootInboxId,
      uiInboxId: chatwootAutomationConfig.chatwootUiInboxId,
      captainAssistantId: chatwootAutomationConfig.chatwootCaptainAssistantId,
      labels: chatwootAutomationConfig.chatwootLabels,
      assigneeName: chatwootAutomationConfig.chatwootAssigneeName,
      webhookUrl: chatwootAutomationConfig.chatwootWebhookUrl,
      chatUiMode: chatwootAutomationConfig.chatwootChatUiMode,
      agentId: selectedChatwootAgent?.id,
      agentName: selectedChatwootAgent?.name,
    };
    let endpoint = "";
    let body: Record<string, unknown> = {};
    if (draft.source === "workspace") {
      if (!workspaceItemId) {
        setChatwootMessage(ui.qaWorkspaceEmpty);
        return;
      }
      endpoint = "/api/chatwoot-uat/suites/workspace";
      body = { ...commonPayload, workspaceItemId };
    } else {
      if (!draft.scenario.trim()) {
        setChatwootMessage(languageMode === "en" ? "Enter a manual scenario before creating a suite." : "Cần nhập kịch bản trước khi tạo suite.");
        return;
      }
      endpoint = "/api/chatwoot-uat/suites/manual";
      body = {
        ...commonPayload,
        scenario: draft.scenario,
      };
    }
    setChatwootSuiteBusy(true);
    setChatwootMessage("");
    try {
      const payload = await apiPost<{
        suite?: ChatwootUatSuite;
        suites?: ChatwootUatSuite[];
        workspaceItems?: QaWorkspaceItem[];
        planningMode?: "ai" | "fallback";
        error?: string;
      }>(endpoint, body);
      if (payload.suites) {
        setChatwootInfo((current) => (current ? { ...current, suites: payload.suites || [] } : current));
      } else {
        await loadChatwootUatInfo();
      }
      if (payload.workspaceItems) {
        setQaWorkspaceItems(payload.workspaceItems);
      }
      if (payload.suite?.relativePath) {
        updateChatwootSuiteFile(payload.suite.relativePath, draft.source);
      }
      const createdMessage =
        draft.source === "manual"
          ? payload.planningMode === "ai"
            ? ui.chatwootSuiteCreatedAi
            : ui.chatwootSuiteCreatedFallback
          : ui.chatwootSuiteCreated;
      setChatwootMessage(createdMessage);
      setWorkspaceMessage(createdMessage);
      if (draft.source === "workspace" && payload.workspaceItems) {
        const selected = payload.workspaceItems.find((item) => item.id === draft.workspaceItemId) || payload.workspaceItems[0];
        if (selected) {
          setChatwootSuiteDraft((current) => ({ ...current, workspaceItemId: selected.id }));
        }
      }
    } catch (error) {
      setChatwootMessage(error instanceof Error ? error.message : "Không tạo được Chatwoot UAT suite.");
    } finally {
      setChatwootSuiteBusy(false);
    }
  }

  async function runChatwootUat() {
    if (!requireSelectedChatwootAgent()) return;
    if (!chatwootPreparedSuiteReady) {
      setChatwootMessage(chatwootSuiteDraft.source === "manual" ? ui.chatwootManualPrepareHint : ui.chatwootWorkspacePrepareHint);
      return;
    }
    if (!chatwootRunAllCases && selectedChatwootCases.length && !chatwootSelectedCaseIds.length) {
      setChatwootMessage(languageMode === "en" ? "Select at least one case before starting." : "Cần chọn ít nhất một case trước khi chạy.");
      return;
    }
    if (chatwootRunUsesPlanner && effectiveChatwootPlannerBackend === "openai-compatible" && !chatwootInfo?.plannerAiReady) {
      setChatwootMessage(ui.chatwootPlannerAiMissing);
      return;
    }
    setChatwootConfirmOpen(true);
  }

  async function startChatwootUatJob() {
    if (!requireSelectedChatwootAgent()) return;
    if (!chatwootPreparedSuiteReady) {
      setChatwootMessage(chatwootSuiteDraft.source === "manual" ? ui.chatwootManualPrepareHint : ui.chatwootWorkspacePrepareHint);
      return;
    }
    setChatwootConfirmOpen(false);
    setChatwootBusy("run");
    setChatwootMessage("");
    setChatwootResult(null);
    try {
      const payload = await apiPost<{ job: ChatwootUatJob }>("/api/chatwoot-uat/jobs", buildChatwootRunPayload());
      setChatwootActiveJob(payload.job);
      setChatwootJobs((current) => [payload.job, ...current.filter((job) => job.id !== payload.job.id)]);
      setChatwootMessage(ui.chatwootJobQueued);
    } catch (error) {
      setChatwootMessage(error instanceof Error ? error.message : languageMode === "en" ? "Could not run Chatwoot UAT." : "Không chạy được Chatwoot UAT.");
    } finally {
      setChatwootBusy("");
    }
  }

  async function cancelChatwootUatJob() {
    if (!chatwootActiveJob || !["queued", "running"].includes(chatwootActiveJob.status)) return;
    setChatwootBusy("cancel");
    try {
      const payload = await apiPost<{ job: ChatwootUatJob }>(`/api/chatwoot-uat/jobs/${encodeURIComponent(chatwootActiveJob.id)}/cancel`, {});
      setChatwootActiveJob(payload.job);
      setChatwootJobs((current) => [payload.job, ...current.filter((job) => job.id !== payload.job.id)]);
      setChatwootMessage(payload.job.error || ui.chatwootRunStopped);
    } catch (error) {
      setChatwootMessage(error instanceof Error ? error.message : languageMode === "en" ? "Could not stop Chatwoot UAT." : "Không dừng được Chatwoot UAT.");
    } finally {
      setChatwootBusy("");
    }
  }

  function visibleCaseSteps(testCase: TestCase) {
    const structuredDescriptions = testCase.structured_steps
      .map((step) => step.description.trim())
      .filter(Boolean);
    if (structuredDescriptions.length) return structuredDescriptions;
    return (testCase.steps || []).map((step) => step.trim()).filter(Boolean);
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
    setTestCases((current) => [...current, makeEmptyCase(current.length + 1, issue.key, project.testCaseNumberTemplate)]);
  }

  function removeCase(index: number) {
    setTestCases((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setDetailCaseIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
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
  const knowledgeAiSettings = aiSettings.knowledge || emptyAiSettings.knowledge!;
  const savedKnowledgeAiSettings = savedAiSettings.knowledge || emptyAiSettings.knowledge!;

  if (!authChecked) {
    return (
      <main className="login-shell">
        <section className="login-panel loading-panel">
          <Loader2 className="spin" size={24} />
          <h1>EasyForQC</h1>
          <p>{ui.loadingSession}</p>
        </section>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <LoginPage
        text={ui}
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
            <p>{ui.brandSubtitle}</p>
          </div>
        </div>

        <nav className="side-nav" aria-label={ui.appNavigationLabel}>
          <button className={appView === "run" ? "active" : ""} type="button" onClick={() => {
            setAppView("run");
            setSettingsNavOpen(false);
          }}>
            <Play size={16} />
            <span>{ui.generateTask}</span>
          </button>
          <button className={appView === "workspace" ? "active" : ""} type="button" onClick={() => {
            setAppView("workspace");
            setSettingsNavOpen(false);
          }}>
            <Layers size={16} />
            <span>{ui.qaWorkspace}</span>
          </button>
          <button className={appView === "chatwoot" ? "active" : ""} type="button" onClick={() => {
            setAppView("chatwoot");
            setSettingsNavOpen(false);
          }}>
            <Bot size={16} />
            <span>{ui.chatwootUat}</span>
          </button>
          <button className={appView === "knowledge" ? "active" : ""} type="button" onClick={() => {
            setAppView("knowledge");
            setSettingsNavOpen(false);
          }}>
            <BookOpen size={16} />
            <span>{ui.knowledge}</span>
          </button>
          <div className={`${appView === "settings" ? "side-nav-group active" : "side-nav-group"} ${settingsNavOpen ? "open" : "collapsed"}`}>
            <button
              className={appView === "settings" ? "active" : ""}
              type="button"
              onClick={() => {
                if (appView !== "settings") {
                  setAppView("settings");
                  setSettingsNavOpen(true);
                  return;
                }
                setSettingsNavOpen((current) => !current);
              }}
              aria-expanded={settingsNavOpen}
            >
              <Settings size={16} />
              <span>{ui.workspaceSettings}</span>
              {aiSettingsImprovePending ? (
                <span className="nav-badge" title={ui.aiSettingsPendingImprove} aria-label={ui.aiSettingsPendingImprove}>
                  <Wand2 size={11} />
                </span>
              ) : null}
              <ChevronDown className="side-nav-chevron" size={14} />
            </button>
            <div className="side-nav-subitems">
              <button className={appView === "settings" && activeSettingsSection === "project" ? "active" : ""} type="button" onClick={() => {
                setAppView("settings");
                setSettingsNavOpen(true);
                setActiveSettingsSection("project");
              }}>
                <Settings size={14} />
                <span>{ui.project}</span>
              </button>
              <button className={appView === "settings" && activeSettingsSection === "auth" ? "active" : ""} type="button" onClick={() => {
                setAppView("settings");
                setSettingsNavOpen(true);
                setActiveSettingsSection("auth");
              }}>
                <ShieldCheck size={14} />
                <span>{ui.authentication}</span>
              </button>
              <button className={appView === "settings" && activeSettingsSection === "automation" ? "active" : ""} type="button" onClick={() => {
                setAppView("settings");
                setSettingsNavOpen(true);
                setActiveSettingsSection("automation");
              }}>
                <Bot size={14} />
                <span>{ui.automationSettings}</span>
              </button>
              <button className={appView === "settings" && activeSettingsSection === "ai" ? "active" : ""} type="button" onClick={() => {
                setAppView("settings");
                setSettingsNavOpen(true);
                setActiveSettingsSection("ai");
              }}>
                <Wand2 size={14} />
                <span>{ui.aiSettings}</span>
                {aiSettingsImprovePending ? (
                  <span className="nav-badge" title={ui.aiSettingsPendingImprove} aria-label={ui.aiSettingsPendingImprove}>
                    <Wand2 size={11} />
                  </span>
                ) : null}
              </button>
              <button className={appView === "settings" && activeSettingsSection === "knowledgeAi" ? "active" : ""} type="button" onClick={() => {
                setAppView("settings");
                setSettingsNavOpen(true);
                setActiveSettingsSection("knowledgeAi");
              }}>
                <BookOpen size={14} />
                <span>{ui.knowledgeAiSettings}</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-user">
          <div className="user-menu" ref={userMenuRef}>
            <button
              className="user-menu-trigger"
              type="button"
              onClick={() => setUserMenuOpen((current) => !current)}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              aria-label={ui.userMenuLabel}
            >
              <User size={16} />
              <span>{authUser || ui.userFallback}</span>
              <ChevronDown size={14} />
            </button>
            {userMenuOpen ? (
              <div className="user-menu-popover" role="menu">
                {authUser ? <div className="user-menu-email">{authUser}</div> : null}
                <button
                  className="user-menu-item"
                  type="button"
                  onClick={toggleLanguageMode}
                  role="menuitem"
                >
                  <Languages size={16} />
                  <span>{ui.languageTarget}</span>
                </button>
                <button
                  className="user-menu-item"
                  type="button"
                  onClick={() => setThemeMode((current) => (current === "dark" ? "light" : "dark"))}
                  role="menuitem"
                >
                  {themeMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{themeMode === "dark" ? ui.themeLight : ui.themeDark}</span>
                </button>
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
                  <span>{ui.changePassword}</span>
                </button>
                <button className="user-menu-item danger" type="button" onClick={logout} disabled={isWorking} role="menuitem">
                  <LogOut size={16} />
                  <span>{ui.logout}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="workspace">
        {passwordDialogOpen ? (
          <ChangePasswordDialog
            text={ui}
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

        {appView === "workspace" ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">{ui.qaWorkspaceEyebrow}</p>
                <h2>{ui.qaWorkspaceTitle}</h2>
              </div>
              <div className="top-actions">
                <IconButton icon={workspaceBusy === "load" ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />} onClick={loadQaWorkspace} disabled={Boolean(workspaceBusy)}>
                  {ui.chatwootReloadSuites}
                </IconButton>
              </div>
            </header>

            <section className="panel workspace-panel">
              <div className="section-heading">
                <div>
                  <h2>{ui.qaWorkspace}</h2>
                  <p>{ui.qaWorkspaceIntro}</p>
                </div>
              </div>
              {workspaceMessage ? <div className={workspaceMessage.startsWith("Đã") || workspaceMessage.startsWith("Saved") ? "notice ok" : "notice"}>{workspaceMessage}</div> : null}
              {qaWorkspaceTestItems.length ? (
                <div className="qa-workspace-grid">
                  {qaWorkspaceTestItems.map((item) => {
                    const importNote = /AI-547/i.test(`${item.issueKey} ${item.sourceKey} ${item.title}`)
                      ? ui.workspaceImportedAi547
                      : /AI-548/i.test(`${item.issueKey} ${item.sourceKey} ${item.title}`)
                        ? ui.workspaceImportedAi548
                        : "";
                    const itemStopStats = stopPatternStats(item.testCases || []);
                    return (
                    <article className="qa-workspace-card compact-artifact-card" key={item.id}>
                      <div className="qa-workspace-main">
                        <div className="qa-workspace-card-head">
                          <div>
                            <span>{item.issueKey || item.sourceKey}</span>
                            <h3>{item.title}</h3>
                          </div>
                          {item.chatwootSuiteFile ? <small>{ui.workspaceSuiteReady}</small> : null}
                        </div>
                        <div className="workspace-card-meta">
                          <span>{formatHistoryDate(item.updatedAt || item.createdAt, languageMode)}</span>
                          {item.chatwootSuiteFile ? <small>{item.chatwootSuiteName || item.chatwootSuiteFile}</small> : null}
                          {importNote ? <small>{importNote}</small> : null}
                        </div>
                      </div>
                      <div className="workspace-compact-metrics" aria-label={`${item.testCases.length} ${ui.workspaceCaseCount}, ${item.outline?.branches?.length || 0} ${ui.workspaceBranchCount}`}>
                        <span><strong>{item.testCases.length}</strong>{ui.workspaceCaseCount}</span>
                        <span><strong>{item.outline?.branches?.length || 0}</strong>{ui.workspaceBranchCount}</span>
                        <span className={itemStopStats.needs ? "warn" : "ok"}><strong>{itemStopStats.ready}/{itemStopStats.total}</strong>{ui.workspaceStopPatternMetric}</span>
                      </div>
                      <div className="button-row compact-actions workspace-card-actions">
                        <IconButton icon={<FileText size={15} />} onClick={() => openWorkspaceItem(item)}>
                          {ui.workspaceOpenItem}
                        </IconButton>
                        {!itemStopStats.needs ? <span className="workspace-stop-ready">{ui.workspaceStopPatternsReady}</span> : null}
                        <IconButton
                          icon={workspaceStopPatternBusyId === item.id ? <Loader2 className="spin" size={15} /> : <Wand2 size={15} />}
                          onClick={() => void refreshWorkspaceStopPatterns(item)}
                          disabled={Boolean(workspaceStopPatternBusyId)}
                          title={itemStopStats.needs ? `${itemStopStats.needs} ${ui.workspaceStopPatternsNeedUpdate}` : ui.workspaceRefreshStopPatternsAgain}
                        >
                          {itemStopStats.needs ? ui.workspaceRefreshStopPatterns : ui.workspaceRefreshStopPatternsAgain}
                        </IconButton>
                        <IconButton
                          icon={chatwootSuiteBusy && chatwootSuiteDraft.workspaceItemId === item.id ? <Loader2 className="spin" size={15} /> : <Bot size={15} />}
                          onClick={() => {
                            setChatwootSuiteDraft((current) => ({ ...current, source: "workspace", workspaceItemId: item.id, title: item.chatwootSuiteName || item.title }));
                            void createChatwootSuiteFromSource({ source: "workspace", workspaceItemId: item.id, title: item.chatwootSuiteName || item.title });
                          }}
                          disabled={chatwootSuiteBusy || !item.testCases.length}
                          variant="primary"
                        >
                          {ui.workspaceCreateChatwootSuite}
                        </IconButton>
                        {item.chatwootSuiteFile ? (
                          <IconButton
                            icon={<Play size={15} />}
                            onClick={() => {
                              updateChatwootSuiteFile(item.chatwootSuiteFile || "", "workspace");
                              setChatwootSuiteDraft((current) => ({ ...current, source: "workspace", workspaceItemId: item.id }));
                              setAppView("chatwoot");
                            }}
                          >
                            {ui.workspaceUseSuite}
                          </IconButton>
                        ) : null}
                        <IconButton icon={workspaceBusy === "delete" ? <Loader2 className="spin" size={15} /> : <Trash2 size={15} />} onClick={() => void deleteWorkspaceItem(item)} disabled={Boolean(workspaceBusy)}>
                          {ui.workspaceDelete}
                        </IconButton>
                      </div>
                    </article>
                    );
                  })}
                </div>
              ) : (
                <p className="empty">{ui.qaWorkspaceEmpty}</p>
              )}
            </section>
          </>
        ) : appView === "knowledge" ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">{ui.knowledgeEyebrow}</p>
                <h2>{ui.knowledgeTitle}</h2>
              </div>
            </header>

            <section className="settings-layout knowledge-layout">
              <aside className="settings-section-nav" aria-label={ui.knowledge}>
                {knowledgeSections.map((section) => (
                  <Fragment key={section.key}>
                    <button
                      className={activeKnowledgeSection === section.key ? "active" : ""}
                      type="button"
                      onClick={() => setActiveKnowledgeSection(section.key)}
                    >
                      {section.icon}
                      <span>{section.key === "aiWriter" ? ui.knowledgeAiWriter : knowledgeContent[section.key].nav}</span>
                    </button>
                    {section.key === "aiWriter" ? <div className="knowledge-nav-divider" role="separator" /> : null}
                  </Fragment>
                ))}
              </aside>

              <div className="settings-content">
                <section className="panel settings-panel knowledge-panel">
                  {activeKnowledgeSection === "aiWriter" ? (
                    <>
                      <div className="panel-title">
                        <Wand2 size={18} />
                        <h2>{ui.knowledgeAiWriterTitle}</h2>
                      </div>
                      <p className="panel-help">{ui.knowledgeAiWriterHelp}</p>
                      <div className="form-grid">
                        <Field label={ui.knowledgeTopic} value={knowledgeTopic} onChange={setKnowledgeTopic} placeholder={ui.knowledgeTopicPlaceholder} required />
                        <Field label={ui.knowledgeCategory} value={knowledgeCategory} onChange={setKnowledgeCategory} placeholder={knowledgeContent.principles.nav} />
                        <Field label={ui.knowledgeAudience} value={knowledgeAudience} onChange={setKnowledgeAudience} placeholder={ui.knowledgeAudiencePlaceholder} />
                      </div>
                      <Field label={ui.knowledgeNotes} value={knowledgeNotes} onChange={setKnowledgeNotes} textarea rows={5} placeholder={ui.knowledgeNotesPlaceholder} />
                      <div className="button-row">
                        <IconButton
                          icon={knowledgeBusy === "generate" ? <Loader2 className="spin" size={16} /> : <Wand2 size={16} />}
                          onClick={generateKnowledgeArticle}
                          disabled={Boolean(knowledgeBusy)}
                          variant="success"
                        >
                          {ui.generateKnowledge}
                        </IconButton>
                        <IconButton
                          icon={knowledgeBusy === "save" ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                          onClick={saveKnowledgeArticle}
                          disabled={Boolean(knowledgeBusy) || !knowledgeArticleDraft || !knowledgeDraftDirty}
                          variant="primary"
                        >
                          {ui.saveKnowledge}
                        </IconButton>
                      </div>
                      {knowledgeMessage ? <div className={knowledgeMessage.startsWith("Đã") || knowledgeMessage.startsWith("Saved") ? "notice ok" : "notice"}>{knowledgeMessage}</div> : null}
                      {knowledgeArticleDraft ? (
                        <article className="knowledge-card knowledge-draft">
                          <div>
                            <h3>{ui.generatedKnowledgeDraft}: {knowledgeArticleDraft.title}</h3>
                            <p>{knowledgeArticleDraft.summary}</p>
                          </div>
                          <pre>{knowledgeArticleDraft.content}</pre>
                        </article>
                      ) : null}
                      <div className="knowledge-card-list">
                        <h3 className="knowledge-list-title">{ui.savedKnowledgeArticles}</h3>
                        {knowledgeArticles.length ? knowledgeArticles.slice(0, 8).map((article) => (
                          <article className="knowledge-card" key={article.id}>
                            <div>
                              <h3>{article.title}</h3>
                              <p>{article.summary || article.category}</p>
                            </div>
                            {article.tags?.length ? <div className="pill-row">{article.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
                          </article>
                        )) : <p className="empty">{ui.noSavedKnowledge}</p>}
                      </div>
                    </>
                  ) : activeKnowledge ? (
                    <>
                      <div className="knowledge-hero">
                        <div>
                          <div className="panel-title">
                            <BookOpen size={18} />
                            <h2>{activeKnowledge.title}</h2>
                          </div>
                          <p>{activeKnowledge.summary}</p>
                        </div>
                        <div className="knowledge-source">
                          <span>{ui.knowledgeSource}</span>
                          <div>
                            {KNOWLEDGE_SOURCE_LINKS.map((source) => (
                              <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                                {source.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="panel-help">{ui.knowledgeIntro}</p>
                      <Field
                        label={ui.knowledgeSearch}
                        value={knowledgeSearch}
                        onChange={setKnowledgeSearch}
                        placeholder={ui.knowledgeSearchPlaceholder}
                      />
                      <div className="knowledge-card-list">
                        {activeKnowledge.cards
                          .filter((card) => {
                            if (!knowledgeSearchText) return true;
                            return normalizeComparableText(
                              [
                                card.title,
                                card.description,
                                card.example || "",
                                ...knowledgeCardDetailPoints(languageMode, activeKnowledgeSection as StaticKnowledgeSection, card),
                              ].join(" "),
                            ).includes(knowledgeSearchText);
                          })
                          .map((card) => {
                          const cardKey = `${activeKnowledgeSection}:${card.title}`;
                          const isExpanded = expandedKnowledgeCards.includes(cardKey);
                          const isBookmarked = bookmarkedKnowledgeCards.includes(cardKey);
                          const detailPoints = knowledgeCardDetailPoints(languageMode, activeKnowledgeSection as StaticKnowledgeSection, card);
                          return (
                            <article className="knowledge-card knowledge-card-collapsible" key={card.title}>
                              <div className="knowledge-card-head">
                                <div>
                                  <h3>{card.title}</h3>
                                  <p>{card.description}</p>
                                </div>
                                <div className="knowledge-card-actions">
                                  <button
                                    className={isBookmarked ? "tiny active" : "tiny"}
                                    type="button"
                                    onClick={() =>
                                      setBookmarkedKnowledgeCards((current) =>
                                        current.includes(cardKey) ? current.filter((item) => item !== cardKey) : [...current, cardKey],
                                      )
                                    }
                                    title={isBookmarked ? ui.bookmarked : ui.bookmark}
                                  >
                                    <BookOpen size={14} />
                                    {isBookmarked ? ui.bookmarked : ui.bookmark}
                                  </button>
                                  <button
                                    className="tiny"
                                    type="button"
                                    onClick={() => applyKnowledgeCardToAiPrompt(activeKnowledgeSection as StaticKnowledgeSection, card)}
                                    title={ui.applyToAiPrompt}
                                  >
                                    <Wand2 size={14} />
                                    {ui.applyToAiPrompt}
                                  </button>
                                  <button
                                    className="tiny"
                                    type="button"
                                    onClick={() =>
                                      setExpandedKnowledgeCards((current) =>
                                        current.includes(cardKey) ? current.filter((item) => item !== cardKey) : [...current, cardKey],
                                      )
                                    }
                                    aria-expanded={isExpanded}
                                    title={isExpanded ? ui.caseCollapse : ui.caseDetails}
                                  >
                                    {isExpanded ? <ChevronDown size={14} /> : <FileText size={14} />}
                                    {isExpanded ? ui.caseCollapse : ui.caseDetails}
                                  </button>
                                </div>
                              </div>
                              {isExpanded ? (
                                <div className="knowledge-card-body">
                                  <ul>
                                    {detailPoints.map((point) => (
                                      <li key={point}>{point}</li>
                                    ))}
                                  </ul>
                                  {card.example ? <div className="knowledge-example">{card.example}</div> : null}
                                </div>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </section>
              </div>
            </section>
          </>
        ) : appView === "chatwoot" ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">{ui.chatwootUatEyebrow}</p>
                <h2>{ui.chatwootUatTitle}</h2>
              </div>
              <div className="top-actions">
                <IconButton icon={chatwootBusy === "load" ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />} onClick={loadChatwootUatInfo} disabled={Boolean(chatwootBusy)}>
                  {ui.chatwootReloadSuites}
                </IconButton>
              </div>
            </header>

            <section className="chatwoot-layout">
              <div className="panel chatwoot-config-panel">
                <div className="panel-title">
                  <Bot size={18} />
                  <h2>{ui.chatwootUat}</h2>
                </div>
                <div className="chatwoot-readiness">
                  <div className="chatwoot-readiness-head">
                    <div>
                      <strong>{ui.chatwootReadiness}</strong>
                      <small>
                        {chatwootBlockingReadinessCount
                          ? `${chatwootBlockingReadinessCount} ${ui.chatwootNeedConfig.toLowerCase()}`
                          : ui.chatwootReady}
                      </small>
                    </div>
                    <div className="chatwoot-readiness-chips">
                      {chatwootReadinessItems.map((item) => (
                        <span className={item.ready ? "readiness-chip ok" : item.optional ? "readiness-chip warn" : "readiness-chip bad"} key={item.key}>
                          {item.ready ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                          {item.label}
                        </span>
                      ))}
                      <button className="tiny" type="button" onClick={() => setChatwootReadinessOpen((current) => !current)}>
                        {chatwootReadinessOpen ? ui.chatwootHideReadiness : ui.chatwootShowReadiness}
                      </button>
                    </div>
                  </div>
                  {chatwootReadinessOpen ? (
                    <div className="chatwoot-readiness-detail">
                      <small>{ui.chatwootReadinessHint}</small>
                      <div className="chatwoot-readiness-detail-grid">
                        {chatwootReadinessItems.map((item) => (
                          <span className={item.ready ? "ok" : item.optional ? "warn" : "bad"} key={item.key}>
                            <strong>{item.label}</strong>
                            <small>{item.detail}</small>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="chatwoot-suite-builder">
                  <div className="section-heading compact-heading">
                    <div>
                      <h3>{ui.chatwootSuiteBuilderTitle}</h3>
                    </div>
                  </div>
                  <label className="field">
                    <span>{ui.chatwootAgent}</span>
                    <select
                      value={selectedChatwootAgent?.id || ""}
                      onChange={(event) => {
                        setSelectedChatwootAgentId(event.target.value);
                        setChatwootMessage("");
                      }}
                    >
                      {chatwootAgentProfiles.length ? (
                        chatwootAgentProfiles.map((profile) => (
                          <option value={profile.id} key={profile.id}>
                            {profile.name} · Inbox {profile.config.chatwootUiInboxId || profile.config.chatwootInboxId || "-"}
                          </option>
                        ))
                      ) : (
                        <option value="">{ui.chatwootNoAgents}</option>
                      )}
                    </select>
                  </label>
                  {selectedChatwootAgent ? (
                    <div className="mini-note">
                      {ui.chatwootSelectedAgent}: {selectedChatwootAgent.name} · {ui.chatwootInboxId} {chatwootAutomationConfig.chatwootInboxId || "-"} · {ui.chatwootUiInboxId} {chatwootAutomationConfig.chatwootUiInboxId || "-"} · {ui.chatwootCaptainAssistantId} {chatwootAutomationConfig.chatwootCaptainAssistantId || "-"}
                    </div>
                  ) : (
                    <div className="mini-note warn-text">{ui.chatwootNoAgents}</div>
                  )}
                  <div className="chatwoot-run-config-summary">
                    <div className="chatwoot-run-config-head">
                      <div>
                        <strong>{ui.chatwootRunConfigSummary}</strong>
                        <small>
                          {(selectedChatwootAgent?.name || ui.chatwootAgentRequired)} · {chatwootModeLabel(effectiveChatwootRunMode)} · {chatwootChatUiModeLabel(effectiveChatwootChatUiMode)} · {chatwootRunUsesPlanner ? chatwootPlannerBackendLabel(effectiveChatwootPlannerBackend) : ui.chatwootPlannerDisabledForFixed} · {ui.chatwootUiInboxId} {chatwootAutomationConfig.chatwootUiInboxId || chatwootAutomationConfig.chatwootInboxId || "-"}
                        </small>
                      </div>
                      <IconButton
                        icon={<Settings size={15} />}
                        onClick={() => {
                          setActiveSettingsSection("automation");
                          setAppView("settings");
                          setSettingsNavOpen(true);
                        }}
                      >
                        {ui.chatwootOpenAutomationSettings}
                      </IconButton>
                    </div>
                    <div className="chatwoot-run-config-controls">
                      <label className="field compact-run-field">
                        <span>{ui.chatwootRunModeForThisRun}</span>
                        <select value={effectiveChatwootRunMode} onChange={(event) => updateChatwootForm("mode", event.target.value as ChatwootUatRunForm["mode"])}>
                          <option value="adaptive">{ui.chatwootAdaptiveMode}</option>
                          <option value="suite">{ui.chatwootSuiteMode}</option>
                        </select>
                      </label>
                      <label className="field compact-run-field">
                        <span>{ui.chatwootPlannerForThisRun}</span>
                        <select
                          value={effectiveChatwootPlannerBackend}
                          onChange={(event) => updateChatwootForm("plannerBackend", event.target.value as ChatwootUatRunForm["plannerBackend"])}
                          disabled={!chatwootRunUsesPlanner}
                        >
                          <option value="openai-compatible">{ui.chatwootPlannerAi}</option>
                          <option value="heuristic">{ui.chatwootPlannerHeuristic}</option>
                          <option value="codex-cli">{ui.chatwootPlannerCodex}</option>
                        </select>
                      </label>
                    </div>
                    <small className="chatwoot-run-override-hint">{ui.chatwootRunOverrideHint}</small>
                  </div>
                  <div className="chatwoot-source-tabs" aria-label={ui.chatwootSuiteSource}>
                    <button
                      className={chatwootSuiteDraft.source === "workspace" ? "active" : ""}
                      type="button"
                      onClick={() => {
                        updateChatwootSuiteDraft("source", "workspace");
                        updateChatwootSuiteFile("");
                        setChatwootMessage("");
                      }}
                    >
                      <Layers size={15} />
                      {ui.chatwootSourceWorkspace}
                    </button>
                    <button
                      className={chatwootSuiteDraft.source === "manual" ? "active" : ""}
                      type="button"
                      onClick={() => {
                        updateChatwootSuiteDraft("source", "manual");
                        updateChatwootSuiteFile("");
                        setChatwootMessage("");
                      }}
                    >
                      <FileText size={15} />
                      {ui.chatwootSourceManual}
                    </button>
                  </div>
                  {chatwootSuiteDraft.source === "workspace" ? (
                    <>
                      <label className="field">
                        <span>{ui.chatwootWorkspaceItem}</span>
                        <select
                          value={chatwootSuiteDraft.workspaceItemId}
                          onChange={(event) => {
                            updateChatwootSuiteDraft("workspaceItemId", event.target.value);
                            updateChatwootSuiteFile("");
                            setChatwootMessage("");
                          }}
                        >
                          {qaWorkspaceTestItems.length ? (
                            qaWorkspaceTestItems.map((item) => (
                              <option value={item.id} key={item.id}>
                                {item.issueKey || item.sourceKey} · {item.title} ({item.testCases.length})
                              </option>
                            ))
                          ) : (
                            <option value="">{ui.qaWorkspaceEmpty}</option>
                          )}
                        </select>
                      </label>
                      {selectedWorkspaceItem ? (
                        <div className="mini-note">
                          {selectedWorkspaceItem.testCases.length} {ui.workspaceCaseCount} · {selectedWorkspaceItem.outline?.branches?.length || 0} {ui.workspaceBranchCount}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {chatwootSuiteDraft.source === "manual" ? (
                    <Field
                      label={ui.chatwootManualScenario}
                      value={chatwootSuiteDraft.scenario}
                      onChange={(value) => updateChatwootSuiteDraft("scenario", value)}
                      textarea
                      rows={5}
                      placeholder={ui.chatwootManualScenarioPlaceholder}
                    />
                  ) : null}
                  <div className="button-row compact-actions">
                    <IconButton icon={chatwootSuiteBusy ? <Loader2 className="spin" size={16} /> : <Plus size={16} />} onClick={() => void createChatwootSuiteFromSource()} disabled={chatwootSuiteBusy || !chatwootInfo?.skillExists || !selectedChatwootAgent} variant="primary">
                      {chatwootSuiteDraft.source === "manual" ? ui.chatwootAiCreateCases : ui.chatwootCreateSuiteFromSource}
                    </IconButton>
                  </div>
                </div>

                {chatwootPreparedSuiteReady && selectedChatwootCases.length ? (
                  <div className="chatwoot-case-picker">
                    <div className="section-heading compact-heading">
                      <div>
                        <h3>{ui.chatwootCaseSelection}</h3>
                        <p>
                          {chatwootRunAllCases
                            ? `${ui.chatwootWillRunAllCases} ${selectedChatwootCases.length} ${ui.workspaceCaseCount}.`
                            : `${chatwootSelectedCaseIds.length}/${selectedChatwootCases.length} ${ui.chatwootSelectedCases}.`}
                        </p>
                      </div>
                      <div className="chatwoot-case-picker-actions">
                        <button className="tiny" type="button" onClick={selectAllChatwootCases} disabled={chatwootHasActiveJob}>
                          {ui.chatwootSelectAllCases}
                        </button>
                        <button className="tiny" type="button" onClick={clearChatwootCaseSelection} disabled={chatwootHasActiveJob}>
                          {ui.chatwootClearSelection}
                        </button>
                      </div>
                    </div>
                    <Field label={ui.chatwootCaseSearch} value={chatwootCaseSearch} onChange={setChatwootCaseSearch} placeholder="AI-548, booking, pending..." />
                    <div className="chatwoot-case-picker-list">
                      {filteredChatwootCases.map((testCase) => {
                        const caseState = chatwootCaseStateById.get(testCase.caseId);
                        const caseIsLocked = Boolean(caseState && caseState.status !== "pending");
                        const caseCanStop = activeChatwootRunMatchesSuite && Boolean(caseState && ["pending", "running"].includes(caseState.status));
                        const checked = activeChatwootRunMatchesSuite
                          ? Boolean(caseState && !["skipped", "interrupted"].includes(caseState.status))
                          : chatwootRunAllCases || chatwootSelectedCaseIds.includes(testCase.caseId);
                        const caseExpanded = expandedChatwootCaseIds.includes(testCase.caseId);
                        const caseSteps = testCase.steps || [];
                        const stopConditions = testCase.stopConditions || {
                          pass: (testCase.stopPatterns || []).map((pattern) => humanizeStopPatternForUi(pattern, "pass")),
                          fail: (testCase.failPatterns || []).map((pattern) => humanizeStopPatternForUi(pattern, "fail")),
                        };
                        const stopConditionEdit = chatwootCaseStopConditionEdits[testCase.caseId] || {
                          pass: sanitizeStopConditionsForUi(stopConditions.pass || [], "pass").join("\n"),
                          fail: sanitizeStopConditionsForUi(stopConditions.fail || [], "fail").join("\n"),
                        };
                        const caseHasDetails = Boolean(testCase.testData || testCase.expectedResult || testCase.plannerInstruction || caseSteps.length);
                        return (
                          <article className={checked ? `chatwoot-case-option checked ${caseState?.status || ""}` : `chatwoot-case-option ${caseState?.status || ""}`} key={testCase.caseId || testCase.index}>
                            <input
                              type="checkbox"
                              aria-label={`${testCase.caseId} ${testCase.title}`}
                              checked={checked}
                              disabled={activeChatwootRunMatchesSuite || caseIsLocked}
                              title={caseIsLocked ? ui.chatwootCaseLocked : undefined}
                              onChange={(event) => {
                                if (activeChatwootRunMatchesSuite) return;
                                setChatwootCaseChecked(testCase.caseId, event.target.checked);
                              }}
                            />
                            <span className="chatwoot-case-content">
                              <div className="chatwoot-case-title-line">
                                <strong>
                                  #{testCase.index} · {testCase.title}
                                  {caseState ? <b className={`chatwoot-case-status ${caseState.status}`}>{chatwootCaseStatusLabel(caseState.status)}</b> : null}
                                </strong>
                                <button
                                  className={caseExpanded ? "tiny chatwoot-case-detail-toggle open" : "tiny chatwoot-case-detail-toggle"}
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleChatwootCaseDetails(testCase.caseId);
                                  }}
                                >
                                  <ChevronDown size={13} />
                                  <span>{caseExpanded ? ui.chatwootCaseCollapse : ui.chatwootCaseDetails}</span>
                                </button>
                              </div>
                              <small>{testCase.caseId}</small>
                              {testCase.openingPrompt ? (
                                <em>
                                  <span className="chatwoot-case-inline-label">{ui.chatwootOpeningPrompt}: </span>
                                  {testCase.openingPrompt}
                                </em>
                              ) : null}
                              {caseState?.error ? <em className="chatwoot-case-error">{caseState.error}</em> : null}
                              {caseExpanded ? (
                                <div className="chatwoot-case-detail">
                                  {caseHasDetails ? (
                                    <>
                                      {testCase.testData ? (
                                        <section className="chatwoot-case-detail-block">
                                          <h4>{ui.chatwootCaseRunData}</h4>
                                          <pre>{testCase.testData}</pre>
                                        </section>
                                      ) : null}
                                      <section className="chatwoot-case-detail-block">
                                        <h4>{ui.chatwootCasePlannerContext}</h4>
                                        <p>{ui.chatwootCasePlannerContextHelp}</p>
                                        {testCase.plannerInstruction ? <pre>{testCase.plannerInstruction}</pre> : null}
                                      </section>
                                      {caseSteps.length ? (
                                        <section className="chatwoot-case-detail-block full">
                                          <h4>{ui.chatwootCaseSteps}</h4>
                                          <ol className="chatwoot-case-step-list">
                                            {caseSteps.map((step, stepIndex) => (
                                              <li key={`${testCase.caseId}-step-${step.index || stepIndex}`}>
                                                <b>{step.index || stepIndex + 1}</b>
                                                <span>
                                                  {step.prompt ? <strong>{step.prompt}</strong> : null}
                                                  {step.testData && step.testData !== step.prompt ? <small>{step.testData}</small> : null}
                                                  {step.expected ? <em>{step.expected}</em> : null}
                                                </span>
                                              </li>
                                            ))}
                                          </ol>
                                        </section>
                                      ) : null}
                                      {testCase.expectedResult ? (
                                        <section className="chatwoot-case-detail-block full">
                                          <h4>{ui.chatwootCaseExpected}</h4>
                                          <pre>{testCase.expectedResult}</pre>
                                        </section>
                                      ) : null}
                                    </>
                                  ) : (
                                    <p className="mini-note">{ui.chatwootCaseNoDetails}</p>
                                  )}
                                  <section className="chatwoot-case-detail-block full">
                                    <h4>{ui.chatwootCaseStopPatternsEdit}</h4>
                                    <p>{ui.chatwootCaseStopPatternsHelp}</p>
                                    <div className="chatwoot-stop-condition-grid">
                                      <label className="chatwoot-stop-condition-field pass">
                                        <span>{ui.chatwootCasePassConditions}</span>
                                        <textarea
                                          className="chatwoot-stop-condition-editor"
                                          value={stopConditionEdit.pass}
                                          onChange={(event) => updateChatwootCaseStopCondition(testCase.caseId, "pass", event.target.value)}
                                          rows={Math.min(5, Math.max(2, stopConditionEdit.pass.split(/\r?\n/).length + 1))}
                                          placeholder={languageMode === "en" ? "Bot returns the expected payment link." : "Bot trả về link thanh toán đúng với dữ liệu test."}
                                        />
                                      </label>
                                      <label className="chatwoot-stop-condition-field fail">
                                        <span>{ui.chatwootCaseFailConditions}</span>
                                        <textarea
                                          className="chatwoot-stop-condition-editor"
                                          value={stopConditionEdit.fail}
                                          onChange={(event) => updateChatwootCaseStopCondition(testCase.caseId, "fail", event.target.value)}
                                          rows={Math.min(5, Math.max(2, stopConditionEdit.fail.split(/\r?\n/).length + 1))}
                                          placeholder={languageMode === "en" ? "Bot reports a system error or uses the wrong data." : "Bot báo lỗi hệ thống hoặc phản hồi sai dữ liệu test."}
                                        />
                                      </label>
                                    </div>
                                  </section>
                                </div>
                              ) : null}
                            </span>
                            {caseCanStop ? (
                              <button
                                className="button danger chatwoot-stop-case-button"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void cancelChatwootCase(testCase.caseId);
                                }}
                                disabled={chatwootBusy === "cancel"}
                              >
                                {chatwootBusy === "cancel" ? <Loader2 className="spin" size={15} /> : <Square size={15} />}
                                <span>{caseState?.status === "pending" ? ui.chatwootSkipPendingCase : ui.chatwootStopCase}</span>
                              </button>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ) : chatwootPreparedSuiteReady ? (
                  <div className="mini-note">{ui.chatwootNoCaseMetadata}</div>
                ) : (
                  <div className="mini-note">
                    {chatwootSuiteDraft.source === "manual" ? ui.chatwootManualPrepareHint : ui.chatwootWorkspacePrepareHint}
                  </div>
                )}
                <div className="button-row">
                  <IconButton
                    icon={chatwootBusy === "run" ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
                    onClick={runChatwootUat}
                    disabled={
                      Boolean(chatwootBusy) ||
                      chatwootHasActiveJob ||
                      !chatwootInfo?.skillExists ||
                      !selectedChatwootAgent ||
                      !chatwootPreparedSuiteReady ||
                      (!chatwootRunAllCases && selectedChatwootCases.length > 0 && !chatwootSelectedCaseIds.length) ||
                      (chatwootRunUsesPlanner && effectiveChatwootPlannerBackend === "openai-compatible" && !chatwootInfo?.plannerAiReady)
                    }
                    variant="primary"
                  >
                    {ui.chatwootRun}
                  </IconButton>
                  {chatwootHasActiveJob ? (
                    <IconButton
                      icon={chatwootBusy === "cancel" ? <Loader2 className="spin" size={16} /> : <Square size={16} />}
                      onClick={cancelChatwootUatJob}
                      disabled={Boolean(chatwootBusy)}
                      variant="danger"
                    >
                      {ui.chatwootStopRun}
                    </IconButton>
                  ) : null}
                </div>
                {chatwootMessage ? <div className={chatwootMessage.startsWith("Đã") || chatwootMessage.startsWith("Chatwoot") || chatwootMessage.startsWith("Stopped") ? "notice ok" : "notice"}>{chatwootMessage}</div> : null}
              </div>

              <div className="panel chatwoot-result-panel">
                <div className="section-heading">
                  <div>
                    <h2>{ui.chatwootResult}</h2>
                    <p>{chatwootResult?.report.suiteName || ui.emptyOutput}</p>
                  </div>
                </div>
                {chatwootActiveJob ? (
                  <div className={`chatwoot-job-status ${chatwootActiveJob.status}`}>
                    <div>
                      <strong>{ui.chatwootStatus}: {chatwootJobStatusLabel(chatwootActiveJob.status)}</strong>
                      <span>{chatwootActiveJob.suiteName || chatwootActiveJob.suiteFile}</span>
                    </div>
                    <small>{formatHistoryDate(chatwootActiveJob.updatedAt, languageMode)}</small>
                  </div>
                ) : null}
                {chatwootResult ? (
                  <>
                    <div className="metric-row chatwoot-metrics">
                      <div>
                        <strong>{chatwootResult.report.total}</strong>
                        <span>{ui.chatwootMetricTotal}</span>
                      </div>
                      <div>
                        <strong>{chatwootResult.report.success}</strong>
                        <span>{ui.chatwootMetricPass}</span>
                      </div>
                      <div>
                        <strong>{chatwootResult.report.handoff}</strong>
                        <span>{ui.chatwootMetricHandoff}</span>
                      </div>
                      <div>
                        <strong>{chatwootResult.report.failure}</strong>
                        <span>{ui.chatwootMetricFail}</span>
                      </div>
                    </div>
                    <div className="button-row compact-actions">
                      {chatwootResult.files.report ? (
                        <a className="button" href={chatwootResult.files.report.url} target="_blank" rel="noreferrer">
                          <Link size={16} />
                          <span>{ui.chatwootOpenReport}</span>
                        </a>
                      ) : null}
                      {chatwootResult.files.raw ? (
                        <a className="button" href={chatwootResult.files.raw.url} target="_blank" rel="noreferrer">
                          <FileText size={16} />
                          <span>{ui.chatwootOpenRaw}</span>
                        </a>
                      ) : null}
                      {chatwootResult.files.yaml ? (
                        <a className="button" href={chatwootResult.files.yaml.url} target="_blank" rel="noreferrer">
                          <FileText size={16} />
                          <span>{ui.chatwootOpenYaml}</span>
                        </a>
                      ) : null}
                    </div>
                    {chatwootFailedResults.length ? (
                      <div className="chatwoot-failure-summary">
                        <strong>{ui.chatwootFailureSummary}</strong>
                        {chatwootFailedResults.map((result) => {
                          const reasons = chatwootCaseResultReasons(result);
                          const status = chatwootCaseResultStatus(result);
                          return (
                            <div className={`chatwoot-failure-row ${status.className}`} key={`${result.caseId}-${result.conversationId}-summary`}>
                              <span>
                                <b>{result.caseId || result.title}</b>
                                <small>{result.title}</small>
                              </span>
                              <em>{reasons.join(" · ") || ui.chatwootUnknownFailure}</em>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    <div className="chatwoot-case-list">
                      {chatwootResult.report.results.map((result) => {
                        const status = chatwootCaseResultStatus(result);
                        const reasons = chatwootCaseResultReasons(result);
                        return (
                          <article className={`chatwoot-case-card ${status.className}`} key={`${result.caseId}-${result.conversationId}`}>
                            <div>
                              <div className="chatwoot-case-card-title">
                                <strong>{result.caseId || result.title}</strong>
                                <b className={`chatwoot-result-badge ${status.className}`}>{status.label}</b>
                              </div>
                              <span>{result.title}</span>
                              {result.succeeded ? (
                                <small>
                                  {ui.chatwootCompletionReason}: {reasons.join(" · ") || result.completedReason || "-"}
                                </small>
                              ) : (
                                <div className="chatwoot-case-failure-detail">
                                  <small>
                                    <b>{ui.chatwootFailureReason}:</b> {reasons.join(" · ") || ui.chatwootUnknownFailure}
                                  </small>
                                  <small>
                                    <b>{ui.chatwootFailureHint}:</b> {chatwootFailureHint(reasons)}
                                  </small>
                                </div>
                              )}
                            </div>
                            <div className="chatwoot-case-actions">
                              {result.conversationUrl ? (
                                <a className="tiny" href={result.conversationUrl} target="_blank" rel="noreferrer">
                                  {ui.chatwootConversation}
                                </a>
                              ) : null}
                              {result.paymentLink ? (
                                <a className="tiny" href={result.paymentLink} target="_blank" rel="noreferrer">
                                  {ui.chatwootPaymentLink}
                                </a>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    {chatwootResult.stdout || chatwootResult.stderr ? (
                      <div className="output">
                        {chatwootResult.stdout ? <pre>{chatwootResult.stdout}</pre> : null}
                        {chatwootResult.stderr ? <pre>{chatwootResult.stderr}</pre> : null}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="empty">{ui.emptyOutput}</p>
                )}
                <div className="chatwoot-history-panel">
                  <div className="section-heading compact-heading">
                    <div>
                      <h3>{ui.chatwootRunHistory}</h3>
                      <p>{chatwootJobs.length ? `${chatwootJobs.length} ${ui.chatwootRunCountUnit}` : ui.chatwootNoHistory}</p>
                    </div>
                    <IconButton icon={chatwootBusy === "history" ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />} onClick={loadChatwootJobs} disabled={Boolean(chatwootBusy)}>
                      {ui.chatwootReloadHistory}
                    </IconButton>
                  </div>
                  {chatwootJobs.length ? (
                    <div className="chatwoot-history-list">
                      {chatwootJobs.map((job) => (
                        <article className={`chatwoot-history-card ${job.status}`} key={job.id}>
                          <button type="button" onClick={() => {
                            setChatwootActiveJob(job);
                            if (job.result) setChatwootResult(job.result);
                            setChatwootMessage(job.error || (job.status === "completed" ? ui.chatwootRunDone : ui.chatwootJobRunning));
                          }}>
                            <strong>{job.suiteName || job.suiteFile}</strong>
                            <span>{chatwootJobStatusLabel(job.status)} · {formatHistoryDate(job.createdAt, languageMode)}</span>
                          </button>
                          {job.result?.files?.report ? (
                            <a href={job.result.files.report.url} target="_blank" rel="noreferrer">
                              {ui.chatwootOpenReport}
                            </a>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          </>
        ) : appView === "settings" ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">{ui.settingsEyebrow}</p>
                <h2>{ui.workspaceSettings}</h2>
              </div>
            </header>

            <section className="settings-layout settings-layout-single">
              <div className="settings-content">
              {activeSettingsSection === "project" ? (
              <section className="panel settings-panel">
                <div className="panel-title">
                  <Settings size={18} />
                  <h2>{ui.projectConfig}</h2>
                </div>
                <div className="form-grid">
                  <Field label={ui.jiraBaseUrl} value={project.jiraBaseUrl} onChange={(value) => setProjectValue("jiraBaseUrl", value)} required error={validationErrors["project.jiraBaseUrl"]} />
                  <Field label={ui.projectKey} value={project.projectKey} onChange={(value) => setProjectValue("projectKey", value)} required error={validationErrors["project.projectKey"]} />
                  <Field label={ui.testCaseFolderRoot} value={project.folderRoot} onChange={(value) => setProjectValue("folderRoot", value)} required error={validationErrors["project.folderRoot"]} />
                  <Field label={ui.testCycleRunRoot} value={project.runRoot} onChange={(value) => setProjectValue("runRoot", value)} required error={validationErrors["project.runRoot"]} />
                </div>
                <button className="settings-advanced-toggle" type="button" onClick={() => setProjectAdvancedOpen((current) => !current)} aria-expanded={projectAdvancedOpen}>
                  {projectAdvancedOpen ? <ChevronDown size={15} /> : <FileText size={15} />}
                  <span>{ui.projectAdvanced}</span>
                </button>
                {projectAdvancedOpen ? (
                  <>
                <div className="label-policy">
                  <div className="subhead">
                    <span>{ui.labelPolicy}</span>
                  </div>
                  <label className="field">
                    <span>{ui.mode}</span>
                    <select value={project.labelMode} onChange={(event) => setProjectValue("labelMode", event.target.value)}>
                      <option value="custom">{ui.labelModeCustom}</option>
                      <option value="passthrough">{ui.labelModePassthrough}</option>
                      <option value="none">{ui.labelModeNone}</option>
                    </select>
                  </label>
                  <div className="form-grid">
                    <Field
                      label={ui.testCaseRequiredLabels}
                      value={project.testcaseLabels}
                      onChange={(value) => setProjectValue("testcaseLabels", value)}
                      placeholder="QA_Testcases"
                      required={project.labelMode === "custom"}
                      error={validationErrors["project.testcaseLabels"]}
                    />
                    <Field
                      label={ui.testDesignRequiredLabels}
                      value={project.testdesignLabels}
                      onChange={(value) => setProjectValue("testdesignLabels", value)}
                      placeholder="QA_testdesign"
                      required={project.labelMode === "custom"}
                      error={validationErrors["project.testdesignLabels"]}
                    />
                  </div>
                  <div className="form-grid two">
                    <Field
                      label={ui.testCaseStatusLabels}
                      value={project.testcaseStatusLabels}
                      onChange={(value) => setProjectValue("testcaseStatusLabels", value)}
                      textarea
                      rows={5}
                    />
                    <Field
                      label={ui.testDesignStatusLabels}
                      value={project.testdesignStatusLabels}
                      onChange={(value) => setProjectValue("testdesignStatusLabels", value)}
                      textarea
                      rows={5}
                    />
                  </div>
                </div>
                <div className="label-policy">
                  <div className="subhead">
                    <span>{ui.testCaseNumbering}</span>
                  </div>
                  <div className="form-grid">
                    <Field
                      label={ui.testCaseNumberTemplate}
                      value={project.testCaseNumberTemplate}
                      onChange={(value) => setProjectValue("testCaseNumberTemplate", value)}
                      placeholder="TC_{0000}"
                    />
                    <div className="number-preview">
                      <span>{ui.testCaseNumberPreview}</span>
                      <strong>{testCaseTitlePrefix(project.testCaseNumberTemplate, 1)} Discovery tool chính cho bus booking</strong>
                      <small>{ui.testCaseNumberTemplateHint}</small>
                    </div>
                  </div>
                </div>
                  </>
                ) : null}
                <div className="button-row">
                  <IconButton
                    icon={settingsBusy === "project" ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                    onClick={() => saveUserSettings("project")}
                    disabled={Boolean(settingsBusy) || !settingsDirty.project}
                    variant="primary"
                  >
                    {ui.save}
                  </IconButton>
                </div>
                {settingsStatus.project ? <div className="mini-note">{settingsStatus.project}</div> : null}
              </section>
              ) : null}

              {activeSettingsSection === "automation" ? (
              <section className="panel settings-panel automation-settings-panel">
                <div className="panel-title automation-panel-title">
                  <span className="panel-title-main">
                    <Bot size={18} />
                    <h2>{ui.automationSettings}</h2>
                  </span>
                  {!automationEditorOpen ? (
                    <IconButton icon={<Plus size={15} />} onClick={openNewAutomationConnector} disabled={Boolean(settingsBusy)} variant="primary">
                      {ui.createConnector}
                    </IconButton>
                  ) : null}
                </div>
                {!automationEditorOpen ? (
                  <>
                <div className="automation-agent-layout">
                  <div className="automation-agent-list-panel">
                    <div className="subhead">
                      <span>{ui.chatwootSavedAgentList}</span>
                      <small>{chatwootAgentProfiles.length ? `${chatwootAgentProfiles.length} ${ui.chatwootAgents.toLowerCase()}` : ""}</small>
                    </div>
                    {chatwootAgentProfiles.length ? (
                      <div className="automation-agent-table" role="table" aria-label={ui.chatwootSavedAgentList}>
                        <div className="automation-agent-table-head" role="row">
                          <span>{ui.chatwootAgentName}</span>
                          <span>{ui.chatwootInboxId}</span>
                          <span>{ui.chatwootUiInboxId}</span>
                          <span>{ui.chatwootCaptainAssistantId}</span>
                          <span>{ui.chatwootPlannerBackend}</span>
                          <span>{ui.chatwootLabels}</span>
                          <span></span>
                        </div>
                        {chatwootAgentProfiles.map((profile) => (
                          <article className={selectedChatwootAgentId === profile.id ? "automation-agent-row selected" : "automation-agent-row"} key={profile.id} role="row">
                            <div className="automation-agent-name-cell">
                              <strong>{profile.name}</strong>
                              <small>{automationTargetLabels[profile.targetType] || ui.automationTargetOther} · {profile.config.chatwootApiBase || "-"}</small>
                              <small>{formatHistoryDate(profile.updatedAt, languageMode)}</small>
                            </div>
                            <span className="automation-agent-cell" data-label={ui.chatwootInboxId}>{profile.config.chatwootInboxId || "-"}</span>
                            <span className="automation-agent-cell" data-label={ui.chatwootUiInboxId}>{profile.config.chatwootUiInboxId || profile.config.chatwootInboxId || "-"}</span>
                            <span className="automation-agent-cell" data-label={ui.chatwootCaptainAssistantId}>{profile.config.chatwootCaptainAssistantId || "-"}</span>
                            <span className="automation-agent-cell" data-label={ui.chatwootPlannerBackend}>
                              <strong>{chatwootPlannerBackendLabel(profile.config.chatwootPlannerBackend)}</strong>
                              <small>{ui.chatwootPlannerModelSource}: {chatwootPlannerModelLabel(profile.config.chatwootPlannerBackend, profile.config.chatwootPlannerModel)}</small>
                            </span>
                            <span className="automation-agent-cell" data-label={ui.chatwootLabels}>
                              <strong>{profile.config.chatwootLabels || "-"}</strong>
                              <small>{ui.chatwootAssigneeName}: {profile.config.chatwootAssigneeName || "-"}</small>
                            </span>
                            <div className="automation-profile-card-actions">
                              <button className="tiny" type="button" onClick={() => applyAutomationProfile(profile)} disabled={Boolean(settingsBusy)}>
                                {ui.applyAutomationProfile}
                              </button>
                              <button className="tiny" type="button" onClick={() => editAutomationProfile(profile)} disabled={Boolean(settingsBusy)}>
                                {ui.editConnector}
                              </button>
                              <button className="tiny danger" type="button" onClick={() => void deleteAutomationProfile(profile)} disabled={Boolean(settingsBusy)}>
                                {ui.deleteAutomationProfile}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="mini-note">{ui.chatwootNoAgents}</div>
                    )}
                  </div>
                </div>
                  </>
                ) : (
                  <>
                <div className="automation-editor-nav">
                  <button className="tiny" type="button" onClick={closeAutomationConnectorEditor} disabled={Boolean(settingsBusy)}>
                    <ArrowLeft size={14} />
                    {ui.backToConnectors}
                  </button>
                </div>
                <p className="panel-help automation-editor-help">{ui.automationSettingsHelp}</p>
                <div className="automation-agent-editor">
                  <div className="subhead">
                    <span>{ui.chatwootAgentEditor}</span>
                    <small>{ui.automationProfileChangedFieldsCopy}</small>
                  </div>
                  <div className="form-grid automation-agent-form">
                    <Field
                      label={automationProfileTargetType === "chatwoot" ? ui.chatwootAgentName : ui.automationProfileName}
                      value={automationProfileName}
                      onChange={setAutomationProfileName}
                      placeholder={automationProfileTargetType === "chatwoot" ? ui.chatwootAgentNamePlaceholder : defaultAutomationProfileName(project) || ui.automationProfileNamePlaceholder}
                    />
                    <label className="field">
                      <span>{ui.automationTargetType}</span>
                      <select value={automationProfileTargetType} onChange={(event) => setAutomationProfileTargetType(event.target.value as AutomationProfile["targetType"])}>
                        <option value="chatwoot">{ui.automationTargetChatwoot}</option>
                        <option value="web">{ui.automationTargetWeb}</option>
                        <option value="api">{ui.automationTargetApi}</option>
                        <option value="other">{ui.automationTargetOther}</option>
                      </select>
                    </label>
                  </div>
                  <Field label={ui.chatwootApiBase} value={project.chatwootApiBase} onChange={(value) => setProjectValue("chatwootApiBase", value)} placeholder="https://uat-omniagent.vexere.net" />
                  <div className="automation-agent-save-row">
                    <small>{ui.chatwootApiBase}: {project.chatwootApiBase || "-"} · {ui.chatwootInboxId}: {project.chatwootInboxId || "-"} · {ui.chatwootCaptainAssistantId}: {project.chatwootCaptainAssistantId || "-"}</small>
                    <div className="button-row compact-actions">
                      <IconButton
                        icon={settingsBusy === "automation" ? <Loader2 className="spin" size={15} /> : <Save size={15} />}
                        onClick={() => void saveAutomationProfile()}
                        disabled={Boolean(settingsBusy)}
                        variant="primary"
                      >
                        {automationProfileTargetType === "chatwoot" ? ui.saveChatwootAgent : ui.saveAutomationProfile}
                      </IconButton>
                      <IconButton icon={<X size={15} />} onClick={closeAutomationConnectorEditor} disabled={Boolean(settingsBusy)}>
                        {ui.cancelConnector}
                      </IconButton>
                    </div>
                  </div>
                </div>
                <div className="label-policy automation-config-block">
                  <div className="subhead">
                    <span>{ui.automationAgentSection}</span>
                    <small>{ui.automationAgentHelp}</small>
                  </div>
                  <div className="form-grid">
                    <Field label={ui.chatwootInboxId} value={project.chatwootInboxId} onChange={(value) => setProjectValue("chatwootInboxId", value)} placeholder="3062" />
                    <Field label={ui.chatwootUiInboxId} value={project.chatwootUiInboxId} onChange={(value) => setProjectValue("chatwootUiInboxId", value)} placeholder="3062" />
                    <Field label={ui.chatwootCaptainAssistantId} value={project.chatwootCaptainAssistantId} onChange={(value) => setProjectValue("chatwootCaptainAssistantId", value)} placeholder="80" />
                    <Field label={ui.chatwootAccountId} value={project.chatwootAccountId} onChange={(value) => setProjectValue("chatwootAccountId", value)} placeholder="3" />
                  </div>
                </div>
                <div className="label-policy">
                  <div className="subhead">
                    <span>{ui.automationRunSection}</span>
                    <small>{ui.automationRunBehaviorHelp}</small>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>{ui.chatwootRunnerMode}</span>
                      <select value={project.chatwootMode} onChange={(event) => setProjectValue("chatwootMode", event.target.value as ProjectConfig["chatwootMode"])}>
                        <option value="adaptive">{ui.chatwootAdaptiveMode}</option>
                        <option value="suite">{ui.chatwootSuiteMode}</option>
                      </select>
                    </label>
                    <div
                      className="field planner-field"
                      onBlur={(event) => {
                        const nextTarget = event.relatedTarget;
                        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                          setPlannerMenuOpen(false);
                        }
                      }}
                    >
                      <span>{ui.chatwootPlannerBackend}</span>
                      <div className="planner-select">
                        <button
                          type="button"
                          className={`planner-select-trigger ${plannerMenuOpen ? "open" : ""}`}
                          aria-label={chatwootPlannerBackendLabel(project.chatwootPlannerBackend)}
                          aria-haspopup="listbox"
                          aria-expanded={plannerMenuOpen}
                          onClick={() => setPlannerMenuOpen((open) => !open)}
                        >
                          <strong>{chatwootPlannerBackendLabel(project.chatwootPlannerBackend)}</strong>
                          <span className="planner-select-icons">
                            <span
                              className="planner-option-help"
                              aria-label={chatwootPlannerBackendHelp(project.chatwootPlannerBackend)}
                              data-tooltip={chatwootPlannerBackendHelp(project.chatwootPlannerBackend)}
                            >
                              <AlertCircle size={14} />
                            </span>
                            <ChevronDown size={18} />
                          </span>
                        </button>
                        {plannerMenuOpen ? (
                          <div className="planner-menu" role="listbox" aria-label={ui.chatwootPlannerBackend}>
                            {(["openai-compatible", "heuristic", "codex-cli"] as ProjectConfig["chatwootPlannerBackend"][]).map((value) => {
                              const selected = project.chatwootPlannerBackend === value;
                              const help = chatwootPlannerBackendHelp(value);
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  className={`planner-menu-option ${selected ? "selected" : ""}`}
                                  aria-label={chatwootPlannerBackendLabel(value)}
                                  role="option"
                                  aria-selected={selected}
                                  onClick={() => {
                                    setChatwootPlannerBackend(value);
                                    setPlannerMenuOpen(false);
                                  }}
                                >
                                  <span>
                                    <strong>{chatwootPlannerBackendLabel(value)}</strong>
                                    <small>{help}</small>
                                  </span>
                                  <span className="planner-option-info" aria-hidden="true">
                                    <AlertCircle size={14} />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <label className="field">
                      <span>{ui.chatwootChatUiMode}</span>
                      <select value={project.chatwootChatUiMode} onChange={(event) => setProjectValue("chatwootChatUiMode", event.target.value as ProjectConfig["chatwootChatUiMode"])}>
                        <option value="realistic">{ui.chatwootChatRealistic}</option>
                        <option value="webhook-only">{ui.chatwootChatWebhookOnly}</option>
                      </select>
                    </label>
                    <Field label={ui.chatwootMaxUserTurns} value={project.chatwootMaxUserTurns} onChange={(value) => setProjectValue("chatwootMaxUserTurns", value)} placeholder="10" />
                  </div>
                  <div className="form-grid">
                    {project.chatwootPlannerBackend === "openai-compatible" ? (
                      <div className="field">
                        <span>{ui.chatwootPlannerModelSource}</span>
                        <div className="planner-model-card">
                          <strong>{aiSettingsPlannerModel || ui.chatwootPlannerModelMissing}</strong>
                          <small>{ui.chatwootPlannerModelAiSettings}</small>
                        </div>
                      </div>
                    ) : project.chatwootPlannerBackend === "codex-cli" ? (
                      <Field
                        label={ui.chatwootPlannerModelSource}
                        value={project.chatwootPlannerModel}
                        onChange={(value) => setProjectValue("chatwootPlannerModel", value)}
                        placeholder={aiSettingsPlannerModel || "gpt-5.4-mini"}
                      />
                    ) : (
                      <div className="field">
                        <span>{ui.chatwootPlannerModelSource}</span>
                        <div className="planner-model-card muted">
                          <strong>{ui.chatwootPlannerModelNotUsed}</strong>
                          <small>{ui.chatwootPlannerModelNotUsedHelp}</small>
                        </div>
                      </div>
                    )}
                    {project.chatwootPlannerBackend === "heuristic" ? (
                      <div className="field">
                        <span>{ui.chatwootPlannerTimeoutSeconds}</span>
                        <div className="planner-model-card muted">
                          <strong>{ui.chatwootPlannerModelNotUsed}</strong>
                          <small>{ui.chatwootPlannerTimeoutNotUsedHelp}</small>
                        </div>
                      </div>
                    ) : (
                      <Field
                        label={ui.chatwootPlannerTimeoutSeconds}
                        value={project.chatwootPlannerTimeoutSeconds}
                        onChange={(value) => setProjectValue("chatwootPlannerTimeoutSeconds", value)}
                        placeholder="60"
                      />
                    )}
                  </div>
                </div>
                <div className="label-policy">
                  <div className="subhead">
                    <span>{ui.automationAdvancedSection}</span>
                    <small>{ui.automationAdvancedHelp}</small>
                  </div>
                  <Field label={ui.chatwootWebhookUrl} value={project.chatwootWebhookUrl} onChange={(value) => setProjectValue("chatwootWebhookUrl", value)} placeholder={chatwootInfo?.defaultWebhookUrl || "http://host.docker.internal:3000/webhook/chatwoot"} />
                  <Field label={ui.chatwootHealthcheckUrl} value={project.chatwootHealthcheckUrl} onChange={(value) => setProjectValue("chatwootHealthcheckUrl", value)} placeholder={chatwootInfo?.defaultHealthcheckUrl || "http://host.docker.internal:3000/health"} />
                  <div className="form-grid">
                    <Field label={ui.chatwootLabels} value={project.chatwootLabels} onChange={(value) => setProjectValue("chatwootLabels", value)} placeholder="ai,booking" />
                    <Field label={ui.chatwootAssigneeName} value={project.chatwootAssigneeName} onChange={(value) => setProjectValue("chatwootAssigneeName", value)} placeholder="Bot" />
                    <Field label={ui.chatwootPinnedConversationId} value={project.chatwootPinnedConversationId} onChange={(value) => setProjectValue("chatwootPinnedConversationId", value)} placeholder="29131" />
                  </div>
                  <label className="toggle-row compact-toggle">
                    <input
                      type="checkbox"
                      checked={project.chatwootSkipLocalWebhookPost}
                      onChange={(event) => setProjectValue("chatwootSkipLocalWebhookPost", event.target.checked)}
                    />
                    <span>
                      <strong>{ui.chatwootSkipLocalWebhookPost}</strong>
                    </span>
                  </label>
                  <label className="toggle-row compact-toggle">
                    <input
                      type="checkbox"
                      checked={project.chatwootSkipHealthcheck}
                      onChange={(event) => setProjectValue("chatwootSkipHealthcheck", event.target.checked)}
                    />
                    <span>
                      <strong>{ui.chatwootSkipHealthcheck}</strong>
                    </span>
                  </label>
                </div>
                <div className="button-row">
                  <IconButton
                    icon={settingsBusy === "automation" ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                    onClick={() => saveUserSettings("automation")}
                    disabled={Boolean(settingsBusy) || !settingsDirty.automation}
                    variant="primary"
                  >
                    {ui.save}
                  </IconButton>
                </div>
                  </>
                )}
                {settingsStatus.automation ? <div className="mini-note">{settingsStatus.automation}</div> : null}
              </section>
              ) : null}

              {activeSettingsSection === "auth" ? (
              <section className="panel settings-panel">
                <div className="panel-title">
                  <ShieldCheck size={18} />
                  <h2>{ui.authentication}</h2>
                </div>
                <p className="panel-help">{ui.authenticationPanelHelp}</p>
                <div className="auth-settings-stack">
                  <div className="label-policy auth-block">
                    <div className="subhead">
                      <span>{ui.coreAuth}</span>
                    </div>
                    <article className="auth-config-card">
                      <div className="auth-config-head">
                        <div>
                          <h3>{ui.jiraAuth}</h3>
                          <small>{ui.jiraSecretNote}</small>
                        </div>
                        <label className="auth-use-toggle">
                          <input
                            type="checkbox"
                            checked={credentials.enabled}
                            onChange={(event) => setJiraAuthEnabled(event.target.checked)}
                          />
                          <span>{ui.authEnabled}</span>
                        </label>
                      </div>
                      <div className="form-grid">
                        <Field label={ui.user} value={credentials.user} onChange={(value) => setCredentialValue("user", value)} placeholder="name@example.com" error={validationErrors["credentials.user"]} />
                        <Field label={ui.password} value={credentials.password} type="password" onChange={(value) => setCredentialValue("password", value)} savedIndicator={secretStatus.jira.hasPassword} error={validationErrors["credentials.password"]} />
                        <Field label="Token" value={credentials.token} type="password" onChange={(value) => setCredentialValue("token", value)} savedIndicator={secretStatus.jira.hasToken} error={validationErrors["credentials.token"]} />
                      </div>
                      <div className="button-row compact-actions">
                        <IconButton icon={connectionBusy === "jira" ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />} onClick={() => testConnection("jira")} disabled={Boolean(connectionBusy)}>
                          {ui.testConnection}
                        </IconButton>
                      </div>
                      {connectionStatus.jira ? <div className={connectionStatus.jira.startsWith("Jira OK") ? "mini-note ok-text" : "mini-note"}>{connectionStatus.jira}</div> : null}
                    </article>
                    <article className="auth-config-card">
                      <div className="auth-config-head">
                        <div>
                          <h3>{ui.confluenceAuth}</h3>
                          <small>{ui.confluenceAuthNote}</small>
                        </div>
                        <label className="auth-use-toggle">
                          <input
                            type="checkbox"
                            checked={confluenceCredentials.enabled}
                            onChange={(event) => setConfluenceAuthEnabled(event.target.checked)}
                          />
                          <span>{ui.authEnabled}</span>
                        </label>
                      </div>
                      <div className="form-grid">
                        <Field label={ui.user} value={confluenceCredentials.user} onChange={(value) => setConfluenceCredentialValue("user", value)} placeholder="name@example.com" required={Boolean(confluenceLinks.trim())} error={validationErrors["confluence.user"]} />
                        <Field label={ui.password} value={confluenceCredentials.password} type="password" onChange={(value) => setConfluenceCredentialValue("password", value)} required={Boolean(confluenceLinks.trim())} savedIndicator={secretStatus.confluence.hasPassword} error={validationErrors["confluence.password"]} />
                        <Field label="Token" value={confluenceCredentials.token} type="password" onChange={(value) => setConfluenceCredentialValue("token", value)} required={Boolean(confluenceLinks.trim())} savedIndicator={secretStatus.confluence.hasToken} error={validationErrors["confluence.token"]} />
                      </div>
                      <div className="button-row compact-actions">
                        <IconButton icon={connectionBusy === "confluence" ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />} onClick={() => testConnection("confluence")} disabled={Boolean(connectionBusy)}>
                          {ui.testConnection}
                        </IconButton>
                      </div>
                      {connectionStatus.confluence ? <div className={connectionStatus.confluence.startsWith("Confluence OK") ? "mini-note ok-text" : "mini-note"}>{connectionStatus.confluence}</div> : null}
                    </article>
                  </div>
                  <div className="label-policy auth-block">
                    <div className="subhead auth-subhead">
                      <span>{ui.customAuth}</span>
                      <button className="button secondary" type="button" onClick={addAuthEntry}>
                        <Plus size={16} />
                        <span>{ui.addAuth}</span>
                      </button>
                    </div>
                    <p className="panel-help">{ui.customAuthHelp}</p>
                    {authEntries.length ? (
                      <div className="auth-entry-list">
                        {authEntries.map((entry, index) => (
                          <article className="auth-config-card" key={entry.id}>
                            <div className="auth-config-head">
                              <div>
                                <h3>{entry.name || `${ui.customAuth} ${index + 1}`}</h3>
                                <small>{entry.baseUrl || ui.authBaseUrlPlaceholder}</small>
                              </div>
                              <div className="auth-card-actions">
                                <label className="auth-use-toggle">
                                  <input
                                    type="checkbox"
                                    checked={entry.enabled}
                                    onChange={(event) => setAuthEntryValue(entry.id, "enabled", event.target.checked)}
                                  />
                                  <span>{ui.authEnabled}</span>
                                </label>
                                <button className="icon-only danger" type="button" onClick={() => removeAuthEntry(entry.id)} aria-label={ui.deleteAuth} title={ui.deleteAuth}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="form-grid">
                              <Field label={ui.authName} value={entry.name} onChange={(value) => setAuthEntryValue(entry.id, "name", value)} placeholder={ui.authNamePlaceholder} />
                              <Field label={ui.authBaseUrl} value={entry.baseUrl} onChange={(value) => setAuthEntryValue(entry.id, "baseUrl", value)} placeholder={ui.authBaseUrlPlaceholder} />
                              <label className="field">
                                <span>{ui.authType}</span>
                                <select value={entry.authType} onChange={(event) => setAuthEntryValue(entry.id, "authType", event.target.value as AuthEntry["authType"])}>
                                  <option value="bearer">{ui.authTypeBearer}</option>
                                  <option value="basic">{ui.authTypeBasic}</option>
                                  <option value="apiKey">{ui.authTypeApiKey}</option>
                                </select>
                              </label>
                              {entry.authType === "basic" ? (
                                <>
                                  <Field label={ui.user} value={entry.user} onChange={(value) => setAuthEntryValue(entry.id, "user", value)} placeholder="name@example.com" />
                                  <Field label={ui.password} value={entry.password} type="password" onChange={(value) => setAuthEntryValue(entry.id, "password", value)} savedIndicator={entry.saved?.hasPassword} />
                                </>
                              ) : (
                                <Field label={entry.authType === "apiKey" ? ui.apiKey : "Token"} value={entry.token} type="password" onChange={(value) => setAuthEntryValue(entry.id, "token", value)} savedIndicator={entry.saved?.hasToken} />
                              )}
                            </div>
                            <Field label={ui.authNotes} value={entry.notes} onChange={(value) => setAuthEntryValue(entry.id, "notes", value)} placeholder={ui.authNotesPlaceholder} textarea rows={3} />
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="mini-note">{ui.noCustomAuth}</div>
                    )}
                  </div>
                </div>
                <div className="button-row auth-save-row">
                  <IconButton
                    icon={settingsBusy === "auth" ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                    onClick={() => saveUserSettings("auth")}
                    disabled={Boolean(settingsBusy) || !settingsDirty.auth}
                    variant="primary"
                  >
                    {ui.save}
                  </IconButton>
                </div>
                {secretStatus.confluence.hasPassword || secretStatus.confluence.hasToken ? (
                  <div className="mini-note">{ui.confluenceSecretNote}</div>
                ) : null}
                {settingsStatus.auth ? <div className="mini-note">{settingsStatus.auth}</div> : null}
                {defaults ? (
                  <div className="status-stack">
                    <StatusBadge ok={defaults.wrappers.jiraExists} text="Jira wrapper" />
                    <StatusBadge ok={defaults.wrappers.xmindExists} text="XMind wrapper" />
                  </div>
                ) : null}
              </section>
              ) : null}

              {activeSettingsSection === "ai" ? (
              <section className="panel settings-panel">
                <div className="panel-title">
                  <Wand2 size={18} />
                  <h2>{ui.aiSettings}</h2>
                  {aiSettingsImprovePending ? (
                    <span className="field-ai-badge panel-badge">
                      <Wand2 size={12} />
                      {ui.aiImprovedBadge}
                    </span>
                  ) : null}
                </div>
                <p className="panel-help">
                  {ui.aiPanelHelp}
                </p>
                {aiSettingsImprovePending ? (
                  <div className="notice ok ai-pending-note">
                    <Wand2 size={16} />
                    <span>{ui.aiSettingsPendingImprove} {ui.aiSettingsUnsavedGuard}</span>
                  </div>
                ) : null}
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={aiSettings.enabled}
                    onChange={(event) => setAiSettingValue("enabled", event.target.checked)}
                  />
                  <span className="checkbox-copy">
                    <strong>{ui.applyAiTitle}</strong>
                    <small>{ui.applyAiDescription}</small>
                  </span>
                </label>
                <div className="form-grid">
                  <label className="field">
                    <span>{ui.provider}</span>
                    <select value={aiSettings.provider} onChange={(event) => setAiSettingValue("provider", event.target.value)}>
                      <option value="openai">OpenAI</option>
                      <option value="openai-compatible">OpenAI compatible</option>
                      <option value="azure-openai">Azure OpenAI</option>
                      <option value="custom">Custom endpoint</option>
                    </select>
                  </label>
                  <Field
                    label={ui.baseUrl}
                    value={aiSettings.baseUrl}
                    onChange={(value) => setAiSettingValue("baseUrl", value)}
                    placeholder="https://api.openai.com/v1"
                    required={aiSettings.enabled}
                    error={validationErrors["ai.baseUrl"]}
                  />
                  <Field
                    label={ui.model}
                    value={aiSettings.model}
                    onChange={(value) => setAiSettingValue("model", value)}
                    placeholder={ui.modelPlaceholder}
                    required={aiSettings.enabled}
                    error={validationErrors["ai.model"]}
                  />
                  <Field
                    label={ui.apiKey}
                    value={aiSettings.apiKey}
                    type="password"
                    onChange={(value) => setAiSettingValue("apiKey", value)}
                    placeholder={secretStatus.ai.hasApiKey ? "" : ui.apiKeyPlaceholder}
                    savedIndicator={secretStatus.ai.hasApiKey}
                    required={aiSettings.enabled}
                    error={validationErrors["ai.apiKey"]}
                  />
                </div>
                <div className="button-row compact-actions">
                  <IconButton icon={connectionBusy === "ai" ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />} onClick={() => testConnection("ai")} disabled={Boolean(connectionBusy) || !aiSettings.enabled}>
                    {ui.testConnection}
                  </IconButton>
                </div>
                {connectionStatus.ai ? <div className={connectionStatus.ai.startsWith("AI OK") ? "mini-note ok-text" : "mini-note"}>{connectionStatus.ai}</div> : null}
                <div className="ai-guideline-editor">
                  <Field
                    label={ui.aiPromptGuidelines}
                    value={aiSettings.promptGuidelines}
                    onChange={(value) => setAiSettingValue("promptGuidelines", value)}
                    textarea
                    rows={14}
                    placeholder={ui.aiPromptGuidelinesPlaceholder}
                    badge={
                      aiSettingsImprovedFields.includes("promptGuidelines") ? (
                        <>
                          <Wand2 size={11} />
                          {ui.aiImprovedBadge}
                        </>
                      ) : null
                    }
                  />
                </div>
                <div className="ai-stop-condition-editor">
                  <Field
                    label={ui.aiStopConditionGuidelines}
                    value={aiSettings.stopConditionGuidelines}
                    onChange={(value) => setAiSettingValue("stopConditionGuidelines", value)}
                    textarea
                    rows={6}
                    placeholder={ui.aiStopConditionGuidelinesPlaceholder}
                  />
                </div>
                <div className="button-row ai-save-row">
                  <IconButton
                    icon={settingsBusy === "ai" ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                    onClick={() => saveUserSettings("ai")}
                    disabled={Boolean(settingsBusy) || settingsPromptImproveBusy || settingsPromptApplyBusy || !settingsDirty.ai}
                    variant="primary"
                  >
                    {ui.save}
                  </IconButton>
                </div>
                {settingsStatus.ai ? <div className="mini-note">{settingsStatus.ai}</div> : null}
                <div className="settings-improve-panel">
                  <div className="section-heading">
                    <div>
                      <h3>{ui.aiSettingsImproveTitle}</h3>
                      <p>{ui.aiSettingsImproveHelp}</p>
                    </div>
                  </div>
                  <Field
                    label={ui.aiSettingsImproveInput}
                    value={settingsImproveInstruction}
                    onChange={(value) => {
                      setSettingsImproveInstruction(value);
                      setSettingsPromptProposal(null);
                      if (settingsPromptImproveStatus) setSettingsPromptImproveStatus("");
                    }}
                    textarea
                    rows={3}
                    placeholder={ui.aiSettingsImprovePlaceholder}
                  />
                  <div className="button-row improve-actions">
                    <IconButton
                      icon={settingsPromptImproveBusy ? <Loader2 className="spin" size={16} /> : <Wand2 size={16} />}
                      onClick={improveAiSettingsPromptOnly}
                      disabled={settingsPromptImproveBusy || settingsPromptApplyBusy || Boolean(settingsBusy) || !aiSettings.enabled}
                      variant="success"
                    >
                      {ui.improvePromptButton}
                    </IconButton>
                  </div>
                  {settingsPromptImproveStatus ? (
                    <div className={promptImproveNoticeClass(settingsPromptImproveStatus, ui)}>{settingsPromptImproveStatus}</div>
                  ) : null}
                  {settingsPromptProposal ? (
                    <PromptImprovePreview
                      ui={ui}
                      proposal={settingsPromptProposal}
                      applyLabel={ui.applyPromptImprove}
                      busy={settingsPromptApplyBusy}
                      onCompare={() =>
                        setPromptCompare({
                          label: ui.aiPromptGuidelines,
                          summary: settingsPromptProposal.summary || ui.promptImprovePreviewTitle,
                          before: settingsPromptProposal.beforePrompt,
                          after: settingsPromptProposal.nextAiSettings.promptGuidelines,
                        })
                      }
                      onApply={applySettingsPromptProposal}
                      onDiscard={() => {
                        setSettingsPromptProposal(null);
                        setPromptCompare(null);
                        setSettingsPromptImproveStatus("");
                      }}
                    />
                  ) : null}
                  {!aiSettings.enabled ? <div className="mini-note">{ui.improveRequiresAi}</div> : null}
                </div>
                {secretStatus.ai.hasApiKey ? (
                  <div className="mini-note">{ui.aiSecretNote}</div>
                ) : null}
                <div className="mini-note">
                  {ui.aiFootnote}
                </div>
                <div className="settings-history">
                  <div className="subhead">
                    <span>{ui.aiSettingsHistory}</span>
                  </div>
                  {aiSettingsHistory.length ? (
                    <div className="history-list">
                      {aiSettingsHistory.slice(0, 12).map((entry) => {
                        const isExpanded = expandedHistoryIds.includes(entry.id);
                        return (
                          <article className={`history-card ${isExpanded ? "expanded" : ""}`} key={entry.id}>
                            <div className="history-card-summary">
                              <span>
                                <strong>{entry.summary || aiHistorySourceLabel(entry.source, ui)}</strong>
                                <small>
                                  {formatHistoryDate(entry.createdAt, languageMode)} · {entry.section === "knowledgeAi" ? ui.knowledgeAiSettings : ui.aiSettings} · {entry.changes.length} {ui.historyChangedItems}
                                </small>
                              </span>
                              <div className="history-card-actions">
                                <em>{aiHistorySourceLabel(entry.source, ui)}</em>
                                <button
                                  className="tiny"
                                  type="button"
                                  onClick={() => restoreAiSettingsHistoryEntry(entry)}
                                  disabled={!entry.changes.some((change) => !change.secret)}
                                  title={ui.restorePreviousTitle}
                                >
                                  <RefreshCw size={14} />
                                  {ui.restorePrevious}
                                </button>
                                <button
                                  className="tiny"
                                  type="button"
                                  onClick={() =>
                                    setExpandedHistoryIds((current) =>
                                      current.includes(entry.id) ? current.filter((item) => item !== entry.id) : [...current, entry.id],
                                    )
                                  }
                                  aria-expanded={isExpanded}
                                  title={isExpanded ? ui.caseCollapse : ui.caseDetails}
                                >
                                  {isExpanded ? <ChevronDown size={14} /> : <FileText size={14} />}
                                  {isExpanded ? ui.caseCollapse : ui.caseDetails}
                                </button>
                              </div>
                            </div>
                            {isExpanded ? (
                              <div className="history-change-list">
                                {entry.changes.map((change) => (
                                  <div className="history-change" key={`${entry.id}-${change.field}`}>
                                    <div className="history-change-title">
                                      <strong>{change.label}</strong>
                                      <button
                                        className="history-change-expand"
                                        type="button"
                                        onClick={() => setHistoryCompare({ entry, change })}
                                        aria-label={`${ui.historyExpandChange}: ${change.label}`}
                                        title={`${ui.historyExpandChange}: ${change.label}`}
                                      >
                                        <Maximize2 size={12} />
                                      </button>
                                    </div>
                                    <div className="history-diff-grid">
                                      <div>
                                        <span>{ui.historyBefore}</span>
                                        <pre>{change.before || "(empty)"}</pre>
                                      </div>
                                      <div>
                                        <span>{ui.historyAfter}</span>
                                        <DiffText before={change.before} after={change.after} />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mini-note">{ui.noAiSettingsHistory}</div>
                  )}
                </div>
              </section>
              ) : null}

              {activeSettingsSection === "knowledgeAi" ? (
              <section className="panel settings-panel">
                <div className="panel-title">
                  <BookOpen size={18} />
                  <h2>{ui.knowledgeAiSettings}</h2>
                </div>
                <p className="panel-help">{ui.knowledgeAiPanelHelp}</p>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={knowledgeAiSettings.enabled}
                    onChange={(event) => setKnowledgeAiSettingValue("enabled", event.target.checked)}
                  />
                  <span className="checkbox-copy">
                    <strong>{ui.applyKnowledgeAiTitle}</strong>
                    <small>{ui.applyKnowledgeAiDescription}</small>
                  </span>
                </label>
                <div className="form-grid">
                  <label className="field">
                    <span>{ui.provider}</span>
                    <select value={knowledgeAiSettings.provider} onChange={(event) => setKnowledgeAiSettingValue("provider", event.target.value)}>
                      <option value="openai">OpenAI</option>
                      <option value="openai-compatible">OpenAI compatible</option>
                      <option value="azure-openai">Azure OpenAI</option>
                      <option value="custom">Custom endpoint</option>
                    </select>
                  </label>
                  <Field
                    label={ui.baseUrl}
                    value={knowledgeAiSettings.baseUrl}
                    onChange={(value) => setKnowledgeAiSettingValue("baseUrl", value)}
                    placeholder="https://api.openai.com/v1"
                    required={knowledgeAiSettings.enabled}
                    error={validationErrors["knowledgeAi.baseUrl"]}
                  />
                  <Field
                    label={ui.model}
                    value={knowledgeAiSettings.model}
                    onChange={(value) => setKnowledgeAiSettingValue("model", value)}
                    placeholder={ui.modelPlaceholder}
                    required={knowledgeAiSettings.enabled}
                    error={validationErrors["knowledgeAi.model"]}
                  />
                  <Field
                    label={ui.apiKey}
                    value={knowledgeAiSettings.apiKey}
                    type="password"
                    onChange={(value) => setKnowledgeAiSettingValue("apiKey", value)}
                    placeholder={secretStatus.ai.hasKnowledgeApiKey ? "" : ui.apiKeyPlaceholder}
                    required={knowledgeAiSettings.enabled}
                    savedIndicator={secretStatus.ai.hasKnowledgeApiKey}
                    error={validationErrors["knowledgeAi.apiKey"]}
                  />
                </div>
                <div className="button-row compact-actions">
                  <IconButton icon={connectionBusy === "knowledgeAi" ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />} onClick={() => testConnection("knowledgeAi")} disabled={Boolean(connectionBusy) || !knowledgeAiSettings.enabled}>
                    {ui.testConnection}
                  </IconButton>
                </div>
                {connectionStatus.knowledgeAi ? <div className={connectionStatus.knowledgeAi.startsWith("AI OK") ? "mini-note ok-text" : "mini-note"}>{connectionStatus.knowledgeAi}</div> : null}
                <div className="form-grid two">
                  <Field
                    label={ui.writingStyle}
                    value={knowledgeAiSettings.writingStyle}
                    onChange={(value) => setKnowledgeAiSettingValue("writingStyle", value)}
                    textarea
                    rows={4}
                    placeholder={ui.writingStylePlaceholder}
                  />
                  <Field
                    label={ui.knowledgeArticleGuidelines}
                    value={knowledgeAiSettings.articleGuidelines}
                    onChange={(value) => setKnowledgeAiSettingValue("articleGuidelines", value)}
                    textarea
                    rows={5}
                    placeholder={ui.knowledgeArticleGuidelinesPlaceholder}
                  />
                </div>
                <div className="button-row">
                  <IconButton
                    icon={settingsBusy === "knowledgeAi" ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                    onClick={() => saveUserSettings("knowledgeAi")}
                    disabled={Boolean(settingsBusy) || !settingsDirty.knowledgeAi}
                    variant="primary"
                  >
                    {ui.save}
                  </IconButton>
                </div>
                {settingsStatus.knowledgeAi ? <div className="mini-note">{settingsStatus.knowledgeAi}</div> : null}
              </section>
              ) : null}
              </div>
            </section>
          </>
        ) : (
          <>
        <header className="topbar">
          <div>
            <p className="eyebrow">{ui.runEyebrow}</p>
            <h2>{issue.key || ui.runTitleEmpty}</h2>
          </div>
        </header>

        <GenerationBanner status={generationStatus} />

        {draftHistory.length ? (
          <section className="draft-history-strip">
            <span>Draft history</span>
            <div>
              {draftHistory
                .filter((entry) => !issue.key || entry.issueKey === issue.key)
                .slice(0, 4)
                .map((entry) => (
                  <button type="button" onClick={() => restoreDraftHistory(entry)} key={entry.id} title={entry.source}>
                    <RefreshCw size={13} />
                    {entry.source} · {new Date(entry.createdAt).toLocaleTimeString(languageMode === "en" ? "en-US" : "vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
            </div>
          </section>
        ) : null}

        {testCases.length ? (
          <section className="panel result-overview">
            <div className="result-overview-copy">
              <p className="eyebrow">{ui.draftResultTitle}</p>
              <h2>{issue.key || issueKeyFromText(jiraUrl) || ui.runTitleEmpty}</h2>
              <p>{issue.summary || ui.draftResultHelp}</p>
            </div>
            <div className="result-overview-metrics">
              <span>
                <strong>{testCases.length}</strong>
                {ui.testCasesMetric}
              </span>
              <span>
                <strong>{outline.branches.length}</strong>
                {ui.branchesMetric}
              </span>
              <span>
                <strong>{qualityItems.filter((item) => !item.ok).length}</strong>
                {ui.qualityTitle}
              </span>
            </div>
            <div className="button-row result-overview-actions">
              <IconButton icon={<FileText size={16} />} onClick={() => setSourceConfigOpen(true)}>
                {ui.editSourceConfig}
              </IconButton>
              <IconButton icon={busy === "draft" ? <Loader2 className="spin" size={16} /> : <Wand2 size={16} />} onClick={generateDraft} disabled={isWorking} variant="success">
                {ui.regenerateDraft}
              </IconButton>
              <IconButton icon={busy === "workspace" ? <Loader2 className="spin" size={16} /> : <Save size={16} />} onClick={saveCurrentToWorkspace} disabled={isWorking || testCases.length === 0}>
                {ui.saveToWorkspace}
              </IconButton>
              {testCases.length ? (
                <IconButton icon={busy === "stopPatterns" ? <Loader2 className="spin" size={16} /> : <Wand2 size={16} />} onClick={refreshCurrentStopPatterns} disabled={isWorking || testCases.length === 0}>
                  {currentStopPatternStats.needs ? ui.workspaceRefreshStopPatterns : ui.workspaceRefreshStopPatternsAgain}
                </IconButton>
              ) : null}
            </div>
          </section>
        ) : null}

        <details
          className={testCases.length ? "source-config-drawer" : "source-config-drawer setup-mode"}
          open={!testCases.length || sourceConfigOpen}
          onToggle={(event) => {
            if (testCases.length) setSourceConfigOpen(event.currentTarget.open);
          }}
        >
          <summary className="source-config-summary">
            <span>
              <Settings size={16} />
              <strong>{ui.sourceConfigTitle}</strong>
              <small>{ui.sourceConfigHelp}</small>
            </span>
            <ChevronDown size={16} />
          </summary>
        <section className="issue-grid">
          <div className="issue-main-column">
            <div className="panel">
              <div className="panel-title">
                <FileText size={18} />
                <h2>{ui.taskContext}</h2>
              </div>
              <div className="form-grid">
                <Field label={ui.issueKey} value={issue.key} onChange={(value) => setIssueValue("key", value.toUpperCase())} placeholder="AI-707" required error={validationErrors["issue.key"]} />
                <Field label={ui.status} value={issue.status} onChange={(value) => setIssueValue("status", value)} placeholder="Ready To Test" />
                <Field label={ui.issueType} value={issue.issue_type} onChange={(value) => setIssueValue("issue_type", value)} placeholder="Task / Bug / Story" />
                <Field label={ui.jiraProjectKey} value={issue.project_key || ""} onChange={(value) => setIssueValue("project_key", value)} placeholder="AI" />
              </div>
              <Field label={ui.summary} value={issue.summary} onChange={(value) => setIssueValue("summary", value)} placeholder="[Payment] Route callback..." error={validationErrors["issue.summary"]} />
              <Field label={ui.descriptionAcceptance} value={issue.description} onChange={(value) => setIssueValue("description", value)} textarea rows={8} error={validationErrors["issue.description"]} />
              <Field
                label={ui.confluenceDocLinks}
                value={confluenceLinks}
                onChange={(value) => {
                  clearValidationErrors(["confluenceLinks"]);
                  setConfluenceLinks(value);
                  const inferredBaseUrl = confluenceBaseUrl.trim() ? "" : inferConfluenceBaseUrl(value);
                  if (inferredBaseUrl) {
                    setConfluenceBaseUrl(inferredBaseUrl);
                    clearValidationErrors(["confluenceBaseUrl"]);
                  }
                  clearFetchedDocs(value.trim() ? "Doc link thủ công đã được ghi nhận. Nhấn Fetch để đọc Jira task và fetch doc vào Task context." : "");
                }}
                textarea
                rows={3}
                placeholder={ui.confluenceDocLinksPlaceholder}
                error={validationErrors.confluenceLinks}
              />
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
                label={ui.fetchedDocContext}
                value={docContext}
                onChange={(value) => {
                  setDocContext(value);
                  setDocIssueKey(value.trim() ? issueKeyFromText(jiraUrl) || issue.key : "");
                  setDocStatus(value.trim() ? `Doc context thủ công đang gắn với ${issueKeyFromText(jiraUrl) || issue.key}. Generate draft sẽ dùng nội dung này nếu Base URL vẫn có giá trị.` : "");
                  setDocSources([]);
                }}
                textarea
                rows={5}
                placeholder={ui.fetchedDocContextPlaceholder}
              />
              <Field label={ui.qaNotes} value={notes} onChange={setNotes} textarea rows={4} placeholder={ui.qaNotesPlaceholder} />
            </div>

            {testCases.length ? (
              <section className="panel quality-panel">
                <div className="section-heading">
                  <div>
                    <h2>{ui.qualityTitle}</h2>
                    <p>{qualityItems.every((item) => item.ok) ? ui.qualityGood : "Review các cảnh báo trước khi tạo file hoặc đẩy lên Jira/Zephyr."}</p>
                  </div>
                </div>
                <div className="quality-grid">
                  {qualityItems.map((item) => (
                    <div className={`quality-item ${item.severity}`} key={item.id}>
                      {item.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </span>
                    </div>
                  ))}
                </div>
                {coverageRows.length ? (
                  <div className="coverage-matrix">
                    <div className="subhead">
                      <span>{ui.coverageTitle}</span>
                      <small>{coverageRows.filter((row) => row.matchedIndexes.length).length}/{coverageRows.length} source/risk có case match.</small>
                    </div>
                    <div className="coverage-row-list">
                      {coverageRows.map((row) => (
                        <div className={row.matchedIndexes.length ? "coverage-row covered" : "coverage-row missing"} key={row.id}>
                          <div>
                            <strong>{row.title}</strong>
                            <small>{row.source}</small>
                          </div>
                          <span>{row.matchedIndexes.length ? row.matchedIndexes.map((index) => `#${index + 1}`).join(", ") : "Chưa match"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="issue-side-column">
            <div className="panel jira-task-panel">
            <div className="panel-title jira-panel-title">
              <span className="jira-panel-heading">
                <Link size={18} />
                <h2>{ui.jiraTask}</h2>
              </span>
              <details className="readiness-compact">
                <summary>
                  {readinessItems.every((item) => item.ok) ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span>{ui.readinessTitle}</span>
                  <small>{readinessItems.filter((item) => item.ok).length}/{readinessItems.length}</small>
                </summary>
                <div className="readiness-compact-list">
                  {readinessItems.map((item) => (
                    <div className={item.ok ? "readiness-item ok" : "readiness-item warn"} key={item.id}>
                      {item.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
            <Field
              label={ui.jiraUrlIssueKey}
              value={jiraUrl}
              onChange={handleJiraUrlChange}
              placeholder="https://jira.vexere.net/browse/AI-707"
              required
              error={validationErrors.jiraUrl}
            />
            <Field
              label={ui.confluenceBaseUrlTask}
              value={confluenceBaseUrl}
              onChange={(value) => {
                clearValidationErrors(["confluenceBaseUrl", "confluenceLinks"]);
                setConfluenceBaseUrl(value);
                clearFetchedDocs(
                  value.trim() && (confluenceLinks.trim() || looksLikeConfluencePageUrl(value))
                    ? "Confluence config đã đổi. Nhấn Fetch để đọc lại Jira task và doc cho task hiện tại."
                    : "",
                );
              }}
              placeholder={ui.confluenceBaseUrlPlaceholder}
              required={Boolean(confluenceLinks.trim() || looksLikeConfluencePageUrl(confluenceBaseUrl))}
              error={validationErrors.confluenceBaseUrl}
            />
            <div className="mini-note">{ui.confluenceBaseUrlNote}</div>
            <div className="button-row jira-fetch-actions">
              <IconButton icon={<RefreshCw size={16} />} onClick={parseJiraLink} disabled={isWorking} title={ui.parseTitle}>
                {ui.parseButton}
              </IconButton>
              <IconButton icon={busy === "issue" ? <Loader2 className="spin" size={16} /> : <FileText size={16} />} onClick={fetchIssue} disabled={isWorking}>
                {ui.fetchButton}
              </IconButton>
            </div>
            <div className="jira-draft-actions">
              <select value={archetypeKey} onChange={(event) => setArchetypeKey(event.target.value)}>
                <option value="auto">{ui.autoArchetype}</option>
                {defaults
                  ? Object.entries(defaults.archetypes).map(([key, archetype]) => (
                      <option value={key} key={key}>
                        {archetype.label}
                      </option>
                    ))
                  : null}
              </select>
              <IconButton icon={busy === "draft" ? <Loader2 className="spin" size={16} /> : <Wand2 size={16} />} onClick={generateDraft} disabled={isWorking} variant="success">
                {ui.generateDraft}
              </IconButton>
            </div>
            </div>

          <div className="panel design-lens-panel">
            <div className="panel-title">
              <GitBranch size={18} />
              <h2>{ui.designLens}</h2>
            </div>
            {selectedArchetype ? (
              <div className="lens">
                <h3>{selectedArchetype.label}</h3>
                <p>{ui.primary}: {selectedArchetype.primary.join(", ")}</p>
                <p>{ui.supporting}: {selectedArchetype.supporting.join(", ")}</p>
                <ul>
                  {selectedArchetype.dimensions.map((dimension) => (
                    <li key={dimension}>{dimension}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="lens">
                <h3>{ui.autoClassification}</h3>
                <p>{ui.autoClassificationCopy1}</p>
                <p>{ui.autoClassificationCopy2}</p>
              </div>
            )}
            {qaPlan ? (
              <div className="qa-plan">
                <h3>{ui.adaptiveQaPlan}</h3>
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
                  <p>{qaPlan.repo_evidence.snippets.length} {ui.repoEvidenceUsed}</p>
                ) : null}
                {qaPlan.repo_evidence?.root_status?.length ? (
                  <div className="status-stack">
                    {qaPlan.repo_evidence.root_status.map((item) => (
                      <StatusBadge key={item.root} ok={item.exists} text={item.root} />
                    ))}
                  </div>
                ) : null}
                {qaPlan.open_questions?.length ? <p>{ui.openQuestion}: {qaPlan.open_questions[0]}</p> : null}
              </div>
            ) : null}
            <div className="metric-row">
              <div>
                <strong>{testCases.length}</strong>
                <span>{ui.testCasesMetric}</span>
              </div>
              <div>
                <strong>{outline.branches.length}</strong>
                <span>{ui.branchesMetric}</span>
              </div>
              <div>
                <strong>{caseKeys ? caseKeys.split(",").filter(Boolean).length : 0}</strong>
                <span>{ui.createdKeysMetric}</span>
              </div>
            </div>
          </div>
          </div>
        </section>
        </details>

        {testCases.length ? (
          <details
            className="result-action-drawer"
            open={improvePanelOpen}
            onToggle={(event) => setImprovePanelOpen(event.currentTarget.open)}
          >
            <summary className="source-config-summary">
              <span>
                <Wand2 size={16} />
                <strong>{ui.improveDraftTitle}</strong>
                <small>{ui.improveDraftHelp}</small>
              </span>
              <ChevronDown size={16} />
            </summary>
          <section className="panel improve-panel">
            <div className="section-heading">
              <div>
                <h2>{ui.improveDraftTitle}</h2>
                <p>{ui.improveDraftHelp}</p>
              </div>
            </div>
            <Field
              label={ui.improveDraftInput}
              value={improveInstruction}
              onChange={(value) => {
                setImproveInstruction(value);
                setDraftPromptProposal(null);
                if (promptImproveStatus) setPromptImproveStatus("");
              }}
              textarea
              rows={3}
              placeholder={ui.improveDraftPlaceholder}
            />
            <div className="button-row improve-actions">
              <IconButton
                icon={busy === "promptImprove" ? <Loader2 className="spin" size={16} /> : <Wand2 size={16} />}
                onClick={improveDraftWithAi}
                disabled={isWorking || !savedAiSettings.enabled}
                variant="success"
              >
                {ui.improveDraftButton}
              </IconButton>
            </div>
            {promptImproveStatus ? (
              <div className={promptImproveNoticeClass(promptImproveStatus, ui)}>{promptImproveStatus}</div>
            ) : null}
            {draftPromptProposal ? (
              <PromptImprovePreview
                ui={ui}
                proposal={draftPromptProposal}
                applyLabel={ui.applyPromptImprove}
                busy={busy === "promptImprove"}
                onCompare={() =>
                  setPromptCompare({
                    label: ui.aiPromptGuidelines,
                    summary: draftPromptProposal.summary || draftPromptProposal.instruction || ui.promptImprovePreviewTitle,
                    before: draftPromptProposal.beforePrompt,
                    after: draftPromptProposal.nextAiSettings.promptGuidelines,
                  })
                }
                onApply={applyDraftPromptProposal}
                onDiscard={() => {
                  setDraftPromptProposal(null);
                  setPromptCompare(null);
                  setPromptImproveStatus("");
                }}
              />
            ) : null}
            {!savedAiSettings.enabled ? <div className="mini-note">{ui.improveRequiresAi}</div> : null}
          </section>
          </details>
        ) : null}

        <nav className="tabs">
          <button className={activeTab === "cases" ? "active" : ""} onClick={() => setActiveTab("cases")} type="button">
            <ClipboardList size={16} />
            {ui.testCasesTab}
          </button>
          <button className={activeTab === "design" ? "active" : ""} onClick={() => setActiveTab("design")} type="button">
            <Map size={16} />
            {ui.testDesignTab}
          </button>
          <button className={activeTab === "run" ? "active" : ""} onClick={() => setActiveTab("run")} type="button">
            <Play size={16} />
            {ui.runTab}
          </button>
        </nav>

        {activeTab === "cases" ? (
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>{ui.editableTestCases}</h2>
                <p>{ui.editableTestCasesHelp}</p>
              </div>
              <IconButton icon={<Plus size={16} />} onClick={addCase}>
                {ui.addCase}
              </IconButton>
            </div>
            {testCases.length ? (
              <div className="case-filter-bar" aria-label={ui.caseFilterLabel}>
                <span>{ui.caseFilterLabel}</span>
                {([
                  ["all", ui.allCases],
                  ["happy", ui.happyPath],
                  ["negative", ui.negativePath],
                  ["edge", ui.edgeCase],
                  ["regression", ui.regression],
                  ["auth", ui.authRisk],
                  ["validation", ui.validationRisk],
                  ["doc", ui.docCoverage],
                ] as Array<[CaseFilter, string]>).map(([filter, label]) => (
                  <button className={caseFilter === filter ? "active" : ""} type="button" onClick={() => setCaseFilter(filter)} key={filter}>
                    {label}
                    <small>{caseFilterCounts[filter]}</small>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="case-list">
              {filteredTestCases.map(({ testCase, index }) => {
                const isExpanded = detailCaseIndex === index;
                return (
                  <article className="case-card case-card-compact" key={`${testCase.title}-${index}`}>
                    <div className="case-head">
                      <strong>{testCase.title || `Case ${index + 1}`}</strong>
                      <div className="case-head-actions">
                        <button
                          className="tiny"
                          type="button"
                          onClick={() => setDetailCaseIndex((current) => (current === index ? null : index))}
                          aria-expanded={isExpanded}
                          title={isExpanded ? ui.caseCollapse : ui.caseDetails}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <FileText size={14} />}
                          {isExpanded ? ui.caseCollapse : ui.caseDetails}
                        </button>
                        <button className="icon-only danger" type="button" onClick={() => removeCase(index)} title={ui.deleteTestCase}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {isExpanded ? (
                      <div className="case-inline-details">
                        <div className="form-grid">
                          <Field label={ui.title} value={testCase.title} onChange={(value) => updateCase(index, { title: value })} />
                          <Field label={ui.priority} value={testCase.priority} onChange={(value) => updateCase(index, { priority: value })} />
                          <Field label={ui.technique} value={testCase.technique} onChange={(value) => updateCase(index, { technique: value })} />
                          <Field label={ui.scenarioType} value={testCase.scenario_type} onChange={(value) => updateCase(index, { scenario_type: value })} />
                        </div>
                        <Field label={ui.objective} value={testCase.objective} onChange={(value) => updateCase(index, { objective: value })} />
                        <Field label={ui.risk} value={testCase.risk} onChange={(value) => updateCase(index, { risk: value })} />
                        <div className="form-grid">
                          <Field label={ui.requirementRef} value={testCase.requirement_ref} onChange={(value) => updateCase(index, { requirement_ref: value })} />
                          <Field
                            label={ui.coverageTags}
                            value={testCase.coverage_tags.join(", ")}
                            onChange={(value) => updateCase(index, { coverage_tags: value.split(",").map((item) => item.trim()).filter(Boolean) })}
                          />
                        </div>
                        <Field label={ui.precondition} value={testCase.precondition} onChange={(value) => updateCase(index, { precondition: value })} textarea rows={3} />
                        <div className="form-grid two">
                          <Field label={ui.testData} value={testCase.test_data} onChange={(value) => updateCase(index, { test_data: value })} textarea rows={4} />
                          <Field label={ui.expectedResult} value={testCase.expected_result} onChange={(value) => updateCase(index, { expected_result: value })} textarea rows={4} />
                        </div>
                        <div className="steps">
                          <div className="subhead">
                            <span>{ui.steps}</span>
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
                              {ui.addStep}
                            </button>
                          </div>
                          {testCase.structured_steps.map((caseStep, stepIndex) => (
                            <div className="step-row" key={`${caseStep.description}-${stepIndex}`}>
                              <Field label={`${ui.step} ${stepIndex + 1}`} value={caseStep.description} onChange={(value) => updateStep(index, stepIndex, { description: value })} />
                              <Field label={ui.data} value={caseStep.test_data} onChange={(value) => updateStep(index, stepIndex, { test_data: value })} />
                              <Field label={ui.expected} value={caseStep.expected_result} onChange={(value) => updateStep(index, stepIndex, { expected_result: value })} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
              {testCases.length && !filteredTestCases.length ? <p className="empty">Không có test case match filter này.</p> : null}
            </div>
          </section>
        ) : null}

        {activeTab === "design" ? (
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>{ui.editableXmindOutline}</h2>
                <p>{ui.editableXmindHelp}</p>
              </div>
              <IconButton icon={<Plus size={16} />} onClick={addBranch}>
                {ui.addBranch}
              </IconButton>
            </div>
            <Field label={ui.mindmapTitle} value={outline.title} onChange={(value) => setOutline((current) => ({ ...current, title: value }))} />
            <div className="branch-list">
              {outline.branches.map((branch, index) => (
                <article className="branch-card" key={`${branch.title}-${index}`}>
                  <div className="case-head">
                    <strong>{ui.branch} {index + 1}</strong>
                    <button className="icon-only danger" type="button" onClick={() => removeBranch(index)} title={ui.deleteBranch}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <Field label={ui.branchTitle} value={branch.title} onChange={(value) => updateBranch(index, { title: value })} />
                  <Field
                    label={ui.branchItems}
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
                <h2>{ui.automationRun}</h2>
                <p>{ui.automationRunHelp}</p>
              </div>
            </div>
            <div className="pipeline-panel">
              <div className="subhead">
                <span>{ui.pipelineTitle}</span>
              </div>
              <div className="pipeline-list">
                {runPipelineItems.map((item, index) => (
                  <div className={item.done ? "pipeline-item done" : "pipeline-item"} key={item.id}>
                    <strong>{index + 1}</strong>
                    <span>
                      <b>{item.label}</b>
                      <small>{item.detail}</small>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="run-grid">
              <div className="run-block">
                <h3>{ui.testDesignTab}</h3>
                <p>{ui.testDesignRunHelp}</p>
                <div className="button-row">
                  <IconButton icon={busy === "xmind" ? <Loader2 className="spin" size={16} /> : <Map size={16} />} onClick={() => buildXmind(false)} disabled={isWorking}>
                    {ui.buildLocalFiles}
                  </IconButton>
                  <IconButton icon={busy === "attach" ? <Loader2 className="spin" size={16} /> : <UploadCloud size={16} />} onClick={() => buildXmind(true)} disabled={isWorking} variant="primary">
                    {ui.buildAndAttach}
                  </IconButton>
                </div>
                <div className="button-row compact-actions">
                  <IconButton icon={<Download size={16} />} onClick={() => triggerDownload(builtDesignFiles?.xmind)} disabled={isWorking || !builtDesignFiles?.xmind}>
                    {ui.downloadXmind}
                  </IconButton>
                  <IconButton icon={<Download size={16} />} onClick={() => triggerDownload(builtDesignFiles?.png)} disabled={isWorking || !builtDesignFiles?.png}>
                    {ui.downloadPng}
                  </IconButton>
                </div>
                {builtDesignFiles?.xmind || builtDesignFiles?.png ? (
                  <div className="mini-note">
                    {builtDesignFiles.xmind ? (
                      <>
                        XMind: {builtDesignFiles.xmind.file}
                        <br />
                      </>
                    ) : null}
                    {builtDesignFiles.png ? <>PNG: {builtDesignFiles.png.file}</> : null}
                  </div>
                ) : (
                  <div className="mini-note">{ui.buildBeforeDownload}</div>
                )}
                {builtDesignFiles?.png ? (
                  <div className="design-preview">
                    <span>{ui.designPreview}</span>
                    <img src={builtDesignFiles.png.url} alt={ui.designPreview} />
                  </div>
                ) : null}
              </div>
              <div className="run-block">
                <h3>{ui.testCasesTab}</h3>
                <p>{ui.testCasesRunHelp}</p>
                <div className="button-row">
                  <IconButton icon={busy === "save" ? <Loader2 className="spin" size={16} /> : <Download size={16} />} onClick={saveDraftFiles} disabled={isWorking || testCases.length === 0}>
                    {ui.downloadJson}
                  </IconButton>
                  <IconButton icon={busy === "suite" ? <Loader2 className="spin" size={16} /> : <ClipboardList size={16} />} onClick={createSuite} disabled={isWorking || testCases.length === 0} variant="primary">
                    {ui.createSuite}
                  </IconButton>
                </div>
                {savedFiles ? <div className="mini-note">{ui.testCasesSaved}: {savedFiles.cases.file}</div> : null}
              </div>
              <div className="run-block">
                <h3>{ui.testCycle}</h3>
                <p>{ui.testCycleHelp}</p>
                <Field label={ui.caseKeys} value={caseKeys} onChange={setCaseKeys} placeholder="AI-T2004,AI-T2005" />
                <IconButton icon={busy === "cycle" ? <Loader2 className="spin" size={16} /> : <Play size={16} />} onClick={createCycle} disabled={isWorking || !caseKeys} variant="primary">
                  {ui.createCycle}
                </IconButton>
              </div>
            </div>
            <div className="output">
              <div className="subhead">
                <span>{ui.output}</span>
                {message ? <small>{message}</small> : null}
              </div>
              {message ? <div className={message.startsWith("Đã") ? "notice ok" : "notice"}>{message}</div> : null}
              {output ? <pre>{output}</pre> : <p className="empty">{ui.emptyOutput}</p>}
            </div>
          </section>
        ) : null}
          </>
        )}
      {chatwootConfirmOpen ? (
        <div className="field-expand-backdrop history-compare-backdrop" role="presentation" onMouseDown={() => setChatwootConfirmOpen(false)}>
          <section
            className="field-expand-panel chatwoot-confirm-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chatwoot-confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="field-expand-header">
              <div>
                <h2 id="chatwoot-confirm-title">{ui.chatwootConfirmTitle}</h2>
                <small>{ui.chatwootConfirmCopy}</small>
              </div>
              <button className="field-expand-close" type="button" onClick={() => setChatwootConfirmOpen(false)} aria-label={ui.chatwootCancelRun}>
                <X size={18} />
              </button>
            </div>
            <div className="chatwoot-confirm-summary">
              <div>
                <span>{ui.chatwootSuite}</span>
                <strong>{selectedChatwootSuite?.suiteName || chatwootForm.suiteFile}</strong>
                <small>{selectedChatwootSuite?.goalSummary || selectedChatwootSuite?.relativePath}</small>
              </div>
              <div>
                <span>{ui.chatwootStatus}</span>
                <strong>{chatwootModeLabel(effectiveChatwootRunMode)} · {chatwootChatUiModeLabel(effectiveChatwootChatUiMode)} · {chatwootRunUsesPlanner ? chatwootPlannerBackendLabel(effectiveChatwootPlannerBackend) : ui.chatwootPlannerDisabledForFixed}</strong>
                <small>{chatwootAutomationConfig.chatwootSkipLocalWebhookPost ? ui.chatwootSkipLocalWebhookPost : chatwootAutomationConfig.chatwootWebhookUrl}</small>
              </div>
              <div>
                <span>{ui.chatwootCaseSelection}</span>
                <strong>
                  {chatwootRunAllCases
                    ? `${ui.chatwootWillRunAllCases} ${selectedChatwootSuite?.caseCount || selectedChatwootCases.length || ""}`.trim()
                    : `${chatwootEffectiveSelectedCaseCount}/${selectedChatwootCases.length} ${ui.chatwootSelectedCases}`}
                </strong>
                <small>{chatwootRunAllCases ? ui.chatwootRunAllCases : chatwootSelectedCaseIds.slice(0, 5).join(", ")}</small>
              </div>
              <div>
                <span>{ui.chatwootAgent}</span>
                <strong>{selectedChatwootAgent?.name || "-"}</strong>
                <small>{ui.chatwootInboxId}: {chatwootAutomationConfig.chatwootInboxId || "-"} · {ui.chatwootUiInboxId}: {chatwootAutomationConfig.chatwootUiInboxId || "-"} · {ui.chatwootCaptainAssistantId}: {chatwootAutomationConfig.chatwootCaptainAssistantId || "-"}</small>
              </div>
            </div>
            <div className="button-row end-actions">
              <IconButton icon={<X size={16} />} onClick={() => setChatwootConfirmOpen(false)}>
                {ui.chatwootCancelRun}
              </IconButton>
              <IconButton icon={chatwootBusy === "run" ? <Loader2 className="spin" size={16} /> : <Play size={16} />} onClick={startChatwootUatJob} disabled={Boolean(chatwootBusy) || !selectedChatwootAgent} variant="primary">
                {ui.chatwootStartRun}
              </IconButton>
            </div>
          </section>
        </div>
      ) : null}
      {promptCompare ? (
        <div className="field-expand-backdrop history-compare-backdrop" role="presentation" onMouseDown={() => setPromptCompare(null)}>
          <section
            className="field-expand-panel history-compare-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-compare-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="field-expand-header">
              <div>
                <h2 id="prompt-compare-title">{ui.historyCompareTitle}: {promptCompare.label}</h2>
                <small>{promptCompare.summary}</small>
              </div>
              <button className="field-expand-close" type="button" onClick={() => setPromptCompare(null)} aria-label={ui.caseCollapse}>
                <X size={18} />
              </button>
            </div>
            <div className="history-compare-grid">
              <div className="history-compare-column">
                <span>{ui.historyBefore}</span>
                <pre className="history-compare-editor history-compare-text">{promptCompare.before || "(empty)"}</pre>
              </div>
              <div className="history-compare-column">
                <span>{ui.historyAfter}</span>
                <DiffText before={promptCompare.before} after={promptCompare.after} className="history-compare-editor history-compare-text" />
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {historyCompare ? (
        <div className="field-expand-backdrop history-compare-backdrop" role="presentation" onMouseDown={() => setHistoryCompare(null)}>
          <section
            className="field-expand-panel history-compare-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-compare-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="field-expand-header">
              <div>
                <h2 id="history-compare-title">{ui.historyCompareTitle}: {historyCompare.change.label}</h2>
                <small>
                  {historyCompare.entry.summary || aiHistorySourceLabel(historyCompare.entry.source, ui)} · {formatHistoryDate(historyCompare.entry.createdAt, languageMode)}
                </small>
              </div>
              <button className="field-expand-close" type="button" onClick={() => setHistoryCompare(null)} aria-label={ui.caseCollapse}>
                <X size={18} />
              </button>
            </div>
            <div className="history-compare-grid">
              <div className="history-compare-column">
                <span>{ui.historyBefore}</span>
                <pre className="history-compare-editor history-compare-text">{historyCompare.change.before || "(empty)"}</pre>
              </div>
              <div className="history-compare-column">
                <span>{ui.historyAfter}</span>
                <DiffText before={historyCompare.change.before} after={historyCompare.change.after} className="history-compare-editor history-compare-text" />
              </div>
            </div>
          </section>
        </div>
      ) : null}
      </main>
    </div>
  );
}

export default App;
