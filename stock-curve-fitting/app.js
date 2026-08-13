'use strict';

const $ = id => document.getElementById(id);
const state = { headers: [], rows: [], results: {}, charts: [], stop: false };
const COLORS = ['#1261a0','#d97706','#087f5b','#7c3aed','#c026d3'];

document.addEventListener('DOMContentLoaded', () => {
  $('csvFile').addEventListener('change', e => e.target.files[0] && loadFile(e.target.files[0]));
  $('addFeatureBtn').addEventListener('click', addSelectedFeature);
  $('addOutputBtn').addEventListener('click', addSelectedOutput);
  $('resultOutputSelect').addEventListener('change', () => { populateResultDegrees(); renderSelectedResult(); });
  $('resultDegreeSelect').addEventListener('change', renderSelectedResult);
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
  const parsed=parseCSV(text); state.headers=parsed.headers; state.rows=parsed.rows; state.results={};
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
  $('featureSelect').innerHTML=options; $('outputSelect').innerHTML=options; $('labelSelect').innerHTML='<option value="">Row number</option>'+options;
  const numeric=state.headers.filter(h=>state.rows.filter(r=>Number.isFinite(Number(r[h]))).length>state.rows.length*.7);
  const outputSuggestions=numeric.filter(h=>/^target|output/i.test(h));
  [...$('outputSelect').options].forEach(o=>o.selected=outputSuggestions.includes(o.value));
  const suggested=numeric.filter(h=>!outputSuggestions.includes(h)&&!/^date$|^time$|^timestamp$/i.test(h)).slice(0,5);
  [...$('featureSelect').options].forEach(o=>o.selected=suggested.includes(o.value));
  $('labelSelect').value=state.headers.find(h=>/date|time/i.test(h))||'';
  refreshAvailableFeatures();
  renderFeatureWeightRows(); renderOutputRows();
}

function selectedFeatures(){return [...$('featureSelect').selectedOptions].map(o=>o.value);}
function selectedOutputs(){return [...$('outputSelect').selectedOptions].map(o=>o.value);}
function refreshAvailableFeatures(){const outputs=new Set(selectedOutputs()),selected=new Set(selectedFeatures());const available=state.headers.filter(h=>!outputs.has(h)&&!selected.has(h)&&!/^date$|^time$|^timestamp$/i.test(h));$('availableFeatureSelect').innerHTML=available.length?available.map(h=>`<option value="${escAttr(h)}">${esc(h)}</option>`).join(''):'<option value="">No more parameters available</option>';$('addFeatureBtn').disabled=!available.length;const outputAvailable=state.headers.filter(h=>!selected.has(h)&&!outputs.has(h)&&state.rows.filter(r=>Number.isFinite(Number(r[h]))).length>state.rows.length*.7);$('availableOutputSelect').innerHTML=outputAvailable.length?outputAvailable.map(h=>`<option value="${escAttr(h)}">${esc(h)}</option>`).join(''):'<option value="">No more outputs available</option>';$('addOutputBtn').disabled=!outputAvailable.length;}
function addSelectedFeature(){const feature=$('availableFeatureSelect').value;if(!feature)return;const option=[...$('featureSelect').options].find(o=>o.value===feature);if(option)option.selected=true;renderFeatureWeightRows();refreshAvailableFeatures();}
function removeFeature(feature){const option=[...$('featureSelect').options].find(o=>o.value===feature);if(option)option.selected=false;renderFeatureWeightRows();refreshAvailableFeatures();}
function addSelectedOutput(){const output=$('availableOutputSelect').value;if(!output)return;const option=[...$('outputSelect').options].find(o=>o.value===output);if(option)option.selected=true;renderOutputRows();refreshAvailableFeatures();}
function removeOutput(output){const option=[...$('outputSelect').options].find(o=>o.value===output);if(option)option.selected=false;renderOutputRows();refreshAvailableFeatures();}
function renderOutputRows(){const outputs=selectedOutputs();$('outputsTable').innerHTML='<thead><tr><th>Output parameter</th><th>Training</th><th>Action</th></tr></thead><tbody>'+outputs.map(o=>`<tr><td><strong>${esc(o)}</strong></td><td>Separate optimized model</td><td><button type="button" class="remove-feature" data-output="${escAttr(o)}">Remove</button></td></tr>`).join('')+'</tbody>';$('outputsTable').hidden=!outputs.length;$('noOutputsMessage').hidden=!!outputs.length;document.querySelectorAll('[data-output]').forEach(b=>b.addEventListener('click',()=>removeOutput(b.dataset.output)));}
function renderFeatureWeightRows(){
  const previous=Object.fromEntries([...document.querySelectorAll('#featureWeightsTable tbody tr')].map(tr=>[tr.dataset.feature,tr.querySelector('.fixed-weight').value]));
  const features=selectedFeatures();
  $('featureWeightsTable').innerHTML='<thead><tr><th>Input parameter</th><th>One-time weight</th><th>Applied to</th><th>Action</th></tr></thead><tbody>'+features.map(f=>`<tr data-feature="${escAttr(f)}"><td><strong>${esc(f)}</strong></td><td><input class="fixed-weight" type="number" step="any" min="0" value="${escAttr(previous[f]||'1')}"></td><td>Every day</td><td><button type="button" class="remove-feature">Remove</button></td></tr>`).join('')+'</tbody>';
  $('featureWeightsTable').hidden=!features.length;$('noFeaturesMessage').hidden=!!features.length;
  [...document.querySelectorAll('#featureWeightsTable tbody tr')].forEach(tr=>tr.querySelector('.remove-feature').addEventListener('click',()=>removeFeature(tr.dataset.feature)));
}

function getConfig(){
  const features=selectedFeatures(), outputs=selectedOutputs(), label=$('labelSelect').value;
  const degrees=[...new Set($('degrees').value.split(',').map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=5))].sort((a,b)=>a-b);
  if(!features.length) throw new Error('Select at least one input column.');
  if(!outputs.length) throw new Error('Select at least one output parameter.');
  if(!degrees.length) throw new Error('Enter at least one degree from 1 to 5.');
  if(features.length>6 && Math.max(...degrees)>3) throw new Error('Use at most 6 inputs for degrees above 3 to avoid an excessive number of polynomial terms.');
  const featureWeights=features.map(feature=>{const tr=[...document.querySelectorAll('#featureWeightsTable tbody tr')].find(x=>x.dataset.feature===feature),fixed=Number(tr.querySelector('.fixed-weight').value);if(!Number.isFinite(fixed)||fixed<0)throw new Error(`Enter a non-negative one-time weight for ${feature}.`);return{feature,fixed};});
  const test=+$('testPercent').value/100, validation=+$('validationPercent').value/100;
  if(test+validation>.7) throw new Error('Validation and test data together must be 70% or less.');
  return {features,featureWeights,outputs,label,degrees,epochs:+$('epochs').value,lr:+$('learningRate').value,test,validation,shuffle:$('shuffle').checked,optimize:$('optimizeWeights').value==='learn',regularization:+$('regularization').value};
}

