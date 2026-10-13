import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh as newGame,serverLevel,serverInterval,staffPrice,reducer,orderFor,PEOPLE,MARKETING,marketingDaysLeft,arrivalInterval,load,KEY,FISH_HEADS,ITEMS,RECIPES,customizeRecipe} from './game.js';
// Existing economy tests isolate contract costs from one-time quest rewards.
const fresh=()=>{const s=newGame();return {...s,cash:300000,quests:{...s.quests,done:{sold:true,upgrade:true,hire:true,marketing:true}}};};
const action=(s,type,extra={})=>reducer(s,{type,...extra});
const forgottenPayment=()=>{let s=action(fresh(),'START');const c=s.customers[0];for(const id of c.ingredients)s=action(s,'ADD',{id});return action(s,'SERVE',{id:c.id,roll:0});};
test('forgotten payment keeps the shift running and pays exactly once after five punches',()=>{
  let s=forgottenPayment();assert.equal(s.phase,'open');assert.equal(s.cash,300000);assert.equal(s.stats.revenue,0);assert.equal(s.stats.cogs,7000);assert.equal(s.stats.served,1);
  for(const type of ['RESUME','PUNCH'])assert.deepEqual(action(s,type),s);assert.equal(action(s,'TICK').seconds,s.seconds+1);assert.deepEqual(action(action(s,'PAUSE'),'TICK'),action(s,'PAUSE'));
  s=action(s,'COMBAT');assert.equal(s.encounter.hp,100);
  assert.deepEqual(action(s,'LET_GO'),s);
  for(let i=1;i<=4;i++){s=action(s,'PUNCH');assert.equal(s.encounter.hp,100-i*20);assert.equal(s.cash,300000);}
  s=action(s,'PUNCH');assert.equal(s.encounter.hp,0);assert.equal(s.encounter.stage,'paid');assert.equal(s.cash,322000);assert.equal(s.stats.revenue,22000);assert.equal(s.stats.cogs,7000);
  assert.deepEqual(action(s,'PUNCH'),s);assert.equal(action(s,'TICK').seconds,s.seconds+1);
  s=action(s,'FINISH_COMBAT');assert.equal(s.phase,'open');assert.equal(s.encounter,null);assert.deepEqual(action(s,'PUNCH'),s);
});
test('declining loses the payment; staff also trigger the event; random threshold is 15 percent',()=>{
  let s=action(forgottenPayment(),'LET_GO');assert.equal(s.phase,'open');assert.equal(s.cash,300000);assert.equal(s.stats.unpaid,1);assert.equal(s.stats.cogs,7000);assert.equal(s.encounter,null);assert.deepEqual(action(s,'LET_GO'),s);
  const open=action(action(fresh(),'HIRE',{id:'server'}),'START');
  assert.equal(action({...open,seconds:4},'TICK',{roll:.149}).encounter.stage,'ask');
  const paid=action({...open,seconds:4},'TICK',{roll:.15});assert.equal(paid.phase,'open');assert.equal(paid.stats.revenue>0,true);
});
test('combat progress survives reload without paying early or twice',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  let saved=action(action(forgottenPayment(),'COMBAT'),'PUNCH');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(saved)}});
  try{
    let s=load();assert.equal(s.phase,'open');assert.equal(s.encounter.hp,80);assert.equal(s.cash,300000);
    for(let i=0;i<4;i++)s=action(s,'PUNCH');saved=s;
    s=load();assert.equal(s.encounter.stage,'paid');assert.equal(s.cash,322000);assert.deepEqual(action(s,'PUNCH'),s);
  }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});
