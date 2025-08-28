/**
 * Base Agent Adapter Tests
 * Tests for common agent adapter functionality
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { z } from 'zod';
import { BaseAgentAdapter } from '../../src/adapters/base.js';
import type {
  AgentType,
  AgentInfo,
  AgentConfig,
  ConfigScope,
  BaseServerConfig,
  TransportType
} from '../../src/types/agents.d.js';

// Mock fs promises
const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  stat: jest.fn()
};
jest.mock('fs/promises', () => mockFs);

// Mock utility functions
const mockPaths = {
  getAgentConfigPath: jest.fn(),
  findConfigFile: jest.fn(),
  ensureDir: jest.fn(),
  pathExists: jest.fn(),
  isReadable: jest.fn(),
  isWritable: jest.fn()
};
jest.mock('../../src/utils/paths.js', () => mockPaths);

const mockConfigManager = {
  createBackup: jest.fn(),
  restoreBackup: jest.fn()
};
jest.mock('../../src/utils/config.js', () => ({
  configManager: mockConfigManager
}));

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

describe('BaseAgentAdapter', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
    jest.clearAllMocks();
  });

  describe('configuration file operations', () => {
    test('should read existing configuration', async () => {
      const mockConfig = { mcpServers: { 'test-server': { command: 'node' } } };
      
      mockPaths.findConfigFile.mockResolvedValue('/path/to/config.json');
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      
      const config = await adapter.read('user');
      
      expect(config).toEqual(mockConfig);
      expect(mockPaths.findConfigFile).toHaveBeenCalledWith('claude', 'user');
    });

    test('should return empty config for non-existent file', async () => {
      mockPaths.findConfigFile.mockResolvedValue(null);
      
      const config = await adapter.read('user');
      
      expect(config).toEqual({ mcpServers: {} });
    });

    test('should handle empty config file', async () => {
      mockPaths.findConfigFile.mockResolvedValue('/path/to/config.json');
      mockFs.readFile.mockResolvedValue('');
      
      const config = await adapter.read('user');
      
      expect(config).toEqual({ mcpServers: {} });
    });

    test('should throw error for invalid JSON', async () => {
      mockPaths.findConfigFile.mockResolvedValue('/path/to/config.json');
      mockFs.readFile.mockResolvedValue('invalid json');
      
      await expect(adapter.read('user')).rejects.toThrow('Failed to read configuration');
    });

    test('should write configuration to file', async () => {
      const config = { mcpServers: { 'test-server': { command: 'node' } } };
      
      mockPaths.getAgentConfigPath.mockReturnValue('/path/to/config.json');
      mockPaths.ensureDir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      
      await adapter.write(config, 'user');
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/path/to/config.json',
        JSON.stringify(config, null, 2)
      );
    });

    test('should validate configuration before writing', async () => {
      const invalidConfig = { invalidField: 'value' };
      
      mockPaths.getAgentConfigPath.mockReturnValue('/path/to/config.json');
      
      await expect(adapter.write(invalidConfig as any, 'user')).rejects.toThrow(
        'Invalid configuration'
      );
    });
  });

  describe('configuration validation', () => {
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

  describe('backup and restore operations', () => {
    test('should create backup successfully', async () => {
      mockedConfigManager.createBackup.mockResolvedValue({
        success: true,
        filePath: '/backup/path.json'
      });
      
      const backupPath = await adapter.backup('user');
      
      expect(backupPath).toBe('/backup/path.json');
      expect(mockedConfigManager.createBackup).toHaveBeenCalledWith('claude', 'user');
    });

    test('should throw error if backup fails', async () => {
      mockedConfigManager.createBackup.mockResolvedValue({
        success: false,
        error: 'Permission denied'
      });
      
      await expect(adapter.backup('user')).rejects.toThrow('Failed to create backup');
    });

    test('should restore from backup successfully', async () => {
      mockedConfigManager.restoreBackup.mockResolvedValue({
        success: true
      });
      
      await adapter.restore('/backup/path.json', 'user');
      
      expect(mockedConfigManager.restoreBackup).toHaveBeenCalledWith('path');
    });

    test('should throw error if restore fails', async () => {
      mockedConfigManager.restoreBackup.mockResolvedValue({
        success: false,
        error: 'Backup not found'
      });
      
      await expect(adapter.restore('/backup/path.json', 'user')).rejects.toThrow(
        'Failed to restore backup'
      );
    });
  });

  describe('server management', () => {
    beforeEach(() => {
      // Mock successful file operations
      mockedPaths.findConfigFile.mockResolvedValue('/path/to/config.json');
      mockedPaths.getAgentConfigPath.mockReturnValue('/path/to/config.json');
      mockedPaths.ensureDir.mockResolvedValue();
      mockedFs.writeFile.mockResolvedValue();
    });

    test('should add server to configuration', async () => {
      const existingConfig = { mcpServers: {} };
      const serverConfig: BaseServerConfig = {
        command: 'node',
        args: ['server.js'],
        env: { NODE_ENV: 'production' }
      };
      
      mockedFs.readFile.mockResolvedValue(JSON.stringify(existingConfig));
      
      await adapter.addServer('test-server', serverConfig, 'user');
      
      expect(mockedFs.writeFile).toHaveBeenCalled();
      const writtenConfig = JSON.parse(mockedFs.writeFile.mock.calls[0][1] as string);
      expect(writtenConfig.mcpServers['test-server']).toEqual({
        command: 'node',
        args: ['server.js'],
        env: { NODE_ENV: 'production' }
      });
    });

    test('should remove server from configuration', async () => {
      const existingConfig = {
        mcpServers: {
          'test-server': { command: 'node' },
          'other-server': { command: 'python' }
        }
      };
      
      mockedFs.readFile.mockResolvedValue(JSON.stringify(existingConfig));
      
      await adapter.removeServer('test-server', 'user');
      
      const writtenConfig = JSON.parse(mockedFs.writeFile.mock.calls[0][1] as string);
      expect(writtenConfig.mcpServers['test-server']).toBeUndefined();
      expect(writtenConfig.mcpServers['other-server']).toBeDefined();
    });

    test('should update existing server configuration', async () => {
      const existingConfig = {
        mcpServers: { 'test-server': { command: 'node' } }
      };
      const updatedServerConfig: BaseServerConfig = {
        command: 'python',
        args: ['app.py']
      };
      
      mockedFs.readFile.mockResolvedValue(JSON.stringify(existingConfig));
      
      await adapter.updateServer('test-server', updatedServerConfig, 'user');
      
      const writtenConfig = JSON.parse(mockedFs.writeFile.mock.calls[0][1] as string);
      expect(writtenConfig.mcpServers['test-server']).toEqual({
        command: 'python',
        args: ['app.py'],
        env: {}
      });
    });
  });

  describe('utility methods', () => {
    test('should check if agent is installed', async () => {
      mockedPaths.findConfigFile
        .mockResolvedValueOnce('/user/config.json')
        .mockResolvedValueOnce(null);
      
      const isInstalled = await adapter.isInstalled();
      
      expect(isInstalled).toBe(true);
    });

    test('should return false if no config files exist', async () => {
      mockedPaths.findConfigFile
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      
      const isInstalled = await adapter.isInstalled();
      
      expect(isInstalled).toBe(false);
    });

    test('should get list of installed servers', async () => {
      const config = {
        mcpServers: {
          'server1': { command: 'node' },
          'server2': { command: 'python' }
        }
      };
      
      mockedPaths.findConfigFile.mockResolvedValue('/path/to/config.json');
      mockedFs.readFile.mockResolvedValue(JSON.stringify(config));
      
      const servers = await adapter.getInstalledServers('user');
      
      expect(servers).toEqual(['server1', 'server2']);
    });

    test('should return empty array for missing config', async () => {
      mockedPaths.findConfigFile.mockResolvedValue(null);
      
      const servers = await adapter.getInstalledServers('user');
      
      expect(servers).toEqual([]);
    });

    test('should check file permissions', async () => {
      mockedPaths.getAgentConfigPath.mockReturnValue('/path/to/config.json');
      mockedPaths.pathExists.mockResolvedValue(true);
      mockedPaths.isReadable.mockResolvedValue(true);
      mockedPaths.isWritable.mockResolvedValue(true);
      
      const permissions = await adapter.checkPermissions('user');
      
      expect(permissions).toEqual({
        exists: true,
        readable: true,
        writable: true,
        path: '/path/to/config.json'
      });
    });

    test('should get configuration statistics', async () => {
      const mockStats = {
        size: 1024,
        mtime: new Date('2023-01-01T00:00:00.000Z')
      };
      
      mockedPaths.getAgentConfigPath.mockReturnValue('/path/to/config.json');
      mockedPaths.pathExists.mockResolvedValue(true);
      mockedFs.stat.mockResolvedValue(mockStats as any);
      mockedPaths.findConfigFile.mockResolvedValue('/path/to/config.json');
      mockedFs.readFile.mockResolvedValue('{"mcpServers":{"server1":{},"server2":{}}}');
      
      const stats = await adapter.getConfigStats('user');
      
      expect(stats).toEqual({
        path: '/path/to/config.json',
        exists: true,
        size: 1024,
        modified: mockStats.mtime,
        serverCount: 2
      });
    });
  });

  describe('configuration merging', () => {
    beforeEach(() => {
      mockedPaths.findConfigFile.mockResolvedValue('/path/to/config.json');
      mockedPaths.getAgentConfigPath.mockReturnValue('/path/to/config.json');
      mockedPaths.ensureDir.mockResolvedValue();
      mockedFs.writeFile.mockResolvedValue();
    });

    test('should merge configurations without overwrite', async () => {
      const currentConfig = {
        mcpServers: { 'server1': { command: 'node' } }
      };
      const sourceConfig = {
        mcpServers: {
          'server1': { command: 'python' }, // existing
          'server2': { command: 'deno' }    // new
        }
      };
      
      mockedFs.readFile.mockResolvedValue(JSON.stringify(currentConfig));
      
      await adapter.mergeConfig(sourceConfig, 'user', false);
      
      const writtenConfig = JSON.parse(mockedFs.writeFile.mock.calls[0][1] as string);
      expect(writtenConfig.mcpServers['server1'].command).toBe('node'); // not overwritten
      expect(writtenConfig.mcpServers['server2'].command).toBe('deno');  // added
    });

    test('should merge configurations with overwrite', async () => {
      const currentConfig = {
        mcpServers: { 'server1': { command: 'node' } }
      };
      const sourceConfig = {
        mcpServers: {
          'server1': { command: 'python' },
          'server2': { command: 'deno' }
        }
      };
      
      mockedFs.readFile.mockResolvedValue(JSON.stringify(currentConfig));
      
      await adapter.mergeConfig(sourceConfig, 'user', true);
      
      const writtenConfig = JSON.parse(mockedFs.writeFile.mock.calls[0][1] as string);
      expect(writtenConfig.mcpServers['server1'].command).toBe('python'); // overwritten
      expect(writtenConfig.mcpServers['server2'].command).toBe('deno');    // added
    });
  });

  describe('import and export', () => {
    test('should export configuration', async () => {
      const config = { mcpServers: { 'server1': { command: 'node' } } };
      
      mockedPaths.findConfigFile.mockResolvedValue('/path/to/config.json');
      mockedFs.readFile.mockResolvedValue(JSON.stringify(config));
      
      const exported = await adapter.exportConfig('user');
      
      expect(exported).toEqual(config);
    });

    test('should import configuration with merge', async () => {
      const importedConfig = { mcpServers: { 'server1': { command: 'python' } } };
      
      mockedPaths.findConfigFile.mockResolvedValue('/path/to/config.json');
      mockedPaths.getAgentConfigPath.mockReturnValue('/path/to/config.json');
      mockedPaths.ensureDir.mockResolvedValue();
      mockedFs.readFile.mockResolvedValue('{"mcpServers":{}}');
      mockedFs.writeFile.mockResolvedValue();
      
      await adapter.importConfig(importedConfig, 'user', true);
      
      expect(mockedFs.writeFile).toHaveBeenCalled();
    });

    test('should import configuration without merge', async () => {
      const importedConfig = { mcpServers: { 'server1': { command: 'python' } } };
      
      mockedPaths.getAgentConfigPath.mockReturnValue('/path/to/config.json');
      mockedPaths.ensureDir.mockResolvedValue();
      mockedFs.writeFile.mockResolvedValue();
      
      await adapter.importConfig(importedConfig, 'user', false);
      
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/path/to/config.json',
        JSON.stringify(importedConfig, null, 2)
      );
    });
  });
});