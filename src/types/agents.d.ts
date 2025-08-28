/**
 * Agent-specific type definitions for MCP Box CLI tool
 * Defines interfaces for all supported AI coding agents and their configuration schemas
 */

// Supported AI coding agents
export type AgentType = 
  | 'claude' 
  | 'gemini' 
  | 'cursor' 
  | 'vscode' 
  | 'windsurf'
  | 'cline'
  | 'visual-studio';

// Transport types supported by MCP servers
export type TransportType = 'stdio' | 'http' | 'sse';

// Configuration scope types
export type ConfigScope = 'user' | 'project' | 'remote';

// Server status types
export type ServerStatus = 'active' | 'inactive' | 'error' | 'unknown';

// Base configuration interface
export interface BaseServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: TransportType;
}

// HTTP-specific configuration
export interface HttpServerConfig {
  url: string;
  serverUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

// Claude Desktop configuration schema
export interface ClaudeConfig {
  mcpServers: {
    [serverId: string]: BaseServerConfig | HttpServerConfig;
  };
}

// Gemini CLI configuration schema
export interface GeminiConfig {
  mcpServers: {
    [serverId: string]: BaseServerConfig & {
      type?: 'local' | 'remote';
    };
  };
}

// Cursor configuration schema
export interface CursorConfig {
  mcpServers: {
    [serverId: string]: BaseServerConfig & {
      transport?: TransportType;
      disabled?: boolean;
    };
  };
}

// VS Code configuration schema
export interface VSCodeConfig {
  servers: {
    [serverId: string]: {
      type: 'local' | 'http' | 'sse';
      command?: string;
      args?: string[];
      env?: Record<string, string>;
      url?: string;
      disabled?: boolean;
    };
  };
}

// Windsurf configuration schema
export interface WindsurfConfig {
  mcpServers: {
    [serverId: string]: BaseServerConfig | {
      serverUrl: string;
      headers?: Record<string, string>;
    };
  };
}

// Union type for all agent configurations
export type AgentConfig = ClaudeConfig | GeminiConfig | CursorConfig | VSCodeConfig | WindsurfConfig;

// Agent information interface
export interface AgentInfo {
  name: string;
  displayName: string;
  configPath: string;
  alternativePaths?: string[];
  schema: string;
  supportedTransports: TransportType[];
  supportedScopes: ConfigScope[];
  defaultScope: ConfigScope;
  website?: string;
}

// Agent adapter interface
export interface AgentAdapter {
  name: AgentType;
  info: AgentInfo;
  
  // Configuration management
  getConfigPath(scope?: ConfigScope): string;
  read(scope?: ConfigScope): Promise<AgentConfig>;
  write(config: AgentConfig, scope?: ConfigScope): Promise<void>;
  validate(config: AgentConfig): Promise<ValidationResult>;
  
  // Backup management
  backup(scope?: ConfigScope): Promise<string>;
  restore(backupPath: string, scope?: ConfigScope): Promise<void>;
  
  // Server management
  addServer(serverId: string, serverConfig: BaseServerConfig | HttpServerConfig, scope?: ConfigScope): Promise<void>;
  removeServer(serverId: string, scope?: ConfigScope): Promise<void>;
  updateServer(serverId: string, serverConfig: BaseServerConfig | HttpServerConfig, scope?: ConfigScope): Promise<void>;
  
  // Status management
  isInstalled(): Promise<boolean>;
  getInstalledServers(scope?: ConfigScope): Promise<string[]>;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  severity: 'error';
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
  severity: 'warning';
}

// Agent detection result
export interface AgentDetectionResult {
  agent: AgentType;
  configPath: string;
  scope: ConfigScope;
  exists: boolean;
  readable: boolean;
  writable: boolean;
}

// Cross-platform path configuration
export interface PlatformPaths {
  windows: string;
  macos: string;
  linux: string;
}

// Agent metadata for detection and configuration
export const AGENT_METADATA: Record<AgentType, AgentInfo> = {
  claude: {
    name: 'claude',
    displayName: 'Claude Desktop',
    configPath: '~/.claude/settings.json',
    schema: 'mcpServers',
    supportedTransports: ['stdio', 'http'],
    supportedScopes: ['user', 'project'],
    defaultScope: 'user',
    website: 'https://claude.ai'
  },
  gemini: {
    name: 'gemini',
    displayName: 'Gemini CLI/Code Assist',
    configPath: '~/.gemini/settings.json',
    schema: 'mcpServers',
    supportedTransports: ['stdio', 'http'],
    supportedScopes: ['user', 'project'],
    defaultScope: 'user',
    website: 'https://gemini.google.com'
  },
  cursor: {
    name: 'cursor',
    displayName: 'Cursor IDE',
    configPath: '~/.cursor/mcp.json',
    alternativePaths: ['.cursor/mcp.json'],
    schema: 'mcpServers',
    supportedTransports: ['stdio', 'http', 'sse'],
    supportedScopes: ['user', 'project'],
    defaultScope: 'user',
    website: 'https://cursor.sh'
  },
  vscode: {
    name: 'vscode',
    displayName: 'VS Code (GitHub Copilot)',
    configPath: 'mcp.json', // Via MCP: Open User Configuration
    alternativePaths: ['.vscode/mcp.json'],
    schema: 'servers',
    supportedTransports: ['stdio', 'http', 'sse'],
    supportedScopes: ['user', 'project'],
    defaultScope: 'user',
    website: 'https://code.visualstudio.com'
  },
  windsurf: {
    name: 'windsurf',
    displayName: 'Windsurf (Codeium Cascade)',
    configPath: '~/.codeium/windsurf/mcp_config.json',
    schema: 'mcpServers',
    supportedTransports: ['stdio', 'http'],
    supportedScopes: ['user'],
    defaultScope: 'user',
    website: 'https://codeium.com/windsurf'
  },
  cline: {
    name: 'cline',
    displayName: 'Cline',
    configPath: '~/.cline/mcp.json',
    schema: 'mcpServers',
    supportedTransports: ['stdio', 'http'],
    supportedScopes: ['user', 'project'],
    defaultScope: 'user'
  },
  'visual-studio': {
    name: 'visual-studio',
    displayName: 'Visual Studio',
    configPath: '%APPDATA%/Microsoft/VisualStudio/mcp.json',
    schema: 'mcpServers',
    supportedTransports: ['stdio', 'http'],
    supportedScopes: ['user'],
    defaultScope: 'user',
    website: 'https://visualstudio.microsoft.com'
  }
};