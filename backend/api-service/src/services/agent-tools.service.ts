import { agentService } from './agent.service';

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any, context: ToolContext) => Promise<string>;
}

export interface ToolContext {
  userId: string;
  agentId: string;
  conversationId?: string;
}

export class AgentToolsService {
  private tools: Map<string, AgentTool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  /**
   * Register default tools for Agent 00Z
   */
  private registerDefaultTools() {
    // Agent switching tool
    this.registerTool({
      name: 'switch_agent',
      description: 'Comută la un agent specializat pentru anumite tipuri de întrebări',
      parameters: {
        type: 'object',
        properties: {
          agent_type: {
            type: 'string',
            enum: ['mentor', 'reporter', 'analyst', 'strategist'],
            description: 'Tipul de agent la care să comute'
          },
          reason: {
            type: 'string',
            description: 'Motivul pentru comutare'
          }
        },
        required: ['agent_type', 'reason']
      },
      handler: this.handleAgentSwitch.bind(this)
    });

    // Memory retrieval tool
    this.registerTool({
      name: 'get_user_context',
      description: 'Obține contextul și preferințele utilizatorului din conversațiile anterioare',
      parameters: {
        type: 'object',
        properties: {
          context_type: {
            type: 'string',
            enum: ['preferences', 'trading_patterns', 'learning_progress'],
            description: 'Tipul de context căutat'
          }
        },
        required: ['context_type']
      },
      handler: this.handleGetUserContext.bind(this)
    });

    // Conversation summary tool
    this.registerTool({
      name: 'summarize_conversation',
      description: 'Creează un rezumat al conversației curente pentru context viitor',
      parameters: {
        type: 'object',
        properties: {
          focus_areas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Domeniile pe care să se concentreze rezumatul'
          }
        }
      },
      handler: this.handleSummarizeConversation.bind(this)
    });

