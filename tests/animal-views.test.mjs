import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { movementFacing, ANIMAL_IMAGE_KEYS } from '../animal-views.js';
import { DEFAULT_ANIMALS, playableAnimals } from '../animal-defaults.js';
import { ANIMALS, applyContent } from '../content.js';
import { animalSymbols } from '../cover-art.js';
import { animalHref } from '../hat-quest.js';
import { fileReferences, draftPreview } from '../verwaltung/drafts.js';
import { validateContent } from '../verwaltung/schema.js';
import { normalizeTexts } from '../copy-defaults.js';
const defaults=JSON.parse(await readFile(new URL('../data/content.json',import.meta.url)));

test('walking faces the actual movement, remembers a stopped or blocked direction and resolves diagonals consistently',()=>{
 const start={x:100,y:100};
 for(const [point,expected]of [[{x:105,y:100},'right'],[{x:95,y:100},'left'],[{x:100,y:95},'back'],[{x:100,y:105},'front'],[{x:103,y:99},'right'],[{x:99,y:96},'back']])assert.equal(movementFacing(start,point),expected);
 for(const facing of ['front','right','left','back']){assert.equal(movementFacing(start,start,facing),facing);assert.equal(movementFacing(start,{x:100.01,y:100.01},facing),facing);}
});
test('all four legacy characters keep their front image and gain complete directional and seated assets',async()=>{
 const characters=playableAnimals(defaults.info.animals,defaults.info.texts);assert.equal(characters.length,4);
 for(const [i,a]of characters.entries()){
  assert.equal(a.image,defaults.info.animals[i].image);
  for(const key of ANIMAL_IMAGE_KEYS){const svg=await readFile(new URL('../'+a[key],import.meta.url),'utf8');assert(svg.includes('viewBox="0 0 100 120"'));assert(svg.includes('#101014'));assert(svg.endsWith('</svg>')||svg.endsWith('</svg>\n'));}
  const side=await readFile(new URL('../'+a.imageRight,import.meta.url),'utf8'),seat=await readFile(new URL('../'+a.imageSeated,import.meta.url),'utf8');
  assert(side.includes('class="animal-feet"'));assert(seat.includes('class="animal-feet"'));
 }
 const symbols=animalSymbols();
 for(const id of characters.map(a=>a.id))for(const view of ['front','right','left','back','seated'])for(const hat of [false,true])assert(symbols.includes('id="'+animalHref(id,hat,view).slice(1)+'"'));
 assert(symbols.includes('translate(100 0) scale(-1 1)'));
});
test('editable front, side, back and seated graphics all survive validation, local preview and public loading independently',()=>{
 const document=structuredClone(defaults);document.info.animals=playableAnimals();
 for(const [i,key]of ANIMAL_IMAGE_KEYS.entries())document.info.animals[0][key]='uploads/view-'+i+'.png';
 const valid=validateContent(document);
 for(const [i,key]of ANIMAL_IMAGE_KEYS.entries())assert.equal(valid.info.animals[0][key],'uploads/view-'+i+'.png');
 const files=ANIMAL_IMAGE_KEYS.map((_,i)=>({path:'uploads/view-'+i+'.png',file:new Blob(['view'])}));
 let next=0;const preview=draftPreview({document:valid,files},()=> 'blob:view-'+next++);
 try{
  applyContent(preview);const symbols=animalSymbols();
  for(const [i,key]of ANIMAL_IMAGE_KEYS.entries()){
   assert.equal(ANIMALS[0][key],'blob:view-'+i);assert(symbols.includes('href="blob:view-'+i+'"'));assert(fileReferences(valid).has('uploads/view-'+i+'.png'));
   assert.equal(valid.info.animals[0][key],'uploads/view-'+i+'.png','preview leaves the publishable link unchanged');
  }
 }finally{applyContent(defaults);}
 for(const key of ANIMAL_IMAGE_KEYS){const bad=structuredClone(valid);bad.info.animals[0][key]='javascript:alert(1)';assert.throws(()=>validateContent(bad));}
});
test('the previous race instructions migrate to the horizontal course while custom instructions remain editable',()=>{
 const old='Lenke nur mit ← und →. Die Strecke zieht von unten nach oben vorbei. Weiche Steinen aus und bleib auf dem Weg. Nach einem Sturz brauchst du 3 Sekunden zum Aufsteigen. Escape pausiert.';
 assert(normalizeTexts({bike_keys:old}).bike_keys.includes('vier Spuren'));
 assert.equal(normalizeTexts({bike_keys:'Unsere eigene Anleitung'}).bike_keys,'Unsere eigene Anleitung');
 assert.equal(normalizeTexts({bike_board:'Bestenliste'}).bike_board,'Bestenliste · {stufe}');
 assert.equal(DEFAULT_ANIMALS[0].image,'assets/player-cat.svg');
});
