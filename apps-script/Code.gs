const SHEETS={MEMBERS:'회원정보',REGULAR:'회비현황',SPECIAL:'특별회비현황',SETTINGS:'환경설정',AUDIT:'변경이력'};
const SESSION_SECONDS=21600;
const SESSION_PREFIX='SESSION_';
function doGet(e){
  try{
    const q=(e&&e.parameter)||{};
    const callback=String(q.callback||'').replace(/[^A-Za-z0-9_$\.]/g,'');
    const action=String(q.action||'health');
    let result;
    if(action==='health')result={ok:true,service:'DongwonFC V13.1 Google Sheets API',initialized:props_().getProperty('INITIALIZED')==='true',time:new Date().toISOString()};
    else if(action==='uploadBegin')result=uploadBegin_(q);
    else if(action==='uploadChunk')result=uploadChunk_(q);
    else if(action==='uploadCommit')result=uploadCommit_(q);
    else{
      const payload=decodePayload_(q.payload||'');
      const p=Object.assign({},payload,{action:action,token:q.token||payload.token||''});
      result=route_(p);
    }
    return output_(result,callback);
  }catch(err){return output_({ok:false,error:String(err.message||err)},String((e&&e.parameter&&e.parameter.callback)||''));}
}
function doPost(e){try{const p=JSON.parse((e.postData&&e.postData.contents)||'{}');return json_(route_(p))}catch(err){return json_({ok:false,error:String(err.message||err)})}}
function route_(p){
  const action=p.action||'';
  if(action==='setup')return setup_(p);
  if(action==='login')return login_(p);
  const session=requireSession_(p.token);
  if(action==='ping')return{ok:true,profile:session};
  if(action==='getAdminData')return getAdminData_(session);
  if(action==='getMemberData')return getMemberData_(session);
  if(action==='saveAll')return saveAll_(session,p);
  if(action==='saveSettings')return saveSettings_(session,p);
  throw new Error('지원하지 않는 요청입니다.');
}
function output_(obj,callback){
  const body=callback?callback+'('+JSON.stringify(obj)+');':JSON.stringify(obj);
  return ContentService.createTextOutput(body).setMimeType(callback?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON);
}
function decodePayload_(value){if(!value)return{};try{return JSON.parse(Utilities.newBlob(Utilities.base64Decode(value)).getDataAsString('UTF-8'))}catch(e){throw new Error('요청 데이터를 해석하지 못했습니다.')}}
function uploadSheet_(){
  const name='_UPLOAD_CACHE';let sh=ss_().getSheetByName(name);
  if(!sh){sh=ss_().insertSheet(name);sh.getRange(1,1,1,6).setValues([['업로드ID','구분','순번','전체','데이터','등록시각']]);sh.hideSheet()}
  return sh;
}
function purgeUploads_(){
  const sh=uploadSheet_(),last=sh.getLastRow();if(last<2)return;
  const cutoff=Date.now()-30*60*1000,rows=sh.getRange(2,1,last-1,6).getValues(),keep=rows.filter(r=>{const t=r[5] instanceof Date?r[5].getTime():new Date(r[5]).getTime();return !t||t>=cutoff});
  sh.getRange(2,1,last-1,6).clearContent();if(keep.length)sh.getRange(2,1,keep.length,6).setValues(keep);
}
function uploadBegin_(q){
  requireSession_(q.token);const id=cleanUploadId_(q.uploadId),total=Math.max(1,Number(q.total)||1),bytes=Math.max(0,Number(q.bytes)||0),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{purgeUploads_();const sh=uploadSheet_(),last=sh.getLastRow();if(last>1){const rows=sh.getRange(2,1,last-1,6).getValues(),keep=rows.filter(r=>String(r[0])!==id);sh.getRange(2,1,last-1,6).clearContent();if(keep.length)sh.getRange(2,1,keep.length,6).setValues(keep)}sh.appendRow([id,'META',-1,total,JSON.stringify({tokenHash:hash_(q.token),bytes:bytes}),new Date()]);return{ok:true,uploadId:id,total:total}}finally{lock.releaseLock()}
}
function uploadChunk_(q){
  requireSession_(q.token);const id=cleanUploadId_(q.uploadId),idx=Number(q.index);if(!Number.isInteger(idx)||idx<0)throw new Error('잘못된 업로드 조각입니다.');const data=String(q.data||'');if(!data)throw new Error('빈 업로드 조각입니다.');const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{const sh=uploadSheet_(),last=sh.getLastRow(),rows=last>1?sh.getRange(2,1,last-1,6).getValues():[],found=rows.some(r=>String(r[0])===id&&String(r[1])==='CHUNK'&&Number(r[2])===idx);if(!found)sh.appendRow([id,'CHUNK',idx,'',data,new Date()]);return{ok:true,index:idx}}finally{lock.releaseLock()}
}
function uploadCommit_(q){
  const session=requireSession_(q.token),id=cleanUploadId_(q.uploadId),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{const sh=uploadSheet_(),last=sh.getLastRow();if(last<2)throw new Error('업로드 자료가 없습니다.');const rows=sh.getRange(2,1,last-1,6).getValues(),mine=rows.filter(r=>String(r[0])===id),metaRow=mine.find(r=>String(r[1])==='META');if(!metaRow)throw new Error('업로드 세션이 만료되었습니다. 다시 시도하세요.');const meta=JSON.parse(String(metaRow[4]||'{}'));if(meta.tokenHash!==hash_(q.token))throw new Error('업로드 권한이 없습니다.');const total=Number(metaRow[3])||0,chunks=mine.filter(r=>String(r[1])==='CHUNK').sort((a,b)=>Number(a[2])-Number(b[2]));if(chunks.length!==total)throw new Error('업로드 데이터 일부가 누락되었습니다. '+chunks.length+'/'+total);for(let i=0;i<total;i++)if(Number(chunks[i][2])!==i)throw new Error('업로드 조각 순서가 올바르지 않습니다.');const encoded=chunks.map(r=>String(r[4]||'')).join('');const p=decodePayload_(encoded);p.token=q.token;const result=route_(p);const keep=rows.filter(r=>String(r[0])!==id);sh.getRange(2,1,last-1,6).clearContent();if(keep.length)sh.getRange(2,1,keep.length,6).setValues(keep);return result}finally{lock.releaseLock()}
}
function cleanUploadId_(v){const s=String(v||'').replace(/[^A-Za-z0-9_-]/g,'');if(!s)throw new Error('업로드 식별자가 없습니다.');return s}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}
function ss_(){const ss=SpreadsheetApp.getActiveSpreadsheet();if(!ss)throw new Error('Apps Script를 Google 스프레드시트에 연결된 프로젝트로 만들어주세요.');return ss}
function props_(){return PropertiesService.getScriptProperties()}
function hash_(text){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(text),Utilities.Charset.UTF_8);return bytes.map(b=>(b+256)%256).map(b=>('0'+b.toString(16)).slice(-2)).join('')}
function setup_(p){if(props_().getProperty('INITIALIZED')==='true')throw new Error('초기 설정이 이미 완료되었습니다.');const passwordHash=String(p.passwordHash||'');if(!/^[a-f0-9]{64}$/.test(passwordHash))throw new Error('관리자 비밀번호 정보를 확인하세요.');ensureSheets_();props_().setProperty('ADMIN_PASSWORD_HASH',passwordHash);props_().setProperty('INITIALIZED','true');writeSettings_({monthlyFee:20000,annualMonths:12,specialFeePerEvent:10000});appendAudit_('setup','관리자 초기 설정','시트 및 관리자 비밀번호 생성');return{ok:true,message:'초기 설정이 완료되었습니다.'}}
function login_(p){ensureInitialized_();const id=String(p.loginId||'').trim(),passwordHash=String(p.passwordHash||'');let profile;if(id==='admin'){if(passwordHash!==props_().getProperty('ADMIN_PASSWORD_HASH'))throw new Error('아이디 또는 비밀번호를 확인하세요.');profile={role:'admin',loginId:'admin',name:'한재식'}}else{const members=readMembers_();const m=members.find(x=>x.name===id);if(!m)throw new Error('아이디 또는 비밀번호를 확인하세요.');const last4=String(m.phone||'').replace(/\D/g,'').slice(-4);if(hash_(last4)!==passwordHash)throw new Error('아이디 또는 비밀번호를 확인하세요.');profile={role:'member',loginId:id,name:m.name,memberNo:m.memberNo}}
 const token=Utilities.getUuid()+Utilities.getUuid();saveSession_(token,profile);return{ok:true,token:token,profile:profile}}
