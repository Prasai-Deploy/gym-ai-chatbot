import { BaseTool } from './BaseTool';

export class ToolRegistry {
  private tools: Map<string, BaseTool<any, any>> = new Map();

  public register(tool: BaseTool<any, any>): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): BaseTool<any, any> | undefined {
    return this.tools.get(name);
  }

  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  public listTools(): BaseTool<any, any>[] {
    return Array.from(this.tools.values());
  }

  public getAllDefinitions(): any[] {
    return Array.from(this.tools.values()).map((tool) => tool.getDefinition());
  }

  public clear(): void {
    this.tools.clear();
  }
}

export const toolRegistry = new ToolRegistry();
