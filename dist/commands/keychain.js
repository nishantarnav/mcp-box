/**
 * Keychain Management Commands
 * CLI commands for managing secrets in system keychain
 */
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import { securityManager, validateConfigSecurity } from '../utils/security.js';
/**
 * Set a secret in the keychain
 */
export async function keychainSetCommand(account, options) {
    console.log(chalk.cyan.bold('🔐 Store Secret in Keychain'));
    try {
        let password;
        let metadata;
        if (options.interactive !== false) {
            // Interactive mode
            const answers = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'password',
                    message: `Enter secret value for '${account}':`,
                    mask: '*',
                    validate: (input) => {
                        if (!input || input.trim().length === 0) {
                            return 'Secret value cannot be empty';
                        }
                        return true;
                    }
                },
                {
                    type: 'input',
                    name: 'description',
                    message: 'Enter description (optional):',
                    default: ''
                },
                {
                    type: 'input',
                    name: 'tags',
                    message: 'Enter tags (comma-separated, optional):',
                    default: ''
                }
            ]);
            password = answers.password;
            if (answers.description || answers.tags) {
                metadata = {};
                if (answers.description) {
                    metadata.description = answers.description;
                }
                if (answers.tags) {
                    metadata.tags = answers.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
                }
                metadata.created = new Date().toISOString();
            }
        }
        else {
            // Non-interactive mode - read from stdin
            const stdin = process.stdin;
            stdin.setEncoding('utf8');
            password = '';
            return new Promise((resolve, reject) => {
                stdin.on('data', (chunk) => {
                    password += chunk;
                });
                stdin.on('end', async () => {
                    password = password.trim();
                    if (!password) {
                        reject(new Error('No secret value provided'));
                        return;
                    }
                    try {
                        await storeSecret();
                        resolve();
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            });
        }
        await storeSecret();
        async function storeSecret() {
            const spinner = ora('Storing secret in keychain...').start();
            try {
                await securityManager.storeSecret(account, password, metadata);
                spinner.succeed(chalk.green(`Secret '${account}' stored successfully`));
                if (options.verbose && metadata) {
                    console.log(chalk.gray('Metadata:'), metadata);
                }
            }
            catch (error) {
                spinner.fail(chalk.red('Failed to store secret'));
                throw error;
            }
        }
    }
    catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
/**
 * Get a secret from the keychain
 */
export async function keychainGetCommand(account, options) {
    console.log(chalk.cyan.bold('🔓 Retrieve Secret from Keychain'));
    try {
        const spinner = ora('Retrieving secret from keychain...').start();
        const entry = await securityManager.getSecret(account);
        if (!entry) {
            spinner.fail(chalk.yellow(`Secret '${account}' not found`));
            return;
        }
        spinner.succeed(chalk.green(`Secret '${account}' retrieved`));
        if (options.format === 'json') {
            const output = {
                account: entry.account,
                password: entry.password,
                metadata: entry.metadata
            };
            console.log(JSON.stringify(output, null, 2));
        }
        else {
            console.log(chalk.gray('Account:'), entry.account);
            console.log(chalk.gray('Password:'), entry.password);
            if (entry.metadata && options.verbose) {
                console.log(chalk.gray('Metadata:'));
                console.log(JSON.stringify(entry.metadata, null, 2));
            }
        }
    }
    catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
/**
 * Delete a secret from the keychain
 */
export async function keychainDeleteCommand(account, options) {
    console.log(chalk.cyan.bold('🗑️  Delete Secret from Keychain'));
    try {
        // Confirm deletion unless force flag is used
        if (!options.force) {
            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `Are you sure you want to delete secret '${account}'?`,
                    default: false
                }
            ]);
            if (!confirm) {
                console.log(chalk.yellow('Deletion cancelled'));
                return;
            }
        }
        const spinner = ora('Deleting secret from keychain...').start();
        const deleted = await securityManager.deleteSecret(account);
        if (deleted) {
            spinner.succeed(chalk.green(`Secret '${account}' deleted successfully`));
        }
        else {
            spinner.warn(chalk.yellow(`Secret '${account}' not found`));
        }
    }
    catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
/**
 * List all secrets in the keychain
 */
export async function keychainListCommand(options) {
    console.log(chalk.cyan.bold('📋 List Keychain Secrets'));
    try {
        const spinner = ora('Loading secrets from keychain...').start();
        const accounts = await securityManager.listSecrets();
        spinner.succeed(chalk.green(`Found ${accounts.length} secrets`));
        if (accounts.length === 0) {
            console.log(chalk.gray('No secrets found in keychain'));
            return;
        }
        if (options.format === 'json') {
            console.log(JSON.stringify(accounts, null, 2));
            return;
        }
        // Create table
        const table = new Table({
            head: ['Account', 'Description', 'Created', 'Tags'],
            style: {
                head: ['cyan'],
                border: ['gray']
            }
        });
        // Get metadata for each secret if verbose
        if (options.verbose) {
            for (const account of accounts) {
                try {
                    const entry = await securityManager.getSecret(account);
                    const metadata = entry?.metadata || {};
                    table.push([
                        account,
                        metadata.description || chalk.gray('(no description)'),
                        metadata.created ? new Date(metadata.created).toLocaleDateString() : chalk.gray('(unknown)'),
                        metadata.tags ? metadata.tags.join(', ') : chalk.gray('(no tags)')
                    ]);
                }
                catch {
                    table.push([
                        account,
                        chalk.red('(error loading metadata)'),
                        chalk.gray('(unknown)'),
                        chalk.gray('(unknown)')
                    ]);
                }
            }
        }
        else {
            // Simple list
            accounts.forEach(account => {
                table.push([account, chalk.gray('(use --verbose for details)'), '', '']);
            });
        }
        console.log(table.toString());
    }
    catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
/**
 * Validate configuration for security issues
 */
export async function securityScanCommand(configPath, options = {}) {
    console.log(chalk.cyan.bold('🔍 Security Configuration Scan'));
    try {
        let configToScan;
        if (configPath) {
            // Scan specific file
            console.log(chalk.gray(`Scanning configuration file: ${configPath}`));
            const fs = await import('fs/promises');
            const configContent = await fs.readFile(configPath, 'utf-8');
            configToScan = JSON.parse(configContent);
        }
        else {
            // Scan current project configuration
            console.log(chalk.gray('Scanning current project configuration...'));
            // This would scan the current MCP Box configuration
            // For now, we'll use a placeholder
            configToScan = {};
        }
        const spinner = ora('Analyzing configuration for security issues...').start();
        const results = validateConfigSecurity(configToScan);
        if (results.hasSecrets || results.errors.length > 0) {
            spinner.fail(chalk.red('Security issues found'));
        }
        else {
            spinner.succeed(chalk.green('No security issues found'));
        }
        // Display results
        if (results.errors.length > 0) {
            console.log(chalk.red.bold('\n❌ Security Errors:'));
            results.errors.forEach(error => {
                console.log(chalk.red(`  • ${error}`));
            });
        }
        if (results.secrets.length > 0) {
            console.log(chalk.yellow.bold('\n⚠️  Potential Secrets Found:'));
            if (options.format === 'json') {
                console.log(JSON.stringify(results.secrets, null, 2));
            }
            else {
                const table = new Table({
                    head: ['Path', 'Key', 'Suggestion'],
                    style: {
                        head: ['cyan'],
                        border: ['gray']
                    },
                    colWidths: [30, 20, 50]
                });
                results.secrets.forEach(secret => {
                    table.push([
                        secret.path,
                        secret.key,
                        secret.suggestion
                    ]);
                });
                console.log(table.toString());
            }
        }
        // Provide recommendations
        if (results.hasSecrets) {
            console.log(chalk.cyan.bold('\n💡 Recommendations:'));
            console.log(chalk.gray('  • Use "mcp-box keychain set <account>" to store secrets securely'));
            console.log(chalk.gray('  • Reference secrets using environment variables in configuration'));
            console.log(chalk.gray('  • Enable keychain integration in security settings'));
        }
    }
    catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
/**
 * Generate a secure token/password
 */
export async function generateTokenCommand(length = 32, options = {}) {
    console.log(chalk.cyan.bold('🎲 Generate Secure Token'));
    try {
        let token;
        const format = options.format || 'hex';
        switch (format) {
            case 'base64':
                token = Buffer.from(securityManager.generateSecureToken(length / 2)).toString('base64');
                break;
            case 'alphanumeric':
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                token = Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                break;
            case 'hex':
            default:
                token = securityManager.generateSecureToken(length / 2);
                break;
        }
        console.log(chalk.green('Generated token:'));
        console.log(token);
        if (options.verbose) {
            console.log(chalk.gray(`Length: ${token.length} characters`));
            console.log(chalk.gray(`Format: ${format}`));
        }
        // Ask if user wants to store in keychain
        if (options.interactive !== false) {
            const { store } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'store',
                    message: 'Would you like to store this token in the keychain?',
                    default: false
                }
            ]);
            if (store) {
                const { account } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'account',
                        message: 'Enter account name for this token:',
                        validate: (input) => {
                            if (!input || input.trim().length === 0) {
                                return 'Account name cannot be empty';
                            }
                            return true;
                        }
                    }
                ]);
                await securityManager.storeSecret(account, token, {
                    generated: true,
                    format: format,
                    length: token.length,
                    created: new Date().toISOString()
                });
                console.log(chalk.green(`Token stored in keychain as '${account}'`));
            }
        }
    }
    catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
//# sourceMappingURL=keychain.js.map