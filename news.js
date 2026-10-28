/* Blog-style news from a generated Markdown collection, shared by preview and Pages. */
let newsArticles=[],newsErrors=[],newsLoadError='',newsRequest=0,articleId=null;
function visibleNews(){
 const scope=isAdmin()?companyId:currentUser?.companyId;
 return newsArticles.filter(article=>!article.companyId||article.companyId===scope||(isAdmin()&&!scope));
}
async function loadNews(){
 const request=++newsRequest;
 try{
  const data=await readJson('./news-index.json');
  if(!Array.isArray(data.articles))throw new Error('文章索引格式无效。');
  if(request!==newsRequest)return;
  newsArticles=data.articles.filter(a=>a&&typeof a.id==='string'&&typeof a.title==='string'&&typeof a.body==='string');
  newsErrors=Array.isArray(data.errors)?data.errors:[];newsLoadError='';
 }catch(error){if(request===newsRequest)newsLoadError=error.message;}
}
async function refreshNews(){await loadNews();if(currentUser&&(view==='news'||view==='article'||(view==='company'&&companyTab==='news')))render();}
function newsCover(article){
 const image=articleUrl(article.image||'');
 return image?`<div class="news-cover"><img src="${safe(image)}" alt="${safe(article.title)}" loading="lazy"><span class="news-cover-fallback" aria-hidden="true">${icon('device')}<span>供应链物联网平台</span></span></div>`:`<div class="news-cover news-cover-default" aria-hidden="true"><span class="cover-orbit"></span>${icon('device')}<span>供应链物联网平台</span></div>`;
}
function newsListPage(){
 const rows=visibleNews();
 return heading('NEWS','新闻',isAdmin()?'Markdown 文章 · 按日期自动排列':'平台动态与公司资讯')+
 `${newsLoadError?`<div class="offline-note">文章加载失败：${safe(newsLoadError)} <button class="text-button" id="reload-news">重试</button></div>`:''}`+
 `${isAdmin()&&newsErrors.length?`<div class="offline-note">${newsErrors.map(safe).join('<br>')}</div>`:''}`+
 `<div class="blog-list news-card-list">${rows.map(a=>`<article class="blog-list-item news-card"><div class="news-card-copy"><div class="article-meta"><time datetime="${safe(a.date)}">${safe(a.date)}</time><span>${safe(a.companyId?platform.companies.find(c=>c.id===a.companyId)?.name||'公司动态':'平台消息')}</span></div><h2><a href="#article/${encodeURIComponent(a.id)}" data-article="${safe(a.id)}">${safe(a.title)}</a></h2><p>${safe(a.summary)}</p><a class="article-read" href="#article/${encodeURIComponent(a.id)}" data-article="${safe(a.id)}">阅读全文 ${icon('arrow')}</a></div><a class="news-cover-link" href="#article/${encodeURIComponent(a.id)}" data-article="${safe(a.id)}" aria-label="阅读：${safe(a.title)}">${newsCover(a)}</a></article>`).join('')||(!newsLoadError?'<div class="blog-empty">暂无文章</div>':'')}</div>`+
 (isAdmin()?'<p class="settings-note">在 _news 目录新增 Markdown 文件即可发布；本地自动读取，GitHub Pages 在提交后自动构建。</p>':'');
}
function articleUrl(raw){
 const value=String(raw).trim();
 if(/^https?:\/\/[^\s]+$/i.test(value))return value;
 if(/^(?:\.\/|\/)?assets\/news\/[\w\u4e00-\u9fff./%-]+$/.test(value)&&!value.includes('..'))return './'+value.replace(/^(?:\.\/|\/)/,'');
 return null;
}
function articleInline(raw){
 const pattern=/`([^`]+)`|!\[([^\]]*)\]\(([^\s)]+)\)|\[([^\]]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
 let html='',last=0;
 for(const match of raw.matchAll(pattern)){
  html+=safe(raw.slice(last,match.index));last=match.index+match[0].length;
  if(match[1]!==undefined)html+=`<code>${safe(match[1])}</code>`;
  else if(match[2]!==undefined){const url=articleUrl(match[3]);html+=url?`<img src="${safe(url)}" alt="${safe(match[2])}" loading="lazy">`:safe(match[2]);}
  else if(match[4]!==undefined){const url=articleUrl(match[5]);html+=url?`<a href="${safe(url)}" target="_blank" rel="noopener noreferrer">${safe(match[4])}</a>`:safe(match[4]);}
  else if(match[6]!==undefined)html+=`<strong>${safe(match[6])}</strong>`;
  else html+=`<em>${safe(match[7])}</em>`;
 }
 return html+safe(raw.slice(last));
}
function articleMarkdown(raw){
 const lines=raw.replace(/\r\n/g,'\n').split('\n'),toc=[];let html='',paragraph=[],list=null,code=null,codeLines=[];
 const flush=()=>{if(paragraph.length){html+=`<p>${articleInline(paragraph.join(' '))}</p>`;paragraph=[];}if(list){html+=`</${list}>`;list=null;}};
 const finishCode=()=>{html+=`<pre><code${code?` class="language-${safe(code)}"`:''}>${safe(codeLines.join('\n'))}</code></pre>`;code=null;codeLines=[];};
 for(const line of lines){
  const fence=line.match(/^\s*```([\w+-]*)\s*$/);
  if(code!==null){if(fence)finishCode();else codeLines.push(line);continue;}
  if(fence){flush();code=fence[1];continue;}
  if(!line.trim()){flush();continue;}
  const heading=line.match(/^(#{1,6})\s+(.+)$/);
  if(heading){flush();const level=Math.max(2,heading[1].length),id='article-section-'+toc.length;toc.push({id,title:heading[2],level});html+=`<h${level} id="${id}">${articleInline(heading[2])}</h${level}>`;continue;}
  const item=line.match(/^\s*(?:([-*])|\d+\.)\s+(.+)$/);
  if(item){if(paragraph.length)flush();const tag=item[1]?'ul':'ol';if(list!==tag){flush();html+=`<${tag}>`;list=tag;}html+=`<li>${articleInline(item[2])}</li>`;continue;}
  if(line.startsWith('> ')){flush();html+=`<blockquote>${articleInline(line.slice(2))}</blockquote>`;continue;}
  if(/^\s*(?:---+|\*\*\*+)\s*$/.test(line)){flush();html+='<hr>';continue;}
  if(list)flush();paragraph.push(line);
 }
 flush();if(code!==null)finishCode();return {html,toc};
}
function openArticle(id,push=true){
 const article=visibleNews().find(a=>a.id===id);if(!article)return;
 articleId=id;view='article';companyTab='news';notice='';
 if(push)history.pushState(null,'','#article/'+encodeURIComponent(id));
 render();window.scrollTo({top:0,behavior:'instant'});
}
function returnToNews(push=true){
 companyTab='news';view=isAdmin()&&!companyId?'news':'company';
 if(push)history.pushState(null,'','#news');render();window.scrollTo({top:0,behavior:'instant'});
}
function routeArticleHash(){
 if(!currentUser)return;
 if(location.hash.startsWith('#article/')){
  let id;try{id=decodeURIComponent(location.hash.slice(9));}catch{return;}
  if(visibleNews().some(a=>a.id===id))openArticle(id,false);
  else {articleId=id;view='article';render();}
 }else if(location.hash==='#news'||view==='article')returnToNews(false);
}
function articlePage(){
 const rows=visibleNews(),article=rows.find(a=>a.id===articleId);
 if(!article)return heading('NEWS','文章不可用','文章不存在，或不属于当前公司。','<button class="secondary" id="back-news">返回新闻</button>');
 const rendered=articleMarkdown(article.body),index=rows.indexOf(article),previous=rows[index-1],next=rows[index+1];
 return `<div class="article-toolbar"><button class="text-button" id="back-news">← 返回新闻</button></div><div class="article-layout"><article class="blog-article"><header><div class="article-meta"><time datetime="${safe(article.date)}">${safe(article.date)}</time><span>${safe(article.author)}</span></div><h1>${safe(article.title)}</h1></header><div class="article-body">${rendered.html}</div><nav class="article-pagination" aria-label="其他文章">${previous?`<a href="#article/${encodeURIComponent(previous.id)}" data-article="${safe(previous.id)}"><small>上一篇</small>${safe(previous.title)}</a>`:'<span></span>'}${next?`<a href="#article/${encodeURIComponent(next.id)}" data-article="${safe(next.id)}"><small>下一篇</small>${safe(next.title)}</a>`:''}</nav>${isAdmin()?`<p class="settings-note">源文件：${safe(article.source)}</p>`:''}</article>${rendered.toc.length?`<aside class="article-toc"><strong>目录</strong><nav aria-label="文章目录">${rendered.toc.map(h=>`<a href="#${h.id}" data-article-section="${h.id}" class="${h.level>2?'toc-sub':''}">${safe(h.title)}</a>`).join('')}</nav></aside>`:''}</div>`;
}
function bindNews(){
 document.querySelectorAll('.news-cover img').forEach(img=>{img.onerror=()=>{img.hidden=true;};});
 document.querySelectorAll('[data-article]').forEach(a=>a.onclick=event=>{event.preventDefault();openArticle(a.dataset.article);});
 const back=document.querySelector('#back-news');if(back)back.onclick=()=>returnToNews();
 const retry=document.querySelector('#reload-news');if(retry)retry.onclick=refreshNews;
 document.querySelectorAll('[data-article-section]').forEach(a=>a.onclick=event=>{event.preventDefault();document.getElementById(a.dataset.articleSection)?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
}
