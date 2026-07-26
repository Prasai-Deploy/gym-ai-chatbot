import { BaseTool } from './BaseTool';

export class ToolRegistry {
  private tools: Map<string, BaseTool<any, any>> = new Map();

  public register(tool: BaseTool<any, any>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): BaseTool<any, any> | undefined {
    return this.tools.get(name);
  }

  public getAllDefinitions(): any[] {
    return Array.from(this.tools.values()).map(tool => tool.getDefinition());
  }
}

// Singleton registry for the runtime
export const toolRegistry = new ToolRegistry();
