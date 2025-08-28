#!/usr/bin/env node

/**
 * MCP Box CLI Executable
 * Entry point for the mcp-box CLI when installed as a global package
 */

import { program } from '../dist/cli.js';
import chalk from 'chalk';

// Execute the CLI program
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

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});