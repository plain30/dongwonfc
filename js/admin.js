import {api,requireRole,logout} from './api.js?v=13.0.0';
import {DEFAULT_SETTINGS,visibleMembers,normalizeMember,won,pct,donut,memberTable,feeTable,specialTable,workbook,parseMembersSheet,applyFeesSheet,applySpecialSheet,esc} from './core.js?v=13.0.0';

let members=[];
let settings={...DEFAULT_SETTINGS};
let auditLogs=[];
let view='dashboard';
let refreshTimer=null;
let isRefreshing=false;

const $=s=>document.querySelector(s);
const content=()=>$('#content');

window.addEventListener('DOMContentLoaded',boot);

async function boot(){
  const profile=await requireRole('admin');
  if(!profile)return;
  $('#logoutBtn').addEventListener('click',logout);
  $('#refreshTopBtn').addEventListener('click',()=>refresh(true));
  document.querySelectorAll('.nav[data-view]').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));
  $('#menuBtn').addEventListener('click',toggleSidebar);
  $('#sidebarBackdrop').addEventListener('click',closeSidebar);
  renderLoading('공동 스프레드시트 데이터를 불러오는 중입니다.');
  await refresh(true);
  refreshTimer=setInterval(()=>refresh(false),15000);
}

function toggleSidebar(){ $('#sidebar').classList.toggle('open'); $('#sidebarBackdrop').classList.toggle('show'); }
function closeSidebar(){ $('#sidebar').classList.remove('open'); $('#sidebarBackdrop').classList.remove('show'); }

async function refresh(showMessage=false){
  if(isRefreshing)return;
  isRefreshing=true;
  setStatus('동기화 중','loading');
  try{
    const r=await api('getAdminData');
    settings={...DEFAULT_SETTINGS,...(r.settings||{})};
    members=visibleMembers(r.members||[]).map(m=>normalizeMember(m,settings));
    auditLogs=r.auditLogs||[];
    clearGlobalMessage();
    showView(view,false);
    setStatus(`동기화 완료 · ${new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}`,'online');
    if(showMessage && !members.length) showGlobalMessage('info','공동 데이터가 비어 있습니다.','파일 업로드 메뉴에서 회원정보를 등록하거나 기본자료 서버 등록을 실행해 주세요.');
  }catch(err){
    setStatus('연결 오류','offline');
    showGlobalMessage('error','Google Sheets 연결에 실패했습니다.',err.message||String(err));
    if(!members.length) content().innerHTML=connectionError(err.message||String(err));
  }finally{isRefreshing=false;}
}

function setStatus(text,state){const el=$('#syncStatus');el.className=`cloud-status ${state}`;el.innerHTML=`<i></i><span>${esc(text)}</span>`;}
function showGlobalMessage(type,title,body){$('#globalMessage').innerHTML=`<div class="page-alert ${type}"><strong>${esc(title)}</strong><span>${esc(body)}</span></div>`;}
function clearGlobalMessage(){$('#globalMessage').innerHTML='';}
function renderLoading(text){content().innerHTML=`<div class="card loading-state"><div class="spinner"></div><strong>${esc(text)}</strong></div>`;}

