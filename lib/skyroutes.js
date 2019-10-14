/*
    SKYROUTES 2.0.1

    Copyright © 2019 Aakash Pandey. All rights reserved.
    Use of this source code is governed by a license that can be
    found in the LICENSE file.

*/


const SW = {};
let Routes = {};
let AppHalt = false;
let AppReload = false;
let AppState = 0;
let AppManifest = {};
let SkyApp = {};

// Core

const southBridge = (rd) => {
    if (SW.new) {
        SW.new.postMessage({ req: rd.req, data: rd.data });

    } else if (SW.active) {
        SW.active.active.postMessage({ req: rd.req, data: rd.data });

    } else if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ req: rd.req, data: rd.data });

    } else {
        console.error("Service Worker missing, Something's wrong");
    }
}

const slotMain = async () => {
    let root = localStorage.Root;

    if (AppReload) { window.location.reload(); }
    if (AppError) { return; }

    let r = await fetch(`${root}app.html`);
    r = await r.text();
    document.querySelector('#sr_main').innerHTML = r;
    nav();
}

const scanUpdate = () => {
    if (localStorage.lastUpdate && parseInt(SkyApp.skyroutes.update_interval) > 0) {
        if (new Date().getTime() - parseInt(localStorage.lastUpdate) < (parseInt(SkyApp.skyroutes.update_interval) * 60000)) {
            return "touch";
        } else {
            splashScreen({ msg: "Updating app" });
            return "atomic";
        }

    } else if (parseInt(SkyApp.skyroutes.update_interval) === 0) {
        return "atomic";

    } else if (parseInt(SkyApp.skyroutes.update_interval) < 0) {
        return "touch"
    }
}


const painKiller = (e) => {
    if (Object.entries(SkyApp).length === 0) {
        return;

    } else if (SkyApp.skyroutes.hot_reload === "full") {
        window.location.reload();

    } else if (SkyApp.skyroutes.hot_reload === "silent" || SkyApp.skyroutes.hot_reload === "css") {
        if (SkyApp.skyroutes.hot_reload === "silent") {
            slotMain();
        }
        ss = document.getElementsByClassName('style');

        Array.from(ss).forEach(sss => {
            if (/Chrome/.test(navigator.userAgent)) {
                sss.href = sss.href;
            } else {
                let t = sss.href;
                sss.href = "";
                sss.href = t;
            }
        });
    }
}

window.onfocus = () => painKiller();


const appBoot = () => {

    SkyApp = JSON.parse(localStorage.SkyApp);
    let flow = scanUpdate();

    southBridge({
        req: flow,
        data: { manifest: SkyApp }
    });
    
    document.querySelector('#sr_intr img').src = SkyApp.icons[SkyApp.icons.length-1].src;
    document.querySelector('#sr_intr div').innerText = SkyApp.name;

    (flow === "touch") && slotMain();
    (flow === "atomic") && (localStorage.lastUpdate = new Date().getTime());

    if (!window.matchMedia('(display-mode: standalone)').matches && SkyApp.skyroutes.force_install === "true") {
        splashScreen({ msg: "Please add to homescreen" });
        AppError = true;
        return;
    }

    if (SkyApp.skyroutes.force_network === "true" && !navigator.onLine) {
        splashScreen({ msg: `Please check your internet connection` });
        AppError = true;
        return;
    }


}

const appInit = async () => {
    
    // fetch manifesr
    let rm = await fetch(`${location.pathname}manifest.json`);
    SkyApp = await rm.json();
    localStorage.SkyApp = JSON.stringify(SkyApp);
    localStorage.lastUpdate = new Date().getTime();
    localStorage.Root = location.pathname;

    document.querySelector('#sr_intr img').src = SkyApp.icons[SkyApp.icons.length-1].src;
    document.querySelector('#sr_intr div').innerText = SkyApp.name;

    slotMain();

    setTimeout(() => {
        southBridge({
            req: "init",
            data: { manifest: SkyApp }
        });
        localStorage.lastUpdate = new Date().getTime();
    }, 200);
}

const skyWorker = async () => {

    if ('serviceWorker' in navigator === false) {
        splashScreen({ msg: `💔 PWAs not supported, please update your browser.` });
        console.error('(💔) Service worker not supported, update your browser');
        return;
    }

    if (!navigator.serviceWorker.controller || !localStorage.SkyApp) {
        // init process

        SW.active = await navigator.serviceWorker.register(`${location.pathname}sw.js`).catch((e) => {
            console.error('Error Registering SW');
            splashScreen({ msg: `App init crashed` });
            return;
        });


        appInit();

    } else {

        appBoot();
        // events
        navigator.serviceWorker.addEventListener('message', e => {

            let req = e.data.req;
            let data = e.data.data;

            if (req === "load") {
                splashScreen();
                slotMain();

            } else if (req === "update") {

                if (data) {
                    localStorage.SkyApp = JSON.stringify(data);
                }

                localStorage.lastUpdate = new Date().getTime();

                splashScreen({ msg: "Updating app" });
                
                setTimeout(() => {
                    window.location.reload();
                }, 800);

            } else if (req === "error") {
                if (AppError === true) { return };
                splashScreen({ msg: data });
                AppHalt = true;
                AppError = true;
                setTimeout(() => {
                    appInit();

                }, 100)
            }
        });

        // service worker upgrade process legacy

        if (SW.active === undefined) {
            SW.active = await navigator.serviceWorker.register('sw.js');
        }

        if (SW.new = SW.active.waiting) {
            southBridge({ req: "upsw" });
        }

        SW.active.addEventListener('updatefound', () => {
            splashScreen({ msg: 'Updating app' });
            SW.new = SW.active.installing;
            SW.new.addEventListener('statechange', () => {
                if (SW.new.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('App upgrading...');
                    southBridge({ req: "upsw" });
                    southBridge({
                        req: 'init',
                        data: { manifest: SkyApp }
                    });
                    SW.active = SW.new;
                }
            });
        });
    }
}


