/**
 * Keychain Management Commands
 * CLI commands for managing secrets in system keychain
 */
export interface KeychainCommandOptions {
    verbose?: boolean;
    force?: boolean;
    interactive?: boolean;
    format?: 'table' | 'json' | 'yaml' | 'text';
}
export interface GenerateTokenOptions {
    verbose?: boolean;
    force?: boolean;
    interactive?: boolean;
    format?: 'hex' | 'base64' | 'alphanumeric';
    length?: string;
}
/**
 * Set a secret in the keychain
 */
export declare function keychainSetCommand(account: string, options: KeychainCommandOptions): Promise<void>;
/**
 * Get a secret from the keychain
 */
export declare function keychainGetCommand(account: string, options: KeychainCommandOptions): Promise<void>;
/**
 * Delete a secret from the keychain
 */
export declare function keychainDeleteCommand(account: string, options: KeychainCommandOptions): Promise<void>;
/**
 * List all secrets in the keychain
 */
export declare function keychainListCommand(options: KeychainCommandOptions): Promise<void>;
/**
 * Validate configuration for security issues
 */
export declare function securityScanCommand(configPath?: string, options?: KeychainCommandOptions): Promise<void>;
/**
 * Generate a secure token/password
 */
export declare function generateTokenCommand(length?: number, options?: GenerateTokenOptions): Promise<void>;
//# sourceMappingURL=keychain.d.ts.map