import { HeaderHTML } from "../components/header.js";
import { SideBarHTML } from "../components/search-bar.js";
import { TabHTML } from "../components/tab.js";
import { initSidebar } from "../components/sidebar.js";
import { loadTableData, saveDataGridEdits } from "./data/view.js";
import { loadTableSchema, saveSchemaEdits } from "./schema/view.js";
import { loadSqlConsole } from "./console/view.js";
import { fetchConfig } from "../lib/api.js";

const header = document.getElementById("header-container");
const sidebar = document.getElementById("sidebar-container");
const tab = document.getElementById("tab-container");

header.innerHTML = HeaderHTML;
sidebar.innerHTML = SideBarHTML;
tab.innerHTML = TabHTML;

window.AppState = {
  currentTable: null,
  currentTab: "data-btn",
  currentTableBtnElement: null,
  dbType: null,
};

fetchConfig().then((res) => {
  if (res && res.success && res.data) {
    window.AppState.dbType = res.data.dbType;
  }
});

window.TableStates = {};
window.ViewCache = {};

window.updateSidebarDirtyState = function () {
  const allBtns = document.querySelectorAll(".table-btn");
  allBtns.forEach((btn) => {
    const tableName = btn.dataset.table; // Assuming we add data-table to sidebar btns
    // Fallback if data-table is not present, use textContent
    const text = btn.querySelector("span").textContent;
    const tName = tableName || text.replace(/\s*\*$/, "");
    const state = window.TableStates[tName];

    let isDirty = false;
    if (state) {
      if (state.dataGrid) {
        const dg = state.dataGrid;
        if (
          Object.keys(dg.pendingEdits || {}).length > 0 ||
          (dg.pendingInserts && dg.pendingInserts.length > 1) ||
          (dg.pendingDeletes && dg.pendingDeletes.size > 0)
        ) {
          isDirty = true;
        }
      }
      if (state.schemaGrid) {
        const sg = state.schemaGrid;
        const hasIndexEdits =
          sg.pendingIndexEdits &&
          (sg.pendingIndexEdits.added.length > 0 ||
            sg.pendingIndexEdits.dropped.length > 0);
        if (
          Object.keys(sg.pendingEdits || {}).length > 0 ||
          (sg.pendingInserts && sg.pendingInserts.length > 1) ||
          (sg.pendingDeletes && sg.pendingDeletes.size > 0) ||
          hasIndexEdits
        ) {
          isDirty = true;
        }
      }
    }

    let span = btn.querySelector("span");
    let baseText = span.textContent.replace(/\s*\*$/, "");
    if (isDirty) {
      span.textContent = baseText + " *";
      span.style.fontWeight = "bold";
    } else {
      span.textContent = baseText;
      span.style.fontWeight = "normal";
    }
  });
};

window.handleSwitchTab = function (tab) {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((btn) => btn.classList.remove("isCurrentTab"));
  const currentTab = document.getElementById(tab);
  if (currentTab) currentTab.classList.add("isCurrentTab");
  window.AppState.currentTab = tab;

  if (tab === "erd-btn" || tab === "sql-btn" || tab === "status-btn") {
    // These are global tabs, clear table selection
    window.AppState.currentTable = null;
    window.AppState.currentTableBtnElement = null;
    document
      .querySelectorAll(".table-btn")
      .forEach((b) => b.classList.remove("active"));
  } else if (tab === "data-btn" || tab === "schema-btn") {
    // These tabs require a table, auto-select first one if none selected
    if (!window.AppState.currentTable) {
      const firstTableBtn = document.querySelector(".table-btn");
      if (firstTableBtn) {
        window.AppState.currentTable =
          firstTableBtn.querySelector("span").textContent;
        window.AppState.currentTableBtnElement = firstTableBtn;
        firstTableBtn.classList.add("active");
      }
    }
  }

  window.renderCurrentView();
};

