/**
 * Cross-platform path utilities for MCP Box CLI
 * Handles platform-specific path resolution and configuration locations
 */
import type { Stats } from 'fs';
import type { AgentType, ConfigScope } from '../types/agents.d.js';
export declare const PLATFORM: NodeJS.Platform;
export declare const IS_WINDOWS: boolean;
export declare const IS_MACOS: boolean;
export declare const IS_LINUX: boolean;
/**
 * Expand home directory tilde (~) in paths
 */
export declare function expandHome(filePath: string): string;
/**
 * Expand environment variables in paths
 */
export declare function expandEnvVars(filePath: string): string;
/**
 * Expand Windows environment variables like %APPDATA%
 */
export declare function expandWindowsEnvVars(filePath: string): string;
/**
 * Resolve platform-specific configuration paths
 */
export declare function resolvePlatformPath(filePath: string): string;
/**
 * Get agent-specific configuration paths
 */
export declare function getAgentConfigPath(agent: AgentType, scope?: ConfigScope): string;
/**
 * Get all possible configuration paths for an agent
 */
export declare function getAgentConfigPaths(agent: AgentType): {
    user: string;
    project?: string;
    alternative?: string[];
};
/**
 * Get MCP Box configuration directory
 */
export declare function getMCPBoxConfigDir(): string;
/**
 * Get MCP Box data directory
 */
export declare function getMCPBoxDataDir(): string;
/**
 * Get MCP Box cache directory
 */
export declare function getMCPBoxCacheDir(): string;
/**
 * Get backup directory
 */
export declare function getBackupDir(): string;
/**
 * Get logs directory
 */
export declare function getLogsDir(): string;
/**
 * Ensure directory exists
 */
export declare function ensureDir(dirPath: string): Promise<void>;
/**
 * Check if path exists
 */
export declare function pathExists(filePath: string): Promise<boolean>;
/**
 * Check if path is readable
 */
export declare function isReadable(filePath: string): Promise<boolean>;
/**
 * Check if path is writable
 */
export declare function isWritable(filePath: string): Promise<boolean>;
/**
 * Check if directory is writable (for creating new files)
 */
export declare function isDirWritable(dirPath: string): Promise<boolean>;
/**
 * Get file stats safely
 */
export declare function getFileStats(filePath: string): Promise<Stats | null>;
/**
 * Find configuration file by checking multiple possible locations
 */
export declare function findConfigFile(agent: AgentType, scope?: ConfigScope): Promise<string | null>;
/**
 * Get temporary directory for MCP Box
 */
export declare function getTempDir(): string;
/**
 * Generate unique temporary file path
 */
export declare function getTempFilePath(prefix?: string, extension?: string): string;
/**
 * Clean old temporary files
 */
export declare function cleanTempFiles(maxAge?: number): Promise<void>;
/**
 * Create safe filename from string
 */
export declare function createSafeFilename(input: string): string;
/**
 * Get relative path from one directory to another
 */
export declare function getRelativePath(from: string, to: string): string;
/**
 * Check if path is inside another path (security check)
 */
export declare function isPathInside(child: string, parent: string): boolean;
//# sourceMappingURL=paths.d.ts.map