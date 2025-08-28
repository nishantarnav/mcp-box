/**
 * Security Utilities
 * Handles secret validation, keychain integration, and secure environment variables
 */

import keytar from 'keytar';
import crypto from 'crypto';
import { z } from 'zod';
import type { SecurityConfig, EnvironmentConfig } from '../types/config.d.js';

// Service name for keychain storage
const KEYCHAIN_SERVICE = 'mcp-box';

// Secret patterns to detect sensitive information
const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /credential/i,
  /auth/i,
  /bearer/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /session[_-]?id/i,
  /oauth/i,
  /jwt/i
];

// Common secret value patterns
const SECRET_VALUE_PATTERNS = [
  /^[A-Za-z0-9+/]{40,}={0,2}$/, // Base64 encoded strings (40+ chars)
  /^[a-f0-9]{32,}$/i, // Hexadecimal strings (32+ chars)
  /^sk-[a-zA-Z0-9]{48,}$/, // OpenAI API keys
  /^AIza[0-9A-Za-z-_]{35}$/, // Google API keys
  /^[A-Za-z0-9_-]{20,}$/, // Generic tokens (20+ chars)
  /^ghp_[a-zA-Z0-9]{36}$/, // GitHub personal access tokens
  /^[a-zA-Z0-9]{40}$/, // GitHub tokens
  /^xoxb-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}$/ // Slack bot tokens
];

export interface SecretValidationResult {
  isSecret: boolean;
  confidence: 'low' | 'medium' | 'high';
  patterns: string[];
  suggestion: string;
}

export interface KeychainEntry {
  account: string;
  password: string;
  metadata?: Record<string, any>;
}

export class SecurityManager {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * Update security configuration
   */
  updateConfig(config: SecurityConfig): void {
    this.config = config;
  }

  /**
   * Validate if a key-value pair contains secrets
   */
  validateSecret(key: string, value: string): SecretValidationResult {
    const result: SecretValidationResult = {
      isSecret: false,
      confidence: 'low',
      patterns: [],
      suggestion: ''
    };

    if (!this.config.secretValidation) {
      return result;
    }

    // Check key patterns
    const keyMatches = SECRET_PATTERNS.filter(pattern => pattern.test(key));
    if (keyMatches.length > 0) {
      result.isSecret = true;
      result.confidence = 'high';
      result.patterns.push(`Key pattern: ${key}`);
    }

    // Check value patterns
    const valueMatches = SECRET_VALUE_PATTERNS.filter(pattern => pattern.test(value));
    if (valueMatches.length > 0) {
      result.isSecret = true;
      result.confidence = result.confidence === 'high' ? 'high' : 'medium';
      result.patterns.push(`Value pattern: ${value.substring(0, 10)}...`);
    }

    // Entropy check for potential secrets
    const entropy = this.calculateEntropy(value);
    if (entropy > 4.5 && value.length > 20) {
      result.isSecret = true;
      result.confidence = result.confidence === 'high' ? 'high' : 'medium';
      result.patterns.push(`High entropy: ${entropy.toFixed(2)}`);
    }

    // Generate suggestion
    if (result.isSecret) {
      if (this.config.keychainIntegration) {
        result.suggestion = 'Consider storing this secret in the system keychain using "mcp-box keychain set"';
      } else if (this.config.allowPlaintextSecrets) {
        result.suggestion = 'Warning: This appears to be a secret value stored in plaintext';
      } else {
        result.suggestion = 'Error: Secret values are not allowed in configuration files';
      }
    }

    return result;
  }

  /**
   * Calculate Shannon entropy of a string
   */
  private calculateEntropy(str: string): number {
    const len = str.length;
    const frequencies: Record<string, number> = {};
    
    // Count character frequencies
    for (const char of str) {
      frequencies[char] = (frequencies[char] || 0) + 1;
    }
    
    // Calculate entropy
    let entropy = 0;
    for (const freq of Object.values(frequencies)) {
      const probability = freq / len;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  }

  /**
   * Validate environment configuration
   */
  async validateEnvironmentConfig(envConfig: EnvironmentConfig): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    secrets: Array<{ key: string; validation: SecretValidationResult }>;
  }> {
    const result = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      secrets: [] as Array<{ key: string; validation: SecretValidationResult }>
    };

