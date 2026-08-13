'use strict';

const $ = id => document.getElementById(id);
const state = { headers: [], rows: [], models: [], best: null, charts: [], stop: false };
const COLORS = ['#1261a0','#d97706','#087f5b','#7c3aed','#c026d3'];

document.addEventListener('DOMContentLoaded', () => {
  $('csvFile').addEventListener('change', e => e.target.files[0] && loadFile(e.target.files[0]));
  $('addFeatureBtn').addEventListener('click', addSelectedFeature);
  $('targetSelect').addEventListener('change', refreshAvailableFeatures);
  $('sampleBtn').addEventListener('click', loadSample);
  $('trainBtn').addEventListener('click', trainAll);
  $('stopBtn').addEventListener('click', () => { state.stop = true; $('trainStatus').textContent = 'Stopping…'; });
  $('predictBtn').addEventListener('click', predictManual);
  $('downloadBtn').addEventListener('click', downloadResults);
});

async function loadFile(file) {
  try { parseAndSet(await file.text(), file.name); } catch (e) { showError(e); }
}
async function loadSample() {
  try { parseAndSet(await (await fetch('sample-stock.csv')).text(), 'sample-stock.csv'); }
  catch { parseAndSet(SAMPLE_FALLBACK, 'built-in sample'); }
}

function parseCSV(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c==='"' && quoted && n==='"'){cell+='"';i++;}
    else if(c==='"') quoted=!quoted;
    else if(c===',' && !quoted){row.push(cell.trim());cell='';}
    else if((c==='\n'||c==='\r') && !quoted){if(c==='\r'&&n==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  row.push(cell.trim()); if(row.some(Boolean)) rows.push(row);
  if(rows.length<3) throw new Error('The CSV needs a header and at least two data rows.');
  const headers=rows[0].map((h,i)=>h||`Column ${i+1}`);
  return {headers, rows:rows.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])))};
}

function parseAndSet(text,name){
  const parsed=parseCSV(text); state.headers=parsed.headers; state.rows=parsed.rows; state.models=[]; state.best=null;
  $('fileStatus').textContent=`${name}: ${state.rows.length} rows, ${state.headers.length} columns`;
  renderPreview(); populateSelectors(); $('setupPanel').hidden=false; $('resultsPanel').hidden=true; $('predictPanel').hidden=true;
}

function renderPreview(){
  const head=`<thead><tr>${state.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead>`;
  const body=state.rows.slice(0,8).map(r=>`<tr>${state.headers.map(h=>`<td>${esc(r[h])}</td>`).join('')}</tr>`).join('');
  $('previewTable').innerHTML=head+`<tbody>${body}</tbody>`;
}
function populateSelectors(){
  const options=state.headers.map(h=>`<option value="${escAttr(h)}">${esc(h)}</option>`).join('');
  $('featureSelect').innerHTML=options; $('targetSelect').innerHTML=options; $('weightSelect').innerHTML='<option value="">Equal weights</option>'+options; $('labelSelect').innerHTML='<option value="">Row number</option>'+options;
  const numeric=state.headers.filter(h=>state.rows.filter(r=>Number.isFinite(Number(r[h]))).length>state.rows.length*.7);
  $('targetSelect').value=numeric.find(h=>/target|close/i.test(h))||numeric.at(-1)||state.headers.at(-1);
  const suggested=numeric.filter(h=>h!==$('targetSelect').value&&!/weight$/i.test(h)&&!/^date$|^time$|^timestamp$/i.test(h)).slice(0,5);
  [...$('featureSelect').options].forEach(o=>o.selected=suggested.includes(o.value));
  $('labelSelect').value=state.headers.find(h=>/date|time/i.test(h))||'';
  const w=state.headers.find(h=>/^dayweight$|^rowweight$|^observationweight$/i.test(h)); if(w)$('weightSelect').value=w;
  refreshAvailableFeatures();
  renderFeatureWeightRows();
}

