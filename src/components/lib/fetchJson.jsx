const breaker = new Map(); // key -> { fails, openedUntil }

function isOpen(key){
  const st = breaker.get(key);
  return st && st.openedUntil && st.openedUntil > Date.now();
}

function fail(key){
  const st = breaker.get(key) || { fails:0 };
  st.fails = (st.fails||0)+1;
  if(st.fails >= 4){ st.openedUntil = Date.now()+2*60*1000; } // 2 min
  breaker.set(key, st);
}

function ok(key){ 
  breaker.set(key, { fails:0, openedUntil:0 }); 
}

export async function fetchJson(url, opts = {}){
  const key = new URL(url, window.location.origin).pathname;
  if(isOpen(key)) throw new Error('CIRCUIT_OPEN:'+key);
  
  let delay = 300;
  for(let i = 0; i < 3; i++){
    try{
      const r = await fetch(url, {...opts, cache:'no-store'});
      if(r.ok){ 
        ok(key); 
        return await r.json(); 
      }
      if(r.status >= 400 && r.status < 500) throw new Error(`HTTP_${r.status}`);
    }catch(e){
      if(i === 2){ 
        fail(key); 
        throw e; 
      }
    }
    await new Promise(s => setTimeout(s, delay + Math.random()*150));
    delay *= 2;
  }
}