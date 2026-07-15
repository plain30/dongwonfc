export const DEFAULT_SETTINGS={monthlyFee:20000,annualMonths:12,specialFeePerEvent:10000};
export function cleanNo(v){let s=String(v??'').trim();if(s.endsWith('.0'))s=s.slice(0,-2);return /^\d+$/.test(s)?s.padStart(3,'0'):s}
export function visibleMembers(list){return(list||[]).filter(m=>{const n=cleanNo(m.memberNo);return n&&n!=='000'&&m.name&&!String(m.role||'').includes('탈퇴')}).map(m=>({...m,memberNo:cleanNo(m.memberNo)})).sort((a,b)=>(+a.memberNo||9999)-(+b.memberNo||9999))}
export function isFeeExemptValue(v){const t=String(v??'').replace(/\s+/g,'').toLowerCase();return t.includes('면제')||t.includes('exempt')}
export function normalizeMember(m,settings=DEFAULT_SETTINGS){
  const regularExempt=Boolean(m.regularExempt);
  const regularDue=regularExempt?0:(+settings.monthlyFee||0)*(+settings.annualMonths||12);
  const regularPaid=regularExempt?0:Math.max(0,+m.regularPaid||0);
  const items=(m.specialItems||[]).map(i=>{
    const category=i.category==='arrears'?'arrears':'current';
    const raw=String(i.status||'-').replace(/\s+/g,'').toLowerCase();
    let status=raw.includes('본인경조사')?'본인경조사':raw.includes('납부')?'납부':raw.includes('면제')?'면제':'미납';
    if(category==='arrears'&&status==='미납')status='해당없음';
    const amount=Math.max(0,+i.amount||+settings.specialFeePerEvent||10000);
    const exempt=status==='본인경조사'||status==='면제'||status==='해당없음';
    const paid=status==='납부'?(Math.max(0,+i.paidValue||0)||amount):0;
    const due=category==='arrears'?(status==='납부'?amount:0):(exempt?0:amount);
    return{...i,category,event:String(i.event||'').trim(),date:String(i.date||'').trim(),amount,status,paid,due,remain:Math.max(0,due-paid)};
  }).filter(i=>i.event);
  let specialDue=items.reduce((a,i)=>a+(+i.due||0),0);
  let specialPaid=items.reduce((a,i)=>a+(+i.paid||0),0);
  if(m.specialSourceFormat==='matrix-v2'){
    const overrideDue=Math.max(0,+m.specialTotalOverride||0);
    const overrideRemain=Math.max(0,+m.specialRemainOverride||0);
    if(overrideDue||m.specialTotalOverride===0){
      specialDue=overrideDue;
      specialPaid=Math.max(0,overrideDue-overrideRemain);
    }
  }
  return{...m,memberNo:cleanNo(m.memberNo),regularExempt,regularDue,regularPaid,regularRemain:Math.max(0,regularDue-regularPaid),specialItems:items,specialDue,specialPaid,specialRemain:Math.max(0,specialDue-specialPaid)}
}
export function won(n){return(+n||0).toLocaleString('ko-KR')+'원'}
export function pct(p,d){d=+d||0;p=+p||0;return d?Math.min(100,Math.round(p/d*100)):100}
export function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export function combinedRate(m){return pct((+m.regularPaid||0)+(+m.specialPaid||0),(+m.regularDue||0)+(+m.specialDue||0))}
export function donut(title,paid,due,color='#2563eb'){const remain=Math.max(0,(+due||0)-(+paid||0)),p=pct(paid,due);return`<div class="card"><h3>${title}</h3><div class="donut" style="--p:${p};--c:${color}" data-label="${p}%\n납부"></div><div class="money-row"><span>납부금액</span><b>${won(paid)}</b></div><div class="money-row due-row"><span>내야할금액</span><b>${won(due)}</b></div><div class="money-row"><span>남은금액</span><b>${won(remain)}</b></div></div>`}
export function memberTable(rows){return`<div class="table-wrap"><table><thead><tr><th>회원번호</th><th>성명</th><th>직책</th><th>회원회비 상태</th><th>납부금액</th><th>내야할금액</th><th>남은금액</th><th>특별회비 납부</th><th>특별회비 내야할금액</th><th>특별회비 남은금액</th><th>종합 납부율</th></tr></thead><tbody>${rows.map(m=>`<tr><td><b>${m.memberNo}</b></td><td>${esc(m.name)}</td><td>${esc(m.role)}</td><td><span class="pill ${m.regularExempt?'info':'ok'}">${m.regularExempt?'회비면제':'납부대상'}</span></td><td>${won(m.regularPaid)}</td><td><b>${m.regularExempt?'면제':won(m.regularDue)}</b></td><td>${won(m.regularRemain)}</td><td>${won(m.specialPaid)}</td><td>${won(m.specialDue)}</td><td>${won(m.specialRemain)}</td><td><span class="pill ${combinedRate(m)>=80?'ok':'warn'}">${combinedRate(m)}%</span></td></tr>`).join('')}</tbody></table></div>`}
export function feeTable(rows){return`<div class="table-wrap"><table><thead><tr><th>회원번호</th><th>성명</th><th>상태</th><th>납부금액</th><th>내야할금액</th><th>남은금액</th><th>납부율</th></tr></thead><tbody>${rows.map(m=>`<tr><td><b>${m.memberNo}</b></td><td>${esc(m.name)}</td><td><span class="pill ${m.regularExempt?'info':'ok'}">${m.regularExempt?'회비면제':'납부대상'}</span></td><td>${won(m.regularPaid)}</td><td>${m.regularExempt?'면제':won(m.regularDue)}</td><td>${won(m.regularRemain)}</td><td>${pct(m.regularPaid,m.regularDue)}%</td></tr>`).join('')}</tbody></table></div>`}
export function specialTable(rows){
  const catalog=eventCatalog(rows);
  const matrixMode=rows.some(m=>m.specialSourceFormat==='matrix-v2');
  if(matrixMode){
    return `<div class="table-wrap special-matrix-wrap"><table class="special-matrix-table"><thead>
      <tr><th colspan="2" class="matrix-label">경조사일자</th>${catalog.map(e=>`<th>${esc(e.date||'-')}</th>`).join('')}<th></th><th></th></tr>
      <tr><th colspan="2" class="matrix-label">경조사내용</th>${catalog.map(e=>`<th><span class="event-head">${esc(e.event)}</span></th>`).join('')}<th></th><th>${won(catalog.reduce((a,e)=>a+(+e.amount||0),0))}</th></tr>
      <tr><th>성명</th><th>회원번호</th>${catalog.map(()=>'<th>납부금액</th>').join('')}<th>남은금액</th><th>특별회비 합계</th></tr>
    </thead><tbody>${rows.map(m=>`<tr><td><strong>${esc(m.name)}</strong></td><td><b>${m.memberNo}</b></td>${catalog.map(e=>{const i=(m.specialItems||[]).find(x=>eventKey(x)===e.key);if(!i)return'<td>-</td>';if(i.status==='납부')return`<td class="amount-cell">${Number(i.paidValue||i.amount||0).toLocaleString('ko-KR')}</td>`;if(i.status==='본인경조사')return'<td><span class="pill info">본인경조사</span></td>';if(i.status==='면제')return'<td><span class="pill info">면제</span></td>';return'<td>-</td>'}).join('')}<td class="amount-cell remain-cell">${Number(m.specialRemain||0).toLocaleString('ko-KR')}</td><td class="amount-cell total-cell">${Number(m.specialDue||0).toLocaleString('ko-KR')}</td></tr>`).join('')}</tbody></table></div>`
  }
  return`<div class="table-wrap"><table><thead><tr><th>회원번호</th><th>성명</th><th>납부금액</th><th>내야할금액</th><th>남은금액</th><th>납부율</th>${catalog.map(e=>`<th><span class="event-head">${esc(e.event)}</span>${e.date?`<small>${esc(e.date)}</small>`:''}<small>${won(e.amount)}</small></th>`).join('')}</tr></thead><tbody>${rows.map(m=>`<tr><td><b>${m.memberNo}</b></td><td>${esc(m.name)}</td><td>${won(m.specialPaid)}</td><td>${won(m.specialDue)}</td><td>${won(m.specialRemain)}</td><td>${pct(m.specialPaid,m.specialDue)}%</td>${catalog.map(e=>{const i=(m.specialItems||[]).find(x=>eventKey(x)===e.key),st=i?i.status:'미납';return`<td><span class="pill ${st==='납부'?'ok':(st==='본인경조사'||st==='면제')?'info':st==='해당없음'?'neutral':'bad'}">${esc(st)}</span></td>`}).join('')}</tr>`).join('')}</tbody></table></div>`
}
export function eventKey(i){return `${String(i?.category||'current')}|${String(i?.date||'')}|${String(i?.event||'')}|${Number(i?.amount)||0}`}
export function eventCatalog(rows){const map=new Map();rows.flatMap(m=>m.specialItems||[]).forEach(i=>{const key=eventKey(i);if(i.event&&!map.has(key))map.set(key,{key,event:i.event,date:i.date||'',amount:Number(i.amount)||0,category:i.category||'current'})});return [...map.values()]}
export function sheetRows(wb,nameLike){const name=wb.SheetNames.find(n=>n.includes(nameLike))||wb.SheetNames[0];return XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null})}
export function workbook(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=e=>{try{resolve(XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true}))}catch(err){reject(err)}};r.onerror=reject;r.readAsArrayBuffer(file)})}
export function parseMembersSheet(wb,old=[]){const rows=sheetRows(wb,'회원'),next=[];rows.forEach(r=>{const no=cleanNo(r[1]),role=String(r[3]||'').trim(),name=String(r[4]||'').trim(),phone=String(r[5]||'').trim(),jersey=String(r[6]||'').trim();if(!/^\d{3}$/.test(no)||!name||name.includes('성명')||no==='000'||role.includes('탈퇴'))return;const prev=old.find(m=>m.name===name||cleanNo(m.memberNo)===no)||{};next.push({...prev,memberNo:no,name,role,phone,jersey})});return visibleMembers(next)}
export function applyFeesSheet(wb,members){const rows=sheetRows(wb,'2026'),map=new Map(members.map(m=>[m.name,{...m}]));rows.forEach(r=>{const name=String(r[7]||'').trim(),m=map.get(name);if(!m)return;const c=r[8];if(isFeeExemptValue(c)){m.regularExempt=true;m.regularPaid=0}else{m.regularExempt=false;const n=Number(String(c??'').replace(/,/g,''));if(Number.isFinite(n))m.regularPaid=Math.max(0,n)}map.set(name,m)});return visibleMembers([...map.values()])}
export function applySpecialSheet(wb,members){
  const rows=sheetRows(wb,'회비');
  const compact=v=>String(v??'').replace(/\s+/g,'');

  // V14.1 신규 양식: 1행 경조사일자, 2행 경조사내용, 3행 성명/회원번호/납부금액...
  const matrixHeader=rows.findIndex(r=>compact(r?.[0])==='성명'&&compact(r?.[1])==='회원번호');
  if(matrixHeader>=0){
    const dateRow=rows[Math.max(0,matrixHeader-2)]||[];
    const contentRow=rows[Math.max(0,matrixHeader-1)]||[];
    const headerRow=rows[matrixHeader]||[];
    let remainCol=headerRow.findIndex(v=>compact(v)==='남은금액');
    let totalCol=headerRow.findIndex(v=>compact(v).includes('특별회비합계'));
    if(remainCol<0)remainCol=headerRow.length-2;
    if(totalCol<0)totalCol=headerRow.length-1;
    const events=[];
    for(let col=2;col<remainCol;col++){
      const event=String(contentRow[col]??'').trim();
      if(!event)continue;
      events.push({col,event,date:formatExcelDate(dateRow[col]),amount:DEFAULT_SETTINGS.specialFeePerEvent,category:'current'});
    }
    if(!events.length)throw new Error('특별회비 양식에서 경조사 항목을 찾지 못했습니다.');
    const byNo=new Map(members.map(m=>[cleanNo(m.memberNo),{...m}]));
    const byName=new Map(members.map(m=>[String(m.name||'').trim(),{...m}]));
    let matched=0;
    rows.slice(matrixHeader+1).forEach(r=>{
      const name=String(r?.[0]||'').trim(),no=cleanNo(r?.[1]);
      if(!name||name==='성명'||no==='000')return;
      const m=byName.get(name)||byNo.get(no);if(!m)return;
      m.specialItems=events.map(ev=>{
        const raw=r[ev.col];
        const paidValue=parseMoney(raw);
        return{event:ev.event,date:ev.date,amount:ev.amount,category:'current',status:paidValue>0?'납부':normalizeSpecialStatus(raw),paidValue:paidValue>0?paidValue:0};
      });
      m.specialSourceFormat='matrix-v2';
      m.specialRemainOverride=parseMoney(r[remainCol]);
      m.specialTotalOverride=parseMoney(r[totalCol])||events.reduce((a,e)=>a+e.amount,0);
      byNo.set(cleanNo(m.memberNo),m);byName.set(m.name,m);matched++;
    });
    if(!matched)throw new Error('특별회비 회원과 시스템 회원정보가 일치하지 않습니다. 회원정보 파일을 먼저 업로드해 주세요.');
    return visibleMembers([...byNo.values()]);
  }

  // 기존 V14.1 양식 호환
  const legacyRows=sheetRows(wb,'특별');
  const contentRow=legacyRows.findIndex(r=>compact(r?.[0]).includes('경조사내용'));
  const memberHeaderRow=legacyRows.findIndex(r=>compact(r?.[0])==='번호'&&compact(r?.[2]).includes('성명'));
  if(contentRow<0||memberHeaderRow<0)throw new Error('특별회비 파일의 양식을 인식하지 못했습니다. 성명·회원번호·경조사일자·경조사내용 항목을 확인해 주세요.');
  const groupRow=legacyRows[Math.max(0,contentRow-2)]||[],dateRow=legacyRows[Math.max(0,contentRow-1)]||[],amountRow=legacyRows[memberHeaderRow]||[],content=legacyRows[contentRow]||[];
  const events=[];let group='';
  for(let col=3;col<content.length;col++){
    if(groupRow[col])group=String(groupRow[col]).trim();
    const name=String(content[col]??'').trim();
    if(!name||compact(name).includes('납부금액'))break;
    const category=compact(group).includes('전년도')?'arrears':'current';
    events.push({col,event:name,date:formatExcelDate(dateRow[col]),amount:parseMoney(amountRow[col])||DEFAULT_SETTINGS.specialFeePerEvent,category});
  }
  if(!events.length)throw new Error('특별회비 파일에서 경조사 항목을 찾지 못했습니다.');
  const byNo=new Map(members.map(m=>[cleanNo(m.memberNo),{...m}])),byName=new Map(members.map(m=>[String(m.name||'').trim(),{...m}]));
  let matched=0;
  legacyRows.slice(memberHeaderRow+1).forEach(r=>{
    const no=cleanNo(r?.[0]),name=String(r?.[2]||'').trim(),note=String(r?.[14]||'').trim();
    if(!name||name==='성명'||note.includes('정지회원'))return;
    const m=byName.get(name)||((byNo.get(no)&&byNo.get(no).name===name)?byNo.get(no):null);if(!m)return;
    m.specialItems=events.map(ev=>({event:ev.event,date:ev.date,amount:ev.amount,category:ev.category,status:normalizeSpecialStatus(r[ev.col])}));
    delete m.specialSourceFormat;delete m.specialRemainOverride;delete m.specialTotalOverride;
    byNo.set(cleanNo(m.memberNo),m);byName.set(m.name,m);matched++;
  });
  if(!matched)throw new Error('특별회비 회원과 시스템 회원정보가 일치하지 않습니다. 회원정보 파일을 먼저 업로드해 주세요.');
  return visibleMembers([...byNo.values()]);
}
export function normalizeSpecialStatus(v){const t=String(v??'').replace(/\s+/g,'').toLowerCase();if(t.includes('본인경조사'))return'본인경조사';if(t.includes('납부'))return'납부';if(t.includes('면제')||t.includes('exempt'))return'면제';return'미납'}
export function parseMoney(v){if(typeof v==='number'&&Number.isFinite(v))return v;const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}
export function formatExcelDate(v){if(!v)return'';let d;if(v instanceof Date)d=v;else if(typeof v==='number'){const epoch=new Date(Date.UTC(1899,11,30));d=new Date(epoch.getTime()+v*86400000)}else{const t=new Date(v);if(!Number.isNaN(t.getTime()))d=t}if(!d||Number.isNaN(d.getTime()))return String(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
