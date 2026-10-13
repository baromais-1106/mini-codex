export const KEY='chao-dau-hem-v1';
export const FORGET_PAYMENT_CHANCE=.15;
export const money=n=>new Intl.NumberFormat('vi-VN').format(n)+'đ';
export const ITEMS={rice:{name:'Gạo thơm',icon:'🌾',price:1500,group:'stock'},base:{name:'Cháo nền',icon:'🥣',price:1500,group:'main'},pork:{name:'Thịt bằm',icon:'🥩',price:5000,group:'main'},chicken:{name:'Gà xé',icon:'🍗',price:7000,group:'main'},ribs:{name:'Sườn non',icon:'🍖',price:8500,group:'main'},fish:{name:'Cá lóc',icon:'🐟',price:6500,group:'main'},onion:{name:'Hành lá',icon:'🌱',price:500,group:'extra'},egg:{name:'Trứng',icon:'🥚',price:3000,group:'extra'},quay:{name:'Bánh quẩy',icon:'🥖',price:3500,pack:10,group:'extra'},pepper:{name:'Tiêu',icon:'🧂',price:500,group:'extra'}};
export const RECIPES=[{id:'pork',name:'Cháo thịt bằm',price:22000,day:1,ingredients:['base','pork','onion']},{id:'chicken',name:'Cháo gà',price:28000,day:2,ingredients:['base','chicken','onion']},{id:'ribs',name:'Cháo sườn',price:35000,day:4,ingredients:['base','ribs','onion']},{id:'fish',name:'Cháo cá',price:25000,day:1,ingredients:['base','fish','onion']}];
export const FISH_HEADS=[
  {id:'headSmall',size:'nhỏ',sale:30000,cost:15000},
  {id:'headMedium',size:'vừa',sale:45000,cost:22000},
  {id:'headLarge',size:'lớn',sale:60000,cost:33000},
];
for(const head of FISH_HEADS){
  ITEMS[head.id]={name:`Đầu cá lóc ${head.size}`,icon:'🐟',price:head.cost,pack:5,unit:'đầu',group:'main'};
  RECIPES.push({id:head.id,name:`Đầu cá lóc ${head.size}`,price:head.sale,day:1,ingredients:[head.id,'onion'],standalone:true});
}
const headStock=()=>Object.fromEntries(FISH_HEADS.map(h=>[h.id,0]));
export const UPGRADES=[{id:'pot',name:'Nồi cháo lớn',icon:'🍲',desc:'Thêm 2 phần mỗi mẻ',price:150000},{id:'stove',name:'Bếp lửa hồng',icon:'🔥',desc:'Nấu nhanh hơn 3 giây',price:180000},{id:'decor',name:'Góc quán xinh',icon:'🪴',desc:'Khách chờ thêm 6 giây',price:120000}];
export const PEOPLE=['Phây Cơ','Anh Ba','Em Vũ','Lão Gà Khô','Anh Phú','Bé Ân','Chị Bảy','Anh Mười'];
export const STAFF=[{id:'cook',name:'Nhân viên bếp',icon:'👨‍🍳',price:70000,desc:'Tự nấu mẻ mới khi hết cháo và đủ gạo.'},{id:'server',name:'Nhân viên phục vụ',icon:'🙋',price:90000,desc:'Mỗi 5 giây tự làm và giao một đơn đủ nguyên liệu khi tô của bạn trống.'}];
export const MARKETING=[{id:'toptop',name:'Quảng cáo trên toptop',price:1000000,days:5,min:5,max:7},{id:'phobo',name:'Quảng cáo trên phở bò',price:500000,days:3,min:3,max:5},{id:'gossip',name:'Hội buôn dưa lê truyền miệng',price:100000,days:1,min:1,max:3}];

