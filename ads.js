// Google Ad Manager display inventory. A CMP must be installed for production
// traffic where the publisher's consent rules require it.
(()=>{
  // Give every game page the same two desktop rails and two mobile banner slots.
  const existingKinds=kind=>document.querySelectorAll(`[data-ad-placement="${kind}"]`).length;
  const style=document.createElement('style');style.textContent='@media(min-width:1281px){.site-ad-side{display:grid;position:fixed;top:50%;transform:translateY(-50%);z-index:3;width:160px;min-height:600px;place-items:center}.site-ad-side.left{left:4px}.site-ad-side.right{right:4px}.site-ad-mobile{display:none!important}}@media(max-width:1280px){.site-ad-side{display:none!important}.site-ad-mobile{display:grid;position:relative;z-index:2;min-height:64px;width:100%;place-items:center}.site-ad-mobile.bottom{margin-top:20px}}';document.head.append(style);
  const addSlot=(id,kind,classes)=>{const shell=document.createElement('aside');shell.className=classes;shell.style.display='none';shell.setAttribute('aria-label','Publicidad');const slot=document.createElement('div');slot.id=id;slot.dataset.adPlacement=kind;shell.append(slot);document.body.append(shell)};
  if(!existingKinds('side')){addSlot('site-ad-left','side','site-ad-side left');addSlot('site-ad-right','side','site-ad-side right')}
  if(!existingKinds('mobile')){addSlot('site-ad-mobile-top','mobile','site-ad-mobile top');addSlot('site-ad-mobile-bottom','mobile','site-ad-mobile bottom')}
  const placements=[...document.querySelectorAll('[data-ad-placement]')];
  if(!placements.length)return;
  const waitForCmp=()=>new Promise(resolve=>{
    const cfg=window.__adConfig;
    if(!cfg?.requireCmp)return resolve(true);
    if(typeof window.__tcfapi!=='function')return resolve(false);
    let done=false;const finish=value=>{if(done)return;done=true;resolve(value)};
    try{window.__tcfapi('getTCData',2,(data,success)=>finish(!!success&&!!data));setTimeout(()=>finish(false),2500)}catch{finish(false)}
  });
  fetch('/api/ads/config',{credentials:'same-origin'}).then(r=>r.json()).then(async cfg=>{
    window.__adConfig=cfg;
    if(!cfg.enabled||!await waitForCmp())return;
    document.querySelectorAll('.site-ad-side,.site-ad-mobile').forEach(el=>el.style.display='grid');
    if(!window.googletag){window.googletag={cmd:[]};const loader=document.createElement('script');loader.async=true;loader.crossOrigin='anonymous';loader.src='https://securepubads.g.doubleclick.net/tag/js/gpt.js';document.head.appendChild(loader)}
    const pathFor=kind=>cfg.units?.[kind];
    const ready=placements.filter(el=>pathFor(el.dataset.adPlacement)&&el.getClientRects().length>0);
    if(!ready.length)return;
    let attempts=0;
    while(!window.googletag?.apiReady&&attempts++<30)await new Promise(resolve=>setTimeout(resolve,100));
    if(!window.googletag?.apiReady)return;
    const gt=window.googletag;gt.cmd=gt.cmd||[];
    gt.cmd.push(()=>{
      const mapping=(kind)=>{
        const b=gt.sizeMapping();
        if(kind==='side')b.addSize([1000,0],[[300,600],[160,600]]).addSize([0,0],[]);
        else if(kind==='mobile')b.addSize([0,0],[[320,100],[320,50],[300,250]]);
        else b.addSize([900,0],[[970,250],[728,90],[336,280],[300,250]]).addSize([0,0],[[336,280],[300,250]]);
        return b.build();
      };
      const slots=[];
      ready.forEach((el,i)=>{
        const kind=el.dataset.adPlacement,sizeMap=mapping(kind),sizes=kind==='side'?[[300,600],[160,600]]:kind==='mobile'?[[320,100],[320,50],[300,250]]:[[970,250],[728,90],[336,280],[300,250]];
        el.setAttribute('aria-label','Publicidad');
        el.style.display='grid';el.style.placeItems='center';
        if(kind==='content')el.style.minHeight='250px';
        const slot=gt.defineSlot(pathFor(kind),sizes,el.id||`ad-slot-${i}`);
        if(slot){slot.defineSizeMapping(sizeMap).addService(gt.pubads());slots.push(slot)}
      });
      if(!slots.length)return;
      gt.pubads().addEventListener('slotRenderEnded',event=>{
        if(!event.isEmpty)return;
        const el=document.getElementById(event.slot.getSlotElementId());
        if(el)(el.closest('.ad')||el).style.display='none';
      });
      gt.pubads().enableLazyLoad({fetchMarginPercent:200,renderMarginPercent:100,mobileScaling:1.5});
      gt.pubads().collapseEmptyDivs(true);
      gt.enableServices();slots.forEach(slot=>gt.display(slot.getSlotElementId()));
    });
  }).catch(()=>{});
})();
