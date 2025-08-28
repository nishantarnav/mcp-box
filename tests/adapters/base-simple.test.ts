/**
 * Simplified Base Agent Adapter Tests
 * Tests for common agent adapter functionality with proper mocking
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { z } from 'zod';

// Mock the dependencies first
const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  stat: jest.fn()
};

const mockPaths = {
  getAgentConfigPath: jest.fn(),
  findConfigFile: jest.fn(),
  ensureDir: jest.fn(),
  pathExists: jest.fn(),
  isReadable: jest.fn(),
  isWritable: jest.fn()
};

const mockConfigManager = {
  createBackup: jest.fn(),
  restoreBackup: jest.fn()
};

// Mock the modules
jest.mock('fs/promises', () => mockFs);
jest.mock('../../src/utils/paths.js', () => mockPaths);
jest.mock('../../src/utils/config.js', () => ({
  configManager: mockConfigManager
}));

// Import after mocking
import { BaseAgentAdapter } from '../../src/adapters/base.js';
import type {
  AgentType,
  AgentInfo,
  AgentConfig,
  ConfigScope,
  BaseServerConfig,
  TransportType
} from '../../src/types/agents.d.js';

// Test implementation of BaseAgentAdapter
class TestAdapter extends BaseAgentAdapter {
  readonly name: AgentType = 'claude';
  readonly info: AgentInfo = {
    name: 'Claude Desktop',
    version: '1.0.0',
    configFormat: 'json',
    configPath: '~/.claude/config.json',
    executable: 'claude',
    supportedTransports: ['stdio', 'http'],
    documentation: 'https://claude.ai/docs'
  };

  protected getConfigSchema() {
    return z.object({
      mcpServers: z.record(z.object({
        command: z.string(),
        args: z.array(z.string()).optional(),
        env: z.record(z.string()).optional()
      })).default({})
    });
  }

  protected transformServerConfig(
    serverId: string,
    serverConfig: BaseServerConfig,
    transport: TransportType
  ) {
    return {
      command: serverConfig.command || 'node',
      args: serverConfig.args || [],
      env: serverConfig.env || {}
    };
  }

  protected extractServers(config: AgentConfig): Record<string, any> {
    return (config as any).mcpServers || {};
  }

  protected createConfigWithServers(servers: Record<string, any>): AgentConfig {
    return { mcpServers: servers } as AgentConfig;
  }
}

describe('BaseAgentAdapter - Core Functionality', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
    jest.clearAllMocks();
  });

  describe('adapter properties', () => {
    test('should have correct adapter properties', () => {
      expect(adapter.name).toBe('claude');
      expect(adapter.info.name).toBe('Claude Desktop');
      expect(adapter.info.supportedTransports).toEqual(['stdio', 'http']);
    });
  });

  describe('configuration schema validation', () => {
    test('should validate correct configuration', async () => {
      const config = { mcpServers: { 'test-server': { command: 'node' } } };
      
      const result = await adapter.validate(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid configuration', async () => {
      const config = { mcpServers: { 'test-server': { command: 123 } } };
      
      const result = await adapter.validate(config as any);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].severity).toBe('error');
    });
  });

  describe('server configuration transformation', () => {
    test('should transform server config correctly', () => {
      const serverConfig: BaseServerConfig = {
        command: 'python',
        args: ['server.py'],
        env: { NODE_ENV: 'test' }
      };

      const transformed = adapter['transformServerConfig']('test-server', serverConfig, 'stdio');
      
      expect(transformed).toEqual({
        command: 'python',
        args: ['server.py'],
        env: { NODE_ENV: 'test' }
      });
    });

    test('should handle missing optional fields', () => {
      const serverConfig: BaseServerConfig = {
        command: 'node'
      };

      const transformed = adapter['transformServerConfig']('test-server', serverConfig, 'stdio');
      
      expect(transformed).toEqual({
        command: 'node',
        args: [],
        env: {}
      });
    });
  });

  describe('configuration operations', () => {
    test('should extract servers from configuration', () => {
      const config = {
        mcpServers: {
          'server1': { command: 'node' },
          'server2': { command: 'python' }
        }
      };

      const servers = adapter['extractServers'](config as AgentConfig);
      
      expect(servers).toEqual(config.mcpServers);
      expect(Object.keys(servers)).toHaveLength(2);
    });

    test('should create configuration with servers', () => {
      const servers = {
        'server1': { command: 'node' },
        'server2': { command: 'python' }
      };

      const config = adapter['createConfigWithServers'](servers);
      
      expect(config).toEqual({ mcpServers: servers });
    });

    test('should handle empty server list', () => {
      const servers = {};
      const config = adapter['createConfigWithServers'](servers);
      
      expect(config).toEqual({ mcpServers: {} });
    });
  });

  describe('configuration reading', () => {
    test('should return empty config when file not found', async () => {
      mockPaths.findConfigFile.mockResolvedValue(null);
      
      const config = await adapter.read('user');
      
      expect(config).toEqual({ mcpServers: {} });
    });

    test('should parse valid JSON configuration', async () => {
      const mockConfig = { mcpServers: { 'test': { command: 'node' } } };
      mockPaths.findConfigFile.mockResolvedValue('/test/config.json');
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      
      const config = await adapter.read('user');
      
      expect(config).toEqual(mockConfig);
      expect(mockPaths.findConfigFile).toHaveBeenCalledWith('claude', 'user');
    });

    test('should handle empty file content', async () => {
      mockPaths.findConfigFile.mockResolvedValue('/test/config.json');
      mockFs.readFile.mockResolvedValue('');
      
      const config = await adapter.read('user');
      
      expect(config).toEqual({ mcpServers: {} });
    });
  });

  describe('configuration writing', () => {
    test('should write valid configuration', async () => {
      const config = { mcpServers: { 'test': { command: 'node' } } };
      mockPaths.getAgentConfigPath.mockReturnValue('/test/config.json');
      mockPaths.ensureDir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      
      await adapter.write(config, 'user');
      
      expect(mockPaths.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/config.json',
        JSON.stringify(config, null, 2)
      );
    });

    test('should reject invalid configuration', async () => {
      const invalidConfig = { mcpServers: { 'test': { command: 123 } } }; // invalid command type
      mockPaths.getAgentConfigPath.mockReturnValue('/test/config.json');
      
      await expect(adapter.write(invalidConfig as any, 'user')).rejects.toThrow(
        'Invalid configuration'
      );
    });
  });

  describe('backup operations', () => {
    test('should create backup successfully', async () => {
      mockConfigManager.createBackup.mockResolvedValue({
        success: true,
        filePath: '/backup/test.json'
      });
      
      const backupPath = await adapter.backup('user');
      
      expect(backupPath).toBe('/backup/test.json');
      expect(mockConfigManager.createBackup).toHaveBeenCalledWith('claude', 'user');
    });

    test('should handle backup failure', async () => {
      mockConfigManager.createBackup.mockResolvedValue({
        success: false,
        error: 'Permission denied'
      });
      
      await expect(adapter.backup('user')).rejects.toThrow('Failed to create backup');
    });
  });

  describe('utility methods', () => {
    test('should check installation status', async () => {
      mockPaths.findConfigFile
        .mockResolvedValueOnce('/user/config.json')
        .mockResolvedValueOnce(null);
      
      const isInstalled = await adapter.isInstalled();
      
      expect(isInstalled).toBe(true);
      expect(mockPaths.findConfigFile).toHaveBeenCalledTimes(2);
    });

    test('should check permissions', async () => {
      mockPaths.getAgentConfigPath.mockReturnValue('/test/config.json');
      mockPaths.pathExists.mockResolvedValue(true);
      mockPaths.isReadable.mockResolvedValue(true);
      mockPaths.isWritable.mockResolvedValue(false);
      
      const permissions = await adapter.checkPermissions('user');
      
      expect(permissions).toEqual({
        exists: true,
        readable: true,
        writable: false,
        path: '/test/config.json'
      });
    });
  });

  describe('error handling', () => {
    test('should handle file read errors', async () => {
      mockPaths.findConfigFile.mockResolvedValue('/test/config.json');
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));
      
      await expect(adapter.read('user')).rejects.toThrow('Failed to read configuration');
    });

    test('should handle file write errors', async () => {
      const config = { mcpServers: {} };
      mockPaths.getAgentConfigPath.mockReturnValue('/test/config.json');
      mockPaths.ensureDir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));
      
      await expect(adapter.write(config, 'user')).rejects.toThrow('Failed to write configuration');
    });
  });
});