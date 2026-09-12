import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const python =
  process.env.PYTHON_BIN ||
  resolve(
    root,
    process.platform === "win32"
      ? ".venv/Scripts/python.exe"
      : ".venv/bin/python",
  );
const child = spawn(
  python,
  ["-m", "unittest", "discover", "-s", "analyser", "-p", "test_model.py", "-v"],
  { cwd: root, stdio: "inherit", windowsHide: true },
);
child.on("error", () => {
  console.error(
    "Create .venv with Python 3.12 and install analyser/requirements.txt first.",
  );
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
