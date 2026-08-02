import { fetchTableSchema, fetchTableWithName, executeRawQuery } from "../../../lib/api.js";
import { bindColumnResizer, bindCellSelection, bindCellEditor } from "../data/events.js";
import { getFilterQuery, generateRowHtml } from "../data/utils.js";

export { saveDataGridEdits } from "../data/core.js";

export async function loadTableData(tableName, btnElement, whereClause = "", preserveState = false) {
  const allBtns = document.querySelectorAll(".table-btn");
  allBtns.forEach((b) => b.classList.remove("active"));
  if (btnElement) btnElement.classList.add("active");

  const headerTableName = document.getElementById("table-name");
  if (headerTableName) headerTableName.textContent = tableName;

  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = "<div style='padding:24px;'>Loading...</div>";

  try {
    const schemaRes = await fetchTableSchema(tableName);
    if (!schemaRes.success) throw new Error(schemaRes.error);
    const schema = schemaRes.data;
    const pkColumn = schema.find((c) => c.isPk)?.name;

    if (!preserveState || !window.DataGrid) {
      window.DataGrid = {
        schema,
        pkColumn,
        pendingEdits: {},
        pendingInserts: [{}],
        pendingDeletes: new Set(),
        selectedCell: null,
        history: [],
        currentTransaction: null,
        sortState: { col: pkColumn || schema[0].name, asc: true },
        pagination: { limit: 50, offset: 0, isLoading: false, hasMore: true },
        selection: {
          isDragging: false,
          startRow: -1,
          startCol: -1,
          endRow: -1,
          endCol: -1,
        },
      };
    }

    const options = {
      where: whereClause,
      limit: window.DataGrid.pagination.limit,
      offset: window.DataGrid.pagination.offset,
      orderCol: window.DataGrid.sortState.col,
      orderAsc: window.DataGrid.sortState.asc,
    };

    const res = await fetchTableWithName(tableName, options);
    if (res.success && res.data) {
      const rows = res.data.rows;
      const columns = res.data.columns;
      window.DataGrid.pagination.hasMore =
        rows.length === window.DataGrid.pagination.limit;

      let columnOptions = columns
        .map((c) => `<option value="${c}">${c}</option>`)
        .join("");

      let html = `
        <div class="toolbar">
          <div class="filter-group">
            <div class="filter-icon-container">
              <span class="material-symbols-outlined" id="filter-icon">filter_list</span>
              <span>Filter</span>
            </div>
            <select id="filter-col" class="filter-select">${columnOptions}</select>
            <select id="filter-op" class="filter-select">
              <option value="=">=</option>
              <option value=">">></option>
              <option value="<"><</option>
              <option value=">=">>=</option>
              <option value="<="><=</option>
              <option value="LIKE">LIKE</option>
              <option value="!=">!=</option>
            </select>
            <input type="text" id="filter-val" class="filter-input" placeholder="Enter value..." />
          </div>
          <button id="btn-run-query"><span class="material-symbols-outlined">check</span> Apply</button>
          ${whereClause ? `<button id="btn-clear-query"><span class="material-symbols-outlined">close</span> Clear</button>` : ""}
          <button id="btn-refresh-data" title="Refresh Data (F5)"><span class="material-symbols-outlined">refresh</span></button>
        </div>
      `;

      html += `<div class="table-container" id="data-grid-container"><table class="data-table" id="data-grid-table"><thead><tr>`;
      html += `<th class="row-header">#</th>`;
      columns.forEach((col) => {
        const colSchema = schema.find((c) => c.name === col);
        let pkLabel = "";
        let typeLabel = "";
        if (colSchema) {
          if (colSchema.isPk)
            pkLabel = ` <span style="opacity:0.5; font-size:10px;">(PK)</span>`;
          if (colSchema.name.toLowerCase().includes("id") && !colSchema.isPk)
            pkLabel = ` <span style="opacity:0.5; font-size:10px;">(FK)</span>`;
          typeLabel = `<br><span style="font-weight:normal; opacity:0.7; font-size:10px; font-family:monospace;">${colSchema.type}</span>`;
        }
        let sortArrow = "";
        if (window.DataGrid.sortState.col === col) {
          sortArrow = window.DataGrid.sortState.asc ? "▲" : "▼";
        }
        html += `<th class="sortable" data-col="${col}" style="cursor:pointer; user-select:none;">
                   <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>${col}${pkLabel}${typeLabel}</div>
                      <div class="sort-arrow" style="font-size:10px; opacity:0.8; margin-left: 8px; width: 12px; text-align: right;">${sortArrow}</div>
                   </div>
                 </th>`;
      });
      html += `</tr></thead><tbody>`;

      if (rows && rows.length > 0) {
        rows.forEach((row, rowIndex) => {
          html += `<tr>${generateRowHtml(row, rowIndex, pkColumn, columns)}</tr>`;
        });
      }

      html += `<tr class="ghost-row-tr">`;
      const ghostIdx = rows ? rows.length : 0;
      html += `<td class="row-header" data-row-idx="${ghostIdx}">*</td>`;
      columns.forEach((col, cIdx) => {
        html += `<td class="data-cell ghost-row" data-row-idx="${ghostIdx}" data-col-idx="${cIdx}" data-insert-index="0" data-col="${col}">+ New</td>`;
      });
      html += `</tr></tbody></table></div>`;
      mainContent.innerHTML = html;

      const tableContainer = document.getElementById("data-grid-container");

      document.querySelectorAll("th.sortable").forEach((th) => {
        th.onclick = (e) => {
          if (window.DataGrid && window.DataGrid.isResizing) return;
          const hasPending =
            Object.keys(window.DataGrid.pendingEdits).length > 0 ||
            window.DataGrid.pendingInserts.length > 1 ||
            window.DataGrid.pendingDeletes.size > 0;
          if (hasPending) {
            alert(
              "你有未儲存的變更！因為分頁與排序需要向資料庫重新載入資料，請先按下 Ctrl+S 儲存變更，然後再點擊排序。",
            );
            return;
          }

          const col = th.dataset.col;
          if (window.DataGrid.sortState.col === col) {
            window.DataGrid.sortState.asc = !window.DataGrid.sortState.asc;
          } else {
            window.DataGrid.sortState.col = col;
            window.DataGrid.sortState.asc = true;
          }

          window.DataGrid.pagination.offset = 0;
          loadTableData(tableName, btnElement, getFilterQuery(), true);
        };

        bindColumnResizer(th);
      });

      bindCellSelection(tableContainer, columns.length);
      bindCellEditor(tableContainer, schema, columns);

      const runBtn = document.getElementById("btn-run-query");
      const clearBtn = document.getElementById("btn-clear-query");
      const inputElSearch = document.getElementById("filter-val");

      const executeSearch = (resetOffset = true) => {
        if (resetOffset && window.DataGrid)
          window.DataGrid.pagination.offset = 0;
          
        const val = inputElSearch?.value.trim();
        const op = document.getElementById("filter-op")?.value;
        if (!val && op !== "IS NULL") return;
        
        loadTableData(tableName, btnElement, getFilterQuery(), true);
      };

      if (runBtn) runBtn.onclick = () => executeSearch(true);
      if (inputElSearch)
        inputElSearch.addEventListener("keydown", (e) => {
          if (e.key === "Enter") executeSearch(true);
        });
      if (clearBtn)
        clearBtn.onclick = () =>
          loadTableData(tableName, btnElement, "", true);

      const refreshData = () => {
        const hasPending =
          Object.keys(window.DataGrid.pendingEdits).length > 0 ||
          window.DataGrid.pendingInserts.length > 1 ||
          window.DataGrid.pendingDeletes.size > 0;
        if (hasPending) {
          const confirmDiscard = confirm(
            "你有未儲存的變更！如果重新整理，這些變更將會遺失。確定要捨棄變更並重新整理嗎？",
          );
          if (!confirmDiscard) return;
        }
        executeSearch(false);
      };

      const refreshBtn = document.getElementById("btn-refresh-data");
      if (refreshBtn) refreshBtn.onclick = refreshData;

      window.DataGrid.refreshData = refreshData;
    } else {
      mainContent.innerHTML = `<div style="padding:24px; color:red;">Error: ${res.error}</div>`;
    }
  } catch (err) {
    mainContent.innerHTML = `<div style="padding:24px; color:red;">Failed to load data: ${err.message}</div>`;
  }
}
