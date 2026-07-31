import { fetchTableSchema, fetchTableWithName, executeRawQuery } from "../../../lib/api.js";

export async function saveDataGridEdits() {
  if (!window.DataGrid) return;
  const { pendingEdits, pendingInserts, pkColumn } = window.DataGrid;
  const tableName = window.AppState.currentTable;

  if (!tableName || !pkColumn) {
    alert("Cannot save: No Primary Key detected for this table.");
    return;
  }

  let sqls = [];

  for (const [pkVal, edits] of Object.entries(pendingEdits)) {
    if (Object.keys(edits).length === 0) continue;
    const setClauses = Object.entries(edits)
      .map(([col, val]) => {
        if (val === "") return `"${col}" = NULL`;
        return `"${col}" = '${val.replace(/'/g, "''")}'`;
      })
      .join(", ");
    sqls.push(
      `UPDATE "${tableName}" SET ${setClauses} WHERE "${pkColumn}" = '${pkVal.replace(/'/g, "''")}';`,
    );
  }

  for (let i = 0; i < pendingInserts.length; i++) {
    const row = pendingInserts[i];
    if (Object.keys(row).length === 0) continue;

    const hasData = Object.values(row).some((val) => val !== "");
    if (!hasData) continue;

    const cols = Object.keys(row);
    const vals = cols.map((c) => {
      const val = row[c];
      if (val === "") return "NULL";
      return `'${val.replace(/'/g, "''")}'`;
    });
    sqls.push(
      `INSERT INTO "${tableName}" ("${cols.join('", "')}") VALUES (${vals.join(", ")});`,
    );
  }

  if (window.DataGrid.pendingDeletes) {
    for (const pk of window.DataGrid.pendingDeletes) {
      sqls.push(
        `DELETE FROM "${tableName}" WHERE "${pkColumn}" = '${pk.replace(/'/g, "''")}';`,
      );
    }
  }

  if (sqls.length === 0) return;

  let allSuccess = true;
  let errorMsg = "";

  for (const sql of sqls) {
    try {
      const res = await executeRawQuery(sql);
      if (!res.success) {
        allSuccess = false;
        errorMsg = res.error;
        break;
      }
    } catch (e) {
      allSuccess = false;
      errorMsg = e.message;
      break;
    }
  }

  if (allSuccess) {
    window.renderCurrentView();
  } else {
    alert("Save failed:\n" + errorMsg);
    document.querySelectorAll(".cell-edited").forEach((td) => {
      td.classList.remove("cell-edited");
      td.classList.add("cell-error");
    });
  }
}

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
          html += `<tr>`;
          html += `<td class="row-header" data-row-idx="${rowIndex}">${rowIndex + 1}</td>`;
          const pkValue = pkColumn ? row[pkColumn] : rowIndex;
          columns.forEach((col, cIdx) => {
            const val = row[col] !== null ? String(row[col]) : "null";
            const safeValForAttr = val.replace(/"/g, "&quot;");
            const safeValForHtml =
              val === "null" ? "<em>null</em>" : val.replace(/</g, "&lt;");
            html += `<td class="data-cell" data-row-idx="${rowIndex}" data-col-idx="${cIdx}" data-pk="${pkValue}" data-col="${col}" data-original="${safeValForAttr}">${safeValForHtml}</td>`;
          });
          html += `</tr>`;
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
          const filterVal = document.getElementById("filter-val")?.value.trim();
          const filterOp = document.getElementById("filter-op")?.value;
          const filterCol = document.getElementById("filter-col")?.value;

          let query = "";
          if (filterVal || filterOp === "IS NULL") {
            let safeVal = filterVal;
            if (
              safeVal &&
              !safeVal.startsWith("'") &&
              !safeVal.endsWith("'") &&
              isNaN(Number(safeVal))
            ) {
              safeVal = `'${safeVal.replace(/'/g, "''")}'`;
            }
            query = `"${filterCol}" ${filterOp} ${safeVal}`;
          }
          loadTableData(tableName, btnElement, query, true);
        };

        const resizer = document.createElement("div");
        resizer.className = "resizer";
        th.appendChild(resizer);
        resizer.addEventListener("click", (e) => e.stopPropagation());

        resizer.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          let startX = e.pageX;
          let startWidth = th.offsetWidth;
          let hasDragged = false;

          const onMouseMove = (e2) => {
            hasDragged = true;
            if (window.DataGrid) window.DataGrid.isResizing = true;
            const newWidth = startWidth + (e2.pageX - startX);
            th.style.width = newWidth + "px";
            th.style.minWidth = newWidth + "px";
            th.style.maxWidth = newWidth + "px";
          };

          const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "";
            if (hasDragged) {
              setTimeout(() => {
                if (window.DataGrid) window.DataGrid.isResizing = false;
              }, 100);
            }
          };

          document.body.style.cursor = "col-resize";
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        });
      });

      tableContainer.addEventListener("scroll", async () => {
        if (
          window.DataGrid.pagination.isLoading ||
          !window.DataGrid.pagination.hasMore
        )
          return;

        if (
          tableContainer.scrollTop + tableContainer.clientHeight >=
          tableContainer.scrollHeight - 100
        ) {
          window.DataGrid.pagination.isLoading = true;
          window.DataGrid.pagination.offset += window.DataGrid.pagination.limit;

          try {
            let query = "";
            const filterVal = document
              .getElementById("filter-val")
              ?.value.trim();
            const filterOp = document.getElementById("filter-op")?.value;
            const filterCol = document.getElementById("filter-col")?.value;
            if (filterVal || filterOp === "IS NULL") {
              let safeVal = filterVal;
              if (
                safeVal &&
                !safeVal.startsWith("'") &&
                !safeVal.endsWith("'") &&
                isNaN(Number(safeVal))
              ) {
                safeVal = `'${safeVal.replace(/'/g, "''")}'`;
              }
              query = `"${filterCol}" ${filterOp} ${safeVal}`;
            }

            const options = {
              where: query,
              limit: window.DataGrid.pagination.limit,
              offset: window.DataGrid.pagination.offset,
              orderCol: window.DataGrid.sortState.col,
              orderAsc: window.DataGrid.sortState.asc,
            };

            const res = await fetchTableWithName(tableName, options);
            if (res.success && res.data) {
              const newRows = res.data.rows;
              window.DataGrid.pagination.hasMore =
                newRows.length === window.DataGrid.pagination.limit;

              if (newRows.length > 0) {
                const tbody = document.querySelector("#data-grid-table tbody");
                const ghostTr = document.querySelector(".ghost-row-tr");
                let rowOffset = tbody.querySelectorAll(
                  "tr:not(.ghost-row-tr)",
                ).length;

                newRows.forEach((row, i) => {
                  const rowIndex = rowOffset + i;
                  const tr = document.createElement("tr");
                  let html = `<td class="row-header" data-row-idx="${rowIndex}">${rowIndex + 1}</td>`;
                  const pkValue = pkColumn ? row[pkColumn] : rowIndex;
                  columns.forEach((col, cIdx) => {
                    const val = row[col] !== null ? String(row[col]) : "null";
                    const safeValForAttr = val.replace(/"/g, "&quot;");
                    const safeValForHtml =
                      val === "null"
                        ? "<em>null</em>"
                        : val.replace(/</g, "&lt;");
                    html += `<td class="data-cell" data-row-idx="${rowIndex}" data-col-idx="${cIdx}" data-pk="${pkValue}" data-col="${col}" data-original="${safeValForAttr}">${safeValForHtml}</td>`;
                  });
                  tr.innerHTML = html;
                  tbody.insertBefore(tr, ghostTr);
                });
              }
            }
          } finally {
            window.DataGrid.pagination.isLoading = false;
          }
        }
      });

      const renderSelection = () => {
        document
          .querySelectorAll(
            ".cell-in-range, .cell-selected, .range-top, .range-bottom, .range-left, .range-right",
          )
          .forEach((el) => {
            el.classList.remove(
              "cell-in-range",
              "cell-selected",
              "range-top",
              "range-bottom",
              "range-left",
              "range-right",
            );
          });
        const s = window.DataGrid.selection;
        if (s.startRow === -1) return;

        const minR = Math.min(s.startRow, s.endRow);
        const maxR = Math.max(s.startRow, s.endRow);
        const minC = Math.min(s.startCol, s.endCol);
        const maxC = Math.max(s.startCol, s.endCol);

        document.querySelectorAll("td.data-cell").forEach((td) => {
          const r = parseInt(td.dataset.rowIdx);
          const c = parseInt(td.dataset.colIdx);
          if (r >= minR && r <= maxR && c >= minC && c <= maxC) {
            td.classList.add("cell-in-range");

            if (r === minR) td.classList.add("range-top");
            if (r === maxR) td.classList.add("range-bottom");
            if (c === minC) td.classList.add("range-left");
            if (c === maxC) td.classList.add("range-right");

            if (r === s.startRow && c === s.startCol) {
              td.classList.add("cell-selected");
              window.DataGrid.selectedCell = td;
            }
          }
        });
      };

      window.DataGrid.markRowDeleted = function (rowIdx, recordHistory = true) {
        const tr = document
          .querySelector(`td.data-cell[data-row-idx="${rowIdx}"]`)
          ?.closest("tr");
        if (!tr || tr.classList.contains("ghost-row-tr")) return;

        if (tr.classList.contains("row-deleted")) return;

        const firstCell = tr.querySelector("td.data-cell");
        const pk = firstCell?.dataset.pk;
        if (pk !== undefined) {
          if (recordHistory && window.DataGrid.currentTransaction) {
            window.DataGrid.currentTransaction.push({
              type: "delete",
              rowIdx,
              pk,
            });
          }
          window.DataGrid.pendingDeletes.add(pk);
          tr.classList.add("row-deleted");
        }
      };

      window.DataGrid.unmarkRowDeleted = function (rowIdx, pk) {
        const tr = document
          .querySelector(`td.data-cell[data-row-idx="${rowIdx}"]`)
          ?.closest("tr");
        if (tr) tr.classList.remove("row-deleted");
        window.DataGrid.pendingDeletes.delete(pk);
      };

      tableContainer.addEventListener("mousedown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")
          return;

        const rowHeader = e.target.closest("td.row-header");
        if (rowHeader) {
          const r = parseInt(rowHeader.dataset.rowIdx);
          window.DataGrid.selection = {
            isDragging: false,
            startRow: r,
            endRow: r,
            startCol: 0,
            endCol: columns.length - 1,
          };
          renderSelection();
          return;
        }

        const td = e.target.closest("td.data-cell");
        if (!td) return;

        const r = parseInt(td.dataset.rowIdx);
        const c = parseInt(td.dataset.colIdx);
        window.DataGrid.selection = {
          isDragging: true,
          startRow: r,
          startCol: c,
          endRow: r,
          endCol: c,
        };
        renderSelection();
      });

      tableContainer.addEventListener("mouseover", (e) => {
        if (!window.DataGrid.selection.isDragging) return;
        const td = e.target.closest("td.data-cell");
        if (!td) return;
        window.DataGrid.selection.endRow = parseInt(td.dataset.rowIdx);
        window.DataGrid.selection.endCol = parseInt(td.dataset.colIdx);
        renderSelection();
      });

      window.DataGrid.updateCell = function (td, newVal, recordHistory = true) {
        if (recordHistory && window.DataGrid.currentTransaction) {
          let oldVal = td.textContent;
          if (oldVal === "null" || td.classList.contains("ghost-row"))
            oldVal = "";
          if (oldVal !== newVal) {
            window.DataGrid.currentTransaction.push({ td, oldVal, newVal });
          }
        }

        const colName = td.dataset.col;
        td.innerHTML =
          newVal ||
          (td.dataset.insertIndex !== undefined ? "+ New" : "<em>null</em>");

        if (td.dataset.insertIndex !== undefined) {
          const idx = parseInt(td.dataset.insertIndex);
          if (!window.DataGrid.pendingInserts[idx])
            window.DataGrid.pendingInserts[idx] = {};
          if (newVal) {
            window.DataGrid.pendingInserts[idx][colName] = newVal;
            td.classList.add("cell-edited");
            td.classList.remove("ghost-row");

            if (idx === window.DataGrid.pendingInserts.length - 1) {
              window.DataGrid.pendingInserts.push({});
              const tbody = document.querySelector("#data-grid-table tbody");
              const tr = document.createElement("tr");
              tr.className = "ghost-row-tr";
              const nextRowIdx = parseInt(td.dataset.rowIdx) + 1;
              tr.innerHTML += `<td class="row-header" data-row-idx="${nextRowIdx}">*</td>`;
              columns.forEach((c, cIdx) => {
                tr.innerHTML += `<td class="data-cell ghost-row" data-row-idx="${nextRowIdx}" data-col-idx="${cIdx}" data-insert-index="${idx + 1}" data-col="${c}">+ New</td>`;
              });
              tbody.appendChild(tr);
            }
          }
        } else {
          const pk = td.dataset.pk;
          if (newVal !== td.dataset.original) {
            if (!window.DataGrid.pendingEdits[pk])
              window.DataGrid.pendingEdits[pk] = {};
            window.DataGrid.pendingEdits[pk][colName] = newVal;
            td.classList.add("cell-edited");
            td.classList.remove("cell-error");
          } else {
            td.classList.remove("cell-edited");
            td.classList.remove("cell-error");
            if (window.DataGrid.pendingEdits[pk])
              delete window.DataGrid.pendingEdits[pk][colName];
          }
        }
      };

      tableContainer.addEventListener("dblclick", (e) => {
        const td = e.target.closest("td.data-cell");
        if (!td || td.querySelector("input, select")) return;

        const colName = td.dataset.col;
        const colSchema = schema.find((c) => c.name === colName);
        const typeUpper = colSchema?.type?.toUpperCase() || "";
        const isEnum = typeUpper.includes("ENUM");
        const isDate = typeUpper === "DATE";
        const isDateTime =
          typeUpper.includes("DATETIME") || typeUpper.includes("TIMESTAMP");
        const isBool = typeUpper.includes("BOOL") || typeUpper === "TINYINT(1)";

        const rawText =
          td.textContent === "null" || td.textContent === "+ New"
            ? ""
            : td.textContent;

        let inputEl;
        if (isEnum) {
          const enumMatch = colSchema.type.match(/enum\((.*?)\)/i);
          let options = [];
          if (enumMatch) {
            options = enumMatch[1]
              .split(",")
              .map((s) => s.trim().replace(/^'|'$/g, ""));
          }
          inputEl = document.createElement("select");
          options.forEach((opt) => {
            const op = document.createElement("option");
            op.value = opt;
            op.textContent = opt;
            if (opt === rawText) op.selected = true;
            inputEl.appendChild(op);
          });
        } else if (isDate) {
          inputEl = document.createElement("input");
          inputEl.type = "date";
          inputEl.value = rawText;
        } else if (isDateTime) {
          inputEl = document.createElement("input");
          inputEl.type = "datetime-local";
          const formatted = rawText.replace(" ", "T").slice(0, 16);
          inputEl.value = formatted;
        } else if (isBool) {
          inputEl = document.createElement("input");
          inputEl.type = "checkbox";
          inputEl.checked = rawText === "1" || rawText.toLowerCase() === "true";
        } else {
          inputEl = document.createElement("input");
          inputEl.type = "text";
          inputEl.value = rawText;
        }

        let isModalOpen = false;

        const openModal = () => {
           isModalOpen = true;
           const overlay = document.getElementById("modal-editor-overlay");
           const textarea = document.getElementById("modal-textarea");
           const cancelBtn = document.getElementById("modal-cancel-btn");
           const saveBtn = document.getElementById("modal-save-btn");
           const title = document.getElementById("modal-title");
           
           title.textContent = `Edit ${colName}`;
           textarea.value = inputEl.value;
           overlay.style.display = "flex";
           textarea.focus();
           
           const closeModal = () => {
              overlay.style.display = "none";
              saveBtn.onclick = null;
              cancelBtn.onclick = null;
              isModalOpen = false;
              inputEl.focus();
           };
           
           cancelBtn.onclick = closeModal;
           saveBtn.onclick = () => {
              inputEl.value = textarea.value;
              closeModal();
              commitEdit();
           };
        };

        td.innerHTML = "";
        td.appendChild(inputEl);
        if (typeUpper === "" || (!isEnum && !isDate && !isDateTime && !isBool)) {
           const expandBtn = document.createElement("span");
           expandBtn.className = "material-symbols-outlined cell-expand-btn";
           expandBtn.textContent = "open_in_full";
           expandBtn.onmousedown = (e) => e.preventDefault();
           expandBtn.onclick = () => openModal();
           td.appendChild(expandBtn);
           
           inputEl.style.width = "100%";
           inputEl.style.paddingRight = "32px";
           
           inputEl.addEventListener("keydown", (e2) => {
              if (e2.key === "Enter" && e2.shiftKey) {
                  e2.preventDefault();
                  openModal();
              } else if (e2.key === "Enter") {
                  inputEl.blur();
              }
           });
        } else {
           inputEl.addEventListener("keydown", (e2) => {
             if (e2.key === "Enter") inputEl.blur();
           });
        }

        inputEl.focus();

        const commitEdit = () => {
          if (isModalOpen) return;
          let newVal = isBool ? (inputEl.checked ? "1" : "0") : inputEl.value;
          if (isDateTime && newVal) newVal = newVal.replace("T", " ") + ":00";

          window.DataGrid.currentTransaction = [];
          window.DataGrid.updateCell(td, newVal);
          if (window.DataGrid.currentTransaction.length > 0)
            window.DataGrid.history.push(window.DataGrid.currentTransaction);
          window.DataGrid.currentTransaction = null;
        };

        inputEl.addEventListener("blur", () => {
           setTimeout(() => {
              if (!isModalOpen) commitEdit();
           }, 100);
        });
      });

      const runBtn = document.getElementById("btn-run-query");
      const clearBtn = document.getElementById("btn-clear-query");
      const inputElSearch = document.getElementById("filter-val");
      const colEl = document.getElementById("filter-col");
      const opEl = document.getElementById("filter-op");

      const executeSearch = (resetOffset = true) => {
        if (resetOffset && window.DataGrid)
          window.DataGrid.pagination.offset = 0;

        const val = inputElSearch.value.trim();
        if (!val && opEl.value !== "IS NULL") return;
        let safeVal = val;
        if (
          !safeVal.startsWith("'") &&
          !safeVal.endsWith("'") &&
          isNaN(Number(safeVal))
        ) {
          safeVal = `'${safeVal.replace(/'/g, "''")}'`;
        }
        const query = `"${colEl.value}" ${opEl.value} ${safeVal}`;
        loadTableData(tableName, btnElement, query, true);
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
