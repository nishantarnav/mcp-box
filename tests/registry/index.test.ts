/**
 * MCP Registry Tests
 * Tests for MCP server registry management and search functionality
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MCPRegistryManager } from '../../src/registry/index.js';
import type { MCPServer, RegistrySearchOptions, RegistryStats } from '../../src/types/registry.d.js';

// Mock fs for registry loading
jest.mock('fs/promises', () => ({
  readFile: jest.fn()
}));

import fs from 'fs/promises';
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('MCPRegistryManager', () => {
  let registry: MCPRegistryManager;
  let mockServers: MCPServer[];

  beforeEach(() => {
    mockServers = [
      {
        id: 'github-repo',
        name: 'GitHub Repository',
        description: 'Access GitHub repositories and manage issues, PRs, and code',
        author: 'GitHub Inc.',
        version: '1.2.0',
        tags: ['git', 'github', 'repository', 'code'],
        category: 'Development',
        transport: 'stdio',
        install: {
          method: 'npm',
          source: 'github-mcp-server',
          command: 'npx github-mcp-server'
        },
        config: {
          env: {
            GITHUB_TOKEN: {
              required: true,
              description: 'GitHub personal access token'
            }
          }
        },
        documentation: 'https://github.com/github/mcp-server',
        homepage: 'https://github.com',
        repository: 'https://github.com/github/mcp-server',
        license: 'MIT',
        keywords: ['github', 'git', 'vcs', 'development']
      },
      {
        id: 'database-mysql',
        name: 'MySQL Database',
        description: 'Connect to MySQL databases and execute queries',
        author: 'MySQL Team',
        version: '2.1.0',
        tags: ['database', 'mysql', 'sql', 'query'],
        category: 'Database',
        transport: 'http',
        install: {
          method: 'pip',
          source: 'mysql-mcp-server',
          command: 'python -m mysql_mcp_server'
        },
        config: {
          env: {
            MYSQL_HOST: {
              required: true,
              description: 'MySQL server hostname'
            },
            MYSQL_USER: {
              required: true,
              description: 'MySQL username'
            },
            MYSQL_PASSWORD: {
              required: true,
              description: 'MySQL password'
            }
          }
        },
        documentation: 'https://dev.mysql.com/doc/mcp/',
        homepage: 'https://mysql.com',
        repository: 'https://github.com/mysql/mcp-server',
        license: 'GPL-2.0',
        keywords: ['mysql', 'database', 'sql', 'rdbms']
      },
      {
        id: 'file-system',
        name: 'File System',
        description: 'Read, write, and manage local file system operations',
        author: 'MCP Core Team',
        version: '1.0.0',
        tags: ['filesystem', 'files', 'local', 'io'],
        category: 'System',
        transport: 'stdio',
        install: {
          method: 'npm',
          source: '@mcp/filesystem',
          command: 'npx @mcp/filesystem'
        },
        config: {
          args: ['--root', '/allowed/path']
        },
        documentation: 'https://mcp.dev/docs/filesystem',
        homepage: 'https://mcp.dev',
        repository: 'https://github.com/mcp/filesystem',
        license: 'Apache-2.0',
        keywords: ['filesystem', 'files', 'io', 'local']
      }
    ];

    // Mock the servers.json file
    mockedFs.readFile.mockResolvedValue(JSON.stringify(mockServers));
    
    registry = new MCPRegistryManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    test('should load servers from registry file', async () => {
      await registry.loadRegistry();
      
      expect(mockedFs.readFile).toHaveBeenCalled();
      const stats = await registry.getStats();
      expect(stats.totalServers).toBe(3);
    });

    test('should handle missing registry file', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT: file not found'));
      
      await registry.loadRegistry();
      
      const stats = await registry.getStats();
      expect(stats.totalServers).toBe(0);
    });

    test('should handle invalid JSON in registry file', async () => {
      mockedFs.readFile.mockResolvedValue('invalid json');
      
      await registry.loadRegistry();
      
      const stats = await registry.getStats();
      expect(stats.totalServers).toBe(0);
    });
  });

  describe('search functionality', () => {
    beforeEach(async () => {
      await registry.loadRegistry();
    });

    test('should search by name', async () => {
      const results = await registry.search('GitHub');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('github-repo');
    });

    test('should search by description', async () => {
      const results = await registry.search('database');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('database-mysql');
    });

    test('should search by tags', async () => {
      const results = await registry.search('filesystem');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('file-system');
    });

    test('should search by keywords', async () => {
      const results = await registry.search('sql');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('database-mysql');
    });

    test('should return empty results for non-matching query', async () => {
      const results = await registry.search('nonexistent');
      
      expect(results).toHaveLength(0);
    });

    test('should handle case-insensitive search', async () => {
      const results = await registry.search('GITHUB');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('github-repo');
    });

    test('should limit search results', async () => {
      const options: RegistrySearchOptions = { limit: 1 };
      const results = await registry.search('', options);
      
      expect(results).toHaveLength(1);
    });

    test('should filter by category', async () => {
      const options: RegistrySearchOptions = { category: 'Database' };
      const results = await registry.search('', options);
      
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('Database');
    });

    test('should filter by transport', async () => {
      const options: RegistrySearchOptions = { transport: 'stdio' };
      const results = await registry.search('', options);
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.transport === 'stdio')).toBe(true);
    });

    test('should filter by tags', async () => {
      const options: RegistrySearchOptions = { tags: ['git'] };
      const results = await registry.search('', options);
      
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('git');
    });

    test('should filter by install method', async () => {
      const options: RegistrySearchOptions = { installMethod: 'pip' };
      const results = await registry.search('', options);
      
      expect(results).toHaveLength(1);
      expect(results[0].install.method).toBe('pip');
    });

    test('should combine multiple filters', async () => {
      const options: RegistrySearchOptions = {
        category: 'Development',
        transport: 'stdio',
        tags: ['github']
      };
      const results = await registry.search('', options);
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('github-repo');
    });
  });

  describe('server retrieval', () => {
    beforeEach(async () => {
      await registry.loadRegistry();
    });

    test('should get server by ID', async () => {
      const server = await registry.getServer('github-repo');
      
      expect(server).toBeDefined();
      expect(server!.id).toBe('github-repo');
      expect(server!.name).toBe('GitHub Repository');
    });

    test('should return null for non-existent server', async () => {
      const server = await registry.getServer('non-existent');
      
      expect(server).toBeNull();
    });

    test('should get servers by category', async () => {
      const servers = await registry.getServersByCategory('Development');
      
      expect(servers).toHaveLength(1);
      expect(servers[0].category).toBe('Development');
    });

    test('should get servers by tag', async () => {
      const servers = await registry.getServersByTag('database');
      
      expect(servers).toHaveLength(1);
      expect(servers[0].tags).toContain('database');
    });

    test('should get all servers', async () => {
      const servers = await registry.getAllServers();
      
      expect(servers).toHaveLength(3);
    });
  });

  describe('statistics and metadata', () => {
    beforeEach(async () => {
      await registry.loadRegistry();
    });

    test('should return registry statistics', async () => {
      const stats = await registry.getStats();
      
      expect(stats).toMatchObject({
        totalServers: 3,
        categories: expect.any(Array),
        transports: expect.any(Array),
        installMethods: expect.any(Array),
        lastUpdated: expect.any(String)
      });
    });

    test('should count categories correctly', async () => {
      const stats = await registry.getStats();
      
      expect(stats.categories).toEqual([
        { name: 'Development', count: 1 },
        { name: 'Database', count: 1 },
        { name: 'System', count: 1 }
      ]);
    });

    test('should count transports correctly', async () => {
      const stats = await registry.getStats();
      
      expect(stats.transports).toEqual([
        { name: 'stdio', count: 2 },
        { name: 'http', count: 1 }
      ]);
    });

    test('should count install methods correctly', async () => {
      const stats = await registry.getStats();
      
      expect(stats.installMethods).toEqual([
        { name: 'npm', count: 2 },
        { name: 'pip', count: 1 }
      ]);
    });

    test('should get all available categories', async () => {
      const categories = await registry.getCategories();
      
      expect(categories).toEqual(['Development', 'Database', 'System']);
    });

    test('should get all available tags', async () => {
      const tags = await registry.getTags();
      
      expect(tags.sort()).toEqual([
        'code', 'database', 'development', 'files', 'filesystem',
        'git', 'github', 'io', 'local', 'mysql', 'query', 'repository', 'sql'
      ]);
    });
  });

  describe('fuzzy search scoring', () => {
    beforeEach(async () => {
      await registry.loadRegistry();
    });

    test('should score exact matches higher', async () => {
      const results = await registry.search('GitHub Repository');
      
      expect(results[0].id).toBe('github-repo');
      // Exact match should have high score
      expect(results[0].score).toBeGreaterThan(0.8);
    });

    test('should score partial matches lower', async () => {
      const results = await registry.search('GitHub');
      
      expect(results[0].id).toBe('github-repo');
      // Partial match should have lower score than exact match
      expect(results[0].score).toBeLessThan(1.0);
    });

    test('should sort results by score descending', async () => {
      // Add the word "database" to file system description to test scoring
      mockServers[2].description = 'Read, write, and manage local file system operations and database files';
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockServers));
      await registry.loadRegistry();
      
      const results = await registry.search('database');
      
      expect(results).toHaveLength(2);
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });
  });

  describe('server validation', () => {
    test('should validate server schema', async () => {
      const validServer: MCPServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        author: 'Test Author',
        version: '1.0.0',
        tags: ['test'],
        category: 'Testing',
        transport: 'stdio',
        install: {
          method: 'npm',
          source: 'test-server',
          command: 'npx test-server'
        },
        documentation: 'https://test.com/docs',
        homepage: 'https://test.com',
        repository: 'https://github.com/test/server',
        license: 'MIT',
        keywords: ['test']
      };

      mockedFs.readFile.mockResolvedValue(JSON.stringify([validServer]));
      
      await registry.loadRegistry();
      const stats = await registry.getStats();
      
      expect(stats.totalServers).toBe(1);
    });

    test('should handle servers with missing optional fields', async () => {
      const minimalServer = {
        id: 'minimal-server',
        name: 'Minimal Server',
        description: 'A minimal server',
        author: 'Test Author',
        version: '1.0.0',
        tags: ['minimal'],
        category: 'Testing',
        transport: 'stdio',
        install: {
          method: 'npm',
          source: 'minimal-server'
        }
      };

      mockedFs.readFile.mockResolvedValue(JSON.stringify([minimalServer]));
      
      await registry.loadRegistry();
      const stats = await registry.getStats();
      
      expect(stats.totalServers).toBe(1);
    });

    test('should filter out invalid servers', async () => {
      const invalidServer = {
        id: 'invalid-server',
        // missing required fields
        description: 'Invalid server'
      };

      mockedFs.readFile.mockResolvedValue(JSON.stringify([...mockServers, invalidServer]));
      
      await registry.loadRegistry();
      const stats = await registry.getStats();
      
      // Should only load valid servers
      expect(stats.totalServers).toBe(3);
    });
  });

  describe('caching and performance', () => {
    test('should cache loaded registry', async () => {
      await registry.loadRegistry();
      await registry.loadRegistry(); // Second call
      
      // Should only read file once
      expect(mockedFs.readFile).toHaveBeenCalledTimes(1);
    });

    test('should reload registry when forced', async () => {
      await registry.loadRegistry();
      await registry.loadRegistry(true); // Force reload
      
      // Should read file twice
      expect(mockedFs.readFile).toHaveBeenCalledTimes(2);
    });

    test('should handle concurrent loads gracefully', async () => {
      const promise1 = registry.loadRegistry();
      const promise2 = registry.loadRegistry();
      
      await Promise.all([promise1, promise2]);
      
      // Should only read file once
      expect(mockedFs.readFile).toHaveBeenCalledTimes(1);
    });
  });
});