function cleanData(c){
  const data=state.rows.map((r,index)=>{const raw=c.features.map(f=>Number(r[f])),parameterWeights=c.featureWeights.map(fw=>fw.fixed),y=Object.fromEntries(c.outputs.map(o=>[o,Number(r[o])]));return{raw,parameterWeights,y,label:c.label?r[c.label]:String(index+1),index};}).filter(d=>d.raw.every(Number.isFinite)&&d.parameterWeights.every(v=>Number.isFinite(v)&&v>=0)&&c.outputs.every(o=>Number.isFinite(d.y[o])));
  if(data.length<3) throw new Error(`Only ${data.length} usable rows. At least 3 are needed so training, validation and test sets each contain data.`);
  if(c.shuffle) for(let i=data.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[data[i],data[j]]=[data[j],data[i]];}
  const trainEnd=Math.max(1,Math.min(data.length-2,Math.floor(data.length*(1-c.test-c.validation))));
  const validationEnd=Math.max(trainEnd+1,Math.min(data.length-1,Math.floor(data.length*(1-c.test))));
  return {all:data,train:data.slice(0,trainEnd),validation:data.slice(trainEnd,validationEnd),test:data.slice(validationEnd)};
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
    const c=getConfig(), data=cleanData(c); state.stop=false; state.results={}; $('trainBtn').disabled=true; $('stopBtn').disabled=false; $('resultsPanel').hidden=true; $('predictPanel').hidden=true;
    const total=c.outputs.length*c.degrees.length; let completed=0;
    for(const output of c.outputs){
      const models=[];
      for(const degree of c.degrees){
        if(state.stop)break; $('trainStatus').textContent=`Training ${output}, degree ${degree} (${completed+1}/${total})…`;
        models.push(await fitDegree(c,data,output,degree,completed,total)); completed++;
      }
      if(models.length) state.results[output]={models,best:[...models].sort((a,b)=>a.validation.rmse-b.validation.rmse)[0],data,c};
      if(state.stop)break;
    }
    if(!Object.keys(state.results).length) throw new Error('Training stopped before a model completed.');
    $('resultOutputSelect').innerHTML=Object.keys(state.results).map(o=>`<option value="${escAttr(o)}">${esc(o)}</option>`).join('');populateResultDegrees();renderSelectedResult();renderPredictionForm(c);
    $('trainStatus').textContent=state.stop?'Stopped; showing completed models.':'Training complete.'; $('progressBar').style.width='100%';
  }catch(e){showError(e);}finally{$('trainBtn').disabled=false;$('stopBtn').disabled=true;}
}

