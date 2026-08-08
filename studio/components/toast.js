export const initToast = () => {
  window.showToast = function (message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "check_circle" : "error";
    toast.innerHTML = /* html */ `<span class="material-symbols-outlined">${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000); // 0.3s slide in + 2.4s show + 0.3s fade out
  };
};
