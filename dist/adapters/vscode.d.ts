/**
 * VS Code (GitHub Copilot) Agent Adapter
 * Handles VS Code specific configuration format for MCP servers
 */
import { z } from 'zod';
import { BaseAgentAdapter } from './base.js';
import type { AgentType, AgentInfo, VSCodeConfig, BaseServerConfig, HttpServerConfig, TransportType } from '../types/agents.d.js';
export declare class VSCodeAdapter extends BaseAgentAdapter {
    readonly name: AgentType;
    readonly info: AgentInfo;
    protected getConfigSchema(): z.ZodObject<{
        servers: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodObject<{
            type: z.ZodLiteral<"local">;
            command: z.ZodString;
            args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            disabled: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            type: "local";
            command: string;
            args?: string[] | undefined;
            env?: Record<string, string> | undefined;
            disabled?: boolean | undefined;
        }, {
            type: "local";
            command: string;
            args?: string[] | undefined;
            env?: Record<string, string> | undefined;
            disabled?: boolean | undefined;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"http">;
            url: z.ZodString;
            disabled: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            type: "http";
            url: string;
            disabled?: boolean | undefined;
        }, {
            type: "http";
            url: string;
            disabled?: boolean | undefined;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"sse">;
            url: z.ZodString;
            disabled: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            type: "sse";
            url: string;
            disabled?: boolean | undefined;
        }, {
            type: "sse";
            url: string;
            disabled?: boolean | undefined;
        }>]>>;
    }, "strip", z.ZodTypeAny, {
        servers: Record<string, {
            type: "local";
            command: string;
            args?: string[] | undefined;
            env?: Record<string, string> | undefined;
            disabled?: boolean | undefined;
        } | {
            type: "http";
            url: string;
            disabled?: boolean | undefined;
        } | {
            type: "sse";
            url: string;
            disabled?: boolean | undefined;
        }>;
    }, {
        servers: Record<string, {
            type: "local";
            command: string;
            args?: string[] | undefined;
            env?: Record<string, string> | undefined;
            disabled?: boolean | undefined;
        } | {
            type: "http";
            url: string;
            disabled?: boolean | undefined;
        } | {
            type: "sse";
            url: string;
            disabled?: boolean | undefined;
        }>;
    }>;
    protected transformServerConfig(serverId: string, serverConfig: BaseServerConfig | HttpServerConfig, transport: TransportType): any;
    protected extractServers(config: VSCodeConfig): Record<string, any>;
    protected createConfigWithServers(servers: Record<string, any>): VSCodeConfig;
    /**
     * VS Code-specific server validation
     */
    private validateVSCodeServer;
    /**
     * Enhanced validation for VS Code configuration
     */
    validate(config: VSCodeConfig): Promise<import('../types/agents.d.js').ValidationResult>;
    /**
     * Convert from other agent formats to VS Code format
     */
    importFromAgent(sourceConfig: any, sourceAgent: AgentType): Promise<VSCodeConfig>;
    /**
     * Normalize server configuration to VS Code format
     */
    private normalizeServerConfig;
    /**
     * Enable/disable a server
     */
    toggleServer(serverId: string, enabled: boolean, scope?: 'user' | 'project'): Promise<void>;
    /**
     * Get VS Code-specific configuration recommendations
     */
    getConfigRecommendations(): string[];
    /**
     * Get list of disabled servers
     */
    getDisabledServers(scope?: 'user' | 'project'): Promise<string[]>;
}
export declare const vscodeAdapter: VSCodeAdapter;
//# sourceMappingURL=vscode.d.ts.map