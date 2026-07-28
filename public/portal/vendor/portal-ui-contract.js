(function(){
"use strict";
window.SirkPortalUiContract=window.SirkPortalUiContract||{};
window.SirkPortalUiContract.decorate=function(root){
  if(!root)return;
  root.querySelectorAll(".sirk-standalone-card,.sirk-card").forEach(function(node){node.classList.add("sirk-card");});
  root.querySelectorAll("button").forEach(function(node){if(!node.classList.contains("sirk-button"))node.classList.add("sirk-button");});
};

function loadAsset(id,name){
  if(document.getElementById(id))return;
  var url=new URL(window.__SIRK_PLATFORM_API_BASE__||"pluginadmin.ashx",window.location.href);
  url.searchParams.set("pin","SIRKPortal");
  url.searchParams.set("asset","vendor/sirk-portal/"+name);
  url.searchParams.set("v",String(window.__SIRK_PLATFORM_PORTAL_VERSION__||window.__SIRK_PLATFORM_VERSION__||""));
  var script=document.createElement("script");
  script.id=id;
  script.src=url.href;
  script.async=false;
  (document.head||document.documentElement).appendChild(script);
}

loadAsset("sirk-update-release-theme-fix","update-release-theme-fix.js");
loadAsset("sirk-settings-primary-navigation","settings-primary-navigation.js");
loadAsset("sirk-overview-navigation","overview-navigation.js");
})();
