export const HeaderHTML = `
<header>
  <div id="current-path">
    <span id="db-name">database</span>
    <span id="slash">/</span>
    <div id="current-table">
      <span class="material-symbols-outlined" id="table-icon"> table </span>
      <span id="table-name">users</span>
    </div>
  </div>
  
  
  <div class="header-actions">
    <button id="export-btn" class="secondary" title="Export Data / DDL" style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: transparent; border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; color: var(--color-text-secondary); font-size: 13px; font-weight: 500;">
      <span class="material-symbols-outlined" style="font-size: 18px;">download</span>
      Export
    </button>
  </div>
</header>
`;
