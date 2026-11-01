import test from 'node:test';import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';
import {botFixture} from './bot-difficulty-harness.js';
const results=[];
function record(t,result){results.push(result);mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/v2-16-strength.json',JSON.stringify(results,null,2)+'\n');t.diagnostic(JSON.stringify(result));}
for(const game of ['viergewinnt','reversi','backgammon'])test(`V2-16 ${game}: 200 seeded Hard/Easy games, alternating seats; Backgammon uses legal home-board races`,t=>{
  let hard=0,easy=0,draw=0;for(let n=0;n<200;n++){
    const f=botFixture(game,n%2?['easy','hard']:['hard','easy'],20000+n,{doubling:false,turnTime:0});const {r,bots,rng}=f;
    try{if(game==='backgammon'){r.board.points=Array(24).fill(0);r.board.bar=[0,0];r.board.off=[0,0];for(let i=0;i<15;i++){r.board.points[Math.floor(rng()*6)]++;r.board.points[18+Math.floor(rng()*6)]--;}}
      let moves=0;while(r.phase==='playing'&&(game!=='backgammon'||!r.lastGame)&&moves++<600)f.step();assert.ok(moves<600);
      const winners=game==='backgammon'?[r.lastGame.winner]:r.result.winners;const hardId=bots.find(p=>p.botDifficulty==='hard').id,easyId=bots.find(p=>p.botDifficulty==='easy').id;if(winners.includes(hardId))hard++;else if(winners.includes(easyId))easy++;else draw++;
    }finally{r.dispose();}
  }record(t,{game,games:200,hardWins:hard,easyWins:easy,draws:draw,searchNodeCap:game==='reversi'?120:600,scenario:game==='backgammon'?'complete games from seeded legal home-board positions':'complete games from standard opening'});assert.ok(hard>easy+20,`${hard} vs ${easy}, draws ${draw}`);
});

test('V2-16 kniffel: 200 seeded complete games, expected-value holds versus recreational play',t=>{
  let hard=0,easy=0,draw=0,hp=0,ep=0;
  for(let n=0;n<200;n++){const f=botFixture('kniffel',n%2?['easy','hard']:['hard','easy'],60000+n),{r,bots}=f;try{let moves=0;while(r.phase==='playing'&&moves++<200)f.step();assert.ok(moves<200);const h=bots.find(p=>p.botDifficulty==='hard').id,e=bots.find(p=>p.botDifficulty==='easy').id,a=r.result.points[h],b=r.result.points[e];hp+=a;ep+=b;if(a>b)hard++;else if(b>a)easy++;else draw++;}finally{r.dispose();}}
  record(t,{game:'kniffel',games:200,hardWins:hard,easyWins:easy,draws:draw,hardMean:hp/200,easyMean:ep/200,metric:'final points (higher better)',scenario:'complete 13-category games, seeded dice'});assert.ok(hp>ep);assert.ok(hard>easy+20);
});

for(const game of ['poker','omaha','farbenchaos','hearts','sechs-nimmt'])test(`V2-16 ${game}: 200 seeded deals/hands, alternating levels, real rules and conserved scores/chips`,t=>{
  let hard=0,easy=0,hardPoints=0,easyPoints=0,draw=0;
  for(let n=0;n<200;n++){
    const levels=game==='hearts'?(n%2?['easy','hard','easy','hard']:['hard','easy','hard','easy']):n%2?['easy','hard']:['hard','easy'];
    const f=botFixture(game,levels,40000+n,{startStack:200,smallBlind:5,bigBlind:10}),{r,bots}=f;
    try{let moves=0;const chips=r.table?.totalChips();while((r.table?!r.table.hand.done:r.phase==='playing'&&(game!=='hearts'||!r.lastDeal)&&(game!=='sechs-nimmt'||r.deal===1))&&moves++<3000)f.step();assert.ok(moves<3000,game+' finishes');
      const hi=bots.filter(p=>p.botDifficulty==='hard'),lo=bots.filter(p=>p.botDifficulty==='easy');let h,e;
      if(r.table){assert.equal(r.table.totalChips(),chips);h=r.table.seats[r.players.get(hi[0].id).seat].stack-r.settings.startStack;e=-h;}
      else if(game==='hearts'){assert.equal(Object.values(r.lastDeal.raw).reduce((a,b)=>a+b,0),26);h=hi.reduce((s,p)=>s+r.lastDeal.points[p.id],0)/hi.length;e=lo.reduce((s,p)=>s+r.lastDeal.points[p.id],0)/lo.length;}
      else if(game==='sechs-nimmt'){h=r.totals[hi[0].id];e=r.totals[lo[0].id];}
      else{h=r.result.winners.includes(hi[0].id)?1:0;e=1-h;}
      hardPoints+=h;easyPoints+=e;const low=['hearts','sechs-nimmt'].includes(game);if(h===e)draw++;else if(low?h<e:h>e)hard++;else easy++;
    }finally{r.dispose();}
  }
  const low=['hearts','sechs-nimmt'].includes(game),better=low?hardPoints<easyPoints:hardPoints>easyPoints;
  record(t,{game,games:200,hardWins:hard,easyWins:easy,draws:draw,hardMean:hardPoints/200,easyMean:easyPoints/200,metric:game==='hearts'||game==='sechs-nimmt'?'penalty per deal (lower better)':game==='farbenchaos'?'round win rate':'net chips per hand',scenario:game==='hearts'?'four players, two per level, one complete deal':game==='sechs-nimmt'?'two players, one complete ten-card deal':'two players, complete hand/round'});assert.ok(better,`${game}: Hard ${hardPoints} vs Easy ${easyPoints}`);
});
