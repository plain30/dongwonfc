let data, view='dashboard';
document.addEventListener('DOMContentLoaded', () => {
  const sess=requireAdmin(); if(!sess) return;
  data=loadData();
  document.getElementById('logoutBtn').onclick=logout;
  document.querySelectorAll('.nav[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
  showView('dashboard');
});
function showView(v){
  view=v;
  document.querySelectorAll('.nav[data-view]').forEach(b=>b.classList.toggle('active', b.dataset.view===v));
  const titles={dashboard:'관리자 대시보드',members:'회원관리',fees:'회비현황',special:'특별회비현황',upload:'파일 업로드',backup:'백업/복원'};
  document.getElementById('pageTitle').textContent=titles[v]||'관리자 대시보드';
  document.getElementById('content').innerHTML=({dashboard:renderDashboard,members:renderMembers,fees:renderFees,special:renderSpecial,upload:renderUpload,backup:renderBackup}[v]||renderDashboard)();
  bindAfterRender(v);
}
function renderDashboard(){
  const rp=sum(data,'regularPaid'), rr=sum(data,'regularRemain'), sp=sum(data,'specialPaid'), sr=sum(data,'specialRemain');
  return `<div class="grid grid-4">
    <div class="card"><span class="muted">총 회원</span><div class="kpi">${data.members.length}명</div><span class="pill info">000 제외</span></div>
    <div class="card"><span class="muted">회원회비 납부율</span><div class="kpi">${rate(rp,rr)}%</div></div>
    <div class="card"><span class="muted">특별회비 납부율</span><div class="kpi">${rate(sp,sr)}%</div></div>
    <div class="card"><span class="muted">총 미납</span><div class="kpi">${won(rr+sr)}</div></div>
  </div>
  <div class="grid grid-2" style="margin-top:18px">${donut('회원회비',rp,rr,'#16a34a')}${donut('특별회비',sp,sr,'#2563eb')}</div>
  <div class="card" style="margin-top:18px"><h3>회원 요약</h3>${memberTable(data.members.slice(0,12))}</div>`;
}
function renderMembers(){ return `<div class="card"><div class="toolbar"><input id="q" placeholder="회원번호/이름/직책 검색"><button class="btn dark" id="csvMembers">CSV 다운로드</button></div><div id="list">${memberTable(data.members)}</div></div>`; }
function renderFees(){ return `<div class="card"><div class="toolbar"><input id="q" placeholder="회원번호/이름 검색"></div><div id="list">${memberTable(data.members)}</div></div>`; }
function renderSpecial(){ return `<div class="card"><div class="toolbar"><input id="q" placeholder="회원번호/이름 검색"></div><div id="list">${specialTable(data.members)}</div></div>`; }
function renderUpload(){
 return `<div class="grid grid-2">
  <div class="card upload-box"><h3>회원정보 업로드</h3><p class="muted">회원번호 000은 자동 제외됩니다.</p><input type="file" id="membersFile" accept=".xlsx,.xls"></div>
  <div class="card upload-box"><h3>회비내역 업로드</h3><input type="file" id="feesFile" accept=".xlsx,.xls"></div>
  <div class="card upload-box"><h3>특별회비 업로드</h3><input type="file" id="specialFile" accept=".xlsx,.xls"></div>
  <div class="card"><h3>데이터 관리</h3><p>업로드 즉시 브라우저 저장소에 반영됩니다.</p><button class="btn red" id="resetData">기본값 초기화</button></div>
 </div>`;
}
function renderBackup(){ return `<div class="grid grid-2"><div class="card"><h3>JSON 백업</h3><button class="btn dark" id="backupBtn">백업 다운로드</button></div><div class="card"><h3>JSON 복원</h3><input type="file" id="restoreFile" accept=".json"></div></div>`; }
function bindAfterRender(v){
  const q=document.getElementById('q');
  if(q){ q.oninput=()=>{ const term=q.value.trim(); const rows=data.members.filter(m=>(m.memberNo+m.name+m.role).includes(term)); document.getElementById('list').innerHTML = v==='special' ? specialTable(rows) : memberTable(rows); }; }
  const csv=document.getElementById('csvMembers'); if(csv) csv.onclick=()=>downloadCSV(data);
  const reset=document.getElementById('resetData'); if(reset) reset.onclick=()=>{ localStorage.removeItem(STORE_KEY); data=loadData(); alert('기본값으로 초기화했습니다.'); showView('dashboard'); };
  const backup=document.getElementById('backupBtn'); if(backup) backup.onclick=()=>downloadFile('dongwonfc_backup_v9.json', JSON.stringify(data,null,2), 'application/json');
  const restore=document.getElementById('restoreFile'); if(restore) restore.onchange=e=>readText(e.target.files[0]).then(t=>{ data=JSON.parse(t); saveData(data); alert('복원 완료'); showView('dashboard'); });
  const mf=document.getElementById('membersFile'); if(mf) mf.onchange=e=>parseWorkbook(e.target.files[0], parseMembersSheet, data, ()=>showView('dashboard'));
  const ff=document.getElementById('feesFile'); if(ff) ff.onchange=e=>parseWorkbook(e.target.files[0], parseFeesSheet, data, ()=>showView('dashboard'));
  const sf=document.getElementById('specialFile'); if(sf) sf.onchange=e=>parseWorkbook(e.target.files[0], parseSpecialSheet, data, ()=>showView('dashboard'));
}
