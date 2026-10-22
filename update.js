/* Kickling · si GitHub Pages o el navegador sirven una copia vieja, recarga sola con la última versión. */
(function(){
  function cur(){var e=document.querySelector('.verl');var m=e&&/v(\d+)/.exec(e.textContent||'');return m?+m[1]:0;}
  function chk(){
    var c=cur();if(!c||!window.fetch)return;
    fetch(location.pathname+'?chk='+Date.now(),{cache:'no-store'}).then(function(r){return r.text();}).then(function(t){
      var m=/Kickling · v(\d+)/.exec(t),n=m?+m[1]:0;
      if(n>c){var k='kickling-reload-'+n;try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1');}catch(e){}
        location.replace(location.pathname+'?v='+n+'&t='+Date.now());}
    }).catch(function(){});
  }
  window.addEventListener('load',function(){setTimeout(chk,2500);});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(chk,500);});
})();
