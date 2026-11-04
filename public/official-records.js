document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = button.getAttribute("data-copy");
    const node = target ? document.getElementById(target) : null;
    const text = node ? node.textContent : button.getAttribute("data-copy-text") || "";
    const idle = button.textContent;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Copy failed";
    }
    window.setTimeout(() => {
      button.textContent = idle;
    }, 1600);
  });
});
