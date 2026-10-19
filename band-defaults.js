// Defaults also fill fields added after the first published CMS version.
import { normalizeTexts } from './copy-defaults.js';
export const DEFAULT_BAND = [
  { id: 'panda', name: 'Der Panda', role: 'Schlagzeug', sound: 'BUM! BUM!', audio: '', image: 'assets/panda-drums-v3.png', color: '#1d55ff', intro: 'Ich bin der Panda. Ich spiele Schlagzeug und gebe den Rhythmus vor. Wenn meine Stöcke loslegen, dürfen alle mitwippen!' },
  { id: 'parrot', name: 'Der Papagei', role: 'Bass & Gesang', sound: 'LA LA LAAA!', audio: '', image: 'assets/parrot-bass-v3.png', color: '#ff3935', intro: 'Ich bin der Papagei. Ich spiele Bassgitarre und singe. In unserem Lied „Hut“ reite ich auf einem Pferd – und verliere meinen Hut!' },
  { id: 'croc', name: 'Das Krokodil', role: 'E-Gitarre', sound: 'TSCHAK!', audio: '', image: 'assets/croc-guitar-v3.png', color: '#40cea1', intro: 'Ich bin das Krokodil. Meine E-Gitarre gehört zu Bum Bum Tschak. Komm näher und lerne auch meine beiden Bandfreunde kennen!' },
];
export function bandMembers(saved) {
  return DEFAULT_BAND.map(base => {
    const source = Array.isArray(saved) ? saved.find(member => member?.id === base.id) : null;
    return Object.fromEntries(Object.entries(base).map(([key, fallback]) => [key, key === 'id' ? base.id : source?.[key] ?? fallback]));
  });
}
export function withMemberDefaults(document) {
  return { ...document, info: { ...document.info, members: bandMembers(document.info?.members), texts: normalizeTexts(document.info?.texts) } };
}
