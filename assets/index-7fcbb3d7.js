(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const t of r)if(t.type==="childList")for(const s of t.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&a(s)}).observe(document,{childList:!0,subtree:!0});function c(r){const t={};return r.integrity&&(t.integrity=r.integrity),r.referrerPolicy&&(t.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?t.credentials="include":r.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function a(r){if(r.ep)return;r.ep=!0;const t=c(r);fetch(r.href,t)}})();const y="modulepreload",w=function(e,i){return new URL(e,i).href},m={},f=function(i,c,a){if(!c||c.length===0)return i();const r=document.getElementsByTagName("link");return Promise.all(c.map(t=>{if(t=w(t,a),t in m)return;m[t]=!0;const s=t.endsWith(".css"),g=s?'[rel="stylesheet"]':"";if(!!a)for(let u=r.length-1;u>=0;u--){const d=r[u];if(d.href===t&&(!s||d.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${t}"]${g}`))return;const l=document.createElement("link");if(l.rel=s?"stylesheet":y,s||(l.as="script",l.crossOrigin=""),l.href=t,document.head.appendChild(l),s)return new Promise((u,d)=>{l.addEventListener("load",u),l.addEventListener("error",()=>d(new Error(`Unable to preload CSS for ${t}`)))})})).then(()=>i())};let o=document.querySelector(".vue-loading"),n=document.querySelector(".map-loading");b()?(o&&(o.innerText="Loading Vue containers..."),n&&(n.innerText="Loading Map..."),f(()=>import("./createMap-bde18538.js"),["./createMap-bde18538.js","./config-97e8255f.js","./generateShortRandomId-5b3cc791.js","./createMap-fe227fe9.css"],import.meta.url).then(({default:e})=>{n==null||n.remove(),n=null,window.mapOwner=e(),h()}).catch(e=>{console.error(e),n==null||n.remove(),n=null,p(e)}),f(()=>import("./startVue-e5598e90.js"),["./startVue-e5598e90.js","./generateShortRandomId-5b3cc791.js","./config-97e8255f.js","./startVue-c846d616.css"],import.meta.url).then(({default:e})=>{o==null||o.remove(),o=null,e(),h()}).catch(e=>{console.error(e),o==null||o.remove(),o=null,p(e)}),f(()=>import("./createFuzzySearcher-955d7802.js"),["./createFuzzySearcher-955d7802.js","./config-97e8255f.js"],import.meta.url).then(({default:e})=>{window.fuzzySearcher=e()})):document.body.innerHTML=`<div class='no-webgl'>
    <h4>WebGL is not enabled :(</h4>
    <p>This website needs <a href='https://en.wikipedia.org/wiki/WebGL' class='critical'>WebGL</a> to render a map of GitHub.
    </p> <p>
    You can try another browser. If the problem persists - very likely your video card isn't supported.
    </p>
  </div>`;function h(){var e;!o&&!n&&((e=document.querySelector(".boot"))==null||e.remove())}function b(){try{const e=document.createElement("canvas");return!!window.WebGLRenderingContext&&(e.getContext("webgl")||e.getContext("experimental-webgl"))}catch{return!1}}function p(e){document.body.innerHTML=`<div class='no-webgl'>
    <h4>Something went wrong :(</h4>
    <p>
      Please try to reload the page. If the problem persists, please <a href='https://github.com/anvaka/map-of-github/issues' class='critical'>let me know</a>.
    </p>
    <p>
    The error message was: <pre class="error"></pre>
    </p>
  </div>`,document.querySelector(".error").innerText=e.message}console.log("%c 👋 Hello there!","font-size: 24px; font-weight: bold;");console.log("Thank you for checking out source code. You can read it here: ");console.log("https://github.com/anvaka/map-of-github");console.log("If you have any questions, please let me know");export{f as _};
//# sourceMappingURL=index-7fcbb3d7.js.map
