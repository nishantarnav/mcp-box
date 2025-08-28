/**
 * Configuration Management Utilities
 * Handles reading, writing, merging, and validating configuration files
 */

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import type {
  MCPBoxConfig,
  CLIConfig,
  ConfigManager,
  ConfigValidationResult,
  BackupResult,
  RestoreResult,
  ProjectConfig,
  BackupMetadata,
  SecurityConfig,
  BackupConfig,
  HealthCheckConfig,
  LoggingConfig,
  UserPreferences
} from '../types/config.d.js';
import type { AgentType, ConfigScope, AgentConfig } from '../types/agents.d.js';
import {
  getAgentConfigPath,
  findConfigFile,
  getMCPBoxConfigDir,
  getBackupDir,
  ensureDir,
  pathExists,
  createSafeFilename
} from './paths.js';

// Default configuration schemas
const securityConfigSchema = z.object({
  secretValidation: z.boolean().default(true),
  keychainIntegration: z.boolean().default(true),
  allowPlaintextSecrets: z.boolean().default(false),
  trustedSources: z.array(z.string()).default([]),
  requireSignedPackages: z.boolean().default(false),
  sandboxExecution: z.boolean().default(true),
  environmentVariableValidation: z.boolean().default(true)
});

const backupConfigSchema = z.object({
  enabled: z.boolean().default(true),
  directory: z.string().default(getBackupDir()),
  maxBackups: z.number().default(10),
  compression: z.boolean().default(true),
  encryption: z.boolean().default(false),
  autoCleanup: z.boolean().default(true),
  retentionDays: z.number().default(30)
});

const healthCheckConfigSchema = z.object({
  enabled: z.boolean().default(true),
  interval: z.number().default(60),
  timeout: z.number().default(30),
  retries: z.number().default(3),
  alertThreshold: z.number().default(3),
  checks: z.object({
    processHealth: z.boolean().default(true),
    networkHealth: z.boolean().default(true),
    configValidation: z.boolean().default(true),
    dependencyCheck: z.boolean().default(false),
    performanceMetrics: z.boolean().default(false)
  }).default({})
});

const loggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),
  file: z.string().optional(),
  maxSize: z.number().default(10),
  maxFiles: z.number().default(5),
  console: z.boolean().default(true),
  timestamp: z.boolean().default(true),
  colorize: z.boolean().default(true),
  json: z.boolean().default(false)
});

const userPreferencesSchema = z.object({
  favoriteServers: z.array(z.string()).default([]),
  hiddenServers: z.array(z.string()).default([]),
  customCategories: z.record(z.array(z.string())).default({}),
  defaultInstallOptions: z.object({
    transport: z.enum(['stdio', 'http', 'sse']).default('stdio'),
    scope: z.enum(['user', 'project', 'remote']).default('user'),
    autoBackup: z.boolean().default(true),
    installDependencies: z.boolean().default(true)
  }).default({}),
  editorIntegration: z.object({
    enabled: z.boolean().default(true),
    editor: z.string().default('code'),
    openOnInstall: z.boolean().default(false),
    openOnError: z.boolean().default(true)
  }).default({}),
  notifications: z.object({
    enabled: z.boolean().default(true),
    updateNotifications: z.boolean().default(true),
    healthCheckNotifications: z.boolean().default(false),
    errorNotifications: z.boolean().default(true)
  }).default({})
});

const cliConfigSchema = z.object({
  defaultAgent: z.enum(['claude', 'gemini', 'cursor', 'vscode', 'windsurf', 'cline', 'visual-studio']).optional(),
  defaultScope: z.enum(['user', 'project', 'remote']).default('user'),
  defaultTransport: z.enum(['stdio', 'http', 'sse']).default('stdio'),
  autoBackup: z.boolean().default(true),
  backupRetention: z.number().default(30),
  verboseLogging: z.boolean().default(false),
  colorOutput: z.boolean().default(true),
  updateCheckInterval: z.number().default(24),
  registrySource: z.string().default('builtin'),
  securitySettings: securityConfigSchema.default({}),
  editorCommand: z.string().optional()
});

const mcpBoxConfigSchema = z.object({
  version: z.string().default('1.0.0'),
  cli: cliConfigSchema.default({}),
  backup: backupConfigSchema.default({}),
  health: healthCheckConfigSchema.default({}),
  logging: loggingConfigSchema.default({}),
  preferences: userPreferencesSchema.default({}),
  security: securityConfigSchema.default({}),
  lastUpdated: z.string().default(() => new Date().toISOString())
});

