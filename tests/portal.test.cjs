const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const storage = new Map();
const context = vm.createContext({
 document: {querySelector:()=>({innerHTML:''}),querySelectorAll:()=>[]},
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 sessionStorage:{setItem(){},removeItem(){},getItem(){return null;}},
 window:{scrollTo(){}},setTimeout,clearTimeout,AbortController,URL,Blob,console,
});
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'visual.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'news.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'portal.js'),'utf8').replace(/init\(\);\s*$/,''),context);
function run(source){return vm.runInContext(source,context);}
context.fixture={users:JSON.parse(fs.readFileSync(path.join(root,'users.json'))).users,...JSON.parse(fs.readFileSync(path.join(root,'devices.json'))),platform:JSON.parse(fs.readFileSync(path.join(root,'platform.json')))};
run('users=fixture.users; devices=fixture.devices; scenes=fixture.scenes; platform=fixture.platform; bindPortal=()=>{}; bindAuth=()=>{};');
context.template=fs.readFileSync(path.join(root,'content/companies/company-a.md'),'utf8');
assert.equal(run('parseTemplate(template).config.widgets.length'),3);
assert.throws(()=>run("parseTemplate('bad')"),/dashboard/);
assert.throws(()=>run("parseTemplate(template+template)"),/dashboard/);
assert.throws(()=>run("parseTemplate(template.replace('green','red'))"),/accent/);
assert.equal(run("markdown('<img src=x onerror=alert(1)>').includes('<img')"),false);
run("currentUser=users.find(u=>u.username==='customer');companyId=currentUser.companyId;view='company';templates[companyId]=template;");
assert.equal(run('companyDevices().length'),3);
assert.equal(run('warningDevices().length'),1);
run('openWarnings()');assert.equal(run('deviceId'),'AGR-A-002');assert.equal(run('view'),'detail');assert.equal(run('canEdit()'),false);
run("openDevice('AGR-B-001')");assert.equal(run('deviceId'),'AGR-A-002');
run("openCompany('company-b')");assert.equal(run('companyId'),'company-a');
run("view='tests';render()");assert.equal(run('view'),'company');
run("deviceId='AGR-B-001';view='detail';render()");assert.equal(run('view'),'company');
run("currentUser=users.find(u=>u.role==='developer');deviceId='AGR-A-002';sceneId=device().sceneId");assert.equal(run('canEdit()'),true);
run("deviceId='AGR-B-001'");assert.equal(run('canEdit()'),false);
run("currentUser=users.find(u=>u.username==='customer_b');companyId=currentUser.companyId");assert.equal(run('companyDevices().length'),3);assert.equal(run('companyDevices().some(d=>d.id.startsWith("AGR-A"))'),false);
run("localStorage.setItem(registeredKey,JSON.stringify([{id:'test-user',username:'test-user',role:'admin',companyId:'company-a'}]))");assert.equal(run('registeredUsers()[0].role'),'customer');
run("currentUser=users.find(u=>u.role==='admin');openCompany('company-b')");assert.equal(run('companyId'),'company-b');assert.equal(run('canEdit()'),false);
assert.equal(run("platform.categories.filter(c=>c.chainId==='industry').length"),3);
for(const c of context.fixture.platform.companies){const t=fs.readFileSync(path.join(root,c.template),'utf8');context.testTemplate=t;assert.equal(run('typeof parseTemplate(testTemplate).config.title'),'string');}
console.log('Portal checks passed: role routes, company scope, warning shortcut, registration role, Markdown validation and escaping.');
context.newsFixtures=JSON.parse(fs.readFileSync(path.join(root,'news-index.json'),'utf8')).articles;
run("newsArticles=newsFixtures;currentUser=users.find(u=>u.username==='customer_b');companyId=currentUser.companyId");
assert.equal(run('visibleNews().length'),1);
run("currentUser=users.find(u=>u.username==='customer');companyId=currentUser.companyId");
assert.equal(run('visibleNews().length'),2);
assert.equal(run("articleUrl('javascript:alert(1)')"),null);
assert.equal(run("articleUrl('//evil.example/image.png')"),null);
assert.equal(run("articleUrl('assets/news/../../secret.png')"),null);
assert.equal(run("articleUrl('assets/news/example.png')"),'./assets/news/example.png');
assert.equal(run("articleMarkdown('<script>alert(1)</script>').html.includes('<script>')"),false);
context.markdownExample='## 标题\n\n正文 **粗体**\n\n1. 第一步\n2. 第二步\n\n```json\n{"test":true}\n```';
assert.equal(run('articleMarkdown(markdownExample).toc.length'),1);
assert.equal(run("articleMarkdown(markdownExample).html.includes('<ol>')"),true);
assert.equal(run("articleMarkdown(markdownExample).html.includes('language-json')"),true);
assert.equal(run("articleInline('[链接](javascript:alert)').includes('href')"),false);
run("currentUser=users.find(u=>u.role==='admin');companyId=null");assert.equal(run('visibleNews().length'),2);
console.log('News checks passed: company scope, Markdown code/lists/TOC, escaped HTML and safe links.');
run("currentUser=users.find(u=>u.username==='customer');companyId=currentUser.companyId;overviewDeviceId='AGR-B-001'");
assert.equal(run("companyInsights().includes('AGR-B-001')"),false);
assert.equal(run("companyInsights().includes('1 台正常，1 台预警，1 台离线')"),true);
assert.equal(run("companyAttention().includes('土壤含水率超出范围')"),true);
run("overviewDeviceId='AGR-A-003'");
assert.equal(run("companyInsights().includes('离线 · 最后一次模拟采样')"),true);
assert.equal(run("workspaceSparkline({key:'x',name:'测试'}, {history:{x:[7,7,7]}}).includes('NaN')"),false);
assert.equal(run("newsCover({title:'坏链接',image:'javascript:alert(1)'}).includes('<img')"),false);
assert.equal(run("newsCover({title:'封面',image:'assets/news/platform-update.png'}).includes('src=\"./assets/news/platform-update.png\"')"),true);
console.log('Dashboard checks passed: scoped aggregation, offline snapshots, flat history, safe news covers.');
run("currentUser=users.find(u=>u.username==='customer');companyId=currentUser.companyId");
assert.equal(run("consoleDeviceRows('agr-a-002').includes('AGR-A-002')"),true);
assert.equal(run("consoleDeviceRows('agr-a-002').includes('AGR-A-001')"),false);
assert.equal(run("consoleDeviceRows('AGR-B').includes('未找到匹配设备')"),true);
assert.equal(run("consoleDeviceRows('3 号温室').includes('AGR-A-003')"),true);
assert.equal(run("consoleDeviceArea().includes('非地理坐标')"),true);
console.log('Cockpit checks passed: case-insensitive company device search and schematic labels.');

run("currentUser=users.find(u=>u.role==='admin');companyId='company-a'");
assert.equal(run('JSON.stringify(platformHealth())'),JSON.stringify({total:12,online:8,offline:4,warning:2,normal:6}));
assert.equal(run("companyHome().includes('公司 A · 设备管理')"),true);
assert.equal(run("companyHome().includes('欢迎回来')"),false);
assert.equal(run("companyHome().includes('我的设备')"),false);
run("openAdminDevice('AGR-B-001')");
assert.equal(run('companyId'),'company-b');assert.equal(run('deviceId'),'AGR-B-001');assert.equal(run('view'),'detail');
run("currentUser=users.find(u=>u.username==='customer');companyId='company-a';deviceId='AGR-A-001';openAdminDevice('AGR-B-001')");
assert.equal(run('companyId'),'company-a');assert.equal(run('deviceId'),'AGR-A-001');
assert.equal(run('JSON.stringify(platformHealth([]))'),JSON.stringify({total:0,online:0,offline:0,warning:0,normal:0}));
console.log('Admin checks passed: platform totals, management titles and guarded cross-company device navigation.');
