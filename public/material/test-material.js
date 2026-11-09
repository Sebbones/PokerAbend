import { MATERIALS, createMaterial, createAccessory } from './index.js';
const groups = [
  ['cards','12 Kartenrücken','Zwölf eigene geometrische Muster.'],
  ['dice','Würfel','Holz · Glas · Metall · Kneipe · Marmor, jeweils 1 bis 6.'],
  ['stones','Spielsteine','Holz · Stein · Glas · Messing.'],
  ['pawns','Pöppel','Eine klare Silhouette, frei einfärbbar.'],
  ['chips','Chips','1 · 5 · 10 · 25 · 50 · 100. Sechs unterschiedliche Kantenmuster.'],
  ['notes','Taler-Scheine','Eigene Spielwährung, keine echten Banknotenmotive.'],
  ['props','Tischzubehör','Plakette · Stirnzettel · Umschlag · Stempel.'],
  ['accessories','Avatar-Accessoires','Transparente Overlays im gemeinsamen 100 × 100-Raster.'],
];
const gallery=document.querySelector('#gallery');
for (const [category,title,hint] of groups) {
  const section=document.createElement('section');section.className='section';section.id='group-'+category;
  const head=document.createElement('div');head.className='section-head';
  const heading=document.createElement('h2');heading.textContent=title;const description=document.createElement('p');description.textContent=hint;
  head.append(heading,description);section.append(head);
  const list=MATERIALS.filter(item=>item.category===category), grid=document.createElement('div');grid.className='grid';
  for(const item of list){
    const tile=document.createElement('figure');tile.className='tile';tile.dataset.category=category;tile.dataset.materialId=item.id;
    const sample=document.createElement('div');sample.className='sample';
    if(item.overlay){
      const avatar=document.createElement('span');avatar.className='material-avatar';
      const base=document.createElement('span');base.className='material-avatar-base';base.textContent='🦉';base.setAttribute('aria-label','Eule');
      avatar.append(base,await createAccessory(item.id));sample.append(avatar);
    }else sample.append(await createMaterial(item.id));
    const caption=document.createElement('figcaption'),name=document.createElement('b'),license=document.createElement('small');name.textContent=item.name;license.textContent='Eigen · '+item.file;
    caption.append(name,license);tile.append(sample,caption);grid.append(tile);
  }
  section.append(grid);gallery.append(section);
}
document.querySelector('#palette').addEventListener('change',event=>gallery.dataset.palette=event.target.value);
document.querySelector('#status').textContent=`${MATERIALS.length} eigene SVGs geladen`;
window.materialDemo={MATERIALS,createMaterial,createAccessory};
