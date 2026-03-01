/**
 * Client-side Excel export utility using SheetJS (loaded via CDN).
 * Supports single-sheet (array input) and multi-sheet (object with sheet names as keys) exports.
 */

declare global {
  interface Window {
    XLSX: any;
  }
}

function loadXLSX(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.XLSX) {
      resolve(window.XLSX);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    script.onload = () => {
      if (window.XLSX) {
        resolve(window.XLSX);
      } else {
        reject(new Error("XLSX failed to load"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load XLSX script"));
    document.head.appendChild(script);
  });
}

/**
 * Export data to an Excel (.xlsx) file.
 * @param filename - The name of the file to download (should end with .xlsx)
 * @param data - Either an array of objects (single sheet) or a Record<sheetName, object[]> (multi-sheet)
 */
export async function exportToExcel(
  filename: string,
  data: object[] | Record<string, object[]>,
): Promise<void> {
  const XLSX = await loadXLSX();

  const workbook = XLSX.utils.book_new();

  if (Array.isArray(data)) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  } else {
    for (const [sheetName, rows] of Object.entries(data)) {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
  }

  XLSX.writeFile(
    workbook,
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
  );
}