export const BRANCH={id:'my-tho',name:'Mỹ Tho, Đồng Tháp'};
export const serverLevel=s=>Math.floor((s.serverDays||0)/7);
export const serverInterval=s=>Math.max(1,5-serverLevel(s));
export const staffPrice=(s,id)=>id==='server'?90000+serverLevel(s)*20000:70000;
function newQuests(s){
  const candidates=UPGRADES.filter(u=>(s?.upgrades?.[u.id]||0)<3);
  const pick=list=>list[Math.floor(Math.random()*list.length)]?.id;
  return {upgrade:pick(candidates)||'pot',marketing:pick(MARKETING),done:{},rewards:0};
}
function migrate(s){
  const quests=s.quests||newQuests(s);
  // An old save with every upgrade maxed must not receive an impossible quest.
  let legacyReward=0;
  if(!s.quests){
    if(UPGRADES.every(u=>s.upgrades[u.id]>=3)){quests.done.upgrade=true;legacyReward+=200000;}
    if(s.totalServed>=5){quests.done.sold=true;legacyReward+=200000;}
    quests.rewards=legacyReward;
  }
  const person=c=>c?{...c,name:c.name==='Thầy 3'?'Anh Ba':c.name,look:Math.max(0,PEOPLE.indexOf(c.name==='Thầy 3'?'Anh Ba':c.name))}:c;
  return {...s,quests,cash:s.cash+legacyReward,serverDays:s.serverDays||0,branchId:s.branchId||BRANCH.id,
    customers:s.customers.map(person),encounter:s.encounter?{...s.encounter,customer:person(s.encounter.customer)}:null,
    encounters:(s.encounters||[]).map(e=>({...e,customer:person(e.customer)})),phase:s.phase==='payment'?'open':s.phase};
}
function advanceEncounter(s){return {...s,encounter:s.encounters?.[0]||null,encounters:(s.encounters||[]).slice(1)};}
function rewardQuests(s,a,before){
  const q=s.quests;if(!q)return s;
  const achieved={sold:s.totalServed>=5,upgrade:a.type==='UPGRADE'&&a.id===q.upgrade&&s.upgrades[a.id]>(before.upgrades[a.id]||0),
    hire:a.type==='HIRE'&&s.staff[a.id]>before.staff[a.id],marketing:a.type==='MARKET'&&a.id===q.marketing&&s.marketing[a.id]>before.marketing[a.id]};
  const newly=Object.keys(achieved).filter(id=>achieved[id]&&!q.done[id]);
  if(!newly.length)return s;
  const amount=newly.length*200000;
  return {...s,cash:s.cash+amount,quests:{...q,done:{...q.done,...Object.fromEntries(newly.map(id=>[id,true]))},rewards:(q.rewards||0)+amount},notice:`${s.notice} · Hoàn thành nhiệm vụ! +${money(amount)}`};
}
export function reducer(s,a){const next=reduceGame(s,a);return next===s?s:rewardQuests(next,a,s);}

