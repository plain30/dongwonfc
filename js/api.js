import {APP_CONFIG} from './config.js?v=11.1.0';
const TOKEN_KEY='dongwonfc_v11_token';
const PROFILE_KEY='dongwonfc_v11_profile';
export function configured(){return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(APP_CONFIG.appsScriptUrl)}
export function getProfile(){try{return JSON.parse(sessionStorage.getItem(PROFILE_KEY)||localStorage.getItem(PROFILE_KEY)||'null')}catch{return null}}
export function setSession(token,profile,remember=false){const store=remember?localStorage:sessionStorage;store.setItem(TOKEN_KEY,token);store.setItem(PROFILE_KEY,JSON.stringify(profile));if(remember){sessionStorage.setItem(TOKEN_KEY,token);sessionStorage.setItem(PROFILE_KEY,JSON.stringify(profile))}}
export function token(){return sessionStorage.getItem(TOKEN_KEY)||localStorage.getItem(TOKEN_KEY)||''}
export function clearSession(){[sessionStorage,localStorage].forEach(s=>{s.removeItem(TOKEN_KEY);s.removeItem(PROFILE_KEY)})}
export async function api(action,payload={}){
  if(!configured())throw new Error('Apps Script 웹 앱 주소가 설정되지 않았습니다.');
  const body={action,token:token(),...payload};
  const res=await fetch(APP_CONFIG.appsScriptUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),redirect:'follow'});
  const text=await res.text();let json;try{json=JSON.parse(text)}catch{throw new Error('Apps Script 응답을 해석하지 못했습니다. 배포 권한을 “모든 사용자”로 확인하세요.')}
  if(!json.ok)throw new Error(json.error||'요청 처리 중 오류가 발생했습니다.');return json;
}
export async function requireRole(role){const p=getProfile()||(()=>{try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')}catch{return null}})();if(!p||p.role!==role||!token()){location.href='./index.html';return null}try{await api('ping');return p}catch{clearSession();location.href='./index.html';return null}}
export function logout(){clearSession();location.href='./index.html'}
