import {APP_CONFIG} from './config.js?v=13.0.0';
const TOKEN_KEY='dongwonfc_v13_token';
const PROFILE_KEY='dongwonfc_v13_profile';
let sequence=0;
export function configured(){return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(APP_CONFIG.appsScriptUrl)}
export function getProfile(){for(const s of [sessionStorage,localStorage]){try{const v=s.getItem(PROFILE_KEY);if(v)return JSON.parse(v)}catch{}}return null}
export function setSession(tokenValue,profile,remember=false){clearSession();const store=remember?localStorage:sessionStorage;store.setItem(TOKEN_KEY,tokenValue);store.setItem(PROFILE_KEY,JSON.stringify(profile))}
export function token(){return sessionStorage.getItem(TOKEN_KEY)||localStorage.getItem(TOKEN_KEY)||''}
export function clearSession(){[sessionStorage,localStorage].forEach(s=>{s.removeItem(TOKEN_KEY);s.removeItem(PROFILE_KEY)})}
export async function sha256(text){const data=new TextEncoder().encode(String(text));const digest=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function jsonp(params={}){
  if(!configured())return Promise.reject(new Error('Apps Script 웹 앱 주소가 설정되지 않았습니다.'));
  return new Promise((resolve,reject)=>{
    const callback=`__dfc_cb_${Date.now()}_${sequence++}`;
    const script=document.createElement('script');
    const timer=setTimeout(()=>finish(new Error('공동 서버 응답 시간이 초과되었습니다.')),APP_CONFIG.jsonpTimeoutMs||25000);
    function finish(err,value){clearTimeout(timer);try{delete window[callback]}catch{};script.remove();err?reject(err):resolve(value)}
    window[callback]=(result)=>{if(!result||result.ok!==true)finish(new Error(result?.error||'서버 요청 처리에 실패했습니다.'));else finish(null,result)};
    const query=new URLSearchParams({...params,callback,_t:String(Date.now())});
    script.src=`${APP_CONFIG.appsScriptUrl}?${query.toString()}`;
    script.async=true;
    script.onerror=()=>finish(new Error('Apps Script 공동 서버를 불러오지 못했습니다. 새 배포 URL과 “모든 사용자” 권한을 확인하세요.'));
    document.head.appendChild(script);
  });
}
async function chunkedSave(action,payload){
  const uploadId=`${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const raw=JSON.stringify({action,token:token(),...payload});
  const encoded=btoa(unescape(encodeURIComponent(raw)));
  const size=APP_CONFIG.chunkSize||4200;
  const total=Math.ceil(encoded.length/size);
  await jsonp({action:'uploadBegin',token:token(),uploadId,total:String(total)});
  for(let i=0;i<total;i++)await jsonp({action:'uploadChunk',token:token(),uploadId,index:String(i),data:encoded.slice(i*size,(i+1)*size)});
  return jsonp({action:'uploadCommit',token:token(),uploadId});
}
export async function api(action,payload={}){
  if(action==='saveAll')return chunkedSave(action,payload);
  const compact={action,token:token(),payload:btoa(unescape(encodeURIComponent(JSON.stringify(payload))))};
  return jsonp(compact);
}
export async function loginRequest(loginId,password){return api('login',{loginId,passwordHash:await sha256(password)})}
export async function setupRequest(password){return api('setup',{passwordHash:await sha256(password)})}
export async function health(){return jsonp({action:'health'})}
export async function requireRole(role){const p=getProfile();if(!p||p.role!==role||!token()){location.replace('./index.html');return null}try{await api('ping');return p}catch(e){clearSession();location.replace('./index.html');return null}}
export function logout(){clearSession();location.replace('./index.html')}
