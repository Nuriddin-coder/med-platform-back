import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module.js';
import { createSwaggerDocument } from './config/swagger.config.js';

async function exportOpenApi() {
  console.log('Generating OpenAPI specification...');
  try {
    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

    app.setGlobalPrefix('api/v1');

    const document = createSwaggerDocument(app);

    // Save to ./contract/openapi.json inside the project
    const targetDir = path.resolve(process.cwd(), 'contract');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, 'openapi.json');
    fs.writeFileSync(targetPath, JSON.stringify(document, null, 2), 'utf-8');
    console.log(`✓ OpenAPI specification exported to: ${targetPath}`);

    // Also support ../contract/openapi.json if parent workspace directory is used
    try {
      const parentContractDir = path.resolve(process.cwd(), '../contract');
      if (fs.existsSync(parentContractDir)) {
        fs.writeFileSync(path.join(parentContractDir, 'openapi.json'), JSON.stringify(document, null, 2), 'utf-8');
      }
    } catch {
      // Ignore if parent directory isn't accessible
    }

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('CRITICAL ERROR in exportOpenApi:', error);
    process.exit(1);
  }
}

exportOpenApi();
