
/*


    ___         __              __       ____                  __
   /   | ____ _/ /______ ______/ /_     / __ \____ _____  ____/ /__  __  __
  / /| |/ __ `/ //_/ __ `/ ___/ __ \   / /_/ / __ `/ __ \/ __  / _ \/ / / /
 / ___ / /_/ / ,< / /_/ (__  ) / / /  / ____/ /_/ / / / / /_/ /  __/ /_/ /
/_/  |_\__,_/_/|_|\__,_/____/_/ /_/  /_/    \__,_/_/ /_/\__,_/\___/\__, /
                                                                  /____/

All Rights Reserved : Aakash Pandey : aakash.pandey@live.com : 2019-2020

SKYROUTES v2.0B


*/

let e=[],a=!0,t=!0;const s=async e=>{(await clients.matchAll()).forEach(a=>a.postMessage(e))};self.addEventListener("fetch",s=>{const i=new URL(s.request.url);if(i.origin===location.origin&&"navigate"===s.request.mode&&!i.pathname.includes(".")&&a){a=!0;var n=caches.match(location.origin+"/index.html");s.respondWith(n)}else e.includes(i.pathname)&&t&&s.respondWith(caches.match(i))}),self.addEventListener("message",async i=>{let n=i.data.req,l=i.data.data;if("ping"===n)s({req:"pong"});else if("touch"===n)(e=l||[]).push("/index.html","/lib/skyroutes.css","/lib/skyroutes.js","/main.js"),a=!0;else if("init"===n)(e=l||[]).push("/index.html","/lib/skyroutes.css","/lib/skyroutes.js","/main.js"),cache=await caches.open("2.0"),await cache.addAll(e),s({req:"load"});else if("upsw"===n){let e=await caches.keys();await Promise.all(e.map(e=>{if(!"2.0".includes(e))return caches.delete(e)})),self.skipWaiting()}else if("gracenav"===n)a=!1;else if("cacheoff"===n)t=!1;else if("cacheon"===n)t=!0;else if("atomic"===n){s({req:"cacheoff"});let a=await(async()=>{let a=[],t="";for(fname of e)if(cfile=await caches.match(fname))if(fname.endsWith(".js")||fname.endsWith(".css")||fname.endsWith(".json")||fname.endsWith(".txt")||fname.endsWith(".html")||fname.endsWith(".csv")||fname.includes("fonts")){cfile=await cfile.text();let e=await fetch(fname);e=await e.text(),"/main.js"===fname&&(t=e.toString()),cfile.toString()!=e.toString()&&a.push(fname)}else{cfile=await cfile.blob();let e=await fetch(fname,{method:"HEAD"});e=e.headers.get("content-length"),cfile.size!==parseInt(e)&&a.push(fname)}return a.includes("/main.js")?{new:a,raw:t}:{new:a}})();if(a.new.length>0)if(a.new.includes("/main.js")){let e=(e=>{try{return c=e.indexOf('"assets"'),e=e.slice(c),c=e.indexOf("["),e=e.slice(c),c=e.indexOf("]"),e=""===(e=(e=(e=e.slice(1,c)).includes("'")?e.split("'"):e.split('"')).filter(e=>e.includes("/")))||0===e.length?0:e}catch(e){return-1}})(a.raw);s({req:"fsync",data:{cmp:e,add:a.new}})}else s({req:"fsync",data:{add:a.new}});else s({req:"cacheon"}),setTimeout(()=>s({req:"load"}),600)}else"fsync"===n&&await(async e=>{let a=await caches.open("2.0");if(e.add&&e.add.length>0)for(x of e.add)await a.add(x);if(e.delete&&e.delete.length>0)for(x of e.delete)await a.delete(x);s({req:"cacheon"}),setTimeout(()=>s({req:"reboot"}),600)})(l)});