function saveSession_(token,profile){const data={profile:profile,expiresAt:Date.now()+SESSION_SECONDS*1000};props_().setProperty(SESSION_PREFIX+token,JSON.stringify(data))}
function requireSession_(token){if(!token)throw new Error('로그인이 필요합니다.');const key=SESSION_PREFIX+token,raw=props_().getProperty(key);if(!raw)throw new Error('로그인 시간이 만료되었습니다. 다시 로그인하세요.');let data;try{data=JSON.parse(raw)}catch(e){props_().deleteProperty(key);throw new Error('로그인 정보가 손상되었습니다. 다시 로그인하세요.')}if(!data.expiresAt||Date.now()>data.expiresAt){props_().deleteProperty(key);throw new Error('로그인 시간이 만료되었습니다. 다시 로그인하세요.')}data.expiresAt=Date.now()+SESSION_SECONDS*1000;props_().setProperty(key,JSON.stringify(data));return data.profile}
function ensureInitialized_(){if(props_().getProperty('INITIALIZED')!=='true')throw new Error('Apps Script 초기 설정을 먼저 실행하세요.')}
function ensureSheets_(){const ss=ss_();Object.values(SHEETS).forEach(name=>{if(!ss.getSheetByName(name))ss.insertSheet(name)});initHeaders_()}
function initHeaders_(){const specs={
 [SHEETS.MEMBERS]:['회원번호','성명','직책','휴대전화','등번호','회비면제'],
 [SHEETS.REGULAR]:['회원번호','납부금액'],
 [SHEETS.SPECIAL]:['회원번호','경조사','상태'],
 [SHEETS.SETTINGS]:['항목','값'],
 [SHEETS.AUDIT]:['일시','사용자','작업','내용']};
 Object.keys(specs).forEach(name=>{const sh=ss_().getSheetByName(name);if(sh.getLastRow()===0){sh.getRange(1,1,1,specs[name].length).setValues([specs[name]]);sh.setFrozenRows(1);sh.getRange(1,1,1,specs[name].length).setFontWeight('bold').setBackground('#1d4ed8').setFontColor('#ffffff')}})}
