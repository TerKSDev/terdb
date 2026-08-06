import { executeRawQuery } from "../../lib/api.js";

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
    if (window.showToast) window.showToast("Data saved successfully!");
  } else {
    if (window.showToast) window.showToast("Save failed: " + errorMsg, "error");
    else alert("Save failed:\n" + errorMsg);
    document.querySelectorAll(".cell-edited").forEach((td) => {
      td.classList.remove("cell-edited");
      td.classList.add("cell-error");
    });
  }
}

export function updateCell(td, newVal, columns, recordHistory = true) {
  if (recordHistory && window.DataGrid.currentTransaction) {
    let oldVal = td.textContent;
    if (oldVal === "null" || td.classList.contains("ghost-row")) oldVal = "";
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
}

export function markRowDeleted(rowIdx, recordHistory = true) {
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
}

export function unmarkRowDeleted(rowIdx, pk) {
  const tr = document
    .querySelector(`td.data-cell[data-row-idx="${rowIdx}"]`)
    ?.closest("tr");
  if (tr) tr.classList.remove("row-deleted");
  window.DataGrid.pendingDeletes.delete(pk);
}


