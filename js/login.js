import {APP_CONFIG} from './config.js?v=11.1.0';
import {api,configured,setSession,getProfile,token} from './api.js?v=11.1.0';
document.addEventListener('DOMContentLoaded',()=>{
 const form=document.getElementById('loginForm'),msg=document.getElementById('loginMsg');
 if(!configured()){msg.textContent='관리자가 js/config.js에 Apps Script 웹 앱 주소를 입력해야 합니다.';msg.className='error show'}
 const p=getProfile();if(p&&token())location.href=p.role==='admin'?'./admin.html':'./member.html';
 form.addEventListener('submit',async e=>{e.preventDefault();msg.textContent='로그인 중...';msg.className='error show';try{const r=await api('login',{loginId:document.getElementById('loginId').value.trim(),password:document.getElementById('password').value,remember:document.getElementById('remember').checked});setSession(r.token,r.profile,document.getElementById('remember').checked);location.href=r.profile.role==='admin'?'./admin.html':'./member.html'}catch(err){msg.textContent=err.message;msg.className='error show'}})
});
