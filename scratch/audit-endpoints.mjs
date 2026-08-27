const BASE='http://127.0.0.1:3000';
const userId='audit-user-001';
const run = async () => {
  const out=[];
  const req = async (path, opt={}) => {
    const r = await fetch(BASE+path,{headers:{'content-type':'application/json',...(opt.headers||{})},method:opt.method||'GET',body:opt.body?JSON.stringify(opt.body):undefined});
    let j=null; try{j=await r.json();}catch{}
    out.push({path, status:r.status, ok:r.ok, body:j});
    return {r,j};
  };

  // auth family
  const ts = Date.now();
  const email=`audit_${ts}@example.com`;
  const password='Password123!';
  await req('/api/auth/signup',{method:'POST',body:{name:'Audit User',email,password}});
  const login=await req('/api/auth/login',{method:'POST',body:{email,password}});
  const token=login.j?.sessionToken || '';
  await req('/api/auth/me',{headers: token ? {Authorization:`Bearer ${token}`} : {}});

  // learn/dashboard family
  const session=await req('/api/learn/session',{method:'POST',body:{userId}});
  const learnToken=session.j?.token || '';
  await req(`/api/dashboard/analytics/${encodeURIComponent(userId)}`,{headers: learnToken ? {Authorization:`Bearer ${learnToken}`} : {}});

  // roadmap
  await req('/api/roadmap/generate',{method:'POST',body:{goal:'SDE preparation',timeline:'8 weeks',level:'intermediate'}});

  // problems
  await req('/api/problems');
  await req('/api/problems?company=google&category=arrays');

  // execute run/sql
  await req('/api/execute/run',{method:'POST',body:{language:'python',code:'print(1+1)',stdin:''}});
  await req('/api/execute/sql',{method:'POST',body:{query:'SELECT 1 as ok;'}});

  // ai
  await req('/api/ai/mentor',{method:'POST',body:{problemTitle:'Two Sum',actionType:'hint',category:'arrays',codeSnippet:'function twoSum(nums,target){}'}});

  // profile family probe
  await req('/api/profile/me',{headers: token ? {Authorization:`Bearer ${token}`} : {}});

  for (const row of out) {
    const reason = row.body?.reason || row.body?.error || row.body?.errorType || row.body?.message || '';
    console.log(`${row.status} ${row.path}${reason ? ' -> ' + reason : ''}`);
  }
};
run().catch(e=>{console.error(e); process.exit(1);});
