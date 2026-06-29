import {
  addD1,
  addR2,
  addKv,
  addQueue,
  addAi,
  addDurableObject,
  addVectorize,
  addBrowser,
  addHyperdrive,
  addVar,
} from "../utils/wrangler.js";

const USAGE = `
Usage:
  pnpm wilt add var <NAME> [value]
  pnpm wilt add d1 <BINDING_NAME> <database-name>
  pnpm wilt add r2 <BINDING_NAME> <bucket-name>
  pnpm wilt add kv <BINDING_NAME>
  pnpm wilt add queue <BINDING_NAME> <queue-name>
  pnpm wilt add ai <BINDING_NAME>
  pnpm wilt add durable-object <BINDING_NAME> <ClassName>
  pnpm wilt add vectorize <BINDING_NAME> <index-name> [dimensions]
  pnpm wilt add browser <BINDING_NAME>
  pnpm wilt add hyperdrive <BINDING_NAME> <connection-string>

Examples:
  pnpm wilt add var JWT_SECRET
  pnpm wilt add var MODE development
  pnpm wilt add d1 PAYMENTS_DB payments-db
  pnpm wilt add r2 ASSETS_BUCKET my-assets
  pnpm wilt add kv SESSION_KV
  pnpm wilt add queue MAIL_QUEUE mailer
  pnpm wilt add ai AI
  pnpm wilt add durable-object CHAT_ROOM ChatRoom
  pnpm wilt add vectorize VECTOR_IDX my-index 1536
  pnpm wilt add browser BROWSER
  pnpm wilt add hyperdrive HYPERDRIVE postgres://user:pass@host/db
`.trim();

export function runAdd(args: string[]): void {
  const [service, ...rest] = args;

  if (!service) {
    console.error(`  ✗ Missing service type.\n\n${USAGE}`);
    process.exit(1);
  }

  const svc = service.toLowerCase();

  switch (svc) {
    case "var": {
      const [name, value] = rest;
      if (!name) {
        console.error(`  ✗ Usage: pnpm wilt add var <NAME> [value]`);
        process.exit(1);
      }
      console.log(`\n  Adding var to wrangler.jsonc...\n`);
      addVar(name, value);
      break;
    }

    case "d1": {
      const [binding, dbName] = rest;
      if (!binding || !dbName) {
        console.error(`  ✗ Usage: pnpm wilt add d1 <BINDING_NAME> <database-name>`);
        process.exit(1);
      }
      console.log(`\n  Adding D1 binding to wrangler.jsonc...\n`);
      addD1(binding, dbName);
      break;
    }

    case "r2": {
      const [binding, bucketName] = rest;
      if (!binding || !bucketName) {
        console.error(`  ✗ Usage: pnpm wilt add r2 <BINDING_NAME> <bucket-name>`);
        process.exit(1);
      }
      console.log(`\n  Adding R2 binding to wrangler.jsonc...\n`);
      addR2(binding, bucketName);
      break;
    }

    case "kv": {
      const [binding] = rest;
      if (!binding) {
        console.error(`  ✗ Usage: pnpm wilt add kv <BINDING_NAME>`);
        process.exit(1);
      }
      console.log(`\n  Adding KV namespace binding to wrangler.jsonc...\n`);
      addKv(binding);
      break;
    }

    case "queue": {
      const [binding, queueName] = rest;
      if (!binding || !queueName) {
        console.error(`  ✗ Usage: pnpm wilt add queue <BINDING_NAME> <queue-name>`);
        process.exit(1);
      }
      console.log(`\n  Adding Queue binding to wrangler.jsonc...\n`);
      addQueue(binding, queueName);
      break;
    }

    case "ai": {
      const [binding] = rest;
      if (!binding) {
        console.error(`  ✗ Usage: pnpm wilt add ai <BINDING_NAME>`);
        process.exit(1);
      }
      console.log(`\n  Adding AI binding to wrangler.jsonc...\n`);
      addAi(binding);
      break;
    }

    case "durable-object":
    case "do": {
      const [binding, className] = rest;
      if (!binding || !className) {
        console.error(`  ✗ Usage: pnpm wilt add durable-object <BINDING_NAME> <ClassName>`);
        process.exit(1);
      }
      console.log(`\n  Adding Durable Object binding to wrangler.jsonc...\n`);
      addDurableObject(binding, className);
      break;
    }

    case "vectorize":
    case "vector": {
      const [binding, indexName, rawDimensions] = rest;
      if (!binding || !indexName) {
        console.error(`  ✗ Usage: pnpm wilt add vectorize <BINDING_NAME> <index-name> [dimensions]`);
        process.exit(1);
      }
      const dimensions = rawDimensions ? parseInt(rawDimensions, 10) : 1536;
      console.log(`\n  Adding Vectorize binding to wrangler.jsonc...\n`);
      addVectorize(binding, indexName, dimensions);
      break;
    }

    case "browser": {
      const [binding] = rest;
      if (!binding) {
        console.error(`  ✗ Usage: pnpm wilt add browser <BINDING_NAME>`);
        process.exit(1);
      }
      console.log(`\n  Adding Browser rendering binding to wrangler.jsonc...\n`);
      addBrowser(binding);
      break;
    }

    case "hyperdrive": {
      const [binding, connectionString] = rest;
      if (!binding || !connectionString) {
        console.error(`  ✗ Usage: pnpm wilt add hyperdrive <BINDING_NAME> <connection-string>`);
        process.exit(1);
      }
      console.log(`\n  Adding Hyperdrive binding to wrangler.jsonc...\n`);
      addHyperdrive(binding, connectionString);
      break;
    }

    default: {
      console.error(`  ✗ Unknown service type: "${service}"\n\n${USAGE}`);
      process.exit(1);
    }
  }
}
