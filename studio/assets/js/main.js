import headerHTML from "../components/Header.html?raw";
import sidebarHTML from "../components/SideBar.html?raw";
import tabHTML from "../components/Tab.html?raw";

import { initSidebar } from "./sidebar.js";
import { loadTableData, saveDataGridEdits } from "./views/data-view.js";
import { loadTableSchema } from "./views/schema-view.js";
import { loadSqlConsole } from "./views/console-view.js";

const header = document.getElementById("header-container");
const sidebar = document.getElementById("sidebar-container");
const tab = document.getElementById("tab-container");

header.innerHTML = headerHTML;
sidebar.innerHTML = sidebarHTML;
tab.innerHTML = tabHTML;

window.AppState = {
  currentTable: null,
  currentTab: "data-btn",
  currentTableBtnElement: null,
};

window.handleSwitchTab = function (tab) {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((btn) => btn.classList.remove("isCurrentTab"));
  const currentTab = document.getElementById(tab);
  if (currentTab) currentTab.classList.add("isCurrentTab");
  window.AppState.currentTab = tab;
  window.renderCurrentView();
};

window.renderEmptyState = function () {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
    <div class="empty-state">
      <span class="material-symbols-outlined">database</span>
      <h2>No Table Selected</h2>
      <p>Select a table from the sidebar to view its data, schema, or run SQL queries.</p>
    </div>
  `;
};

window.renderCurrentView = function (whereClause = "", preserveState = false) {
  if (!window.AppState.currentTable) {
    window.renderEmptyState();
    return;
  }

  if (window.AppState.currentTab === "data-btn") {
    loadTableData(
      window.AppState.currentTable,
      window.AppState.currentTableBtnElement,
      whereClause,
      preserveState,
    );
  } else if (window.AppState.currentTab === "schema-btn") {
    loadTableSchema(
      window.AppState.currentTable,
      window.AppState.currentTableBtnElement,
    );
  } else if (window.AppState.currentTab === "console-btn") {
    loadSqlConsole(
      window.AppState.currentTable,
      window.AppState.currentTableBtnElement,
    );
  } else if (window.AppState.currentTab === "erd-btn") {
    const mainContent = document.getElementById("main-content");
    mainContent.innerHTML = `<div style='padding:24px; color: var(--color-text-soft);'>ERD Visualization coming soon!</div>`;
  }
};

window.saveDataGridEdits = saveDataGridEdits;

document.addEventListener("DOMContentLoaded", () => {
  initSidebar();

  document.addEventListener("mouseup", () => {
    if (window.DataGrid && window.DataGrid.selection) {
      window.DataGrid.selection.isDragging = false;
    }
  });

  document.addEventListener("contextmenu", (e) => {
    if (window.AppState?.currentTab !== "data-btn" || !window.DataGrid) return;
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
      <div class="context-menu-item danger" id="cmenu-delete">
         <span class="material-symbols-outlined" style="font-size:16px;">delete</span> Delete Row
      </div>
    `;

    document.body.appendChild(menu);

    document.getElementById("cmenu-delete").onclick = () => {
      window.DataGrid.currentTransaction = [];
      window.DataGrid.markRowDeleted(rowIdx);
      if (window.DataGrid.currentTransaction.length > 0)
        window.DataGrid.history.push(window.DataGrid.currentTransaction);
      window.DataGrid.currentTransaction = null;
      menu.remove();
    };

    const closeMenu = (e2) => {
      if (!menu.contains(e2.target)) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    };
    setTimeout(() => document.addEventListener("click", closeMenu), 0);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "F5") {
      if (
        window.AppState?.currentTab === "data-btn" &&
        window.DataGrid?.refreshData
      ) {
        e.preventDefault();
        window.DataGrid.refreshData();
      }
      return;
    }

    if (window.AppState?.currentTab !== "data-btn" || !window.DataGrid) return;
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "SELECT" ||
      e.target.tagName === "TEXTAREA"
    )
      return;

    if (e.key === "Delete" || e.key === "Backspace") {
      window.DataGrid.currentTransaction = [];
      document.querySelectorAll(".cell-in-range").forEach((td) => {
        window.DataGrid.updateCell(td, "");
      });
      if (window.DataGrid.currentTransaction.length > 0)
        window.DataGrid.history.push(window.DataGrid.currentTransaction);
      window.DataGrid.currentTransaction = null;
    }

    if (e.key.toLowerCase() === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      window.saveDataGridEdits();
    }

    if (e.key.toLowerCase() === "c" && (e.ctrlKey || e.metaKey)) {
      const s = window.DataGrid.selection;
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
            `td.data-cell[data-row-idx="${r}"][data-col-idx="${c}"]`,
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
      const s = window.DataGrid.selection;
      if (s.startRow === -1) return;
      const minR = Math.min(s.startRow, s.endRow);
      const maxR = Math.max(s.startRow, s.endRow);

      window.DataGrid.currentTransaction = [];
      for (let r = minR; r <= maxR; r++) {
        window.DataGrid.markRowDeleted(r);
      }
      if (window.DataGrid.currentTransaction.length > 0)
        window.DataGrid.history.push(window.DataGrid.currentTransaction);
      window.DataGrid.currentTransaction = null;
    }

    if (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const lastTx = window.DataGrid.history?.pop();
      if (lastTx) {
        for (let i = lastTx.length - 1; i >= 0; i--) {
          const act = lastTx[i];
          if (act.type === "delete") {
            window.DataGrid.unmarkRowDeleted(act.rowIdx, act.pk);
          } else {
            window.DataGrid.updateCell(act.td, act.oldVal, false);
          }
        }
      }
    }
  });

  document.addEventListener("paste", (e) => {
    if (window.AppState?.currentTab !== "data-btn" || !window.DataGrid) return;
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "SELECT" ||
      e.target.tagName === "TEXTAREA"
    )
      return;

    const s = window.DataGrid.selection;
    if (s.startRow === -1) return;

    const pasteData = e.clipboardData.getData("text");
    if (!pasteData) return;
    e.preventDefault();

    const rows = pasteData.split(/\r?\n/).map((row) => row.split("\t"));
    let currentRow = Math.min(s.startRow, s.endRow);
    const startCol = Math.min(s.startCol, s.endCol);

    window.DataGrid.currentTransaction = [];
    rows.forEach((rowArr) => {
      rowArr.forEach((cellData, cOffset) => {
        const targetCol = startCol + cOffset;
        const td = document.querySelector(
          `td.data-cell[data-row-idx="${currentRow}"][data-col-idx="${targetCol}"]`,
        );
        if (td) {
          window.DataGrid.updateCell(td, cellData);
        }
      });
      currentRow++;
    });
    if (window.DataGrid.currentTransaction.length > 0)
      window.DataGrid.history.push(window.DataGrid.currentTransaction);
    window.DataGrid.currentTransaction = null;
  });
});
