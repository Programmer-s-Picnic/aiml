(function(){
  function depth(){var p=location.pathname.replace(/\/[^\/]*$/,'/'); var parts=p.split('/').filter(Boolean); if(parts.length && parts[0].includes('.github.io')) parts.shift(); return parts.length;}
  function root(){var d=depth(); return d? '../'.repeat(d): './';}
  window.PP_ROOT = window.PP_ROOT || root();
  function inject(target, url){var el=document.querySelector(target); if(!el) return Promise.resolve(); return fetch(window.PP_ROOT+url).then(function(r){return r.text()}).then(function(t){el.innerHTML=t; document.dispatchEvent(new CustomEvent('pp:included',{detail:{target:target}}));}).catch(function(){el.innerHTML='';});}
  document.addEventListener('DOMContentLoaded',function(){
    Promise.all([inject('[data-include="header"]','header.html'), inject('[data-include="footer"]','footer.html')]).then(function(){ if(window.PPSiteInit) window.PPSiteInit(); });
  });
})();
