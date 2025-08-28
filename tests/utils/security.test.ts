/**
 * Security Utilities Tests
 * Tests for secret validation, keychain integration, and security features
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import keytar from 'keytar';
import { SecurityManager, securityManager, validateConfigSecurity } from '../../src/utils/security.js';
import type { SecurityConfig } from '../../src/types/config.d.js';

// Mock keytar
const mockedKeytar = keytar as jest.Mocked<typeof keytar>;

describe('SecurityManager', () => {
  let manager: SecurityManager;
  let mockConfig: SecurityConfig;

  beforeEach(() => {
    mockConfig = {
      secretValidation: true,
      keychainIntegration: true,
      allowPlaintextSecrets: false,
      trustedSources: ['https://github.com', 'https://npmjs.com'],
      requireSignedPackages: false,
      sandboxExecution: true,
      environmentVariableValidation: true
    };
    manager = new SecurityManager(mockConfig);
  });

  describe('validateSecret', () => {
    test('should detect API key patterns', () => {
      const result = manager.validateSecret('api_key', 'sk-1234567890abcdef');
      expect(result.isSecret).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.patterns).toContain('Key pattern: api_key');
    });

    test('should detect secret value patterns', () => {
      const result = manager.validateSecret('token', 'sk-abcdefghijklmnopqrstuvwxyz1234567890123456');
      expect(result.isSecret).toBe(true);
      expect(result.confidence).toBe('high');
    });

    test('should detect high entropy values', () => {
      const result = manager.validateSecret('random_key', 'x8f2k9m4l7p3n6q1w5e8r2t9y4u7i0o3p6a1s4d5f7g9h2j3k6l8z0x2c4v6b8n1m3');
      expect(result.isSecret).toBe(true);
      expect(result.patterns.some(p => p.includes('High entropy'))).toBe(true);
    });

    test('should not flag normal configuration values', () => {
      const result = manager.validateSecret('database_host', 'localhost');
      expect(result.isSecret).toBe(false);
    });

    test('should respect secretValidation config', () => {
      manager.updateConfig({ ...mockConfig, secretValidation: false });
      const result = manager.validateSecret('api_key', 'sk-1234567890abcdef');
      expect(result.isSecret).toBe(false);
    });

    test('should provide appropriate suggestions', () => {
      const result = manager.validateSecret('password', 'super-secret-password');
      expect(result.suggestion).toContain('keychain');
    });
  });

  describe('keychain operations', () => {
    beforeEach(() => {
      // Skip mock clearing since keytar is auto-mocked by setup
      // The global setup already handles mock clearing
    });

    test('should store secret in keychain', async () => {
      mockedKeytar.setPassword.mockResolvedValue();
      
      await manager.storeSecret('test-account', 'test-password');
      
      expect(mockedKeytar.setPassword).toHaveBeenCalledWith(
        'mcp-box',
        'test-account',
        'test-password'
      );
    });

    test('should store secret with metadata', async () => {
      mockedKeytar.setPassword.mockResolvedValue();
      const metadata = { description: 'Test API key' };
      
      await manager.storeSecret('test-account', 'test-password', metadata);
      
      expect(mockedKeytar.setPassword).toHaveBeenCalledTimes(2);
      expect(mockedKeytar.setPassword).toHaveBeenCalledWith(
        'mcp-box',
        'test-account:metadata',
        JSON.stringify(metadata)
      );
    });

    test('should retrieve secret from keychain', async () => {
      mockedKeytar.getPassword
        .mockResolvedValueOnce('test-password')
        .mockResolvedValueOnce('{"description":"Test key"}');
      
      const result = await manager.getSecret('test-account');
      
      expect(result).toEqual({
        account: 'test-account',
        password: 'test-password',
        metadata: { description: 'Test key' }
      });
    });

    test('should return null for non-existent secret', async () => {
      mockedKeytar.getPassword.mockResolvedValue(null);
      
      const result = await manager.getSecret('non-existent');
      
      expect(result).toBeNull();
    });

    test('should delete secret from keychain', async () => {
      mockedKeytar.deletePassword.mockResolvedValue(true);
      
      const result = await manager.deleteSecret('test-account');
      
      expect(result).toBe(true);
      expect(mockedKeytar.deletePassword).toHaveBeenCalledWith(
        'mcp-box',
        'test-account'
      );
    });

    test('should list all secrets', async () => {
      mockedKeytar.findCredentials.mockResolvedValue([
        { account: 'api-key-1', password: 'secret1' },
        { account: 'api-key-2', password: 'secret2' },
        { account: 'api-key-1:metadata', password: '{}' }
      ]);
      
      const result = await manager.listSecrets();
      
      expect(result).toEqual(['api-key-1', 'api-key-2']);
    });

    test('should throw error when keychain integration disabled', async () => {
      manager.updateConfig({ ...mockConfig, keychainIntegration: false });
      
      await expect(manager.storeSecret('test', 'secret')).rejects.toThrow(
        'Keychain integration is disabled'
      );
    });
  });

  describe('trusted sources', () => {
    test('should validate trusted sources', () => {
      expect(manager.isTrustedSource('https://github.com/user/repo')).toBe(true);
      expect(manager.isTrustedSource('https://npmjs.com/package')).toBe(true);
      expect(manager.isTrustedSource('https://evil.com/malware')).toBe(false);
    });

    test('should support wildcard patterns', () => {
      manager.updateConfig({
        ...mockConfig,
        trustedSources: ['https://*.github.com', 'https://npmjs.*']
      });
      
      expect(manager.isTrustedSource('https://api.github.com')).toBe(true);
      expect(manager.isTrustedSource('https://npmjs.org')).toBe(true);
      expect(manager.isTrustedSource('https://evil.com')).toBe(false);
    });

    test('should allow all sources when none configured', () => {
      manager.updateConfig({ ...mockConfig, trustedSources: [] });
      
      expect(manager.isTrustedSource('https://evil.com')).toBe(true);
    });
  });

  describe('encryption utilities', () => {
    test('should generate secure tokens', () => {
      const token = manager.generateSecureToken(16);
      expect(token).toHaveLength(32); // hex encoding doubles length
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    test('should hash values consistently', () => {
      const hash1 = manager.hashValue('test');
      const hash2 = manager.hashValue('test');
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should encrypt and decrypt values', () => {
      const original = 'sensitive data';
      const key = 'encryption-key';
      
      const encrypted = manager.encrypt(original, key);
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      
      const decrypted = manager.decrypt(encrypted, key);
      expect(decrypted).toBe(original);
    });
  });

  describe('configuration sanitization', () => {
    test('should sanitize configuration with secrets', () => {
      const config = {
        api_key: 'sk-1234567890abcdef',
        database_host: 'localhost',
        nested: {
          password: 'super-secret',
          port: 5432
        }
      };
      
      const sanitized = manager.sanitizeConfig(config);
      
      expect(sanitized.api_key).toBe('[REDACTED]');
      expect(sanitized.database_host).toBe('localhost');
      expect(sanitized.nested.password).toBe('[REDACTED]');
      expect(sanitized.nested.port).toBe(5432);
    });

    test('should not sanitize when validation disabled', () => {
      manager.updateConfig({ ...mockConfig, secretValidation: false });
      
      const config = { api_key: 'sk-1234567890abcdef' };
      const sanitized = manager.sanitizeConfig(config);
      
      expect(sanitized.api_key).toBe('sk-1234567890abcdef');
    });
  });
});

describe('validateConfigSecurity', () => {
  test('should detect secrets in configuration', () => {
    const config = {
      server: {
        api_key: 'sk-1234567890abcdef',
        host: 'localhost'
      },
      auth: {
        token: 'abc123xyz789'
      }
    };
    
    const result = validateConfigSecurity(config);
    
    expect(result.hasSecrets).toBe(true);
    expect(result.secrets).toHaveLength(2);
    expect(result.secrets[0].path).toBe('server.api_key');
    expect(result.secrets[1].path).toBe('auth.token');
  });

  test('should return no secrets for clean configuration', () => {
    const config = {
      server: { host: 'localhost', port: 3000 },
      database: { name: 'mydb' }
    };
    
    const result = validateConfigSecurity(config);
    
    expect(result.hasSecrets).toBe(false);
    expect(result.secrets).toHaveLength(0);
  });
});

describe('default security manager', () => {
  test('should be properly initialized', () => {
    expect(securityManager).toBeInstanceOf(SecurityManager);
  });
});