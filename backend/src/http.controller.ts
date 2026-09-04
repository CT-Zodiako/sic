import { All, Controller, Inject, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Application } from './app.ts';

export class HttpController {
  constructor(private readonly application: Application) {}

  async handle(request: Request, response: Response): Promise<void> {
    const headers = Object.fromEntries(
      Object.entries(request.headers).map(([key, value]) => [key, value]),
    );
    const result = await this.application.handle(request.path, {
      method: request.method,
      headers,
      body: request.body,
    });
    for (const [name, value] of Object.entries(result.headers ?? {})) {
      if (name.toLowerCase() === 'set-cookie') response.setHeader(name, value);
      else response.setHeader(name, value);
    }
    response.status(result.status).json(result.body);
  }
}

// Apply Nest metadata without requiring a decorator transform in Node's native TypeScript runtime.
Controller()(HttpController);
Inject('APPLICATION')(HttpController, undefined as never, 0);
const descriptor = Object.getOwnPropertyDescriptor(HttpController.prototype, 'handle')!;
All('*splat')(HttpController.prototype, 'handle', descriptor);
Req()(HttpController.prototype, 'handle', 0);
Res()(HttpController.prototype, 'handle', 1);
