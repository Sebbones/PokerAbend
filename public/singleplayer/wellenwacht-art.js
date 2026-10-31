import {WIDTH,HEIGHT,MAPS,TOWERS,ENEMIES,position,route,towerStats} from './wellenwacht-logic.js';
// Original procedural 2D artwork. No imported maps, sprites or rendering engine.
export function drawDefense(canvas,s,calm){
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(!w||!h)return;
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const c=canvas.getContext('2d');c.setTransform(w/WIDTH,0,0,h/HEIGHT,0,0);c.clearRect(0,0,WIDTH,HEIGHT);
  c.fillStyle=s.map==='delta'?'#183c3a':'#233e31';c.fillRect(0,0,WIDTH,HEIGHT);
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){c.fillStyle=(x+y)%2?'#ffffff04':'#ffffff0b';c.fillRect(x+.03,y+.03,.94,.94);if((x*13+y*7)%9===0){c.strokeStyle='#83a67540';c.lineWidth=.035;c.beginPath();c.moveTo(x+.2,y+.7);c.lineTo(x+.25,y+.5);c.lineTo(x+.3,y+.7);c.stroke();}}
  for(const at of MAPS[s.map].walls){const x=at%WIDTH,y=Math.floor(at/WIDTH);c.fillStyle='#64786a';c.beginPath();c.moveTo(x+.15,y+.75);c.lineTo(x+.1,y+.4);c.lineTo(x+.45,y+.17);c.lineTo(x+.83,y+.3);c.lineTo(x+.9,y+.73);c.closePath();c.fill();c.strokeStyle='#a4b2a080';c.lineWidth=.04;c.stroke();}
  c.strokeStyle='#dbcaa34d';c.lineWidth=.07;c.setLineDash([.12,.14]);
  for(const start of MAPS[s.map].starts){const path=route(s,start);c.beginPath();path.forEach((at,i)=>{const x=at%WIDTH+.5,y=Math.floor(at/WIDTH)+.5;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();}c.setLineDash([]);
  for(const at of MAPS[s.map].starts){const x=at%WIDTH,y=Math.floor(at/WIDTH);c.fillStyle='#bd9b70';c.beginPath();c.moveTo(x+.16,y+.25);c.lineTo(x+.7,y+.5);c.lineTo(x+.16,y+.75);c.closePath();c.fill();}
  const goal=MAPS[s.map].goal,gx=goal%WIDTH,gy=Math.floor(goal/WIDTH);c.fillStyle='#d8c28a';c.fillRect(gx+.2,gy+.28,.6,.55);c.fillRect(gx+.15,gy+.2,.17,.2);c.fillRect(gx+.42,gy+.16,.17,.25);c.fillRect(gx+.69,gy+.2,.17,.2);c.fillStyle='#344c3f';c.fillRect(gx+.43,gy+.55,.15,.28);
  const selected=s.towers.find((t)=>t.cell===s.selected);
  if(selected){const k=towerStats(selected);c.fillStyle='#d6d7b512';c.strokeStyle='#e1d79970';c.lineWidth=.025;c.beginPath();c.arc(selected.cell%WIDTH+.5,Math.floor(selected.cell/WIDTH)+.5,k.range,0,Math.PI*2);c.fill();c.stroke();}
  for(const t of s.towers){const x=t.cell%WIDTH+.5,y=Math.floor(t.cell/WIDTH)+.5,k=TOWERS[t.kind];c.save();c.translate(x,y);c.fillStyle='#132722';c.beginPath();c.ellipse(0,.16,.38,.25,0,0,Math.PI*2);c.fill();c.fillStyle='#4c6456';c.strokeStyle=k.color;c.lineWidth=.06;c.beginPath();c.arc(0,0,.31,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=k.color;
    if(t.kind==='bolt'){c.fillRect(-.065,-.47,.13,.48);c.fillRect(-.16,-.39,.09,.28);c.fillRect(.07,-.39,.09,.28);}
    if(t.kind==='cannon'){c.fillRect(-.14,-.43,.28,.43);c.fillStyle='#263c32';c.fillRect(-.085,-.45,.17,.14);}
    if(t.kind==='frost'){c.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;c.moveTo(0,0);c.lineTo(Math.cos(a)*.35,Math.sin(a)*.35);}c.stroke();c.beginPath();c.arc(0,0,.12,0,Math.PI*2);c.fill();}
    if(t.kind==='arc'){c.beginPath();c.moveTo(.05,-.48);c.lineTo(-.2,.03);c.lineTo(.03,-.02);c.lineTo(-.04,.37);c.lineTo(.23,-.16);c.lineTo(.03,-.12);c.closePath();c.fill();}
    c.fillStyle='#f6edcf';for(let n=0;n<t.level;n++)c.fillRect(-.12+(n-(t.level-1)/2)*.13,.35,.09,.07);c.restore();
  }
  for(const e of s.enemies){const p=position(e),k=ENEMIES[e.kind];c.save();c.translate(p.x,p.y);c.fillStyle=k.color;c.strokeStyle='#172522';c.lineWidth=.06;c.beginPath();if(e.kind==='sprinter'){c.moveTo(.3,0);c.lineTo(-.2,-.21);c.lineTo(-.1,0);c.lineTo(-.2,.21);}else if(e.kind==='armored'){for(let i=0;i<6;i++){const a=i*Math.PI/3;c.lineTo(Math.cos(a)*.3,Math.sin(a)*.3);}}else if(e.kind==='swarm'){c.moveTo(0,-.18);c.lineTo(.18,0);c.lineTo(0,.18);c.lineTo(-.18,0);}else c.arc(0,0,.23,0,Math.PI*2);c.closePath();c.fill();c.stroke();c.fillStyle='#172522';c.fillRect(-.23,-.41,.46,.07);c.fillStyle=e.slowUntil>s.time?'#86ddec':'#b5d99b';c.fillRect(-.23,-.41,.46*Math.max(0,e.hp/e.maxHp),.07);c.restore();}
  if(!calm)for(const p of s.shots){c.strokeStyle=TOWERS[p.kind].color;c.globalAlpha=Math.min(1,p.ttl/.1);c.lineWidth=p.kind==='cannon'?.13:.05;c.beginPath();c.moveTo(p.from.x,p.from.y);if(p.kind==='arc'){c.lineTo((p.from.x+p.to.x)/2+.1,(p.from.y+p.to.y)/2-.1);}c.lineTo(p.to.x,p.to.y);c.stroke();c.beginPath();c.arc(p.to.x,p.to.y,p.kind==='cannon'?.28:.13,0,Math.PI*2);c.stroke();}c.globalAlpha=1;
  if(s.selected>=0){c.strokeStyle='#fff1c2';c.lineWidth=.065;c.strokeRect(s.selected%WIDTH+.04,Math.floor(s.selected/WIDTH)+.04,.92,.92);}
}
