import * as fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";

function getDirname(importMetaUrl: string) {
  return path.dirname(fileURLToPath(importMetaUrl));
}

const __dirname = getDirname(import.meta.url);
const repoRoot = path.resolve(__dirname, "../../");
const templateDir = path.join(repoRoot, "templates", "core-auth");

const VALID_NAME = /^[a-zA-Z0-9_-]+$/;

async function promptProjectName(): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const name = (await rl.question("Project name: ")).trim();
  rl.close();
  return name;
}

function runNpmInstall(cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["install"], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm install failed with exit code ${code}`));
    });

    child.on("error", reject);
  });
}

async function main() {
  const projectNameArg = process.argv[2];
  const destinationArg = process.argv[3];

  const projectName = (projectNameArg ?? (await promptProjectName())).trim();
  if (!projectName) throw new Error("Project name is required.");
  if (!VALID_NAME.test(projectName)) {
    throw new Error("Invalid project name. Use only letters, numbers, '-' or '_'.");
  }

  const destination = destinationArg
    ? path.resolve(destinationArg)
    : path.resolve(repoRoot, projectName);

  const exists = await fs
    .access(destination)
    .then(() => true)
    .catch(() => false);

  if (exists) {
    throw new Error(`Destination already exists: ${destination}`);
  }

  console.log(`Creating project: ${projectName}`);
  console.log(`Copying template from: ${templateDir}`);
  console.log(`Destination: ${destination}`);

  await fs.cp(templateDir, destination, { recursive: true });

  // Update template package.json name
  const pkgPath = path.join(destination, "package.json");
  const pkgRaw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(pkgRaw) as { name?: string };
  pkg.name = projectName;
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");

  console.log("Running npm install...");
  await runNpmInstall(destination);
  console.log("Project created successfully.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

