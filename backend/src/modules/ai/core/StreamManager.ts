import { Response } from 'express';

export class StreamManager {
  public initSSE(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
  }

  public sendToken(res: Response, token: string): void {
    this.sendEvent(res, 'token', { token });
  }

  public sendToolCall(res: Response, tool: string, args: any): void {
    this.sendEvent(res, 'tool_call', { tool, args });
  }

  public sendToolResult(res: Response, tool: string, result: any): void {
    this.sendEvent(res, 'tool_result', { tool, result });
  }

  public sendDone(res: Response, data: { message: string; conversationId: string; usage?: any }): void {
    if (res.writableEnded || res.closed) return;
    this.sendEvent(res, 'done', data);
    try {
      res.end();
    } catch {
      // Ignore if already ended
    }
  }

  public sendError(res: Response, message: string, category: string = 'RUNTIME_ERROR'): void {
    if (res.writableEnded || res.closed) return;
    this.sendEvent(res, 'error', { message, category });
    try {
      res.end();
    } catch {
      // Ignore if already ended
    }
  }

  private sendEvent(res: Response, eventName: string, data: any): void {
    if (res.writableEnded || res.closed) return;
    try {
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Ignore stream write errors if client disconnected
    }
  }
}

export const streamManager = new StreamManager();