function selectedFeatures(){return [...$('featureSelect').selectedOptions].map(o=>o.value);}
function refreshAvailableFeatures(){const target=$('targetSelect').value,targetOption=[...$('featureSelect').options].find(o=>o.value===target);if(targetOption?.selected){targetOption.selected=false;renderFeatureWeightRows();}const selected=new Set(selectedFeatures());const available=state.headers.filter(h=>h!==target&&!selected.has(h)&&!/weight$/i.test(h)&&!/^date$|^time$|^timestamp$/i.test(h));$('availableFeatureSelect').innerHTML=available.length?available.map(h=>`<option value="${escAttr(h)}">${esc(h)}</option>`).join(''):'<option value="">No more parameters available</option>';$('addFeatureBtn').disabled=!available.length;}
function addSelectedFeature(){const feature=$('availableFeatureSelect').value;if(!feature)return;const option=[...$('featureSelect').options].find(o=>o.value===feature);if(option)option.selected=true;renderFeatureWeightRows();refreshAvailableFeatures();}
function removeFeature(feature){const option=[...$('featureSelect').options].find(o=>o.value===feature);if(option)option.selected=false;renderFeatureWeightRows();refreshAvailableFeatures();}
function guessWeightColumn(feature){return state.headers.find(h=>h.toLowerCase()===`${feature}weight`.toLowerCase()||h.toLowerCase()===`${feature}_weight`.toLowerCase()||(feature==='USDINR'&&/^dollarweight$/i.test(h)))||'';}
function renderFeatureWeightRows(){
  const previous=Object.fromEntries([...document.querySelectorAll('#featureWeightsTable tbody tr')].map(tr=>[tr.dataset.feature,{mode:tr.querySelector('.weight-mode').value,fixed:tr.querySelector('.fixed-weight').value,column:tr.querySelector('.weight-column').value}]));
  const columns='<option value="">Choose daily weight column</option>'+state.headers.map(h=>`<option value="${escAttr(h)}">${esc(h)}</option>`).join('');
  const features=selectedFeatures();
  $('featureWeightsTable').innerHTML='<thead><tr><th>Input parameter</th><th>Weight type</th><th>Fixed weight</th><th>Daily weight column</th><th>Effective input</th><th>Action</th></tr></thead><tbody>'+features.map(f=>{const old=previous[f],guessed=guessWeightColumn(f),mode=old?.mode||(guessed?'column':'fixed'),fixed=old?.fixed||'1';return `<tr data-feature="${escAttr(f)}"><td><strong>${esc(f)}</strong></td><td><select class="weight-mode"><option value="fixed" ${mode==='fixed'?'selected':''}>Fixed</option><option value="column" ${mode==='column'?'selected':''}>Daily CSV column</option></select></td><td><input class="fixed-weight" type="number" step="any" min="0" value="${escAttr(fixed)}"></td><td><select class="weight-column">${columns}</select></td><td>${esc(f)} × weight</td><td><button type="button" class="remove-feature">Remove</button></td></tr>`;}).join('')+'</tbody>';
  $('featureWeightsTable').hidden=!features.length;$('noFeaturesMessage').hidden=!!features.length;
  [...document.querySelectorAll('#featureWeightsTable tbody tr')].forEach(tr=>{tr.querySelector('.weight-column').value=previous[tr.dataset.feature]?.column||guessWeightColumn(tr.dataset.feature);const update=()=>{const daily=tr.querySelector('.weight-mode').value==='column';tr.querySelector('.fixed-weight').disabled=daily;tr.querySelector('.weight-column').disabled=!daily;};tr.querySelector('.weight-mode').addEventListener('change',update);tr.querySelector('.remove-feature').addEventListener('click',()=>removeFeature(tr.dataset.feature));update();});
}

function getConfig(){
  const features=selectedFeatures(), target=$('targetSelect').value, weight=$('weightSelect').value, label=$('labelSelect').value;
  const degrees=[...new Set($('degrees').value.split(',').map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=5))].sort((a,b)=>a-b);
  if(!features.length) throw new Error('Select at least one input column.');
  if(features.includes(target)) throw new Error('The target cannot also be an input.');
  if(!degrees.length) throw new Error('Enter at least one degree from 1 to 5.');
  if(features.length>6 && Math.max(...degrees)>3) throw new Error('Use at most 6 inputs for degrees above 3 to avoid an excessive number of polynomial terms.');
  const featureWeights=features.map(feature=>{const tr=[...document.querySelectorAll('#featureWeightsTable tbody tr')].find(x=>x.dataset.feature===feature),mode=tr.querySelector('.weight-mode').value,fixed=Number(tr.querySelector('.fixed-weight').value),column=tr.querySelector('.weight-column').value;if(mode==='fixed'&&(!Number.isFinite(fixed)||fixed<0))throw new Error(`Enter a non-negative fixed weight for ${feature}.`);if(mode==='column'&&!column)throw new Error(`Choose a daily weight column for ${feature}.`);return{feature,mode,fixed,column};});
  return {features,featureWeights,target,weight,label,degrees,epochs:+$('epochs').value,lr:+$('learningRate').value,test:+$('testPercent').value/100,shuffle:$('shuffle').checked};
}

