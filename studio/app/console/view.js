import { executeRawQuery } from "../../lib/api.js";

export function loadSqlConsole(tableName, btnElement) {
  const allBtns = document.querySelectorAll(".table-btn");
  allBtns.forEach((b) => b.classList.remove("active"));
  if (btnElement) btnElement.classList.add("active");

  const headerTableName = document.getElementById("table-name");
  if (headerTableName) headerTableName.textContent = "SQL Console";

  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
    <div id="console-container" style="display: flex; flex-direction: column; flex: 1; height: 100%; min-width: 0;">
      <div id="console-editor-pane" style="flex: 1; display: flex; flex-direction: column; border-bottom: 1px solid var(--color-border); position: relative; min-height: 200px;">
         <div id="sql-editor" style="flex: 1; font-size: 14px;"></div>
         <button id="run-sql-btn" class="primary" style="position: absolute; bottom: 16px; right: 24px; padding: 8px 16px; border-radius: 6px; border: none; background-color: var(--color-primary); color: #fff; font-weight: 600; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 50; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
           <span class="material-symbols-outlined" style="font-size: 18px;">play_arrow</span> Run (Ctrl+Enter)
         </button>
      </div>
      <div id="console-results-pane" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff; min-height: 200px;">
         <div id="console-results-header" style="padding: 8px 16px; background-color: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); font-size: 12px; color: var(--color-text-soft); font-weight: 600;">RESULTS</div>
         <div class="table-container" id="console-table-container" style="flex: 1;">
            <div style="padding: 24px; color: var(--color-text-soft); text-align: center; font-size: 14px;">Run a query to see results.</div>
         </div>
      </div>
    </div>
  `;

  // Initialize Ace Editor
  const editor = window.ace.edit("sql-editor");
  editor.setTheme("ace/theme/chrome");
  editor.session.setMode("ace/mode/sql");
  editor.setOptions({
    showPrintMargin: false,
    fontSize: "14px",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    highlightActiveLine: true,
  });

  if (!window.AppState.lastQuery) {
    editor.setValue(
      "-- Enter your SQL query here\nSELECT * FROM sqlite_master;\n",
      1,
    );
  } else {
    editor.setValue(window.AppState.lastQuery, 1);
  }
  editor.focus();

  const runQuery = async () => {
    const sql = editor.getValue().trim();
    if (!sql) return;
    window.AppState.lastQuery = sql;
    const resContainer = document.getElementById("console-table-container");
    const resHeader = document.getElementById("console-results-header");

    resHeader.textContent = "EXECUTING...";
    resHeader.style.color = "var(--color-primary)";
    resContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--color-text-soft);">Executing query...</div>`;

    try {
      const res = await executeRawQuery(sql);
      if (!res.success) {
        resHeader.textContent = "ERROR";
        resHeader.style.color = "red";
        resContainer.innerHTML = `<div style="padding: 24px; color: red; font-family: monospace; white-space: pre-wrap;">${res.error}</div>`;
        return;
      }

      const rows = res.data.rows || [];
      resHeader.textContent = `SUCCESS - ${rows.length} rows returned`;
      resHeader.style.color = "green";

      if (rows.length === 0) {
        resContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--color-text-soft);">0 rows returned.</div>`;
        return;
      }

      const cols = Object.keys(rows[0]);

      const table = document.createElement("table");
      table.className = "data-table";

      const thead = document.createElement("thead");
      const trHead = document.createElement("tr");
      const thNum = document.createElement("th");
      thNum.className = "row-header";
      thNum.textContent = "#";
      trHead.appendChild(thNum);

      cols.forEach((c) => {
        const th = document.createElement("th");
        th.textContent = c;

        const resizer = document.createElement("div");
        resizer.className = "resizer";
        th.appendChild(resizer);
        resizer.addEventListener("click", (e) => e.stopPropagation());
        resizer.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          let startX = e.pageX;
          let startWidth = th.offsetWidth;
          const onMouseMove = (e2) => {
            const newWidth = startWidth + (e2.pageX - startX);
            th.style.width = newWidth + "px";
            th.style.minWidth = newWidth + "px";
            th.style.maxWidth = newWidth + "px";
          };
          const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "";
          };
          document.body.style.cursor = "col-resize";
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        });

        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      rows.forEach((row, i) => {
        const tr = document.createElement("tr");
        const tdNum = document.createElement("td");
        tdNum.className = "row-header";
        tdNum.textContent = i + 1;
        tr.appendChild(tdNum);

        cols.forEach((c) => {
          const td = document.createElement("td");
          let val = row[c];
          if (val === null) {
            const nullSpan = document.createElement("span");
            nullSpan.textContent = "NULL";
            nullSpan.style.color = "var(--color-text-soft)";
            nullSpan.style.fontStyle = "italic";
            td.appendChild(nullSpan);
          } else {
            td.textContent = String(val);
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      resContainer.innerHTML = "";
      resContainer.appendChild(table);
    } catch (e) {
      resHeader.textContent = "ERROR";
      resHeader.style.color = "red";
      resContainer.innerHTML = `<div style="padding: 24px; color: red; font-family: monospace; white-space: pre-wrap;">${e.message}</div>`;
    }
  };

  document.getElementById("run-sql-btn").onclick = runQuery;

  editor.commands.addCommand({
    name: "run",
    bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" },
    exec: function () {
      runQuery();
    },
  });
}