async function fitDegree(c,data,output,degree,modelIndex,totalModels){
  const terms=exponentVectors(c.features.length,degree); if(terms.length>500)throw new Error(`Degree ${degree} creates ${terms.length} terms. Reduce the degree or number of inputs.`);
  const inputScale=meanStd(data.train.map(d=>d.raw));
  const xs=data.train.map(d=>normalize(d.raw,inputScale));
  const yMean=data.train.reduce((s,d)=>s+d.y[output],0)/data.train.length, yStd=Math.sqrt(data.train.reduce((s,d)=>s+(d.y[output]-yMean)**2,0)/data.train.length)||1;
  const ys=data.train.map(d=>(d.y[output]-yMean)/yStd), xT=tf.tensor2d(xs), yT=tf.tensor1d(ys);
  const W=tf.variable(tf.randomNormal([terms.length,1],0,.02)), b=tf.variable(tf.scalar(0)), opt=tf.train.adam(c.lr), losses=[];
  const starts=c.featureWeights.map((fw,i)=>{const vals=data.train.map(d=>d.parameterWeights[i]).filter(v=>v>0);return vals.length?vals.reduce((a,v)=>a+v,0)/vals.length:1;});
  const avg=starts.reduce((a,v)=>a+v,0)/starts.length||1, logits=tf.variable(tf.tensor1d(starts.map(v=>Math.log(Math.max(v/avg,1e-6)))));
  const fixedGates=tf.tensor1d(starts.map(v=>v/avg));
  const featureTensor=(input,gates)=>{const gated=input.mul(gates);return tf.concat(terms.map(p=>p.reduce((col,e,j)=>e?col.mul(gated.slice([0,j],[-1,1]).pow(e)):col,tf.ones([input.shape[0],1]))),1);};
  const variables=c.optimize?[W,b,logits]:[W,b];
  for(let epoch=0;epoch<c.epochs;epoch++){
    if(state.stop)break;
    const loss=opt.minimize(()=>tf.tidy(()=>{const gates=c.optimize?tf.softmax(logits).mul(c.features.length):fixedGates;const pred=featureTensor(xT,gates).matMul(W).add(b).reshape([-1]);const mse=pred.sub(yT).square().mean();return mse.add(W.square().mean().mul(c.regularization));}),true,variables);
    if(epoch%5===0||epoch===c.epochs-1){losses.push({epoch:epoch+1,loss:(await loss.data())[0]});await tf.nextFrame();}
    loss.dispose(); $('progressBar').style.width=`${100*(modelIndex+(epoch+1)/c.epochs)/totalModels}%`;
  }
  const weights=Array.from(await W.data()),bias=(await b.data())[0];
  const gates=c.optimize?Array.from(await tf.softmax(logits).mul(c.features.length).data()):Array.from(await fixedGates.data());
  tf.dispose([xT,yT,W,b,logits,fixedGates]);
  const model={output,degree,terms,inputScale,yMean,yStd,weights,bias,gates,losses,config:c}; model.predict=raw=>{const gated=normalize(raw,inputScale).map((v,i)=>v*gates[i]);const z=expand(gated,terms);return z.reduce((s,v,j)=>s+v*weights[j],bias)*yStd+yMean;};
  model.train=metrics(data.train.map(d=>d.y[output]),data.train.map(d=>model.predict(d.raw)));model.validation=metrics(data.validation.map(d=>d.y[output]),data.validation.map(d=>model.predict(d.raw)));model.test=metrics(data.test.map(d=>d.y[output]),data.test.map(d=>model.predict(d.raw)));return model;
}

