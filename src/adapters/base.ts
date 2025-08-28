/**
 * Base Agent Adapter
 * Provides common functionality for all agent-specific adapters
 */

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import type {
  AgentAdapter,
  AgentType,
  AgentInfo,
  AgentConfig,
  ConfigScope,
  ValidationResult,
  BaseServerConfig,
  TransportType
} from '../types/agents.d.js';
import {
  getAgentConfigPath,
  findConfigFile,
  ensureDir,
  pathExists,
  isReadable,
  isWritable
} from '../utils/paths.js';
import { configManager } from '../utils/config.js';

export abstract class BaseAgentAdapter implements AgentAdapter {
  abstract readonly name: AgentType;
  abstract readonly info: AgentInfo;
  
  /**
   * Get the schema for validating configuration
   */
  protected abstract getConfigSchema(): z.ZodSchema<any>;
  
  /**
   * Transform server config to agent-specific format
   */
  protected abstract transformServerConfig(
    serverId: string, 
    serverConfig: BaseServerConfig, 
    transport: TransportType
  ): any;
  
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
  getConfigPath(scope: ConfigScope = 'user'): string {
    return getAgentConfigPath(this.name, scope);
  }

  /**
   * Read agent configuration
   */
  async read(scope: ConfigScope = 'user'): Promise<AgentConfig> {
    const configPath = await findConfigFile(this.name, scope);
    
    if (!configPath) {
      // Return empty configuration if file doesn't exist
      return this.createConfigWithServers({});
    }

    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      
      // Handle empty files
      if (!configContent.trim()) {
        return this.createConfigWithServers({});
      }
      
      const config = JSON.parse(configContent);
      
      // Validate configuration
      const validationResult = await this.validate(config);
      if (!validationResult.valid) {
        const errors = validationResult.errors.map(e => e.message).join(', ');
        throw new Error(`Invalid configuration: ${errors}`);
      }
      
      return config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return this.createConfigWithServers({});
      }
      throw new Error(`Failed to read configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Write agent configuration
   */
  async write(config: AgentConfig, scope: ConfigScope = 'user'): Promise<void> {
    const configPath = this.getConfigPath(scope);
    
    try {
      // Validate configuration before writing
      const validationResult = await this.validate(config);
      if (!validationResult.valid) {
        const errors = validationResult.errors.map(e => e.message).join(', ');
        throw new Error(`Invalid configuration: ${errors}`);
      }
      
      // Ensure directory exists
      await ensureDir(path.dirname(configPath));
      
      // Write configuration with proper formatting
      const configJson = JSON.stringify(config, null, 2);
      await fs.writeFile(configPath, configJson);
      
    } catch (error) {
      throw new Error(`Failed to write configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate agent configuration
   */
  async validate(config: AgentConfig): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    try {
      const schema = this.getConfigSchema();
      schema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        result.valid = false;
        result.errors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
          severity: 'error' as const
        }));
      } else {
        result.valid = false;
        result.errors.push({
          path: '',
          message: error instanceof Error ? error.message : String(error),
          code: 'UNKNOWN_ERROR',
          severity: 'error'
        });
      }
    }

    return result;
  }

  /**
   * Create backup of current configuration
   */
  async backup(scope: ConfigScope = 'user'): Promise<string> {
    const backupResult = await configManager.createBackup(this.name, scope);
    
    if (!backupResult.success) {
      throw new Error(`Failed to create backup: ${backupResult.error}`);
    }
    
    return backupResult.filePath;
  }

  /**
   * Restore configuration from backup
   */
  async restore(backupPath: string, scope: ConfigScope = 'user'): Promise<void> {
    const backupId = path.basename(backupPath, '.json');
    const restoreResult = await configManager.restoreBackup(backupId);
    
    if (!restoreResult.success) {
      throw new Error(`Failed to restore backup: ${restoreResult.error}`);
    }
  }

  /**
   * Add server to configuration
   */
  async addServer(
    serverId: string, 
    serverConfig: BaseServerConfig, 
    scope: ConfigScope = 'user'
  ): Promise<void> {
    try {
      // Read current configuration
      const config = await this.read(scope);
      const servers = this.extractServers(config);
      
      // Transform server config to agent-specific format
      const transport = serverConfig.transport || 'stdio';
      const transformedConfig = this.transformServerConfig(serverId, serverConfig, transport);
      
      // Add or update server
      servers[serverId] = transformedConfig;
      
      // Create new configuration
      const newConfig = this.createConfigWithServers(servers);
      
      // Write configuration
      await this.write(newConfig, scope);
      
    } catch (error) {
      throw new Error(`Failed to add server ${serverId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove server from configuration
   */
  async removeServer(serverId: string, scope: ConfigScope = 'user'): Promise<void> {
    try {
      // Read current configuration
      const config = await this.read(scope);
      const servers = this.extractServers(config);
      
      // Remove server if it exists
      if (servers[serverId]) {
        delete servers[serverId];
        
        // Create new configuration
        const newConfig = this.createConfigWithServers(servers);
        
        // Write configuration
        await this.write(newConfig, scope);
      }
      
    } catch (error) {
      throw new Error(`Failed to remove server ${serverId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update server configuration
   */
  async updateServer(
    serverId: string, 
    serverConfig: BaseServerConfig, 
    scope: ConfigScope = 'user'
  ): Promise<void> {
    // For now, update is the same as add
    await this.addServer(serverId, serverConfig, scope);
  }

  /**
   * Check if agent is installed (configuration file exists)
   */
  async isInstalled(): Promise<boolean> {
    const userConfigPath = await findConfigFile(this.name, 'user');
    const projectConfigPath = await findConfigFile(this.name, 'project');
    
    return !!(userConfigPath || projectConfigPath);
  }

  /**
   * Get list of installed servers
   */
  async getInstalledServers(scope: ConfigScope = 'user'): Promise<string[]> {
    try {
      const config = await this.read(scope);
      const servers = this.extractServers(config);
      return Object.keys(servers);
    } catch {
      return [];
    }
  }

  /**
   * Check configuration file permissions
   */
  async checkPermissions(scope: ConfigScope = 'user'): Promise<{
    exists: boolean;
    readable: boolean;
    writable: boolean;
    path: string;
  }> {
    const configPath = this.getConfigPath(scope);
    const exists = await pathExists(configPath);
    
    return {
      exists,
      readable: exists ? await isReadable(configPath) : false,
      writable: exists ? await isWritable(configPath) : await isWritable(path.dirname(configPath)),
      path: configPath
    };
  }

  /**
   * Get configuration file stats
   */
  async getConfigStats(scope: ConfigScope = 'user'): Promise<{
    path: string;
    exists: boolean;
    size?: number;
    modified?: Date;
    serverCount: number;
  }> {
    const configPath = this.getConfigPath(scope);
    const exists = await pathExists(configPath);
    
    let size: number | undefined;
    let modified: Date | undefined;
    let serverCount = 0;
    
    if (exists) {
      try {
        const stats = await fs.stat(configPath);
        size = stats.size;
        modified = stats.mtime;
        
        const servers = await this.getInstalledServers(scope);
        serverCount = servers.length;
      } catch {
        // Ignore errors
      }
    }
    
    return {
      path: configPath,
      exists,
      size: size,
      modified: modified,
      serverCount
    };
  }

  /**
   * Merge another configuration into this one
   */
  async mergeConfig(
    sourceConfig: AgentConfig, 
    scope: ConfigScope = 'user',
    overwrite = false
  ): Promise<void> {
    try {
      const currentConfig = await this.read(scope);
      const currentServers = this.extractServers(currentConfig);
      const sourceServers = this.extractServers(sourceConfig);
      
      // Merge servers
      const mergedServers = { ...currentServers };
      
      for (const [serverId, serverConfig] of Object.entries(sourceServers)) {
        if (!mergedServers[serverId] || overwrite) {
          mergedServers[serverId] = serverConfig;
        }
      }
      
      // Create and write new configuration
      const newConfig = this.createConfigWithServers(mergedServers);
      await this.write(newConfig, scope);
      
    } catch (error) {
      throw new Error(`Failed to merge configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export configuration for sharing or backup
   */
  async exportConfig(scope: ConfigScope = 'user'): Promise<AgentConfig> {
    return await this.read(scope);
  }

  /**
   * Import configuration from external source
   */
  async importConfig(config: AgentConfig, scope: ConfigScope = 'user', merge = true): Promise<void> {
    if (merge) {
      await this.mergeConfig(config, scope, false);
    } else {
      await this.write(config, scope);
    }
  }
}