export class MCPBoxConfigManager implements ConfigManager {
  private configPath: string;
  private config: MCPBoxConfig | null = null;

  constructor() {
    this.configPath = path.join(getMCPBoxConfigDir(), 'config.json');
  }

  /**
   * Load MCP Box configuration
   */
  async loadConfig(): Promise<MCPBoxConfig> {
    try {
      if (await pathExists(this.configPath)) {
        const configContent = await fs.readFile(this.configPath, 'utf-8');
        const rawConfig = JSON.parse(configContent);
        
        // Validate and apply defaults
        this.config = mcpBoxConfigSchema.parse(rawConfig);
      } else {
        // Create default config
        this.config = mcpBoxConfigSchema.parse({});
        await this.saveConfig(this.config);
      }
      
      return this.config;
    } catch (error) {
      throw new Error(`Failed to load MCP Box configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save MCP Box configuration
   */
  async saveConfig(config: MCPBoxConfig): Promise<void> {
    try {
      await ensureDir(path.dirname(this.configPath));
      
      // Update lastUpdated timestamp
      config.lastUpdated = new Date().toISOString();
      
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      this.config = config;
    } catch (error) {
      throw new Error(`Failed to save MCP Box configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate configuration
   */
  async validateConfig(config: MCPBoxConfig): Promise<ConfigValidationResult> {
    const result: ConfigValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      mcpBoxConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        result.valid = false;
        result.errors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
          severity: 'error' as const,
          fix: this.generateFixSuggestion(err) || undefined
        }));
      }
    }

    // Additional validations
    if (config.backup.maxBackups < 1) {
      result.warnings.push({
        path: 'backup.maxBackups',
        message: 'Maximum backups should be at least 1',
        code: 'MIN_BACKUPS',
        severity: 'warning',
        suggestion: 'Set maxBackups to at least 1'
      });
    }

    if (config.health.interval < 5) {
      result.warnings.push({
        path: 'health.interval',
        message: 'Health check interval is very frequent',
        code: 'FREQUENT_HEALTH_CHECK',
        severity: 'warning',
        suggestion: 'Consider increasing interval to at least 5 minutes'
      });
    }

    return result;
  }

  /**
   * Generate fix suggestions for validation errors
   */
  private generateFixSuggestion(error: z.ZodIssue): string | undefined {
    switch (error.code) {
      case 'invalid_type':
        return `Expected ${error.expected}, got ${error.received}`;
      case 'invalid_enum_value':
        return `Valid options: ${error.options?.join(', ')}`;
      case 'too_small':
        return `Minimum value: ${error.minimum}`;
      case 'too_big':
        return `Maximum value: ${error.maximum}`;
      default:
        return undefined;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig(): Promise<void> {
    this.config = mcpBoxConfigSchema.parse({});
    await this.saveConfig(this.config);
  }

  /**
   * Load agent configuration
   */
  async loadAgentConfig(agent: AgentType, scope: ConfigScope = 'user'): Promise<any> {
    const configPath = await findConfigFile(agent, scope);
    
    if (!configPath) {
      throw new Error(`Configuration file not found for ${agent} (scope: ${scope})`);
    }

    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      throw new Error(`Failed to load ${agent} configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save agent configuration
   */
  async saveAgentConfig(agent: AgentType, config: any, scope: ConfigScope = 'user'): Promise<void> {
    const configPath = getAgentConfigPath(agent, scope);
    
    try {
      await ensureDir(path.dirname(configPath));
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save ${agent} configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Merge agent configuration
   */
  async mergeAgentConfig(agent: AgentType, newConfig: any, scope: ConfigScope = 'user'): Promise<void> {
    try {
      let existingConfig = {};
      
      try {
        existingConfig = await this.loadAgentConfig(agent, scope);
      } catch {
        // Config doesn't exist, start with empty object
      }

      const mergedConfig = this.deepMerge(existingConfig, newConfig);
      await this.saveAgentConfig(agent, mergedConfig, scope);
    } catch (error) {
      throw new Error(`Failed to merge ${agent} configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Load project configuration
   */
  async loadProjectConfig(): Promise<ProjectConfig | null> {
    const projectConfigPath = path.join(process.cwd(), '.mcp-box.json');
    
    if (!(await pathExists(projectConfigPath))) {
      return null;
    }

    try {
      const configContent = await fs.readFile(projectConfigPath, 'utf-8');
      return JSON.parse(configContent) as ProjectConfig;
    } catch (error) {
      throw new Error(`Failed to load project configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save project configuration
   */
  async saveProjectConfig(config: ProjectConfig): Promise<void> {
    const projectConfigPath = path.join(process.cwd(), '.mcp-box.json');
    
    try {
      await fs.writeFile(projectConfigPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save project configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Initialize project configuration
   */
  async initProjectConfig(): Promise<void> {
    const projectConfig: ProjectConfig = {
      mcpBox: {
        version: '1.0.0',
        agents: {
          claude: { enabled: false, scope: 'project', servers: [] },
          gemini: { enabled: false, scope: 'project', servers: [] },
          cursor: { enabled: false, scope: 'project', servers: [] },
          vscode: { enabled: false, scope: 'project', servers: [] },
          windsurf: { enabled: false, scope: 'project', servers: [] },
          cline: { enabled: false, scope: 'project', servers: [] },
          'visual-studio': { enabled: false, scope: 'project', servers: [] }
        },
        sharedServers: [],
        environment: {}
      }
    };

    await this.saveProjectConfig(projectConfig);
  }

  /**
   * Create backup of configuration
   */
  async createBackup(agent: AgentType, scope: ConfigScope = 'user'): Promise<BackupResult> {
    const startTime = Date.now();
    
    try {
      const configPath = await findConfigFile(agent, scope);
      
      if (!configPath) {
        throw new Error(`Configuration file not found for ${agent} (scope: ${scope})`);
      }

      const config = await this.loadAgentConfig(agent, scope);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `${agent}-${scope}-${timestamp}`;
      const safeBackupId = createSafeFilename(backupId);
      const backupDir = getBackupDir();
      const backupPath = path.join(backupDir, `${safeBackupId}.json`);

      await ensureDir(backupDir);

      // Create backup metadata
      const metadata: BackupMetadata = {
        id: backupId,
        agent,
        scope,
        configPath,
        timestamp: new Date().toISOString(),
        checksum: this.calculateChecksum(JSON.stringify(config)),
        size: JSON.stringify(config).length,
        compressed: false,
        encrypted: false,
        version: '1.0.0'
      };

      // Save backup with metadata
      const backupData = {
        metadata,
        config
      };

      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

      return {
        success: true,
        backupId,
        filePath: backupPath,
        size: JSON.stringify(backupData).length,
        checksum: metadata.checksum,
        timeElapsed: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        backupId: '',
        filePath: '',
        size: 0,
        checksum: '',
        error: error instanceof Error ? error.message : String(error),
        timeElapsed: Date.now() - startTime
      };
    }
  }

  /**
   * Restore configuration from backup
   */
  async restoreBackup(backupId: string): Promise<RestoreResult> {
    const startTime = Date.now();
    
    try {
      const backupDir = getBackupDir();
      const safeBackupId = createSafeFilename(backupId);
      const backupPath = path.join(backupDir, `${safeBackupId}.json`);

      if (!(await pathExists(backupPath))) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      const backupContent = await fs.readFile(backupPath, 'utf-8');
      const backupData = JSON.parse(backupContent);
      const { metadata, config } = backupData;

      // Verify checksum
      const currentChecksum = this.calculateChecksum(JSON.stringify(config));
      if (currentChecksum !== metadata.checksum) {
        throw new Error('Backup integrity check failed');
      }

      // Check if current config differs
      let changesDetected = false;
      try {
        const currentConfig = await this.loadAgentConfig(metadata.agent, metadata.scope);
        changesDetected = JSON.stringify(currentConfig) !== JSON.stringify(config);
      } catch {
        changesDetected = true; // Config doesn't exist
      }

      // Restore configuration
      await this.saveAgentConfig(metadata.agent, config, metadata.scope);

      return {
        success: true,
        backupId,
        configPath: metadata.configPath,
        timeElapsed: Date.now() - startTime,
        changesDetected
      };
    } catch (error) {
      return {
        success: false,
        backupId,
        configPath: '',
        error: error instanceof Error ? error.message : String(error),
        timeElapsed: Date.now() - startTime,
        changesDetected: false
      };
    }
  }

  /**
   * Calculate simple checksum for integrity checking
   */
  private calculateChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Migration placeholder - not implemented yet
   */
  async migrateConfig(fromVersion: string, toVersion: string): Promise<void> {
    throw new Error('Configuration migration not yet implemented');
  }

  /**
   * Check if migration is needed
   */
  async checkMigrationNeeded(): Promise<boolean> {
    // For now, no migration is needed
    return false;
  }
}

// Export singleton instance
export const configManager = new MCPBoxConfigManager();