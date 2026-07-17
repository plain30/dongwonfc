
/*
 * 로그인 공지사항 설정
 * enabled: false로 변경하면 팝업이 표시되지 않습니다.
 * title, body를 수정하면 공지 내용이 변경됩니다.
 * id는 공지를 새로 올릴 때마다 다른 값으로 바꾸세요.
 */
const LOGIN_NOTICE = {
  enabled: true,
  id: 'notice-2026-01',
  title: '동원FC 회비관리 시스템 안내',
  body: `동원FC 회비관리 시스템에 방문해 주셔서 감사합니다.

회원 로그인
• 아이디: 본인 이름
• 비밀번호: 휴대전화번호 뒤 4자리

회원정보 또는 회비내역에 이상이 있으면 관리자에게 문의해 주세요.`
};

function openLoginNotice(){
  if(!LOGIN_NOTICE.enabled) return;
  const hiddenKey=`dongwonfc_notice_hidden_${LOGIN_NOTICE.id}`;
  if(localStorage.getItem(hiddenKey)===new Date().toISOString().slice(0,10)) return;

  const popup=document.getElementById('noticePopup');
  if(!popup) return;
  document.getElementById('noticeTitle').textContent=LOGIN_NOTICE.title;
  document.getElementById('noticeBody').textContent=LOGIN_NOTICE.body;
  popup.classList.remove('hidden');

  const close=()=>{
    if(document.getElementById('noticeToday')?.checked){
      localStorage.setItem(hiddenKey,new Date().toISOString().slice(0,10));
    }
    popup.classList.add('hidden');
  };
  document.getElementById('noticeCloseBtn').onclick=close;
  document.getElementById('noticeCloseX').onclick=close;
  popup.onclick=e=>{if(e.target===popup) close();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!popup.classList.contains('hidden')) close();},{once:true});
}

document.addEventListener('DOMContentLoaded', () => {
  openLoginNotice();
  const sess=getSession();
  if(sess?.role==='admin') location.replace('./admin.html');
  if(sess?.role==='member') location.replace('./member.html');
  const btn=document.getElementById('loginBtn');
  const idEl=document.getElementById('loginId');
  const pwEl=document.getElementById('loginPw');
  btn.onclick=login;
  [idEl,pwEl].forEach(el=>el.addEventListener('keydown', e=>{ if(e.key==='Enter') login(); }));
});
function login(){
  const data=loadData();
  const id=document.getElementById('loginId').value.trim();
  const pw=document.getElementById('loginPw').value.trim();
  const keep=document.getElementById('keepLogin').checked;
  const err=document.getElementById('loginError'); err.textContent='';
  if(id==='admin' && pw==='admin2026'){
    setSession({role:'admin', user:{memberNo:'ADMIN', name:'한재식'}}, keep);
    location.href='./admin.html'; return;
  }
  if(id==='admin'){ err.textContent='아이디 또는 비밀번호를 확인하세요.'; return; }
  if(id==='한재식'){ err.textContent='한재식 관리자는 admin 계정으로만 로그인하세요.'; return; }
  const m=data.members.find(x=>x.name===id);
  if(m && pass4(m.phone)===pw){
    setSession({role:'member', user:{memberNo:m.memberNo, name:m.name}}, keep);
    location.href='./member.html'; return;
  }
  err.textContent='아이디 또는 비밀번호를 확인하세요.';
}
