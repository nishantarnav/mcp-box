/**
 * VS Code (GitHub Copilot) Agent Adapter
 * Handles VS Code specific configuration format for MCP servers
 */

import { z } from 'zod';
import { BaseAgentAdapter } from './base.js';
import type {
  AgentType,
  AgentInfo,
  VSCodeConfig,
  BaseServerConfig,
  HttpServerConfig,
  TransportType
} from '../types/agents.d.js';

// VS Code server configuration schema
const vscodeServerConfigSchema = z.union([
  // Local (stdio) configuration
  z.object({
    type: z.literal('local'),
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    disabled: z.boolean().optional()
  }),
  // HTTP configuration
  z.object({
    type: z.literal('http'),
    url: z.string(),
    disabled: z.boolean().optional()
  }),
  // SSE configuration
  z.object({
    type: z.literal('sse'),
    url: z.string(),
    disabled: z.boolean().optional()
  })
]);

const vscodeConfigSchema = z.object({
  servers: z.record(vscodeServerConfigSchema)
});

export class VSCodeAdapter extends BaseAgentAdapter {
  readonly name: AgentType = 'vscode';
  readonly info: AgentInfo = {
    name: 'vscode',
    displayName: 'VS Code (GitHub Copilot)',
    configPath: 'mcp.json', // Via MCP: Open User Configuration command
    alternativePaths: ['.vscode/mcp.json'],
    schema: 'servers',
    supportedTransports: ['stdio', 'http', 'sse'],
    supportedScopes: ['user', 'project'],
    defaultScope: 'user',
    website: 'https://code.visualstudio.com'
  };

  protected getConfigSchema() {
    return vscodeConfigSchema;
  }

  protected transformServerConfig(
    serverId: string,
    serverConfig: BaseServerConfig | HttpServerConfig,
    transport: TransportType
  ): any {
    if (transport === 'http' && 'url' in serverConfig) {
      return {
        type: 'http',
        url: serverConfig.url,
        disabled: false
      };
    }
    
    if (transport === 'sse' && 'url' in serverConfig) {
      return {
        type: 'sse',
        url: serverConfig.url,
        disabled: false
      };
    }
    
    // Default to local (stdio) configuration
    const stdioConfig = serverConfig as BaseServerConfig;
    return {
      type: 'local',
      command: stdioConfig.command || 'npx',
      args: stdioConfig.args || ['-y', `@modelcontextprotocol/server-${serverId}`],
      env: stdioConfig.env || {},
      disabled: false
    };
  }

  protected extractServers(config: VSCodeConfig): Record<string, any> {
    return config.servers || {};
  }

  protected createConfigWithServers(servers: Record<string, any>): VSCodeConfig {
    return {
      servers
    };
  }

  /**
   * VS Code-specific server validation
   */
  private validateVSCodeServer(serverId: string, serverConfig: any): string[] {
    const errors: string[] = [];
    
    if (!serverConfig.type) {
      errors.push(`Server ${serverId} must specify a type (local, http, or sse)`);
      return errors;
    }
    
    switch (serverConfig.type) {
      case 'local':
        if (!serverConfig.command) {
          errors.push(`Local server ${serverId} must specify a command`);
        }
        if (serverConfig.args && !Array.isArray(serverConfig.args)) {
          errors.push(`Invalid args format for server ${serverId} (must be array)`);
        }
        if (serverConfig.env && typeof serverConfig.env !== 'object') {
          errors.push(`Invalid env format for server ${serverId} (must be object)`);
        }
        break;
        
      case 'http':
      case 'sse':
        if (!serverConfig.url) {
          errors.push(`${serverConfig.type.toUpperCase()} server ${serverId} must specify a URL`);
        } else {
          try {
            new URL(serverConfig.url);
          } catch {
            errors.push(`Invalid URL for server ${serverId}: ${serverConfig.url}`);
          }
        }
        break;
        
      default:
        errors.push(`Invalid server type for ${serverId}: ${serverConfig.type}. Must be 'local', 'http', or 'sse'`);
    }
    
    return errors;
  }

