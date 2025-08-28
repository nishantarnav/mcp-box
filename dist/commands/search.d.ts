/**
 * Search Command Implementation
 * Search MCP server registry
 */
import type { SearchCommandOptions } from '../types/config.d.js';
export declare function searchCommand(query: string, options: SearchCommandOptions): Promise<void>;
/**
 * Import Command Implementation
 */
import type { ImportCommandOptions } from '../types/config.d.js';
export declare function importCommand(options: ImportCommandOptions): Promise<void>;
/**
 * Switch Command Implementation
 */
import type { BaseCommandOptions } from '../types/config.d.js';
export declare function switchCommand(options: BaseCommandOptions & {
    agent?: string;
    show?: boolean;
}): Promise<void>;
/**
 * Edit Command Implementation
 */
export declare function editCommand(options: BaseCommandOptions & {
    editor?: string;
}): Promise<void>;
//# sourceMappingURL=search.d.ts.map