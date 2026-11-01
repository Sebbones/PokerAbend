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
