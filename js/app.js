
const STORE_KEY = 'dongwonfc_v8_data';
const SESSION_KEY = 'dongwonfc_v8_session';
let state = { user:null, isAdmin:false, view:'dashboard', data:null };

function cloneDefault(){ return JSON.parse(JSON.stringify(window.DEFAULT_DATA || {members:[]})); }
function cleanNo(v){ let s = String(v ?? '').trim(); if(s.endsWith('.0')) s=s.slice(0,-2); return /^\d+$/.test(s) ? s.padStart(3,'0') : s; }
function visibleMembers(list){ return (list||[]).filter(m => { const n=cleanNo(m.memberNo); return n && n !== '000' && m.name && !String(m.role||'').includes('탈퇴'); }).map(m=>({...m, memberNo:cleanNo(m.memberNo)})).sort((a,b)=>(+a.memberNo||9999)-(+b.memberNo||9999)); }
function loadData(){ const saved=localStorage.getItem(STORE_KEY); let data=saved ? JSON.parse(saved) : cloneDefault(); data.members=visibleMembers(data.members); return data; }
function saveData(){ state.data.members=visibleMembers(state.data.members); localStorage.setItem(STORE_KEY, JSON.stringify(state.data)); }
function won(n){ return (Number(n)||0).toLocaleString('ko-KR')+'원'; }
function rate(p,r){ const t=(+p||0)+(+r||0); return t ? Math.round((+p||0)/t*100) : 100; }
function sum(k){ return state.data.members.reduce((a,m)=>a+(Number(m[k])||0),0); }
function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function pass4(phone){ return String(phone||'').replace(/\D/g,'').slice(-4); }

