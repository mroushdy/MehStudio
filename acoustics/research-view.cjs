/* Presentation preference only: never changes acoustic inputs or geometry. */
module.exports=function createResearchView(root){
'use strict';
function init(workspace,panel){
 const buttons=[...workspace.querySelectorAll('[data-research-mode]')];
 const advanced=[...workspace.querySelectorAll('[data-research-advanced]')];
 let mode='simple';
 try{if(root.localStorage?.getItem('meh-analysis-view')==='advanced')mode='advanced';}catch{}
 function setMode(next){
  mode=next==='advanced'?'advanced':'simple';workspace.dataset.researchMode=mode;
  for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.researchMode===mode));
  for(const element of advanced)element.hidden=mode!=='advanced';
  panel?.setViewMode(mode);
  try{root.localStorage?.setItem('meh-analysis-view',mode);}catch{}
 }
 for(const button of buttons)button.addEventListener('click',()=>setMode(button.dataset.researchMode));
 setMode(mode);return {setMode,get mode(){return mode;}};
}
return {init};
};
