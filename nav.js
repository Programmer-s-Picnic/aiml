(function () {
  "use strict";

  const DEFAULT_MENU_FILE = "menu.json";
  const NAV_MOUNT_ID = "pp-json-nav";
  const SEARCH_ID = "pp-nav-search";
  const RESULT_ID = "pp-nav-results";

  function safeText(value) {
    return String(value || "").replace(/[&<>"']/g, function (ch) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[ch];
    });
  }

  function normalize(value) {
    return String(value || "").toLowerCase().trim();
  }

  function isPlaceholderLink(href) {
    return !href || String(href).includes("YOUR_") || String(href).includes("_HERE");
  }

  function flattenMenu(items, parentLabel = "") {
    const list = [];
    (items || []).forEach((item) => {
      list.push({
        label: item.label,
        href: item.href,
        icon: item.icon,
        parent: parentLabel
      });
      if (Array.isArray(item.children)) {
        list.push(...flattenMenu(item.children, item.label));
      }
    });
    return list;
  }

  function renderItem(item) {
    const hasChildren = Array.isArray(item.children) && item.children.length;
    const href = item.href || "#";
    const placeholder = isPlaceholderLink(href);

    return `
      <div class="pp-nav-item ${hasChildren ? "has-children" : ""}">
        <a class="pp-nav-link ${placeholder ? "pp-placeholder-link" : ""}" href="${safeText(href)}">
          <span>${safeText(item.icon || "•")}</span>
          <span>${safeText(item.label)}</span>
          ${hasChildren ? '<b class="pp-caret">⌄</b>' : ""}
        </a>
        ${
          hasChildren
            ? `<div class="pp-submenu">
                ${item.children.map((child) => {
                  const childHref = child.href || "#";
                  const childPlaceholder = isPlaceholderLink(childHref);
                  return `
                    <a class="pp-submenu-link ${childPlaceholder ? "pp-placeholder-link" : ""}" href="${safeText(childHref)}">
                      <span class="pp-sub-icon">${safeText(child.icon || "•")}</span>
                      <span>${safeText(child.label)}</span>
                    </a>
                  `;
                }).join("")}
              </div>`
            : ""
        }
      </div>
    `;
  }

  function buildNav(menu) {
    const brand = menu.brand || {};
    const items = Array.isArray(menu.items) ? menu.items : [];

    return `
      <div class="pp-nav-shell">
        <div class="pp-nav-inner">
          <a class="pp-nav-brand" href="#top" aria-label="Go to top">
            <span class="pp-nav-badge">${safeText(brand.badge || "AI")}</span>
            <span class="pp-nav-brand-text">
              <strong>${safeText(brand.title || "AI-ML Classes")}</strong>
              <small>${safeText(brand.subtitle || "Learn With Champak")}</small>
            </span>
          </a>

          <button class="pp-nav-toggle" type="button" aria-label="Open menu" aria-expanded="false">
            ☰ Menu
          </button>

          <div class="pp-nav-search-wrap">
            <input id="${SEARCH_ID}" class="pp-nav-search" type="search" placeholder="Search menu..." autocomplete="off" />
            <div id="${RESULT_ID}" class="pp-nav-results" hidden></div>
          </div>

          <nav class="pp-nav-menu" aria-label="Main navigation">
            ${items.map(renderItem).join("")}
          </nav>
        </div>
      </div>
    `;
  }

  function renderSearchResults(results, query) {
    const box = document.getElementById(RESULT_ID);
    if (!box) return;

    if (!query) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }

    if (!results.length) {
      box.hidden = false;
      box.innerHTML = `<div class="pp-nav-no-result">No menu item found.</div>`;
      return;
    }

    box.hidden = false;
    box.innerHTML = results.slice(0, 10).map((item) => {
      const placeholder = isPlaceholderLink(item.href);
      return `
        <a class="pp-nav-result ${placeholder ? "pp-placeholder-link" : ""}" href="${safeText(item.href || "#")}">
          <span>${safeText(item.icon || "🔎")}</span>
          <span>
            <strong>${safeText(item.label)}</strong>
            ${item.parent ? `<small>${safeText(item.parent)}</small>` : ""}
          </span>
        </a>
      `;
    }).join("");
  }

  function attachEvents(menu) {
    const root = document.getElementById(NAV_MOUNT_ID);
    const toggle = root.querySelector(".pp-nav-toggle");
    const menuEl = root.querySelector(".pp-nav-menu");
    const search = document.getElementById(SEARCH_ID);
    const resultBox = document.getElementById(RESULT_ID);
    const flat = flattenMenu(menu.items || []);

    toggle.addEventListener("click", () => {
      const open = menuEl.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    search.addEventListener("input", () => {
      const q = normalize(search.value);
      const matches = flat.filter((item) => {
        return (
          normalize(item.label).includes(q) ||
          normalize(item.parent).includes(q) ||
          normalize(item.href).includes(q)
        );
      });
      renderSearchResults(matches, q);
    });

    document.addEventListener("click", (event) => {
      if (!root.contains(event.target)) {
        if (resultBox) resultBox.hidden = true;
        menuEl.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    root.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;

      if (link.classList.contains("pp-placeholder-link")) {
        event.preventDefault();
        showToast("This link is coming soon. Replace it in menu.json.");
        return;
      }

      if (menuEl.classList.contains("open")) {
        menuEl.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }

      if (resultBox) resultBox.hidden = true;
    });
  }

  function showToast(message) {
    let toast = document.querySelector(".pp-nav-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "pp-nav-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.__ppNavToastTimer);
    window.__ppNavToastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }

  async function init() {
    const mount = document.getElementById(NAV_MOUNT_ID);
    if (!mount) return;

    const menuFile = mount.getAttribute("data-menu") || DEFAULT_MENU_FILE;

    try {
      const response = await fetch(menuFile, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load menu JSON");
      const menu = await response.json();

      mount.innerHTML = buildNav(menu);
      attachEvents(menu);
    } catch (error) {
      mount.innerHTML = `
        <div class="pp-nav-error">
          Menu could not load. Please check <code>${safeText(menuFile)}</code>.
        </div>
      `;
      console.error(error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();