import AlertCircle from "lucide-react/dist/esm/icons/alert-circle.js";
import BookOpen from "lucide-react/dist/esm/icons/book-open.js";
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
  AiSettingsHistoryEntry,
  ArchetypeInfo,
  AuthEntry,
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
type BusyKey = "issue" | "docs" | "draft" | "improve" | "promptImprove" | "save" | "xmind" | "attach" | "suite" | "cycle" | "";
type SettingsSection = "project" | "auth" | "ai" | "knowledgeAi";
type KnowledgeSection = "principles" | "process" | "techniques" | "levels" | "reviews" | "defects" | "aiWriter";
type StaticKnowledgeSection = Exclude<KnowledgeSection, "aiWriter">;
type AppView = "run" | "settings" | "knowledge";
type ThemeMode = "dark" | "light";
type LanguageMode = "vi" | "en";

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
type PromptImproveResponse = {
  improvedPrompt: string;
  targetField?: string;
  summary?: string;
  aiProvider?: AiProviderInfo;
};
type ConfluenceDocument = { title: string; url: string; text: string; error?: string };
type DownloadFileMeta = { file: string; path: string; url: string };
type SavedDraftFiles = {
  cases: DownloadFileMeta;
  design: DownloadFileMeta;
};
type BuiltDesignFiles = {
  xmind?: DownloadFileMeta | null;
  png?: DownloadFileMeta | null;
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
    knowledge: "Kiến thức QA",
    workspaceSettings: "Cài đặt workspace",
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
    autoArchetype: "Tự chọn archetype",
    generateDraft: "Tạo draft",
    improveDraftTitle: "Tinh chỉnh draft bằng AI",
    improveDraftHelp: "Nhập feedback cho draft hiện tại. AI sẽ viết lại hoặc bổ sung test case/test design dựa trên Jira/doc/context đang có.",
    improveDraftInput: "Yêu cầu tinh chỉnh",
    improveDraftPlaceholder: "Ví dụ: Bổ sung negative case cho thiếu auth Confluence, title viết rõ risk hơn, bỏ case trùng...",
    improveDraftButton: "Tinh chỉnh draft",
    improvePromptButton: "Improve prompt bằng AI",
    improvePromptRequiresInput: "Cần nhập Yêu cầu tinh chỉnh trước khi Improve prompt.",
    improvePromptDonePrefix: "Đã cải thiện prompt từ yêu cầu tinh chỉnh",
    improvePromptSavedToAiSettings: "Đã thêm vào Ghi nhớ cải tiến. Vào Cài đặt AI để review và bấm Lưu trước khi dùng cho lần sau.",
    improveRequiresDraft: "Cần tạo draft trước khi tinh chỉnh bằng AI.",
    improveRequiresAi: "Cần bật AI Settings và có API key/model để dùng Improve draft.",
    improveDonePrefix: "Đã chỉnh sửa theo yêu cầu tinh chỉnh",
    aiSettingsPendingImprove: "AI vừa cập nhật Ghi nhớ cải tiến. Review nội dung rồi bấm Lưu để áp dụng cho các task sau.",
    aiImprovedBadge: "AI cải thiện",
    aiSettingsUnsavedGuard: "Prompt mới chỉ áp dụng sau khi bấm Lưu trong Cài đặt AI.",
    aiSettingsHistory: "Lịch sử chỉnh sửa",
    noAiSettingsHistory: "Chưa có lịch sử chỉnh sửa Cài đặt AI.",
    historyBefore: "Trước",
    historyAfter: "Sau",
    historyManualSave: "Lưu thủ công",
    historyAiPromptImprove: "AI improve prompt",
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
    knowledge: "Knowledge",
    workspaceSettings: "Workspace Settings",
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
    autoArchetype: "Auto archetype",
    generateDraft: "Generate draft",
    improveDraftTitle: "Improve draft with AI",
    improveDraftHelp: "Enter feedback for the current draft. AI rewrites or adds test cases/test design from the current Jira/docs/context.",
    improveDraftInput: "Improve request",
    improveDraftPlaceholder: "Example: Add negative cases for missing Confluence auth, make titles risk-specific, remove duplicates...",
    improveDraftButton: "Improve draft",
    improvePromptButton: "Improve prompt with AI",
    improvePromptRequiresInput: "Enter an improve request before improving the prompt.",
    improvePromptDonePrefix: "Improved prompt from refine request",
    improvePromptSavedToAiSettings: "Added to Improve skill notes. Open AI Settings to review and Save before using it next time.",
    improveRequiresDraft: "Generate a draft before improving it with AI.",
    improveRequiresAi: "Enable AI Settings with API key/model before using Improve draft.",
    improveDonePrefix: "Improved draft using request",
    aiSettingsPendingImprove: "AI updated Improve skill notes. Review the content and Save to apply it to future tasks.",
    aiImprovedBadge: "AI improved",
    aiSettingsUnsavedGuard: "The new prompt applies only after saving AI Settings.",
    aiSettingsHistory: "Revision history",
    noAiSettingsHistory: "No AI Settings revision history yet.",
    historyBefore: "Before",
    historyAfter: "After",
    historyManualSave: "Manual save",
    historyAiPromptImprove: "AI prompt improve",
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
    writingStyle: aiSettings.writingStyle,
    testCaseGuidelines: aiSettings.testCaseGuidelines,
    testDesignGuidelines: aiSettings.testDesignGuidelines,
    improvementNotes: aiSettings.improvementNotes,
  });
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
  const [activeKnowledgeSection, setActiveKnowledgeSection] = useState<KnowledgeSection>("principles");
  const [expandedKnowledgeCards, setExpandedKnowledgeCards] = useState<string[]>([]);
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
    ai: "",
    knowledgeAi: "",
  });
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
  const [detailCaseIndex, setDetailCaseIndex] = useState<number | null>(null);
  const [outline, setOutline] = useState<TestDesignOutline>(emptyOutline(emptyIssue));
  const [improveInstruction, setImproveInstruction] = useState("");
  const [lastImproveInstruction, setLastImproveInstruction] = useState("");
  const [improveStatus, setImproveStatus] = useState("");
  const [promptImproveStatus, setPromptImproveStatus] = useState("");
  const [aiSettingsImprovePending, setAiSettingsImprovePending] = useState(false);
  const [aiSettingsImprovedField, setAiSettingsImprovedField] = useState<"" | "improvementNotes">("");
  const [pendingAiImproveHistory, setPendingAiImproveHistory] = useState<{ source: string; summary: string } | null>(null);
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
  const ui: UiText = UI_TEXT[languageMode];

  function applyDefaults(payload: DefaultsResponse) {
    setDefaults(payload);
    const nextProject = projectFromDefaults(payload);
    setProject(nextProject);
    setSavedSettingsSnapshot((current) => ({
      ...current,
      project: projectSettingsSnapshot(nextProject),
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
    setAiSettingsImprovedField("");
    setPendingAiImproveHistory(null);
    setSavedKnowledgeDraftSnapshot("");
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
      ai: aiCoreSettingsSnapshot(aiSettings) !== savedSettingsSnapshot.ai,
      knowledgeAi: knowledgeAiSettingsSnapshot(aiSettings) !== savedSettingsSnapshot.knowledgeAi,
    }),
    [project, credentials, confluenceCredentials, authEntries, aiSettings, savedSettingsSnapshot],
  );
  const knowledgeDraftDirty = useMemo(
    () => Boolean(knowledgeArticleDraft && knowledgeArticleSnapshot(knowledgeArticleDraft) !== savedKnowledgeDraftSnapshot),
    [knowledgeArticleDraft, savedKnowledgeDraftSnapshot],
  );

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

  function setProjectValue(key: keyof ProjectConfig, value: string) {
    clearValidationErrors(key === "labelMode" ? ["project.testcaseLabels", "project.testdesignLabels"] : [`project.${key}`]);
    setProject((current) => ({ ...current, [key]: value }));
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

  function appendImproveNote(existing: string, instruction: string) {
    const newItems = instruction
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^[-•]\s*/, "").trim())
      .filter(Boolean);
    if (!newItems.length) return existing;
    const lines = existing.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const seen = new Set(lines.map((line) => line.replace(/^[-•]\s*/, "").trim().toLowerCase()));
    const nextLines = [...lines];
    for (const item of newItems) {
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      nextLines.push(`- ${item}`);
    }
    return nextLines.join("\n");
  }

  function resetGeneratedDraft(nextIssueKey: string) {
    const nextIssue = { ...emptyIssue, key: nextIssueKey };
    setTestCases([]);
    setDetailCaseIndex(null);
    setOutline(emptyOutline(nextIssue));
    setCaseKeys("");
    setOutput("");
    setSavedFiles(null);
    setBuiltDesignFiles(null);
    setQaPlan(null);
    setImproveInstruction("");
    setLastImproveInstruction("");
    setImproveStatus("");
    setPromptImproveStatus("");
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
    setAiSettings(emptyAiSettings);
    setSavedAiSettings(emptyAiSettings);
    setAiSettingsHistory([]);
    setSavedSettingsSnapshot(initialSavedSettingsSnapshot);
    setAiSettingsImprovePending(false);
    setPendingAiImproveHistory(null);
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
      section === "project"
        ? { project }
        : section === "auth"
          ? { credentials, confluenceCredentials: savedConfluenceCredentials, authEntries }
          : { aiSettings: aiSettingsForSave };
    const label =
      section === "project"
        ? "Project config"
        : section === "auth"
          ? "Authentication"
          : section === "knowledgeAi"
            ? "Knowledge AI Settings"
            : "AI Settings";
    const historyMeta =
      section === "ai" && pendingAiImproveHistory
        ? pendingAiImproveHistory
        : { source: "manual_save", summary: label };
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
      if (section === "project") {
        setSavedSettingsSnapshot((current) => ({
          ...current,
          project: projectSettingsSnapshot(project),
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
        setAiSettingsImprovedField("");
        setPendingAiImproveHistory(null);
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
      setOutline(emptyOutline(effectiveIssue));
      setCaseKeys("");
      setSavedFiles(null);
      setBuiltDesignFiles(null);
      setOutput("");
      setQaPlan(null);
      setImproveInstruction("");
      setLastImproveInstruction("");
      setImproveStatus("");
      setPromptImproveStatus("");
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

  function improveDraft() {
    const trimmedInstruction = improveInstruction.trim();
    const activeAiSettings = savedAiSettings;
    if (!testCases.length || !outline.branches.length) {
      setMessage(ui.improveRequiresDraft);
      setImproveStatus(ui.improveRequiresDraft);
      return;
    }
    if (!activeAiSettings.enabled || (!activeAiSettings.apiKey.trim() && !secretStatus.ai.hasApiKey) || !activeAiSettings.model.trim()) {
      setMessage(ui.improveRequiresAi);
      setImproveStatus(ui.improveRequiresAi);
      return;
    }
    if (!trimmedInstruction) {
      setMessage(ui.improveDraftPlaceholder);
      setImproveStatus(ui.improveDraftPlaceholder);
      return;
    }
    setBusyRun("improve", async () => {
      setImproveStatus("");
      setGenerationStatus({
        state: "running",
        title: ui.improveDraftTitle,
        detail: trimmedInstruction,
        provider: activeAiSettings.provider,
        model: activeAiSettings.model,
        endpoint: activeAiSettings.baseUrl,
      });
      const effectiveIssueKey = issueKeyFromText(jiraUrl) || issue.key;
      const effectiveIssue = { ...issue, key: effectiveIssueKey };
      const shouldUseConfluenceDocs = Boolean(docContext.trim() && (!docIssueKey || docIssueKey === effectiveIssueKey));
      const payload = await apiPost<DraftResponse & { improveInstruction?: string }>("/api/improve-draft", {
        ...requestBody,
        issue: effectiveIssue,
        archetype: archetypeKey,
        qaPlan,
        testCases,
        outline,
        improveInstruction: trimmedInstruction,
        confluenceLinks: shouldUseConfluenceDocs ? confluenceLinks : "",
        docContext: shouldUseConfluenceDocs ? docContext : "",
      }).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "Không tinh chỉnh được draft.";
        setImproveStatus(errorMessage);
        throw error;
      });
      setArchetypeKey(payload.archetypeKey);
      setQaPlan(payload.qaPlan || qaPlan);
      setTestCases(payload.testCases);
      setDetailCaseIndex(null);
      setOutline(payload.outline);
      setActiveTab("cases");
      setSavedFiles(null);
      setBuiltDesignFiles(null);
      setOutput(JSON.stringify(payload, null, 2));
      setGenerationStatus(generationStatusFromPayload({ ...payload, aiGenerationUsed: true }));
      setImproveInstruction("");
      setLastImproveInstruction(trimmedInstruction);
      const successText = `${ui.improveDonePrefix}: "${trimmedInstruction}".`;
      setImproveStatus(successText);
      setMessage(successText);
    });
  }

  function improvePromptWithAi() {
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
    setBusyRun("promptImprove", async () => {
      setPromptImproveStatus("");
      const payload = await apiPost<PromptImproveResponse>("/api/improve-prompt", {
        instruction: trimmedInstruction,
        jiraUrl,
        issue,
        aiSettings: activeAiSettings,
        currentImprovementNotes: activeAiSettings.improvementNotes,
        testCases,
        outline,
        language: languageMode,
      }).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "Không cải thiện được prompt.";
        setPromptImproveStatus(errorMessage);
        throw error;
      });
      const improvedPrompt = payload.improvedPrompt.trim();
      if (!improvedPrompt) {
        throw new Error("AI chưa trả về prompt cải thiện hợp lệ.");
      }
      setAiSettings((current) => ({
        ...current,
        improvementNotes: appendImproveNote(current.improvementNotes, improvedPrompt),
      }));
      setAiSettingsImprovePending(true);
      setAiSettingsImprovedField("improvementNotes");
      setPendingAiImproveHistory({
        source: "ai_prompt_improve",
        summary: `AI improve prompt từ yêu cầu: ${trimmedInstruction.slice(0, 140)}`,
      });
      setSettingsStatus((current) => ({ ...current, ai: "" }));
      const successText = `${ui.improvePromptDonePrefix}: "${trimmedInstruction}". ${ui.improvePromptSavedToAiSettings} ${ui.aiSettingsUnsavedGuard}`;
      setPromptImproveStatus(successText);
      setMessage(successText);
    });
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

        <section className="panel compact">
          <div className="panel-title">
            <Link size={18} />
            <h2>{ui.jiraTask}</h2>
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
          <div className="button-row">
            <IconButton icon={<RefreshCw size={16} />} onClick={parseJiraLink} disabled={isWorking} title={ui.parseTitle}>
              {ui.parseButton}
            </IconButton>
            <IconButton icon={busy === "issue" ? <Loader2 className="spin" size={16} /> : <FileText size={16} />} onClick={fetchIssue} disabled={isWorking}>
              {ui.fetchButton}
            </IconButton>
          </div>
        </section>

        <nav className="side-nav" aria-label={ui.appNavigationLabel}>
          <button className={appView === "run" ? "active" : ""} type="button" onClick={() => setAppView("run")}>
            <Play size={16} />
            <span>{ui.generateTask}</span>
          </button>
          <button className={appView === "knowledge" ? "active" : ""} type="button" onClick={() => setAppView("knowledge")}>
            <BookOpen size={16} />
            <span>{ui.knowledge}</span>
          </button>
        </nav>

        <div className="sidebar-spacer" />

        <nav className="side-nav sidebar-bottom-nav" aria-label={ui.workspaceSettings}>
          <button className={appView === "settings" ? "active" : ""} type="button" onClick={() => setAppView("settings")}>
            <Settings size={16} />
            <span>{ui.workspaceSettings}</span>
            {aiSettingsImprovePending ? (
              <span className="nav-badge" title={ui.aiSettingsPendingImprove} aria-label={ui.aiSettingsPendingImprove}>
                <Wand2 size={11} />
              </span>
            ) : null}
          </button>
        </nav>

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

        {appView === "knowledge" ? (
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
                      <div className="knowledge-card-list">
                        {activeKnowledge.cards.map((card) => {
                          const cardKey = `${activeKnowledgeSection}:${card.title}`;
                          const isExpanded = expandedKnowledgeCards.includes(cardKey);
                          const detailPoints = knowledgeCardDetailPoints(languageMode, activeKnowledgeSection as StaticKnowledgeSection, card);
                          return (
                            <article className="knowledge-card knowledge-card-collapsible" key={card.title}>
                              <div className="knowledge-card-head">
                                <div>
                                  <h3>{card.title}</h3>
                                  <p>{card.description}</p>
                                </div>
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
        ) : appView === "settings" ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">{ui.settingsEyebrow}</p>
                <h2>{ui.workspaceSettings}</h2>
              </div>
            </header>

            <section className="settings-layout">
              <aside className="settings-section-nav" aria-label={ui.workspaceSettings}>
                <button className={activeSettingsSection === "project" ? "active" : ""} type="button" onClick={() => setActiveSettingsSection("project")}>
                  <Settings size={16} />
                  <span>{ui.project}</span>
                </button>
                <button className={activeSettingsSection === "auth" ? "active" : ""} type="button" onClick={() => setActiveSettingsSection("auth")}>
                  <ShieldCheck size={16} />
                  <span>{ui.authentication}</span>
                </button>
                <button className={activeSettingsSection === "ai" ? "active" : ""} type="button" onClick={() => setActiveSettingsSection("ai")}>
                  <Wand2 size={16} />
                  <span>{ui.aiSettings}</span>
                  {aiSettingsImprovePending ? (
                    <span className="nav-badge" title={ui.aiSettingsPendingImprove} aria-label={ui.aiSettingsPendingImprove}>
                      <Wand2 size={11} />
                    </span>
                  ) : null}
                </button>
                <button className={activeSettingsSection === "knowledgeAi" ? "active" : ""} type="button" onClick={() => setActiveSettingsSection("knowledgeAi")}>
                  <BookOpen size={16} />
                  <span>{ui.knowledgeAiSettings}</span>
                </button>
              </aside>

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
                <div className="form-grid two">
                  <Field
                    label={ui.writingStyle}
                    value={aiSettings.writingStyle}
                    onChange={(value) => setAiSettingValue("writingStyle", value)}
                    textarea
                    rows={4}
                    placeholder={ui.writingStylePlaceholder}
                  />
                  <Field
                    label={ui.improveSkillNotes}
                    value={aiSettings.improvementNotes}
                    onChange={(value) => setAiSettingValue("improvementNotes", value)}
                    textarea
                    rows={4}
                    placeholder={ui.improveSkillPlaceholder}
                    badge={
                      aiSettingsImprovedField === "improvementNotes" ? (
                        <>
                          <Wand2 size={11} />
                          {ui.aiImprovedBadge}
                        </>
                      ) : null
                    }
                  />
                  <Field
                    label={ui.testCaseGuidelines}
                    value={aiSettings.testCaseGuidelines}
                    onChange={(value) => setAiSettingValue("testCaseGuidelines", value)}
                    textarea
                    rows={5}
                    placeholder={ui.testCaseGuidelinesPlaceholder}
                  />
                  <Field
                    label={ui.testDesignGuidelines}
                    value={aiSettings.testDesignGuidelines}
                    onChange={(value) => setAiSettingValue("testDesignGuidelines", value)}
                    textarea
                    rows={5}
                    placeholder={ui.testDesignGuidelinesPlaceholder}
                  />
                </div>
                {secretStatus.ai.hasApiKey ? (
                  <div className="mini-note">{ui.aiSecretNote}</div>
                ) : null}
                <div className="button-row">
                  <IconButton
                    icon={settingsBusy === "ai" ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                    onClick={() => saveUserSettings("ai")}
                    disabled={Boolean(settingsBusy) || !settingsDirty.ai}
                    variant="primary"
                  >
                    {ui.save}
                  </IconButton>
                </div>
                {settingsStatus.ai ? <div className="mini-note">{settingsStatus.ai}</div> : null}
                <div className="mini-note">
                  {ui.aiFootnote}
                </div>
                <div className="settings-history">
                  <div className="subhead">
                    <span>{ui.aiSettingsHistory}</span>
                  </div>
                  {aiSettingsHistory.length ? (
                    <div className="history-list">
                      {aiSettingsHistory.slice(0, 12).map((entry) => (
                        <details className="history-card" key={entry.id}>
                          <summary>
                            <span>
                              <strong>{entry.summary || aiHistorySourceLabel(entry.source, ui)}</strong>
                              <small>{formatHistoryDate(entry.createdAt, languageMode)} · {entry.section === "knowledgeAi" ? ui.knowledgeAiSettings : ui.aiSettings}</small>
                            </span>
                            <em>{aiHistorySourceLabel(entry.source, ui)}</em>
                          </summary>
                          <div className="history-change-list">
                            {entry.changes.map((change) => (
                              <div className="history-change" key={`${entry.id}-${change.field}`}>
                                <strong>{change.label}</strong>
                                <div className="history-diff-grid">
                                  <div>
                                    <span>{ui.historyBefore}</span>
                                    <pre>{change.before || "(empty)"}</pre>
                                  </div>
                                  <div>
                                    <span>{ui.historyAfter}</span>
                                    <pre>{change.after || "(empty)"}</pre>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
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
          <div className="top-actions">
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
        </header>

        <GenerationBanner status={generationStatus} />

        <section className="issue-grid">
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

          <div className="panel">
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
        </section>

        {testCases.length ? (
          <section className="panel improve-panel">
            <div className="section-heading">
              <div>
                <h2>{ui.improveDraftTitle}</h2>
                <p>{ui.improveDraftHelp}</p>
              </div>
              <IconButton
                icon={busy === "improve" ? <Loader2 className="spin" size={16} /> : <Wand2 size={16} />}
                onClick={improveDraft}
                disabled={isWorking || !savedAiSettings.enabled}
                variant="primary"
              >
                {ui.improveDraftButton}
              </IconButton>
            </div>
            <Field
              label={ui.improveDraftInput}
              value={improveInstruction}
              onChange={(value) => {
                setImproveInstruction(value);
                if (improveStatus) setImproveStatus("");
                if (promptImproveStatus) setPromptImproveStatus("");
              }}
              textarea
              rows={3}
              placeholder={ui.improveDraftPlaceholder}
            />
            <div className="button-row improve-actions">
              <IconButton
                icon={busy === "promptImprove" ? <Loader2 className="spin" size={16} /> : <Wand2 size={16} />}
                onClick={improvePromptWithAi}
                disabled={isWorking || !savedAiSettings.enabled}
                variant="success"
              >
                {ui.improvePromptButton}
              </IconButton>
            </div>
            {improveStatus ? <div className={improveStatus.startsWith(ui.improveDonePrefix) ? "notice ok improve-status" : "notice improve-status"}>{improveStatus}</div> : null}
            {promptImproveStatus ? (
              <div className={promptImproveStatus.startsWith(ui.improvePromptDonePrefix) ? "notice ok improve-status" : "notice improve-status"}>{promptImproveStatus}</div>
            ) : null}
            {!savedAiSettings.enabled ? <div className="mini-note">{ui.improveRequiresAi}</div> : null}
          </section>
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
            <div className="case-list">
              {testCases.map((testCase, index) => {
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
      </main>
    </div>
  );
}

export default App;
