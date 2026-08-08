export const initTheme = () => {
  const savedTheme = localStorage.getItem("drixio-theme");
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
    
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute("data-theme", "dark");
    const themeIcon = document.getElementById("theme-icon");
    if (themeIcon) themeIcon.textContent = "light_mode";
  }

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      const newTheme = isDark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("drixio-theme", newTheme);
      document.getElementById("theme-icon").textContent = isDark
        ? "dark_mode"
        : "light_mode";
    });
  }
};
