/**
 * Base Agent Adapter
 * Provides common functionality for all agent-specific adapters
 */
import { z } from 'zod';
import type { AgentAdapter, AgentType, AgentInfo, AgentConfig, ConfigScope, ValidationResult, BaseServerConfig, TransportType } from '../types/agents.d.js';
export declare abstract class BaseAgentAdapter implements AgentAdapter {
    abstract readonly name: AgentType;
    abstract readonly info: AgentInfo;
    /**
     * Get the schema for validating configuration
     */
    protected abstract getConfigSchema(): z.ZodSchema<any>;
    /**
     * Transform server config to agent-specific format
     */
    protected abstract transformServerConfig(serverId: string, serverConfig: BaseServerConfig, transport: TransportType): any;
    /**
     * Extract servers from agent configuration
     */
    protected abstract extractServers(config: AgentConfig): Record<string, any>;
    /**
     * Create new agent configuration with servers
     */
    protected abstract createConfigWithServers(servers: Record<string, any>): AgentConfig;
    /**
     * Get configuration file path
     */
    getConfigPath(scope?: ConfigScope): string;
    /**
     * Read agent configuration
     */
    read(scope?: ConfigScope): Promise<AgentConfig>;
    /**
     * Write agent configuration
     */
    write(config: AgentConfig, scope?: ConfigScope): Promise<void>;
    /**
     * Validate agent configuration
     */
    validate(config: AgentConfig): Promise<ValidationResult>;
    /**
     * Create backup of current configuration
     */
    backup(scope?: ConfigScope): Promise<string>;
    /**
     * Restore configuration from backup
     */
    restore(backupPath: string, scope?: ConfigScope): Promise<void>;
    /**
     * Add server to configuration
     */
    addServer(serverId: string, serverConfig: BaseServerConfig, scope?: ConfigScope): Promise<void>;
    /**
     * Remove server from configuration
     */
    removeServer(serverId: string, scope?: ConfigScope): Promise<void>;
    /**
     * Update server configuration
     */
    updateServer(serverId: string, serverConfig: BaseServerConfig, scope?: ConfigScope): Promise<void>;
    /**
     * Check if agent is installed (configuration file exists)
     */
    isInstalled(): Promise<boolean>;
    /**
     * Get list of installed servers
     */
    getInstalledServers(scope?: ConfigScope): Promise<string[]>;
    /**
     * Check configuration file permissions
     */
    checkPermissions(scope?: ConfigScope): Promise<{
        exists: boolean;
        readable: boolean;
        writable: boolean;
        path: string;
    }>;
    /**
     * Get configuration file stats
     */
    getConfigStats(scope?: ConfigScope): Promise<{
        path: string;
        exists: boolean;
        size?: number;
        modified?: Date;
        serverCount: number;
    }>;
    /**
     * Merge another configuration into this one
     */
    mergeConfig(sourceConfig: AgentConfig, scope?: ConfigScope, overwrite?: boolean): Promise<void>;
    /**
     * Export configuration for sharing or backup
     */
    exportConfig(scope?: ConfigScope): Promise<AgentConfig>;
    /**
     * Import configuration from external source
     */
    importConfig(config: AgentConfig, scope?: ConfigScope, merge?: boolean): Promise<void>;
}
//# sourceMappingURL=base.d.ts.map