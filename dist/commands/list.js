/**
 * List Command Implementation
 * Display installed MCP servers with status information
 */
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { registryManager } from '../registry/index.js';
import { claudeAdapter } from '../adapters/claude.js';
import { vscodeAdapter } from '../adapters/vscode.js';
// Agent adapter mapping
const agentAdapters = {
    claude: claudeAdapter,
    vscode: vscodeAdapter,
    // TODO: Add other adapters as they're implemented
    gemini: claudeAdapter, // Placeholder
    cursor: claudeAdapter, // Placeholder  
    windsurf: claudeAdapter, // Placeholder
    cline: claudeAdapter, // Placeholder
    'visual-studio': claudeAdapter // Placeholder
};
export async function listCommand(options) {
    try {
        console.log(chalk.cyan.bold('📋 MCP Server Status'));
        // Collect server information
        const servers = await collectServerInfo(options);
        if (servers.length === 0) {
            console.log(chalk.yellow('\n📭 No MCP servers found.'));
            console.log(chalk.gray('Use "mcp-box init" to install servers'));
            return;
        }
        // Apply filters
        const filteredServers = applyFilters(servers, options);
        if (filteredServers.length === 0) {
            console.log(chalk.yellow('\n📭 No servers match the specified filters.'));
            return;
        }
        // Display results
        await displayServers(filteredServers, options);
        // Show summary
        displaySummary(filteredServers, servers.length);
    }
    catch (error) {
        console.error(chalk.red('\n❌ Failed to list servers:'), error instanceof Error ? error.message : String(error));
        if (options.verbose) {
            console.error(chalk.gray('Stack trace:'));
            console.error(error instanceof Error ? error.stack : error);
        }
        process.exit(1);
    }
}
/**
 * Collect server information from all agents
 */
async function collectServerInfo(options) {
    const spinner = ora('Collecting server information...').start();
    const servers = [];
    try {
        const agents = options.agent
            ? [options.agent]
            : ['claude', 'vscode', 'cursor', 'gemini', 'windsurf', 'cline', 'visual-studio'];
        for (const agent of agents) {
            const adapter = agentAdapters[agent];
            if (!adapter)
                continue;
            try {
                // Check if agent is installed
                if (!(await adapter.isInstalled())) {
                    continue;
                }
                // Get servers for both user and project scopes
                const scopes = ['user', 'project'];
                for (const scope of scopes) {
                    try {
                        const installedServers = await adapter.getInstalledServers(scope);
                        for (const serverId of installedServers) {
                            const serverInfo = await getServerInfo(serverId, agent, scope, adapter);
                            if (serverInfo) {
                                servers.push(serverInfo);
                            }
                        }
                    }
                    catch {
                        // Continue if scope doesn't exist or can't be read
                    }
                }
            }
            catch {
                // Continue with next agent if this one fails
            }
        }
        spinner.succeed(chalk.green(`Found ${servers.length} servers`));
        return servers;
    }
    catch (error) {
        spinner.fail(chalk.red('Failed to collect server information'));
        throw error;
    }
}
/**
 * Get detailed information for a specific server
 */
async function getServerInfo(serverId, agent, scope, adapter) {
    try {
        const registryServer = await registryManager.getServer(serverId);
        const configStats = await adapter.getConfigStats(scope);
        let status = 'active';
        let transport = 'stdio';
        // Try to get more detailed status from the adapter
        try {
            const config = await adapter.read(scope);
            const servers = adapter.extractServers(config);
            const serverConfig = servers[serverId];
            if (serverConfig) {
                // Determine transport type
                if (serverConfig.serverUrl || serverConfig.url) {
                    transport = 'http';
                }
                else if (serverConfig.type === 'sse') {
                    transport = 'sse';
                }
                // Check if disabled (VS Code specific)
                if (serverConfig.disabled) {
                    status = 'disabled';
                }
            }
        }
        catch {
            status = 'error';
        }
        return {
            id: serverId,
            title: registryServer?.title || serverId,
            agent,
            scope,
            status,
            transport,
            description: registryServer?.description || undefined,
            maintainer: registryServer?.maintainer || undefined,
            configPath: configStats.path
        };
    }
    catch {
        return null;
    }
}
/**
 * Apply filters to server list
 */
function applyFilters(servers, options) {
    let filtered = [...servers];
    // Filter by name or description
    if (options.filter) {
        const query = options.filter.toLowerCase();
        filtered = filtered.filter(server => server.title.toLowerCase().includes(query) ||
            server.id.toLowerCase().includes(query) ||
            (server.description && server.description.toLowerCase().includes(query)));
    }
    // Filter inactive servers
    if (!options.showInactive) {
        filtered = filtered.filter(server => server.status !== 'inactive');
    }
    return filtered;
}
/**
 * Display servers in the requested format
 */