function showView(next,activate=true){
  view=next;
  if(activate){document.querySelectorAll('.nav[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===next));closeSidebar();}
  const meta={dashboard:['관리자 대시보드','전체 회비 현황을 한눈에 확인합니다.'],members:['회원관리','회원번호와 회원정보를 관리합니다.'],fees:['회비현황','연간 회원회비 납부현황입니다.'],special:['특별회비','경조사별 특별회비 현황입니다.'],upload:['파일 업로드','엑셀 자료를 공동 스프레드시트에 반영합니다.'],settings:['환경설정','회비 계산 기준을 설정합니다.'],audit:['변경 이력','최근 관리자 작업 내역입니다.']};
  const [title,sub]=meta[next]||meta.dashboard;
  $('#pageTitle').textContent=title;$('#pageSubtitle').textContent=sub;
  const renderer={dashboard, members:memberView,fees:feeView,special:specialView,upload:uploadView,settings:settingsView,audit:auditView}[next]||dashboard;
  content().innerHTML=renderer();
  bind(next);
}

function dashboard(){
  if(!members.length)return emptyMembers('대시보드에 표시할 회원자료가 없습니다.');
  const rp=sum('regularPaid'),rd=sum('regularDue'),sp=sum('specialPaid'),sd=sum('specialDue');
  const totalRemain=Math.max(0,rd-rp)+Math.max(0,sd-sp);
  return `
  <div class="dashboard-grid">
    ${metric('총 회원',`${members.length}명`,'회원번호 000·탈퇴회원 제외')}
    ${metric('회원회비 납부율',`${pct(rp,rd)}%`,`${won(rp)} / ${won(rd)}`)}
    ${metric('특별회비 납부율',`${pct(sp,sd)}%`,`${won(sp)} / ${won(sd)}`)}
    ${metric('총 남은금액',won(totalRemain),'회원회비 + 특별회비')}
  </div>
  <div class="section-grid">${donut('회원회비',rp,rd,'#16a34a')}${donut('특별회비',sp,sd,'#2563eb')}</div>
  <div class="card" style="margin-top:18px">
    <div class="card-title-row"><h3>회원 요약</h3><button class="btn" id="allMembersBtn">전체 회원 보기</button></div>
    ${memberTable(members.slice(0,12))}
  </div>`;
}
function sum(key){return members.reduce((a,m)=>a+(Number(m[key])||0),0)}
function metric(label,value,sub){return `<div class="metric-card"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`}
function emptyMembers(title='등록된 회원자료가 없습니다.'){return `<div class="card empty-state"><div class="empty-icon">📂</div><h3>${title}</h3><p>파일 업로드 메뉴에서 회원정보 파일을 올리거나, 기본자료 서버 등록을 실행하면 모든 사용자에게 공동 반영됩니다.</p><button class="btn dark" id="goUploadBtn">파일 업로드로 이동</button></div>`}
function connectionError(message){return `<div class="card empty-state"><div class="empty-icon">⚠️</div><h3>공동 서버에 연결할 수 없습니다.</h3><p>${esc(message)}</p><button class="btn dark" id="retryBtn">다시 연결</button></div>`}

function memberView(){return `<div class="card"><div class="toolbar"><input id="q" placeholder="회원번호·이름·직책 검색"><button class="btn dark" id="refreshBtn">지금 새로고침</button></div><div id="list">${members.length?memberTable(members):emptyMembers()}</div></div>`}
function feeView(){return `<div class="card"><div class="toolbar"><input id="q" placeholder="회원번호·이름 검색"><span class="pill info">월 ${won(settings.monthlyFee)} · 연 ${won(settings.monthlyFee*settings.annualMonths)}</span></div><div id="list">${members.length?feeTable(members):emptyMembers()}</div></div>`}
function specialView(){return `<div class="card"><div class="toolbar"><input id="q" placeholder="회원번호·이름 검색"><span class="pill info">경조사 1건 ${won(settings.specialFeePerEvent)}</span></div><div id="list">${members.length?specialTable(members):emptyMembers()}</div></div>`}
function uploadView(){return `<div class="grid grid-2"><div class="card upload-box"><h3>회원정보 업로드</h3><p class="muted">회원번호 000과 탈퇴회원은 자동 제외됩니다.</p><input type="file" id="membersFile" accept=".xlsx,.xls"></div><div class="card upload-box"><h3>회비내역 업로드</h3><p class="muted">면제·EXEMPT 회원은 회비면제로 처리합니다.</p><input type="file" id="feesFile" accept=".xlsx,.xls"></div><div class="card upload-box"><h3>특별회비 업로드</h3><p class="muted">경조사 1건당 설정 금액으로 계산합니다.</p><input type="file" id="specialFile" accept=".xlsx,.xls"></div><div class="card"><h3>초기 자료 및 백업</h3><p class="muted">처음 설치할 때 포함된 기본자료를 공동 스프레드시트에 등록할 수 있습니다.</p><div class="toolbar"><button class="btn dark" id="seedBtn">기본자료 서버 등록</button><button class="btn" id="backupBtn">JSON 백업 다운로드</button></div></div></div>`}
function settingsView(){return `<div class="card settings-card"><h3>회비 기준 설정</h3><div class="form-grid"><label>월 회원회비<input id="monthlyFee" type="number" min="0" value="${settings.monthlyFee}"></label><label>연간 납부 개월<input id="annualMonths" type="number" min="1" max="12" value="${settings.annualMonths}"></label><label>특별회비 1건당 금액<input id="specialFee" type="number" min="0" value="${settings.specialFeePerEvent}"></label></div><div class="setting-preview"><span>회원 1인 연간 회비</span><strong>${won(settings.monthlyFee*settings.annualMonths)}</strong></div><button class="primary settings-save" id="saveSettings">설정 저장</button></div>`}
function auditView(){return `<div class="card"><h3>최근 변경 이력</h3><div class="table-wrap"><table><thead><tr><th>일시</th><th>작업</th><th>사용자</th><th>내용</th></tr></thead><tbody>${auditLogs.map(x=>`<tr><td>${esc(x.timestamp||'-')}</td><td>${esc(x.action||'-')}</td><td>${esc(x.actor||'-')}</td><td>${esc(x.details||'')}</td></tr>`).join('')||'<tr><td colspan="4">변경 이력이 없습니다.</td></tr>'}</tbody></table></div></div>`}

function bind(v){
  $('#goUploadBtn')?.addEventListener('click',()=>showView('upload'));
  $('#retryBtn')?.addEventListener('click',()=>refresh(true));
  $('#allMembersBtn')?.addEventListener('click',()=>showView('members'));
  const q=$('#q');if(q)q.addEventListener('input',()=>{const t=q.value.trim();const rows=members.filter(m=>(`${m.memberNo}${m.name}${m.role}`).includes(t));$('#list').innerHTML=v==='special'?specialTable(rows):v==='fees'?feeTable(rows):memberTable(rows)});
  $('#refreshBtn')?.addEventListener('click',()=>refresh(true));
  $('#membersFile')?.addEventListener('change',e=>uploadMembers(e.target.files[0]));
  $('#feesFile')?.addEventListener('change',e=>uploadFees(e.target.files[0]));
  $('#specialFile')?.addEventListener('change',e=>uploadSpecial(e.target.files[0]));
  $('#saveSettings')?.addEventListener('click',saveSettings);
  $('#seedBtn')?.addEventListener('click',seedDefault);
  $('#backupBtn')?.addEventListener('click',downloadBackup);
}

async function saveAll(next,action,file=''){const normalized=visibleMembers(next).map(m=>normalizeMember(m,settings));await api('saveAll',{members:normalized,settings,action,details:file});members=normalized;showView(view,false)}
async function uploadMembers(file){if(!file)return;try{setStatus('회원정보 저장 중','loading');const wb=await workbook(file),next=parseMembersSheet(wb,members);await saveAll(next,'회원정보 업로드',file.name);alert(`${next.length}명 회원정보를 저장했습니다.`);await refresh(false)}catch(e){alert(e.message);setStatus('저장 실패','offline')}}
async function uploadFees(file){if(!file)return;try{setStatus('회비내역 저장 중','loading');const wb=await workbook(file),next=applyFeesSheet(wb,members);await saveAll(next,'회비내역 업로드',file.name);alert('회비내역을 반영했습니다.');await refresh(false)}catch(e){alert(e.message);setStatus('저장 실패','offline')}}
async function uploadSpecial(file){if(!file)return;try{setStatus('특별회비 저장 중','loading');const wb=await workbook(file),next=applySpecialSheet(wb,members);await saveAll(next,'특별회비 업로드',file.name);alert('특별회비를 반영했습니다.');await refresh(false)}catch(e){alert(e.message);setStatus('저장 실패','offline')}}
async function saveSettings(){try{settings={monthlyFee:+$('#monthlyFee').value||0,annualMonths:+$('#annualMonths').value||12,specialFeePerEvent:+$('#specialFee').value||0};await api('saveSettings',{settings});members=members.map(m=>normalizeMember(m,settings));alert('설정을 저장했습니다.');showView(view,false);setStatus('설정 저장 완료','online')}catch(e){alert(e.message)}}
async function seedDefault(){if(!confirm('포함된 기본자료로 공동 스프레드시트를 초기화할까요?'))return;try{const data=window.DEFAULT_DATA;if(!data?.members?.length)throw new Error('기본자료를 찾지 못했습니다.');await api('saveAll',{members:visibleMembers(data.members).map(m=>normalizeMember(m,settings)),settings,action:'기본자료 등록',details:`${data.members.length}명`});await refresh(false);alert('기본자료를 저장했습니다.')}catch(e){alert(e.message)}}
function downloadBackup(){const blob=new Blob([JSON.stringify({version:'13.0.0',exportedAt:new Date().toISOString(),settings,members},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`dongwonfc-v12-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url)}
