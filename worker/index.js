/**
 * RELIKT Cloudflare Worker
 *
 * Routes:
 * POST /hold                  — шаг оплаты: вещи закрепляются за покупателем на 20 минут, другим их не оплатить
 * POST /order                 — заказ + чек -> Telegram; заказ сохраняется (KV ORDERS), вещи отмечаются в каталоге (GitHub);
 *                               если вещь уже недоступна, а чек есть — заказ всё равно уходит менеджеру с пометкой о возврате
 * POST /orders/list           — заказы для админки            (Authorization: Bearer <GitHub-токен админки>)
 * POST /orders/update         — статус / заметка заказа       (отмена возвращает вещи в продажу, «Оплачен» превращает бронь в продажу)
 * POST /orders/delete         — удалить заказ из списка
 * POST /cdek                  — servicePath для CDEK Widget 3
 * POST /yandex/geo            — определение geo_id Яндекс Доставки
 * POST /yandex/pickup-points  — реальные ПВЗ Яндекс Доставки
 * POST /tg                    — сообщения боту от Telegram (webhook): на /start бот присылает кнопку «Открыть каталог»
 * POST /bot/setup             — подключить webhook бота к этому Worker (кнопка в админке, нужен GitHub-токен админки)
 *                               Новый пост канала с вещью (фото + цена): бот сразу пишет под ним «Название · цена»
 *                               с кнопкой «Открыть в каталоге» — под альбомом Telegram кнопки не разрешает
 * POST /bot/pin               — опубликовать в канале пост «RELIKT — каталог» с кнопкой и закрепить его (кнопка в админке;
 *                               бот — админ канала с правами публиковать и закреплять сообщения)
 * GET  /health                — проверка конфигурации без выдачи секретов
 *
 * Secrets / settings:
 * BOT_TOKEN
 * CHAT_ID
 * APP_SECRET                  — legacy/fallback, необязателен если используется Telegram initData
 * CDEK_CLIENT_ID
 * CDEK_CLIENT_SECRET
 * YANDEX_DELIVERY_TOKEN
 * GITHUB_TOKEN                — fine-grained токен: Contents Read and write на репозиторий магазина (отмечает «продано» / «бронь»)
 * GITHUB_REPO                 — необязательно, по умолчанию Slackity/relikt
 * GITHUB_BRANCH               — необязательно, по умолчанию main
 * ORDERS                      — привязка KV namespace, в нём хранятся заказы (год)
 * SHOP_URL                    — необязательно, адрес мини-аппа, по умолчанию https://slackity.github.io/relikt/
 */
const CDEK_BASE='https://api.cdek.ru/v2';
const YANDEX_BASE='https://b2b-authproxy.taxi.yandex.net';
const WIDGET_VERSION='4.0.0';
const GITHUB_API='https://api.github.com';
const STORE_PATH='data/store.json';
const ORDER_TTL=365*24*3600;
const STATUSES=['new','reserved','problem','paid','shipped','done','cancelled'];

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==='OPTIONS') return new Response(null,{headers:cors()});
    try{
      if(url.pathname==='/health') return json({
        ok:true,
        telegram:!!env.BOT_TOKEN&&!!env.CHAT_ID,
        cdek:!!env.CDEK_CLIENT_ID&&!!env.CDEK_CLIENT_SECRET,
        yandexDelivery:!!env.YANDEX_DELIVERY_TOKEN,
        orders:!!env.ORDERS,
        bot:true,
        catalog:!!env.GITHUB_TOKEN
      });
      if(url.pathname==='/cdek') return await cdek(request,env);
      if(url.pathname==='/yandex/geo') return await yandexGeo(request,env);
      if(url.pathname==='/yandex/pickup-points') return await yandexPickupPoints(request,env);
      if(url.pathname==='/tg') return await telegramUpdate(request,env);
      if(url.pathname==='/bot/setup') return await botSetup(request,env);
      if(url.pathname==='/bot/pin') return await botPin(request,env);
      if(url.pathname==='/hold') return await hold(request,env);
      if(url.pathname==='/order') return await order(request,env);
      if(url.pathname.startsWith('/orders/')) return await adminOrders(request,env,url.pathname.slice(8));
      return json({ok:false,error:'not_found'},404);
    }catch(e){
      return json({ok:false,error:e?.message||'server_error'},e?.status&&e.status<500?e.status:500);
    }
  }
};