function getAdminData_(s){if(s.role!=='admin')throw new Error('관리자 권한이 필요합니다.');return{ok:true,members:composeMembers_(),settings:readSettings_(),auditLogs:readAudit_()}}
function getMemberData_(s){if(s.role!=='member')throw new Error('회원 권한이 필요합니다.');const member=composeMembers_().find(m=>m.memberNo===s.memberNo);if(!member)throw new Error('회원정보를 찾을 수 없습니다.');return{ok:true,member,settings:readSettings_()}}
function saveAll_(s,p){if(s.role!=='admin')throw new Error('관리자 권한이 필요합니다.');const lock=LockService.getScriptLock();lock.waitLock(30000);try{const members=Array.isArray(p.members)?p.members:[];replaceMembers_(members);if(p.settings)writeSettings_(p.settings);appendAudit_(s.name||s.loginId,p.action||'전체자료 저장',p.details||members.length+'명');return{ok:true,count:members.length}}finally{lock.releaseLock()}}
function saveSettings_(s,p){if(s.role!=='admin')throw new Error('관리자 권한이 필요합니다.');const lock=LockService.getScriptLock();lock.waitLock(30000);try{writeSettings_(p.settings||{});appendAudit_(s.name||s.loginId,'환경설정 변경',JSON.stringify(p.settings||{}));return{ok:true}}finally{lock.releaseLock()}}
function replaceMembers_(members){ensureSheets_();const mSh=ss_().getSheetByName(SHEETS.MEMBERS),rSh=ss_().getSheetByName(SHEETS.REGULAR),sSh=ss_().getSheetByName(SHEETS.SPECIAL);[mSh,rSh,sSh].forEach(sh=>{if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent()});
 const visible=members.filter(m=>String(m.memberNo||'').padStart(3,'0')!=='000'&&m.name&&!String(m.role||'').includes('탈퇴'));
 if(visible.length){mSh.getRange(2,1,visible.length,6).setValues(visible.map(m=>[String(m.memberNo||'').padStart(3,'0'),m.name||'',m.role||'',m.phone||'',m.jersey||'',Boolean(m.regularExempt)]));rSh.getRange(2,1,visible.length,2).setValues(visible.map(m=>[String(m.memberNo||'').padStart(3,'0'),Number(m.regularPaid)||0]));const rows=[];visible.forEach(m=>(m.specialItems||[]).forEach(i=>rows.push([String(m.memberNo||'').padStart(3,'0'),i.event||'',i.status||'미납'])));if(rows.length)sSh.getRange(2,1,rows.length,3).setValues(rows)}
 [mSh,rSh,sSh].forEach(sh=>sh.autoResizeColumns(1,sh.getLastColumn()))}
