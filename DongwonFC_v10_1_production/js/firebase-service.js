import { initializeApp, getApps, deleteApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, onSnapshot, writeBatch, serverTimestamp, addDoc } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig, APP_CONFIG } from './firebase-config.js?v=10.1.0';

export function isConfigured(){ return firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('PASTE_'); }
if(!isConfigured()) console.warn('Firebase 설정이 아직 입력되지 않았습니다.');
export const app = isConfigured() ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export { APP_CONFIG, doc, getDoc, setDoc, getDocs, collection, onSnapshot, writeBatch, serverTimestamp, onAuthStateChanged };


export async function writeAudit(action, details={}){
  if(!db || !auth?.currentUser) return;
  try{
    await addDoc(collection(db,'auditLogs'),{
      action,
      details,
      actorUid:auth.currentUser.uid,
      actorEmail:auth.currentUser.email||'',
      createdAt:serverTimestamp()
    });
  }catch(e){ console.warn('감사 로그 저장 실패',e); }
}
export async function loginWithId(loginId,password,keep){
  if(!isConfigured()) throw new Error('FIREBASE_NOT_CONFIGURED');
  await setPersistence(auth, keep ? browserLocalPersistence : browserSessionPersistence);
  let email;
  if(loginId===APP_CONFIG.adminLoginId){ email=APP_CONFIG.adminEmail; }
  else {
    const hash=await sha256(loginId.trim());
    const snap=await getDoc(doc(db,'loginIndex',hash));
    if(!snap.exists() || snap.data().active===false) throw new Error('INVALID_LOGIN');
    email=snap.data().email;
  }
  const cred=await signInWithEmailAndPassword(auth,email,password);
  const profile=await getDoc(doc(db,'users',cred.user.uid));
  if(!profile.exists()) { await signOut(auth); throw new Error('PROFILE_MISSING'); }
  return {user:cred.user, profile:profile.data()};
}
export async function logoutFirebase(){ if(auth) await signOut(auth); location.replace('./index.html'); }
export async function currentProfile(){
  if(!auth?.currentUser) return null;
  const s=await getDoc(doc(db,'users',auth.currentUser.uid));
  return s.exists()?s.data():null;
}
export function waitForAuth(){ return new Promise(resolve=>onAuthStateChanged(auth,u=>resolve(u))); }
export async function requireRole(role){
  if(!isConfigured()){location.replace('./setup.html');return null}
  const u=await waitForAuth(); if(!u){location.replace('./index.html');return null}
  const p=await currentProfile(); if(!p || p.role!==role){location.replace(p?.role==='admin'?'./admin.html':'./member.html');return null}
  return {user:u,profile:p};
}
export async function sha256(text){
  const bytes=new TextEncoder().encode(text); const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export function memberEmail(memberNo){ return `${String(memberNo).padStart(3,'0')}@${APP_CONFIG.memberEmailDomain}`; }
export async function createMemberAuth(member,password){
  const secondary=initializeApp(firebaseConfig,`provision-${Date.now()}-${Math.random()}`);
  const secondaryAuth=getAuth(secondary);
  try{ return (await createUserWithEmailAndPassword(secondaryAuth,memberEmail(member.memberNo),password)).user; }
  finally{ try{await signOut(secondaryAuth)}catch(e){} await deleteApp(secondary); }
}
