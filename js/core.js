const STORE_KEY = 'dongwonfc_v9_2_data';
const SESSION_KEY = 'dongwonfc_v9_2_session';
const DEFAULT_SETTINGS = { monthlyFee: 20000, annualMonths: 12, specialFeePerEvent: 10000 };

function cloneDefault(){ return JSON.parse(JSON.stringify(window.DEFAULT_DATA || {members:[]})); }
function cleanNo(v){ let s=String(v??'').trim(); if(s.endsWith('.0')) s=s.slice(0,-2); return /^\d+$/.test(s)?s.padStart(3,'0'):s; }
function visibleMembers(list){
  return (list||[])
    .filter(m=>{const n=cleanNo(m.memberNo);return n&&n!=='000'&&m.name&&!String(m.role||'').includes('탈퇴');})
    .map(m=>({...m,memberNo:cleanNo(m.memberNo)}))
    .sort((a,b)=>(+a.memberNo||9999)-(+b.memberNo||9999));
}
function settingsOf(data){ return {...DEFAULT_SETTINGS,...(data.settings||{})}; }
function applicableSpecialItems(m){ return (m.specialItems||[]).filter(i=>String(i.status||'').trim()!=='본인경조사'); }
function isFeeExemptValue(v){ const t=String(v??'').replace(/\s+/g,'').toLowerCase(); return t.includes('면제')||t.includes('exempt'); }
function normalizeMember(m, settings){
  const regularExempt=Boolean(m.regularExempt);
  const regularDue=regularExempt?0:(Number(settings.monthlyFee)||0)*(Number(settings.annualMonths)||12);
  const regularPaid=regularExempt?0:Math.max(0,Number(m.regularPaid)||0);
  const items=(m.specialItems||[]).map(i=>{
    const status=String(i.status||'-').trim()||'-';
    const amount=Number(settings.specialFeePerEvent)||10000;
    const exempt=status==='본인경조사';
    const paid=status==='납부'?amount:0;
    const remain=(status==='납부'||exempt)?0:amount;
    return {...i,amount,status,paid,remain};
  });
  const specialDue=items.filter(i=>i.status!=='본인경조사').reduce((a,i)=>a+i.amount,0);
  const specialPaid=items.reduce((a,i)=>a+i.paid,0);
  return {...m,
    regularExempt,
    regularDue,
    regularPaid,
    regularRemain:Math.max(0,regularDue-regularPaid),
    specialItems:items,
    specialDue,
    specialPaid,
    specialRemain:Math.max(0,specialDue-specialPaid)
  };
}
function normalizeData(data){
  data=data||{members:[]}; data.settings=settingsOf(data);
  data.members=visibleMembers(data.members).map(m=>normalizeMember(m,data.settings));
  return data;
}
function loadData(){
  let data;
  try{const saved=localStorage.getItem(STORE_KEY);data=saved?JSON.parse(saved):cloneDefault();}
  catch(e){data=cloneDefault();}
  return normalizeData(data);
}
function saveData(data){ data=normalizeData(data); localStorage.setItem(STORE_KEY,JSON.stringify(data)); return data; }
function getSession(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||localStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
function setSession(sess,keep){const raw=JSON.stringify(sess);sessionStorage.setItem(SESSION_KEY,raw);if(keep)localStorage.setItem(SESSION_KEY,raw);else localStorage.removeItem(SESSION_KEY)}
function clearSession(){sessionStorage.removeItem(SESSION_KEY);localStorage.removeItem(SESSION_KEY)}
function requireAdmin(){const s=getSession();if(!s||s.role!=='admin'){location.replace('./index.html');return null}return s}
function requireMember(){const s=getSession();if(!s){location.replace('./index.html');return null}if(s.role==='admin'){location.replace('./admin.html');return null}return s}
function logout(){clearSession();location.replace('./index.html')}
function pass4(phone){return String(phone||'').replace(/\D/g,'').slice(-4)}
function won(n){return (Number(n)||0).toLocaleString('ko-KR')+'원'}
function pct(p,d){d=Number(d)||0;p=Number(p)||0;return d?Math.min(100,Math.round(p/d*100)):100}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function sum(data,k){return data.members.reduce((a,m)=>a+(Number(m[k])||0),0)}
function donut(title,paid,due,color='#2563eb'){
  const remain=Math.max(0,(Number(due)||0)-(Number(paid)||0)); const p=pct(paid,due);
  return `<div class="card"><h3>${title}</h3><div class="donut" style="--p:${p};--c:${color}" data-label="${p}%\n납부"></div><div class="money-row"><span>납부금액</span><b>${won(paid)}</b></div><div class="money-row due-row"><span>내야할금액</span><b>${won(due)}</b></div><div class="money-row"><span>남은금액</span><b>${won(remain)}</b></div></div>`;
}
function progressCard(title,p){return `<div class="card"><h3>${title}</h3><div class="kpi">${p}%</div><div class="progress"><span style="width:${p}%"></span></div></div>`}
function combinedRate(m){return pct((+m.regularPaid||0)+(+m.specialPaid||0),(+m.regularDue||0)+(+m.specialDue||0))}
function memberTable(rows){
 return `<div class="table-wrap"><table><thead><tr><th>회원번호</th><th>성명</th><th>직책</th><th>회원회비 상태</th><th>회원회비 납부금액</th><th>회원회비 내야할금액</th><th>회원회비 남은금액</th><th>특별회비 납부금액</th><th>특별회비 내야할금액</th><th>특별회비 남은금액</th><th>종합 납부율</th></tr></thead><tbody>${rows.map(m=>`<tr><td><b>${m.memberNo}</b></td><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.role)}</td><td><span class="pill ${m.regularExempt?'info':'ok'}">${m.regularExempt?'회비면제':'납부대상'}</span></td><td>${won(m.regularPaid)}</td><td><b>${m.regularExempt?'면제':won(m.regularDue)}</b></td><td>${won(m.regularRemain)}</td><td>${won(m.specialPaid)}</td><td><b>${won(m.specialDue)}</b></td><td>${won(m.specialRemain)}</td><td><span class="pill ${combinedRate(m)>=80?'ok':'warn'}">${combinedRate(m)}%</span></td></tr>`).join('')}</tbody></table></div>`;
}
function feeTable(rows){
 return `<div class="table-wrap"><table><thead><tr><th>회원번호</th><th>성명</th><th>상태</th><th>납부금액</th><th>내야할금액</th><th>남은금액</th><th>납부율</th></tr></thead><tbody>${rows.map(m=>`<tr><td><b>${m.memberNo}</b></td><td>${escapeHtml(m.name)}</td><td><span class="pill ${m.regularExempt?'info':'ok'}">${m.regularExempt?'회비면제':'납부대상'}</span></td><td>${won(m.regularPaid)}</td><td><b>${m.regularExempt?'면제':won(m.regularDue)}</b></td><td>${won(m.regularRemain)}</td><td><span class="pill ${pct(m.regularPaid,m.regularDue)>=80?'ok':'warn'}">${pct(m.regularPaid,m.regularDue)}%</span></td></tr>`).join('')}</tbody></table></div>`;
}
function specialTable(rows){
 const events=[...new Set(rows.flatMap(m=>(m.specialItems||[]).map(i=>i.event)))];
 return `<div class="table-wrap"><table><thead><tr><th>회원번호</th><th>성명</th><th>납부금액</th><th>내야할금액</th><th>남은금액</th><th>납부율</th>${events.map(e=>`<th>${escapeHtml(e)}</th>`).join('')}</tr></thead><tbody>${rows.map(m=>`<tr><td><b>${m.memberNo}</b></td><td>${escapeHtml(m.name)}</td><td>${won(m.specialPaid)}</td><td><b>${won(m.specialDue)}</b></td><td>${won(m.specialRemain)}</td><td><span class="pill ${pct(m.specialPaid,m.specialDue)>=80?'ok':'warn'}">${pct(m.specialPaid,m.specialDue)}%</span></td>${events.map(e=>{const it=(m.specialItems||[]).find(x=>x.event===e),st=it?it.status:'-';return `<td><span class="pill ${st==='납부'?'ok':st==='본인경조사'?'info':'bad'}">${escapeHtml(st)}</span></td>`}).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function downloadFile(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function downloadCSV(data){
 const header=['회원번호','성명','직책','연락처','회원회비상태','회원회비납부','회원회비내야할금액','회원회비남은금액','특별회비납부','특별회비내야할금액','특별회비남은금액'];
 const lines=[header.join(',')].concat(data.members.map(m=>[m.memberNo,m.name,m.role,m.phone,m.regularExempt?'회비면제':'납부대상',m.regularPaid,m.regularDue,m.regularRemain,m.specialPaid,m.specialDue,m.specialRemain].map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',')));
 downloadFile('dongwonfc_members_v9_2.csv','\ufeff'+lines.join('\n'),'text/csv');
}
function readText(file){return new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsText(file)})}
function sheetRows(wb,nameLike){const name=wb.SheetNames.find(n=>n.includes(nameLike))||wb.SheetNames[0];return XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:null})}
function parseWorkbook(file,handler,data,done){
 if(!window.XLSX){alert('엑셀 분석 라이브러리를 불러오지 못했습니다. 인터넷 연결 후 다시 시도하세요.');return}
 const reader=new FileReader();reader.onload=e=>{try{const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true});handler(wb,data);data=saveData(data);alert('업로드 반영 완료. 새 회비 기준으로 자동 계산했습니다.');done&&done()}catch(err){console.error(err);alert('파일 분석 중 오류가 발생했습니다. 파일 형식을 확인하세요.')}};reader.readAsArrayBuffer(file)
}
function parseMembersSheet(wb,data){
 const rows=sheetRows(wb,'회원'),next=[];
 rows.forEach(r=>{const no=cleanNo(r[1]),role=String(r[3]||'').trim(),name=String(r[4]||'').trim(),phone=String(r[5]||'').trim(),jersey=String(r[6]||'').trim();if(!/^\d{3}$/.test(no)||!name||name.includes('성명')||no==='000'||role.includes('탈퇴'))return;const old=data.members.find(m=>m.name===name||cleanNo(m.memberNo)===no)||{};next.push({...old,memberNo:no,name,role,phone,jersey})});
 if(next.length)data.members=visibleMembers(next)
}
function parseFeesSheet(wb,data){
 const rows=sheetRows(wb,'2026');
 rows.forEach(r=>{
   const name=String(r[7]||'').trim(),m=data.members.find(x=>x.name===name);if(!m)return;
   const regularCell=r[8];
   if(isFeeExemptValue(regularCell)){
     m.regularExempt=true;
     m.regularPaid=0;
   }else{
     m.regularExempt=false;
     if(typeof regularCell==='number')m.regularPaid=Math.max(0,regularCell);
     else if(String(regularCell??'').replace(/,/g,'').trim()!==''&&!isNaN(Number(String(regularCell).replace(/,/g,''))))m.regularPaid=Math.max(0,Number(String(regularCell).replace(/,/g,'')));
   }
   if(typeof r[11]==='number')m.specialPaid=Math.max(0,r[11]);
 });
 data.members=visibleMembers(data.members)
}
function parseSpecialSheet(wb,data){
 const rows=sheetRows(wb,'특별'),eventNames=[];(rows[3]||[]).forEach((c,i)=>{if(i>=3&&c&&c!=='납부금액')eventNames.push(String(c))});
 rows.slice(5).forEach(r=>{const name=String(r[2]||'').trim(),m=data.members.find(x=>x.name===name);if(!m)return;m.specialItems=eventNames.map((ev,idx)=>({event:ev,status:String(r[3+idx]||'미납').trim()||'미납'}))});
 data.members=visibleMembers(data.members)
}
