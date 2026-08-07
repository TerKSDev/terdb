export function openIndexModal() {
  const sg = window.SchemaGrid;
  if (!sg) return;
  
  let modal = document.getElementById("index-modal");
  if (modal) modal.remove();
  
  const existingIndexes = [...sg.indexes];
  const added = [...sg.pendingIndexEdits.added];
  const dropped = new Set(sg.pendingIndexEdits.dropped);
  
  let activeIndexes = existingIndexes.filter(i => !dropped.has(i.name)).concat(added);
  
  const schemaCols = sg.schema.map(c => c.name);
  sg.pendingInserts.forEach(row => {
    if (row.name && row.name.trim() !== "") {
      schemaCols.push(row.name.trim());
    }
  });
  
  const colOptions = schemaCols.map(c => `<option value="${c}">${c}</option>`).join("");
  
  modal = document.createElement("div");
  modal.id = "index-modal";
  modal.style.cssText = `
    position: fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5);
    display:flex; justify-content:center; align-items:center; z-index:9999;
  `;
  modal.innerHTML = `
    <div style="background:var(--color-bg-primary); width:500px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.2); overflow:hidden; display:flex; flex-direction:column;">
      <div style="padding:16px; border-bottom:1px solid var(--color-border); display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Manage Indexes</h3>
        <button id="close-idx-modal" style="background:none; border:none; color:var(--color-text-primary); cursor:pointer;"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div style="padding:16px; max-height:300px; overflow-y:auto;" id="idx-list-container">
      </div>
      <div style="padding:16px; border-top:1px solid var(--color-border); background:var(--color-bg-secondary);">
        <div style="font-weight:500; margin-bottom:8px;">Add New Index</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <input type="text" id="new-idx-name" placeholder="Index Name (Optional)" style="padding:6px; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg-primary); color:var(--color-text-primary);" />
          <select id="new-idx-cols" multiple style="padding:6px; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg-primary); color:var(--color-text-primary); height:80px;">
            ${colOptions}
          </select>
          <div style="font-size:12px; color:var(--color-text-soft);">Hold Ctrl/Cmd to select multiple columns</div>
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
            <input type="checkbox" id="new-idx-unique" /> Unique Index
          </label>
          <button id="add-idx-btn" class="primary" style="align-self:flex-end; padding:6px 16px; border-radius:4px; border:none; cursor:pointer;">Add</button>
        </div>
      </div>
      <div style="padding:16px; border-top:1px solid var(--color-border); display:flex; justify-content:flex-end; gap:8px;">
        <button id="cancel-idx-btn" class="secondary" style="padding:6px 16px; border-radius:4px; border:1px solid var(--color-border); cursor:pointer;">Cancel</button>
        <button id="save-idx-btn" class="primary" style="padding:6px 16px; border-radius:4px; border:none; cursor:pointer;">Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  const closeFn = () => modal.remove();
  document.getElementById("close-idx-modal").onclick = closeFn;
  document.getElementById("cancel-idx-btn").onclick = closeFn;
  
  const renderList = () => {
    let html = activeIndexes.map((idx, i) => `
      <div class="index-row" style="display:flex; gap:8px; align-items:center; margin-bottom:8px; padding:8px; background:var(--color-bg-primary); border:1px solid var(--color-border); border-radius:4px;">
        <div style="flex:1;"><strong>${idx.name || "-"}</strong></div>
        <div style="flex:2; font-size:12px; color:var(--color-text-secondary);">${idx.columns.join(", ")}</div>
        <div style="width:60px; font-size:12px; text-align:center;">${idx.isUnique ? "UNIQUE" : ""}</div>
        <button class="icon-btn delete-idx-btn" data-idx="${i}" style="color:var(--color-error); border:none; background:none; cursor:pointer;"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
      </div>
    `).join("");
    if (activeIndexes.length === 0) html = `<div style="padding:16px; text-align:center; color:var(--color-text-secondary);">No indexes yet.</div>`;
    document.getElementById("idx-list-container").innerHTML = html;
    
    document.querySelectorAll(".delete-idx-btn").forEach(btn => {
      btn.onclick = (e) => {
        const i = parseInt(e.currentTarget.dataset.idx, 10);
        activeIndexes.splice(i, 1);
        renderList();
      };
    });
  };
  
  renderList();
  
  document.getElementById("add-idx-btn").onclick = () => {
    const name = document.getElementById("new-idx-name").value.trim();
    const select = document.getElementById("new-idx-cols");
    const cols = Array.from(select.selectedOptions).map(o => o.value);
    const unique = document.getElementById("new-idx-unique").checked;
    
    if (cols.length === 0) {
      alert("Please select at least one column for the index.");
      return;
    }
    
    activeIndexes.push({ name, columns: cols, isUnique: unique });
    document.getElementById("new-idx-name").value = "";
    document.getElementById("new-idx-unique").checked = false;
    select.selectedIndex = -1;
    renderList();
  };
  
  document.getElementById("save-idx-btn").onclick = () => {
    const newAdded = [];
    const newDropped = new Set();
    
    existingIndexes.forEach(idx => {
      const found = activeIndexes.find(a => a.name === idx.name && JSON.stringify(a.columns) === JSON.stringify(idx.columns));
      if (!found) {
        newDropped.add(idx.name);
      }
    });
    
    activeIndexes.forEach(idx => {
      const found = existingIndexes.find(e => e.name === idx.name && JSON.stringify(e.columns) === JSON.stringify(idx.columns));
      if (!found) {
        newAdded.push(idx);
      }
    });
    
    sg.pendingIndexEdits.added = newAdded;
    sg.pendingIndexEdits.dropped = Array.from(newDropped);
    
    window.updateSidebarDirtyState?.();
    window.renderSchemaGrid();
    closeFn();
  };
}

export async function openPkFkModal(td, currentText) {
  const sg = window.SchemaGrid;
  if (!sg) return;
  
  let modal = document.getElementById("pkfk-modal");
  if (modal) modal.remove();
  
  const isNewRow = td.dataset.insertIndex !== undefined;
  
  // Parse current text
  let isPk = currentText.includes("PK");
  let isFk = currentText.includes("FK");
  let fkTable = "";
  let fkCol = "";
  
  if (isFk) {
    const fkMatch = currentText.match(/FK \((.*?)\)/);
    if (fkMatch && fkMatch[1]) {
      const parts = fkMatch[1].split(".");
      if (parts.length === 2) {
        fkTable = parts[0];
        fkCol = parts[1];
      }
    } else {
      // maybe it's in the raw "FK: table.col" format (e.g. while editing pendingInserts)
      const rawMatch = currentText.match(/FK:\s*([^\s,]+)/i);
      if (rawMatch && rawMatch[1]) {
        const parts = rawMatch[1].split(".");
        if (parts.length === 2) {
          fkTable = parts[0];
          fkCol = parts[1];
        }
      }
    }
  }

  modal = document.createElement("div");
  modal.id = "pkfk-modal";
  modal.style.cssText = `
    position: fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5);
    display:flex; justify-content:center; align-items:center; z-index:9999;
  `;
  
  modal.innerHTML = `
    <div style="background:var(--color-bg-primary); width:400px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.2); overflow:hidden; display:flex; flex-direction:column;">
      <div style="padding:16px; border-bottom:1px solid var(--color-border); display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Manage Keys</h3>
        <button id="close-pkfk-modal" style="background:none; border:none; color:var(--color-text-primary); cursor:pointer;"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div style="padding:16px; display:flex; flex-direction:column; gap:16px;">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="modal-is-pk" ${isPk ? "checked" : ""} />
          <strong>Primary Key (PK)</strong>
        </label>
        
        <div style="border-top: 1px solid var(--color-border); margin: 8px 0;"></div>
        
        <label style="display:flex; align-items:center; gap:8px; cursor:${isNewRow ? 'pointer' : 'not-allowed'}; opacity:${isNewRow ? '1' : '0.6'};">
          <input type="checkbox" id="modal-is-fk" ${isFk ? "checked" : ""} ${!isNewRow ? "disabled" : ""} />
          <strong>Foreign Key (FK)</strong>
        </label>
        
        ${!isNewRow ? `<div style="font-size:11px; color:var(--color-text-soft); margin-top:-12px; margin-left:24px;">Note: FKs can only be added when creating new columns.</div>` : ""}
        
        <div id="fk-settings-container" style="display:${isFk ? 'flex' : 'none'}; flex-direction:column; gap:8px; padding-left: 24px;">
          <div>
            <div style="font-size:12px; color:var(--color-text-secondary); margin-bottom:4px;">Target Table</div>
            <select id="modal-fk-table" style="width:100%; padding:6px; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg-primary); color:var(--color-text-primary);">
              <option value="">Loading tables...</option>
            </select>
          </div>
          <div>
            <div style="font-size:12px; color:var(--color-text-secondary); margin-bottom:4px;">Target Column</div>
            <select id="modal-fk-col" style="width:100%; padding:6px; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg-primary); color:var(--color-text-primary);" ${!fkTable ? "disabled" : ""}>
              <option value="">Select a table first</option>
            </select>
          </div>
        </div>
      </div>
      <div style="padding:16px; border-top:1px solid var(--color-border); background:var(--color-bg-secondary); display:flex; justify-content:flex-end; gap:8px;">
        <button id="cancel-pkfk-btn" class="secondary" style="padding:6px 16px; border-radius:4px; border:1px solid var(--color-border); cursor:pointer;">Cancel</button>
        <button id="save-pkfk-btn" class="primary" style="padding:6px 16px; border-radius:4px; border:none; cursor:pointer;">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  const closeFn = () => modal.remove();
  document.getElementById("close-pkfk-modal").onclick = closeFn;
  document.getElementById("cancel-pkfk-btn").onclick = closeFn;
  
  const isFkCheckbox = document.getElementById("modal-is-fk");
  const fkContainer = document.getElementById("fk-settings-container");
  const tableSelect = document.getElementById("modal-fk-table");
  const colSelect = document.getElementById("modal-fk-col");
  
  isFkCheckbox.addEventListener("change", (e) => {
    fkContainer.style.display = e.target.checked ? "flex" : "none";
  });
  
  // Load tables dynamically using fetch (avoids circular deps with api.js)
  try {
    const res = await fetch("/api/tables");
    const json = await res.json();
    if (json.success && json.data) {
      tableSelect.innerHTML = '<option value="">-- Select Table --</option>' + json.data.map(t => `<option value="${t}" ${t === fkTable ? "selected" : ""}>${t}</option>`).join("");
      
      if (fkTable) {
        loadColumnsForTable(fkTable, fkCol);
      }
    }
  } catch (err) {
    tableSelect.innerHTML = '<option value="">Error loading tables</option>';
  }
  
  async function loadColumnsForTable(tName, selectedCol = "") {
    colSelect.disabled = true;
    colSelect.innerHTML = '<option value="">Loading columns...</option>';
    try {
      const res = await fetch(`/api/tables/${tName}/schema`);
      const json = await res.json();
      if (json.success && json.data) {
        colSelect.innerHTML = '<option value="">-- Select Column --</option>' + json.data.map(c => `<option value="${c.name}" ${c.name === selectedCol ? "selected" : ""}>${c.name}</option>`).join("");
        colSelect.disabled = false;
      }
    } catch (err) {
      colSelect.innerHTML = '<option value="">Error loading columns</option>';
    }
  }
  
  tableSelect.addEventListener("change", (e) => {
    const t = e.target.value;
    if (t) {
      loadColumnsForTable(t);
    } else {
      colSelect.innerHTML = '<option value="">Select a table first</option>';
      colSelect.disabled = true;
    }
  });
  
  document.getElementById("save-pkfk-btn").onclick = () => {
    const pkChecked = document.getElementById("modal-is-pk").checked;
    const fkChecked = document.getElementById("modal-is-fk").checked;
    
    const t = tableSelect.value;
    const c = colSelect.value;
    
    if (pkChecked === isPk && fkChecked === isFk && t === fkTable && c === fkCol) {
      closeFn();
      return;
    }

    let newVal = "";
    if (pkChecked && fkChecked) {
      if (!t || !c) {
        alert("Please select both Target Table and Target Column for the Foreign Key.");
        return;
      }
      newVal = `PK, FK: ${t}.${c}`;
    } else if (pkChecked) {
      newVal = "PK";
    } else if (fkChecked) {
      if (!t || !c) {
        alert("Please select both Target Table and Target Column for the Foreign Key.");
        return;
      }
      newVal = `FK: ${t}.${c}`;
    }
    
    window.SchemaGrid.currentTransaction = [];
    const columns = ["name", "type", "isPk", "nullable", "defaultValue", "indexing"];
    import("./core.js").then(({ updateSchemaCell }) => {
      updateSchemaCell(td, newVal, columns);
      if (window.SchemaGrid.currentTransaction.length > 0)
        window.SchemaGrid.history.push(window.SchemaGrid.currentTransaction);
      window.SchemaGrid.currentTransaction = null;
    });
    
    closeFn();
  };
}
