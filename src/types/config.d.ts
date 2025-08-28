/**
 * Configuration type definitions for MCP Box CLI tool
 * Defines interfaces for CLI configuration, backup management, and security
 */

import { AgentType, TransportType, ConfigScope } from './agents.d.js';
import { MCPServer, InstallMethod } from './registry.d.js';

// CLI Global configuration
export interface CLIConfig {
  defaultAgent?: AgentType | undefined;
  defaultScope?: ConfigScope;
  defaultTransport?: TransportType;
  autoBackup: boolean;
  backupRetention: number; // days
  verboseLogging: boolean;
  colorOutput: boolean;
  updateCheckInterval: number; // hours
  registrySource: string;
  securitySettings: SecurityConfig;
  editorCommand?: string | undefined;
}

// Security configuration
export interface SecurityConfig {
  secretValidation: boolean;
  keychainIntegration: boolean;
  allowPlaintextSecrets: boolean;
  trustedSources: string[];
  requireSignedPackages: boolean;
  sandboxExecution: boolean;
  environmentVariableValidation: boolean;
}

// CLI Command interfaces
export interface BaseCommandOptions {
  verbose?: boolean;
  dryRun?: boolean;
  noBackup?: boolean;
  agent?: AgentType;
  scope?: ConfigScope;
  configPath?: string;
}

export interface InitCommandOptions extends BaseCommandOptions {
  agent?: AgentType;
  scope?: ConfigScope;
  nonInteractive?: boolean;
  servers?: string[];
  transport?: TransportType;
  installDependencies?: boolean;
}

export interface ListCommandOptions extends BaseCommandOptions {
  format?: 'table' | 'json' | 'yaml';
  showInactive?: boolean;
  showHealth?: boolean;
  filter?: string;
}

export interface ManagementCommandOptions extends BaseCommandOptions {
  all?: boolean;
  force?: boolean;
  backup?: boolean;
  transport?: TransportType;
}

export interface DoctorCommandOptions extends BaseCommandOptions {
  fix?: boolean;
  checkAll?: boolean;
  timeout?: number;
  detailed?: boolean;
}

export interface SearchCommandOptions extends BaseCommandOptions {
  tags?: string[];
  transport?: TransportType;
  category?: string;
  limit?: number;
  detailed?: boolean;
}

export interface ImportCommandOptions extends BaseCommandOptions {
  from?: AgentType;
  to?: AgentType;
  merge?: boolean;
  overwrite?: boolean;
  includeInactive?: boolean;
}

// Backup system interfaces
export interface BackupConfig {
  enabled: boolean;
  directory: string;
  maxBackups: number;
  compression: boolean;
  encryption: boolean;
  autoCleanup: boolean;
  retentionDays: number;
}

export interface BackupMetadata {
  id: string;
  agent: AgentType;
  scope: ConfigScope;
  configPath: string;
  timestamp: string;
  checksum: string;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  description?: string;
  version: string;
}

export interface BackupEntry {
  metadata: BackupMetadata;
  filePath: string;
  exists: boolean;
  valid: boolean;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  filePath: string;
  size: number;
  checksum: string;
  error?: string;
  timeElapsed: number;
}

export interface RestoreResult {
  success: boolean;
  backupId: string;
  configPath: string;
  error?: string;
  timeElapsed: number;
  changesDetected: boolean;
}

// Installation configuration
export interface InstallationConfig {
  serverId: string;
  agent: AgentType;
  transport: TransportType;
  scope: ConfigScope;
  method: InstallMethod;
  environmentVariables?: Record<string, string>;
  customArgs?: string[];
  autoStart?: boolean;
  configOverrides?: Record<string, any>;
}

export interface InstallationPlan {
  serverId: string;
  server: MCPServer;
  config: InstallationConfig;
  dependencies: InstallationDependency[];
  conflicts: InstallationConflict[];
  estimatedTime: number;
  steps: InstallationStep[];
}

export interface InstallationDependency {
  type: 'npm' | 'python' | 'docker' | 'binary' | 'env';
  name: string;
  version?: string;
  installed: boolean;
  installCommand?: string;
  required: boolean;
}

