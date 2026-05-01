
(function(){
  "use strict";

  // TOC search
  const tocSearch = document.getElementById("tocSearch");
  const tocList = document.getElementById("tocList");
  if (tocSearch && tocList){
    const links = Array.from(tocList.querySelectorAll("a"));
    tocSearch.addEventListener("input", () => {
      const q = tocSearch.value.trim().toLowerCase();
      links.forEach(a => {
        const hay = (a.getAttribute("data-text") || "") + " " + a.textContent.toLowerCase();
        a.parentElement.style.display = (!q || hay.includes(q)) ? "" : "none";
      });
    });
  }

  async function copyText(text){
    try{ await navigator.clipboard.writeText(text); return true; }
    catch(e){ return false; }
  }
  function flash(btn, msg){
    const old = btn.textContent;
    btn.textContent = msg;
    setTimeout(()=>btn.textContent = old, 850);
  }

  document.querySelectorAll("[data-copy]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const card = btn.closest(".codeCard");
      const code = card?.querySelector("pre code")?.innerText ?? "";
      const ok = await copyText(code);
      if(!ok){
        const ta = document.createElement("textarea");
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      flash(btn, "Copied ✓");
    });
  });

  function downloadFile(filename, content){
    const blob = new Blob([content], {type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  document.querySelectorAll("[data-download]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const card = btn.closest(".codeCard");
      const filename = card?.getAttribute("data-filename") || "code.py";
      const content = card?.querySelector("pre code")?.innerText ?? "";
      downloadFile(filename, content);
      flash(btn, "Downloaded ✓");
    });
  });

  // smooth anchors
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener("click", (e)=>{
      const id = a.getAttribute("href");
      if(!id || id === "#") return;
      const el = document.querySelector(id);
      if(!el) return;
      e.preventDefault();
      el.scrollIntoView({behavior:"smooth", block:"start"});
      history.replaceState(null, "", id);
    });
  });
})();
