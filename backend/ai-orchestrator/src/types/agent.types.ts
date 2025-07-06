export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  capabilities: AgentCapability[];
  status: AgentStatus;
  metadata: AgentMetadata;
  configuration: AgentConfiguration;
  performance: AgentPerformance;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
}

export enum AgentType {
  TRADING_MENTOR = 'trading_mentor',
  MARKET_ANALYST = 'market_analyst', 
  RISK_MANAGER = 'risk_manager',
  TECHNICAL_ANALYST = 'technical_analyst',
  FUNDAMENTAL_ANALYST = 'fundamental_analyst',
  PORTFOLIO_MANAGER = 'portfolio_manager',
  NEWS_AGGREGATOR = 'news_aggregator',
  SENTIMENT_ANALYZER = 'sentiment_analyzer',
  BACKTESTER = 'backtester',
  EXECUTION_AGENT = 'execution_agent'
}

export enum AgentCapability {
  // Trading Education
  EDUCATION = 'education',
  MENTORING = 'mentoring',
  COURSE_CREATION = 'course_creation',
  
  // Market Analysis
  TECHNICAL_ANALYSIS = 'technical_analysis',
  FUNDAMENTAL_ANALYSIS = 'fundamental_analysis',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  MARKET_PREDICTION = 'market_prediction',
  
  // Risk Management
  RISK_ASSESSMENT = 'risk_assessment',
  PORTFOLIO_OPTIMIZATION = 'portfolio_optimization',
  POSITION_SIZING = 'position_sizing',
  
  // Data Processing
  DATA_COLLECTION = 'data_collection',
  DATA_ANALYSIS = 'data_analysis',
  PATTERN_RECOGNITION = 'pattern_recognition',
  
  // Execution
  ORDER_EXECUTION = 'order_execution',
  STRATEGY_EXECUTION = 'strategy_execution',
  BACKTESTING = 'backtesting',
  
  // Communication
  NATURAL_LANGUAGE = 'natural_language',
  MULTI_LANGUAGE = 'multi_language',
  VOICE_INTERACTION = 'voice_interaction'
}

export enum AgentStatus {
  ACTIVE = 'active',
  IDLE = 'idle',
  BUSY = 'busy',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
  ERROR = 'error'
}

export interface AgentMetadata {
  version: string;
  description: string;
  tags: string[];
  author: string;
  license: string;
  supportedLanguages: string[];
  modelProvider?: string;
  modelName?: string;
  apiVersion?: string;
}

export interface AgentConfiguration {
  maxConcurrentTasks: number;
  responseTimeoutMs: number;
  retryPolicy: RetryPolicy;
  resourceLimits: ResourceLimits;
  preferences: Record<string, any>;
  endpoints: AgentEndpoints;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  exponentialBackoff: boolean;
}

export interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxRequestsPerMinute: number;
}

export interface AgentEndpoints {
  primary: string;
  health: string;
  metrics?: string;
  websocket?: string;
}

export interface AgentPerformance {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageResponseTimeMs: number;
  successRate: number;
  currentLoad: number;
  lastPerformanceUpdate: Date;
}

// Task-related types
export interface Task {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  input: TaskInput;
  requirements: TaskRequirements;
  assignedAgentId?: string;
  status: TaskStatus;
  result?: TaskResult;
  error?: TaskError;
  metadata: TaskMetadata;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export enum TaskType {
  EDUCATION_QUERY = 'education_query',
  MARKET_ANALYSIS = 'market_analysis',
  RISK_ASSESSMENT = 'risk_assessment',
  PORTFOLIO_REVIEW = 'portfolio_review',
  STRATEGY_BACKTEST = 'strategy_backtest',
  NEWS_ANALYSIS = 'news_analysis',
  SENTIMENT_CHECK = 'sentiment_check',
  TECHNICAL_SCAN = 'technical_scan',
  FUNDAMENTAL_REVIEW = 'fundamental_review',
  MULTI_AGENT_WORKFLOW = 'multi_agent_workflow'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export interface TaskInput {
  query?: string;
  data?: Record<string, any>;
  context?: TaskContext;
  userPreferences?: UserPreferences;
  sessionId?: string;
}

export interface TaskContext {
  conversationId?: string;
  previousTasks?: string[];
  userContext?: Record<string, any>;
  marketContext?: Record<string, any>;
}

export interface UserPreferences {
  language: string;
  riskTolerance: 'low' | 'medium' | 'high';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  interests: string[];
  notifications: boolean;
}

export interface TaskRequirements {
  requiredCapabilities: AgentCapability[];
  preferredAgentTypes?: AgentType[];
  maxResponseTimeMs?: number;
  qualityThreshold?: number;
  resourceRequirements?: ResourceRequirements;
}

export interface ResourceRequirements {
  minMemoryMB?: number;
  minCpuCores?: number;
  requiresGpu?: boolean;
  networkBandwidth?: number;
}

export interface TaskResult {
  success: boolean;
  data: Record<string, any>;
  confidence?: number;
  processingTimeMs: number;
  agentId: string;
  agentVersion: string;
  sources?: string[];
  recommendations?: string[];
}

export interface TaskError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
  timestamp: Date;
}

export interface TaskMetadata {
  source: 'user' | 'system' | 'agent';
  requestId: string;
  userId?: string;
  sessionId?: string;
  deviceInfo?: Record<string, any>;
  geolocation?: string;
  tags: string[];
}

// Orchestration types
export interface OrchestrationStrategy {
  name: string;
  description: string;
  rules: OrchestrationRule[];
  fallbackStrategy?: string;
}

export interface OrchestrationRule {
  condition: string;
  action: OrchestrationAction;
  priority: number;
}

export interface OrchestrationAction {
  type: 'assign' | 'distribute' | 'chain' | 'parallel' | 'fallback';
  parameters: Record<string, any>;
}

export interface AgentSelection {
  agentId: string;
  score: number;
  reasoning: string;
  estimatedCompletionTime: number;
}

export interface WorkflowExecution {
  id: string;
  taskId: string;
  steps: WorkflowStep[];
  currentStepIndex: number;
  status: WorkflowStatus;
  startedAt: Date;
  completedAt?: Date;
}

export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface WorkflowStep {
  id: string;
  agentId: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  status: TaskStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: TaskError;
}