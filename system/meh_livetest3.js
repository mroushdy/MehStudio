const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium').default;
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    args: chromium.args, executablePath: await chromium.executablePath(),
    headless: 'shell', defaultViewport: {width: 1280, height: 900}
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });

  await page.setRequestInterception(true);
  page.on('request', req => {
    if (/three\.min\.js/.test(req.url())) req.respond({contentType:'application/javascript', body: fs.readFileSync('node_modules/three/build/three.min.js','utf8')});
    else req.continue();
  });
  await page.goto('file://' + path.resolve('meh_studio_v4.html'), {waitUntil: 'load'});
  await page.evaluate(() => localStorage.clear());
  await page.reload({waitUntil: 'load'});
  await new Promise(r => setTimeout(r, 700));

  let pass = 0, fail = 0;
  const ck = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + name); ok ? pass++ : fail++; };

  ck('no JS errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));

  const simple = await page.evaluate(() => ({
    visibleParams: [...document.querySelectorAll('.param,.chk')].filter(e => !e.classList.contains('off') && e.offsetParent !== null).length,
    autoBox: document.getElementById('autoinfo').textContent.includes('AUTO-DERIVED'),
    fitRows: [...document.querySelectorAll('#checks td')].filter(td => /ring spacing|CD body/.test(td.textContent)).length,
    meshes: (() => { let n = 0; V3D.scene.traverse(o => { if (o.isMesh) n++; }); return n; })(),
    spin: V3D.spin,
  }));
  ck('simple mode: ≤16 visible inputs (got ' + simple.visibleParams + ')', simple.visibleParams <= 16);
  ck('AUTO-DERIVED box shown', simple.autoBox);
  ck('fit rows present in checks: ' + simple.fitRows, simple.fitRows >= 3);
  ck('3-D scene has horn + CD + drivers (meshes=' + simple.meshes + ')', simple.meshes >= 12);
  ck('idle auto-rotate on', simple.spin === true);

  // advanced toggle reveals the full set
  await page.click('#chk_adv');
  await new Promise(r => setTimeout(r, 250));
  const adv = await page.evaluate(() => ({
    visibleParams: [...document.querySelectorAll('.param,.chk')].filter(e => !e.classList.contains('off') && e.offsetParent !== null).length,
    autoBoxHidden: document.getElementById('autoinfo').style.display === 'none',
  }));
  ck('advanced reveals full set (got ' + adv.visibleParams + ')', adv.visibleParams >= 30);
  ck('auto box hidden in advanced', adv.autoBoxHidden);
  await page.click('#chk_adv');
  await new Promise(r => setTimeout(r, 250));

  // force a collision in ADVANCED mode (no auto-nudge): 4" mids jammed at L12=1"
  await page.select('#sel_shape', 'os');
  await page.select('#sel_midSel', 'm4');
  await page.click('#chk_adv');
  await new Promise(r => setTimeout(r, 250));
  await page.evaluate(() => {
    const set=(k,v)=>{const n=document.getElementById('num_'+k); n.value=v; n.dispatchEvent(new Event('change'));};
    set('mouthD',10); set('L12',1.0);
  });
  await new Promise(r => setTimeout(r, 300));
  const crowd = await page.evaluate(() => ({
    fitFail: [...document.querySelectorAll('#checks tr')].some(tr => /ring spacing|CD body/.test(tr.textContent) && tr.querySelector('.chip.fail')),
    redDriver: (() => { let red = false; V3D.scene.traverse(o => { if (o.isMesh && o.material.color && o.material.color.getHex() === 0xC8331D) red = true; }); return red; })(),
    mouthRed: document.getElementById('mouth').innerHTML.includes('var(--red)'),
  }));
  ck('crowded: fit check FAILs', crowd.fitFail);
  ck('crowded: 3-D driver painted red', crowd.redDriver);
  ck('crowded: mouth view flags red', crowd.mouthRed);

  // back to simple mode, 2" mids, Ø30: the realistic MEH recipe — clears
  await page.click('#chk_adv');
  await page.select('#sel_midSel', 'm2');
  await new Promise(r => setTimeout(r, 200));
  await page.evaluate(() => { const n = document.getElementById('num_mouthD'); n.value = 30; n.dispatchEvent(new Event('change')); });
  await new Promise(r => setTimeout(r, 300));
  const roomy = await page.evaluate(() =>
    ![...document.querySelectorAll('#checks tr')].some(tr => /ring spacing|CD body|woofer ring/.test(tr.textContent) && tr.querySelector('.chip.fail')));
  ck('Ø30" horn: fit clears', roomy);

  // 3-D pixel probe: drivers visible (grey bodies) on the OS horn
  const data = await page.evaluate(() => { render3d(); return V3D.renderer.domElement.toDataURL('image/png'); });
  fs.writeFileSync('v3d_v3.png', Buffer.from(data.split(',')[1], 'base64'));

  ck('no JS errors after interactions', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));

  await page.screenshot({path: 'shot3_top.png'});
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
