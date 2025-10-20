import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

async function main() {
  loadEnv();

  const [jobName] = process.argv.slice(2);
  if (!jobName) {
    throw new Error("Usage: npm run jobs:run -- <job-name>");
  }

  const jobModule = await import(`./${jobName}.js`).catch(async () => import(`./${jobName}`));
  const runner = jobModule.run ?? jobModule.default;

  if (typeof runner !== "function") {
    throw new Error(`Job "${jobName}" does not export a runnable function.`);
  }

  await runner();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

function loadEnv() {
  const cwd = process.cwd();
  const localEnvPath = resolve(cwd, ".env.local");
  if (existsSync(localEnvPath)) {
    config({ path: localEnvPath });
  }

  config();
}
