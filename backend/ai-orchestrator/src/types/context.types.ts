export interface Context {
  id: string;
  type: ContextType;
  scope: ContextScope;
  data: ContextData;
  metadata: ContextMetadata;
  relationships: ContextRelationship[];
  access: AccessControl;
  lifecycle: ContextLifecycle;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export enum ContextType {
  USER_SESSION = 'user_session',
  CONVERSATION = 'conversation',
  TASK_EXECUTION = 'task_execution',
  AGENT_MEMORY = 'agent_memory',
  KNOWLEDGE_BASE = 'knowledge_base',
  LEARNING_STATE = 'learning_state',
  WORKFLOW_STATE = 'workflow_state',
  SHARED_KNOWLEDGE = 'shared_knowledge'
}

export enum ContextScope {
  GLOBAL = 'global',           // Accessible by all agents
  AGENT_SPECIFIC = 'agent_specific', // Specific to one agent
  USER_SPECIFIC = 'user_specific',   // Specific to one user
  SESSION_SPECIFIC = 'session_specific', // Specific to one session
  TASK_SPECIFIC = 'task_specific',   // Specific to one task
  TEMPORARY = 'temporary'       // Short-lived context
}

export interface ContextData {
  content: Record<string, any>;
  summary?: string;
  keywords: string[];
  entities: ContextEntity[];
  insights: ContextInsight[];
  references: ContextReference[];
}

export interface ContextEntity {
  id: string;
  type: EntityType;
  name: string;
  description?: string;
  properties: Record<string, any>;
  confidence: number;
  lastMentioned: Date;
}

export enum EntityType {
  PERSON = 'person',
  ORGANIZATION = 'organization',
  FINANCIAL_INSTRUMENT = 'financial_instrument',
  MARKET = 'market',
  STRATEGY = 'strategy',
  CONCEPT = 'concept',
  EVENT = 'event',
  LOCATION = 'location'
}

export interface ContextInsight {
  id: string;
  type: InsightType;
  content: string;
  confidence: number;
  relevance: number;
  source: string;
  derivedAt: Date;
  validUntil?: Date;
}

export enum InsightType {
  PATTERN = 'pattern',
  TREND = 'trend',
  CORRELATION = 'correlation',
  ANOMALY = 'anomaly',
  PREDICTION = 'prediction',
  RECOMMENDATION = 'recommendation',
  LEARNING = 'learning'
}

export interface ContextReference {
  id: string;
  type: ReferenceType;
  target: string;
  description?: string;
  relevance: number;
  createdAt: Date;
}

export enum ReferenceType {
  CONTEXT_LINK = 'context_link',
  EXTERNAL_SOURCE = 'external_source',
  RELATED_TASK = 'related_task',
  SIMILAR_CONVERSATION = 'similar_conversation',
  KNOWLEDGE_BASE_ENTRY = 'knowledge_base_entry'
}

export interface ContextMetadata {
  title?: string;
  description?: string;
  tags: string[];
  priority: ContextPriority;
  sensitivity: SensitivityLevel;
  quality: QualityMetrics;
  usage: UsageStatistics;
}

export enum ContextPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum SensitivityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted'
}

export interface QualityMetrics {
  accuracy: number;
  completeness: number;
  freshness: number;
  relevance: number;
  consistency: number;
  lastValidated?: Date;
}

export interface UsageStatistics {
  accessCount: number;
  lastAccessed?: Date;
  sharedCount: number;
  modificationCount: number;
  averageRelevanceScore: number;
}

export interface ContextRelationship {
  id: string;
  type: RelationshipType;
  targetContextId: string;
  strength: number;
  direction: RelationshipDirection;
  description?: string;
  createdAt: Date;
  lastValidated: Date;
}

export enum RelationshipType {
  EXTENDS = 'extends',
  CONTAINS = 'contains',
  REFERENCES = 'references',
  CONFLICTS = 'conflicts',
  SUPPORTS = 'supports',
  SUPERSEDES = 'supersedes',
  DERIVED_FROM = 'derived_from'
}

export enum RelationshipDirection {
  BIDIRECTIONAL = 'bidirectional',
  UNIDIRECTIONAL = 'unidirectional'
}

export interface AccessControl {
  ownerId: string;
  permissions: ContextPermission[];
  shareableWithAgents: string[];
  shareableWithUsers: string[];
  isPublic: boolean;
  restrictions: AccessRestriction[];
}

export interface ContextPermission {
  principalId: string;
  principalType: PrincipalType;
  permissions: Permission[];
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;
}

export enum PrincipalType {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system',
  GROUP = 'group'
}

export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  SHARE = 'share',
  MODIFY_PERMISSIONS = 'modify_permissions'
}

export interface AccessRestriction {
  type: RestrictionType;
  description: string;
  parameters: Record<string, any>;
}

