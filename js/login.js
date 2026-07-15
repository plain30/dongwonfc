import {configured,setSession,getProfile,token,loginRequest,health} from './api.js?v=14.1.0';
document.addEventListener('DOMContentLoaded',()=>{
 const form=document.getElementById('loginForm'),msg=document.getElementById('loginMsg'),button=form.querySelector('button[type="submit"]');
 if(!configured()){msg.textContent='Apps Script 웹 앱 주소가 설정되지 않았습니다.';msg.className='error show'}
 const p=getProfile();if(p&&token())location.href=p.role==='admin'?'./admin.html':'./member.html';
 health().then(()=>{if(!msg.textContent)msg.textContent='공동 서버 연결 완료';msg.className='status-ok show';setTimeout(()=>{if(msg.textContent==='공동 서버 연결 완료')msg.className='error'},1600)}).catch(err=>{msg.textContent=err.message;msg.className='error show'});
 form.addEventListener('submit',async e=>{e.preventDefault();button.disabled=true;msg.textContent='로그인 확인 중...';msg.className='error show';try{const r=await loginRequest(document.getElementById('loginId').value.trim(),document.getElementById('password').value);setSession(r.token,r.profile,document.getElementById('remember').checked);location.href=r.profile.role==='admin'?'./admin.html':'./member.html'}catch(err){msg.textContent=err.message;msg.className='error show';button.disabled=false}})
});
