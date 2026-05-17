import { createReadStream } from "node:fs";
import { appendFile, mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

export async function appendJsonl(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

export async function* readJsonl(filePath, options = {}) {
  try {
    await stat(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }
    throw error;
  }

  const stream = createReadStream(filePath, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;

  for await (const line of lines) {
    lineNumber += 1;
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    try {
      yield JSON.parse(trimmed);
    } catch (error) {
      if (options.skipInvalid) {
        continue;
      }

      const parseError = new Error(
        `Invalid JSONL in ${filePath} at line ${lineNumber}: ${error.message}`,
      );
      parseError.cause = error;
      throw parseError;
    }
  }
}

export async function readJsonlArray(filePath, options = {}) {
  const rows = [];

  for await (const row of readJsonl(filePath, options)) {
    rows.push(row);
  }

  return rows;
}