  /**
   * Enhanced validation for VS Code configuration
   */
  async validate(config: VSCodeConfig): Promise<import('../types/agents.d.js').ValidationResult> {
    const baseResult = await super.validate(config as any);
    
    if (!baseResult.valid) {
      return baseResult;
    }
    
    // Additional VS Code-specific validation
    const servers = this.extractServers(config);
    
    for (const [serverId, serverConfig] of Object.entries(servers)) {
      const serverErrors = this.validateVSCodeServer(serverId, serverConfig);
      
      for (const error of serverErrors) {
        baseResult.errors.push({
          path: `servers.${serverId}`,
          message: error,
          code: 'INVALID_SERVER_CONFIG',
          severity: 'error'
        });
      }
    }
    
    if (baseResult.errors.length > 0) {
      baseResult.valid = false;
    }
    
    // Add warnings for common issues
    for (const [serverId, serverConfig] of Object.entries(servers)) {
      // Check for disabled servers
      if (serverConfig.disabled) {
        baseResult.warnings.push({
          path: `servers.${serverId}`,
          message: 'Server is disabled',
          code: 'DISABLED_SERVER',
          severity: 'warning'
        });
      }
      
      // Check for secrets in environment variables
      if (serverConfig.env) {
        const envKeys = Object.keys(serverConfig.env);
        const secretKeys = envKeys.filter(key => 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('key') || 
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('password')
        );
        
        for (const secretKey of secretKeys) {
          const value = serverConfig.env[secretKey];
          if (value && !value.startsWith('${input:')) {
            baseResult.warnings.push({
              path: `servers.${serverId}.env.${secretKey}`,
              message: 'Consider using VS Code input variables for secrets (${input:variableName})',
              code: 'PLAINTEXT_SECRET',
              severity: 'warning'
            });
          }
        }
      }
    }
    
    return baseResult;
  }

  /**
   * Convert from other agent formats to VS Code format
   */
  async importFromAgent(sourceConfig: any, sourceAgent: AgentType): Promise<VSCodeConfig> {
    const servers: Record<string, any> = {};
    
    switch (sourceAgent) {
      case 'claude':
      case 'cursor':
      case 'gemini':
      case 'cline':
      case 'windsurf':
        // These agents use mcpServers format
        const sourceServers = sourceConfig.mcpServers || sourceConfig.servers || {};
        
        for (const [serverId, serverConfig] of Object.entries(sourceServers)) {
          servers[serverId] = this.normalizeServerConfig(serverConfig as any);
        }
        break;
    }
    
    return this.createConfigWithServers(servers);
  }

  /**
   * Normalize server configuration to VS Code format
   */
  private normalizeServerConfig(serverConfig: any): any {
    // If it has serverUrl or url, determine if it's HTTP or SSE
    if (serverConfig.serverUrl || serverConfig.url) {
      const url = serverConfig.serverUrl || serverConfig.url;
      
      // Simple heuristic: if URL contains 'sse' or ends with '/events', treat as SSE
      const isSSE = url.includes('sse') || url.endsWith('/events') || url.includes('/stream');
      
      return {
        type: isSSE ? 'sse' : 'http',
        url: url,
        disabled: serverConfig.disabled || false
      };
    }
    
    // Convert to local (stdio) format
    return {
      type: 'local',
      command: serverConfig.command || 'npx',
      args: serverConfig.args || [],
      env: serverConfig.env || {},
      disabled: serverConfig.disabled || false
    };
  }

  /**
   * Enable/disable a server
   */
  async toggleServer(serverId: string, enabled: boolean, scope: 'user' | 'project' = 'user'): Promise<void> {
    try {
      const config = await this.read(scope) as VSCodeConfig;
      const servers = this.extractServers(config);
      
      if (servers[serverId]) {
        servers[serverId].disabled = !enabled;
        
        const newConfig = this.createConfigWithServers(servers);
        await this.write(newConfig, scope);
      } else {
        throw new Error(`Server ${serverId} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to toggle server ${serverId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get VS Code-specific configuration recommendations
   */
  getConfigRecommendations(): string[] {
    return [
      'Use VS Code input variables (${input:variableName}) for sensitive data',
      'Prefer the "local" type for npm-based MCP servers',
      'Use "http" type for remote MCP servers with REST APIs',
      'Use "sse" type for streaming server-sent events',
      'Test configurations with VS Code MCP extension before deployment',
      'Use project-scope (.vscode/mcp.json) for team configurations'
    ];
  }

  /**
   * Get list of disabled servers
   */
  async getDisabledServers(scope: 'user' | 'project' = 'user'): Promise<string[]> {
    try {
      const config = await this.read(scope) as VSCodeConfig;
      const servers = this.extractServers(config);
      
      return Object.entries(servers)
        .filter(([, serverConfig]) => serverConfig.disabled)
        .map(([serverId]) => serverId);
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const vscodeAdapter = new VSCodeAdapter();