// UI talk
const splashScreen = (req) => {

    if (AppError) {
        return;
    }

    if (!req) {
        document.querySelector('#sr_intr p').innerText = "";
        elState('sr_intr', 0);

    } else {
        AppHalt = true;
        document.querySelector('#sr_intr p').innerText = (req.msg) ? req.msg : "";
        elState('sr_intr', 1);
    }
}

// accepts element, state & silent (no anim for soft reboot)
const elState = (el, st, si) => {
    el = document.querySelector(`#${el}`);

    let cl = (si === undefined || si === 0) ? 'vis' : 'viss';

    if (st === undefined || st === 0) {
        el.classList.remove(cl);
        el.classList.add('rt');
    } else {
        (el.classList.contains('irt')) ? el.classList.toggle('irt') : null;
        el.classList.remove('rt');
        el.classList.add(cl);
    }

}

const buildRoutes = () => {
    let rts = {};
    let irt = document.querySelectorAll('.irt')[0].id;
    let rt = document.querySelectorAll('.rt');

    if (irt === undefined) {
        console.error('Initial route class (irt) not added to markup');
        return;
    }

    if (rt === undefined) {
        console.error('Route class (rt) not added to markup');
        return;
    }

    rts[""] = irt;
    rt.forEach(e => rts[e.id] = e.id);
    localStorage.Routes = JSON.stringify(rts);
    return rts;
}

const errRoute = (rt) => {
    (rt === undefined) && (rt = location.pathname.slice(1));
    if (SkyApp.skyroutes.route_error === "hold") {
        splashScreen({ msg: `Error 404 ${rt} Not Found` });
    } else if (SkyApp.skyroutes.route_error === "free") {
        southBridge({ req: 'gracenav' });
        window.location.href = window.location.href;
    }
}

const nav = (p) => {

    (Object.entries(Routes).length === 0) && (Routes = buildRoutes());
    (p) && ((p.includes('/')) && (p = p.replace('/', '')))
    let cr = (location.pathname.split('/').length === 3) ? location.pathname.split('/')[2] : location.pathname.slice(1);
    cr = (Routes[cr]) ? Routes[cr] : 0;
    let rt = (p !== undefined) ? Routes[p] : cr;
    (rt === undefined) && (rt = 0);

    if (cr !== 0) {
        prev = document.querySelector(`#${cr}`);
        cl = (prev.classList.contains('vis')) ? 'vis' : (prev.classList.contains('viss')) ? 'viss' : 0;
        if (cr === rt && cl === 0 && AppState === 1) {
            document.querySelectorAll('.vis').forEach((e) => { e.classList.remove('vis'); e.classList.add('rt') });
            document.querySelectorAll('.viss').forEach((e) => { e.classList.remove('viss') });
        } else if (cl !== 0 || AppHalt) {
            prev.classList.remove(cl);
            prev.classList.add('rt');
        }
    }

    if ((p || p === "") && AppState) {
        let rr = (p) ? p : (location.pathname.split('/').length === 3) ? location.pathname.split('/')[2] : location.pathname.slice(1);
        (p !== "" && rr !== "") ? (location.pathname.split('/').length === 3) ? history.pushState({ path: rr }, "SkyRoute", `${location.origin}/${location.pathname.split('/')[1]}/${rr}`)
            : history.pushState({ path: rt }, "SkyRoute", `/${rr}`)
            : (location.pathname.split('/').length === 3) ? history.pushState({ path: rr }, "SkyRoute", `${location.origin}/${location.pathname.split('/')[1]}/`)
                : history.pushState({ path: rr }, "SkyRoute", `/`);
    }

    (AppHalt) && splashScreen();
    (AppState === 0) && (AppState = 1);
    (rt !== 0) ? elState(rt, 1, 0) : errRoute(p);
    try { pathEvents(cr); } catch (e) { console.warn('pathEvents not declared'); }
}

window.addEventListener('load', () => {
    window.addEventListener('popstate', (e) => {
        nav();
    });
    console.warn("[SKYROUTES 2.1] TEST BENCH");
    skyWorker();
});


// DINO
const netMon = (st) => {
    if (Object.entries(SkyApp).length === 0) { return }

    if (SkyApp.skyroutes) {
        if (SkyApp.skyroutes.force_network === "true" && st === 0) {
            splashScreen({ msg: `Please check your internet connection` });
        } else if (SkyApp.skyroutes.force_network === "true" && st === 1) {
            splashScreen();
            if (Object.entries(Routes).length === 0 && !localStorage.panic) {
                localStorage.panic = "1";
                window.location.reload();
            }
        }
    }
}

(navigator.onLine) ? netMon(1) : netMon(0);

// check net at state
window.addEventListener('offline', () => {
    console.log('now offline');
    netMon(0)
});

window.addEventListener('online', () => { console.log('back online'); (AppError === true && SkyApp.skyroutes.force_network === "true") && (AppError = false); netMon(1); (localStorage.panic) && delete(localStorage.panic) });
