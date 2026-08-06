import { updateSchemaCell } from "./core.js";

export function bindSchemaCellEditor(tableContainer, columns) {
  tableContainer.addEventListener("dblclick", (e) => {
    const td = e.target.closest("td.data-cell");
    if (!td || td.querySelector("input, select")) return;

    const colKey = td.dataset.colKey;
    const isNewRow = td.dataset.insertIndex !== undefined;



    const rawText =
      td.textContent === "-" || td.textContent === "+ New" || td.textContent === "No" || td.textContent === "null"
        ? ""
        : td.textContent === "Yes" ? "1" : td.textContent;

    let inputEl;
    if (colKey === "isPk") {
      inputEl = document.createElement("input");
      inputEl.type = "text";
      // Convert the display text back to a standard format for editing
      let editVal = "";
      if (td.textContent.includes("PK") && td.textContent.includes("FK")) {
         const fkMatch = td.textContent.match(/FK \((.*?)\)/);
         editVal = `PK, FK: ${fkMatch ? fkMatch[1] : ""}`;
      } else if (td.textContent.includes("PK")) {
         editVal = "PK";
      } else if (td.textContent.includes("FK")) {
         const fkMatch = td.textContent.match(/FK \((.*?)\)/);
         editVal = `FK: ${fkMatch ? fkMatch[1] : ""}`;
      }
      inputEl.value = editVal;
      inputEl.placeholder = "e.g. PK or FK: users.id";
    } else if (colKey === "nullable") {
      inputEl = document.createElement("select");
      const opts = ["No", "Yes"];
      opts.forEach((opt) => {
        const op = document.createElement("option");
        op.value = opt;
        op.textContent = opt;
        if ((opt === "Yes" && rawText === "1") || (opt === "No" && rawText === "")) op.selected = true;
        inputEl.appendChild(op);
      });
    } else {
      inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.value = rawText;
    }

    td.innerHTML = "";
    td.appendChild(inputEl);
    inputEl.style.width = "100%";

    inputEl.addEventListener("keydown", (e2) => {
      if (e2.key === "Enter") inputEl.blur();
    });

    inputEl.focus();

    const commitEdit = () => {
      let newVal = inputEl.value;
      
      window.SchemaGrid.currentTransaction = [];
      updateSchemaCell(td, newVal, columns);
      if (window.SchemaGrid.currentTransaction.length > 0)
        window.SchemaGrid.history.push(window.SchemaGrid.currentTransaction);
      window.SchemaGrid.currentTransaction = null;
    };

    inputEl.addEventListener("blur", () => {
      commitEdit();
    });
  });
}


