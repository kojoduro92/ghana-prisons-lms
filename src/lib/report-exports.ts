import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";

const REPORT_DIR = path.join(process.cwd(), "data", "report-exports");

export async function ensureReportExportDir(): Promise<void> {
  await mkdir(REPORT_DIR, { recursive: true });
}

export function reportFilePath(fileName: string): string {
  return path.join(REPORT_DIR, fileName);
}

export async function writeCsv(fileName: string, rows: Array<Record<string, unknown>>): Promise<string> {
  await ensureReportExportDir();
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const lines = [keys.join(",")];
  for (const row of rows) {
    const line = keys
      .map((key) => {
        const value = row[key];
        const raw = value === undefined || value === null ? "" : String(value);
        const escaped = raw.replaceAll('"', '""');
        return `"${escaped}"`;
      })
      .join(",");
    lines.push(line);
  }
  const fullPath = reportFilePath(fileName);
  await writeFile(fullPath, `${lines.join("\n")}\n`, "utf8");
  return fullPath;
}

export async function writeXlsx(fileName: string, rows: Array<Record<string, unknown>>): Promise<string> {
  await ensureReportExportDir();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  const fullPath = reportFilePath(fileName);
  XLSX.writeFile(workbook, fullPath);
  return fullPath;
}

export async function writePdf(fileName: string, title: string, rows: Array<Record<string, unknown>>): Promise<string> {
  await ensureReportExportDir();
  const fullPath = reportFilePath(fileName);
  const document = new PDFDocument({ margin: 40 });
  const writePromise = new Promise<void>((resolve, reject) => {
    const stream = document.pipe(createWriteStream(fullPath));
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  document.fontSize(18).text(title);
  document.moveDown();
  document.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
  document.moveDown();

  rows.slice(0, 80).forEach((row, index) => {
    document.fontSize(11).text(`${index + 1}. ${JSON.stringify(row)}`);
    document.moveDown(0.4);
  });

  document.end();
  await writePromise;
  return fullPath;
}
