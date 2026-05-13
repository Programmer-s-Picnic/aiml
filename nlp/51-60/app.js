(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function copyTextFromElement(id) {
    const element = document.getElementById(id);
    if (!element) return;

    const text = element.innerText.trim();

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => toast("Code copied."))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
      toast("Code copied.");
    } catch (error) {
      alert("Copy failed. Please select the code manually.");
    }

    textarea.remove();
  }

  function toast(message) {
    let box = $("#pp-toast");

    if (!box) {
      box = document.createElement("div");
      box.id = "pp-toast";
      box.style.position = "fixed";
      box.style.left = "50%";
      box.style.bottom = "22px";
      box.style.transform = "translateX(-50%)";
      box.style.zIndex = "9999";
      box.style.padding = "12px 16px";
      box.style.borderRadius = "999px";
      box.style.background = "#7c2d12";
      box.style.color = "#ffffff";
      box.style.fontWeight = "900";
      box.style.boxShadow = "0 14px 36px rgba(0,0,0,0.22)";
      box.style.opacity = "0";
      box.style.transition = "opacity 180ms ease, bottom 180ms ease";
      document.body.appendChild(box);
    }

    box.textContent = message;
    box.style.opacity = "1";
    box.style.bottom = "28px";

    window.clearTimeout(box._timer);
    box._timer = window.setTimeout(() => {
      box.style.opacity = "0";
      box.style.bottom = "22px";
    }, 1600);
  }

  function shareLesson() {
    const shareData = {
      title: document.title,
      text: "NLP 51% to 60% lesson: Synonyms, antonyms and meaning matching.",
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
      return;
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => toast("Page link copied."))
        .catch(() => alert(window.location.href));
      return;
    }

    alert(window.location.href);
  }

  function initAds() {
    try {
      const ads = $$(".adsbygoogle");
      if (ads.length && window.adsbygoogle) {
        ads.forEach(() => (window.adsbygoogle = window.adsbygoogle || []).push({}));
      }
    } catch (error) {
      console.warn("AdSense could not be initialized:", error);
    }
  }

  function init() {
    $$(".copy-btn").forEach((button) => {
      button.addEventListener("click", () => {
        copyTextFromElement(button.dataset.copy);
      });
    });

    const printBtn = $("#printBtn");
    if (printBtn) {
      printBtn.addEventListener("click", () => window.print());
    }

    const shareBtn = $("#shareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", shareLesson);
    }

    initAds();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