function cors(){return {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type,Authorization',
  'Access-Control-Max-Age':'86400'
}}
function json(o,status=200,extra={}){return new Response(JSON.stringify(o),{status,headers:{...cors(),'Content-Type':'application/json',...extra}})}
function httpError(status,message){const e=new Error(message);e.status=status;return e;}
const str=(v,max)=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,max);
const num=(v,min,max,d)=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.min(max,Math.max(min,n)):d;};

async function hmacSha256(keyBytes,message){
  const key=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message)));
}
function hex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
function timingSafeEqual(a,b){
  if(a.length!==b.length)return false;
  let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);
  return x===0;
}
async function verifyTelegramInitData(initData,botToken){
  if(!initData||!botToken)return null;
  const p=new URLSearchParams(initData);
  const received=p.get('hash'); if(!received)return null;
  p.delete('hash');
  const pairs=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`);
  const dataCheckString=pairs.join('\n');
  const secret=await hmacSha256(new TextEncoder().encode('WebAppData'),botToken);
  const calculated=hex(await hmacSha256(secret,dataCheckString));
  if(!timingSafeEqual(calculated,received))return null;
  const authDate=Number(p.get('auth_date')||0);
  if(!authDate||Math.abs(Date.now()/1000-authDate)>86400)return null;
  let user=null;try{user=JSON.parse(p.get('user')||'null')}catch(e){}
  return user;
}
async function authOrder(body,env){
  if(env.APP_SECRET&&body?.secret===env.APP_SECRET)return {id:null,legacy:true};
  const user=await verifyTelegramInitData(String(body?.initData||''),env.BOT_TOKEN);
  if(!user)return null;
  return {id:String(user.id),username:user.username||''};
}
async function tgSend(env,text){
  const r=await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:env.CHAT_ID,text:text.slice(0,4090),disable_web_page_preview:true})
  });
  return r.json();
}

/* ---------- catalog in GitHub (data/store.json) ---------- */
const repoName=env=>env.GITHUB_REPO||'Slackity/relikt';
const branchName=env=>env.GITHUB_BRANCH||'main';
async function gh(env,token,method,path,body){
  const r=await fetch(`${GITHUB_API}/repos/${repoName(env)}${path}`,{
    method,
    headers:{'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'relikt-worker','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw httpError(r.status,'github_'+r.status+(j.message?': '+j.message:''));
  return j;
}
function b64decode(b64){const bin=atob(String(b64).replace(/\s/g,''));return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)));}
function b64encode(text){const bytes=new TextEncoder().encode(text);let bin='';for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(bin);}
async function loadCatalog(env){
  const f=await gh(env,env.GITHUB_TOKEN,'GET',`/contents/${STORE_PATH}?ref=${encodeURIComponent(branchName(env))}`);
  return {sha:f.sha,data:JSON.parse(b64decode(f.content||''))};
}
/* read, change, save; starts over when the admin panel or an import saved in between.
   change() may return {noSave:true,result} when nothing needs to be written. */
async function editCatalog(env,message,change){
  for(let attempt=0;attempt<4;attempt++){
    const cat=await loadCatalog(env);
    const result=change(cat.data);
    if(result&&result.noSave)return result.result;
    try{
      await gh(env,env.GITHUB_TOKEN,'PUT',`/contents/${STORE_PATH}`,{message,content:b64encode(JSON.stringify(cat.data,null,2)+'\n'),sha:cat.sha,branch:branchName(env)});
      return result;
    }catch(e){if(e.status!==409&&e.status!==422)throw e;}
  }
  throw httpError(409,'catalog_busy');
}

/* ---------- holds: a buyer on the payment step has the pieces to themselves for HOLD_MINUTES ----------
   Kept on the product as holds:[{k,q,u}] — k is a hash of the buyer's token (the token itself never lands in the
   public catalog), q the units, u the end time. Expired holds mean nothing and are swept on every write. */
async function holdKey(token){
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('relikt-hold:'+token)))).slice(0,24);
}
function sweepHolds(data,now){
  for(const p of data.products||[]){
    if(!Array.isArray(p.holds))continue;
    p.holds=p.holds.filter(h=>h&&Date.parse(h.u)>now);
    if(!p.holds.length)delete p.holds;
  }
}
/* units of p held by other buyers right now, and when the last of those holds ends */
function heldByOthers(p,key,now){
  let q=0,until=0;
  for(const h of p.holds||[]){const u=Date.parse(h.u);if(u>now&&h.k!==key){q+=Number(h.q)||1;until=Math.max(until,u);}}
  return {q,until};
}
/* pieces that cannot be bought: gone, hidden, sold, reserved, not enough units, or held by another buyer */
function unavailable(data,items,key){
  const bad=[], now=Date.now();
  for(const it of items){
    const p=(data.products||[]).find(x=>x.id===it.id);
    if(!p||!p.visible||p.availability==='sold'||p.availability==='reserved'){bad.push({id:it.id,reason:'unavailable'});continue;}
    if(p.availability!=='instock')continue;   // made-to-order pieces are not limited
    const stock=Number(p.stock)||1, held=heldByOthers(p,key,now);
    if(stock<it.qty)bad.push({id:it.id,reason:'unavailable'});
    else if(stock-held.q<it.qty)bad.push({id:it.id,reason:'held',until:new Date(held.until).toISOString()});
  }
  return bad;
}
function refusal(bad){
  const held=bad.filter(b=>b.reason==='held');
  if(held.length===bad.length)return json({ok:false,error:'held',ids:bad.map(b=>b.id),until:held.map(b=>b.until).sort().pop()},409);
  return json({ok:false,error:'unavailable',ids:bad.map(b=>b.id)},409);
}

/* takes the ordered units out of stock; the last unit makes the piece sold (or reserved for a deposit) */
function claim(data,items,payment,key){
  const days=num(data.settings?.reserveDays,0,60,3), now=new Date(), done=[];
  for(const it of items){
    const p=(data.products||[]).find(x=>x.id===it.id);
    if(!p||p.availability!=='instock')continue;
    const stock=Number(p.stock)||1, qty=Math.min(stock,it.qty);
    p.stock=stock-qty;
    if(Array.isArray(p.holds)){p.holds=p.holds.filter(h=>h.k!==key);if(!p.holds.length)delete p.holds;}
    if(p.stock===0){
      p.availability=payment==='reserve'?'reserved':'sold';
      p.reservedUntil=payment==='reserve'?new Date(now.getTime()+days*864e5).toISOString():'';
      delete p.holds;
    }
    p.updatedAt=now.toISOString();
    done.push({id:p.id,qty,to:p.availability});
  }
  return done;
}
/* cancelled order: its units go back on sale, unless the piece was changed by hand since */
function release(data,claims){
  const skipped=[];
  for(const c of claims){
    const p=(data.products||[]).find(x=>x.id===c.id);
    if(!p){skipped.push(c.id);continue;}
    if(p.availability==='instock'||p.availability===c.to||(c.to==='reserved'&&p.availability==='sold')){
      p.stock=(p.availability==='instock'?Number(p.stock)||0:0)+c.qty;
      p.availability='instock'; p.reservedUntil=''; p.updatedAt=new Date().toISOString();
    }else skipped.push(c.id);
  }
  return skipped;
}
/* reservation paid in full: reserved pieces become sold */
function sellReserved(data,claims){
  for(const c of claims){
    const p=(data.products||[]).find(x=>x.id===c.id);
    if(p&&c.to==='reserved'&&p.availability==='reserved'){p.availability='sold';p.reservedUntil='';p.updatedAt=new Date().toISOString();c.to='sold';}
  }
  return claims;
}
function parseItems(body){
  return (Array.isArray(body?.items)?body.items:[]).slice(0,30)
    .map(it=>({id:str(it?.id,40),qty:num(it?.qty,1,5,1),size:str(it?.size,24)})).filter(it=>it.id);
}
const HOLD_MINUTES=20;

/* POST /hold — the buyer opens the payment step: the pieces are theirs for HOLD_MINUTES, nobody else can get to paying */
async function hold(request,env){
  const body=await request.json().catch(()=>null);
  const auth=await authOrder(body,env);
  if(!auth)return json({ok:false,error:'forbidden'},403);
  if(!env.GITHUB_TOKEN)return json({ok:false,error:'catalog_not_configured'},501);
  const items=parseItems(body);
  if(!items.length)return json({ok:false,error:'empty'},400);
  const token=/^[a-f0-9]{32}$/.test(String(body?.token||''))?body.token:hex(crypto.getRandomValues(new Uint8Array(16)));
  const key=await holdKey(token);
  const now=Date.now(), until=new Date(now+HOLD_MINUTES*60000).toISOString();
  let bad=[];
  await editCatalog(env,`Оформление заказа: вещи закреплены на ${HOLD_MINUTES} мин`,d=>{
    sweepHolds(d,now);
    bad=unavailable(d,items,key);
    if(bad.length)return {noSave:true};
    // the same buyer coming back to the payment step: their earlier holds are replaced by these
    for(const p of d.products||[])if(Array.isArray(p.holds)){p.holds=p.holds.filter(h=>h.k!==key);if(!p.holds.length)delete p.holds;}
    for(const it of items){
      const p=d.products.find(x=>x.id===it.id);
      if(p&&p.availability==='instock')(p.holds=p.holds||[]).push({k:key,q:it.qty,u:until});
    }
    if(!(d.products||[]).some(p=>(p.holds||[]).some(h=>h.k===key)))return {noSave:true};   // only made-to-order pieces: nothing to hold
  });
  if(bad.length)return refusal(bad);
  return json({ok:true,token,key,until});
}

async function order(request,env){
  const body=await request.json().catch(()=>null);
  const auth=await authOrder(body,env);
  if(!auth)return json({ok:false,error:'forbidden'},403);
  let text=String(body?.text||'').slice(0,3900);
  if(!text.trim())return json({ok:false,error:'empty_text'},400);
  if(!env.BOT_TOKEN||!env.CHAT_ID)return json({ok:false,error:'telegram_not_configured'},500);

  const receiptData=String(body?.receipt||'');
  if(receiptData && receiptData.length>12_000_000)return json({ok:false,error:'receipt_too_large'},413);

  const o=body?.order&&typeof body.order==='object'?body.order:{};
  const number=/^RK-[A-Z0-9]{3,12}$/.test(String(o.number||''))?o.number:'RK-'+Date.now().toString(36).slice(-5).toUpperCase();
  const payment=o.payment==='reserve'?'reserve':'full';
  const items=parseItems(body);
  const key=/^[a-f0-9]{32}$/.test(String(body?.hold||''))?await holdKey(body.hold):'';

  // a piece that is already gone is refused before anything reaches the manager —
  // unless the buyer has already paid (a receipt is attached): then the manager must see it to refund or swap
  let warn='', problem=false;
  if(env.GITHUB_TOKEN&&items.length){
    try{
      const cat=await loadCatalog(env);
      const bad=unavailable(cat.data,items,key);
      if(bad.length){
        if(!receiptData)return refusal(bad);
        problem=true;
        text='⚠️ ВЕЩЬ УЖЕ НЕДОСТУПНА: покупатель оплатил, нужен возврат или замена\n\n'+text;
      }
    }catch(e){warn=e.message;}
  }

  const suffix=auth.id?`\nTelegram ID: ${auth.id}${auth.username?' (@'+auth.username+')':''}`:'';
  const data=await tgSend(env,text+suffix);
  if(!data.ok)return json({ok:false,error:data.description||'telegram_error'},502);

  if(receiptData){
    const m=receiptData.match(/^data:([^;]+);base64,(.+)$/s);
    if(m){
      const raw=atob(m[2]);
      const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
      const safeName=String(body?.name||'receipt').replace(/[^\w.\-а-яА-ЯёЁ ]/g,'_').slice(0,100)||'receipt';
      const caption='Чек об оплате · '+safeName;
      if(m[1].startsWith('image/')){
        const f=new FormData();f.append('chat_id',String(env.CHAT_ID));f.append('caption',caption);f.append('photo',new File([bytes],safeName,{type:m[1]}));
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`,{method:'POST',body:f});
      }else{
        const f=new FormData();f.append('chat_id',String(env.CHAT_ID));f.append('caption',caption);f.append('document',new File([bytes],safeName,{type:m[1]||'application/octet-stream'}));
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendDocument`,{method:'POST',body:f});
      }
    }
  }

  // mark the pieces sold / reserved in the catalog (the site picks it up after GitHub Pages rebuilds, 1–2 min)
  let claims=[];
  if(env.GITHUB_TOKEN&&items.length&&!warn&&!problem){
    try{
      claims=await editCatalog(env,`Заказ ${number}: ${payment==='reserve'?'бронь':'продажа'}`,d=>{
        sweepHolds(d,Date.now());
        const bad=unavailable(d,items,key);
        if(bad.length)throw httpError(409,'уже купили в другом заказе: '+bad.map(b=>b.id).join(', '));
        return claim(d,items,payment,key);
      });
    }catch(e){warn=e.message;}
  }
  if(warn&&env.GITHUB_TOKEN)await tgSend(env,`⚠️ Заказ ${number}: вещи не отмечены в каталоге (${warn}). Проверьте наличие в админке.`).catch(()=>{});

  if(env.ORDERS){
    const c=o.customer||{};
    const rec={
      key:'o:'+String(9999999999999-Date.now()).padStart(13,'0')+':'+number,
      number,createdAt:new Date().toISOString(),status:problem?'problem':payment==='reserve'?'reserved':'new',payment,
      source:o.source==='site'?'site':'miniapp',tg:auth.id?{id:auth.id,username:auth.username}:null,
      items:(Array.isArray(o.items)?o.items:[]).slice(0,30).map(it=>({id:str(it?.id,40),name:str(it?.name,160),size:str(it?.size,24),qty:num(it?.qty,1,5,1),price:num(it?.price,0,1e7,0),order:!!it?.order,image:/^\/uploads\/[A-Za-z0-9._-]{1,120}$/.test(String(it?.image||''))?it.image:''})),
      subtotal:num(o.subtotal,0,1e8,0),cut:num(o.cut,0,1e8,0),total:num(o.total,0,1e8,0),pay:num(o.pay,0,1e8,0),
      discounts:(Array.isArray(o.discounts)?o.discounts:[]).slice(0,8).map(x=>str(x,80)),promo:str(o.promo,60),bank:str(o.bank,60),receipt:!!receiptData,
      customer:{name:str(c.name,80),contact:str(c.contact,80),phone:str(c.phone,32),city:str(c.city,80),delivery:str(c.delivery,40),address:str(c.address,300),comment:str(c.comment,600)},
      claims,catalogNote:problem?'вещь уже недоступна — нужен возврат или замена':warn,released:false,note:''
    };
    await env.ORDERS.put(rec.key,JSON.stringify(rec),{expirationTtl:ORDER_TTL});
  }
  return json(problem?{ok:true,number,problem:'unavailable'}:{ok:true,number});
}

/* ---------- the bot itself: /start opens the shop ---------- */
const shopUrl=env=>String(env.SHOP_URL||'https://slackity.github.io/relikt/').replace(/\/?$/,'/');
async function tgApi(env,method,payload){
  const r=await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload||{})});
  return r.json().catch(()=>({ok:false}));
}
/* Telegram signs every webhook call with this value, so nobody else can post fake messages here */
async function webhookSecret(env){
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('relikt-webhook:'+env.BOT_TOKEN)))).slice(0,48);
}
async function shopSettings(env){
  try{return (await (await fetch(shopUrl(env)+'data/store.json?t='+Date.now())).json()).settings||{};}catch(e){return {};}
}
/* the price as the channel writes it: keycap digits with 🕖 for 0 (3️⃣2️⃣🕖🕖), or 3200 ₽; same rules as the import */
function postPrice(text){
  for(const m of text.match(/(?:\d\uFE0F?\u20E3|\u{1F556})+/gu)||[]){
    const v=parseInt(m.replace(/\u{1F556}/gu,'0').replace(/\D/g,''),10);
    if(v>=100)return v;                                          // a stray 3️⃣ bullet is not a price
  }
  const plain=text.match(/(\d[\d\s]{2,7})\s*(?:₽|руб|р\.|р\b)/i);
  const v=plain?parseInt(plain[1].replace(/\s/g,''),10):0;
  return v>=100?v:null;
}
/* A new post with a piece in the shop channel. Telegram allows no buttons under an album, so the bot posts a short
   message right after it — "Новая футболка Ed Hardy · 3 200 ₽" — with an "Open in catalog" button. The button
   opens the Mini App on this piece (startapp=post_<n>: the piece imported from that post, the catalog until then).
   The import skips it: it has no photos. Bots get no updates about their own posts, so this never loops. */
async function channelPost(p,env){
  if(!p||!p.chat||!p.photo||p.caption==null||p.forward_origin)return; // an album's other photos come without a caption
  const text=String(p.caption);
  const price=postPrice(text);
  if(price==null||/продано/i.test(text))return;
  const s=await shopSettings(env);
  if(!s.channel||String(p.chat.username||'').toLowerCase()!==String(s.channel).toLowerCase())return;
  const app=/^https:\/\/t\.me\/[A-Za-z0-9_]{4,32}(\/[A-Za-z0-9_]{3,30})?$/.test(String(s.miniAppUrl||''))?s.miniAppUrl:'';
  if(!app)return;
  // Telegram repeats an update it thinks was lost: one message per post
  const key='cp:'+p.chat.id+':'+p.message_id;
  if(env.ORDERS){if(await env.ORDERS.get(key))return;await env.ORDERS.put(key,'1',{expirationTtl:172800});}
  const line=(text.split('\n').map(l=>l.trim()).filter(Boolean)[0]||'').replace(/\s+/g,' ');
  const title=postPrice(line)!=null?'':line.length>60?line.slice(0,59)+'…':line;
  const label=[title&&title.charAt(0).toUpperCase()+title.slice(1),String(price).replace(/\B(?=(\d{3})+(?!\d))/g,' ')+' ₽',/под\s+заказ/i.test(text)?'под заказ':''].filter(Boolean).join(' · ');
  const res=await tgApi(env,'sendMessage',{chat_id:p.chat.id,text:label,disable_notification:true,
    reply_markup:{inline_keyboard:[[{text:'Открыть в каталоге',url:app+'?startapp=post_'+p.message_id}]]}});
  if(!res.ok){if(env.ORDERS)await env.ORDERS.delete(key);await channelWarning(env,res.description);}
}
/* the bot could not post in the channel: tell the manager, at most once a day */
async function channelWarning(env,why){
  if(env.ORDERS){if(await env.ORDERS.get('warn:channel'))return;await env.ORDERS.put('warn:channel','1',{expirationTtl:86400});}
  await tgSend(env,'⚠️ Бот не смог отправить в канал кнопку «Открыть в каталоге» под постом ('+(why||'нет доступа')+'). Проверьте, что бот — админ канала с правом публиковать сообщения.').catch(()=>{});
}
async function telegramUpdate(request,env){
  if(request.method!=='POST'||!env.BOT_TOKEN)return new Response('ok');
  if(request.headers.get('X-Telegram-Bot-Api-Secret-Token')!==await webhookSecret(env))return new Response('forbidden',{status:403});
  const u=await request.json().catch(()=>null);
  if(u&&u.channel_post){await channelPost(u.channel_post,env);return new Response('ok');}
  const m=u&&u.message;
  // only private chats and only the commands below: the manager's own chat with the bot stays quiet
  if(!m||!m.chat||m.chat.type!=='private'||typeof m.text!=='string')return new Response('ok');
  const cmd=m.text.trim().match(/^\/(start|catalog|help)(?:@\w+)?(?:\s+(\S+))?/i);
  if(!cmd)return new Response('ok');
  const s=await shopSettings(env);
  // t.me/<bot>?start=p_<product> — a link to one piece
  const product=/^p_[A-Za-z0-9_-]{1,100}$/.test(cmd[2]||'')?cmd[2].slice(2):'';
  const name=m.from&&m.from.first_name?', '+String(m.from.first_name).slice(0,40):'';
  const text='Привет'+name+'! Это RELIKT — твой личный импорт.\n\nКаталог, корзина и оформление заказа — в приложении: жми кнопку ниже.'+
    (s.manager?'\nВопросы — менеджеру @'+s.manager+'.':'');
  const rows=[];
  if(product)rows.push([{text:'Открыть вещь',web_app:{url:shopUrl(env)+'product.html?id='+encodeURIComponent(product)}}]);
  rows.push([{text:'Открыть каталог',web_app:{url:shopUrl(env)}}]);
  if(s.channel)rows.push([{text:'Канал RELIKT',url:'https://t.me/'+s.channel}]);
  await tgApi(env,'sendMessage',{chat_id:m.chat.id,text,reply_markup:{inline_keyboard:rows}});
  return new Response('ok');
}
/* one tap in the admin panel: Telegram starts sending the bot's messages here; commands and the menu button get set */
async function botSetup(request,env){
  if(request.method!=='POST')return json({ok:false,error:'method'},405);
  if(!(await isAdmin(request,env)))return json({ok:false,error:'forbidden'},403);
  if(!env.BOT_TOKEN)return json({ok:false,error:'telegram_not_configured'},501);
  const hook=new URL(request.url).origin+'/tg';
  const info=await tgApi(env,'getWebhookInfo');
  const before=info.result&&info.result.url||'';
  // presses of Start that waited while nobody listened are answered now (Telegram keeps them up to a day)
  const set=await tgApi(env,'setWebhook',{url:hook,secret_token:await webhookSecret(env),allowed_updates:['message','channel_post'],drop_pending_updates:false});
  if(!set.ok)return json({ok:false,error:set.description||'telegram_error'},502);
  await tgApi(env,'setMyCommands',{commands:[{command:'start',description:'Открыть магазин'},{command:'catalog',description:'Каталог'}]});
  let menuSet=false;
  const menu=await tgApi(env,'getChatMenuButton',{});
  if(menu.ok&&menu.result&&menu.result.type==='default'){
    const r=await tgApi(env,'setChatMenuButton',{menu_button:{type:'web_app',text:'Каталог',web_app:{url:shopUrl(env)}}});
    menuSet=!!r.ok;
  }
  return json({ok:true,webhook:hook,previous:before&&before!==hook?before:'',menuSet});
}
/* one tap in the admin panel: a post with the catalog button in the channel, pinned silently.
   In a channel a button cannot be a Mini App button, so it is a t.me link that opens the Mini App. */
async function botPin(request,env){
  if(request.method!=='POST')return json({ok:false,error:'method'},405);
  if(!(await isAdmin(request,env)))return json({ok:false,error:'forbidden'},403);
  if(!env.BOT_TOKEN)return json({ok:false,error:'telegram_not_configured'},501);
  const s=await shopSettings(env);
  const app=/^https:\/\/t\.me\/[A-Za-z0-9_]{4,32}(\/[A-Za-z0-9_]{3,30})?$/.test(String(s.miniAppUrl||''))?s.miniAppUrl:'';
  if(!s.channel||!app)return json({ok:false,error:'no_channel_or_link'},400);
  const sent=await tgApi(env,'sendMessage',{chat_id:'@'+s.channel,disable_notification:true,
    text:'RELIKT — каталог\n\nВсе вещи в наличии и под заказ, корзина и оформление заказа — в приложении. Жми кнопку ниже.'+(s.manager?'\nВопросы — @'+s.manager:''),
    reply_markup:{inline_keyboard:[[{text:'Открыть каталог',url:app+'?startapp'}]]}});
  if(!sent.ok)return json({ok:false,error:sent.description||'telegram_error'},502);
  const pin=await tgApi(env,'pinChatMessage',{chat_id:'@'+s.channel,message_id:sent.result.message_id,disable_notification:true});
  return json({ok:true,pinned:!!pin.ok,pinError:pin.ok?'':pin.description||''});
}

/* ---------- orders for the admin panel ---------- */
const adminCache=new Map();
async function isAdmin(request,env){
  const m=(request.headers.get('Authorization')||'').match(/^Bearer\s+(\S{10,255})$/);
  if(!m)return false;
  const key=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(m[1]))));
  if((adminCache.get(key)||0)>Date.now())return true;
  // the same GitHub token the admin panel uses: it must be able to write to the shop repository
  try{const r=await gh(env,m[1],'GET','');if(r.permissions&&r.permissions.push){adminCache.set(key,Date.now()+600000);return true;}}catch(e){}
  return false;
}

async function adminOrders(request,env,action){
  if(request.method!=='POST')return json({ok:false,error:'method'},405);
  if(!(await isAdmin(request,env)))return json({ok:false,error:'forbidden'},403);
  if(!env.ORDERS)return json({ok:false,error:'orders_not_configured'},501);
  const body=await request.json().catch(()=>({}));

  if(action==='list'){
    const page=await env.ORDERS.list({prefix:'o:',limit:num(body.limit,1,100,50),cursor:body.cursor||undefined});
    const orders=(await Promise.all(page.keys.map(k=>env.ORDERS.get(k.name,'json')))).filter(Boolean);
    return json({ok:true,orders,cursor:page.list_complete?null:page.cursor});
  }

  const key=str(body.key,80);
  if(!/^o:\d{13}:RK-[A-Z0-9]{3,12}$/.test(key))return json({ok:false,error:'bad_key'},400);
  const rec=await env.ORDERS.get(key,'json');
  if(!rec)return json({ok:false,error:'not_found'},404);

  if(action==='delete'){await env.ORDERS.delete(key);return json({ok:true});}

  if(action==='update'){
    if(body.note!=null)rec.note=str(body.note,1000);
    const next=body.status;
    try{
    if(next!=null&&next!==rec.status){
      if(!STATUSES.includes(next))return json({ok:false,error:'bad_status'},400);
      if(!env.GITHUB_TOKEN&&rec.claims?.length&&(next==='cancelled'||rec.status==='cancelled'))return json({ok:false,error:'catalog_not_configured'},501);
      if(next==='cancelled'&&rec.claims?.length&&!rec.released){
        rec.skipped=await editCatalog(env,`Отмена заказа ${rec.number}: вещи снова в продаже`,d=>release(d,rec.claims));
        rec.released=true;
      }else if(rec.status==='cancelled'&&rec.released){
        // brought back from cancelled: take the pieces again, if nobody bought them meanwhile
        const items=rec.claims.map(c=>({id:c.id,qty:c.qty}));
        rec.claims=await editCatalog(env,`Заказ ${rec.number} восстановлен`,d=>{
          const bad=unavailable(d,items);
          if(bad.length)throw httpError(409,'unavailable');
          return claim(d,items,next==='reserved'?'reserve':'full');
        });
        rec.released=false;
      }
      if(next==='paid'&&rec.claims?.some(c=>c.to==='reserved')&&!rec.released){
        rec.claims=await editCatalog(env,`Заказ ${rec.number}: бронь выкуплена`,d=>sellReserved(d,rec.claims));
      }
      rec.status=next;
    }
    }catch(e){
      // catalog changes failed: the order keeps its old status, the admin panel shows why
      return json({ok:false,error:e.message||'catalog_error'},e.message==='unavailable'?409:502);
    }
    rec.updatedAt=new Date().toISOString();
    await env.ORDERS.put(key,JSON.stringify(rec),{expirationTtl:ORDER_TTL});
    return json({ok:true,order:rec});
  }
  return json({ok:false,error:'not_found'},404);
}

async function yandexRequest(path,payload,env){
  if(!env.YANDEX_DELIVERY_TOKEN)return json({ok:false,error:'yandex_delivery_not_configured'},500);
  const r=await fetch(YANDEX_BASE+path,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+env.YANDEX_DELIVERY_TOKEN},
    body:JSON.stringify(payload||{})
  });
  const text=await r.text();
  let data;try{data=JSON.parse(text)}catch(e){data={message:text}};
  if(!r.ok)return json({ok:false,error:data?.message||data?.error||('yandex_http_'+r.status),details:data},r.status);
  return json({ok:true,...data});
}
async function yandexGeo(request,env){
  const body=await request.json().catch(()=>null);
  const location=String(body?.location||'').trim();
  if(!location)return json({ok:false,error:'location_required'},400);
  return yandexRequest('/api/b2b/platform/location/detect',{location},env);
}
async function yandexPickupPoints(request,env){
  const body=await request.json().catch(()=>null);
  const payload={
    geo_id:Number(body?.geo_id||0),
    type:body?.type||'pickup_point',
    operator_ids:Array.isArray(body?.operator_ids)?body.operator_ids:['market_l4g','5post'],
    payment_methods:Array.isArray(body?.payment_methods)?body.payment_methods:['already_paid']
  };
  if(body?.latitude)payload.latitude=body.latitude;
  if(body?.longitude)payload.longitude=body.longitude;
  return yandexRequest('/api/b2b/platform/pickup-points/list',payload,env);
}

async function cdek(request,env){
  if(!env.CDEK_CLIENT_ID||!env.CDEK_CLIENT_SECRET)return json({message:'CDEK secrets are not configured'},500,{'X-Service-Version':WIDGET_VERSION});
  const body=await request.text();
  let incoming={};
  try{incoming={...Object.fromEntries(new URL(request.url).searchParams.entries()),...(body?JSON.parse(body):{})}}catch(e){return json({message:'Invalid JSON'},400)}
  const action=incoming.action;
  if(!['offices','calculate','byCoordinate'].includes(action))return json({message:'Action is required or unknown'},400,{'X-Service-Version':WIDGET_VERSION});
  const tokenRes=await fetch(`${CDEK_BASE}/oauth/token`,{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json','X-App-Name':'widget_pvz','X-App-Version':WIDGET_VERSION},
    body:new URLSearchParams({grant_type:'client_credentials',client_id:env.CDEK_CLIENT_ID,client_secret:env.CDEK_CLIENT_SECRET})
  });
  const token=await tokenRes.json();if(!token.access_token)return json({message:'Server not authorized to CDEK API'},502);
  let path,init;
  if(action==='offices'){path='deliverypoints';init={method:'GET'};}
  else if(action==='byCoordinate'){path='deliverypoints/byPolygons';init={method:'GET'};}
  else {path='calculator/tarifflist';init={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(incoming)};}
  const headers={'Accept':'application/json','Authorization':`Bearer ${token.access_token}`,'X-App-Name':'widget_pvz','X-App-Version':WIDGET_VERSION};
  const target=new URL(`${CDEK_BASE}/${path}`);
  if(init.method==='GET')for(const[k,v]of Object.entries(incoming))if(k!=='action')target.searchParams.set(k,String(v));
  const r=await fetch(target.toString(),{...init,headers:{...headers,...(init.headers||{})}});
  const txt=await r.text();
  return new Response(txt,{status:r.status,headers:{...cors(),'Content-Type':'application/json','X-Service-Version':WIDGET_VERSION}});
}
