/**
 * Claude Desktop Agent Adapter
 * Handles Claude Desktop specific configuration format
 */

import { z } from 'zod';
import { BaseAgentAdapter } from './base.js';
import type {
  AgentType,
  AgentInfo,
  ClaudeConfig,
  BaseServerConfig,
  HttpServerConfig,
  TransportType
} from '../types/agents.d.js';

// Claude configuration schema
const claudeServerConfigSchema = z.union([
  // stdio configuration
  z.object({
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional()
  }),
  // HTTP configuration
  z.object({
    serverUrl: z.string()
  })
]);

const claudeConfigSchema = z.object({
  mcpServers: z.record(claudeServerConfigSchema)
});

export class ClaudeAdapter extends BaseAgentAdapter {
  readonly name: AgentType = 'claude';
  readonly info: AgentInfo = {
    name: 'claude',
    displayName: 'Claude Desktop',
    configPath: '~/.claude/settings.json',
    schema: 'mcpServers',
    supportedTransports: ['stdio', 'http'],
    supportedScopes: ['user', 'project'],
    defaultScope: 'user',
    website: 'https://claude.ai'
  };

  protected getConfigSchema() {
    return claudeConfigSchema;
  }

  protected transformServerConfig(
    serverId: string,
    serverConfig: BaseServerConfig | HttpServerConfig,
    transport: TransportType
  ): any {
    if (transport === 'http' && 'url' in serverConfig) {
      return {
        serverUrl: serverConfig.url
      };
    }
    
    // Default to stdio configuration
    const stdioConfig = serverConfig as BaseServerConfig;
    return {
      command: stdioConfig.command || 'npx',
      args: stdioConfig.args || ['-y', `@modelcontextprotocol/server-${serverId}`],
      env: stdioConfig.env || {}
    };
  }

  protected extractServers(config: ClaudeConfig): Record<string, any> {
    return config.mcpServers || {};
  }

  protected createConfigWithServers(servers: Record<string, any>): ClaudeConfig {
    return {
      mcpServers: servers
    };
  }

  /**
   * Claude-specific server validation
   */
  private validateClaudeServer(serverId: string, serverConfig: any): string[] {
    const errors: string[] = [];
    
    if (serverConfig.serverUrl) {
      // HTTP configuration
      try {
        new URL(serverConfig.serverUrl);
      } catch {
        errors.push(`Invalid server URL for ${serverId}: ${serverConfig.serverUrl}`);
      }
    } else if (serverConfig.command) {
      // stdio configuration
      if (!serverConfig.command.trim()) {
        errors.push(`Empty command for server ${serverId}`);
      }
      
      if (serverConfig.args && !Array.isArray(serverConfig.args)) {
        errors.push(`Invalid args format for server ${serverId} (must be array)`);
      }
      
      if (serverConfig.env && typeof serverConfig.env !== 'object') {
        errors.push(`Invalid env format for server ${serverId} (must be object)`);
      }
    } else {
      errors.push(`Server ${serverId} must have either 'command' or 'serverUrl'`);
    }
    
    return errors;
  }

  /**
   * Enhanced validation for Claude configuration
   */
  async validate(config: ClaudeConfig): Promise<import('../types/agents.d.js').ValidationResult> {
    const baseResult = await super.validate(config);
    
    if (!baseResult.valid) {
      return baseResult;
    }
    
    // Additional Claude-specific validation
    const servers = this.extractServers(config);
    
    for (const [serverId, serverConfig] of Object.entries(servers)) {
      const serverErrors = this.validateClaudeServer(serverId, serverConfig);
      
      for (const error of serverErrors) {
        baseResult.errors.push({
          path: `mcpServers.${serverId}`,
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
          if (value && !value.startsWith('${') && !value.startsWith('$env:')) {
            baseResult.warnings.push({
              path: `mcpServers.${serverId}.env.${secretKey}`,
              message: 'Secret value detected in plain text. Consider using environment variables.',
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
   * Convert from other agent formats to Claude format
   */
  async importFromAgent(sourceConfig: any, sourceAgent: AgentType): Promise<ClaudeConfig> {
    const servers: Record<string, any> = {};
    
    switch (sourceAgent) {
      case 'cursor':
      case 'gemini':
      case 'cline':
        // These agents use similar mcpServers format
        if (sourceConfig.mcpServers) {
          for (const [serverId, serverConfig] of Object.entries(sourceConfig.mcpServers)) {
            servers[serverId] = this.normalizeServerConfig(serverConfig as any);
          }
        }
        break;
        
      case 'vscode':
        // VS Code uses 'servers' instead of 'mcpServers'
        if (sourceConfig.servers) {
          for (const [serverId, serverConfig] of Object.entries(sourceConfig.servers)) {
            servers[serverId] = this.normalizeServerConfig(serverConfig as any);
          }
        }
        break;
        
      case 'windsurf':
        // Windsurf uses mcpServers like Claude
        if (sourceConfig.mcpServers) {
          for (const [serverId, serverConfig] of Object.entries(sourceConfig.mcpServers)) {
            servers[serverId] = this.normalizeServerConfig(serverConfig as any);
          }
        }
        break;
    }
    
    return this.createConfigWithServers(servers);
  }

  /**
   * Normalize server configuration to Claude format
   */
  private normalizeServerConfig(serverConfig: any): any {
    // If it has serverUrl or url, convert to HTTP format
    if (serverConfig.serverUrl || serverConfig.url) {
      return {
        serverUrl: serverConfig.serverUrl || serverConfig.url
      };
    }
    
    // Convert to stdio format
    return {
      command: serverConfig.command || 'npx',
      args: serverConfig.args || [],
      env: serverConfig.env || {}
    };
  }

  /**
   * Get Claude-specific configuration recommendations
   */
  getConfigRecommendations(): string[] {
    return [
      'Use environment variables for secrets instead of plain text',
      'Prefer official MCP servers from @modelcontextprotocol packages',
      'Test server configurations with "mcp-box doctor" before deployment',
      'Keep backup of working configurations before making changes',
      'Use project-scope configurations for team sharing'
    ];
  }
}

// Export singleton instance
export const claudeAdapter = new ClaudeAdapter();