test('serve consumes stock once and duplicate delivery cannot pay twice',()=>{let s=action(fresh(),'START');const c=s.customers[0];for(const id of c.ingredients)s=action(s,'ADD',{id});assert.equal(s.stock.pork,11);assert.equal(s.pot,7);s=action(s,'SERVE',{id:c.id});assert.equal(s.cash,325300);assert.equal(s.stats.cogs,7000);assert.equal(s.stats.served,1);assert.deepEqual(action(s,'SERVE',{id:c.id}),s);});
test('wrong bowl is waste, not revenue; paused commands do nothing',()=>{let s=action(fresh(),'START');s=action(s,'ADD',{id:'base'});s=action(s,'SERVE',{id:s.customers[0].id});assert.equal(s.stats.waste,1500);assert.equal(s.cash,300000);s=action(s,'PAUSE');assert.deepEqual(action(s,'TICK'),s);assert.deepEqual(action(s,'ADD',{id:'pork'}),s);});
test('cooking consumes rice once, pauses and produces exactly one batch in 10 seconds',()=>{let s={...fresh(),pot:0};s=action(s,'START');s=action(s,'COOK');assert.equal(s.stock.rice,0);assert.equal(s.cooking,10);s=action(s,'COOK');assert.equal(s.stock.rice,0);assert.equal(action(action(s,'PAUSE'),'TICK').cooking,10);for(let i=0;i<9;i++)s=action(s,'TICK');assert.equal(s.pot,0);assert.equal(s.cooking,1);s=action(s,'TICK');assert.equal(s.pot,8);assert.equal(s.cooking,0);s=action(s,'TICK');assert.equal(s.pot,8);});
test('settlement includes unfinished bowl and batch and is idempotent',()=>{let s=action(fresh(),'START');s=action(s,'ADD',{id:'base'});s=action(s,'ADD',{id:'pork'});s=action(s,'CLOSE');assert.equal(s.report.waste,17000);assert.equal(s.cash,285000);assert.equal(s.report.profit,-32000);assert.deepEqual(action(s,'CLOSE'),s);s=action(s,'NEXT');assert.equal(s.day,2);assert.equal(s.phase,'prep');assert.equal(s.pot,0);});
test('purchases and upgrades respect phase, cash and capacity',()=>{let s=fresh();s=action(s,'BUY',{id:'rice'});assert.equal(s.stock.rice,16);assert.equal(s.cash,288000);s=action(s,'UPGRADE',{id:'pot'});assert.equal(s.cash,138000);assert.equal(s.upgrades.pot,1);const n=action(s,'UPGRADE',{id:'pot'});assert.equal(n.cash,s.cash);s=action(s,'START');assert.deepEqual(action(s,'BUY',{id:'rice'}),s);});
test('combined customizations are represented accurately',()=>{const c=orderFor({...fresh(),day:3,nextId:12});assert.ok(!c.ingredients.includes('onion'));assert.ok(c.ingredients.includes('egg'));assert.match(c.note,/Không hành/);assert.match(c.note,/Thêm trứng/);});
test('full shift ends and next day can cook purchased stock',()=>{let s=action(fresh(),'START');for(let i=0;i<240;i++)s=action(s,'TICK');assert.equal(s.phase,'report');assert.ok(s.report.lost>0);s=action(s,'NEXT');s=action(s,'START');s=action(s,'COOK');assert.equal(s.cooking,10);});

