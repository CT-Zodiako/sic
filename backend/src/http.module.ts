import { Module } from '@nestjs/common';
import { HttpController } from './http.controller.ts';
import type { Application } from './app.ts';

export function createHttpModule(application: Application) {
  class RuntimeHttpModule {}
  Module({
    controllers: [HttpController],
    providers: [{ provide: 'APPLICATION', useValue: application }],
  })(RuntimeHttpModule);
  return RuntimeHttpModule;
}