    if (!this.config.environmentVariableValidation) {
      return result;
    }

    for (const [key, variable] of Object.entries(envConfig.variables)) {
      // Validate required variables
      if (variable.required && !variable.value) {
        result.valid = false;
        result.errors.push(`Required environment variable '${key}' is missing`);
      }

      // Validate regex patterns
      if (variable.validation && variable.value) {
        try {
          const regex = new RegExp(variable.validation);
          if (!regex.test(variable.value)) {
            result.valid = false;
            result.errors.push(`Environment variable '${key}' does not match validation pattern`);
          }
        } catch (error) {
          result.warnings.push(`Invalid validation pattern for '${key}': ${variable.validation}`);
        }
      }

      // Check for secrets
      if (variable.value) {
        const secretValidation = this.validateSecret(key, variable.value);
        if (secretValidation.isSecret) {
          result.secrets.push({ key, validation: secretValidation });
          
          if (!this.config.allowPlaintextSecrets && !variable.secure) {
            result.valid = false;
            result.errors.push(`Secret detected in '${key}' but plaintext secrets are not allowed`);
          } else if (!variable.secure) {
            result.warnings.push(`Potential secret detected in '${key}': ${secretValidation.suggestion}`);
          }
        }
      }
    }

    return result;
  }

  /**
   * Store secret in system keychain
   */
  async storeSecret(account: string, password: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.config.keychainIntegration) {
      throw new Error('Keychain integration is disabled');
    }

    try {
      await keytar.setPassword(KEYCHAIN_SERVICE, account, password);
      
      // Store metadata separately if provided
      if (metadata) {
        const metadataKey = `${account}:metadata`;
        await keytar.setPassword(KEYCHAIN_SERVICE, metadataKey, JSON.stringify(metadata));
      }
    } catch (error) {
      throw new Error(`Failed to store secret in keychain: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieve secret from system keychain
   */
  async getSecret(account: string): Promise<KeychainEntry | null> {
    if (!this.config.keychainIntegration) {
      throw new Error('Keychain integration is disabled');
    }

    try {
      const password = await keytar.getPassword(KEYCHAIN_SERVICE, account);
      if (!password) {
        return null;
      }

      // Try to get metadata
      let metadata: Record<string, any> | undefined;
      try {
        const metadataKey = `${account}:metadata`;
        const metadataJson = await keytar.getPassword(KEYCHAIN_SERVICE, metadataKey);
        if (metadataJson) {
          metadata = JSON.parse(metadataJson);
        }
      } catch {
        // Ignore metadata errors
      }

      return {
        account,
        password,
        metadata
      };
    } catch (error) {
      throw new Error(`Failed to retrieve secret from keychain: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete secret from system keychain
   */
  async deleteSecret(account: string): Promise<boolean> {
    if (!this.config.keychainIntegration) {
      throw new Error('Keychain integration is disabled');
    }

    try {
      const deleted = await keytar.deletePassword(KEYCHAIN_SERVICE, account);
      
      // Also delete metadata if it exists
      try {
        const metadataKey = `${account}:metadata`;
        await keytar.deletePassword(KEYCHAIN_SERVICE, metadataKey);
      } catch {
        // Ignore metadata errors
      }

      return deleted;
    } catch (error) {
      throw new Error(`Failed to delete secret from keychain: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all stored secrets
   */
  async listSecrets(): Promise<string[]> {
    if (!this.config.keychainIntegration) {
      throw new Error('Keychain integration is disabled');
    }

    try {
      const credentials = await keytar.findCredentials(KEYCHAIN_SERVICE);
      return credentials
        .filter(cred => !cred.account.endsWith(':metadata'))
        .map(cred => cred.account);
    } catch (error) {
      throw new Error(`Failed to list secrets from keychain: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate a secure random string
   */
  generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a value using SHA-256
   */
  hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Encrypt a value using AES-256-CBC
   */
  encrypt(value: string, key: string): { encrypted: string; iv: string; tag: string } {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    
    // Create a hash of the key to ensure it's the right length (32 bytes for AES-256)
    const keyHash = crypto.createHash('sha256').update(key).digest();
    const cipher = crypto.createCipheriv(algorithm, keyHash, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: '' // CBC doesn't use auth tags
    };
  }

  /**
   * Decrypt a value using AES-256-CBC
   */
  decrypt(encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string {
    const algorithm = 'aes-256-cbc';
    
    // Create a hash of the key to ensure it's the right length (32 bytes for AES-256)
    const keyHash = crypto.createHash('sha256').update(key).digest();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Validate trusted source URL
   */
  isTrustedSource(url: string): boolean {
    if (this.config.trustedSources.length === 0) {
      return true; // If no trusted sources configured, allow all
    }

    return this.config.trustedSources.some(source => {
      if (source.includes('*')) {
        // Simple wildcard matching
        const pattern = source.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(url);
      }
      return url.startsWith(source);
    });
  }

  /**
   * Sanitize configuration object by removing or masking secrets
   */
  sanitizeConfig(config: any): any {
    if (!this.config.secretValidation) {
      return config;
    }

    const sanitized = JSON.parse(JSON.stringify(config));
    
    this.walkObject(sanitized, (key: string, value: any, parent: any) => {
      if (typeof value === 'string') {
        const validation = this.validateSecret(key, value);
        if (validation.isSecret) {
          parent[key] = '[REDACTED]';
        }
      }
    });
    
    return sanitized;
  }

  /**
   * Walk through object properties recursively
   */
  private walkObject(obj: any, callback: (key: string, value: any, parent: any) => void): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      callback(key, value, obj);
      
      if (typeof value === 'object' && value !== null) {
        this.walkObject(value, callback);
      }
    }
  }
}

// Create default security manager instance
export const securityManager = new SecurityManager({
  secretValidation: true,
  keychainIntegration: true,
  allowPlaintextSecrets: false,
  trustedSources: [],
  requireSignedPackages: false,
  sandboxExecution: true,
  environmentVariableValidation: true
});

/**
 * Helper functions for secret management
 */

/**
 * Store a secret securely (keychain or environment variable)
 */
export async function storeSecretSecurely(
  key: string,
  value: string,
  options: {
    useKeychain?: boolean;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  const { useKeychain = true, metadata } = options;
  
  if (useKeychain && securityManager['config'].keychainIntegration) {
    await securityManager.storeSecret(key, value, metadata);
  } else {
    // Fallback to environment variable with warning
    process.env[key.toUpperCase()] = value;
    console.warn(`Warning: Secret stored as environment variable (keychain unavailable)`);
  }
}

/**
 * Retrieve a secret from secure storage
 */
export async function getSecretSecurely(key: string): Promise<string | null> {
  // Try keychain first
  if (securityManager['config'].keychainIntegration) {
    try {
      const entry = await securityManager.getSecret(key);
      if (entry) {
        return entry.password;
      }
    } catch {
      // Fallback to environment variable
    }
  }
  
  // Fallback to environment variable
  return process.env[key.toUpperCase()] || null;
}

/**
 * Validate configuration for secrets
 */
export function validateConfigSecurity(config: any): {
  hasSecrets: boolean;
  secrets: Array<{ path: string; key: string; suggestion: string }>;
  errors: string[];
} {
  const result = {
    hasSecrets: false,
    secrets: [] as Array<{ path: string; key: string; suggestion: string }>,
    errors: [] as string[]
  };

  function walkConfig(obj: any, path = ''): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string') {
        const validation = securityManager.validateSecret(key, value);
        if (validation.isSecret) {
          result.hasSecrets = true;
          result.secrets.push({
            path: currentPath,
            key,
            suggestion: validation.suggestion
          });
          
          if (!securityManager['config'].allowPlaintextSecrets) {
            result.errors.push(`Secret detected at ${currentPath}: ${validation.suggestion}`);
          }
        }
      } else if (typeof value === 'object') {
        walkConfig(value, currentPath);
      }
    }
  }

  walkConfig(config);
  return result;
}