import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,reducer,orderFor,PEOPLE,MARKETING,marketingDaysLeft,arrivalInterval,load,KEY} from './game.js';
const action=(s,type,extra={})=>reducer(s,{type,...extra});
const forgottenPayment=()=>{let s=action(fresh(),'START');const c=s.customers[0];for(const id of c.ingredients)s=action(s,'ADD',{id});return action(s,'SERVE',{id:c.id,roll:0});};
test('forgotten payment pauses the shift and pays exactly once after five punches',()=>{
  let s=forgottenPayment();assert.equal(s.phase,'payment');assert.equal(s.cash,300000);assert.equal(s.stats.revenue,0);assert.equal(s.stats.cogs,7000);assert.equal(s.stats.served,1);
  for(const type of ['TICK','CLOSE','PAUSE','RESUME','PUNCH','COOK'])assert.deepEqual(action(s,type),s);
  s=action(s,'COMBAT');assert.equal(s.encounter.hp,100);
  assert.deepEqual(action(s,'LET_GO'),s);
  for(let i=1;i<=4;i++){s=action(s,'PUNCH');assert.equal(s.encounter.hp,100-i*20);assert.equal(s.cash,300000);}
  s=action(s,'PUNCH');assert.equal(s.encounter.hp,0);assert.equal(s.encounter.stage,'paid');assert.equal(s.cash,322000);assert.equal(s.stats.revenue,22000);assert.equal(s.stats.cogs,7000);
  assert.deepEqual(action(s,'PUNCH'),s);assert.deepEqual(action(s,'TICK'),s);
  s=action(s,'FINISH_COMBAT');assert.equal(s.phase,'open');assert.equal(s.encounter,null);assert.deepEqual(action(s,'PUNCH'),s);
});
test('declining loses the payment; staff also trigger the event; random threshold is 15 percent',()=>{
  let s=action(forgottenPayment(),'LET_GO');assert.equal(s.phase,'open');assert.equal(s.cash,300000);assert.equal(s.stats.unpaid,1);assert.equal(s.stats.cogs,7000);assert.equal(s.encounter,null);assert.deepEqual(action(s,'LET_GO'),s);
  const open=action(action(fresh(),'HIRE',{id:'server'}),'START');
  assert.equal(action({...open,seconds:4},'TICK',{roll:.149}).phase,'payment');
  const paid=action({...open,seconds:4},'TICK',{roll:.15});assert.equal(paid.phase,'open');assert.equal(paid.stats.revenue>0,true);
});
test('combat progress survives reload without paying early or twice',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  let saved=action(action(forgottenPayment(),'COMBAT'),'PUNCH');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(saved)}});
  try{
    let s=load();assert.equal(s.phase,'payment');assert.equal(s.encounter.hp,80);assert.equal(s.cash,300000);
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
  assert.equal(s.cash,160000);assert.equal(s.expenses,140000);
  assert.equal(action(s,'HIRE',{id:'cook'}).cash,s.cash);
  s=action(s,'START');assert.deepEqual(action(s,'HIRE',{id:'server'}),s);
  const next=action({...s,seconds:4},'TICK');assert.equal(next.stats.served,1);assert.equal(next.pot,7);assert.equal(next.stock.pork,11);assert.equal(s.stock.pork,12);
  const partial=action({...s,seconds:4},'ADD',{id:'base'});const untouched=action(partial,'TICK');assert.deepEqual(untouched.bowl,['base']);assert.equal(untouched.stats.served,0);
  let cooking=action({...s,pot:0},'TICK');assert.equal(cooking.cooking,10);assert.equal(cooking.stock.rice,0);
  const noStock=action({...s,seconds:4,pot:0,stock:{...s.stock,rice:0}},'TICK');assert.equal(noStock.stats.served,0);assert.equal(noStock.cooking,0);
});
test('contract expenses appear once in report and contracts expire next day',()=>{
  let s=action(fresh(),'HIRE',{id:'cook'});s=action(s,'MARKET',{id:'gossip'});s=action(s,'START');s=action(s,'CLOSE');
  assert.equal(s.cash,105000);assert.equal(s.report.expenses,180000);assert.equal(s.report.profit,-207000);
  s=action(s,'NEXT');assert.equal(s.expenses,0);assert.equal(s.staff.cook,0);assert.equal(s.marketing.gossip,0);
  assert.equal(action({...fresh(),cash:0},'HIRE',{id:'cook'}).cash,0);
  assert.equal(action(fresh(),'MARKET',{id:'toptop'}).marketing.toptop,0);
});
test('legacy saves preserve progress and receive new defaults',()=>{
  const old={...fresh(),cash:432100,phase:'open',customers:[{...orderFor(fresh()),name:'Bé Ân',look:0}]};
  delete old.staff;delete old.marketing;delete old.expenses;delete old.stock.quay;
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>key===KEY?JSON.stringify(old):null}});
  try{const s=load();assert.equal(s.cash,432100);assert.equal(s.phase,'paused');assert.equal(s.stock.quay,0);assert.equal(s.staff.cook,0);assert.equal(s.marketing.gossip,0);assert.equal(s.customers[0].look,5);}
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
