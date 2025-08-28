/**
 * Search Command Implementation
 * Search MCP server registry
 */
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { registryManager } from '../registry/index.js';
export async function searchCommand(query, options) {
    console.log(chalk.cyan.bold('🔍 Searching MCP Server Registry'));
    console.log(chalk.gray(`Query: "${query}"`));
    const spinner = ora('Searching servers...').start();
    try {
        const filters = {
            query,
            tags: options.tags || [],
            transportTypes: options.transport ? [options.transport] : [],
            category: options.category || undefined
        };
        const searchOptions = {
            limit: parseInt(options.limit?.toString() || '20'),
            sortBy: 'relevance'
        };
        const results = await registryManager.searchServers(filters, searchOptions);
        spinner.succeed(chalk.green(`Found ${results.total} servers`));
        if (results.results.length === 0) {
            console.log(chalk.yellow('\n📭 No servers found matching your search.'));
            return;
        }
        // Display results in table format
        const table = new Table({
            head: [chalk.cyan('Server'), chalk.cyan('Description'), chalk.cyan('Maintainer'), chalk.cyan('Downloads')],
            style: { head: [], border: [] }
        });
        for (const result of results.results) {
            const server = result.server;
            table.push([
                `${chalk.bold(server.title)}\n${chalk.gray(server.id)}`,
                server.description.length > 60 ? server.description.substring(0, 57) + '...' : server.description,
                server.maintainer,
                server.estWeeklyDownloads
            ]);
        }
        console.log('\n' + table.toString());
        if (results.hasMore) {
            console.log(chalk.gray(`\n... and ${results.total - results.results.length} more results`));
        }
        console.log(chalk.gray('\n💡 Use "mcp-box init" to install servers'));
    }
    catch (error) {
        spinner.fail(chalk.red('Search failed'));
        throw error;
    }
}
export async function importCommand(options) {
    console.log(chalk.cyan.bold('📥 Import Configuration'));
    console.log(chalk.gray('Options:'), options);
    // TODO: Implement actual import logic
    console.log(chalk.yellow('Import command not yet fully implemented'));
}
export async function switchCommand(options) {
    console.log(chalk.cyan.bold('🔄 Switch Agent'));
    console.log(chalk.gray('Options:'), options);
    // TODO: Implement actual switch logic
    console.log(chalk.yellow('Switch command not yet fully implemented'));
}
/**
 * Edit Command Implementation
 */
export async function editCommand(options) {
    console.log(chalk.cyan.bold('✏️  Edit Configuration'));
    console.log(chalk.gray('Options:'), options);
    // TODO: Implement actual edit logic
    console.log(chalk.yellow('Edit command not yet fully implemented'));
}
//# sourceMappingURL=search.js.map