import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function matlabString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveMatlabExecutable() {
  const explicitCandidates = [];
  const fallbackCandidates = [];

  if (process.env.MATLAB_PATH) {
    explicitCandidates.push(process.env.MATLAB_PATH);
  }

  if (process.platform === "win32") {
    const programFiles = [
      process.env["ProgramFiles"],
      process.env["ProgramW6432"],
      process.env["ProgramFiles(x86)"],
    ].filter(Boolean);

    for (const baseDir of programFiles) {
      const matlabRoot = path.join(baseDir, "MATLAB");

      try {
        const versions = await fs.readdir(matlabRoot, { withFileTypes: true });
        const versionDirs = versions
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort()
          .reverse();

        for (const versionDir of versionDirs) {
          explicitCandidates.push(path.join(matlabRoot, versionDir, "bin", "matlab.exe"));
        }
      } catch {
        continue;
      }
    }
  } else if (process.platform === "darwin") {
    explicitCandidates.push("/Applications/MATLAB_R2025b.app/bin/matlab");
    explicitCandidates.push("/Applications/MATLAB_R2025a.app/bin/matlab");
  } else {
    explicitCandidates.push("/usr/local/bin/matlab");
    explicitCandidates.push("/usr/bin/matlab");
  }

  for (const candidate of explicitCandidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  fallbackCandidates.push("matlab");
  return fallbackCandidates[0];
}

export async function calculateWithMatlab({ expression, projectRoot }) {
  const rootDir = path.resolve(projectRoot, "..");
  const tmpDir = path.join(projectRoot, "tmp");
  const matlabDir = path.join(rootDir, "matlab");
  const requestFile = path.join(tmpDir, `request-${Date.now()}.json`);
  const responseFile = path.join(tmpDir, `response-${Date.now()}.json`);

  await ensureDirectory(tmpDir);

  await fs.writeFile(
    requestFile,
    JSON.stringify(
      {
        expression,
      },
      null,
      2,
    ),
    "utf8",
  );

  const command = `addpath(${matlabString(matlabDir)}); run_calculus(${matlabString(
    requestFile,
  )}, ${matlabString(responseFile)});`;
  const matlabExecutable = await resolveMatlabExecutable();

  try {
    await execFileAsync(matlabExecutable, ["-batch", command], {
      cwd: rootDir,
      timeout: 120000,
      windowsHide: true,
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        "MATLAB was not found. Set the full path in a MATLAB_PATH environment variable or add MATLAB's bin folder to your PATH.",
      );
    }

    if (await fileExists(responseFile)) {
      try {
        const matlabResult = await readJson(responseFile);
        if (matlabResult?.error) {
          throw new Error(`MATLAB error: ${matlabResult.error}`);
        }
      } catch (readError) {
        if (readError instanceof Error && readError.message.startsWith("MATLAB error:")) {
          throw readError;
        }
      }
    }

    const stderr = error.stderr?.trim();
    const stdout = error.stdout?.trim();
    const detail = stderr || stdout;

    if (detail) {
      throw new Error(`MATLAB error: ${detail}`);
    }

    throw new Error("MATLAB could not finish the calculation.");
  }

  try {
    const result = await readJson(responseFile);
    if (result?.error) {
      throw new Error(`MATLAB error: ${result.error}`);
    }
    return result;
  } finally {
    await Promise.allSettled([
      fs.rm(requestFile, { force: true }),
      fs.rm(responseFile, { force: true }),
    ]);
  }
}
