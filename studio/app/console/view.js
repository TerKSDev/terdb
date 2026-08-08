import { bindConsoleEvents } from "./events.js";

export function loadSqlConsole(tableName, btnElement, container) {
  const allBtns = document.querySelectorAll(".table-btn");
  allBtns.forEach((b) => b.classList.remove("active"));
  if (btnElement) btnElement.classList.add("active");

  const headerTableName = document.getElementById("table-name");
  if (headerTableName) headerTableName.textContent = "SQL Console";

  container.innerHTML = /* html */ `
    <div class="sql-console-wrapper">
      <div id="console-history-pane">
        <div id="console-welcome-msg">
          <div id="console-welcome-title">
            <div id="icon-container">
              <span class="material-symbols-outlined" style="font-size: 36px;">database_search</span>
            </div>
            <span>Welcome to Drixio SQL Terminal.</span>
          </div>
          <span id="console-welcome-description">Type your query below and press <b>Ctrl+Enter</b> or end with <b>;</b> and press <b>Enter</b> to execute.</span>
          <span id="console-welcome-hint"><b>Hint:</b> Highlight specific lines to only run the selection.</span>
        </div>
      </div>
      <div id="console-input-pane">
         <div class="sql-editor-wrapper">
           <span class="sql-prompt">sql &gt;</span>
           <div class="sql-editor-layer-container">
             <!-- Syntax Highlight Layer (Background) -->
             <div id="sql-highlight-layer" class="sql-editor"></div>
             <!-- Real Textarea (Foreground) -->
             <textarea id="sql-editor" class="sql-editor"></textarea>
           </div>
         </div>
         <div style="display: none; justify-content: flex-end; margin-top: 8px;">
           <button id="run-sql-btn" class="primary" style="padding: 6px 16px; border-radius: 6px; border: none; background-color: var(--color-primary); color: #fff; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px; transition: opacity 0.2s;">
             <span class="material-symbols-outlined" style="font-size: 16px;">play_arrow</span> Run (Ctrl+Enter)
           </button>
         </div>
      </div>
    </div>
  `;

  const editor = document.getElementById("sql-editor");
  const historyPane = document.getElementById("console-history-pane");

  if (window.AppState.lastQuery) {
    editor.value = window.AppState.lastQuery;
  }
  editor.focus();

  bindConsoleEvents(editor, historyPane);
}
