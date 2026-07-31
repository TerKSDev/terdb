import { fetchTableSchema } from "../../../lib/api.js";

export async function loadTableSchema(tableName, btnElement) {
  const allBtns = document.querySelectorAll(".table-btn");
  allBtns.forEach((b) => b.classList.remove("active"));
  if (btnElement) btnElement.classList.add("active");

  const headerTableName = document.getElementById("table-name");
  if (headerTableName) headerTableName.textContent = tableName + " (Schema)";

  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = "<div style='padding:24px;'>Loading Schema...</div>";

  try {
    const res = await fetchTableSchema(tableName);
    if (res.success && res.data) {
      const schema = res.data;
      if (schema.length === 0) {
        mainContent.innerHTML =
          "<div style='padding:24px;'>No schema found.</div>";
        return;
      }
      let html = `<div class="table-container"><table class="data-table"><thead><tr>`;
      const cols = ["Name", "Type", "Nullable", "Primary Key"];
      cols.forEach((c) => (html += `<th>${c}</th>`));
      html += `</tr></thead><tbody>`;
      schema.forEach((col) => {
        html += `<tr>
           <td><strong>${col.name}</strong></td>
           <td><code>${col.type}</code></td>
           <td>${col.nullable ? "Yes" : "No"}</td>
           <td>${col.isPk ? "Yes" : "No"}</td>
         </tr>`;
      });
      html += `</tbody></table></div>`;
      mainContent.innerHTML = html;
    } else {
      mainContent.innerHTML = `<div style="padding:24px; color:red;">Error: ${res.error}</div>`;
    }
  } catch (err) {
    mainContent.innerHTML = `<div style="padding:24px; color:red;">Failed to load schema: ${err.message}</div>`;
  }
}
