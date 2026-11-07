// Only the same own role and visible positions a human receives; no Room or role map.
export function arenaIntent(view,id){
  const self=view.bodies.find(p=>p.id===id);if(!self?.alive)return null;
  const distance=p=>Math.hypot(p.x-self.x,p.y-self.y);let target,away=false;
  if(view.kind==='shelter')target=[...view.zones].sort((a,b)=>distance(a)-distance(b))[0];
  else {const others=view.bodies.filter(p=>p.id!==id&&p.alive).sort((a,b)=>distance(a)-distance(b));away=view.role!=='hunter'&&view.role!=='infected';target=others[away?0:Math.floor(Math.max(0,view.elapsed)/2500)%Math.max(1,others.length)];}
  if(!target)return {x:0,y:0};if(view.kind==='shelter'&&distance(target)<10)return {x:0,y:0};
  let x=Math.sign(target.x-self.x)*(away?-1:1),y=Math.sign(target.y-self.y)*(away?-1:1);
  if(away){if(self.x<60)x=1;if(self.x>840)x=-1;if(self.y<60)y=1;if(self.y>540)y=-1;}
  return {x,y};
}
