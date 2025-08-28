#!/usr/bin/env node

/**
 * CSV to JSON converter for MCP Server Registry
 * Converts the CSV data into the structured registry format
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to parse CSV line
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Helper function to parse supported platforms
function parseSupportedPlatforms(platformsStr) {
  if (!platformsStr || platformsStr === 'N/A') return [];
  
  const platforms = platformsStr.split(',').map(p => p.trim());
  const agentMap = {
    'Claude Desktop': 'claude',
    'Cursor': 'cursor',
    'Cline': 'cline',
    'VS Code': 'vscode',
    'Visual Studio': 'visual-studio',
    'Windsurf': 'windsurf',
    'Gemini CLI': 'gemini',
    'Docker AI Agent': 'docker'
  };
  
  return platforms.map(p => agentMap[p] || p.toLowerCase().replace(/\s+/g, '-')).filter(Boolean);
}

// Helper function to parse transport types
function parseTransportTypes(transportStr) {
  if (!transportStr || transportStr === 'N/A') return ['stdio'];
  
  return transportStr.split(',').map(t => t.trim()).filter(t => ['stdio', 'http', 'sse'].includes(t));
}

// Helper function to generate server ID from name
function generateServerId(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Helper function to determine classification
function determineClassification(classification, maintainer) {
  if (classification === 'official') return 'official';
  if (classification === 'reference') return 'reference';
  return 'community';
}

// Helper function to parse tags from description and name
function generateTags(name, description, category) {
  const tags = new Set();
  
  // Add category-based tags
  const categoryTags = {
    'database': ['db', 'data', 'storage'],
    'ai': ['ai', 'ml', 'llm'],
    'cloud': ['cloud', 'aws', 'gcp', 'azure'],
    'git': ['vcs', 'git', 'scm'],
    'api': ['api', 'rest', 'http'],
    'testing': ['test', 'qa', 'automation'],
    'security': ['security', 'auth', 'encryption'],
    'productivity': ['productivity', 'task', 'project'],
    'social': ['social', 'communication'],
    'finance': ['finance', 'payment', 'crypto'],
    'media': ['media', 'image', 'video', 'audio'],
    'development': ['dev', 'ide', 'build'],
    'monitoring': ['monitoring', 'analytics', 'metrics']
  };
  
  // Extract tags from name and description
  const text = `${name} ${description}`.toLowerCase();
  
  if (text.includes('database') || text.includes('db')) tags.add('database');
  if (text.includes('api')) tags.add('api');
  if (text.includes('git')) tags.add('git');
  if (text.includes('cloud')) tags.add('cloud');
  if (text.includes('ai') || text.includes('ml')) tags.add('ai');
  if (text.includes('test')) tags.add('testing');
  if (text.includes('security') || text.includes('auth')) tags.add('security');
  if (text.includes('social') || text.includes('chat')) tags.add('social');
  if (text.includes('payment') || text.includes('finance')) tags.add('finance');
  if (text.includes('monitor') || text.includes('analytics')) tags.add('monitoring');
  if (text.includes('productivity') || text.includes('task')) tags.add('productivity');
  if (text.includes('image') || text.includes('video') || text.includes('media')) tags.add('media');
  if (text.includes('development') || text.includes('ide')) tags.add('development');
  
  return Array.from(tags);
}

async function convertCSVToRegistry() {
  try {
    // Read the CSV file
    const csvPath = path.join(__dirname, '../../mcp_servers_absolute - mcp_servers_absolute_final_200plus.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = parseCSVLine(lines[0]);
    
    console.log('Headers:', headers);
    
    const servers = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // Convert to MCPServer format
      const serverId = generateServerId(row.mcp_name);
      const supportedPlatforms = parseSupportedPlatforms(row.supported_platforms);
      const transportTypes = parseTransportTypes(row.mcp_transport_types);
      const tags = generateTags(row.mcp_name, row.description, '');
      
      const server = {
        id: serverId,
        name: row.mcp_name,
        title: row.mcp_name,
        description: row.description || '',
        source: row.source || '',
        githubUrl: row.github_url || '',
        website: row.website && row.website !== 'N/A' ? row.website : undefined,
        classification: determineClassification(row.classification, row.maintainer),
        maintainer: row.maintainer || '',
        license: 'MIT', // Default license
        estWeeklyDownloads: row.est_weekly_downloads || '0',
        lastUpdated: row.last_updated || '2024-11',
        supportedPlatforms: supportedPlatforms,
        transportTypes: transportTypes,
        install: {
          npm: row.npm_package && row.npm_package !== 'N/A' ? row.npm_package : undefined
        },
        npmPackage: row.npm_package && row.npm_package !== 'N/A' ? row.npm_package : undefined,
        dockerSupport: row.docker_support === 'Yes',
        default: {
          stdio: transportTypes.includes('stdio') ? {
            command: row.npm_package && row.npm_package !== 'N/A' ? 'npx' : 'node',
            args: row.npm_package && row.npm_package !== 'N/A' ? ['-y', row.npm_package] : []
          } : undefined,
          http: transportTypes.includes('http') ? {
            url: `https://api.${serverId}.com/mcp`
          } : undefined
        },
        env: [], // Will be populated based on server requirements
        tags: tags,
        category: tags[0] || 'general'
      };
      
      // Clean up undefined values
      Object.keys(server).forEach(key => {
        if (server[key] === undefined) {
          delete server[key];
        }
      });
      
      servers.push(server);
    }
    
    // Create registry metadata
    const metadata = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      totalServers: servers.length,
      sources: [...new Set(servers.map(s => s.source))],
      classifications: {
        official: servers.filter(s => s.classification === 'official').length,
        community: servers.filter(s => s.classification === 'community').length,
        reference: servers.filter(s => s.classification === 'reference').length
      },
      categories: [...new Set(servers.map(s => s.category))],
      tags: [...new Set(servers.flatMap(s => s.tags))]
    };
    
    const registry = {
      metadata,
      servers
    };
    
    // Write the registry JSON file
    const outputPath = path.join(__dirname, '../registry/servers.json');
    await fs.writeFile(outputPath, JSON.stringify(registry, null, 2));
    
    console.log(`✅ Successfully converted ${servers.length} servers to registry`);
    console.log(`📁 Registry saved to: ${outputPath}`);
    console.log(`📊 Classifications:`, metadata.classifications);
    console.log(`🏷️  Categories: ${metadata.categories.length}`);
    console.log(`🔖 Tags: ${metadata.tags.length}`);
    
    return registry;
    
  } catch (error) {
    console.error('❌ Error converting CSV to registry:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  convertCSVToRegistry().catch(console.error);
}

export { convertCSVToRegistry };