document.addEventListener('DOMContentLoaded', () => {
  state.data=loadData();
  document.getElementById('loginBtn').onclick=login;
  document.getElementById('loginPw').addEventListener('keydown', e=>{ if(e.key==='Enter') login(); });
  document.getElementById('loginId').addEventListener('keydown', e=>{ if(e.key==='Enter') login(); });
  document.getElementById('logoutBtn').onclick=logout;
  document.querySelectorAll('.nav[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
  const sess=localStorage.getItem(SESSION_KEY);
  if(sess){ const s=JSON.parse(sess); state.user=s.user; state.isAdmin=s.isAdmin; openApp(); }
});

function login(){
  const id=document.getElementById('loginId').value.trim();
  const pw=document.getElementById('loginPw').value.trim();
  const err=document.getElementById('loginError'); err.textContent='';
  if(id==='admin' && pw==='admin2026'){
    state.user={memberNo:'ADMIN', name:'한재식', role:'최고관리자'}; state.isAdmin=true;
    if(document.getElementById('keepLogin').checked) localStorage.setItem(SESSION_KEY, JSON.stringify({user:state.user,isAdmin:true}));
    openApp(); return;
  }
  if(id==='한재식'){ err.textContent='한재식 관리자는 admin 계정으로만 로그인하세요.'; return; }
  const m=state.data.members.find(x=>x.name===id);
  if(m && pass4(m.phone)===pw){ state.user=m; state.isAdmin=!!m.isAdmin; if(document.getElementById('keepLogin').checked) localStorage.setItem(SESSION_KEY, JSON.stringify({user:m,isAdmin:state.isAdmin})); openApp(); return; }
  err.textContent='아이디 또는 비밀번호를 확인하세요.';
}
function logout(){ localStorage.removeItem(SESSION_KEY); location.reload(); }
function openApp(){
  document.getElementById('loginPage').classList.add('hidden'); document.getElementById('app').classList.remove('hidden');
  document.querySelectorAll('.admin-only').forEach(e=>e.style.display=state.isAdmin?'block':'none');
  document.querySelectorAll('.member-only').forEach(e=>e.style.display=state.isAdmin?'none':'block');
  document.getElementById('userBox').innerHTML = state.isAdmin ? '관리자 한재식' : `${state.user.memberNo} ${escapeHtml(state.user.name)}님`;
  showView(state.isAdmin?'dashboard':'my');
}
function showView(view){
  state.view=view; document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
  const titles={dashboard:'관리자 대시보드',members:'회원관리',fees:'회비현황',special:'특별회비현황',upload:'파일 업로드',backup:'백업/복원',my:'내 현황'};
  document.getElementById('pageTitle').textContent=titles[view]||'대시보드';
  document.getElementById('content').innerHTML = ({dashboard:renderDashboard,members:renderMembers,fees:renderFees,special:renderSpecial,upload:renderUpload,backup:renderBackup,my:renderMy}[view]||renderDashboard)();
  bindAfterRender(view);
}
function donut(title, paid, remain, color='#2563eb'){
  const pct=rate(paid,remain);
  return `<div class="card"><h3>${title}</h3><div class="donut" style="--p:${pct};--c:${color}" data-label="${pct}%\n납부"></div><div class="money-row"><span>납부</span><b>${won(paid)}</b></div><div class="money-row"><span>남은금액</span><b>${won(remain)}</b></div></div>`;
}
function renderDashboard(){
  const rp=sum('regularPaid'), rr=sum('regularRemain'), sp=sum('specialPaid'), sr=sum('specialRemain');
  return `<div class="grid grid-4">
    <div class="card"><span class="muted">총 회원</span><div class="kpi">${state.data.members.length}명</div><span class="pill info">000 제외</span></div>
    <div class="card"><span class="muted">회원회비 납부율</span><div class="kpi">${rate(rp,rr)}%</div></div>
    <div class="card"><span class="muted">특별회비 납부율</span><div class="kpi">${rate(sp,sr)}%</div></div>
    <div class="card"><span class="muted">총 미납</span><div class="kpi">${won(rr+sr)}</div></div>
  </div>
  <div class="grid grid-2" style="margin-top:18px">${donut('회원회비',rp,rr,'#16a34a')}${donut('특별회비',sp,sr,'#2563eb')}</div>
  <div class="card" style="margin-top:18px"><h3>회원 요약</h3>${memberTable(state.data.members.slice(0,12))}</div>`;
}
function memberTable(rows){
  return `<div class="table-wrap"><table><thead><tr><th>회원번호</th><th>성명</th><th>직책</th><th>회원회비</th><th>특별회비</th><th>납부율</th></tr></thead><tbody>${rows.map(m=>`<tr><td><b>${m.memberNo}</b></td><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.role)}</td><td>${won(m.regularPaid)} / ${won(m.regularRemain)}</td><td>${won(m.specialPaid)} / ${won(m.specialRemain)}</td><td><span class="pill ${rate(m.regularPaid+m.specialPaid,m.regularRemain+m.specialRemain)>80?'ok':'warn'}">${rate(m.regularPaid+m.specialPaid,m.regularRemain+m.specialRemain)}%</span></td></tr>`).join('')}</tbody></table></div>`;
}
function renderMembers(){
  return `<div class="card"><div class="toolbar"><input id="q" placeholder="회원번호/이름/직책 검색"><button class="btn dark" id="csvMembers">CSV 다운로드</button></div><div id="memberList">${memberTable(state.data.members)}</div></div>`;
}
function renderFees(){
  return `<div class="card"><div class="toolbar"><input id="q" placeholder="회원번호/이름 검색"></div><div id="memberList">${memberTable(state.data.members)}</div></div>`;
}
function renderSpecial(){
  const events=[...new Set(state.data.members.flatMap(m=>(m.specialItems||[]).map(i=>i.event)))];
  return `<div class="card"><div class="toolbar"><input id="q" placeholder="회원번호/이름 검색"></div><div id="memberList"><div class="table-wrap"><table><thead><tr><th>회원번호</th><th>성명</th><th>납부금액</th><th>남은금액</th>${events.map(e=>`<th>${escapeHtml(e)}</th>`).join('')}</tr></thead><tbody>${state.data.members.map(m=>`<tr><td><b>${m.memberNo}</b></td><td>${escapeHtml(m.name)}</td><td>${won(m.specialPaid)}</td><td>${won(m.specialRemain)}</td>${events.map(e=>{const it=(m.specialItems||[]).find(x=>x.event===e);const st=it?it.status:'-';return `<td><span class="pill ${st==='납부'?'ok':st==='본인경조사'?'info':'bad'}">${escapeHtml(st)}</span></td>`}).join('')}</tr>`).join('')}</tbody></table></div></div></div>`;
}
function renderMy(){
  const m=state.isAdmin ? state.data.members.find(x=>x.name==='한재식') || state.data.members[0] : state.data.members.find(x=>x.name===state.user.name);
  const totalPaid=(+m.regularPaid||0)+(+m.specialPaid||0), totalRemain=(+m.regularRemain||0)+(+m.specialRemain||0);
  return `<div class="card member-hero"><h2>${m.memberNo} ${escapeHtml(m.name)}님</h2><p class="muted">${escapeHtml(m.role)} · 2026 회비현황</p><div class="kpi">${rate(totalPaid,totalRemain)}%</div></div>
  <div class="grid grid-2" style="margin-top:18px">${donut('내 회원회비',m.regularPaid,m.regularRemain,'#16a34a')}${donut('내 특별회비',m.specialPaid,m.specialRemain,'#2563eb')}</div>
  <div class="grid grid-2" style="margin-top:18px"><div class="card"><h3>회비 진행률</h3><div class="progress"><span style="width:${rate(totalPaid,totalRemain)}%"></span></div><p><b>${rate(totalPaid,totalRemain)}%</b> 납부 완료</p></div><div class="card"><h3>내 상세금액</h3><div class="money-row"><span>총 납부</span><b>${won(totalPaid)}</b></div><div class="money-row"><span>총 미납</span><b>${won(totalRemain)}</b></div><div class="money-row"><span>합계 기준</span><b>${won(totalPaid+totalRemain)}</b></div></div></div>
  <div class="card" style="margin-top:18px"><h3>특별회비 상세</h3><div class="table-wrap"><table><thead><tr><th>행사</th><th>금액</th><th>상태</th></tr></thead><tbody>${(m.specialItems||[]).map(i=>`<tr><td>${escapeHtml(i.event)}</td><td>${won(i.amount)}</td><td><span class="pill ${i.status==='납부'?'ok':i.status==='본인경조사'?'info':'bad'}">${escapeHtml(i.status)}</span></td></tr>`).join('')}</tbody></table></div></div>`;
}
function renderUpload(){
 return `<div class="grid grid-2">
  <div class="card upload-box"><h3>회원정보 업로드</h3><p class="muted">회원번호가 000이거나 공백인 회원은 자동 제외됩니다.</p><input type="file" id="membersFile" accept=".xlsx,.xls"></div>
  <div class="card upload-box"><h3>회비내역 업로드</h3><p class="muted">2026회비내역 시트를 자동 분석합니다.</p><input type="file" id="feesFile" accept=".xlsx,.xls"></div>
  <div class="card upload-box"><h3>특별회비 업로드</h3><p class="muted">2026년도 특별회비 시트를 자동 분석합니다.</p><input type="file" id="specialFile" accept=".xlsx,.xls"></div>
  <div class="card"><h3>데이터 반영</h3><p>업로드 즉시 브라우저 저장소에 반영됩니다.</p><button class="btn red" id="resetData">기본값 초기화</button></div>
 </div>`;
}
function renderBackup(){
 return `<div class="grid grid-2"><div class="card"><h3>JSON 백업</h3><button class="btn dark" id="backupBtn">백업 다운로드</button></div><div class="card"><h3>JSON 복원</h3><input type="file" id="restoreFile" accept=".json"></div></div>`;
}
function bindAfterRender(view){
  const q=document.getElementById('q'); if(q){ q.oninput=()=>{ const term=q.value.trim(); const rows=state.data.members.filter(m=>(m.memberNo+m.name+m.role).includes(term)); document.getElementById('memberList').innerHTML = view==='special' ? renderSpecialFiltered(rows) : memberTable(rows); }; }
  const csv=document.getElementById('csvMembers'); if(csv) csv.onclick=()=>downloadCSV();
  const reset=document.getElementById('resetData'); if(reset) reset.onclick=()=>{ localStorage.removeItem(STORE_KEY); state.data=loadData(); alert('기본값으로 초기화했습니다. 회원번호 000은 제외됩니다.'); showView('dashboard'); };
  const backup=document.getElementById('backupBtn'); if(backup) backup.onclick=()=>downloadFile('dongwonfc_backup_v8.json', JSON.stringify(state.data,null,2), 'application/json');
  const restore=document.getElementById('restoreFile'); if(restore) restore.onchange=e=>readText(e.target.files[0]).then(t=>{ state.data=JSON.parse(t); saveData(); alert('복원 완료'); showView('dashboard'); });
  const mf=document.getElementById('membersFile'); if(mf) mf.onchange=e=>parseWorkbook(e.target.files[0], parseMembersSheet);
  const ff=document.getElementById('feesFile'); if(ff) ff.onchange=e=>parseWorkbook(e.target.files[0], parseFeesSheet);
  const sf=document.getElementById('specialFile'); if(sf) sf.onchange=e=>parseWorkbook(e.target.files[0], parseSpecialSheet);
}
function renderSpecialFiltered(rows){ const old=state.data.members; state.data.members=rows; const html=renderSpecial().match(/<div id="memberList">([\s\S]*)<\/div><\/div>$/)?.[1] || memberTable(rows); state.data.members=old; return html; }
function downloadCSV(){
 const header=['회원번호','성명','직책','연락처','회원회비납부','회원회비미납','특별회비납부','특별회비미납'];
 const lines=[header.join(',')].concat(state.data.members.map(m=>[m.memberNo,m.name,m.role,m.phone,m.regularPaid,m.regularRemain,m.specialPaid,m.specialRemain].map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',')));
 downloadFile('dongwonfc_members_v8.csv', '\ufeff'+lines.join('\n'), 'text/csv');
}
function downloadFile(name, text, type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); }
function readText(file){ return new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsText(file); }); }
function parseWorkbook(file, handler){
 if(!window.XLSX){ alert('엑셀 분석 라이브러리를 불러오지 못했습니다. 인터넷 연결 후 다시 시도하세요.'); return; }
 const reader=new FileReader(); reader.onload=e=>{ const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true}); handler(wb); saveData(); alert('업로드 반영 완료. 회원번호 000은 제외되었습니다.'); showView('dashboard'); }; reader.readAsArrayBuffer(file);
}
function sheetRows(wb, nameLike){ const name=wb.SheetNames.find(n=>n.includes(nameLike)) || wb.SheetNames[0]; return XLSX.utils.sheet_to_json(wb.Sheets[name], {header:1, defval:null}); }
function parseMembersSheet(wb){
 const rows=sheetRows(wb,'회원명부'); const next=[];
 rows.slice(2).forEach(r=>{ const no=cleanNo(r[1]); const role=String(r[3]||'').trim(); const name=String(r[4]||'').trim(); const phone=String(r[5]||'').trim(); if(name && no && no!=='000' && !role.includes('탈퇴')){ const old=state.data.members.find(m=>m.name===name)||{}; next.push({...old, memberNo:no, name, role, phone, jersey:String(r[6]||'')}); }});
 state.data.members=visibleMembers(next);
}
function parseFeesSheet(wb){
 const rows=sheetRows(wb,'2026회비내역'); rows.slice(3).forEach(r=>{ const name=String(r[7]||'').trim(); const m=state.data.members.find(x=>x.name===name); if(!m) return; m.regularPaid=typeof r[8]==='number'?r[8]:0; m.regularRemain=[r[9],r[10]].filter(x=>typeof x==='number'&&x<0).reduce((a,x)=>a+Math.abs(x),0); m.specialPaid=typeof r[11]==='number'?r[11]:(m.specialPaid||0); m.specialRemain=typeof r[12]==='number'&&r[12]<0?Math.abs(r[12]):(m.specialRemain||0); });
}
function parseSpecialSheet(wb){
 const rows=sheetRows(wb,'2026년도 특별회비'); const eventNames=[]; const amounts=[]; (rows[3]||[]).forEach((c,i)=>{ if(i>=3 && c && c!=='납부금액'){ eventNames.push(String(c)); amounts.push(typeof (rows[4]||[])[i]==='number'?(rows[4]||[])[i]:10000); }});
 rows.slice(5).forEach(r=>{ const name=String(r[2]||'').trim(); const m=state.data.members.find(x=>x.name===name); if(!m) return; let paid=0, remain=0; m.specialItems=eventNames.map((ev,idx)=>{ const st=String(r[3+idx]||'미납').trim(); const amount=amounts[idx]; const p=st==='납부'?amount:0; const rem=(st==='납부'||st==='본인경조사')?0:amount; paid+=p; remain+=rem; return {event:ev,amount,status:st,paid:p,remain:rem}; }); m.specialPaid=paid; m.specialRemain=remain; });
}