test('all eight named customers have distinct stable looks',()=>{
  const people=Array.from({length:8},(_,i)=>orderFor({...fresh(),nextId:i+1}));
  assert.deepEqual(people.map(c=>c.name),PEOPLE);
  assert.equal(new Set(people.map(c=>c.look)).size,8);
  assert.equal(orderFor({...fresh(),nextId:14}).name,'Bé Ân');
  assert.equal(people[6].name,'Chị Bảy');
  assert.equal(people[7].name,'Anh Mười');
  assert.equal(orderFor({...fresh(),nextId:15}).look,6);
  assert.equal(orderFor({...fresh(),nextId:16}).look,7);
});
test('quay packs cost 35000 for ten, respect capacity, and add 8000 to an order',()=>{
  let s=action(fresh(),'BUY',{id:'quay'});
  assert.equal(s.cash,265000);assert.equal(s.stock.quay,10);
  assert.equal(action({...s,stock:{...s.stock,quay:75}},'BUY',{id:'quay'}).cash,s.cash);
  s=action(s,'START');const c=s.customers[2];
  assert.ok(c.ingredients.includes('quay'));assert.equal(c.price,30000);
  for(const id of c.ingredients)s=action(s,'ADD',{id});
  s=action(s,'SERVE',{id:c.id});assert.equal(s.stock.quay,9);assert.equal(s.stats.cogs,10500);assert.equal(s.stats.revenue,34500);
});
test('opening rush and rating affect arrivals; overflow waits until seated',()=>{
  const high=action(fresh(),'START'),low=action({...fresh(),rating:1},'START');
  assert.equal(high.customers.length,3);assert.equal(low.customers.length,2);
  assert.ok(arrivalInterval(high)<arrivalInterval(low));
  let s={...high,seconds:arrivalInterval(high)-1};s=action(s,'TICK');assert.equal(s.customers.length,4);
  const waiting=s.customers[3];s=action(s,'TICK');assert.equal(s.customers[3].left,waiting.max);
  assert.deepEqual(action(s,'SERVE',{id:waiting.id}),s);
  s={...s,customers:s.customers.slice(1)};s=action(s,'TICK');assert.equal(s.customers[2].left,waiting.max-1);
});
test('marketing prices, cadence, ranges and additive word-of-mouth hires',()=>{
  for(const m of MARKETING){
    let s=action({...fresh(),cash:3000000},'MARKET',{id:m.id});assert.equal(s.cash,3000000-m.price);
    if(m.id!=='gossip')assert.equal(action(s,'MARKET',{id:m.id}).cash,s.cash);
    s=action(s,'START');
    for(const second of [19,39,59]){
      const before={...s,seconds:second,customers:s.customers.map(c=>({...c,left:48}))};
      const organic=action({...before,marketing:{toptop:0,phobo:0,gossip:0}},'TICK');
      const promoted=action(before,'TICK');const extra=promoted.nextId-organic.nextId;
      assert.ok(extra>=m.min&&extra<=m.max);
    }
    const before={...s,seconds:18};
    assert.equal(action(before,'TICK').nextId,action({...before,marketing:{toptop:0,phobo:0,gossip:0}},'TICK').nextId);
    assert.deepEqual(action(action(s,'PAUSE'),'TICK'),action(s,'PAUSE'));
  }
  let s=action(action({...fresh(),cash:2000000},'MARKET',{id:'gossip'}),'MARKET',{id:'gossip'});
  assert.equal(s.marketing.gossip,2);assert.equal(s.cash,1800000);
  s=action(s,'MARKET',{id:'toptop'});s=action(s,'MARKET',{id:'phobo'});s=action(s,'START');
  const before={...s,seconds:19};const base=action({...before,marketing:{toptop:0,phobo:0,gossip:0}},'TICK');
  const extra=action(before,'TICK').nextId-base.nextId;assert.ok(extra>=10&&extra<=18);
});
test('staff contracts charge once, cook automatically and serve without touching player bowl',()=>{
  let s=action(fresh(),'HIRE',{id:'cook'});s=action(s,'HIRE',{id:'server'});
  assert.equal(s.cash,140000);assert.equal(s.expenses,160000);
  assert.equal(action(s,'HIRE',{id:'cook'}).cash,s.cash);
  s=action(s,'START');assert.deepEqual(action(s,'HIRE',{id:'server'}),s);
  const next=action({...s,seconds:4},'TICK');assert.equal(next.stats.served,1);assert.equal(next.pot,7);assert.equal(next.stock.pork,11);assert.equal(s.stock.pork,12);
  const partial=action({...s,seconds:4},'ADD',{id:'base'});const untouched=action(partial,'TICK');assert.deepEqual(untouched.bowl,['base']);assert.equal(untouched.stats.served,0);
  let cooking=action({...s,pot:0},'TICK');assert.equal(cooking.cooking,10);assert.equal(cooking.stock.rice,0);
  const noStock=action({...s,seconds:4,pot:0,stock:{...s.stock,rice:0}},'TICK');assert.equal(noStock.stats.served,0);assert.equal(noStock.cooking,0);
});
test('contract expenses appear once in report and contracts expire next day',()=>{
  let s=action(fresh(),'HIRE',{id:'cook'});s=action(s,'MARKET',{id:'gossip'});s=action(s,'START');s=action(s,'CLOSE');
  assert.equal(s.cash,115000);assert.equal(s.report.expenses,170000);assert.equal(s.report.profit,-197000);
  s=action(s,'NEXT');assert.equal(s.expenses,0);assert.equal(s.staff.cook,0);assert.equal(s.marketing.gossip,0);
  assert.equal(action({...fresh(),cash:0},'HIRE',{id:'cook'}).cash,0);
  assert.equal(action(fresh(),'MARKET',{id:'toptop'}).marketing.toptop,0);
});
test('legacy saves preserve progress and receive new defaults',()=>{
  const old={...fresh(),cash:432100,phase:'open',customers:[{...orderFor(fresh()),name:'Bé Ân',look:0}]};
  delete old.staff;delete old.marketing;delete old.expenses;delete old.stock.quay;
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>key===KEY?JSON.stringify(old):null}});
  try{const s=load();assert.equal(s.cash,432100);assert.equal(s.phase,'open');assert.equal(s.stock.quay,0);assert.equal(s.staff.cook,0);assert.equal(s.marketing.gossip,0);assert.equal(s.customers[0].look,5);}
  finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});

