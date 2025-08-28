/**
 * Management Commands Implementation
 * Activate, deactivate, and remove MCP servers
 */
import type { ManagementCommandOptions } from '../types/config.d.js';
export declare function activateCommand(servers: string[], options: ManagementCommandOptions): Promise<void>;
export declare function deactivateCommand(servers: string[], options: ManagementCommandOptions): Promise<void>;
export declare function removeCommand(servers: string[], options: ManagementCommandOptions): Promise<void>;
//# sourceMappingURL=manage.d.ts.map