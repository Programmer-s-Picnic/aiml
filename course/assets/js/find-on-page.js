
(function(){
  'use strict';
  const items = Array.from(document.querySelectorAll('[id^="speak"]')).filter(el => el.textContent.trim());
  if(!items.length) return;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:9999;background:#fff;border:1px solid #efdfb2;border-radius:16px;padding:10px 12px;box-shadow:0 14px 40px rgba(128,81,0,.14);font-family:Arial,sans-serif;display:flex;gap:8px;align-items:center;flex-wrap:wrap';
  const play = document.createElement('button');
  const stop = document.createElement('button');
  const next = document.createElement('button');
  [play,stop,next].forEach(btn => btn.style.cssText='padding:8px 10px;border-radius:10px;border:1px solid #efdfb2;background:#fffaf0;cursor:pointer');
  play.textContent='Speak'; stop.textContent='Stop'; next.textContent='Next';
  const status = document.createElement('span'); status.textContent = `${items.length} speak tags`;
  box.append(play, stop, next, status); document.body.appendChild(box);
  let idx = 0;
  function speakAt(i){
    if(!window.speechSynthesis || !items[i]) return;
    speechSynthesis.cancel(); idx = i; items.forEach(el => el.style.outline='');
    items[idx].style.outline = '3px solid rgba(245,158,11,.45)';
    items[idx].scrollIntoView({behavior:'smooth',block:'center'});
    const u = new SpeechSynthesisUtterance(items[idx].innerText.trim());
    u.onend = ()=>{ if(idx + 1 < items.length) speakAt(idx + 1); };
    status.textContent = `Reading ${idx+1}/${items.length}`; speechSynthesis.speak(u);
  }
  play.onclick = ()=> speakAt(idx);
  stop.onclick = ()=> { speechSynthesis.cancel(); status.textContent='Stopped'; };
  next.onclick = ()=> { idx = Math.min(items.length-1, idx+1); speakAt(idx); };
})();