test('marketing lasts exactly 5, 3 or 1 days without repeat charges and can be repurchased',()=>{
  for(const [id,days,price] of [['toptop',5,1000000],['phobo',3,500000],['gossip',1,100000]]){
    let s=action({...fresh(),day:7,cash:3000000},'MARKET',{id});
    assert.equal(s.marketingUntil[id],7+days-1);
    assert.equal(s.cash,3000000-price);
    for(let elapsed=0;elapsed<days;elapsed++){
      assert.equal(marketingDaysLeft(s,id),days-elapsed);
      assert.equal(s.marketing[id],1);
      assert.equal(s.expenses,elapsed===0?price:0);
      if(id!=='gossip')assert.equal(action(s,'MARKET',{id}).cash,s.cash);
      s=action({...s,pot:8},'START');
      const before={...s,seconds:19};
      const organic=action({...before,marketing:{toptop:0,phobo:0,gossip:0}},'TICK');
      assert.ok(action(before,'TICK').nextId>organic.nextId);
      s=action(s,'CLOSE');
      assert.equal(s.report.expenses,elapsed===0?price:0);
      const cash=s.cash;s=action(s,'NEXT');assert.equal(s.cash,cash);
    }
    assert.equal(s.marketing[id],0);assert.equal(marketingDaysLeft(s,id),0);
    const expired=action({...s,pot:8},'START');
    const before={...expired,seconds:19};
    assert.equal(action(before,'TICK').nextId,action({...before,marketing:{toptop:0,phobo:0,gossip:0}},'TICK').nextId);
    const renewed=action(s,'MARKET',{id});assert.equal(renewed.cash,s.cash-price);assert.equal(marketingDaysLeft(renewed,id),days);
  }
});
test('campaign expiry survives save and reload; legacy active campaigns end after today',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  let saved=action({...fresh(),cash:2000000},'MARKET',{id:'toptop'});
  saved=action(action(action(saved,'START'),'CLOSE'),'NEXT');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(saved)}});
  try{
    const restored=load();assert.equal(marketingDaysLeft(restored,'toptop'),4);assert.equal(restored.marketingUntil.toptop,5);
    delete saved.marketingUntil;
    const legacy=load();assert.equal(marketingDaysLeft(legacy,'toptop'),1);
    assert.equal(action({...legacy,phase:'report'},'NEXT').marketing.toptop,0);
  }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});


