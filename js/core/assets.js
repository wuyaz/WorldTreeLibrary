const resolveExtRoot = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      const url = new URL(".", import.meta.url);
      if (url.pathname.endsWith("/js/core/")) {
        url.pathname = url.pathname.replace(/\/js\/core\/$/, "/");
      } else if (url.pathname.endsWith("/js/")) {
        url.pathname = url.pathname.replace(/\/js\/$/, "/");
      }
      return url.href.replace(/\/$/, "");
    }
  } catch (err) {
    console.warn("[WTL] resolveExtRoot import.meta failed", err);
  }
  const currentSrc = document.currentScript?.src;
  if (currentSrc && currentSrc.includes("/scripts/extensions/third-party/WorldTreeLibrary/")) {
    return currentSrc.replace(/\/[^/]*$/, "");
  }
  const scripts = Array.from(document.querySelectorAll("script"));
  const hit = scripts.map((s) => s.src).find((src) => src && src.includes("/scripts/extensions/third-party/WorldTreeLibrary/"));
  if (hit) return hit.replace(/\/[^/]*$/, "");
  return "/scripts/extensions/third-party/WorldTreeLibrary";
};
const ensureWtlStyle = async (extRoot = resolveExtRoot()) => {
  const cssFiles = [
    'assets/css/wtl-global.css',
    'assets/css/wtl-table.css',
    'assets/css/wtl-chat.css'
  ];
  const parts = [];
  for (const file of cssFiles) {
    try {
      const url = `${extRoot}/${file}`;
      const res = await fetch(url);
      if (res.ok) parts.push(await res.text());
    } catch (err) {
      console.warn(`[WTL] failed to load css: ${file}`, err);
    }
  }
  if (!parts.length) return;
  const styleEl = document.getElementById("wtl-inline-style") || document.createElement("style");
  styleEl.id = "wtl-inline-style";
  styleEl.textContent = parts.join('\n');
  document.head.appendChild(styleEl);
};
const loadDefaults = async (extRoot = resolveExtRoot()) => {
  try {
    const url = `${extRoot}/assets/defaults.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("[WTL] failed to load defaults", err);
    return null;
  }
};
const loadPreset = async (name, extRoot = resolveExtRoot()) => {
  try {
    const url = `${extRoot}/assets/presets/${name}.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`[WTL] failed to load preset: ${name}`, err);
    return null;
  }
};
const loadHtml = async (fileName, extRoot = resolveExtRoot()) => {
  try {
    const safeName = String(fileName || "").replace(/^\//, "");
    const url = `${extRoot}/assets/${safeName}`;
    const res = await fetch(url);
    if (!res.ok) return "";
    return await res.text();
  } catch (err) {
    console.warn(`[WTL] failed to load html: ${fileName}`, err);
    return "";
  }
};
export {
  ensureWtlStyle,
  loadDefaults,
  loadHtml,
  loadPreset,
  resolveExtRoot
};
