/**
 * MCP Server Registry Manager
 * Handles server discovery, search, filtering, and metadata operations
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  MCPRegistry,
  MCPServer,
  RegistryManager,
  SearchFilters,
  SearchOptions,
  SearchResponse,
  SearchResult,
  RegistryStats,
  RegistryMetadata,
  HealthCheckResult,
  ServerClassification,
  TransportType
} from '../types/registry.d.js';
import type { AgentType } from '../types/agents.d.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MCPRegistryManager implements RegistryManager {
  private registry: MCPRegistry | null = null;
  private lastLoaded: Date | null = null;
  private readonly registryPath: string;

  constructor() {
    this.registryPath = path.join(__dirname, 'servers.json');
  }

  /**
   * Load the registry from disk if not already loaded or if stale
   */
  private async ensureLoaded(): Promise<void> {
    const now = new Date();
    
    // Reload if not loaded or if older than 5 minutes
    if (!this.registry || !this.lastLoaded || 
        (now.getTime() - this.lastLoaded.getTime()) > 5 * 60 * 1000) {
      await this.loadRegistry();
    }
  }

  /**
   * Load the registry from disk
   */
  private async loadRegistry(): Promise<void> {
    try {
      const registryContent = await fs.readFile(this.registryPath, 'utf-8');
      this.registry = JSON.parse(registryContent) as MCPRegistry;
      this.lastLoaded = new Date();
    } catch (error) {
      throw new Error(`Failed to load MCP registry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a specific server by ID
   */
  async getServer(id: string): Promise<MCPServer | null> {
    await this.ensureLoaded();
    
    if (!this.registry) {
      throw new Error('Registry not loaded');
    }

    const server = this.registry.servers.find(s => s.id === id);
    return server || null;
  }

  /**
   * Get all servers
   */
  async getAllServers(): Promise<MCPServer[]> {
    await this.ensureLoaded();
    
    if (!this.registry) {
      throw new Error('Registry not loaded');
    }

    return [...this.registry.servers];
  }

  /**
   * Search servers with filters and options
   */
  async searchServers(filters: SearchFilters, options: SearchOptions = {}): Promise<SearchResponse> {
    await this.ensureLoaded();
    
    if (!this.registry) {
      throw new Error('Registry not loaded');
    }

    const {
      query = '',
      tags = [],
      classification = [],
      transportTypes = [],
      supportedPlatforms = [],
      maintainer,
      category,
      license,
      minDownloads,
      dockerSupport,
      hasNpmPackage
    } = filters;

    const {
      fuzzy = true,
      limit = 50,
      offset = 0,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = options;

    let results: SearchResult[] = [];

    // Filter servers
    const filteredServers = this.registry.servers.filter(server => {
      // Classification filter
      if (classification.length > 0 && !classification.includes(server.classification)) {
        return false;
      }

      // Transport type filter
      if (transportTypes.length > 0 && 
          !transportTypes.some(t => server.transportTypes.includes(t))) {
        return false;
      }

      // Supported platforms filter
      if (supportedPlatforms.length > 0 && 
          !supportedPlatforms.some(p => server.supportedPlatforms.includes(p))) {
        return false;
      }

      // Tags filter
      if (tags.length > 0 && 
          !tags.some(t => server.tags.includes(t))) {
        return false;
      }

      // Maintainer filter
      if (maintainer && !server.maintainer.toLowerCase().includes(maintainer.toLowerCase())) {
        return false;
      }

      // Category filter
      if (category && server.category !== category) {
        return false;
      }

      // License filter
      if (license && server.license !== license) {
        return false;
      }

      // Docker support filter
      if (dockerSupport !== undefined && server.dockerSupport !== dockerSupport) {
        return false;
      }

      // NPM package filter
      if (hasNpmPackage !== undefined && !!server.npmPackage !== hasNpmPackage) {
        return false;
      }

      // Downloads filter
      if (minDownloads !== undefined) {
        const downloads = this.parseDownloads(server.estWeeklyDownloads);
        if (downloads < minDownloads) {
          return false;
        }
      }

      return true;
    });

    // Search and score results
    if (query.trim()) {
      results = filteredServers.map(server => {
        const score = this.calculateRelevanceScore(server, query, fuzzy);
        return {
          server,
          score,
          matchedFields: this.getMatchedFields(server, query)
        };
      }).filter(result => result.score > 0);
    } else {
      results = filteredServers.map(server => ({
        server,
        score: 1,
        matchedFields: []
      }));
    }

    // Sort results
    results.sort((a, b) => {
      if (sortBy === 'relevance') {
        return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
      } else if (sortBy === 'downloads') {
        const aDownloads = this.parseDownloads(a.server.estWeeklyDownloads);
        const bDownloads = this.parseDownloads(b.server.estWeeklyDownloads);
        return sortOrder === 'desc' ? bDownloads - aDownloads : aDownloads - bDownloads;
      } else if (sortBy === 'name') {
        const aName = a.server.name.toLowerCase();
        const bName = b.server.name.toLowerCase();
        return sortOrder === 'desc' ? bName.localeCompare(aName) : aName.localeCompare(bName);
      } else if (sortBy === 'updated') {
        const aDate = new Date(a.server.lastUpdated);
        const bDate = new Date(b.server.lastUpdated);
        return sortOrder === 'desc' ? bDate.getTime() - aDate.getTime() : aDate.getTime() - bDate.getTime();
      }
      return 0;
    });

    // Apply pagination
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      results: paginatedResults,
      total,
      hasMore,
      filters,
      query: query.trim()
    };
  }

  /**
   * Calculate relevance score for search
   */
  private calculateRelevanceScore(server: MCPServer, query: string, fuzzy: boolean): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Exact matches
    if (server.name.toLowerCase().includes(queryLower)) score += 10;
    if (server.title.toLowerCase().includes(queryLower)) score += 8;
    if (server.description.toLowerCase().includes(queryLower)) score += 5;
    if (server.maintainer.toLowerCase().includes(queryLower)) score += 3;
    if (server.tags.some(tag => tag.toLowerCase().includes(queryLower))) score += 4;

    // Fuzzy matching if enabled
    if (fuzzy && score === 0) {
      const fuzzyScore = this.fuzzyMatch(queryLower, server.name.toLowerCase()) +
                        this.fuzzyMatch(queryLower, server.description.toLowerCase()) * 0.5;
      score += fuzzyScore;
    }

    // Boost popular servers
    const downloads = this.parseDownloads(server.estWeeklyDownloads);
    if (downloads > 10000) score += 2;
    else if (downloads > 1000) score += 1;

    // Boost official servers
    if (server.classification === 'official') score += 2;

    return score;
  }

  /**
   * Simple fuzzy matching implementation
   */
  private fuzzyMatch(pattern: string, text: string): number {
    if (pattern.length === 0) return 0;
    if (text.length === 0) return 0;

    let patternIdx = 0;
    let score = 0;
    let consecutiveMatches = 0;

    for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
      if (text[i] === pattern[patternIdx]) {
        patternIdx++;
        consecutiveMatches++;
        score += consecutiveMatches;
      } else {
        consecutiveMatches = 0;
      }
    }

    return patternIdx === pattern.length ? score / pattern.length : 0;
  }

  /**
   * Get matched fields for a search result
   */
  private getMatchedFields(server: MCPServer, query: string): string[] {
    const queryLower = query.toLowerCase();
    const fields: string[] = [];

    if (server.name.toLowerCase().includes(queryLower)) fields.push('name');
    if (server.title.toLowerCase().includes(queryLower)) fields.push('title');
    if (server.description.toLowerCase().includes(queryLower)) fields.push('description');
    if (server.maintainer.toLowerCase().includes(queryLower)) fields.push('maintainer');
    if (server.tags.some(tag => tag.toLowerCase().includes(queryLower))) fields.push('tags');

    return fields;
  }

  /**
   * Parse download string to number
   */
  private parseDownloads(downloadsStr: string): number {
    if (!downloadsStr || downloadsStr === 'N/A') return 0;
    
    const str = downloadsStr.toLowerCase().replace(/[,\s]/g, '');
    if (str.endsWith('+')) {
      return parseInt(str.slice(0, -1)) || 0;
    }
    
    if (str.endsWith('k')) {
      return (parseInt(str.slice(0, -1)) || 0) * 1000;
    }
    
    if (str.endsWith('m')) {
      return (parseInt(str.slice(0, -1)) || 0) * 1000000;
    }
    
    return parseInt(str) || 0;
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    await this.ensureLoaded();
    
    if (!this.registry) {
      throw new Error('Registry not loaded');
    }

    return this.registry.metadata.categories;
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<string[]> {
    await this.ensureLoaded();
    
    if (!this.registry) {
      throw new Error('Registry not loaded');
    }

    return this.registry.metadata.tags;
  }

  /**
   * Get servers by category
   */
  async getServersByCategory(category: string): Promise<MCPServer[]> {
    await this.ensureLoaded();
    
    if (!this.registry) {
      throw new Error('Registry not loaded');
    }

    return this.registry.servers.filter(server => server.category === category);
  }

  /**
   * Get servers by tag
   */
  async getServersByTag(tag: string): Promise<MCPServer[]> {
    await this.ensureLoaded();
    
    if (!this.registry) {
      throw new Error('Registry not loaded');
    }

    return this.registry.servers.filter(server => server.tags.includes(tag));
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<RegistryStats> {
    await this.ensureLoaded();
    
    if (!this.registry) {
      throw new Error('Registry not loaded');
    }

    const servers = this.registry.servers;
    
    // Calculate statistics
    const byClassification = servers.reduce((acc, server) => {
      acc[server.classification] = (acc[server.classification] || 0) + 1;
      return acc;
    }, {} as Record<ServerClassification, number>);

    const byTransport = servers.reduce((acc, server) => {
      server.transportTypes.forEach(transport => {
        acc[transport] = (acc[transport] || 0) + 1;
      });
      return acc;
    }, {} as Record<TransportType, number>);

    const byAgent = servers.reduce((acc, server) => {
      server.supportedPlatforms.forEach(platform => {
        acc[platform as AgentType] = (acc[platform as AgentType] || 0) + 1;
      });
      return acc;
    }, {} as Record<AgentType, number>);

    const byCategory = servers.reduce((acc, server) => {
      if (server.category) {
        acc[server.category] = (acc[server.category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Most popular servers (by downloads)
    const mostPopular = [...servers]
      .sort((a, b) => this.parseDownloads(b.estWeeklyDownloads) - this.parseDownloads(a.estWeeklyDownloads))
      .slice(0, 10);

    // Recently updated servers
    const recentlyUpdated = [...servers]
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 10);

    return {
      totalServers: servers.length,
      byClassification,
      byTransport,
      byAgent,
      byCategory,
      mostPopular,
      recentlyUpdated,
      trending: mostPopular.slice(0, 5) // For now, trending = most popular
    };
  }

  /**
   * Get registry metadata
   */
  async getMetadata(): Promise<RegistryMetadata> {
    await this.ensureLoaded();
    
    if (!this.registry) {
      throw new Error('Registry not loaded');
    }

    return this.registry.metadata;
  }

  /**
   * Update registry (placeholder implementation)
   */
  async updateRegistry(): Promise<void> {
    // TODO: Implement registry update from remote sources
    throw new Error('Registry update not yet implemented');
  }

  /**
   * Validate registry
   */
  async validateRegistry(): Promise<boolean> {
    try {
      await this.ensureLoaded();
      return this.registry !== null;
    } catch {
      return false;
    }
  }

  /**
   * Check server health (placeholder implementation)
   */
  async checkServerHealth(serverId: string, agent: AgentType): Promise<HealthCheckResult> {
    // TODO: Implement actual health checking
    const server = await this.getServer(serverId);
    
    return {
      serverId,
      status: 'unknown',
      agent,
      transport: server?.transportTypes[0] || 'stdio',
      lastChecked: new Date().toISOString(),
      details: {
        configValid: true,
        environmentValid: true
      }
    };
  }

  /**
   * Check all servers health (placeholder implementation)
   */
  async checkAllServersHealth(agent: AgentType): Promise<HealthCheckResult[]> {
    const servers = await this.getAllServers();
    
    return Promise.all(
      servers.map(server => this.checkServerHealth(server.id, agent))
    );
  }
}

// Export a singleton instance
export const registryManager = new MCPRegistryManager();