export interface SwitchRequest {
  id: string;
  currentTaskId: string;
  currentAgentId: string;
  reason: SwitchReason;
  requesterId: string;
  requestType: SwitchRequestType;
  targetCriteria: AgentSelectionCriteria;
  contextPreservation: ContextPreservationConfig;
  urgency: SwitchUrgency;
  metadata: SwitchMetadata;
  createdAt: Date;
}

export enum SwitchReason {
  USER_REQUEST = 'user_request',
  AGENT_UNAVAILABLE = 'agent_unavailable',
  CAPABILITY_MISMATCH = 'capability_mismatch',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  LOAD_BALANCING = 'load_balancing',
  TASK_COMPLEXITY_CHANGE = 'task_complexity_change',
  SPECIALIZED_KNOWLEDGE_NEEDED = 'specialized_knowledge_needed',
  AGENT_ERROR = 'agent_error',
  TIMEOUT = 'timeout',
  QUALITY_IMPROVEMENT = 'quality_improvement',
  COST_OPTIMIZATION = 'cost_optimization',
  AUTOMATIC_ESCALATION = 'automatic_escalation'
}

export enum SwitchRequestType {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
  CONDITIONAL = 'conditional',
  GRADUAL = 'gradual'
}

export enum SwitchUrgency {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface AgentSelectionCriteria {
  requiredCapabilities: string[];
  preferredAgentTypes: string[];
  excludedAgentIds: string[];
  minimumSuccessRate?: number;
  maximumResponseTime?: number;
  requiresSpecialization?: string[];
  workloadPreference?: WorkloadPreference;
  experienceLevel?: ExperienceLevel;
  communicationStyle?: CommunicationStyle;
}

export enum WorkloadPreference {
  LOW_LOAD = 'low_load',
  BALANCED = 'balanced',
  HIGH_CAPACITY = 'high_capacity',
  OPTIMAL_PERFORMANCE = 'optimal_performance'
}

export enum ExperienceLevel {
  NOVICE = 'novice',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert',
  SPECIALIST = 'specialist'
}

export enum CommunicationStyle {
  FORMAL = 'formal',
  CASUAL = 'casual',
  TECHNICAL = 'technical',
  EDUCATIONAL = 'educational',
  CONCISE = 'concise',
  DETAILED = 'detailed'
}

export interface ContextPreservationConfig {
  preserveFullContext: boolean;
  preserveConversationHistory: boolean;
  preserveUserPreferences: boolean;
  preserveTaskState: boolean;
  preserveTemporaryData: boolean;
  contextCompressionLevel: CompressionLevel;
  selectivePreservation: SelectivePreservationRules;
}

export enum CompressionLevel {
  NONE = 'none',
  LIGHT = 'light',
  MEDIUM = 'medium',
  AGGRESSIVE = 'aggressive'
}

export interface SelectivePreservationRules {
  priorityThreshold: number;
  preserveRecent: boolean;
  preserveFrequentlyAccessed: boolean;
  preserveHighRelevance: boolean;
  maxContextAge: number; // in milliseconds
  maxContextSize: number; // in bytes
}

export interface SwitchMetadata {
  sessionId?: string;
  conversationId?: string;
  userId?: string;
  deviceInfo?: Record<string, any>;
  geolocation?: string;
  timeZone?: string;
  languagePreference?: string;
  customParameters?: Record<string, any>;
}

export interface SwitchResult {
  id: string;
  requestId: string;
  success: boolean;
  newTaskId?: string;
  newAgentId?: string;
  selectedAgent?: AgentSwitchProfile;
  preservedContextId?: string;
  handoffSummary?: HandoffSummary;
  performanceMetrics: SwitchPerformanceMetrics;
  errors?: SwitchError[];
  completedAt: Date;
  duration: number;
}

export interface AgentSwitchProfile {
  agentId: string;
  agentName: string;
  agentType: string;
  capabilities: string[];
  selectionScore: number;
  selectionReasoning: string[];
  estimatedHandoffTime: number;
  confidenceLevel: number;
  specializations: string[];
  currentLoad: number;
  avgResponseTime: number;
  successRate: number;
}

export interface HandoffSummary {
  contextTransferred: boolean;
  contextSize: number;
  preservationLevel: string;
  keyInformation: KeyInformation[];
  conversationSummary?: string;
  taskProgress?: TaskProgress;
  userState?: UserState;
  recommendations?: string[];
}

export interface KeyInformation {
  type: InformationType;
  content: string;
  priority: number;
  timestamp: Date;
  source: string;
}

export enum InformationType {
  USER_INTENT = 'user_intent',
  CONVERSATION_CONTEXT = 'conversation_context',
  TASK_STATE = 'task_state',
  USER_PREFERENCE = 'user_preference',
  SYSTEM_STATE = 'system_state',
  ERROR_CONTEXT = 'error_context',
  PROGRESS_INDICATOR = 'progress_indicator'
}

export interface TaskProgress {
  stage: string;
  completionPercentage: number;
  completedSteps: string[];
  remainingSteps: string[];
  blockers?: string[];
  estimatedTimeRemaining?: number;
}

export interface UserState {
  satisfactionLevel?: number;
  engagementLevel?: number;
  frustrationIndicators?: string[];
  preferences?: Record<string, any>;
  communicationStyle?: CommunicationStyle;
  expertiseLevel?: ExperienceLevel;
}

export interface SwitchPerformanceMetrics {
  switchLatency: number;
  contextTransferTime: number;
  agentSelectionTime: number;
  handoffPreparationTime: number;
  totalSwitchTime: number;
  contextPreservationRate: number;
  userSatisfactionScore?: number;
  seamlessnessScore: number;
}

export interface SwitchError {
  code: string;
  message: string;
  details?: Record<string, any>;
  recoverable: boolean;
  timestamp: Date;
}

export interface SwitchPattern {
  id: string;
  pattern: PatternType;
  frequency: number;
  conditions: PatternCondition[];
  outcomes: PatternOutcome[];
  confidence: number;
  learnedAt: Date;
  lastObserved: Date;
  successRate: number;
}

export enum PatternType {
  SEQUENTIAL_SWITCH = 'sequential_switch',
  CIRCULAR_SWITCH = 'circular_switch',
  ESCALATION_PATTERN = 'escalation_pattern',
  SPECIALIZATION_PATTERN = 'specialization_pattern',
  TIME_BASED_PATTERN = 'time_based_pattern',
  LOAD_BASED_PATTERN = 'load_based_pattern',
  USER_PREFERENCE_PATTERN = 'user_preference_pattern'
}

export interface PatternCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  weight: number;
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  IN_RANGE = 'in_range',
  MATCHES_PATTERN = 'matches_pattern'
}

