/**
 * Claude Desktop Agent Adapter
 * Handles Claude Desktop specific configuration format
 */
import { z } from 'zod';
import { BaseAgentAdapter } from './base.js';
import type { AgentType, AgentInfo, ClaudeConfig, BaseServerConfig, HttpServerConfig, TransportType } from '../types/agents.d.js';
export declare class ClaudeAdapter extends BaseAgentAdapter {
    readonly name: AgentType;
    readonly info: AgentInfo;
    protected getConfigSchema(): z.ZodObject<{
        mcpServers: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodObject<{
            command: z.ZodString;
            args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            command: string;
            args?: string[] | undefined;
            env?: Record<string, string> | undefined;
        }, {
            command: string;
            args?: string[] | undefined;
            env?: Record<string, string> | undefined;
        }>, z.ZodObject<{
            serverUrl: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            serverUrl: string;
        }, {
            serverUrl: string;
        }>]>>;
    }, "strip", z.ZodTypeAny, {
        mcpServers: Record<string, {
            command: string;
            args?: string[] | undefined;
            env?: Record<string, string> | undefined;
        } | {
            serverUrl: string;
        }>;
    }, {
        mcpServers: Record<string, {
            command: string;
            args?: string[] | undefined;
            env?: Record<string, string> | undefined;
        } | {
            serverUrl: string;
        }>;
    }>;
    protected transformServerConfig(serverId: string, serverConfig: BaseServerConfig | HttpServerConfig, transport: TransportType): any;
    protected extractServers(config: ClaudeConfig): Record<string, any>;
    protected createConfigWithServers(servers: Record<string, any>): ClaudeConfig;
    /**
     * Claude-specific server validation
     */
    private validateClaudeServer;
    /**
     * Enhanced validation for Claude configuration
     */
    validate(config: ClaudeConfig): Promise<import('../types/agents.d.js').ValidationResult>;
    /**
     * Convert from other agent formats to Claude format
     */
    importFromAgent(sourceConfig: any, sourceAgent: AgentType): Promise<ClaudeConfig>;
    /**
     * Normalize server configuration to Claude format
     */
    private normalizeServerConfig;
    /**
     * Get Claude-specific configuration recommendations
     */
    getConfigRecommendations(): string[];
}
export declare const claudeAdapter: ClaudeAdapter;
//# sourceMappingURL=claude.d.ts.map