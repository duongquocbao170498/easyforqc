export type ProjectConfig = {
  sourceRoot: string;
  jiraBaseUrl: string;
  projectKey: string;
  folderRoot: string;
  runRoot: string;
  jsonOutputDir: string;
  outputDir: string;
  testCaseNumberTemplate: string;
  labelMode: string;
  testcaseLabels: string;
  testdesignLabels: string;
  testcaseStatusLabels: string;
  testdesignStatusLabels: string;
};

export type Credentials = {
  enabled: boolean;
  user: string;
  password: string;
  token: string;
  saved?: {
    hasPassword?: boolean;
    hasToken?: boolean;
  };
};

export type ConfluenceCredentials = {
  enabled: boolean;
  baseUrl: string;
  user: string;
  password: string;
  token: string;
  saved?: {
    hasPassword?: boolean;
    hasToken?: boolean;
  };
};

export type AuthEntry = {
  id: string;
  name: string;
  baseUrl: string;
  authType: "basic" | "bearer" | "apiKey";
  user: string;
  password: string;
  token: string;
  enabled: boolean;
  notes: string;
  saved?: {
    hasPassword?: boolean;
    hasToken?: boolean;
  };
};

export type AiSettings = {
  enabled: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  writingStyle: string;
  testCaseGuidelines: string;
  testDesignGuidelines: string;
  improvementNotes: string;
  knowledge?: {
    enabled: boolean;
    provider: string;
    baseUrl: string;
    model: string;
    apiKey: string;
    writingStyle: string;
    articleGuidelines: string;
    saved?: {
      hasApiKey?: boolean;
    };
  };
  saved?: {
    hasApiKey?: boolean;
    hasKnowledgeApiKey?: boolean;
  };
};

export type AiSettingsHistoryChange = {
  field: string;
  label: string;
  before: string;
  after: string;
  secret?: boolean;
};

export type AiSettingsHistoryEntry = {
  id: string;
  createdAt: string;
  section: "ai" | "knowledgeAi";
  source: string;
  summary: string;
  changes: AiSettingsHistoryChange[];
};

export type RepoContextSettings = {
  enabled: boolean;
  productRepoRoot: string;
  qaReferenceDir: string;
  includePaths: string;
  excludePaths: string;
  maxSnippets: string;
};

export type IssueSummary = {
  key: string;
  summary: string;
  title?: string;
  description: string;
  status: string;
  issue_type: string;
  project_key?: string;
  doc_links?: string[];
  doc_link_sources?: { title?: string; url: string; source?: string }[];
  doc_link_error?: string;
};

export type StructuredStep = {
  description: string;
  test_data: string;
  expected_result: string;
};

export type TestCase = {
  title: string;
  objective: string;
  priority: string;
  technique: string;
  risk: string;
  requirement_ref: string;
  coverage_tags: string[];
  scenario_type: string;
  precondition: string;
  test_data: string;
  expected_result: string;
  steps?: string[];
  structured_steps: StructuredStep[];
};

export type OutlineBranch = {
  title: string;
  items: string[];
};

export type TestDesignOutline = {
  issue_key: string;
  title: string;
  sheet_title?: string;
  template?: string;
  source_context?: Record<string, unknown>;
  design_rationale?: Record<string, unknown>;
  branches: OutlineBranch[];
};

export type ArchetypeInfo = {
  label: string;
  primary: string[];
  supporting: string[];
  dimensions: string[];
};

export type QaPlan = {
  version: string;
  issue_key: string;
  archetype_key: string;
  archetype_label: string;
  signals: { id: string; label: string; reason: string; strength?: number }[];
  selected_techniques: {
    primary: string[];
    supporting: string[];
    fail_safe: string[];
    all?: string[];
  };
  coverage_axes: {
    id: string;
    title: string;
    technique: string;
    risk: string;
    scenario_type: string;
    checks?: string[];
    inputs?: string[];
  }[];
  repo_evidence?: {
    enabled?: boolean;
    reason?: string;
    roots?: string[];
    root_status?: { root: string; exists: boolean; reason?: string }[];
    snippets?: { root: string; path: string; score: number; snippets: { line: number; text: string }[] }[];
  };
  open_questions?: string[];
};

export type DefaultsResponse = {
  defaults: {
    sourceRoot: string;
    jiraBaseUrl: string;
    projectKey: string;
    folderRoot: string;
    runRoot: string;
    jsonOutputDir: string;
    outputDir: string;
    testCaseNumberTemplate: string;
    labelPolicy: {
      mode: string;
      testcaseLabels: string;
      testdesignLabels: string;
      testcaseStatusLabels: string;
      testdesignStatusLabels: string;
    };
  };
  repoContext?: RepoContextSettings | null;
  archetypes: Record<string, ArchetypeInfo>;
  wrappers: {
    jira: string;
    xmind: string;
    jiraExists: boolean;
    xmindExists: boolean;
    sourceRootExists: boolean;
  };
};
