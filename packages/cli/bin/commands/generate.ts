import {
  generateModule,
  generateService,
  generateController,
} from "../generators/module.generator.js";
import { loadConfig } from "../utils/config.js";

const USAGE = `
Usage:
  pnpm wilt generate module <name> [--path <dir>] [--no-test]
  pnpm wilt generate service <name> [--path <dir>]
  pnpm wilt generate controller <name> [--path <dir>]

Aliases:
  g m  →  generate module
  g s  →  generate service
  g c  →  generate controller

Flags:
  --no-test   Skip generating the .test.ts file for a module

Examples:
  pnpm wilt generate module payment
  pnpm wilt g m payment
  pnpm wilt generate module payment --no-test
  pnpm wilt generate service payment --path src/modules/app/payment
`.trim();

function parsePath(args: string[]): { args: string[]; path?: string } {
  const idx = args.indexOf("--path");
  if (idx === -1) return { args };
  const path = args[idx + 1];
  const cleaned = args.filter((_, i) => i !== idx && i !== idx + 1);
  return { args: cleaned, path };
}

function parseNoTest(args: string[]): { args: string[]; noTest: boolean } {
  const idx = args.indexOf("--no-test");
  if (idx === -1) return { args, noTest: false };
  return { args: args.filter((_, i) => i !== idx), noTest: true };
}

export async function runGenerate(args: string[]): Promise<void> {
  const { args: withoutPath, path: targetPath } = parsePath(args);
  const { args: cleanArgs, noTest } = parseNoTest(withoutPath);
  const [subcommand, name] = cleanArgs;

  if (!subcommand || !name) {
    console.error(`  ✗ Missing arguments.\n\n${USAGE}`);
    process.exit(1);
  }

  const config = await loadConfig();
  const sub = subcommand.toLowerCase();

  if (sub === "module" || sub === "m") {
    console.log(`\n  Generating module "${name}"...\n`);
    generateModule(name, {
      dir: targetPath,
      modulesDir: config.modulesDir,
      srcDir: config.srcDir,
      defaultFiles: config.generate.files,
      noTest,
    });
  } else if (sub === "service" || sub === "s") {
    console.log(`\n  Generating service "${name}"...\n`);
    generateService(name, targetPath, config.modulesDir);
  } else if (sub === "controller" || sub === "c") {
    console.log(`\n  Generating controller "${name}"...\n`);
    generateController(name, targetPath, config.modulesDir);
  } else {
    console.error(`  ✗ Unknown generate subcommand: "${subcommand}"\n\n${USAGE}`);
    process.exit(1);
  }
}
