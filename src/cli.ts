#!/usr/bin/env node

/**
 * MCP Box CLI Entry Point
 * Main command-line interface for managing MCP servers across AI coding agents
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import command implementations
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import { activateCommand, deactivateCommand, removeCommand } from './commands/manage.js';
import { doctorCommand } from './commands/doctor.js';
import { searchCommand } from './commands/search.js';
import { importCommand } from './commands/import.js';
import { switchCommand } from './commands/switch.js';
import { editCommand } from './commands/edit.js';
import {
  keychainSetCommand,
  keychainGetCommand,
  keychainDeleteCommand,
  keychainListCommand,
  securityScanCommand,
  generateTokenCommand
} from './commands/keychain.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get package version
let version = '1.0.0';
try {
  const packagePath = join(__dirname, '../package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
  version = packageJson.version;
} catch {
  // Fallback to default version
}

// Create the main program
const program = new Command();

program
  .name('mcp-box')
  .description(chalk.cyan('MCP Box - Universal CLI for managing MCP servers across AI coding agents'))
  .version(version, '-v, --version', 'display version number')
  .helpOption('-h, --help', 'display help for command');

// Global options
program
  .option('--verbose', 'enable verbose logging')
  .option('--dry-run', 'show what would happen without executing')
  .option('--no-backup', 'skip creating backups')
  .option('--no-color', 'disable colored output');

// Primary commands
program
  .command('init')
  .description('Initialize MCP servers for an agent')
  .option('-a, --agent <agent>', 'target agent (claude, gemini, cursor, vscode, windsurf)')
  .option('-s, --scope <scope>', 'scope (user, project, remote)', 'user')
  .option('--non-interactive', 'run without interactive prompts')
  .option('--servers <servers...>', 'specify servers to install')
  .option('-t, --transport <transport>', 'transport type (stdio, http, sse)', 'stdio')
  .option('--install-deps', 'automatically install dependencies')
  .action(initCommand);

program
  .command('list')
  .alias('ls')
  .description('List installed MCP servers')
  .option('-a, --agent <agent>', 'filter by agent')
  .option('--format <format>', 'output format (table, json, yaml)', 'table')
  .option('--show-inactive', 'show inactive servers')
  .option('--show-health', 'show health status')
  .option('--filter <filter>', 'filter servers by name or description')
  .action(listCommand);

program
  .command('activate <servers...>')
  .description('Activate MCP servers')
  .option('-a, --agent <agent>', 'target agent')
  .option('-s, --scope <scope>', 'scope (user, project)', 'user')
  .option('--all', 'activate all servers')
  .action(activateCommand);

program
  .command('deactivate <servers...>')
  .description('Deactivate MCP servers')
  .option('-a, --agent <agent>', 'target agent')
  .option('-s, --scope <scope>', 'scope (user, project)', 'user')
  .option('--all', 'deactivate all servers')
  .action(deactivateCommand);

program
  .command('remove <servers...>')
  .alias('rm')
  .description('Remove MCP servers')
  .option('-a, --agent <agent>', 'target agent')
  .option('-s, --scope <scope>', 'scope (user, project)', 'user')
  .option('--force', 'force removal without confirmation')
  .option('--backup', 'create backup before removal')
  .action(removeCommand);

program
  .command('doctor')
  .description('Health check for MCP server configurations')
  .option('-a, --agent <agent>', 'check specific agent')
  .option('--fix', 'attempt to fix issues automatically')
  .option('--check-all', 'check all agents and servers')
  .option('--timeout <seconds>', 'timeout for health checks', '30')
  .option('--detailed', 'show detailed diagnostic information')
  .action(doctorCommand);

program
  .command('search <query>')
  .description('Search MCP server registry')
  .option('--tags <tags>', 'filter by tags (comma-separated)')
  .option('--transport <transport>', 'filter by transport (stdio, http, sse)')
  .option('--category <category>', 'filter by category')
  .option('--limit <number>', 'limit number of results', '20')
  .option('--detailed', 'show detailed server information')
  .action(searchCommand);

program
  .command('import')
  .description('Import configuration between agents')
  .option('--from <agent>', 'source agent')
  .option('--to <agent>', 'target agent')
  .option('--merge', 'merge with existing configuration')
  .option('--overwrite', 'overwrite existing servers')
  .option('--include-inactive', 'include inactive servers')
  .action(importCommand);

program
  .command('switch')
  .description('Switch default agent context')
  .option('--agent <agent>', 'set default agent')
  .option('--show', 'show current default agent')
  .action(switchCommand);

program
  .command('edit')
  .description('Open configuration file in editor')
  .option('-a, --agent <agent>', 'agent to edit')
  .option('-s, --scope <scope>', 'scope (user, project)', 'user')
  .option('--editor <editor>', 'specify editor command')
  .action(editCommand);

// Additional utility commands
program
  .command('export')
  .description('Export configuration profile')
  .option('--profile <file>', 'output profile file')
  .option('-a, --agent <agent>', 'export from specific agent')
  .option('--format <format>', 'output format (json, yaml)', 'json')
  .action((options) => {
    console.log(chalk.yellow('Export command not yet implemented'));
    console.log('Options:', options);
  });

program
  .command('sync')
  .description('Sync servers across all agents')
  .option('--all-agents', 'sync to all supported agents')
  .option('--source <agent>', 'source agent for sync')
  .option('--exclude <agents>', 'exclude specific agents (comma-separated)')
  .action((options) => {
    console.log(chalk.yellow('Sync command not yet implemented'));
    console.log('Options:', options);
  });

program
  .command('config')
  .description('Manage MCP Box configuration')
  .option('--show', 'show current configuration')
  .option('--reset', 'reset configuration to defaults')
  .option('--set <key=value>', 'set configuration value')
  .action((options) => {
    console.log(chalk.yellow('Config command not yet implemented'));
    console.log('Options:', options);
  });

program
  .command('backup')
  .description('Manage configuration backups')
  .option('--create', 'create backup')
  .option('--restore <backup-id>', 'restore from backup')
  .option('--list', 'list available backups')
  .option('--clean', 'clean old backups')
  .action((options) => {
    console.log(chalk.yellow('Backup command not yet implemented'));
    console.log('Options:', options);
  });

// Security and keychain management commands
const keychainCmd = program
  .command('keychain')
  .description('Manage secrets in system keychain');

keychainCmd
  .command('set <account>')
  .description('Store a secret in the keychain')
  .option('--non-interactive', 'read from stdin instead of prompting')
  .action(keychainSetCommand);

keychainCmd
  .command('get <account>')
  .description('Retrieve a secret from the keychain')
  .option('--format <format>', 'output format (text, json)', 'text')
  .action(keychainGetCommand);

keychainCmd
  .command('delete <account>')
  .alias('rm')
  .description('Delete a secret from the keychain')
  .option('--force', 'delete without confirmation')
  .action(keychainDeleteCommand);

keychainCmd
  .command('list')
  .alias('ls')
  .description('List all secrets in the keychain')
  .option('--format <format>', 'output format (table, json)', 'table')
  .action(keychainListCommand);

program
  .command('security')
  .description('Security utilities and configuration scanning')
  .option('--scan [path]', 'scan configuration for security issues')
  .option('--format <format>', 'output format (table, json)', 'table')
  .action(async (options) => {
    if (options.scan !== undefined) {
      return await securityScanCommand(options.scan || undefined, options);
    }
    console.log(chalk.yellow('Please specify an action. Use --help for available options.'));
    return;
  });

program
  .command('generate')
  .description('Generate secure tokens and passwords')
  .option('--length <length>', 'token length', '32')
  .option('--format <format>', 'output format (hex, base64, alphanumeric)', 'hex')
  .option('--non-interactive', 'disable interactive prompts')
  .action((options) => {
    const length = parseInt(options.length, 10);
    return generateTokenCommand(length, options);
  });

// Hidden commands for development and debugging
program
  .command('debug', { hidden: true })
  .description('Debug utilities')
  .option('--registry', 'show registry information')
  .option('--agents', 'show agent information')
  .option('--paths', 'show configuration paths')
  .action((options) => {
    console.log(chalk.gray('Debug options:'), options);
  });

// Error handling
program.configureOutput({
  // Highlight errors in red
  outputError: (str) => chalk.red(str),
  // Highlight help in cyan
  writeOut: (str) => process.stdout.write(chalk.cyan(str)),
  writeErr: (str) => process.stderr.write(chalk.red(str))
});

// Custom help
program.addHelpText('before', `
${chalk.cyan.bold('MCP Box')} - Universal CLI for managing MCP servers

${chalk.gray('MCP Box normalizes the installation and configuration of MCP servers')}
${chalk.gray('across different AI coding agents including Claude Desktop, Cursor,')}
${chalk.gray('VS Code, Gemini CLI, Windsurf, and more.')}
`);

program.addHelpText('after', `
${chalk.yellow('Examples:')}
  ${chalk.gray('$')} mcp-box init                    ${chalk.gray('# Interactive server setup')}
  ${chalk.gray('$')} mcp-box init --agent claude     ${chalk.gray('# Setup for Claude Desktop')}
  ${chalk.gray('$')} mcp-box list                    ${chalk.gray('# List installed servers')}
  ${chalk.gray('$')} mcp-box search github          ${chalk.gray('# Search for GitHub servers')}
  ${chalk.gray('$')} mcp-box doctor                  ${chalk.gray('# Check server health')}
  ${chalk.gray('$')} mcp-box import --from claude --to cursor ${chalk.gray('# Import config')}

${chalk.yellow('Documentation:')}
  ${chalk.blue('https://github.com/nishantarnav/mcp-box#readme')}

${chalk.yellow('Report issues:')}
  ${chalk.blue('https://github.com/nishantarnav/mcp-box/issues')}
`);

// Handle unknown commands
program.on('command:*', (operands) => {
  console.error(chalk.red(`Unknown command: ${operands[0]}`));
  console.log(chalk.gray('Use --help to see available commands'));
  process.exit(1);
});

// Enhanced error handling
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error.message);
  if (program.opts().verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled Rejection:'), reason);
  process.exit(1);
});

// Parse command line arguments
async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    
    if (program.opts().verbose && error instanceof Error) {
      console.error(chalk.gray('Stack trace:'));
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Only run if this file is being executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { program };