/**
 * Configuration Management Utilities
 * Handles reading, writing, merging, and validating configuration files
 */
import type { MCPBoxConfig, ConfigManager, ConfigValidationResult, BackupResult, RestoreResult, ProjectConfig } from '../types/config.d.js';
import type { AgentType, ConfigScope } from '../types/agents.d.js';
export declare class MCPBoxConfigManager implements ConfigManager {
    private configPath;
    private config;
    constructor();
    /**
     * Load MCP Box configuration
     */
    loadConfig(): Promise<MCPBoxConfig>;
    /**
     * Save MCP Box configuration
     */
    saveConfig(config: MCPBoxConfig): Promise<void>;
    /**
     * Validate configuration
     */
    validateConfig(config: MCPBoxConfig): Promise<ConfigValidationResult>;
    /**
     * Generate fix suggestions for validation errors
     */
    private generateFixSuggestion;
    /**
     * Reset configuration to defaults
     */
    resetConfig(): Promise<void>;
    /**
     * Load agent configuration
     */
    loadAgentConfig(agent: AgentType, scope?: ConfigScope): Promise<any>;
    /**
     * Save agent configuration
     */
    saveAgentConfig(agent: AgentType, config: any, scope?: ConfigScope): Promise<void>;
    /**
     * Merge agent configuration
     */
    mergeAgentConfig(agent: AgentType, newConfig: any, scope?: ConfigScope): Promise<void>;
    /**
     * Deep merge objects
     */
    private deepMerge;
    /**
     * Load project configuration
     */
    loadProjectConfig(): Promise<ProjectConfig | null>;
    /**
     * Save project configuration
     */
    saveProjectConfig(config: ProjectConfig): Promise<void>;
    /**
     * Initialize project configuration
     */
    initProjectConfig(): Promise<void>;
    /**
     * Create backup of configuration
     */
    createBackup(agent: AgentType, scope?: ConfigScope): Promise<BackupResult>;
    /**
     * Restore configuration from backup
     */
    restoreBackup(backupId: string): Promise<RestoreResult>;
    /**
     * Calculate simple checksum for integrity checking
     */
    private calculateChecksum;
    /**
     * Migration placeholder - not implemented yet
     */
    migrateConfig(fromVersion: string, toVersion: string): Promise<void>;
    /**
     * Check if migration is needed
     */
    checkMigrationNeeded(): Promise<boolean>;
}
export declare const configManager: MCPBoxConfigManager;
//# sourceMappingURL=config.d.ts.map