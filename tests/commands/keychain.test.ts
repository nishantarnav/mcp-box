/**
 * Keychain Commands Tests
 * Tests for CLI keychain management functionality
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { MockedFunction } from 'jest-mock';

// Import the commands to test
import {
  keychainSetCommand,
  keychainGetCommand,
  keychainDeleteCommand,
  keychainListCommand,
  generateTokenCommand
} from '../../src/commands/keychain.js';

// Mock dependencies - these will be auto-mocked by Jest setup
const mockInquirer = {
  prompt: jest.fn()
};

const mockKeytar = {
  setPassword: jest.fn(),
  getPassword: jest.fn(),
  deletePassword: jest.fn(),
  findCredentials: jest.fn()
};

const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

describe('Keychain Commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExit.mockClear();
    
    // Setup mocks for each test
    jest.doMock('inquirer', () => ({ default: mockInquirer }));
    jest.doMock('keytar', () => ({ default: mockKeytar }));
    jest.spyOn(console, 'log').mockImplementation(mockConsole.log);
    jest.spyOn(console, 'error').mockImplementation(mockConsole.error);
    jest.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
  });

  describe('keychainSetCommand', () => {
    test('should store secret in interactive mode', async () => {
      mockInquirer.prompt.mockResolvedValueOnce({
        password: 'test-secret',
        description: 'Test API key',
        tags: 'api,test'
      });
      
      mockKeytar.setPassword.mockResolvedValue(undefined);
      
      await keychainSetCommand('test-account', { interactive: true });
      
      expect(mockInquirer.prompt).toHaveBeenCalled();
      expect(mockKeytar.setPassword).toHaveBeenCalledWith(
        'mcp-box',
        'test-account',
        'test-secret'
      );
    });

    test('should store secret with metadata', async () => {
      mockedInquirer.prompt.mockResolvedValueOnce({
        password: 'test-secret',
        description: 'Test API key',
        tags: 'api,test'
      });
      
      mockedKeytar.setPassword.mockResolvedValue();
      
      await keychainSetCommand('test-account', { interactive: true });
      
      expect(mockedKeytar.setPassword).toHaveBeenCalledTimes(2);
      
      // Check metadata call
      const metadataCall = mockedKeytar.setPassword.mock.calls.find(call => 
        call[1] === 'test-account:metadata'
      );
      expect(metadataCall).toBeDefined();
      
      const metadata = JSON.parse(metadataCall![2]);
      expect(metadata.description).toBe('Test API key');
      expect(metadata.tags).toEqual(['api', 'test']);
      expect(metadata.created).toBeDefined();
    });

    test('should handle keychain errors', async () => {
      mockedInquirer.prompt.mockResolvedValueOnce({
        password: 'test-secret',
        description: '',
        tags: ''
      });
      
      mockedKeytar.setPassword.mockRejectedValue(new Error('Keychain access denied'));
      
      await expect(() => 
        keychainSetCommand('test-account', { interactive: true })
      ).rejects.toThrow('process.exit called');
      
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('should validate empty password', async () => {
      mockedInquirer.prompt.mockImplementationOnce((questions: any) => {
        const passwordQuestion = Array.isArray(questions) ? questions[0] : questions;
        const validation = passwordQuestion.validate('');
        expect(validation).toBe('Secret value cannot be empty');
        
        return Promise.resolve({
          password: 'valid-password',
          description: '',
          tags: ''
        });
      });
      
      mockedKeytar.setPassword.mockResolvedValue();
      
      await keychainSetCommand('test-account', { interactive: true });
    });
  });

  describe('keychainGetCommand', () => {
    test('should retrieve secret successfully', async () => {
      mockedKeytar.getPassword
        .mockResolvedValueOnce('test-secret')
        .mockResolvedValueOnce('{"description":"Test key"}');
      
      await keychainGetCommand('test-account', { format: 'text' });
      
      expect(mockedKeytar.getPassword).toHaveBeenCalledWith(
        'mcp-box',
        'test-account'
      );
    });

    test('should output JSON format', async () => {
      mockedKeytar.getPassword
        .mockResolvedValueOnce('test-secret')
        .mockResolvedValueOnce('{"description":"Test key"}');
      
      const consoleSpy = jest.spyOn(console, 'log');
      
      await keychainGetCommand('test-account', { format: 'json' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({
          account: 'test-account',
          password: 'test-secret',
          metadata: { description: 'Test key' }
        }, null, 2)
      );
    });

    test('should handle non-existent secret', async () => {
      mockedKeytar.getPassword.mockResolvedValue(null);
      
      await keychainGetCommand('non-existent', { format: 'text' });
      
      // Should not exit with error for non-existent secrets
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should handle retrieval errors', async () => {
      mockedKeytar.getPassword.mockRejectedValue(new Error('Access denied'));
      
      await expect(() =>
        keychainGetCommand('test-account', { format: 'text' })
      ).rejects.toThrow('process.exit called');
      
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('keychainDeleteCommand', () => {
    test('should delete secret with confirmation', async () => {
      mockedInquirer.prompt.mockResolvedValueOnce({ confirm: true });
      mockedKeytar.deletePassword.mockResolvedValue(true);
      
      await keychainDeleteCommand('test-account', { force: false });
      
      expect(mockedInquirer.prompt).toHaveBeenCalled();
      expect(mockedKeytar.deletePassword).toHaveBeenCalledWith(
        'mcp-box',
        'test-account'
      );
    });

    test('should skip confirmation with force flag', async () => {
      mockedKeytar.deletePassword.mockResolvedValue(true);
      
      await keychainDeleteCommand('test-account', { force: true });
      
      expect(mockedInquirer.prompt).not.toHaveBeenCalled();
      expect(mockedKeytar.deletePassword).toHaveBeenCalled();
    });

    test('should cancel deletion when not confirmed', async () => {
      mockedInquirer.prompt.mockResolvedValueOnce({ confirm: false });
      
      await keychainDeleteCommand('test-account', { force: false });
      
      expect(mockedKeytar.deletePassword).not.toHaveBeenCalled();
    });

    test('should handle non-existent secret', async () => {
      mockedInquirer.prompt.mockResolvedValueOnce({ confirm: true });
      mockedKeytar.deletePassword.mockResolvedValue(false);
      
      await keychainDeleteCommand('test-account', { force: false });
      
      // Should not exit with error for non-existent secrets
      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  describe('keychainListCommand', () => {
    test('should list secrets in table format', async () => {
      mockedKeytar.findCredentials.mockResolvedValue([
        { account: 'api-key-1', password: 'secret1' },
        { account: 'api-key-2', password: 'secret2' }
      ]);
      
      await keychainListCommand({ format: 'table', verbose: false });
      
      expect(mockedKeytar.findCredentials).toHaveBeenCalledWith('mcp-box');
    });

    test('should list secrets in JSON format', async () => {
      mockedKeytar.findCredentials.mockResolvedValue([
        { account: 'api-key-1', password: 'secret1' },
        { account: 'api-key-2', password: 'secret2' }
      ]);
      
      const consoleSpy = jest.spyOn(console, 'log');
      
      await keychainListCommand({ format: 'json' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(['api-key-1', 'api-key-2'], null, 2)
      );
    });

    test('should show detailed information in verbose mode', async () => {
      mockedKeytar.findCredentials.mockResolvedValue([
        { account: 'api-key-1', password: 'secret1' }
      ]);
      
      mockedKeytar.getPassword
        .mockResolvedValueOnce('secret1')
        .mockResolvedValueOnce('{"description":"Test key","created":"2023-01-01T00:00:00.000Z"}');
      
      await keychainListCommand({ format: 'table', verbose: true });
      
      expect(mockedKeytar.getPassword).toHaveBeenCalledWith('mcp-box', 'api-key-1');
    });

    test('should handle empty keychain', async () => {
      mockedKeytar.findCredentials.mockResolvedValue([]);
      
      await keychainListCommand({ format: 'table' });
      
      // Should not exit with error for empty keychain
      expect(mockExit).not.toHaveBeenCalled();
    });

    test('should filter out metadata entries', async () => {
      mockedKeytar.findCredentials.mockResolvedValue([
        { account: 'api-key-1', password: 'secret1' },
        { account: 'api-key-1:metadata', password: '{}' },
        { account: 'api-key-2', password: 'secret2' }
      ]);
      
      const consoleSpy = jest.spyOn(console, 'log');
      
      await keychainListCommand({ format: 'json' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(['api-key-1', 'api-key-2'], null, 2)
      );
    });
  });

  describe('generateTokenCommand', () => {
    test('should generate hex token by default', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      await generateTokenCommand(16, { format: 'hex', interactive: false });
      
      const tokenOutput = consoleSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].match(/^[a-f0-9]{16}$/)
      );
      expect(tokenOutput).toBeDefined();
    });

    test('should generate base64 token', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      await generateTokenCommand(24, { format: 'base64', interactive: false });
      
      // Should generate a base64 encoded token
      const tokenCall = consoleSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && /^[A-Za-z0-9+/]+=*$/.test(call[0])
      );
      expect(tokenCall).toBeDefined();
    });

    test('should generate alphanumeric token', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      await generateTokenCommand(20, { format: 'alphanumeric', interactive: false });
      
      const tokenCall = consoleSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].length === 20 && /^[A-Za-z0-9]+$/.test(call[0])
      );
      expect(tokenCall).toBeDefined();
    });

    test('should offer to store token in keychain', async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ store: true })
        .mockResolvedValueOnce({ account: 'test-token' });
      
      mockedKeytar.setPassword.mockResolvedValue();
      
      await generateTokenCommand(16, { format: 'hex', interactive: true });
      
      expect(mockedInquirer.prompt).toHaveBeenCalledTimes(2);
      expect(mockedKeytar.setPassword).toHaveBeenCalled();
    });

    test('should not store token when declined', async () => {
      mockedInquirer.prompt.mockResolvedValueOnce({ store: false });
      
      await generateTokenCommand(16, { format: 'hex', interactive: true });
      
      expect(mockedKeytar.setPassword).not.toHaveBeenCalled();
    });

    test('should show verbose information', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      await generateTokenCommand(16, { 
        format: 'hex', 
        interactive: false, 
        verbose: true 
      });
      
      const lengthOutput = consoleSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('Length:')
      );
      expect(lengthOutput).toBeDefined();
      
      const formatOutput = consoleSpy.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('Format:')
      );
      expect(formatOutput).toBeDefined();
    });
  });
});