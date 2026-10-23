// Architectural linework stays finer than the flat, muted street scenery.
const repeat=(n,fn)=>Array.from({length:n},(_,i)=>fn(i)).join('');
const path=d=>`<path d="${d}" fill="none"/>`;
const arch=(x,y,w=12,h=20)=>path(`M${x} ${y}v-${h}q${w/2}-${w} ${w} 0v${h}`);
export function landmarkDetails(i){
 const details=[
  repeat(12,n=>{const y=-35-n*18,w=75-n*5;return path(`M${-w} ${y}h${w*2}m-${w*2} 0 ${w*2-7}-18M${w} ${y} ${-w+7} ${y-18}`);})+path('M-94-5-36-110-10-228 0-314 10-228 36-110 94-5M-48-106h96M-46-114h92M-25-196h50M-22-204h44'),
  repeat(9,n=>path(`M${-24+n*6} -105q${n-4}-52 ${18-n*5}-112`))+repeat(5,n=>path(`M-54 ${-9-n*9}h108`))+path('M-8-249h5m7 0h5M-4-240q4 3 8 0M-10-230q10 6 20 0M-44-230l13-4 6 32-13 4Z'),
  repeat(12,n=>{const a=n*Math.PI/6;return path(`M${Math.sin(a)*21} ${-213+Math.cos(a)*21}l${Math.sin(a)*4} ${Math.cos(a)*4}`);})+repeat(8,n=>path(`M${-42+n*12} 0v-177`))+repeat(5,n=>path(`M-46 ${-24-n*35}h92`))+repeat(5,n=>arch(-24+n*10,-276,6,14)),
  repeat(6,n=>repeat(4,k=>path(`M${-137+n*51+k*5} -23v-116`)))+repeat(16,n=>path(`M${-150+n*20} -148v-19`))+repeat(4,n=>`<g transform="translate(${-28+n*18} -207)">${path('M-4 0v-18l6-8 5 3-3 12 6 11M-4-10l-5 10M0-12l9 12')}</g>`)+path('M-160-176h320M-135-188h270'),
  repeat(3,row=>repeat(16,n=>arch(-157+n*20,-5-row*37,12,15)))+repeat(17,n=>path(`M${-162+n*20} 0v-113`))+repeat(4,n=>path(`M-166 ${-4-n*37}q160-13 332 0`)),
  repeat(7,n=>path(`M${-42+n*14} -95Q${-65+n*21} -150 0-202`))+repeat(8,n=>arch(-102+n*27,-8,15,44))+repeat(2,n=>repeat(8,k=>path(`M${-162+n*302} ${-10-k*16}h22`)))+path('M0-205v-18m-6 5h12M-115-88h230M-115-82h230'),
  repeat(14,n=>{const y=-12-n*14;return path(`M${-183+n*9} ${y}h${275-n*18}`);})+repeat(7,n=>path(`M${-160+n*35} -5l-5-15m-6-10-5-15`))+repeat(8,n=>path(`M${43+n*11} ${-12-n*17}h${184-n*23}`)),
  repeat(12,n=>path(`M${-145+n*12} -16Q${-150+n*4} -80 -47-161`))+repeat(12,n=>path(`M${-40+n*10} -16Q${-35+n*7} -112 49-206`))+repeat(9,n=>path(`M${62+n*12} -16Q${105+n*7} -75 170-133`)),
  repeat(34,n=>{const y=-8-n*10,w=y<-310?6:y<-254?17:y<-187?29:y<-105?42:57;return path(`M${-w} ${y}h${w*2}`);})+repeat(9,n=>path(`M${-24+n*6} 0v-180`)),
  `<g transform="rotate(6)">${repeat(6,row=>repeat(10,n=>arch(-49+n*10,-15-row*33,6,17)))+repeat(6,n=>path(`M-56 ${-10-n*33}q56 8 112 0`))+repeat(6,n=>arch(-34+n*12,-225,7,14))}</g>`
 ];
 return `<g stroke="#596367" stroke-width=".7" opacity=".9">${details[i]}</g>`;
}
const house=(x,y,w,h,color,roof='flat')=>`<g fill="${color}" stroke="#92958e" stroke-width="1.5"><rect x="${x}" y="${y-h}" width="${w}" height="${h}"/>${roof==='mansard'?`<path d="M${x-4} ${y-h}l12-26h${w-16}l12 26Z" fill="#777f82"/>`:roof==='tile'?`<path d="M${x-6} ${y-h}l${w/2+6}-22 ${w/2+6} 22Z" fill="#ac8f7f"/>`:''}${repeat(Math.floor(w/24),c=>repeat(Math.floor(h/30),r=>`<rect x="${x+9+c*24}" y="${y-h+12+r*30}" width="10" height="16" fill="#7c898b" stroke="none"/>`))}</g>`;
const palm=(x,y)=>`<g stroke="#899083" stroke-width="4" fill="none"><path d="M${x} ${y}q12-45 0-90"/><path d="M${x} ${y-90}q-30-25-50 0m50 0q30-28 50 0m-50 0q-15-40-34-30m34 30q16-40 35-27"/></g>`;
export function countryScenery(i){
 const rows=[
  house(25,425,135,145,'#cdc6b9','mansard')+house(185,425,135,170,'#c8c2b5','mansard')+house(745,425,115,155,'#d0c8ba','mansard')+house(870,425,105,140,'#c1bdb2','mansard')+'<path d="M30 390h260M760 390h210" stroke="#697473" stroke-width="3"/><path d="M40 391v34m15-34v34m15-34v34m15-34v34m15-34v34" stroke="#697473"/>',
  '<path d="M0 360h1000v80H0Z" fill="#acbcc1"/>'+repeat(12,n=>house(10+n*83,355,62,75+(n*43)%120,'#aab2b2'))+'<path d="M0 400h1000M0 415h1000" stroke="#d0d9d6" stroke-width="2"/><path d="M720 408h100l-15 14h-67Z" fill="#899799"/>',
  house(20,425,125,140,'#aba79f')+house(170,425,145,110,'#b3ada1')+house(750,425,210,125,'#aaa79d')+'<path d="M0 430h1000" stroke="#aab9bd" stroke-width="20"/><g fill="#986e68" stroke="#786d68"><rect x="230" y="378" width="23" height="47" rx="4"/><path d="M234 383h15v26h-15Z" fill="#b9c3c0"/></g>',
  house(30,425,250,135,'#c4c2b7')+house(750,425,220,135,'#c4c2b7')+'<path d="M0 438h1000" stroke="#a4ad9d" stroke-width="18"/>'+repeat(8,n=>`<path d="M${40+n*130} 425v-70" stroke="#8b9084" stroke-width="5"/><ellipse cx="${40+n*130}" cy="342" rx="20" ry="32" fill="#9ba58f"/>`),
  house(30,425,110,115,'#c8b7a5','tile')+house(165,425,145,140,'#c7b8a8','tile')+house(765,425,195,125,'#d0c1af','tile')+'<path d="M0 437h1000" stroke="#bcb6a5" stroke-width="22"/>'+repeat(4,n=>`<path d="M${60+n*290} 425v-65" stroke="#94907b" stroke-width="6"/><ellipse cx="${60+n*290}" cy="350" rx="46" ry="15" fill="#8d9983"/>`),
  '<path d="M270 425h520l-90-70H360Z" fill="#a6b2a0"/><path d="M490 425h80l-20-65h-40Z" fill="#acbdc0"/>'+house(20,425,210,100,'#c8b4a5')+house(790,425,190,100,'#c8b4a5')+palm(260,430)+palm(750,430),
  '<path d="M0 340Q180 285 360 350T730 325T1000 345V460H0Z" fill="#d4c8ad"/><path d="M0 412Q200 370 400 410T1000 405" fill="none" stroke="#bfb398" stroke-width="3"/>'+house(25,440,95,65,'#c4b79e')+house(855,440,110,70,'#cbbda3')+palm(170,435),
  '<path d="M0 350h1000v95H0Z" fill="#a8bfc4"/><path d="M0 398h1000M0 419h1000" stroke="#d0dcd9" stroke-width="2"/><path d="M0 355Q160 145 320 355M0 355Q160 178 320 355" fill="none" stroke="#88999d" stroke-width="5"/>'+repeat(10,n=>path(`M${20+n*30} 355v-${35+Math.sin(n/10*Math.PI)*100}`))+house(790,350,180,140,'#b4bec0'),
  '<path d="M0 380Q250 310 450 380T1000 360V445H0Z" fill="#cfc5b0"/>'+repeat(4,n=>house(30+n*75,425,60,100+n*32,'#aab9ba'))+repeat(3,n=>house(740+n*80,425,65,210-n*48,'#a4b4b7'))+palm(350,435)+palm(685,435),
  '<path d="M0 400h1000v45H0Z" fill="#b3bca2"/>'+house(25,425,185,95,'#cbbda9','tile')+house(755,425,210,110,'#d1c6b4','tile')+'<g fill="#ddd9cc" stroke="#a2a79e"><path d="M230 425V310l90-45 90 45v115Z"/>'+repeat(7,n=>arch(242+n*22,420,15,57))+'</g>'+repeat(3,n=>`<ellipse cx="${700+n*28}" cy="385" rx="9" ry="42" fill="#929e86"/>`)
 ];
 return `<g data-earth-country="${['france','usa','uk','germany','italy-rome','india','egypt','australia','uae','italy-pisa'][i]}">${rows[i]}</g>`;
}
