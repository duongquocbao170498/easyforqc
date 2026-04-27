export type ProjectConfig = {
  sourceRoot: string;
  jiraBaseUrl: string;
  projectKey: string;
  folderRoot: string;
  runRoot: string;
  outputDir: string;
  labelMode: string;
  testcaseLabels: string;
  testdesignLabels: string;
  testcaseStatusLabels: string;
  testdesignStatusLabels: string;
};

export type Credentials = {
  user: string;
  password: string;
  token: string;
};

export type ConfluenceCredentials = {
  baseUrl: string;
  user: string;
  password: string;
  token: string;
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

export type DefaultsResponse = {
  defaults: {
    sourceRoot: string;
    jiraBaseUrl: string;
    projectKey: string;
    folderRoot: string;
    runRoot: string;
    outputDir: string;
    labelPolicy: {
      mode: string;
      testcaseLabels: string;
      testdesignLabels: string;
      testcaseStatusLabels: string;
      testdesignStatusLabels: string;
    };
  };
  archetypes: Record<string, ArchetypeInfo>;
  wrappers: {
    jira: string;
    xmind: string;
    jiraExists: boolean;
    xmindExists: boolean;
    sourceRootExists: boolean;
  };
};