test('four quests pay exactly once and failed or unrelated actions do not pay',()=>{
  let s={...newGame(),cash:300000};s.quests={...s.quests,upgrade:'stove',marketing:'gossip'};
  s=action(s,'UPGRADE',{id:'decor'});assert.equal(s.quests.rewards,0);
  s=action(s,'UPGRADE',{id:'stove'});assert.equal(s.cash,200000);assert.equal(s.quests.rewards,200000);
  assert.equal(action(s,'UPGRADE',{id:'stove'}).cash,200000);
  s=action(s,'HIRE',{id:'cook'});assert.equal(s.cash,330000);assert.equal(s.quests.rewards,400000);
  assert.equal(action(s,'HIRE',{id:'cook'}).cash,330000);
  s=action(s,'MARKET',{id:'gossip'});assert.equal(s.cash,430000);assert.equal(s.quests.rewards,600000);
  s=action(s,'MARKET',{id:'gossip'});assert.equal(s.cash,330000);assert.equal(s.quests.rewards,600000);
  s=action({...s,totalServed:4},'START');const c=s.customers[0];
  for(const id of c.ingredients)s=action(s,'ADD',{id});
  const before=s.cash;s=action(s,'SERVE',{id:c.id,roll:1});assert.equal(s.cash,before+225300);assert.equal(s.quests.rewards,800000);
  s=action(action(s,'CLOSE'),'NEXT');assert.equal(Object.values(s.quests.done).filter(Boolean).length,4);
  assert.equal(s.quests.rewards,800000);assert.equal(s.totalServed,5);
});

test('server promotion counts hired days, survives gaps, charges new salary and caps speed',()=>{
  let s={...fresh(),serverDays:6,cash:1000000};
  assert.equal(staffPrice(s,'cook'),70000);assert.equal(staffPrice(s,'server'),90000);
  s=action(s,'HIRE',{id:'server'});s=action(s,'START');s=action(s,'CLOSE');
  assert.equal(serverLevel(s),0);s=action(s,'NEXT');assert.equal(s.serverDays,7);
  assert.equal(serverLevel(s),1);assert.equal(staffPrice(s,'server'),110000);assert.equal(serverInterval(s),4);
  const cash=s.cash;s=action(s,'HIRE',{id:'server'});assert.equal(s.cash,cash-110000);
  s=action({...s,pot:8},'START');s=action({...s,seconds:3},'TICK',{roll:1});assert.equal(s.stats.served,1);
  s=action(action(s,'CLOSE'),'NEXT');assert.equal(s.serverDays,8);
  s=action({...s,pot:8},'START');s=action(action(s,'CLOSE'),'NEXT');assert.equal(s.serverDays,8);
  assert.equal(serverInterval({...s,serverDays:70}),1);assert.equal(staffPrice({...s,serverDays:70},'server'),290000);
});

test('queued payment events keep ticking and settle correctly after the shift ends',()=>{
  let s=forgottenPayment();const first=s.encounter.customer.id;
  const c=s.customers[0];for(const id of c.ingredients)s=action(s,'ADD',{id});
  s=action(s,'SERVE',{id:c.id,roll:0});assert.equal(s.encounter.customer.id,first);assert.equal(s.encounters.length,1);
  s=action({...s,seconds:239},'TICK');assert.equal(s.phase,'report');assert.deepEqual(action(s,'NEXT'),s);
  const before=s.report.profit;s=action(s,'COMBAT');for(let i=0;i<5;i++)s=action(s,'PUNCH');
  assert.equal(s.report.revenue,22000);assert.equal(s.report.profit,before+22000);
  s=action(s,'FINISH_COMBAT');assert.equal(s.encounter.customer.id,c.id);s=action(s,'LET_GO');
  assert.equal(s.encounter,null);assert.equal(s.stats.unpaid,1);s=action(s,'NEXT');assert.equal(s.phase,'prep');
});

test('new progress and renamed legacy customers survive reload without duplicate rewards',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  let saved=newGame();saved.quests.marketing='gossip';saved=action(saved,'HIRE',{id:'server'});saved.serverDays=14;
  saved.customers=[{...orderFor(saved),name:'Thầy 3',look:0}];
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(saved)}});
  try{
    const s=load();assert.equal(s.cash,saved.cash);assert.deepEqual(s.quests,saved.quests);assert.equal(s.serverDays,14);
    assert.equal(s.customers[0].name,'Anh Ba');assert.equal(s.customers[0].look,1);assert.equal(s.branchId,'my-tho');
    assert.equal(action(s,'HIRE',{id:'server'}).cash,s.cash);
    delete saved.quests;delete saved.serverDays;delete saved.branchId;
    const migrated=load();assert.ok(migrated.quests.upgrade);assert.ok(migrated.quests.marketing);assert.equal(migrated.serverDays,0);
  }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});

