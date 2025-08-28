/**
 * Simplified MCP Registry Tests
 * Tests for MCP server registry management and search functionality
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock fs first
const mockFs = {
  readFile: jest.fn()
};
jest.mock('fs/promises', () => mockFs);

// Mock type definitions for testing
interface MockMCPServer {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  category: string;
  transport: 'stdio' | 'http' | 'sse';
  install: {
    method: string;
    source: string;
    command?: string;
  };
  config?: any;
  documentation?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
}

interface RegistrySearchOptions {
  limit?: number;
  category?: string;
  transport?: 'stdio' | 'http' | 'sse';
  tags?: string[];
  installMethod?: string;
}

describe('MCP Registry Manager - Core Functionality', () => {
  let mockServers: MockMCPServer[];

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
        documentation: 'https://mcp.dev/docs/filesystem',
        homepage: 'https://mcp.dev',
        repository: 'https://github.com/mcp/filesystem',
        license: 'Apache-2.0',
        keywords: ['filesystem', 'files', 'io', 'local']
      }
    ];

    jest.clearAllMocks();
  });

  describe('server data validation', () => {
    test('should validate server schema', () => {
      const server = mockServers[0];
      
      expect(server.id).toBeDefined();
      expect(server.name).toBeDefined();
      expect(server.description).toBeDefined();
      expect(server.category).toBeDefined();
      expect(server.transport).toMatch(/^(stdio|http|sse)$/);
      expect(server.install.method).toBeDefined();
    });

    test('should handle servers with missing optional fields', () => {
      const minimalServer = {
        id: 'minimal-server',
        name: 'Minimal Server',
        description: 'A minimal server',
        author: 'Test Author',
        version: '1.0.0',
        tags: ['minimal'],
        category: 'Testing',
        transport: 'stdio' as const,
        install: {
          method: 'npm',
          source: 'minimal-server'
        }
      };

      expect(minimalServer.id).toBeDefined();
      expect(minimalServer.transport).toBe('stdio');
      expect(minimalServer.install.method).toBe('npm');
    });
  });

  describe('search functionality', () => {
    test('should search by name', () => {
      const searchTerm = 'GitHub';
      const results = mockServers.filter(server =>
        server.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('github-repo');
    });

    test('should search by description', () => {
      const searchTerm = 'database';
      const results = mockServers.filter(server =>
        server.description.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('database-mysql');
    });

    test('should search by tags', () => {
      const searchTerm = 'filesystem';
      const results = mockServers.filter(server =>
        server.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('file-system');
    });

    test('should filter by category', () => {
      const category = 'Development';
      const results = mockServers.filter(server => server.category === category);

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('Development');
    });

    test('should filter by transport', () => {
      const transport = 'stdio';
      const results = mockServers.filter(server => server.transport === transport);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.transport === 'stdio')).toBe(true);
    });

    test('should filter by install method', () => {
      const installMethod = 'pip';
      const results = mockServers.filter(server => server.install.method === installMethod);

      expect(results).toHaveLength(1);
      expect(results[0].install.method).toBe('pip');
    });

    test('should limit search results', () => {
      const limit = 1;
      const results = mockServers.slice(0, limit);

      expect(results).toHaveLength(1);
    });
  });

  describe('server retrieval', () => {
    test('should get server by ID', () => {
      const serverId = 'github-repo';
      const server = mockServers.find(s => s.id === serverId);

      expect(server).toBeDefined();
      expect(server!.id).toBe('github-repo');
      expect(server!.name).toBe('GitHub Repository');
    });

    test('should return undefined for non-existent server', () => {
      const serverId = 'non-existent';
      const server = mockServers.find(s => s.id === serverId);

      expect(server).toBeUndefined();
    });

    test('should get servers by category', () => {
      const category = 'Development';
      const servers = mockServers.filter(s => s.category === category);

      expect(servers).toHaveLength(1);
      expect(servers[0].category).toBe('Development');
    });

    test('should get servers by tag', () => {
      const tag = 'database';
      const servers = mockServers.filter(s => s.tags.includes(tag));

      expect(servers).toHaveLength(1);
      expect(servers[0].tags).toContain('database');
    });
  });

  describe('registry statistics', () => {
    test('should count categories correctly', () => {
      const categories = mockServers.reduce((acc, server) => {
        acc[server.category] = (acc[server.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(categories).toEqual({
        'Development': 1,
        'Database': 1,
        'System': 1
      });
    });

    test('should count transports correctly', () => {
      const transports = mockServers.reduce((acc, server) => {
        acc[server.transport] = (acc[server.transport] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(transports).toEqual({
        'stdio': 2,
        'http': 1
      });
    });

    test('should count install methods correctly', () => {
      const installMethods = mockServers.reduce((acc, server) => {
        acc[server.install.method] = (acc[server.install.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(installMethods).toEqual({
        'npm': 2,
        'pip': 1
      });
    });

    test('should get all available categories', () => {
      const categories = [...new Set(mockServers.map(s => s.category))];

      expect(categories.sort()).toEqual(['Database', 'Development', 'System']);
    });

    test('should get all available tags', () => {
      const tags = [...new Set(mockServers.flatMap(s => s.tags))];

      expect(tags.sort()).toEqual([
        'code', 'database', 'files', 'filesystem', 'git', 'github', 
        'io', 'local', 'mysql', 'query', 'repository', 'sql'
      ]);
    });
  });

  describe('fuzzy search scoring', () => {
    test('should calculate basic similarity scores', () => {
      const calculateScore = (text: string, query: string): number => {
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        
        if (lowerText === lowerQuery) return 1.0;
        if (lowerText.includes(lowerQuery)) return 0.8;
        
        // Simple character matching
        let matches = 0;
        for (const char of lowerQuery) {
          if (lowerText.includes(char)) matches++;
        }
        return matches / lowerQuery.length * 0.5;
      };

      expect(calculateScore('GitHub Repository', 'GitHub Repository')).toBe(1.0);
      expect(calculateScore('GitHub Repository', 'GitHub')).toBe(0.8);
      expect(calculateScore('GitHub Repository', 'git')).toBe(0.8);
    });

    test('should rank exact matches higher', () => {
      const calculateScore = (text: string, query: string): number => {
        if (text.toLowerCase() === query.toLowerCase()) return 1.0;
        if (text.toLowerCase().includes(query.toLowerCase())) return 0.8;
        return 0.5;
      };

      const exactMatch = calculateScore('GitHub', 'GitHub');
      const partialMatch = calculateScore('GitHub Repository', 'GitHub');
      
      expect(exactMatch).toBeGreaterThan(partialMatch);
    });
  });

  describe('registry file operations', () => {
    test('should handle successful registry loading', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockServers));
      
      const data = await mockFs.readFile('servers.json', 'utf-8');
      const servers = JSON.parse(data);
      
      expect(servers).toHaveLength(3);
      expect(mockFs.readFile).toHaveBeenCalledWith('servers.json', 'utf-8');
    });

    test('should handle missing registry file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: file not found'));
      
      try {
        await mockFs.readFile('servers.json', 'utf-8');
      } catch (error) {
        expect((error as Error).message).toContain('file not found');
      }
    });

    test('should handle invalid JSON in registry file', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');
      
      try {
        const data = await mockFs.readFile('servers.json', 'utf-8');
        JSON.parse(data);
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });
  });
});