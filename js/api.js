import {APP_CONFIG} from './config.js?v=12.0.0';
const TOKEN_KEY='dongwonfc_v12_token';
const PROFILE_KEY='dongwonfc_v12_profile';
export function configured(){return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(APP_CONFIG.appsScriptUrl)}
export function getProfile(){for(const s of [sessionStorage,localStorage]){try{const v=s.getItem(PROFILE_KEY);if(v)return JSON.parse(v)}catch{}}return null}
export function setSession(token,profile,remember=false){clearSession();const store=remember?localStorage:sessionStorage;store.setItem(TOKEN_KEY,token);store.setItem(PROFILE_KEY,JSON.stringify(profile))}
export function token(){return sessionStorage.getItem(TOKEN_KEY)||localStorage.getItem(TOKEN_KEY)||''}
export function clearSession(){[sessionStorage,localStorage].forEach(s=>{s.removeItem(TOKEN_KEY);s.removeItem(PROFILE_KEY)})}
export async function api(action,payload={}){
  if(!configured())throw new Error('Apps Script 웹 앱 주소가 설정되지 않았습니다.');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const res=await fetch(APP_CONFIG.appsScriptUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,token:token(),...payload}),redirect:'follow',signal:controller.signal});
    const text=await res.text();
    if(!res.ok)throw new Error(`서버 응답 오류 (${res.status})`);
    let json;try{json=JSON.parse(text)}catch{throw new Error('Apps Script가 JSON 대신 다른 화면을 반환했습니다. 웹 앱 권한을 “모든 사용자”로 확인하세요.')}
    if(!json.ok)throw new Error(json.error||'요청 처리 중 오류가 발생했습니다.');
    return json;
  }catch(e){if(e.name==='AbortError')throw new Error('서버 응답 시간이 초과되었습니다. Apps Script 배포 상태를 확인하세요.');if(e instanceof TypeError)throw new Error('공동 서버에 접속하지 못했습니다. Apps Script /exec 주소와 배포 권한을 확인하세요.');throw e}finally{clearTimeout(timer)}
}
export async function requireRole(role){const p=getProfile();if(!p||p.role!==role||!token()){location.replace('./index.html');return null}try{await api('ping');return p}catch(e){clearSession();location.replace('./index.html');return null}}
export function logout(){clearSession();location.replace('./index.html')}