function cleanData(c){
  const data=state.rows.map((r,index)=>{const raw=c.features.map(f=>Number(r[f])),parameterWeights=c.featureWeights.map(fw=>fw.mode==='column'?Number(r[fw.column]):fw.fixed);return{raw,parameterWeights,x:raw.map((v,i)=>v*parameterWeights[i]),y:Number(r[c.target]),w:c.weight?Number(r[c.weight]):1,label:c.label?r[c.label]:String(index+1),index};}).filter(d=>d.raw.every(Number.isFinite)&&d.parameterWeights.every(v=>Number.isFinite(v)&&v>=0)&&Number.isFinite(d.y)&&Number.isFinite(d.w)&&d.w>0);
  if(data.length<10) throw new Error(`Only ${data.length} usable rows. At least 10 are required.`);
  if(c.shuffle) for(let i=data.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[data[i],data[j]]=[data[j],data[i]];}
  const cut=Math.max(2,Math.min(data.length-2,Math.floor(data.length*(1-c.test)))); return {all:data,train:data.slice(0,cut),test:data.slice(cut)};
}

function exponentVectors(vars,degree){
  const out=[];
  const visit=(pos,left,v)=>{if(pos===vars){const sum=v.reduce((a,b)=>a+b,0);if(sum>0&&sum<=degree)out.push([...v]);return;}for(let p=0;p<=left;p++){v[pos]=p;visit(pos+1,left-p,v);}};
  visit(0,degree,Array(vars).fill(0)); return out;
}
function expand(x,terms){return terms.map(p=>p.reduce((v,e,i)=>v*Math.pow(x[i],e),1));}
function meanStd(matrix){const n=matrix.length,m=matrix[0].length,mean=Array(m).fill(0),std=Array(m).fill(0);matrix.forEach(r=>r.forEach((v,j)=>mean[j]+=v/n));matrix.forEach(r=>r.forEach((v,j)=>std[j]+=(v-mean[j])**2/n));return {mean,std:std.map(Math.sqrt).map(s=>s||1)};}
const normalize=(r,s)=>r.map((v,j)=>(v-s.mean[j])/s.std[j]);

async function trainAll(){
  if(typeof tf==='undefined'||typeof Chart==='undefined') return showError(new Error('TensorFlow.js or Chart.js did not load. Check your internet connection and reload.'));
  try{
    const c=getConfig(), data=cleanData(c); state.stop=false; state.models=[]; state.best=null; $('trainBtn').disabled=true; $('stopBtn').disabled=false; $('resultsPanel').hidden=true; $('predictPanel').hidden=true;
    for(let i=0;i<c.degrees.length;i++){
      if(state.stop)break; const degree=c.degrees[i]; $('trainStatus').textContent=`Training degree ${degree} (${i+1}/${c.degrees.length})…`;
      const model=await fitDegree(c,data,degree,i,c.degrees.length); state.models.push(model);
    }
    if(!state.models.length) throw new Error('Training stopped before a model completed.');
    state.best=[...state.models].sort((a,b)=>a.test.rmse-b.test.rmse)[0]; renderResults(c,data); renderPredictionForm(c);
    $('trainStatus').textContent=state.stop?'Stopped; showing completed models.':'Training complete.'; $('progressBar').style.width='100%';
  }catch(e){showError(e);}finally{$('trainBtn').disabled=false;$('stopBtn').disabled=true;}
}