export const arrivalInterval=s=>Math.max(4,Math.round(19-s.rating*2-Math.min(s.day,6)/2));
const contracts=()=>({staff:{cook:0,server:0},marketing:{toptop:0,phobo:0,gossip:0},marketingUntil:{},expenses:0});
// Legacy campaigns without an expiry retain their original one-day term.
export const marketingDaysLeft=(s,id)=>s.marketing[id]?Math.max(0,(s.marketingUntil?.[id]??s.day)-s.day+1):0;
function carryMarketing(s){const marketing={},marketingUntil={};for(const m of MARKETING){const active=marketingDaysLeft(s,m.id)>1;marketing[m.id]=active?s.marketing[m.id]:0;if(active)marketingUntil[m.id]=s.marketingUntil[m.id];}return {marketing,marketingUntil};}
function arrive(s,count){for(let i=0;i<count;i++){s.customers.push(orderFor(s));s.nextId++;}return s;}
const emptyStats=()=>({revenue:0,cogs:0,waste:0,served:0,lost:0,wrong:0});
export function fresh(){return {schema:1,quests:newQuests(),serverDays:0,branchId:BRANCH.id,encounter:null,encounters:[],...contracts(),day:1,cash:500000,rating:4.5,phase:'prep',seconds:0,customers:[],nextId:1,bowl:[],pot:8,cooking:0,stock:{...headStock(),quay:0,rice:8,pork:12,chicken:8,ribs:6,fish:8,onion:24,egg:8,pepper:10},upgrades:{pot:0,stove:0,decor:0},stats:emptyStats(),totalServed:0,report:null,notice:'',rescueUsed:false};}
export function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s?.schema===1&&Number.isFinite(s.cash)&&s.stock&&s.upgrades&&s.stats&&Array.isArray(s.customers)&&Array.isArray(s.bowl))return migrate({...contracts(),...s,staff:{...contracts().staff,...s.staff},marketing:{...contracts().marketing,...s.marketing},stock:{...headStock(),quay:0,fish:8,...s.stock},customers:s.customers.map(c=>({...c,look:Math.max(0,PEOPLE.indexOf(c.name))})),phase:s.phase});}catch{}return fresh();}
const cost=list=>list.reduce((n,id)=>n+ITEMS[id].price,0);
const same=(a,b)=>[...a].sort().join(',')===[...b].sort().join(',');
export const TOPPING_PRICES={egg:6000,quay:8000,pepper:0};
export const PLAIN_PORRIDGE_PRICE=3000;
export function customizeRecipe(r,{noOnion=false,egg=false,quay=false,pepper=false,side=null}={}){
  const ingredients=r.ingredients.filter(id=>!(noOnion&&!r.standalone&&id==='onion'));
  const notes=[];let price=r.price;
  if(r.standalone)notes.push('Kèm hành');
  else if(noOnion)notes.push('Không hành');
  if(r.standalone&&side){
    const porridge=side==='base'?{name:'cháo nền',price:PLAIN_PORRIDGE_PRICE,ingredients:['base']}:RECIPES.find(item=>item.id===side&&!item.standalone);
    if(porridge){
      for(const id of porridge.ingredients)if(!ingredients.includes(id))ingredients.push(id);
      price+=porridge.price;
      notes.push(`Kèm ${porridge.name.toLowerCase()} (+${money(porridge.price)})`);
    }
  }
  for(const [id,selected] of Object.entries({egg,quay,pepper})){
    if(!selected)continue;
    ingredients.push(id);price+=TOPPING_PRICES[id];
    notes.push(id==='egg'?'Thêm trứng (+6.000đ)':id==='quay'?'Kèm bánh quẩy (+8.000đ)':'Thêm tiêu');
  }
  return {ingredients,price,note:notes.join(' · ')||'Một tô nóng nhé!'};
}
export function orderFor(s){
  const unlocked=RECIPES.filter(r=>r.day<=s.day&&(!r.standalone||s.stock[r.id]>0));
  const r=unlocked[(s.nextId-1)%unlocked.length];
  // Vary head orders independently of their position in the menu.
  const cycle=Math.floor((s.nextId-1)/unlocked.length);
  const sides=[null,'base',...RECIPES.filter(item=>!item.standalone&&item.day<=s.day).map(item=>item.id)];
  const toppingCycle=Math.floor(cycle/sides.length);
  const variant=s.nextId+Math.floor(cycle/4);
  const options=r.standalone?{side:sides[cycle%sides.length],egg:toppingCycle%2===1,quay:Math.floor(toppingCycle/2)%2===1,pepper:Math.floor(toppingCycle/4)%2===1}
    :{noOnion:s.day>=2&&s.nextId%3===0,egg:variant%4===0,quay:variant%3===0,pepper:variant%5===0};
  const max=48+s.upgrades.decor*6;
  return {id:s.nextId,recipe:r.id,name:PEOPLE[(s.nextId-1)%PEOPLE.length],look:(s.nextId-1)%PEOPLE.length,
    ...customizeRecipe(r,options),left:max,max};
}

