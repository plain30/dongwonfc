const STORE_KEY = 'dongwonfc_v9_data';
const SESSION_KEY = 'dongwonfc_v9_session';

function cloneDefault(){ return JSON.parse(JSON.stringify(window.DEFAULT_DATA || {members:[]})); }
function cleanNo(v){ let s = String(v ?? '').trim(); if(s.endsWith('.0')) s=s.slice(0,-2); return /^\d+$/.test(s) ? s.padStart(3,'0') : s; }
function visibleMembers(list){
  return (list||[])
    .filter(m => { const n=cleanNo(m.memberNo); return n && n !== '000' && m.name && !String(m.role||'').includes('탈퇴'); })
    .map(m=>({...m, memberNo:cleanNo(m.memberNo)}))
    .sort((a,b)=>(+a.memberNo||9999)-(+b.memberNo||9999));
}
function loadData(){
  const saved = localStorage.getItem(STORE_KEY);
  let data = saved ? JSON.parse(saved) : cloneDefault();
  data.members = visibleMembers(data.members);
  return data;
}
function saveData(data){ data.members=visibleMembers(data.members); localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
function getSession(){ try{return JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || 'null')}catch(e){return null} }
function setSession(sess, keep){ const raw=JSON.stringify(sess); sessionStorage.setItem(SESSION_KEY, raw); if(keep) localStorage.setItem(SESSION_KEY, raw); else localStorage.removeItem(SESSION_KEY); }
function clearSession(){ sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); }
function requireAdmin(){ const s=getSession(); if(!s || s.role!=='admin'){ location.replace('./index.html'); return null; } return s; }
function requireMember(){ const s=getSession(); if(!s){ location.replace('./index.html'); return null; } if(s.role==='admin'){ location.replace('./admin.html'); return null; } return s; }
function logout(){ clearSession(); location.replace('./index.html'); }
function pass4(phone){ return String(phone||'').replace(/\D/g,'').slice(-4); }
function won(n){ return (Number(n)||0).toLocaleString('ko-KR')+'원'; }
function rate(p,r){ const t=(+p||0)+(+r||0); return t ? Math.round((+p||0)/t*100) : 100; }
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function sum(data,k){ return data.members.reduce((a,m)=>a+(Number(m[k])||0),0); }
function donut(title, paid, remain, color='#2563eb'){
  const pct=rate(paid,remain);
  return `<div class="card"><h3>${title}</h3><div class="donut" style="--p:${pct};--c:${color}" data-label="${pct}%\n납부"></div><div class="money-row"><span>납부</span><b>${won(paid)}</b></div><div class="money-row"><span>남은금액</span><b>${won(remain)}</b></div></div>`;
}
function progressCard(title, pct){ return `<div class="card"><h3>${title}</h3><div class="kpi">${pct}%</div><div class="progress"><span style="width:${pct}%"></span></div></div>`; }
function memberTable(rows){
  return `<div class="table-wrap"><table><thead><tr><th>회원번호</th><th>성명</th><th>직책</th><th>회원회비</th><th>특별회비</th><th>납부율</th></tr></thead><tbody>${rows.map(m=>`<tr><td><b>${m.memberNo}</b></td><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.role)}</td><td>${won(m.regularPaid)} / ${won(m.regularRemain)}</td><td>${won(m.specialPaid)} / ${won(m.specialRemain)}</td><td><span class="pill ${rate((+m.regularPaid||0)+(+m.specialPaid||0),(+m.regularRemain||0)+(+m.specialRemain||0))>80?'ok':'warn'}">${rate((+m.regularPaid||0)+(+m.specialPaid||0),(+m.regularRemain||0)+(+m.specialRemain||0))}%</span></td></tr>`).join('')}</tbody></table></div>`;
}
function specialTable(rows){
  const events=[...new Set(rows.flatMap(m=>(m.specialItems||[]).map(i=>i.event)))];
  return `<div class="table-wrap"><table><thead><tr><th>회원번호</th><th>성명</th><th>납부금액</th><th>남은금액</th>${events.map(e=>`<th>${escapeHtml(e)}</th>`).join('')}</tr></thead><tbody>${rows.map(m=>`<tr><td><b>${m.memberNo}</b></td><td>${escapeHtml(m.name)}</td><td>${won(m.specialPaid)}</td><td>${won(m.specialRemain)}</td>${events.map(e=>{const it=(m.specialItems||[]).find(x=>x.event===e);const st=it?it.status:'-';return `<td><span class="pill ${st==='납부'?'ok':st==='본인경조사'?'info':'bad'}">${escapeHtml(st)}</span></td>`}).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function downloadFile(name, text, type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); }
function downloadCSV(data){
 const header=['회원번호','성명','직책','연락처','회원회비납부','회원회비미납','특별회비납부','특별회비미납'];
 const lines=[header.join(',')].concat(data.members.map(m=>[m.memberNo,m.name,m.role,m.phone,m.regularPaid,m.regularRemain,m.specialPaid,m.specialRemain].map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',')));
 downloadFile('dongwonfc_members_v9.csv', '\ufeff'+lines.join('\n'), 'text/csv');
}
function readText(file){ return new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsText(file); }); }
function sheetRows(wb, nameLike){ const name=wb.SheetNames.find(n=>n.includes(nameLike)) || wb.SheetNames[0]; return XLSX.utils.sheet_to_json(wb.Sheets[name], {header:1, defval:null}); }
function parseWorkbook(file, handler, data, done){
 if(!window.XLSX){ alert('엑셀 분석 라이브러리를 불러오지 못했습니다. 인터넷 연결 후 다시 시도하세요.'); return; }
 const reader=new FileReader(); reader.onload=e=>{ const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true}); handler(wb, data); saveData(data); alert('업로드 반영 완료. 회원번호 000은 제외되었습니다.'); done&&done(); }; reader.readAsArrayBuffer(file);
}
function parseMembersSheet(wb, data){
 const rows=sheetRows(wb,'회원'); const next=[];
 rows.forEach(r=>{
   const joined=r.map(x=>String(x??'')).join('|');
   if(!/\S/.test(joined)) return;
   let no='', role='', name='', phone='', jersey='';
   // 번호부여 파일 기준: B=회원번호, D=직책, E=성명, F=전화번호, G=등번호
   no=cleanNo(r[1]); role=String(r[3]||'').trim(); name=String(r[4]||'').trim(); phone=String(r[5]||'').trim(); jersey=String(r[6]||'').trim();
   if(!/^\d{3}$/.test(no) || !name || name.includes('성명')) return;
   if(no==='000' || role.includes('탈퇴')) return;
   const old=data.members.find(m=>m.name===name || cleanNo(m.memberNo)===no) || {};
   next.push({...old, memberNo:no, name, role, phone, jersey});
 });
 if(next.length) data.members=visibleMembers(next);
}
function parseFeesSheet(wb, data){
 const rows=sheetRows(wb,'2026'); rows.forEach(r=>{
   const name=String(r[7]||'').trim(); const m=data.members.find(x=>x.name===name); if(!m) return;
   m.regularPaid=typeof r[8]==='number'?r[8]:(+m.regularPaid||0);
   m.regularRemain=[r[9],r[10]].filter(x=>typeof x==='number'&&x<0).reduce((a,x)=>a+Math.abs(x),0) || (+m.regularRemain||0);
   m.specialPaid=typeof r[11]==='number'?r[11]:(+m.specialPaid||0);
   m.specialRemain=typeof r[12]==='number'&&r[12]<0?Math.abs(r[12]):(+m.specialRemain||0);
 });
 data.members=visibleMembers(data.members);
}
function parseSpecialSheet(wb, data){
 const rows=sheetRows(wb,'특별'); const eventNames=[]; const amounts=[];
 (rows[3]||[]).forEach((c,i)=>{ if(i>=3 && c && c!=='납부금액'){ eventNames.push(String(c)); amounts.push(typeof (rows[4]||[])[i]==='number'?(rows[4]||[])[i]:10000); }});
 rows.slice(5).forEach(r=>{ const name=String(r[2]||'').trim(); const m=data.members.find(x=>x.name===name); if(!m) return; let paid=0, remain=0; m.specialItems=eventNames.map((ev,idx)=>{ const st=String(r[3+idx]||'미납').trim(); const amount=amounts[idx]; const p=st==='납부'?amount:0; const rem=(st==='납부'||st==='본인경조사')?0:amount; paid+=p; remain+=rem; return {event:ev,amount,status:st,paid:p,remain:rem}; }); m.specialPaid=paid; m.specialRemain=remain; });
 data.members=visibleMembers(data.members);
}
