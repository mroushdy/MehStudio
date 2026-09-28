const fs=require('node:fs'),vm=require('node:vm');
module.exports=function load(file=process.argv[2]||require('node:path').join(__dirname,'../index.html')){
 const html=fs.readFileSync(file,'utf8'),scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 const context={console,setTimeout,clearTimeout,performance};context.window=context;vm.createContext(context);
 for(let i=0;i<scripts.length;i++)new vm.Script(scripts[i],{filename:`script-${i}.js`});
 for(let i=1;i<=10;i++)vm.runInContext(scripts[i],context,{filename:`script-${i}.js`});
 vm.runInContext(scripts[12],context);return {context,html,scripts};
};