function settle(s){const waste=s.stats.waste+cost(s.bowl)+(s.pot+(s.cooking?8+s.upgrades.pot*2:0))*1500,overhead=Math.min(s.cash,15000);return {...s,phase:'report',bowl:[],pot:0,cooking:0,customers:[],cash:s.cash-overhead,report:{...s.stats,waste,overhead,expenses:s.expenses,profit:s.stats.revenue-s.stats.cogs-waste-overhead-s.expenses,unfinished:s.customers.length},notice:''};}
function reduceGame(s,a){const note=notice=>({...s,notice});switch(a.type){
case 'START':{if(s.phase!=='prep')return s;const hasHeads=s.stock.onion>0&&FISH_HEADS.some(h=>s.stock[h.id]>0);if(!hasHeads&&!s.pot&&s.stock.rice<8+s.upgrades.pot*2)return note('Mua thêm gạo trước khi mở quán nhé.');if(!hasHeads&&(!s.stock.onion||!RECIPES.some(r=>r.day<=s.day&&s.stock[r.id]>0)))return note('Cần hành và ít nhất một loại thịt hoặc cá cho thực đơn hôm nay.');const n={...s,phase:'open',seconds:0,stats:emptyStats(),report:null,notice:'Chạm nguyên liệu, rồi chạm khách để giao tô!'};return arrive({...n,customers:[]},s.rating>=4?3:2);}
case 'TICK':{if(s.phase!=='open')return s;if(s.seconds>=239)return settle(s);
const expired=s.customers.slice(0,3).filter(c=>c.left<=1).length;
let n={...s,seconds:s.seconds+1,cooking:Math.max(0,s.cooking-1),pot:s.cooking===1?8+s.upgrades.pot*2:s.pot,customers:s.customers.map((c,i)=>i<3?{...c,left:c.left-1}:c).filter(c=>c.left>0),stats:{...s.stats,lost:s.stats.lost+expired},rating:Math.max(1,s.rating-expired*.08)};
if(n.seconds%arrivalInterval(n)===0)arrive(n,1);
if(n.seconds%20===0){let extra=0;for(const m of MARKETING){for(let i=0;i<n.marketing[m.id];i++)extra+=m.min+((n.nextId*7+n.seconds/20+i*5)%(m.max-m.min+1));}if(extra){arrive(n,extra);n.notice=`Marketing thu hút thêm ${extra} khách!`;}}
if(n.staff.server&&n.seconds%serverInterval(n)===0&&!n.bowl.length){const c=n.customers.slice(0,3).find(c=>c.ingredients.every(id=>(id==='base'?n.pot:n.stock[id])>0));if(c){for(const id of c.ingredients)n=reducer(n,{type:'ADD',id});n=reducer(n,{type:'SERVE',id:c.id,roll:a.roll});}}
if(n.staff.cook&&!n.pot&&!n.cooking&&n.stock.rice>=8+n.upgrades.pot*2)n=reducer(n,{type:'COOK'});
return n;}
case 'ADD':{if(s.phase!=='open'||!ITEMS[a.id]||a.id==='rice')return s;if(s.bowl.length>=7)return note('Tô đã đầy rồi!');if((a.id==='base'?s.pot:s.stock[a.id])<=0)return note(a.id==='base'?'Hết cháo rồi, nấu mẻ mới nhé!':'Nguyên liệu này đã hết.');return {...s,bowl:[...s.bowl,a.id],pot:a.id==='base'?s.pot-1:s.pot,stock:a.id==='base'?s.stock:{...s.stock,[a.id]:s.stock[a.id]-1},notice:''};}
case 'DISCARD':return s.phase!=='open'?s:{...s,bowl:[],stats:{...s.stats,waste:s.stats.waste+cost(s.bowl)},notice:'Đã bỏ tô. Nguyên liệu tính vào hao hụt.'};
case 'SERVE':{if(s.phase!=='open')return s;const c=s.customers.slice(0,3).find(c=>c.id===a.id);if(!c)return s;if(!s.bowl.length)return note('Thêm cháo và topping vào tô trước nhé.');if(!same(s.bowl,c.ingredients))return {...s,bowl:[],rating:Math.max(1,s.rating-.1),stats:{...s.stats,wrong:s.stats.wrong+1,waste:s.stats.waste+cost(s.bowl)},notice:`Chưa đúng! Cần ${c.ingredients.map(i=>ITEMS[i].name).join(' + ')}.`};const tip=Math.round(c.price*.15*c.left/c.max/100)*100;
const forgot=Number.isFinite(a.roll)&&a.roll>=0&&a.roll<FORGET_PAYMENT_CHANCE;
const paid=forgot?0:c.price+tip;
return {...s,bowl:[],cash:s.cash+paid,rating:Math.min(5,s.rating+.025),totalServed:s.totalServed+1,customers:s.customers.filter(x=>x.id!==c.id),stats:{...s.stats,served:s.stats.served+1,revenue:s.stats.revenue+paid,cogs:s.stats.cogs+cost(s.bowl)},...(forgot?(s.encounter?{encounters:[...(s.encounters||[]),{customer:c,amount:c.price,hp:100,stage:'ask'}]}:{encounter:{customer:c,amount:c.price,hp:100,stage:'ask'}}):{}),notice:forgot?`${c.name} quên trả tiền!`:`Ngon quá! +${money(paid)} · Boa ${money(tip)}`};}
case 'COMBAT':return s.encounter?.stage==='ask'?{...s,encounter:{...s.encounter,stage:'fight'}}:s;
case 'LET_GO':return s.encounter?.stage==='ask'?{...advanceEncounter(s),stats:{...s.stats,unpaid:(s.stats.unpaid||0)+1},...(s.report?{report:{...s.report,unpaid:(s.report.unpaid||0)+1}}:{}),notice:`Đã cho ${s.encounter.customer.name} đi. Không thu được ${money(s.encounter.amount)}.`}:s;
case 'PUNCH':{if(s.encounter?.stage!=='fight')return s;const hp=Math.max(0,s.encounter.hp-20),paid=hp===0?s.encounter.amount:0;return {...s,encounter:{...s.encounter,hp,stage:hp===0?'paid':'fight'},cash:s.cash+paid,stats:{...s.stats,revenue:s.stats.revenue+paid},...(s.report?{report:{...s.report,revenue:s.report.revenue+paid,profit:s.report.profit+paid}}:{}),notice:hp===0?`${s.encounter.customer.name} đã trả ${money(paid)}!`:s.notice};}
case 'FINISH_COMBAT':return s.encounter?.stage==='paid'?advanceEncounter(s):s;
case 'COOK':{if(s.phase!=='open')return s;const size=8+s.upgrades.pot*2;if(s.pot||s.cooking)return note('Dùng hết nồi hiện tại trước khi nấu mẻ mới.');if(s.stock.rice<size)return note(`Cần ${size} phần gạo cho một mẻ.`);return {...s,stock:{...s.stock,rice:s.stock.rice-size},cooking:Math.max(4,10-s.upgrades.stove*3),notice:'Đang nấu cháo… Mùi thơm lan khắp hẻm!'};}
case 'BUY':{if(s.phase!=='prep'||!ITEMS[a.id]||a.id==='base')return s;const pack=ITEMS[a.id].pack||8,price=ITEMS[a.id].price*pack;if(s.cash<price)return note('Chưa đủ tiền mua gói này.');if(s.stock[a.id]+pack>80)return note('Kho chứa tối đa 80 phần mỗi loại.');return {...s,cash:s.cash-price,stock:{...s.stock,[a.id]:s.stock[a.id]+pack},notice:`Đã nhập ${pack} ${ITEMS[a.id].unit||'phần'} ${ITEMS[a.id].name.toLowerCase()}.`};}
case 'HIRE':case 'MARKET':{if(s.phase!=='prep')return s;const hiring=a.type==='HIRE',list=hiring?STAFF:MARKETING,item=list.find(x=>x.id===a.id);if(!item)return s;const key=hiring?'staff':'marketing';if(s[key][a.id]&&a.id!=='gossip')return note(hiring?'Đã thuê cho ca này.':'Quảng cáo vẫn còn hiệu lực.');const price=hiring?staffPrice(s,a.id):item.price;if(s.cash<price)return note('Chưa đủ tiền.');return {...s,cash:s.cash-price,expenses:s.expenses+price,[key]:{...s[key],[a.id]:s[key][a.id]+1},...(!hiring?{marketingUntil:{...s.marketingUntil,[a.id]:s.day+item.days-1}}:{}),notice:hiring?`Đã đăng ký ${item.name} cho ca hôm nay.`:`Đã đăng ký ${item.name} trong ${item.days} ngày, đến hết ngày ${s.day+item.days-1}.`};}
case 'UPGRADE':{if(s.phase!=='prep')return s;const u=UPGRADES.find(u=>u.id===a.id);if(!u)return s;const level=s.upgrades[a.id],price=u.price*(level+1);if(level>=3)return note('Đã đạt cấp tối đa.');if(s.cash<price)return note('Tích góp thêm một chút để nâng cấp nhé!');return {...s,cash:s.cash-price,upgrades:{...s.upgrades,[a.id]:level+1},notice:`${u.name} đã lên cấp ${level+1}!`};}
case 'PAUSE':return s.phase==='open'?{...s,phase:'paused'}:s;
case 'RESUME':return s.phase==='paused'?{...s,phase:'open'}:s;
case 'CLOSE':return ['open','paused'].includes(s.phase)?settle(s):s;
case 'NEXT':return s.phase!=='report'||s.encounter?s:{...s,serverDays:(s.serverDays||0)+(s.staff.server?1:0),...contracts(),...carryMarketing(s),day:s.day+1,phase:'prep',seconds:0,report:null,notice:'Ngày mới, nồi cháo mới. Chuẩn bị mở hàng thôi!'};
case 'RESCUE':return s.phase!=='prep'||s.rescueUsed||s.cash>=20000?s:{...s,cash:s.cash+50000,rescueUsed:true,notice:'Nhận 50.000đ hỗ trợ khởi nghiệp (một lần).'};
case 'RESET':return fresh();default:return s;}}
