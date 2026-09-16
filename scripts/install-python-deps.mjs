import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const isWin = process.platform === "win32";
const venvDir = resolve(root, ".venv");
const venvPip = resolve(
  venvDir,
  isWin ? "Scripts/pip.exe" : "bin/pip",
);
const venvPython = resolve(
  venvDir,
  isWin ? "Scripts/python.exe" : "bin/python",
);
const reqFile = resolve(root, "analyser/requirements.txt");

console.log("[ThermalGuard Python Setup] Ensuring XGBoost model dependencies...");

try {
  // 1. If .venv doesn't exist, create it
  if (!existsSync(venvPython)) {
    console.log("[ThermalGuard Python Setup] Creating .venv environment...");
    const pyCmd = isWin ? "python" : "python3";
    spawnSync(pyCmd, ["-m", "venv", ".venv"], {
      cwd: root,
      stdio: "inherit",
    });
  }

  // 2. Install inside .venv if pip exists
  if (existsSync(venvPip)) {
    console.log("[ThermalGuard Python Setup] Installing analyser/requirements.txt into .venv...");
    const pipRes = spawnSync(venvPip, ["install", "--prefer-binary", "-r", reqFile], {
      cwd: root,
      stdio: "inherit",
    });
    if (pipRes.status === 0) {
      console.log("[ThermalGuard Python Setup] Successfully configured .venv with XGBoost dependencies.");
      process.exit(0);
    }
  }

  // 3. Fallback: try global pip3 / pip
  console.log("[ThermalGuard Python Setup] Fallback: installing via system pip...");
  for (const cmd of [isWin ? "pip" : "pip3", "pip"]) {
    const res = spawnSync(
      cmd,
      ["install", "--prefer-binary", "--break-system-packages", "-r", reqFile],
      { cwd: root, stdio: "inherit" },
    );
    if (res.status === 0) {
      console.log(`[ThermalGuard Python Setup] Successfully installed via ${cmd}.`);
      process.exit(0);
    }
  }
} catch (err) {
  console.warn("[ThermalGuard Python Setup] Advisory: Could not complete automatic Python setup:", err.message);
}
