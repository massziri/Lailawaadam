'use strict';
const get = id => document.getElementById(id);
const login = get('login'), dashboard = get('dashboard'), notice = get('notice');
let rows = [];
async function request(body) {
  const r = await fetch('/api/rsvp',body ? {method:'POST',headers:{'Content-Type':'application/json','X-RSVP-Request':'1'},body:JSON.stringify(body)} : {cache:'no-store'});
  return [r.status, await r.json()];
}
function render() {
  const list = get('rows'); list.replaceChildren();
  const filter = get('filter').value;
  const yes = rows.filter(r=>r.attendance==='yes');
  get('total').textContent = `الردود: ${rows.length} · التأكيدات: ${yes.length} · الاعتذارات: ${rows.length-yes.length} · عدد الحاضرين: ${yes.reduce((n,r)=>n+r.guests,0)}`;
  for (const row of rows.filter(r=>filter==='all'||r.attendance===filter)) {
    const tr = document.createElement('tr');
    for (const [i,v] of [row.name,row.phone,row.email || "—",row.attendance==='yes'?'حضور':'اعتذار',row.guests,new Date(row.updated).toLocaleString('ar-MA',{timeZone:'Africa/Casablanca'})].entries()) {
      const td = tr.insertCell(); td.textContent = v; if(i===1||i===2) td.dir='ltr';
    }
    const remove = document.createElement('button'); remove.type='button'; remove.textContent='حذف';
    remove.addEventListener('click',async()=>{
      if(!confirm(`حذف ردّ ${row.name}؟`)) return;
      remove.disabled=true;
      try {const [code] = await request({action:'delete', id:row.id}); if(code!==200 && code!==401) throw new Error(); await refresh();}
      catch {notice.textContent='تعذّر حذف الردّ.'; remove.disabled=false;}
    });
    tr.insertCell().append(remove); list.append(tr);
  }
}
async function refresh(){
  notice.textContent='';
  try {
    const [code,data]=await request();
    if(code===200){rows=data.rows;render();dashboard.hidden=false;login.hidden=true;return;}
    rows=[];render();dashboard.hidden=true;login.hidden=code!==401;
    if(code!==401) notice.textContent='خدمة الردود غير متاحة حاليًا.';
  } catch {notice.textContent='تعذّر الاتصال بالخادم.';}
}
login.addEventListener('submit',async e=>{
  e.preventDefault(); const field=get('password'), button=login.querySelector('button'); button.disabled=true;
  try {
    const [code]=await request({action:'login',password:field.value}); field.value='';
    if(code===200) await refresh();
    else notice.textContent=code===429?'محاولات كثيرة. حاولوا لاحقًا.':code===401?'كلمة المرور غير صحيحة.':'تعذّر تسجيل الدخول.';
  } catch {notice.textContent='تعذّر الاتصال بالخادم.';} finally {button.disabled=false;}
});
get('logout').onclick=async()=>{try {const [code]=await request({action:'logout'}); if(code!==200) throw new Error(); await refresh();} catch {notice.textContent='تعذّر تسجيل الخروج.';}};
get('refresh').onclick=refresh;
get('filter').onchange=render;
window.addEventListener('pageshow',e=>{if(e.persisted) refresh();});
refresh();
