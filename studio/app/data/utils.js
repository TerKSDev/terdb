export function getFilterQuery() {
  const t = window.AppState?.currentTable;
  if (!t) return "";
  const filterVal = document.getElementById(`filter-val-${t}`)?.value.trim();
  const filterOp = document.getElementById(`filter-op-${t}`)?.value;
  const filterCol = document.getElementById(`filter-col-${t}`)?.value;

  let query = "";
  if (filterVal || filterOp === "IS NULL") {
    let safeVal = filterVal;
    if (
      safeVal &&
      !safeVal.startsWith("'") &&
      !safeVal.endsWith("'") &&
      isNaN(Number(safeVal))
    ) {
      const isRawSql = safeVal.toUpperCase().includes(" AND ") || safeVal.toUpperCase().includes(" OR ");
      if (!isRawSql) {
        safeVal = `'${safeVal.replace(/'/g, "''")}'`;
      }
    }
    query = `"${filterCol}" ${filterOp} ${safeVal}`;
  }
  return query;
}

export function generateRowHtml(row, rowIndex, pkColumn, columns) {
  let html = `<td class="row-header" data-row-idx="${rowIndex}">${rowIndex + 1}</td>`;
  const pkValue = pkColumn ? row[pkColumn] : rowIndex;
  columns.forEach((col, cIdx) => {
    const val = row[col] !== null ? String(row[col]) : "null";
    const safeValForAttr = val.replace(/"/g, "&quot;");
    const safeValForHtml =
      val === "null" ? "<em>null</em>" : val.replace(/</g, "&lt;");
    html += `<td class="data-cell" data-row-idx="${rowIndex}" data-col-idx="${cIdx}" data-pk="${pkValue}" data-col="${col}" data-original="${safeValForAttr}">${safeValForHtml}</td>`;
  });
  return html;
}