export interface PatternOutcome {
  targetAgentType: string;
  successProbability: number;
  averageUserSatisfaction: number;
  averageCompletionTime: number;
  commonIssues: string[];
}

export interface SwitchStrategy {
  name: string;
  description: string;
  conditions: StrategyCondition[];
  actions: StrategyAction[];
  priority: number;
  enabled: boolean;
}

export interface StrategyCondition {
  type: ConditionType;
  parameters: Record<string, any>;
  weight: number;
}

export enum ConditionType {
  AGENT_PERFORMANCE = 'agent_performance',
  TASK_COMPLEXITY = 'task_complexity',
  USER_SATISFACTION = 'user_satisfaction',
  RESPONSE_TIME = 'response_time',
  ERROR_RATE = 'error_rate',
  LOAD_THRESHOLD = 'load_threshold',
  TIME_OF_DAY = 'time_of_day',
  USER_PREFERENCE = 'user_preference'
}

export interface StrategyAction {
  type: ActionType;
  parameters: Record<string, any>;
  priority: number;
}

export enum ActionType {
  IMMEDIATE_SWITCH = 'immediate_switch',
  GRADUAL_HANDOFF = 'gradual_handoff',
  PARALLEL_PROCESSING = 'parallel_processing',
  ESCALATE_TO_HUMAN = 'escalate_to_human',
  QUEUE_FOR_SPECIALIST = 'queue_for_specialist',
  ADJUST_PARAMETERS = 'adjust_parameters'
}

export interface SwitchRecommendation {
  recommendationId: string;
  confidence: number;
  reasoning: string[];
  suggestedAgent: AgentSwitchProfile;
  expectedBenefits: ExpectedBenefit[];
  potentialRisks: PotentialRisk[];
  alternativeOptions: AgentSwitchProfile[];
  estimatedImpact: EstimatedImpact;
}

export interface ExpectedBenefit {
  type: BenefitType;
  description: string;
  quantifiedValue?: number;
  probability: number;
}

export enum BenefitType {
  IMPROVED_PERFORMANCE = 'improved_performance',
  FASTER_RESPONSE = 'faster_response',
  BETTER_ACCURACY = 'better_accuracy',
  ENHANCED_USER_EXPERIENCE = 'enhanced_user_experience',
  COST_REDUCTION = 'cost_reduction',
  LOAD_OPTIMIZATION = 'load_optimization'
}

export interface PotentialRisk {
  type: RiskType;
  description: string;
  severity: RiskSeverity;
  probability: number;
  mitigation?: string;
}

export enum RiskType {
  CONTEXT_LOSS = 'context_loss',
  INCREASED_LATENCY = 'increased_latency',
  USER_CONFUSION = 'user_confusion',
  TASK_INTERRUPTION = 'task_interruption',
  QUALITY_DEGRADATION = 'quality_degradation',
  CONSISTENCY_ISSUES = 'consistency_issues'
}

export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface EstimatedImpact {
  userSatisfactionChange: number;
  performanceChange: number;
  costChange: number;
  timeToCompletion: number;
  confidenceInterval: [number, number];
}

export interface SwitchAnalytics {
  totalSwitches: number;
  successfulSwitches: number;
  failedSwitches: number;
  averageSwitchTime: number;
  mostCommonReasons: Record<SwitchReason, number>;
  agentSwitchMatrix: Record<string, Record<string, number>>;
  userSatisfactionTrends: SatisfactionTrend[];
  patternInsights: PatternInsight[];
  performanceMetrics: AnalyticsMetrics;
}

export interface SatisfactionTrend {
  period: string;
  averageScore: number;
  sampleSize: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface PatternInsight {
  insight: string;
  supportingData: Record<string, any>;
  actionRecommendation?: string;
  priority: number;
}

export interface AnalyticsMetrics {
  switchSuccessRate: number;
  averageHandoffTime: number;
  contextPreservationRate: number;
  userRetentionAfterSwitch: number;
  agentUtilizationBalance: number;
  costEfficiencyScore: number;
}

export interface SwitchConfiguration {
  enableAutomaticSwitching: boolean;
  switchThresholds: SwitchThresholds;
  defaultPreservationConfig: ContextPreservationConfig;
  learningEnabled: boolean;
  analyticsRetentionDays: number;
  maxSwitchesPerSession: number;
  minimumTimeBetweenSwitches: number;
  blackoutPeriods: BlackoutPeriod[];
}

export interface SwitchThresholds {
  performanceDegradationThreshold: number;
  responseTimeThreshold: number;
  errorRateThreshold: number;
  userSatisfactionThreshold: number;
  loadBalancingThreshold: number;
}

export interface BlackoutPeriod {
  startTime: string;
  endTime: string;
  days: string[];
  reason: string;
  allowCriticalSwitches: boolean;
}