export interface InstallationConflict {
  type: 'port' | 'name' | 'dependency' | 'environment';
  description: string;
  resolution?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface InstallationStep {
  id: string;
  name: string;
  description: string;
  command?: string;
  estimatedTime: number;
  required: boolean;
  rollbackCommand?: string;
}

// Project configuration interface
export interface ProjectConfig {
  mcpBox: {
    version: string;
    agents: Record<AgentType, {
      enabled: boolean;
      scope: ConfigScope;
      servers: string[];
      customConfig?: Record<string, any>;
    }>;
    sharedServers: string[];
    environment: Record<string, string>;
    scripts?: Record<string, string>;
  };
}

// User preferences interface
export interface UserPreferences {
  favoriteServers: string[];
  hiddenServers: string[];
  customCategories: Record<string, string[]>;
  defaultInstallOptions: {
    transport: TransportType;
    scope: ConfigScope;
    autoBackup: boolean;
    installDependencies: boolean;
  };
  editorIntegration: {
    enabled: boolean;
    editor: string;
    openOnInstall: boolean;
    openOnError: boolean;
  };
  notifications: {
    enabled: boolean;
    updateNotifications: boolean;
    healthCheckNotifications: boolean;
    errorNotifications: boolean;
  };
}

// Health check configuration
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // minutes
  timeout: number; // seconds
  retries: number;
  alertThreshold: number;
  checks: {
    processHealth: boolean;
    networkHealth: boolean;
    configValidation: boolean;
    dependencyCheck: boolean;
    performanceMetrics: boolean;
  };
}

// Logging configuration
export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  file?: string;
  maxSize: number; // MB
  maxFiles: number;
  console: boolean;
  timestamp: boolean;
  colorize: boolean;
  json: boolean;
}

// Complete MCP Box configuration
export interface MCPBoxConfig {
  version: string;
  cli: CLIConfig;
  backup: BackupConfig;
  health: HealthCheckConfig;
  logging: LoggingConfig;
  preferences: UserPreferences;
  security: SecurityConfig;
  lastUpdated: string;
}

// Environment variable configuration
export interface EnvironmentConfig {
  variables: Record<string, {
    value?: string;
    secure: boolean;
    required: boolean;
    description?: string;
    validation?: string; // regex pattern
  }>;
  sources: {
    env: boolean;
    dotenv: boolean;
    keychain: boolean;
    userInput: boolean;
  };
}

// Migration configuration for version updates
export interface MigrationConfig {
  fromVersion: string;
  toVersion: string;
  steps: MigrationStep[];
  reversible: boolean;
  backupRequired: boolean;
}

export interface MigrationStep {
  id: string;
  description: string;
  operation: 'create' | 'update' | 'delete' | 'move' | 'transform';
  target: string;
  transform?: (data: any) => any;
  validate?: (data: any) => boolean;
}

// Export utility interfaces
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
  suggestions: ConfigSuggestion[];
}

export interface ConfigValidationError {
  path: string;
  message: string;
  code: string;
  severity: 'error';
  fix?: string;
}

export interface ConfigValidationWarning {
  path: string;
  message: string;
  code: string;
  severity: 'warning';
  suggestion?: string;
}

export interface ConfigSuggestion {
  path: string;
  message: string;
  action: string;
  impact: 'low' | 'medium' | 'high';
}

// Configuration manager interface
export interface ConfigManager {
  // Configuration operations
  loadConfig(): Promise<MCPBoxConfig>;
  saveConfig(config: MCPBoxConfig): Promise<void>;
  validateConfig(config: MCPBoxConfig): Promise<ConfigValidationResult>;
  resetConfig(): Promise<void>;
  
  // Agent configuration operations
  loadAgentConfig(agent: AgentType, scope?: ConfigScope): Promise<any>;
  saveAgentConfig(agent: AgentType, config: any, scope?: ConfigScope): Promise<void>;
  mergeAgentConfig(agent: AgentType, config: any, scope?: ConfigScope): Promise<void>;
  
  // Project configuration operations
  loadProjectConfig(): Promise<ProjectConfig | null>;
  saveProjectConfig(config: ProjectConfig): Promise<void>;
  initProjectConfig(): Promise<void>;
  
  // Migration operations
  migrateConfig(fromVersion: string, toVersion: string): Promise<void>;
  checkMigrationNeeded(): Promise<boolean>;
}