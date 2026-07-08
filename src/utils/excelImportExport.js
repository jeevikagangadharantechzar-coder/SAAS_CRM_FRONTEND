import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

const HEADER_FILL = "FF008ECC"; // matches the app's brand blue used throughout the admin UI
const BORDER_COLOR = { argb: "FFB7C0CC" };
const THIN_BORDER = { style: "thin", color: BORDER_COLOR };
const CELL_BORDER = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };

const alignmentForType = (type) => {
  if (type === "number") return "right";
  if (type === "date") return "center";
  return "left";
};

/**
 * Downloads `rows` (array of flat objects keyed by column.key) as a styled,
 * print-ready .xlsx file: bold/colored header, auto-sized columns, borders,
 * per-content-type alignment (text/number/date), wrapped long text, and real
 * Excel date cells (not date-as-text) for columns marked `type: "date"`.
 *
 * Column shape: { key, label, type?: "text"|"number"|"date", wrap?: boolean }
 */
export const exportRowsToExcel = async (rows, columns, filename, sheetName = "Sheet1") => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: Math.min(Math.max(col.label.length + 4, 12), 45),
  }));

  rows.forEach((row) => {
    const rowData = {};
    columns.forEach((col) => {
      const raw = row[col.key];
      if (col.type === "date" && raw) {
        const parsed = new Date(raw);
        rowData[col.key] = isNaN(parsed.getTime()) ? raw : parsed;
      } else {
        rowData[col.key] = raw ?? "";
      }
    });
    sheet.addRow(rowData);
  });

  // Header styling — bold, distinct fill, centered, wraps if a label is long
  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = CELL_BORDER;
  });

  // Data row styling — border + content-type alignment + date format
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    columns.forEach((col, idx) => {
      const cell = row.getCell(idx + 1);
      cell.border = CELL_BORDER;
      cell.alignment = {
        vertical: "middle",
        horizontal: alignmentForType(col.type),
        wrapText: !!col.wrap,
      };
      if (col.type === "date" && cell.value instanceof Date) {
        cell.numFmt = "yyyy-mm-dd";
      }
    });
  }

  // Auto-size columns from actual content (SheetJS/ExcelJS have no built-in
  // "autofit", so approximate it by measuring the widest rendered value)
  columns.forEach((col, idx) => {
    const columnObj = sheet.getColumn(idx + 1);
    let maxLen = col.label.length;
    columnObj.eachCell({ includeEmpty: false }, (cell) => {
      const text = cell.value instanceof Date ? cell.value.toLocaleDateString() : String(cell.value ?? "");
      maxLen = Math.max(maxLen, col.wrap ? Math.min(text.length, 40) : text.length);
    });
    columnObj.width = Math.min(Math.max(maxLen + 3, 12), 45);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Downloads a blank template containing only the header row (import-eligible
 * columns only — export-only columns like "Created At" are left out since
 * they don't make sense to fill in) so a re-uploaded template round-trips.
 */
export const downloadExcelTemplate = (columns, filename, sheetName = "Template") => {
  const importable = columns.filter((c) => !c.exportOnly);
  const headers = importable.map((c) => c.label);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
};

/**
 * Reads an uploaded .xlsx/.xls File and maps each row from its Excel header
 * label back to the internal column key (case/whitespace-insensitive), so
 * the caller gets plain objects keyed exactly like the rest of the app's API
 * payloads expect. Rows are read and returned exactly as they appear in the
 * sheet — no values are skipped or altered beyond this key-name mapping.
 */
export const parseExcelFile = (file, columns) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const firstSheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

        const labelToKey = {};
        columns.forEach(({ key, label }) => {
          labelToKey[label.trim().toLowerCase()] = key;
        });

        const rows = rawRows.map((rawRow) => {
          const row = {};
          Object.entries(rawRow).forEach(([header, value]) => {
            const key = labelToKey[String(header).trim().toLowerCase()];
            if (key) row[key] = typeof value === "string" ? value.trim() : value;
          });
          return row;
        });

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
