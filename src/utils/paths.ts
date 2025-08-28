/**
 * Cross-platform path utilities for MCP Box CLI
 * Handles platform-specific path resolution and configuration locations
 */

import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import type { Stats } from 'fs';
import type { AgentType, ConfigScope } from '../types/agents.d.js';

// Platform detection
export const PLATFORM = os.platform();
export const IS_WINDOWS = PLATFORM === 'win32';
export const IS_MACOS = PLATFORM === 'darwin';
export const IS_LINUX = PLATFORM === 'linux';

/**
 * Expand home directory tilde (~) in paths
 */
export function expandHome(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

/**
 * Expand environment variables in paths
 */
export function expandEnvVars(filePath: string): string {
  return filePath.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return process.env[varName] || match;
  }).replace(/\$([A-Z_][A-Z0-9_]*)/gi, (match, varName) => {
    return process.env[varName] || match;
  });
}

/**
 * Expand Windows environment variables like %APPDATA%
 */
export function expandWindowsEnvVars(filePath: string): string {
  if (!IS_WINDOWS) return filePath;
  
  return filePath.replace(/%([^%]+)%/g, (match, varName) => {
    return process.env[varName] || match;
  });
}

/**
 * Resolve platform-specific configuration paths
 */
export function resolvePlatformPath(filePath: string): string {
  let resolved = filePath;
  
  // Expand home directory
  resolved = expandHome(resolved);
  
  // Expand environment variables
  resolved = expandEnvVars(resolved);
  
  // Expand Windows environment variables
  if (IS_WINDOWS) {
    resolved = expandWindowsEnvVars(resolved);
  }
  
  // Normalize path separators
  resolved = path.normalize(resolved);
  
  return resolved;
}

/**
 * Get agent-specific configuration paths
 */
export function getAgentConfigPath(agent: AgentType, scope: ConfigScope = 'user'): string {
  const paths = getAgentConfigPaths(agent);
  
  if (scope === 'project') {
    return paths.project || paths.user;
  }
  
  return paths.user;
}

/**
 * Get all possible configuration paths for an agent
 */
export function getAgentConfigPaths(agent: AgentType): { user: string; project?: string; alternative?: string[] } {
  switch (agent) {
    case 'claude':
      return {
        user: resolvePlatformPath('~/.claude/settings.json'),
        project: './.claude/settings.json'
      };
      
    case 'gemini':
      return {
        user: resolvePlatformPath('~/.gemini/settings.json'),
        project: './.gemini/settings.json'
      };
      
    case 'cursor':
      return {
        user: resolvePlatformPath('~/.cursor/mcp.json'),
        project: './.cursor/mcp.json',
        alternative: [
          resolvePlatformPath('~/.cursor-ide/mcp.json')
        ]
      };
      
    case 'vscode':
      if (IS_WINDOWS) {
        return {
          user: resolvePlatformPath('%APPDATA%/Code/User/mcp.json'),
          project: './.vscode/mcp.json',
          alternative: [
            resolvePlatformPath('%USERPROFILE%/.vscode/mcp.json')
          ]
        };
      } else if (IS_MACOS) {
        return {
          user: resolvePlatformPath('~/Library/Application Support/Code/User/mcp.json'),
          project: './.vscode/mcp.json',
          alternative: [
            resolvePlatformPath('~/.vscode/mcp.json')
          ]
        };
      } else {
        return {
          user: resolvePlatformPath('~/.config/Code/User/mcp.json'),
          project: './.vscode/mcp.json',
          alternative: [
            resolvePlatformPath('~/.vscode/mcp.json')
          ]
        };
      }
      
    case 'windsurf':
      return {
        user: resolvePlatformPath('~/.codeium/windsurf/mcp_config.json'),
        project: './.windsurf/mcp_config.json'
      };
      
    case 'cline':
      return {
        user: resolvePlatformPath('~/.cline/mcp.json'),
        project: './.cline/mcp.json'
      };
      
    case 'visual-studio':
      if (IS_WINDOWS) {
        return {
          user: resolvePlatformPath('%APPDATA%/Microsoft/VisualStudio/mcp.json'),
          project: './.vs/mcp.json'
        };
      } else {
        return {
          user: resolvePlatformPath('~/.visualstudio/mcp.json'),
          project: './.vs/mcp.json'
        };
      }
      
    default:
      throw new Error(`Unknown agent: ${agent}`);
  }
}

