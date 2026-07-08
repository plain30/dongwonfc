let data, me;
document.addEventListener('DOMContentLoaded', () => {
  const sess=requireMember(); if(!sess) return;
  data=loadData();
  me=data.members.find(m=>m.memberNo===sess.user.memberNo || m.name===sess.user.name);
  if(!me){ clearSession(); alert('회원정보를 찾을 수 없습니다. 관리자에게 문의하세요.'); location.replace('./index.html'); return; }
  document.getElementById('logoutBtn').onclick=logout;
  document.getElementById('userBox').textContent=`${me.memberNo} ${me.name}님`;
  render();
});
function render(){
  const totalPaid=(+me.regularPaid||0)+(+me.specialPaid||0), totalRemain=(+me.regularRemain||0)+(+me.specialRemain||0);
  const pct=rate(totalPaid,totalRemain);
  const specialRows=(me.specialItems||[]).map(i=>`<tr><td>${escapeHtml(i.event)}</td><td>${won(i.amount)}</td><td><span class="pill ${i.status==='납부'?'ok':i.status==='본인경조사'?'info':'bad'}">${escapeHtml(i.status||'-')}</span></td></tr>`).join('');
  document.getElementById('content').innerHTML=`
  <div class="card member-hero"><h2>${me.memberNo} ${escapeHtml(me.name)}님</h2><p class="muted">${escapeHtml(me.role)} · 2026 회비현황</p><div class="kpi">${pct}%</div></div>
  <div class="grid grid-2" style="margin-top:18px">${donut('내 회원회비',me.regularPaid,me.regularRemain,'#16a34a')}${donut('내 특별회비',me.specialPaid,me.specialRemain,'#2563eb')}</div>
  <div class="grid grid-2" style="margin-top:18px">
    ${progressCard('회비 진행률',pct)}
    <div class="card"><h3>내 상세금액</h3><div class="money-row"><span>총 납부</span><b>${won(totalPaid)}</b></div><div class="money-row"><span>총 미납</span><b>${won(totalRemain)}</b></div><div class="money-row"><span>전체 예정금액</span><b>${won(totalPaid+totalRemain)}</b></div></div>
  </div>
  <div class="grid grid-2" style="margin-top:18px">
    <div class="card"><h3>내 회원정보</h3><div class="money-row"><span>회원번호</span><b>${me.memberNo}</b></div><div class="money-row"><span>성명</span><b>${escapeHtml(me.name)}</b></div><div class="money-row"><span>직책</span><b>${escapeHtml(me.role)}</b></div></div>
    <div class="card"><h3>내 특별회비 상세</h3><div class="table-wrap"><table><thead><tr><th>항목</th><th>금액</th><th>상태</th></tr></thead><tbody>${specialRows || '<tr><td colspan="3">등록된 특별회비가 없습니다.</td></tr>'}</tbody></table></div></div>
  </div>`;
}