export enum RestrictionType {
  TIME_BASED = 'time_based',
  USAGE_BASED = 'usage_based',
  LOCATION_BASED = 'location_based',
  CONTEXT_BASED = 'context_based'
}

export interface ContextLifecycle {
  status: ContextStatus;
  ttl?: number; // Time to live in milliseconds
  archiveAt?: Date;
  deleteAt?: Date;
  retentionPolicy?: RetentionPolicy;
  versionHistory: ContextVersion[];
}

export enum ContextStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DEPRECATED = 'deprecated',
  DELETED = 'deleted',
  DRAFT = 'draft'
}

export interface RetentionPolicy {
  maxAge: number; // in milliseconds
  maxVersions: number;
  archiveOldVersions: boolean;
  autoCleanup: boolean;
  cleanupRules: CleanupRule[];
}

export interface CleanupRule {
  condition: string;
  action: CleanupAction;
  priority: number;
}

export enum CleanupAction {
  ARCHIVE = 'archive',
  DELETE = 'delete',
  COMPRESS = 'compress',
  MERGE = 'merge'
}

export interface ContextVersion {
  version: number;
  changes: ContextChange[];
  createdAt: Date;
  createdBy: string;
  checksum: string;
  size: number;
}

export interface ContextChange {
  operation: ChangeOperation;
  path: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
}

export enum ChangeOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move',
  COPY = 'copy'
}

// Search and Query Types
export interface ContextQuery {
  filters: ContextFilter[];
  sorting: SortCriteria[];
  pagination: PaginationOptions;
  includeRelated: boolean;
  includeArchived: boolean;
}

export interface ContextFilter {
  field: string;
  operator: FilterOperator;
  value: any;
  logicalOperator?: LogicalOperator;
}

export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IN = 'in',
  NOT_IN = 'not_in',
  REGEX = 'regex'
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not'
}

export interface SortCriteria {
  field: string;
  direction: SortDirection;
  priority: number;
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

export interface PaginationOptions {
  page: number;
  limit: number;
  offset?: number;
}

export interface ContextSearchResult {
  contexts: Context[];
  totalCount: number;
  searchTime: number;
  suggestions: SearchSuggestion[];
  facets: SearchFacet[];
}

export interface SearchSuggestion {
  type: SuggestionType;
  text: string;
  confidence: number;
}

export enum SuggestionType {
  KEYWORD = 'keyword',
  ENTITY = 'entity',
  RELATED_CONTEXT = 'related_context',
  FILTER = 'filter'
}

export interface SearchFacet {
  field: string;
  values: FacetValue[];
}

export interface FacetValue {
  value: string;
  count: number;
  selected: boolean;
}

// Memory Management Types
export interface MemoryProfile {
  agentId: string;
  totalMemoryMB: number;
  usedMemoryMB: number;
  contextCount: number;
  fragmentationRatio: number;
  compressionRatio: number;
  lastCleanup: Date;
  memoryPressure: MemoryPressure;
}

export enum MemoryPressure {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface MemoryOptimization {
  strategy: OptimizationStrategy;
  targetReduction: number;
  estimatedSavings: number;
  risks: OptimizationRisk[];
}

export enum OptimizationStrategy {
  COMPRESSION = 'compression',
  ARCHIVAL = 'archival',
  DEDUPLICATION = 'deduplication',
  SUMMARIZATION = 'summarization',
  SELECTIVE_DELETION = 'selective_deletion'
}

export interface OptimizationRisk {
  type: RiskType;
  severity: RiskSeverity;
  description: string;
  mitigation?: string;
}

export enum RiskType {
  DATA_LOSS = 'data_loss',
  PERFORMANCE_IMPACT = 'performance_impact',
  ACCURACY_DEGRADATION = 'accuracy_degradation',
  RELATIONSHIP_LOSS = 'relationship_loss'
}

export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Synchronization Types
export interface SyncRequest {
  requestId: string;
  sourceAgentId: string;
  targetAgentIds: string[];
  contextIds: string[];
  syncMode: SyncMode;
  conflictResolution: ConflictResolution;
  priority: SyncPriority;
}

export enum SyncMode {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  SELECTIVE = 'selective'
}

export enum ConflictResolution {
  SOURCE_WINS = 'source_wins',
  TARGET_WINS = 'target_wins',
  MERGE = 'merge',
  MANUAL = 'manual',
  LATEST_WINS = 'latest_wins'
}

export enum SyncPriority {
  IMMEDIATE = 'immediate',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
  BACKGROUND = 'background'
}

export interface SyncResult {
  requestId: string;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  contextsSynced: number;
  conflictsDetected: number;
  conflictsResolved: number;
  errors: SyncError[];
  statistics: SyncStatistics;
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PARTIAL = 'partial',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface SyncError {
  contextId: string;
  agentId: string;
  errorCode: string;
  message: string;
  details?: Record<string, any>;
}

export interface SyncStatistics {
  totalContexts: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: number;
  dataTransferred: number;
  compressionRatio: number;
}