test('fully upgraded legacy saves receive reachable quest completion only once',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  let saved={...newGame(),cash:123000,totalServed:12,upgrades:{pot:3,stove:3,decor:3}};
  delete saved.quests;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(saved)}});
  try{
    saved=load();assert.equal(saved.cash,523000);assert.equal(saved.quests.rewards,400000);
    assert.equal(saved.quests.done.upgrade,true);assert.equal(saved.quests.done.sold,true);
    const reloaded=load();assert.equal(reloaded.cash,523000);assert.deepEqual(reloaded.quests,saved.quests);
  }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});

test('fish heads use exact pack prices, capacity and standalone selling prices',()=>{
  for(const [id,packPrice,salePrice] of [['headSmall',75000,30000],['headMedium',110000,45000],['headLarge',165000,60000]]){
    let s=fresh();assert.equal(s.stock[id],0);assert.equal(ITEMS[id].pack,5);
    s=action(s,'BUY',{id});assert.equal(s.cash,300000-packPrice);assert.equal(s.stock[id],5);
    const full={...s,stock:{...s.stock,[id]:78}};assert.equal(action(full,'BUY',{id}).stock[id],78);
    const poor={...fresh(),cash:packPrice-1};assert.equal(action(poor,'BUY',{id}).stock[id],0);
    const c=Array.from({length:35},(_,i)=>orderFor({...s,day:3,nextId:i+1})).find(c=>c.recipe===id);
    assert.ok(c);assert.deepEqual(c.ingredients,[id,'onion']);assert.equal(c.price,salePrice);
    s=action(s,'START');s={...s,customers:[c],pot:0};for(const ingredient of c.ingredients)s=action(s,'ADD',{id:ingredient});
    assert.equal(s.stock[id],4);assert.equal(s.pot,0);
    const before=s.cash;s=action(s,'SERVE',{id:c.id,roll:1});
    assert.equal(s.stats.cogs,packPrice/5+500);assert.equal(s.cash,before+salePrice+Math.round(salePrice*.15/100)*100);
    assert.equal(s.stats.served,1);assert.deepEqual(action(s,'SERVE',{id:c.id}),s);
  }
});

test('fish-head stock unlocks orders and staff can serve them without porridge',()=>{
  const empty=fresh();
  for(let nextId=1;nextId<=20;nextId++)assert.ok(!orderFor({...empty,nextId}).recipe.startsWith('head'));
  let s=action(empty,'BUY',{id:'headSmall'});s=action(s,'HIRE',{id:'server'});
  s={...s,pot:0,stock:{...s.stock,rice:0,onion:8,pork:0,fish:0}};s=action(s,'START');assert.equal(s.phase,'open');
  const c=Array.from({length:10},(_,i)=>orderFor({...s,nextId:i+1})).find(c=>c.recipe==='headSmall');
  s=action({...s,seconds:4,customers:[c]},'TICK',{roll:1});
  assert.equal(s.stats.served,1);assert.equal(s.stock.headSmall,4);assert.equal(s.pot,0);assert.equal(s.stats.cogs,15500);
  assert.equal(RECIPES.filter(r=>r.standalone).length,3);
});

test('legacy saves initialize fish-head stock and retain purchased stock after reload',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  let saved=fresh();for(const h of FISH_HEADS)delete saved.stock[h.id];
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(saved)}});
  try{
    saved=load();for(const h of FISH_HEADS)assert.equal(saved.stock[h.id],0);
    saved=action(saved,'BUY',{id:'headLarge'});const restored=load();
    assert.equal(restored.stock.headLarge,5);assert.equal(restored.cash,135000);
  }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});