function readMembers_(){ensureSheets_();const sh=ss_().getSheetByName(SHEETS.MEMBERS),n=sh.getLastRow();if(n<2)return[];return sh.getRange(2,1,n-1,6).getValues().filter(r=>r[0]&&r[1]).map(r=>({memberNo:String(r[0]).padStart(3,'0'),name:String(r[1]),role:String(r[2]||''),phone:String(r[3]||''),jersey:String(r[4]||''),regularExempt:Boolean(r[5])}))}
function composeMembers_(){const members=readMembers_(),regular=readRegular_(),special=readSpecial_();return members.map(m=>({...m,regularPaid:regular[m.memberNo]||0,specialItems:special[m.memberNo]||[]}))}
function readRegular_(){const sh=ss_().getSheetByName(SHEETS.REGULAR),n=sh.getLastRow(),map={};if(n>=2)sh.getRange(2,1,n-1,2).getValues().forEach(r=>{if(r[0])map[String(r[0]).padStart(3,'0')]=Number(r[1])||0});return map}
function readSpecial_(){const sh=ss_().getSheetByName(SHEETS.SPECIAL),n=sh.getLastRow(),map={};if(n>=2)sh.getRange(2,1,n-1,3).getValues().forEach(r=>{if(!r[0]||!r[1])return;const no=String(r[0]).padStart(3,'0');(map[no]||(map[no]=[])).push({event:String(r[1]),status:String(r[2]||'미납')})});return map}
function writeSettings_(o){ensureSheets_();const s={monthlyFee:Number(o.monthlyFee)||20000,annualMonths:Number(o.annualMonths)||12,specialFeePerEvent:Number(o.specialFeePerEvent)||10000},sh=ss_().getSheetByName(SHEETS.SETTINGS);if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,2).clearContent();sh.getRange(2,1,3,2).setValues([['monthlyFee',s.monthlyFee],['annualMonths',s.annualMonths],['specialFeePerEvent',s.specialFeePerEvent]])}
function readSettings_(){ensureSheets_();const sh=ss_().getSheetByName(SHEETS.SETTINGS),out={monthlyFee:20000,annualMonths:12,specialFeePerEvent:10000};if(sh.getLastRow()>=2)sh.getRange(2,1,sh.getLastRow()-1,2).getValues().forEach(r=>{if(r[0])out[String(r[0])]=Number(r[1])});return out}
function appendAudit_(actor,action,details){ensureSheets_();ss_().getSheetByName(SHEETS.AUDIT).appendRow([Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Seoul','yyyy-MM-dd HH:mm:ss'),actor,action,String(details||'')])}
function readAudit_(){const sh=ss_().getSheetByName(SHEETS.AUDIT),n=sh.getLastRow();if(n<2)return[];const start=Math.max(2,n-99);return sh.getRange(start,1,n-start+1,4).getDisplayValues().reverse().map(r=>({timestamp:r[0],actor:r[1],action:r[2],details:r[3]}))}
