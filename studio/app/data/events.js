import { updateCell } from "./core.js";

export function bindCellEditor(tableContainer, schema, columns) {
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
      updateCell(td, newVal, columns);
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
}
