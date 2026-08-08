import { runConsoleQuery } from "./core.js";

export const bindConsoleEvents = (editor, historyPane) => {
  // History Navigation State
  let historyIndex = -1;
  let draftQuery = "";

  const executeAndReset = () => {
    runConsoleQuery(null, editor, historyPane);
    historyIndex = -1;
    draftQuery = "";
    updateHighlight();
  };

  const runBtn = document.getElementById("run-sql-btn");
  if (runBtn) {
    runBtn.onclick = () => executeAndReset();
  }

  const highlightLayer = document.getElementById("sql-highlight-layer");
  
  const updateHighlight = () => {
    let text = editor.value;

    if (text === "") {
      if (highlightLayer) highlightLayer.innerHTML = '<span class="hl-placeholder">SELECT * FROM sqlite_master;</span>';
      return;
    }

    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    const keywords = [
      "SELECT", "FROM", "WHERE", "AND", "OR", "IN", "NOT", "NULL", "IS", "ORDER", "BY", 
      "GROUP", "ASC", "DESC", "LIMIT", "OFFSET", "JOIN", "INNER", "LEFT", "RIGHT", "ON", 
      "AS", "CREATE", "TABLE", "DROP", "ALTER", "INSERT", "INTO", "VALUES", "UPDATE", 
      "SET", "DELETE", "PRAGMA", "EXPLAIN", "QUERY", "PLAN", "WITH", "UNION", "ALL", 
      "HAVING", "LIKE", "BETWEEN", "EXISTS", "CASE", "WHEN", "THEN", "ELSE", "END", 
      "CAST", "DEFAULT", "PRIMARY", "KEY", "FOREIGN", "UNIQUE", "CHECK", "REFERENCES", 
      "AUTOINCREMENT", "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "BEGIN", "COMMIT", 
      "ROLLBACK", "INDEX", "VIEW", "TRIGGER", "REPLACE", "CROSS", "FULL", "OUTER"
    ];
    const tokenRegex = new RegExp(`('.*?'|".*?")|\\b(\\d+)\\b|\\b(${keywords.join("|")})\\b`, 'gi');
    
    text = text.replace(tokenRegex, (match, strGrp, numGrp, kwGrp) => {
      if (strGrp) return `<span class="hl-string">${strGrp}</span>`;
      if (numGrp) return `<span class="hl-number">${numGrp}</span>`;
      if (kwGrp) return `<span class="hl-keyword">${kwGrp.toUpperCase()}</span>`;
      return match;
    });

    if (text.endsWith('\\n')) {
      text += ' ';
    }
    
    if (highlightLayer) highlightLayer.innerHTML = text;
  };

  editor.addEventListener("input", updateHighlight);
  editor.addEventListener("scroll", () => {
    if (highlightLayer) {
      highlightLayer.scrollTop = editor.scrollTop;
      highlightLayer.scrollLeft = editor.scrollLeft;
    }
  });
  
  // Initial highlight
  updateHighlight();


  editor.addEventListener("keydown", (e) => {
    const history = window.AppState.queryHistory || [];

    if (e.key === "ArrowUp") {
      // Allow history nav if cursor is at the very beginning of the input
      if (editor.selectionStart === 0 && editor.selectionEnd === 0) {
        if (historyIndex < history.length - 1) {
          e.preventDefault();
          if (historyIndex === -1) {
            draftQuery = editor.value; // Save current typing before navigating
          }
          historyIndex++;
          editor.value = history[historyIndex];
          updateHighlight();
          
          // Move cursor to end of text
          setTimeout(() => {
            editor.selectionStart = editor.value.length;
            editor.selectionEnd = editor.value.length;
          }, 0);
        }
      }
    } else if (e.key === "ArrowDown") {
      // Allow history nav down if cursor is at the very end of the input
      if (editor.selectionStart === editor.value.length && editor.selectionEnd === editor.value.length) {
        if (historyIndex > -1) {
          e.preventDefault();
          historyIndex--;
          if (historyIndex === -1) {
            editor.value = draftQuery;
          } else {
            editor.value = history[historyIndex];
          }
          updateHighlight();

          // Move cursor to end of text
          setTimeout(() => {
            editor.selectionStart = editor.value.length;
            editor.selectionEnd = editor.value.length;
          }, 0);
        }
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      executeAndReset();
    } else if (e.key === "Enter" && !e.shiftKey) {
      const val = editor.value.trim();
      if (val.endsWith(";")) {
        e.preventDefault();
        executeAndReset();
      }
    }
  });
};