    // Market data tool (placeholder)
    this.registerTool({
      name: 'get_market_info',
      description: 'Obține informații generale despre piețe (simulat pentru demo)',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'Simbolul instrumentului financiar'
          },
          info_type: {
            type: 'string',
            enum: ['price', 'analysis', 'news'],
            description: 'Tipul de informații cerut'
          }
        },
        required: ['symbol', 'info_type']
      },
      handler: this.handleGetMarketInfo.bind(this)
    });
  }

  /**
   * Register a new tool
   */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get available tools for an agent
   */
  getToolsForAgent(agentType: string): AgentTool[] {
    const allTools = Array.from(this.tools.values());
    
    // Filter tools based on agent type
    switch (agentType) {
      case 'central':
        return allTools; // Agent 00Z has access to all tools
      case 'mentor':
        return allTools.filter(tool => 
          ['get_user_context', 'summarize_conversation'].includes(tool.name)
        );
      case 'reporter':
        return allTools.filter(tool => 
          ['get_market_info'].includes(tool.name)
        );
      case 'analyst':
        return allTools.filter(tool => 
          ['get_market_info', 'get_user_context'].includes(tool.name)
        );
      case 'strategist':
        return allTools.filter(tool => 
          ['get_user_context', 'summarize_conversation'].includes(tool.name)
        );
      default:
        return [];
    }
  }

  /**
   * Execute tool calls
   */
  async executeToolCalls(
    toolCalls: ToolCall[], 
    context: ToolContext
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      try {
        const tool = this.tools.get(toolCall.function.name);
        if (!tool) {
          results.push({
            toolCallId: toolCall.id,
            content: `Tool '${toolCall.function.name}' not found`,
            isError: true
          });
          continue;
        }

        const args = JSON.parse(toolCall.function.arguments);
        const result = await tool.handler(args, context);

        results.push({
          toolCallId: toolCall.id,
          content: result
        });

      } catch (error: any) {
        console.error(`Tool execution failed for ${toolCall.function.name}:`, error);
        results.push({
          toolCallId: toolCall.id,
          content: `Error executing tool: ${error.message}`,
          isError: true
        });
      }
    }

    return results;
  }

  /**
   * Tool: Switch to another agent
   */
  private async handleAgentSwitch(args: any, context: ToolContext): Promise<string> {
    const { agent_type, reason } = args;
    
    if (!context.conversationId) {
      return 'Nu pot comuta agentul fără un ID de conversație activ.';
    }

    try {
      // Get agent by type
      const agents = await agentService.getAgents();
      const targetAgent = agents.find(agent => agent.agent_type === agent_type);
      
      if (!targetAgent) {
        return `Nu am găsit agent de tipul '${agent_type}'.`;
      }

      // Switch agent
      await agentService.switchAgent(context.conversationId, targetAgent.id, reason);
      
      return `Am comutat cu succes la ${targetAgent.display_name}. ${reason}`;

    } catch (error: any) {
      return `Eroare la comutarea agentului: ${error.message}`;
    }
  }

  /**
   * Tool: Get user context from memory
   */
  private async handleGetUserContext(args: any, context: ToolContext): Promise<string> {
    const { context_type } = args;

    try {
      const memoryContext = await agentService.getAgentMemoryContext(
        context.agentId, 
        context.userId
      );

      if (memoryContext.length === 0) {
        return 'Nu am găsit context anterior pentru acest utilizator.';
      }

      // Filter by context type if needed
      const relevantContext = memoryContext.filter(item => 
        item.toLowerCase().includes(context_type.toLowerCase())
      );

      if (relevantContext.length === 0) {
        return `Nu am găsit context de tipul '${context_type}' pentru acest utilizator.`;
      }

      return `Context găsit: ${relevantContext.join('; ')}`;

    } catch (error: any) {
      return `Eroare la obținerea contextului: ${error.message}`;
    }
  }

  /**
   * Tool: Summarize current conversation
   */
  private async handleSummarizeConversation(args: any, context: ToolContext): Promise<string> {
    const { focus_areas = [] } = args;

    if (!context.conversationId) {
      return 'Nu pot crea rezumat fără un ID de conversație activ.';
    }

    try {
      const messages = await agentService.getConversationMessages(context.conversationId, 20);
      
      if (messages.length === 0) {
        return 'Nu există mesaje în această conversație pentru rezumat.';
      }

      // Simple summary logic
      const userMessages = messages.filter(msg => msg.role === 'user');
      const topics = new Set<string>();
      
      // Extract topics from user messages
      userMessages.forEach(msg => {
        const content = msg.content.toLowerCase();
        const tradingKeywords = ['forex', 'stock', 'crypto', 'trading', 'invest', 'market', 'price'];
        const foundKeywords = tradingKeywords.filter(keyword => content.includes(keyword));
        foundKeywords.forEach(keyword => topics.add(keyword));
      });

      const summary = `Conversație cu ${userMessages.length} întrebări de la utilizator. ` +
        `Subiecte abordate: ${Array.from(topics).join(', ') || 'general'}. ` +
        `Ultimul mesaj: ${messages[messages.length - 1]?.content.substring(0, 100)}...`;

      // Save summary to conversation
      // This would typically update the conversation's context_summary field
      
      return summary;

    } catch (error: any) {
      return `Eroare la crearea rezumatului: ${error.message}`;
    }
  }

  /**
   * Tool: Get market information (simulated)
   */
  private async handleGetMarketInfo(args: any, context: ToolContext): Promise<string> {
    const { symbol, info_type } = args;

    // Simulated market data for demo purposes
    const simulatedData = {
      'EURUSD': {
        price: '1.0856',
        analysis: 'EUR/USD se tranzacționează în consolidare. Suport la 1.0800, rezistență la 1.0900.',
        news: 'BCE menține ratele neschimbate. Datele macro din SUA asteptate mâine.'
      },
      'BTCUSD': {
        price: '43,250 USD',
        analysis: 'Bitcoin arată semne de recuperare. Niveluri cheie: suport 42k, rezistență 45k.',
        news: 'Adoptarea instituțională continuă să crească. ETF-uri Bitcoin câștigă tracțiune.'
      },
      'AAPL': {
        price: '195.25 USD',
        analysis: 'Apple în trend ascendent. Câștiguri peste așteptări în ultimul trimestru.',
        news: 'Lansarea noilor produse AI prevăzută pentru Q2. Analiștii optimiști.'
      }
    };

    const data = simulatedData[symbol.toUpperCase() as keyof typeof simulatedData];
    
    if (!data) {
      return `Nu am găsit informații pentru simbolul '${symbol}'. Simboluri disponibile: EURUSD, BTCUSD, AAPL.`;
    }

    const info = data[info_type as keyof typeof data];
    if (!info) {
      return `Tipul de informație '${info_type}' nu este disponibil pentru ${symbol}.`;
    }

    return `${symbol} - ${info_type}: ${info}`;
  }

  /**
   * Get tool definitions for OpenAI function calling format
   */
  getToolDefinitions(agentType: string): any[] {
    const tools = this.getToolsForAgent(agentType);
    
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }
}

// Singleton instance
export const agentToolsService = new AgentToolsService();