const {chromium}=require(process.env.PLAYWRIGHT_PATH);
const fs=require('node:fs');
const base='http://localhost:3100', out='artifacts/site-audit';
fs.mkdirSync(out,{recursive:true});
(async()=>{
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
await context.addInitScript(()=>localStorage.setItem('toymak-popup-dismissed-v2','true'));
const page=await context.newPage(); let errors=[]; const results=[];
page.on('pageerror',e=>errors.push(e.message));
const catalog=await (await context.request.get(base+'/api/products')).json();
const routes=['/','/shop','/cart','/checkout','/wishlist','/track-order','/size-guide','/faq','/our-story','/returns','/privacy','/terms','/unsubscribe','/checkout/success','/admin/login','/not-a-real-page'];
if(catalog.products?.[0]) routes.push('/product/'+catalog.products[0].id);
for(const width of [320,375,768,1024,1440]){
await page.setViewportSize({width,height:900});
for(const route of routes){
errors=[];
const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(600);
const details=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,wide:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&(r.right>innerWidth+2||r.left< -2)&&!el.closest('[aria-hidden="true"]')}).slice(0,8).map(el=>({tag:el.tagName,text:el.textContent?.trim().slice(0,60),class:el.className})),brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.getAttribute('src')),h1:document.querySelector('h1')?.textContent}));
results.push({width,route,status:response.status(),errors:[...errors],...details});
fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
if(details.overflow||errors.length||(route==='/'&&[375,768,1440].includes(width)))await page.screenshot({path:out+'/'+width+'-'+route.replace(/[^a-z0-9]/gi,'_')+'.png',fullPage:true});
console.log(JSON.stringify({width,route,status:response.status(),overflow:details.overflow,errors}));
}}
await page.setViewportSize({width:667,height:375});
await page.goto(base+'/?popup=1'); await page.getByRole('dialog').waitFor({timeout:20000});
results.push({scenario:'short-screen-popup',close:await page.getByRole('button',{name:'Close',exact:true}).boundingBox(),viewport:page.viewportSize()});
await page.screenshot({path:out+'/popup-short.png'});
await page.evaluate(()=>localStorage.setItem('toymak-cart','{}'));errors=[];
await page.goto(base+'/cart');await page.waitForTimeout(800);
results.push({scenario:'corrupt-cart',errors:[...errors]});
fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
