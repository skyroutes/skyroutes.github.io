/*
    SKYROUTES 2.0.1

    Copyright © 2019 Aakash Pandey. All rights reserved.
    Use of this source code is governed by a license that can be
    found in the LICENSE file.

*/


const force_upgrade_string = "Let there be drums";
const sr_version = "2.1";
let AppCache = [];
let AppManifest;
let NewAppManifest;

let grab_navigation = true;
let app_error = false;

let serve_cache = true;

let leak;
let leaks = [];


const northBridge = async (data) => {
    let cl = await clients.matchAll();
    cl.forEach(c => c.postMessage(data));
};


// DATA MANAGEMENT

const cacheManger = async (dact) => {
    // turn off cache serve

    let cache = await caches.open(sr_version);

    if (dact.add) {
        if (dact.add.length > 0) {
            for (x of dact.add) {
                await cache.add(x);
                console.log(`♻ ${x} synced`);
            }
        }
    }

    if (dact.delete) {
        if (dact.delete.length > 0) {
            for (x of dact.delete) {
                await cache.delete(x);
                console.log(`🔥 ${x} purged`);
            }
        }
    }

    serve_cache = true;
    AppCache = [];
    let cc = await caches.open(sr_version);
    let curr = await cc.keys();
    curr.forEach((e => AppCache.push(e.url.replace(location.origin, ''))));

    northBridge({ req: 'update', data: NewAppManifest })

}

const assetScanner = async (iadd) => {

    let root = location.pathname.replace('sw.js', '');
    let fresh = [];
    NewAppManifest.skyroutes.assets.map(e => (root==='/') ? fresh.push(`${e}`):fresh.push(`${root}${e}`));

    fresh.push(`${root}index.html`, `${root}lib/skyroutes.css`, `${root}lib/skyroutes.js`);

    let ir = [];
    let ia = [];

    if (AppCache.toString !== fresh.toString()) {
        ir = AppCache.filter((e) => (!fresh.includes(e)));
        ia = fresh.filter((e) => (!AppCache.includes(e)));

    }

    if (iadd) { ia = ia.concat(iadd) }

    if (ia.length !== 0 || ir.length !== 0) {

        cacheManger({ delete: ir, add: ia });

    } else {

        (JSON.stringify(AppManifest) !== JSON.stringify(NewAppManifest)) ? northBridge({ req: 'update', data: NewAppManifest }) : northBridge({ req: 'load' });
        serve_cache = true;
    }
}

const diff = async () => {
    serve_cache = false;

    let nf = [];

    for (fname of AppCache) {
        if (cfile = await caches.match(fname)) {
            if (fname.endsWith('.js') || fname.endsWith('.css') || fname.endsWith('.json') || fname.endsWith('.txt') || fname.endsWith('.html') || fname.endsWith('.csv') || fname.includes('fonts')) {
                cfile = await cfile.text();
                let r = await fetch(fname);
                r = await r.text();
                (cfile.toString() != r.toString()) ? nf.push(fname) : console.log(`🍏 ${fname} Up to date`);
            } else {
                cfile = await cfile.blob();
                let r = await fetch(fname, { method: 'HEAD' });
                r = r.headers.get('content-length');
                (cfile.size !== parseInt(r)) ? nf.push(fname) : console.log(`🍏 ${fname} Up to date`);
            }
        }
    }

    assetScanner(nf);
}

// Events

self.addEventListener('message', async (e) => {

    let req = e.data.req;
    let data = e.data.data;

    if (req === 'init') {

        AppManifest = data.manifest;
        let root = location.pathname.replace('sw.js', '');
        AppCache = [];
        AppManifest.skyroutes.assets.forEach(a => (root==='/') ? AppCache.push(`${a}`):AppCache.push(`${root}${a}`));
        AppCache.push(`${root}index.html`, `${root}lib/skyroutes.css`, `${root}lib/skyroutes.js`);

        cache = await caches.open(sr_version);

        try { await cache.addAll(AppCache); app_error = false }
        catch (e) {
            console.error('🛑 Asset file error '+e);
            app_error = true
            northBridge({ req: "error", data: "Asset Error" });
        }

        if (app_error === false){ 
            console.log('✅ [SkyRoutes] App Init completed');
            northBridge({ req: "update" });
        }
        

    } else if (req === 'atomic' || req === 'touch') {

        if (AppCache.length === 0) {
            let cc = await caches.open(sr_version);
            let curr = await cc.keys();
            curr.forEach((e => AppCache.push(e.url.replace(location.origin, ''))));
        }
    
        AppManifest = data.manifest;
        console.log('✅ [SkyRoutes] App running');

        if (req === 'atomic') {
    
            fetch('manifest.json').then((e) => {
                e.json().then((ee) => {
                    NewAppManifest = ee;
                    diff();
                });
            });
        }

    } else if (req === 'upsw') {
        let keys = await caches.keys();

        await Promise.all(
            keys.map((k) => {
                if (!sr_version.includes(k)) {
                    return caches.delete(k);
                }
            })
        );
        self.skipWaiting();

    } else if (req === 'ping') {
        northBridge({ req: "pong" });

    } else if (req === 'gracenav') {
        grab_navigation = false;

    }

});


//  jammer gen 5

self.addEventListener('fetch', async e => {

    leak = e;
    
    if (app_error) {console.error('🛑 [SkyRoutes] App Error, re-check manifest');northBridge({req:'error', data:'App Error, please try later'});}

    // source bounce
    if (e.request.referrer !== location.origin + "/" && ((e.request.url.includes(".html")) || (e.request.referrer.endsWith('.html')) || (e.request.url.endsWith('.css')) || (e.request.url.endsWith('.js')) || (e.request.url.endsWith('.json'))) && (e.request.referrer.replace(location.origin + '/', '') === "") ? true : false) {
        e.respondWith(new Response(`<html><script>window.location.href='${location.origin}${location.pathname.replace('sw.js', '')}'</script></html>`, {
            headers: { 'Content-Type': 'text/html' }
        }));
    }

    const url = new URL(e.request.url);

    // return index.html for paths

    leaks.push(url.pathname);
    
    if (!app_error && url.origin.includes(location.origin) && e.request.mode === "navigate" && (!url.pathname.includes(".")) && grab_navigation) {
        
        var r = caches.match(location.pathname.replace('sw.js', '') + 'index.html');
        try{
            e.respondWith(r)
        } catch (e) {}
    }

    if (AppCache.length === 0) {
        let cc = await caches.open(sr_version);
        let curr = await cc.keys();
        curr.forEach((e => AppCache.push(e.url.replace(location.origin, ''))));
    }

    // cache serve
    if (!app_error && AppCache.includes(url.pathname) && serve_cache) {
        console.log(`📦 ${url}`);
       try {
            e.respondWith(caches.match(url.pathname))
       } catch (e) {}

    } else {
        (!grab_navigation) && (grab_navigation = true);
        console.log(`🌐 ${url}`);     
    }
});
