/* Append reviewed sources to the final script to preserve existing script indices and count. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),file=path.join(root,'index.html');
function source(){
 const modules=['geometry.cjs','panel.cjs'].map(name=>fs.readFileSync(path.join(__dirname,name),'utf8').trim());
 for(const text of modules)if(/<\/script/i.test(text))throw Error('Embedded mesh module contains a closing script tag.');
 return '/* BEGIN ACOUSTIC MESH EXPORT */\n'+modules.join('\n')+`\n(function(root){
 const host=root.document.getElementById('meshExport'),editor=root.__MEH_EDITOR__;
 if(host&&editor)root.MEHMeshExportPanel.init(host,{getDesign:()=>editor.designJSON(),exportButton:root.document.getElementById('export')});
 })(typeof globalThis!=='undefined'?globalThis:this);\n/* END ACOUSTIC MESH EXPORT */`;
}
function embed(){
 let html=fs.readFileSync(file,'utf8');const code=source();
 if(!html.includes('id="meshExport"')){
  const start=html.indexOf('<dialog id="exportDialog">'),end=html.indexOf('</dialog>',start);
  if(start<0||end<0)throw Error('Export dialog was not found.');
  html=html.slice(0,end)+'<details id="meshExport"></details>'+html.slice(end);
 }
 if(html.includes('/* BEGIN ACOUSTIC MESH EXPORT */'))html=html.replace(/\/\* BEGIN ACOUSTIC MESH EXPORT \*\/[\s\S]*?\/\* END ACOUSTIC MESH EXPORT \*\//,()=>code);
 else{const end=html.lastIndexOf('</script>');if(end<0)throw Error('Final editor script was not found.');html=html.slice(0,end)+'\n'+code+html.slice(end);}
 // Migrate the first prototype's separate block without changing any prior script body.
 html=html.replace(/<\/script><script>(\/\* BEGIN ACOUSTIC MESH EXPORT \*\/)/,'\n$1');
 fs.writeFileSync(file,html);return html;
}
if(require.main===module)embed();module.exports={source,embed};