async function fitDegree(c,data,degree,modelIndex,totalModels){
  const terms=exponentVectors(c.features.length,degree); if(terms.length>500)throw new Error(`Degree ${degree} creates ${terms.length} terms. Reduce the degree or number of inputs.`);
  const rawTrain=data.train.map(d=>expand(d.x,terms)), scale=meanStd(rawTrain), xs=rawTrain.map(r=>normalize(r,scale));
  const yMean=data.train.reduce((s,d)=>s+d.y,0)/data.train.length, yStd=Math.sqrt(data.train.reduce((s,d)=>s+(d.y-yMean)**2,0)/data.train.length)||1;
  const ys=data.train.map(d=>(d.y-yMean)/yStd), ws=data.train.map(d=>d.w), xT=tf.tensor2d(xs), yT=tf.tensor1d(ys), wT=tf.tensor1d(ws);
  const W=tf.variable(tf.zeros([terms.length,1])), b=tf.variable(tf.scalar(0)), opt=tf.train.adam(c.lr), losses=[];
  for(let epoch=0;epoch<c.epochs;epoch++){
    if(state.stop)break;
    const loss=opt.minimize(()=>tf.tidy(()=>{const pred=xT.matMul(W).add(b).reshape([-1]);return pred.sub(yT).square().mul(wT).sum().div(wT.sum());}),true,[W,b]);
    if(epoch%5===0||epoch===c.epochs-1){losses.push({epoch:epoch+1,loss:(await loss.data())[0]});await tf.nextFrame();}
    loss.dispose(); $('progressBar').style.width=`${100*(modelIndex+(epoch+1)/c.epochs)/totalModels}%`;
  }
  const weights=Array.from(await W.data()),bias=(await b.data())[0]; tf.dispose([xT,yT,wT,W,b]);
  const model={degree,terms,scale,yMean,yStd,weights,bias,losses,config:c}; model.predict=x=>{const z=normalize(expand(x,terms),scale);return (z.reduce((s,v,j)=>s+v*weights[j],bias))*yStd+yMean;};
  model.train=metrics(data.train.map(d=>d.y),data.train.map(d=>model.predict(d.x)));model.test=metrics(data.test.map(d=>d.y),data.test.map(d=>model.predict(d.x)));return model;
}

