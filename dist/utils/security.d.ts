/**
 * Security Utilities
 * Handles secret validation, keychain integration, and secure environment variables
 */
import type { SecurityConfig, EnvironmentConfig } from '../types/config.d.js';
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
export declare class SecurityManager {
    private config;
    constructor(config: SecurityConfig);
    /**
     * Update security configuration
     */
    updateConfig(config: SecurityConfig): void;
    /**
     * Validate if a key-value pair contains secrets
     */
    validateSecret(key: string, value: string): SecretValidationResult;
    /**
     * Calculate Shannon entropy of a string
     */
    private calculateEntropy;
    /**
     * Validate environment configuration
     */
    validateEnvironmentConfig(envConfig: EnvironmentConfig): Promise<{
        valid: boolean;
        errors: string[];
        warnings: string[];
        secrets: Array<{
            key: string;
            validation: SecretValidationResult;
        }>;
    }>;
    /**
     * Store secret in system keychain
     */
    storeSecret(account: string, password: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Retrieve secret from system keychain
     */
    getSecret(account: string): Promise<KeychainEntry | null>;
    /**
     * Delete secret from system keychain
     */
    deleteSecret(account: string): Promise<boolean>;
    /**
     * List all stored secrets
     */
    listSecrets(): Promise<string[]>;
    /**
     * Generate a secure random string
     */
    generateSecureToken(length?: number): string;
    /**
     * Hash a value using SHA-256
     */
    hashValue(value: string): string;
    /**
     * Encrypt a value using AES-256-CBC
     */
    encrypt(value: string, key: string): {
        encrypted: string;
        iv: string;
        tag: string;
    };
    /**
     * Decrypt a value using AES-256-CBC
     */
    decrypt(encryptedData: {
        encrypted: string;
        iv: string;
        tag: string;
    }, key: string): string;
    /**
     * Validate trusted source URL
     */
    isTrustedSource(url: string): boolean;
    /**
     * Sanitize configuration object by removing or masking secrets
     */
    sanitizeConfig(config: any): any;
    /**
     * Walk through object properties recursively
     */
    private walkObject;
}
export declare const securityManager: SecurityManager;
/**
 * Helper functions for secret management
 */
/**
 * Store a secret securely (keychain or environment variable)
 */
export declare function storeSecretSecurely(key: string, value: string, options?: {
    useKeychain?: boolean;
    metadata?: Record<string, any>;
}): Promise<void>;
/**
 * Retrieve a secret from secure storage
 */
export declare function getSecretSecurely(key: string): Promise<string | null>;
/**
 * Validate configuration for secrets
 */
export declare function validateConfigSecurity(config: any): {
    hasSecrets: boolean;
    secrets: Array<{
        path: string;
        key: string;
        suggestion: string;
    }>;
    errors: string[];
};
//# sourceMappingURL=security.d.ts.map