import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function main() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const demo = app.get(DemoService);
    await demo.run();
    await app.close();
}

import { DemoService } from './demo.service.js';

main().catch(console.error);
