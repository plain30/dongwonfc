document.addEventListener('DOMContentLoaded', () => {
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