function metrics(actual,pred){const n=actual.length,mse=actual.reduce((s,y,i)=>s+(y-pred[i])**2,0)/n,mae=actual.reduce((s,y,i)=>s+Math.abs(y-pred[i]),0)/n,avg=actual.reduce((a,b)=>a+b,0)/n,sst=actual.reduce((s,y)=>s+(y-avg)**2,0);return{rmse:Math.sqrt(mse),mae,r2:sst?1-actual.reduce((s,y,i)=>s+(y-pred[i])**2,0)/sst:0};}
function renderResults(c,data){
  $('resultsPanel').hidden=false;$('predictPanel').hidden=false;$('bestSummary').textContent=`Best test result: degree ${state.best.degree}, RMSE ${fmt(state.best.test.rmse)}, MAE ${fmt(state.best.test.mae)}, R² ${fmt(state.best.test.r2)}. It uses ${state.best.terms.length} polynomial terms.`;
  $('metricsTable').innerHTML='<thead><tr><th>Degree</th><th>Terms</th><th>Train RMSE</th><th>Test RMSE</th><th>Test MAE</th><th>Test R²</th></tr></thead><tbody>'+state.models.map(m=>`<tr><td>${m.degree}${m===state.best?' (best)':''}</td><td>${m.terms.length}</td><td>${fmt(m.train.rmse)}</td><td>${fmt(m.test.rmse)}</td><td>${fmt(m.test.mae)}</td><td>${fmt(m.test.r2)}</td></tr>`).join('')+'</tbody>';
  state.charts.forEach(ch=>ch.destroy());state.charts=[];
  const sorted=[...data.all].sort((a,b)=>a.index-b.index),labels=sorted.map(d=>d.label),actual=sorted.map(d=>d.y);
  state.charts.push(new Chart($('fitChart'),{type:'line',data:{labels,datasets:[{label:`Actual ${c.target}`,data:actual,borderColor:'#172536',backgroundColor:'#172536',pointRadius:2,borderWidth:2},...state.models.map((m,i)=>({label:`Degree ${m.degree}`,data:sorted.map(d=>m.predict(d.x)),borderColor:COLORS[i%COLORS.length],pointRadius:0,borderWidth:2}))]},options:chartOptions('Data order')}));
  state.charts.push(new Chart($('lossChart'),{type:'line',data:{datasets:state.models.map((m,i)=>({label:`Degree ${m.degree}`,data:m.losses.map(v=>({x:v.epoch,y:v.loss})),borderColor:COLORS[i%COLORS.length],pointRadius:0}))},options:chartOptions('Epoch','Weighted normalized MSE',true)}));
  const testActual=data.test.map(d=>d.y),testPred=data.test.map(d=>state.best.predict(d.x)),lo=Math.min(...testActual,...testPred),hi=Math.max(...testActual,...testPred);
  state.charts.push(new Chart($('scatterChart'),{type:'scatter',data:{datasets:[{label:'Test rows',data:testActual.map((x,i)=>({x,y:testPred[i]})),backgroundColor:'#1261a0'},{label:'Ideal',data:[{x:lo,y:lo},{x:hi,y:hi}],type:'line',borderColor:'#b42318',pointRadius:0}]},options:chartOptions(`Actual ${c.target}`,`Predicted ${c.target}`,true)}));
  state.last={c,data,sorted};
}
function chartOptions(xTitle,yTitle='',linear=false){return{responsive:true,maintainAspectRatio:false,interaction:{mode:'nearest',intersect:false},plugins:{legend:{position:'bottom'}},scales:{x:{type:linear?'linear':'category',title:{display:true,text:xTitle}},y:{title:{display:!!yTitle,text:yTitle}}}};}
function renderPredictionForm(c){$('predictionInputs').innerHTML=c.featureWeights.map((fw,i)=>`<div class="prediction-card"><h3>${esc(fw.feature)}</h3><div class="pair"><label>Value<input class="prediction-value" data-index="${i}" type="number" step="any" placeholder="${escAttr(fw.feature)}"></label><label>Importance weight<input class="prediction-weight" data-index="${i}" type="number" min="0" step="any" value="${fw.mode==='fixed'?fw.fixed:1}"></label></div></div>`).join('');$('predictionOutput').textContent='';}
function predictManual(){try{const values=[...document.querySelectorAll('.prediction-value')].map(i=>Number(i.value)),weights=[...document.querySelectorAll('.prediction-weight')].map(i=>Number(i.value));if(values.some(v=>!Number.isFinite(v))||weights.some(v=>!Number.isFinite(v)||v<0))throw new Error('Enter every parameter value and a non-negative weight.');const x=values.map((v,i)=>v*weights[i]);$('predictionOutput').textContent=`Predicted ${state.best.config.target}: ${fmt(state.best.predict(x))} (degree ${state.best.degree})`;}catch(e){showError(e);}}
function downloadResults(){const {c,sorted}=state.last,headers=[c.label||'Row',`Actual ${c.target}`,...state.models.map(m=>`Degree ${m.degree} prediction`)];const lines=[headers,...sorted.map(d=>[d.label,d.y,...state.models.map(m=>m.predict(d.x))])].map(r=>r.map(csvCell).join(','));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'}));a.download='stock-curve-fitting-results.csv';a.click();URL.revokeObjectURL(a.href);}
const csvCell=v=>`"${String(v).replaceAll('"','""')}"`;const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:4});const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const escAttr=esc;
function showError(e){console.error(e);alert(e.message||String(e));$('trainStatus').textContent=e.message||String(e);}
const SAMPLE_FALLBACK=`Date,Open,High,Low,Close,Volume,RSI,Weight\n2026-07-01,100,104,98,103,150000,55,1\n2026-07-02,103,106,101,105,165000,58,1\n2026-07-03,105,108,102,104,142000,54,1\n2026-07-04,104,109,103,108,188000,62,1\n2026-07-05,108,111,106,110,210000,66,1\n2026-07-06,110,112,107,109,176000,61,1\n2026-07-07,109,114,108,113,235000,69,1\n2026-07-08,113,116,111,115,248000,72,1\n2026-07-09,115,117,112,114,193000,65,1\n2026-07-10,114,119,113,118,270000,74,1`;