test('every menu item accepts all toppings and egg adds exactly 6000',()=>{
  for(const r of RECIPES){
    const plain=customizeRecipe(r);
    const egg=customizeRecipe(r,{egg:true});
    assert.equal(egg.price,plain.price+6000);assert.ok(egg.ingredients.includes('egg'));
    const all=customizeRecipe(r,{egg:true,quay:true,pepper:true});
    assert.equal(all.price,r.price+14000);
    for(const id of ['onion','egg','quay','pepper'])assert.ok(all.ingredients.includes(id));
    if(r.standalone)assert.ok(customizeRecipe(r,{noOnion:true}).ingredients.includes('onion'));
  }
});

test('head accompaniments charge menu prices with onion counted once',()=>{
  for(const head of RECIPES.filter(r=>r.standalone)){
    const plain=customizeRecipe(head,{side:'base'});
    assert.equal(plain.price,head.price+3000);
    assert.deepEqual(new Set(plain.ingredients),new Set([head.id,'onion','base']));
    for(const porridge of RECIPES.filter(r=>!r.standalone)){
      const combo=customizeRecipe(head,{side:porridge.id,egg:true,quay:true,pepper:true});
      assert.equal(combo.price,head.price+porridge.price+14000);
      assert.equal(combo.ingredients.length,7);assert.equal(new Set(combo.ingredients).size,7);
      assert.ok(combo.note.includes(porridge.name.toLowerCase()));
      let s=action(fresh(),'START');
      const c={...orderFor(s),...combo,recipe:head.id};
      s={...s,customers:[c],stock:{...s.stock,[head.id]:5,quay:5}};
      const stock={...s.stock};for(const id of c.ingredients)s=action(s,'ADD',{id});
      assert.equal(s.bowl.length,7);assert.equal(s.pot,7);
      s=action(s,'SERVE',{id:c.id,roll:1});
      assert.equal(s.stats.served,1);assert.equal(s.stats.wrong,0);
      assert.equal(s.stats.cogs,c.ingredients.reduce((sum,id)=>sum+ITEMS[id].price,0));
      assert.equal(s.stock.onion,stock.onion-1);
    }
  }
});

test('generated orders cover toppings on every dish and only unlocked porridge sides',()=>{
  for(const day of [1,4]){
    const s={...fresh(),day};for(const head of FISH_HEADS)s.stock[head.id]=5;
    const orders=Array.from({length:2000},(_,i)=>orderFor({...s,nextId:i+1}));
    for(const r of RECIPES.filter(r=>r.day<=day)){
      const matching=orders.filter(c=>c.recipe===r.id);
      for(const topping of ['onion','egg','quay','pepper'])assert.ok(matching.some(c=>c.ingredients.includes(topping)),`${r.id}: ${topping}`);
      if(r.standalone){
        assert.ok(matching.every(c=>c.ingredients.includes('onion')));
        assert.ok(matching.some(c=>c.ingredients.includes('base')));
        assert.ok(matching.some(c=>c.ingredients.includes('fish')));
        if(day===1)assert.ok(matching.every(c=>!c.ingredients.includes('chicken')&&!c.ingredients.includes('ribs')));
      }
    }
  }
});

test('server serves a seven-ingredient head combo and missing onion blocks service',()=>{
  let s=action(action(fresh(),'HIRE',{id:'server'}),'START');
  const c={...orderFor(s),recipe:'headLarge',...customizeRecipe(RECIPES.find(r=>r.id==='headLarge'),{side:'fish',egg:true,quay:true,pepper:true})};
  s={...s,seconds:4,customers:[c],stock:{...s.stock,headLarge:5,quay:5}};
  const blocked=action({...s,stock:{...s.stock,onion:0}},'TICK',{roll:1});
  assert.equal(blocked.stats.served,0);assert.equal(blocked.stock.headLarge,5);
  s=action(s,'TICK',{roll:1});assert.equal(s.stats.served,1);assert.equal(s.stats.wrong,0);
  assert.equal(s.stock.headLarge,4);assert.equal(s.pot,7);
});
