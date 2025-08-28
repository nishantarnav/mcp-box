/**
 * Registry type definitions for MCP Box CLI tool
 * Defines interfaces for MCP server registry, search, and management
 */

import type { TransportType, AgentType } from './agents.d.js';

export type { TransportType, AgentType };

// MCP Server classification types
export type ServerClassification = 'official' | 'community' | 'reference';

// Installation method types
export type InstallMethod = 'npm' | 'docker' | 'manual' | 'binary';

// Server maintenance status
export type MaintenanceStatus = 'active' | 'deprecated' | 'archived';

// Health check status
export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown' | 'timeout';

// Installation configuration for different methods
export interface InstallConfig {
  npm?: string;
  docker?: string;
  manual?: string;
  binary?: string;
}

// Default server configuration for different transports
export interface DefaultServerConfig {
  stdio?: {
    command: string;
    args: string[];
  };
  http?: {
    url: string;
    headers?: Record<string, string>;
  };
  sse?: {
    url: string;
    headers?: Record<string, string>;
  };
}

// MCP Server definition interface
export interface MCPServer {
  // Basic identification
  id: string;
  name: string;
  title: string;
  description: string;
  
  // Source and classification
  source: string;
  githubUrl: string;
  website?: string;
  classification: ServerClassification;
  maintainer: string;
  license?: string;
  
  // Popularity and metrics
  estWeeklyDownloads: string;
  lastUpdated: string;
  maintenanceStatus?: MaintenanceStatus;
  
  // Platform and transport support
  supportedPlatforms: AgentType[];
  transportTypes: TransportType[];
  
  // Installation configuration
  install: InstallConfig;
  npmPackage?: string;
  dockerSupport: boolean;
  
  // Default configurations
  default: DefaultServerConfig;
  
  // Environment and dependencies
  env?: string[];
  dependencies?: string[];
  
  // Categorization and search
  tags: string[];
  category?: string;
  subcategory?: string;
  
  // Additional metadata
  documentation?: string;
  examples?: string[];
  compatibility?: {
    nodeVersion?: string;
    pythonVersion?: string;
    dockerVersion?: string;
  };
}

// Registry metadata
export interface RegistryMetadata {
  version: string;
  lastUpdated: string;
  totalServers: number;
  sources: string[];
  classifications: Record<ServerClassification, number>;
  categories: string[];
  tags: string[];
}

// MCP Server registry interface
export interface MCPRegistry {
  metadata: RegistryMetadata;
  servers: MCPServer[];
}

// Search and filter interfaces
export interface SearchFilters {
  query?: string;
  tags?: string[];
  classification?: ServerClassification[];
  transportTypes?: TransportType[];
  supportedPlatforms?: AgentType[];
  maintainer?: string;
  category?: string;
  license?: string;
  minDownloads?: number;
  dockerSupport?: boolean;
  hasNpmPackage?: boolean;
}

export interface SearchOptions {
  fuzzy?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'downloads' | 'name' | 'updated';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  server: MCPServer;
  score: number;
  matchedFields: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  filters: SearchFilters;
  query: string;
}

// Server installation status
export interface ServerInstallStatus {
  serverId: string;
  installed: boolean;
  agents: AgentType[];
  transport: TransportType;
  scope: 'user' | 'project';
  version?: string;
  installMethod?: InstallMethod;
  lastInstalled?: string;
  lastUpdated?: string;
  configPath?: string;
  issues?: string[];
}

// Health check result
export interface HealthCheckResult {
  serverId: string;
  status: HealthStatus;
  agent: AgentType;
  transport: TransportType;
  lastChecked: string;
  responseTime?: number;
  error?: string;
  warnings?: string[];
  details?: {
    processRunning?: boolean;
    portAccessible?: boolean;
    handshakeSuccessful?: boolean;
    configValid?: boolean;
    environmentValid?: boolean;
  };
}

// Registry update configuration
export interface RegistryUpdateConfig {
  sources: {
    github?: {
      enabled: boolean;
      token?: string;
      repos: string[];
    };
    npm?: {
      enabled: boolean;
      registries: string[];
    };
    manual?: {
      enabled: boolean;
      files: string[];
    };
  };
  updateInterval: number; // in hours
  autoUpdate: boolean;
  backupBeforeUpdate: boolean;
}

// Server installation result
export interface InstallationResult {
  success: boolean;
  serverId: string;
  agent: AgentType;
  transport: TransportType;
  installMethod: InstallMethod;
  configPath: string;
  backupPath?: string;
  warnings: string[];
  errors: string[];
  timeElapsed: number;
}

// Server removal result
export interface RemovalResult {
  success: boolean;
  serverId: string;
  agent: AgentType;
  backupPath?: string;
  warnings: string[];
  errors: string[];
  timeElapsed: number;
}

// Registry statistics
export interface RegistryStats {
  totalServers: number;
  byClassification: Record<ServerClassification, number>;
  byTransport: Record<TransportType, number>;
  byAgent: Record<AgentType, number>;
  byCategory: Record<string, number>;
  mostPopular: MCPServer[];
  recentlyUpdated: MCPServer[];
  trending: MCPServer[];
}

// Server dependency interface
export interface ServerDependency {
  type: 'npm' | 'python' | 'docker' | 'binary' | 'env';
  name: string;
  version?: string;
  required: boolean;
  description?: string;
  installCommand?: string;
}

// Enhanced server interface with runtime information
export interface EnhancedMCPServer extends MCPServer {
  installStatus?: ServerInstallStatus;
  healthStatus?: HealthCheckResult;
  dependencies?: ServerDependency[];
  relatedServers?: string[];
  alternativeServers?: string[];
}

// Registry management interface
export interface RegistryManager {
  // Server operations
  getServer(id: string): Promise<MCPServer | null>;
  getAllServers(): Promise<MCPServer[]>;
  searchServers(filters: SearchFilters, options?: SearchOptions): Promise<SearchResponse>;
  
  // Category and tag operations
  getCategories(): Promise<string[]>;
  getTags(): Promise<string[]>;
  getServersByCategory(category: string): Promise<MCPServer[]>;
  getServersByTag(tag: string): Promise<MCPServer[]>;
  
  // Statistics and metadata
  getStats(): Promise<RegistryStats>;
  getMetadata(): Promise<RegistryMetadata>;
  
  // Registry updates
  updateRegistry(): Promise<void>;
  validateRegistry(): Promise<boolean>;
  
  // Health monitoring
  checkServerHealth(serverId: string, agent: AgentType): Promise<HealthCheckResult>;
  checkAllServersHealth(agent: AgentType): Promise<HealthCheckResult[]>;
}

// Export utility types
export type ServerMap = Record<string, MCPServer>;
export type AgentServerMap = Record<AgentType, string[]>;
export type TransportServerMap = Record<TransportType, string[]>;