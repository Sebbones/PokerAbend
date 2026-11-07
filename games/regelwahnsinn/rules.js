export const RULES=[
 {id:'plus',de:'Addiere 1.',en:'Add 1.'},
 {id:'double',de:'Verdopple die Zahl.',en:'Double the number.'},
 {id:'minus',de:'Ziehe 2 ab.',en:'Subtract 2.'},
 {id:'dots',de:'Addiere die Anzahl der Punkte.',en:'Add the number of dots.'},
 {id:'reverse',de:'Kehre die Ziffern um; ein Minus bleibt vorne.',en:'Reverse the digits; keep a minus sign at the front.'},
 {id:'parity',de:'Hänge nach dem Rechnen „gerade“ oder „ungerade“ an.',en:'After calculating, append “even” or “odd”.'},
 {id:'color',de:'Hänge nach dem Rechnen die angezeigte Farbe an.',en:'After calculating, append the displayed colour.'},
 {id:'shape',de:'Hänge nach dem Rechnen die angezeigte Form an.',en:'After calculating, append the displayed shape.'},
];
export const COLORS={red:['rot','red'],blue:['blau','blue'],gold:['gold','gold']};
export const SHAPES={circle:['kreis','circle'],square:['quadrat','square'],star:['stern','star']};
export function expected(task,rules,language='de'){
 let n=task.number;for(const id of rules){if(id==='plus')n++;if(id==='double')n*=2;if(id==='minus')n-=2;if(id==='dots')n+=task.dots;if(id==='reverse')n=Math.sign(n)*Number(String(Math.abs(n)).split('').reverse().join(''));}
 const index=language==='en'?1:0,parts=[String(n)];for(const id of rules){if(id==='parity')parts.push(n%2?(index?'odd':'ungerade'):(index?'even':'gerade'));if(id==='color')parts.push(COLORS[task.color][index]);if(id==='shape')parts.push(SHAPES[task.shape][index]);}return parts.join(' ');
}
export const normalAnswer=s=>s.trim().toLowerCase().replace(/\s+/g,' ');