/**
 * Get MCP Box configuration directory
 */
export function getMCPBoxConfigDir(): string {
  if (IS_WINDOWS) {
    return resolvePlatformPath('%APPDATA%/mcp-box');
  } else if (IS_MACOS) {
    return resolvePlatformPath('~/Library/Application Support/mcp-box');
  } else {
    return resolvePlatformPath('~/.config/mcp-box');
  }
}

/**
 * Get MCP Box data directory
 */
export function getMCPBoxDataDir(): string {
  if (IS_WINDOWS) {
    return resolvePlatformPath('%LOCALAPPDATA%/mcp-box');
  } else if (IS_MACOS) {
    return resolvePlatformPath('~/Library/Application Support/mcp-box');
  } else {
    return resolvePlatformPath('~/.local/share/mcp-box');
  }
}

/**
 * Get MCP Box cache directory
 */
export function getMCPBoxCacheDir(): string {
  if (IS_WINDOWS) {
    return resolvePlatformPath('%LOCALAPPDATA%/mcp-box/cache');
  } else if (IS_MACOS) {
    return resolvePlatformPath('~/Library/Caches/mcp-box');
  } else {
    return resolvePlatformPath('~/.cache/mcp-box');
  }
}

/**
 * Get backup directory
 */
export function getBackupDir(): string {
  return path.join(getMCPBoxDataDir(), 'backups');
}

/**
 * Get logs directory
 */
export function getLogsDir(): string {
  if (IS_WINDOWS) {
    return resolvePlatformPath('%LOCALAPPDATA%/mcp-box/logs');
  } else if (IS_MACOS) {
    return resolvePlatformPath('~/Library/Logs/mcp-box');
  } else {
    return resolvePlatformPath('~/.local/share/mcp-box/logs');
  }
}

/**
 * Ensure directory exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Check if path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if path is readable
 */
export async function isReadable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if path is writable
 */
export async function isWritable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if directory is writable (for creating new files)
 */
export async function isDirWritable(dirPath: string): Promise<boolean> {
  try {
    await fs.access(dirPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats safely
 */
export async function getFileStats(filePath: string): Promise<Stats | null> {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

/**
 * Find configuration file by checking multiple possible locations
 */
export async function findConfigFile(agent: AgentType, scope: ConfigScope = 'user'): Promise<string | null> {
  const paths = getAgentConfigPaths(agent);
  
  const checkPaths = scope === 'project' 
    ? [paths.project, paths.user].filter(Boolean) as string[]
    : [paths.user, ...(paths.alternative || [])];
  
  for (const configPath of checkPaths) {
    if (await pathExists(configPath)) {
      return configPath;
    }
  }
  
  return null;
}

/**
 * Get temporary directory for MCP Box
 */
export function getTempDir(): string {
  return path.join(os.tmpdir(), 'mcp-box');
}

/**
 * Generate unique temporary file path
 */
export function getTempFilePath(prefix = 'mcp-box', extension = '.tmp'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const filename = `${prefix}-${timestamp}-${random}${extension}`;
  return path.join(getTempDir(), filename);
}

/**
 * Clean old temporary files
 */
export async function cleanTempFiles(maxAge = 24 * 60 * 60 * 1000): Promise<void> {
  const tempDir = getTempDir();
  
  try {
    const files = await fs.readdir(tempDir);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await getFileStats(filePath);
      
      if (stats && (now - stats.mtime.getTime()) > maxAge) {
        await fs.unlink(filePath).catch(() => {}); // Ignore errors
      }
    }
  } catch {
    // Ignore errors if temp directory doesn't exist
  }
}

/**
 * Create safe filename from string
 */
export function createSafeFilename(input: string): string {
  return input
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Get relative path from one directory to another
 */
export function getRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}

/**
 * Check if path is inside another path (security check)
 */
export function isPathInside(child: string, parent: string): boolean {
  const childResolved = path.resolve(child);
  const parentResolved = path.resolve(parent);
  
  return childResolved.startsWith(parentResolved + path.sep) || childResolved === parentResolved;
}