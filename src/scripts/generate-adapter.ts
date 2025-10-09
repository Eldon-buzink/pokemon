#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';

interface GenerateAdapterOptions {
  id: string;
  name: string;
  lang: 'EN' | 'JP';
  outputDir?: string;
}

async function generateAdapter(options: GenerateAdapterOptions): Promise<void> {
  const { id, name, lang, outputDir = 'adapters/sets' } = options;
  
  console.log(`🎯 Generating adapter for ${id} (${name})`);
  
  // Read template
  const templatePath = path.join(process.cwd(), 'adapters/sets/_template.json');
  const template = await fs.readFile(templatePath, 'utf8');
  
  // Replace placeholders
  const content = template
    .replace(/\{\{SET_ID\}\}/g, id)
    .replace(/\{\{SET_NAME\}\}/g, name)
    .replace(/\{\{LANG\}\}/g, lang);
  
  // Write adapter file
  const outputPath = path.join(process.cwd(), outputDir, `${id}.json`);
  await fs.writeFile(outputPath, content);
  
  console.log(`✅ Created adapter: ${outputPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: tsx generate-adapter.ts --id <setId> --name "<setName>" --lang <EN|JP>');
    console.log('Example: tsx generate-adapter.ts --id sv13 --name "Temporal Forces" --lang EN');
    process.exit(1);
  }
  
  const options: GenerateAdapterOptions = {
    id: '',
    name: '',
    lang: 'EN'
  };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    
    switch (flag) {
      case '--id':
        options.id = value;
        break;
      case '--name':
        options.name = value;
        break;
      case '--lang':
        if (value === 'EN' || value === 'JP') {
          options.lang = value;
        } else {
          console.error('Error: --lang must be EN or JP');
          process.exit(1);
        }
        break;
      default:
        console.error(`Unknown flag: ${flag}`);
        process.exit(1);
    }
  }
  
  if (!options.id || !options.name) {
    console.error('Error: --id and --name are required');
    process.exit(1);
  }
  
  try {
    await generateAdapter(options);
  } catch (error) {
    console.error('Error generating adapter:', error);
    process.exit(1);
  }
}

main();