async function displayServers(servers, options) {
    switch (options.format) {
        case 'json':
            console.log(JSON.stringify(servers, null, 2));
            break;
        case 'yaml':
            // Simple YAML output
            console.log('servers:');
            for (const server of servers) {
                console.log(`  - id: ${server.id}`);
                console.log(`    title: "${server.title}"`);
                console.log(`    agent: ${server.agent}`);
                console.log(`    scope: ${server.scope}`);
                console.log(`    status: ${server.status}`);
                console.log(`    transport: ${server.transport}`);
                if (server.description) {
                    console.log(`    description: "${server.description}"`);
                }
            }
            break;
        default:
            await displayTable(servers, options);
    }
}
/**
 * Display servers in table format
 */
async function displayTable(servers, options) {
    const table = new Table({
        head: [
            chalk.cyan('Server'),
            chalk.cyan('Agent'),
            chalk.cyan('Scope'),
            chalk.cyan('Status'),
            chalk.cyan('Transport'),
            ...(options.showHealth ? [chalk.cyan('Health')] : [])
        ],
        style: {
            head: [],
            border: []
        }
    });
    // Sort servers by agent, then by name
    const sortedServers = servers.sort((a, b) => {
        if (a.agent !== b.agent) {
            return a.agent.localeCompare(b.agent);
        }
        return a.title.localeCompare(b.title);
    });
    for (const server of sortedServers) {
        const row = [
            formatServerName(server),
            formatAgent(server.agent),
            formatScope(server.scope),
            formatStatus(server.status),
            formatTransport(server.transport)
        ];
        if (options.showHealth) {
            row.push(await formatHealth(server));
        }
        table.push(row);
    }
    console.log('\n' + table.toString());
}
/**
 * Format server name with description
 */
function formatServerName(server) {
    let name = chalk.bold(server.title);
    if (server.description) {
        const truncatedDesc = server.description.length > 50
            ? server.description.substring(0, 47) + '...'
            : server.description;
        name += `\n${chalk.gray(truncatedDesc)}`;
    }
    if (server.maintainer) {
        name += `\n${chalk.dim(`by ${server.maintainer}`)}`;
    }
    return name;
}
/**
 * Format agent name with color
 */
function formatAgent(agent) {
    const colors = {
        claude: chalk.blue,
        vscode: chalk.cyan,
        cursor: chalk.magenta,
        gemini: chalk.yellow,
        windsurf: chalk.green,
        cline: chalk.red,
        'visual-studio': chalk.blueBright
    };
    return colors[agent] ? colors[agent](agent) : agent;
}
/**
 * Format scope with icon
 */
function formatScope(scope) {
    switch (scope) {
        case 'user':
            return `👤 ${scope}`;
        case 'project':
            return `📁 ${scope}`;
        default:
            return scope;
    }
}
/**
 * Format status with color and icon
 */
function formatStatus(status) {
    switch (status) {
        case 'active':
            return chalk.green('✅ active');
        case 'inactive':
            return chalk.yellow('⏸️  inactive');
        case 'disabled':
            return chalk.red('🚫 disabled');
        case 'error':
            return chalk.red('❌ error');
        default:
            return chalk.gray(`❓ ${status}`);
    }
}
/**
 * Format transport type
 */
function formatTransport(transport) {
    const icons = {
        stdio: '🔌',
        http: '🌐',
        sse: '📡'
    };
    const icon = icons[transport] || '❓';
    return `${icon} ${transport}`;
}
/**
 * Format health status (placeholder)
 */
async function formatHealth(server) {
    // TODO: Implement actual health checking
    return chalk.gray('❓ unknown');
}
/**
 * Display summary information
 */
function displaySummary(filteredServers, totalServers) {
    const agentCounts = filteredServers.reduce((acc, server) => {
        acc[server.agent] = (acc[server.agent] || 0) + 1;
        return acc;
    }, {});
    const statusCounts = filteredServers.reduce((acc, server) => {
        acc[server.status] = (acc[server.status] || 0) + 1;
        return acc;
    }, {});
    console.log(chalk.cyan('\n📊 Summary:'));
    console.log(chalk.gray(`   Total servers: ${totalServers}`));
    console.log(chalk.gray(`   Shown: ${filteredServers.length}`));
    if (Object.keys(agentCounts).length > 0) {
        console.log(chalk.gray('   By agent:'));
        for (const [agent, count] of Object.entries(agentCounts)) {
            console.log(chalk.gray(`     ${agent}: ${count}`));
        }
    }
    if (Object.keys(statusCounts).length > 0) {
        console.log(chalk.gray('   By status:'));
        for (const [status, count] of Object.entries(statusCounts)) {
            console.log(chalk.gray(`     ${status}: ${count}`));
        }
    }
    console.log(chalk.gray('\n💡 Use "mcp-box doctor" to check server health'));
    console.log(chalk.gray('   Use "mcp-box search <query>" to find more servers'));
}
//# sourceMappingURL=list.js.map