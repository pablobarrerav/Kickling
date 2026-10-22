/* Kickling · avisos push del chat del equipo (lado del navegador). */
(function(){
  var C=window.KICKLING_CONFIG||{};if(!C.supabaseUrl)return;
  var VAPID='BOHnMM4OuqP3VRz7g7_trn9WzyZBYjIdZpykN7tE4X1hzWR1azuvbhD7cN3aB1vW6dle09blVqaoE2rPSe_iUBg';
  function b64(s){s=(s+'==='.slice((s.length+3)%4)).replace(/-/g,'+').replace(/_/g,'/');var r=atob(s),a=new Uint8Array(r.length);for(var i=0;i<r.length;i++)a[i]=r.charCodeAt(i);return a;}
  var ios=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  var standalone=!!(window.navigator.standalone||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches));
  window.KickPush={
    ok:function(){return !!(window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&window.Notification);},
    needsInstall:function(){return ios&&!standalone;},
    /* ask=true solo desde un toque del jugador (pide el permiso). Devuelve la suscripción o null. */
    sub:async function(ask){
      if(!this.ok())return null;
      var reg=await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;
      if(Notification.permission!=='granted'){if(!ask||Notification.permission==='denied')return null;if(await Notification.requestPermission()!=='granted')return null;}
      var s=await reg.pushManager.getSubscription();
      if(!s)s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID)});
      return JSON.parse(JSON.stringify(s));
    },
    unsub:async function(){try{var reg=await navigator.serviceWorker.getRegistration();var s=reg&&await reg.pushManager.getSubscription();if(s)await s.unsubscribe();}catch(e){}}
  };
})();