function metrics(actual,pred){const n=actual.length,mse=actual.reduce((s,y,i)=>s+(y-pred[i])**2,0)/n,mae=actual.reduce((s,y,i)=>s+Math.abs(y-pred[i]),0)/n,avg=actual.reduce((a,b)=>a+b,0)/n,sst=actual.reduce((s,y)=>s+(y-avg)**2,0);return{rmse:Math.sqrt(mse),mae,r2:sst?1-actual.reduce((s,y,i)=>s+(y-pred[i])**2,0)/sst:0};}
function populateResultDegrees(){const result=state.results[$('resultOutputSelect').value], select=$('resultDegreeSelect');if(!result||!select)return;const previous=select.value;select.innerHTML='<option value="auto">Automatic best degree</option>'+result.models.map(m=>`<option value="${m.degree}">Degree ${m.degree}</option>`).join('');if([...select.options].some(o=>o.value===previous))select.value=previous;}
function chosenModel(result){const choice=$('resultDegreeSelect')?.value||'auto';return choice==='auto'?result.best:result.models.find(m=>String(m.degree)===choice)||result.best;}
function renderSelectedResult(){const output=$('resultOutputSelect').value,result=state.results[output];if(result)renderResults(result.c,result.data,result.models,chosenModel(result),output);}
function resultExplanationElement(){
  let element=$('plainResult');
  if(!element){
    element=document.createElement('div');
    element.id='plainResult';
    element.className='plain-result';
    const summary=$('bestSummary');
    if(summary) summary.insertAdjacentElement('afterend',element);
    else $('resultsPanel')?.prepend(element);
  }
  return element;
}
function renderResults(c,data,models,best,output){
  const automatic=$('resultDegreeSelect').value==='auto';
  $('resultsPanel').hidden=false;$('predictPanel').hidden=false;$('bestSummary').textContent=`${output}: ${automatic?'validation selected':'you selected'} degree ${best.degree} (validation RMSE ${fmt(best.validation.rmse)}). Test RMSE ${fmt(best.test.rmse)}, MAE ${fmt(best.test.mae)}, R² ${fmt(best.test.r2)}.`;
  $('metricsTable').innerHTML='<thead><tr><th>Degree</th><th>Terms</th><th>Train RMSE</th><th>Validation RMSE</th><th>Test RMSE</th><th>Test MAE</th><th>Test R²</th></tr></thead><tbody>'+models.map(m=>`<tr><td>${m.degree}${m===best?' (selected)':''}</td><td>${m.terms.length}</td><td>${fmt(m.train.rmse)}</td><td>${fmt(m.validation.rmse)}</td><td>${fmt(m.test.rmse)}</td><td>${fmt(m.test.mae)}</td><td>${fmt(m.test.r2)}</td></tr>`).join('')+'</tbody>';
  $('optimizedWeightsTable').innerHTML='<thead><tr><th>Parameter</th><th>Optimized relative weight</th><th>Share</th></tr></thead><tbody>'+c.features.map((f,i)=>`<tr><td>${esc(f)}</td><td>${fmt(best.gates[i])}</td><td>${fmt(best.gates[i]/c.features.length*100)}%</td></tr>`).join('')+'</tbody>';
  const r2=best.test.r2, quality=r2>=.8?'strong':r2>=.5?'moderate':r2>=0?'weak':'poor', top=c.features.map((f,i)=>({f,share:best.gates[i]/c.features.length*100})).sort((a,b)=>b.share-a.share)[0];
  resultExplanationElement().innerHTML=`<h3>Plain-English result</h3><p>The selected degree ${best.degree} curve has <strong>${quality} test performance</strong> (R² ${fmt(r2)}). Its predictions are typically about <strong>${fmt(best.test.rmse)}</strong> output units away. The most emphasized input is <strong>${esc(top.f)}</strong> at ${fmt(top.share)}% of the learned weight.</p><p>${r2<.5?'Treat predictions cautiously and consider more data or better inputs.':'Verify it against newer unseen data before relying on it.'}</p>`;
  state.charts.forEach(ch=>ch.destroy());state.charts=[];
  const sorted=[...data.all].sort((a,b)=>a.index-b.index),labels=sorted.map(d=>d.label),actual=sorted.map(d=>d.y[output]);
  state.charts.push(new Chart($('fitChart'),{type:'line',data:{labels,datasets:[{label:`Actual ${output}`,data:actual,borderColor:'#172536',backgroundColor:'#172536',pointRadius:2,borderWidth:2},...models.map((m,i)=>({label:`Degree ${m.degree}`,data:sorted.map(d=>m.predict(d.raw)),borderColor:COLORS[i%COLORS.length],pointRadius:0,borderWidth:2}))]},options:chartOptions('Data order')}));
  state.charts.push(new Chart($('lossChart'),{type:'line',data:{datasets:models.map((m,i)=>({label:`Degree ${m.degree}`,data:m.losses.map(v=>({x:v.epoch,y:v.loss})),borderColor:COLORS[i%COLORS.length],pointRadius:0}))},options:chartOptions('Epoch','Normalized MSE',true)}));
  const testActual=data.test.map(d=>d.y[output]),testPred=data.test.map(d=>best.predict(d.raw)),lo=Math.min(...testActual,...testPred),hi=Math.max(...testActual,...testPred);
  state.charts.push(new Chart($('scatterChart'),{type:'scatter',data:{datasets:[{label:'Test rows',data:testActual.map((x,i)=>({x,y:testPred[i]})),backgroundColor:'#1261a0'},{label:'Ideal',data:[{x:lo,y:lo},{x:hi,y:hi}],type:'line',borderColor:'#b42318',pointRadius:0}]},options:chartOptions(`Actual ${output}`,`Predicted ${output}`,true)}));
  state.last={c,data,sorted};
}
function chartOptions(xTitle,yTitle='',linear=false){return{responsive:true,maintainAspectRatio:false,interaction:{mode:'nearest',intersect:false},plugins:{legend:{position:'bottom'}},scales:{x:{type:linear?'linear':'category',title:{display:true,text:xTitle}},y:{title:{display:!!yTitle,text:yTitle}}}};}
function renderPredictionForm(c){$('predictionInputs').innerHTML=c.features.map(f=>`<div class="prediction-card"><h3>${esc(f)}</h3><label>Value<input class="prediction-value" type="number" step="any" placeholder="${escAttr(f)}"></label></div>`).join('');$('predictionOutput').textContent='';}
function predictManual(){try{const values=[...document.querySelectorAll('.prediction-value')].map(i=>Number(i.value));if(values.some(v=>!Number.isFinite(v)))throw new Error('Enter every input parameter value.');$('predictionOutput').innerHTML=Object.entries(state.results).map(([o,r])=>{const m=o===$('resultOutputSelect').value?chosenModel(r):r.best;return `${esc(o)}: <strong>${fmt(m.predict(values))}</strong> (degree ${m.degree})`;}).join('<br>');}catch(e){showError(e);}}
function downloadResults(){const {c,data}=state.last,lines=[];for(const [output,r] of Object.entries(state.results)){const m=output===$('resultOutputSelect').value?chosenModel(r):r.best;lines.push([`Output: ${output}`],[`Curve degree: ${m.degree}`],['Input','Weight'],...c.features.map((f,i)=>[f,m.gates[i]]),[],[c.label||'Row',`Actual ${output}`,'Prediction'],...data.all.map(d=>[d.label,d.y[output],m.predict(d.raw)]),[]);}const csv=lines.map(r=>r.map(csvCell).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='stock-multiple-output-training-results.csv';a.click();URL.revokeObjectURL(a.href);}
const csvCell=v=>`"${String(v).replaceAll('"','""')}"`;const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:4});const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const escAttr=esc;
function showError(e){console.error(e);alert(e.message||String(e));$('trainStatus').textContent=e.message||String(e);}
const SAMPLE_FALLBACK=['Date,CoalPrice,SteelPrice,USDINR,CrudeOil,Volume,TargetClose,TargetHigh,TargetLow',...Array.from({length:20},(_,i)=>{const close=101+i*1.7;return `2026-07-${String(i+1).padStart(2,'0')},${142+i*2},${50500+i*370},${(83.42+i*.07).toFixed(2)},${(78.1+i*.48).toFixed(1)},${150000+i*13000},${close.toFixed(1)},${(close+2.5).toFixed(1)},${(close-3.5).toFixed(1)}`;})].join('\n');
