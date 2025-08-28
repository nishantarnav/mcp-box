/**
 * MCP Server Registry Manager
 * Handles server discovery, search, filtering, and metadata operations
 */
import type { MCPServer, RegistryManager, SearchFilters, SearchOptions, SearchResponse, RegistryStats, RegistryMetadata, HealthCheckResult } from '../types/registry.d.js';
import type { AgentType } from '../types/agents.d.js';
export declare class MCPRegistryManager implements RegistryManager {
    private registry;
    private lastLoaded;
    private readonly registryPath;
    constructor();
    /**
     * Load the registry from disk if not already loaded or if stale
     */
    private ensureLoaded;
    /**
     * Load the registry from disk
     */
    private loadRegistry;
    /**
     * Get a specific server by ID
     */
    getServer(id: string): Promise<MCPServer | null>;
    /**
     * Get all servers
     */
    getAllServers(): Promise<MCPServer[]>;
    /**
     * Search servers with filters and options
     */
    searchServers(filters: SearchFilters, options?: SearchOptions): Promise<SearchResponse>;
    /**
     * Calculate relevance score for search
     */
    private calculateRelevanceScore;
    /**
     * Simple fuzzy matching implementation
     */
    private fuzzyMatch;
    /**
     * Get matched fields for a search result
     */
    private getMatchedFields;
    /**
     * Parse download string to number
     */
    private parseDownloads;
    /**
     * Get all categories
     */
    getCategories(): Promise<string[]>;
    /**
     * Get all tags
     */
    getTags(): Promise<string[]>;
    /**
     * Get servers by category
     */
    getServersByCategory(category: string): Promise<MCPServer[]>;
    /**
     * Get servers by tag
     */
    getServersByTag(tag: string): Promise<MCPServer[]>;
    /**
     * Get registry statistics
     */
    getStats(): Promise<RegistryStats>;
    /**
     * Get registry metadata
     */
    getMetadata(): Promise<RegistryMetadata>;
    /**
     * Update registry (placeholder implementation)
     */
    updateRegistry(): Promise<void>;
    /**
     * Validate registry
     */
    validateRegistry(): Promise<boolean>;
    /**
     * Check server health (placeholder implementation)
     */
    checkServerHealth(serverId: string, agent: AgentType): Promise<HealthCheckResult>;
    /**
     * Check all servers health (placeholder implementation)
     */
    checkAllServersHealth(agent: AgentType): Promise<HealthCheckResult[]>;
}
export declare const registryManager: MCPRegistryManager;
//# sourceMappingURL=index.d.ts.map