window.renderEmptyState = function (container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="icon-container">
        <span class="material-symbols-outlined">database</span>
      </div>
      <h2>No Table Selected</h2>
      <p>Select a table from the sidebar to view its data, schema, or run SQL queries.</p>
    </div>
  `;
};

window.renderCurrentView = function (whereClause = "", preserveState = false) {
  const isGlobalTab = ["erd-btn", "sql-btn", "status-btn"].includes(
    window.AppState.currentTab,
  );
  const mainContent = document.getElementById("main-content");

  // Hide all view containers
  document
    .querySelectorAll(".view-container")
    .forEach((el) => (el.style.display = "none"));

  // Determine view ID
  const viewId = isGlobalTab
    ? `view-${window.AppState.currentTab}`
    : `view-${window.AppState.currentTab}-${window.AppState.currentTable}`;

  let container = document.getElementById(viewId);
  if (!container) {
    container = document.createElement("div");
    container.id = viewId;
    container.className = "view-container";
    container.style.width = "100%";
    container.style.flex = "1";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.overflow = "hidden";
    mainContent.appendChild(container);
  }

  container.style.display = "flex";

  if (!window.AppState.currentTable && !isGlobalTab) {
    window.renderEmptyState(container);
    return;
  }

  const tableName = window.AppState.currentTable;
  if (tableName && !window.TableStates[tableName]) {
    window.TableStates[tableName] = { dataGrid: null, schemaGrid: null };
  }

  if (window.AppState.currentTab === "data-btn") {
    // Restore state
    if (window.TableStates[tableName].dataGrid) {
      window.DataGrid = window.TableStates[tableName].dataGrid;
    }

    // Only fetch if it's new or not cached, unless refresh is triggered (preserveState handles sorting logic internally)
    if (!window.TableStates[tableName].dataGrid || !container.hasChildNodes()) {
      loadTableData(
        tableName,
        window.AppState.currentTableBtnElement,
        whereClause,
        preserveState,
        container,
      );
    }
  } else if (window.AppState.currentTab === "schema-btn") {
    if (window.TableStates[tableName].schemaGrid) {
      window.SchemaGrid = window.TableStates[tableName].schemaGrid;
    }
    if (
      !window.TableStates[tableName].schemaGrid ||
      !container.hasChildNodes()
    ) {
      loadTableSchema(
        tableName,
        window.AppState.currentTableBtnElement,
        container,
      );
    }
  } else if (window.AppState.currentTab === "console-btn") {
    if (!container.hasChildNodes()) {
      loadSqlConsole(
        tableName,
        window.AppState.currentTableBtnElement,
        container,
      );
    }
  } else if (window.AppState.currentTab === "erd-btn") {
    if (!container.hasChildNodes()) {
      container.innerHTML = `<div style='padding:24px; color: var(--color-text-soft);'>ERD Visualization coming soon!</div>`;
    }
  } else if (window.AppState.currentTab === "status-btn") {
    if (!container.hasChildNodes()) {
      container.innerHTML = `<div style='padding:24px; color: var(--color-text-soft);'>Database Status Dashboard coming soon!</div>`;
    }
  }

  // Highlight active sidebar btn since DOM cache might lose active styling dynamically
  document
    .querySelectorAll(".table-btn")
    .forEach((b) => b.classList.remove("active"));
  if (window.AppState.currentTableBtnElement) {
    window.AppState.currentTableBtnElement.classList.add("active");
  }
};

window.saveDataGridEdits = saveDataGridEdits;
window.saveSchemaEdits = saveSchemaEdits;

document.addEventListener("DOMContentLoaded", () => {
  initSidebar();

  // Theme Logic
  const savedTheme = localStorage.getItem("drixio-theme");
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute("data-theme", "dark");
    const themeIcon = document.getElementById("theme-icon");
    if (themeIcon) themeIcon.textContent = "light_mode";
  }

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      const newTheme = isDark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("drixio-theme", newTheme);
      document.getElementById("theme-icon").textContent = isDark
        ? "dark_mode"
        : "light_mode";
    });
  }

  // Toast System
  window.showToast = function (message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "check_circle" : "error";
    toast.innerHTML = `<span class="material-symbols-outlined">${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000); // 0.3s slide in + 2.4s show + 0.3s fade out
  };

  document.addEventListener("mouseup", () => {
    if (window.DataGrid && window.DataGrid.selection) {
      window.DataGrid.selection.isDragging = false;
    }
    if (window.SchemaGrid && window.SchemaGrid.selection) {
      window.SchemaGrid.selection.isDragging = false;
    }
  });

  document.addEventListener("contextmenu", (e) => {
    const isData = window.AppState?.currentTab === "data-btn";
    const isSchema = window.AppState?.currentTab === "schema-btn";
    if (!isData && !isSchema) return;
    if (isData && !window.DataGrid) return;
    if (isSchema && !window.SchemaGrid) return;

    const rowHeader = e.target.closest("td.row-header");
    if (!rowHeader) return;

    e.preventDefault();
    const rowIdx = parseInt(rowHeader.dataset.rowIdx);

    document.getElementById("custom-context-menu")?.remove();

    const menu = document.createElement("div");
    menu.id = "custom-context-menu";
    menu.className = "context-menu";
    menu.style.top = `${e.clientY}px`;
    menu.style.left = `${e.clientX}px`;

    menu.innerHTML = `
      <div class="context-menu-item" id="cmenu-duplicate">
         <span class="material-symbols-outlined" style="font-size:16px;">content_copy</span> Duplicate Row(s)
      </div>
      <div class="context-menu-item danger" id="cmenu-delete">
         <span class="material-symbols-outlined" style="font-size:16px;">delete</span> Delete Row(s)
      </div>
    `;

    document.body.appendChild(menu);

    const handleContextMenuAction = (actionType) => {
      let rowsToProcess = [rowIdx];
      const grid = isData ? window.DataGrid : window.SchemaGrid;
      if (grid && grid.selection && grid.selection.startRow !== -1) {
        const s = grid.selection;
        const minR = Math.min(s.startRow, s.endRow);
        const maxR = Math.max(s.startRow, s.endRow);
        if (rowIdx >= minR && rowIdx <= maxR) {
          rowsToProcess = [];
          for (let i = minR; i <= maxR; i++) rowsToProcess.push(i);
        }
      }

      if (isData) {
        import("./data/core.js").then((m) => {
          window.DataGrid.currentTransaction = [];
          if (actionType === "delete") {
            rowsToProcess.forEach((r) => m.markRowDeleted(r));
          } else if (actionType === "duplicate") {
            m.duplicateDataRows(
              rowsToProcess,
              window.DataGrid.schema.map((c) => c.name),
            );
            setTimeout(() => {
              const tableContainer = document.getElementById(
                `data-grid-container-${window.AppState.currentTable}`,
              );
              if (tableContainer)
                tableContainer.scrollTop = tableContainer.scrollHeight;
            }, 50);
          }
          if (window.DataGrid.currentTransaction.length > 0)
            window.DataGrid.history.push(window.DataGrid.currentTransaction);
          window.DataGrid.currentTransaction = null;
        });
      } else if (isSchema) {
        import("./schema/core.js").then((m) => {
          window.SchemaGrid.currentTransaction = [];
          if (actionType === "delete") {
            rowsToProcess.forEach((r) => m.markSchemaRowDeleted(r));
          } else if (actionType === "duplicate") {
            m.duplicateSchemaRows(rowsToProcess, [
              "name",
              "type",
              "isPk",
              "nullable",
              "defaultValue",
              "Index",
            ]);
            setTimeout(() => {
              const tableContainer = document.getElementById(
                `schema-grid-container-${window.AppState.currentTable}`,
              );
              if (tableContainer)
                tableContainer.scrollTop = tableContainer.scrollHeight;
            }, 50);
          }
          if (window.SchemaGrid.currentTransaction.length > 0)
            window.SchemaGrid.history.push(
              window.SchemaGrid.currentTransaction,
            );
          window.SchemaGrid.currentTransaction = null;
        });
      }
      menu.remove();
    };

    document.getElementById("cmenu-duplicate").onclick = () =>
      handleContextMenuAction("duplicate");
    document.getElementById("cmenu-delete").onclick = () =>
      handleContextMenuAction("delete");

    const closeMenu = (e2) => {
      if (!menu.contains(e2.target)) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    };
    setTimeout(() => document.addEventListener("click", closeMenu), 0);
  });

  document.addEventListener("keydown", (e) => {
    const isData = window.AppState?.currentTab === "data-btn";
    const isSchema = window.AppState?.currentTab === "schema-btn";

    if (e.key === "F5") {
      if (isData && window.DataGrid?.refreshData) {
        e.preventDefault();
        window.DataGrid.refreshData();
      } else if (isSchema && document.getElementById("btn-refresh-schema")) {
        e.preventDefault();
        document.getElementById("btn-refresh-schema").click();
      }
      return;
    }

    if (!isData && !isSchema) return;
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "SELECT" ||
      e.target.tagName === "TEXTAREA"
    )
      return;

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      const grid = isData ? window.DataGrid : window.SchemaGrid;
      if (!grid || !grid.selection) return;
      e.preventDefault();

      const s = grid.selection;
      if (s.startRow === -1) return;

      const maxCols = isData ? grid.schema.length : 5;
      const t = window.AppState?.currentTable;
      const rowElements = document.querySelectorAll(
        isData
          ? `#data-grid-table-${t} tbody tr`
          : `#schema-grid-table-${t} tbody tr`,
      );
      const maxRows = rowElements.length > 0 ? rowElements.length - 1 : 0;

      let targetRow = e.shiftKey ? s.endRow : s.startRow;
      let targetCol = e.shiftKey ? s.endCol : s.startCol;

      if (e.key === "ArrowUp") targetRow = Math.max(0, targetRow - 1);
      if (e.key === "ArrowDown") targetRow = Math.min(maxRows, targetRow + 1);
      if (e.key === "ArrowLeft") targetCol = Math.max(0, targetCol - 1);
      if (e.key === "ArrowRight")
        targetCol = Math.min(maxCols - 1, targetCol + 1);

      if (e.shiftKey) {
        s.endRow = targetRow;
        s.endCol = targetCol;
      } else {
        s.startRow = targetRow;
        s.endRow = targetRow;
        s.startCol = targetCol;
        s.endCol = targetCol;
      }

      const tableId = isData
        ? `data-grid-table-${t}`
        : `schema-grid-table-${t}`;
      import("../components/grid.js").then((m) =>
        m.renderSelection(tableId, grid),
      );

      setTimeout(() => {
        const td = document.querySelector(
          isData
            ? `#data-grid-table-${t} td.data-cell[data-row-idx="${targetRow}"][data-col-idx="${targetCol}"]`
            : `#schema-grid-table-${t} td.data-cell[data-row-idx="${targetRow}"][data-col-idx="${targetCol}"]`,
        );
        if (td) {
          const container = document.getElementById(
            isData ? "data-grid-container" : "schema-grid-container",
          );
          if (container) {
            const tdRect = td.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            if (tdRect.bottom > containerRect.bottom) {
              container.scrollTop += tdRect.bottom - containerRect.bottom + 5;
            } else if (tdRect.top < containerRect.top + 30) {
              container.scrollTop -= containerRect.top + 30 - tdRect.top;
            }

            if (tdRect.right > containerRect.right) {
              container.scrollLeft += tdRect.right - containerRect.right + 5;
            } else if (tdRect.left < containerRect.left + 50) {
              container.scrollLeft -= containerRect.left + 50 - tdRect.left;
            }
          }
        }
      }, 5);
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      if (isData) {
        import("./data/core.js").then((m) => {
          window.DataGrid.currentTransaction = [];
          document
            .querySelectorAll(
              `#data-grid-table-${window.AppState.currentTable} .cell-in-range`,
            )
            .forEach((td) =>
              m.updateCell(
                td,
                "",
                window.DataGrid.schema.map((c) => c.name),
              ),
            );
          if (window.DataGrid.currentTransaction.length > 0)
            window.DataGrid.history.push(window.DataGrid.currentTransaction);
          window.DataGrid.currentTransaction = null;
        });
      } else if (isSchema) {
        import("./schema/core.js").then((m) => {
          window.SchemaGrid.currentTransaction = [];
          const cols = ["name", "type", "isPk", "nullable", "defaultValue"];
          document
            .querySelectorAll(
              `#schema-grid-table-${window.AppState.currentTable} .cell-in-range`,
            )
            .forEach((td) => {
              if (
                td.dataset.insertIndex !== undefined ||
                td.dataset.colKey === "name"
              )
                m.updateSchemaCell(td, "", cols);
            });
          if (window.SchemaGrid.currentTransaction.length > 0)
            window.SchemaGrid.history.push(
              window.SchemaGrid.currentTransaction,
            );
          window.SchemaGrid.currentTransaction = null;
        });
      }
    }

    if (e.key.toLowerCase() === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (isData) window.saveDataGridEdits();
      if (isSchema) window.saveSchemaEdits();
    }

    if (e.key.toLowerCase() === "c" && (e.ctrlKey || e.metaKey)) {
      const grid = isData ? window.DataGrid : window.SchemaGrid;
      const s = grid.selection;
      if (s.startRow === -1) return;
      const minR = Math.min(s.startRow, s.endRow);
      const maxR = Math.max(s.startRow, s.endRow);
      const minC = Math.min(s.startCol, s.endCol);
      const maxC = Math.max(s.startCol, s.endCol);

      let tsv = "";
      for (let r = minR; r <= maxR; r++) {
        let rowArr = [];
        for (let c = minC; c <= maxC; c++) {
          const td = document.querySelector(
            isData
              ? `#data-grid-table-${window.AppState.currentTable} td.data-cell[data-row-idx="${r}"][data-col-idx="${c}"]`
              : `#schema-grid-table-${window.AppState.currentTable} td.data-cell[data-row-idx="${r}"][data-col-idx="${c}"]`,
          );
          if (td) {
            const val = td.textContent.replace(/^null$|^\+ New$/, "");
            rowArr.push(val);
          }
        }
        tsv += rowArr.join("\t") + "\n";
      }
      navigator.clipboard.writeText(tsv.trimEnd());

      document.querySelectorAll(".cell-in-range").forEach((td) => {
        td.style.backgroundColor = "#bfdbfe";
        setTimeout(() => (td.style.backgroundColor = ""), 150);
      });
    }

    if (e.key === "-" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const grid = isData ? window.DataGrid : window.SchemaGrid;
      const s = grid.selection;
      if (s.startRow === -1) return;
      const minR = Math.min(s.startRow, s.endRow);
      const maxR = Math.max(s.startRow, s.endRow);

      if (isData) {
        import("./data/core.js").then((m) => {
          grid.currentTransaction = [];
          for (let r = minR; r <= maxR; r++) m.markRowDeleted(r);
          if (grid.currentTransaction.length > 0)
            grid.history.push(grid.currentTransaction);
          grid.currentTransaction = null;
        });
      } else if (isSchema) {
        import("./schema/core.js").then((m) => {
          grid.currentTransaction = [];
          for (let r = minR; r <= maxR; r++) m.markSchemaRowDeleted(r);
          if (grid.currentTransaction.length > 0)
            grid.history.push(grid.currentTransaction);
          grid.currentTransaction = null;
        });
      }
    }

    if (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (isData) {
        const lastTx = window.DataGrid.history?.pop();
        if (lastTx) {
          import("./data/core.js").then((m) => {
            const cols = window.DataGrid.schema.map((c) => c.name);
            for (let i = lastTx.length - 1; i >= 0; i--) {
              const act = lastTx[i];
              if (act.type === "delete") m.unmarkRowDeleted(act.rowIdx, act.pk);
              else m.updateCell(act.td, act.oldVal, cols, false);
            }
          });
        }
      } else if (isSchema) {
        const lastTx = window.SchemaGrid.history?.pop();
        if (lastTx) {
          import("./schema/core.js").then((m) => {
            const cols = ["name", "type", "isPk", "nullable", "defaultValue"];
            for (let i = lastTx.length - 1; i >= 0; i--) {
              const act = lastTx[i];
              if (act.type === "delete")
                m.unmarkSchemaRowDeleted(act.rowIdx, act.pk);
              else m.updateSchemaCell(act.td, act.oldVal, cols, false);
            }
          });
        }
      }
    }
  });

  document.addEventListener("paste", (e) => {
    const isData = window.AppState?.currentTab === "data-btn";
    const isSchema = window.AppState?.currentTab === "schema-btn";
    if (!isData && !isSchema) return;

    const grid = isData ? window.DataGrid : window.SchemaGrid;
    if (!grid) return;

    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "SELECT" ||
      e.target.tagName === "TEXTAREA"
    )
      return;

    const s = grid.selection;
    if (s.startRow === -1) return;

    const pasteData = e.clipboardData.getData("text");
    if (!pasteData) return;
    e.preventDefault();

    const rows = pasteData.split(/\r?\n/).map((row) => row.split("\t"));
    let currentRow = Math.min(s.startRow, s.endRow);
    const startCol = Math.min(s.startCol, s.endCol);

    grid.currentTransaction = [];

    if (isData) {
      import("./data/core.js").then((m) => {
        const columns = grid.schema.map((c) => c.name);
        rows.forEach((rowArr) => {
          rowArr.forEach((cellData, cOffset) => {
            const targetCol = startCol + cOffset;
            const td = document.querySelector(
              `#data-grid-table-${window.AppState.currentTable} td.data-cell[data-row-idx="${currentRow}"][data-col-idx="${targetCol}"]`,
            );
            if (td) {
              m.updateCell(td, cellData, columns);
            }
          });
          currentRow++;
        });
        if (grid.currentTransaction.length > 0)
          grid.history.push(grid.currentTransaction);
        grid.currentTransaction = null;
      });
    } else if (isSchema) {
      import("./schema/core.js").then((m) => {
        const cols = ["name", "type", "isPk", "nullable", "defaultValue"];
        rows.forEach((rowArr) => {
          rowArr.forEach((cellData, cOffset) => {
            const targetCol = startCol + cOffset;
            const td = document.querySelector(
              `#schema-grid-table-${window.AppState.currentTable} td.data-cell[data-row-idx="${currentRow}"][data-col-idx="${targetCol}"]`,
            );
            if (
              td &&
              (td.dataset.insertIndex !== undefined ||
                td.dataset.colKey === "name")
            ) {
              m.updateSchemaCell(td, cellData, cols);
            }
          });
          currentRow++;
        });
        if (grid.currentTransaction.length > 0)
          grid.history.push(grid.currentTransaction);
        grid.currentTransaction = null;
      });
    }
  });
});
