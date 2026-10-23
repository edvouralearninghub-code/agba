export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export type ModelProvider = 'gemini' | 'openai' | 'anthropic' | 'mistral' | 'ollama';

export type AllowedToolId =
  | 'http_request'
  | 'web_search'
  | 'calculator'
  | 'document_retrieval'
  | 'send_email_novu';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  planTier: 'free' | 'builder' | 'team';
  currency: 'NGN' | 'USD';
  memberRole: WorkspaceRole;
  createdAt: string;
}

export interface MaskedModelKeyRecord {
  id: string;
  workspace_id: string;
  provider: ModelProvider;
  label: string;
  maskedKey: string; // e.g., "sk-...9f4a" - never contains raw secret
  createdAt: string;
  createdBy: string;
}

export interface RagDocumentChunk {
  id: string;
  workspace_id: string;
  documentId: string;
  sourceName: string;
  chunkIndex: number;
  content: string;
  keywords: string[];
  createdAt: string;
}

export type StudioNodeKind =
  | 'input_trigger'
  | 'rag_retriever'
  | 'llm_generator'
  | 'agent_tool'
  | 'output_response';

export interface StudioNode {
  id: string;
  kind: StudioNodeKind;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  config: {
    provider?: ModelProvider;
    modelName?: string;
    systemPrompt?: string;
    temperature?: number;
    topK?: number;
    toolId?: AllowedToolId;
    toolEndpoint?: string;
    citationRequired?: boolean;
  };
}

export interface StudioEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface StudioWorkflowApp {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  category: 'Starter' | 'RAG' | 'Multi-Agent';
  allowedTools: AllowedToolId[];
  nodes: StudioNode[];
  edges: StudioEdge[];
  publishedSlug?: string;
  updatedAt: string;
}

export interface AcademyTemplate {
  id: string;
  title: string;
  track: 'Starter' | 'RAG Tutorial' | 'Advanced Multi-Agent';
  summary: string;
  estimatedMinutes: number;
  supportsLocalLlama: boolean;
  recommendedModel: string;
  allowedTools: AllowedToolId[];
  nodes: StudioNode[];
  edges: StudioEdge[];
  samplePrompt: string;
}

export type FreeStackCategory =
  | 'Cloud & Compute'
  | 'Databases & Vector Stores'
  | 'Auth & Backend Platforms'
  | 'CI/CD & DevOps'
  | 'Web Hosting & Edge'
  | 'AI & Model APIs'
  | 'Email & Notifications'
  | 'Monitoring & Logs'
  | 'DNS & Domains'
  | 'Storage & Media';

export interface FreeStackEntry {
  id: string;
  serviceName: string;
  description?: string;
  category: FreeStackCategory;
  freeTierSummary: string;
  officialPricingUrl: string;
  verifiedOn: string;
  workspace_id?: string;
}

export interface WcagContrastResult {
  id: string;
  pairName: string;
  foregroundHex: string;
  backgroundHex: string;
  ratio: number;
  requiredRatio: number;
  textSize: 'body (4.5:1)' | 'large/heading (3.0:1)';
  passes: boolean;
  note?: string;
}

export interface SecurityTestSuiteReport {
  timestamp: string;
  allPassed: boolean;
  totalChecks: number;
  passedChecks: number;
  results: {
    name: string;
    category: 'Tenant Isolation' | 'AES-256-GCM BYOK' | 'SSRF Protection' | 'File Upload' | 'Paystack Webhook' | 'Prompt Injection' | 'WCAG AA Contrast' | 'License Hygiene';
    passed: boolean;
    detail: string;
  }[];
  wcagReport: WcagContrastResult[];
}
