export const DEFAULT_ANIMALS = [
  { id: 'cat', name: 'Katze', article: 'die', color: '#ff87ce', trait: 'Auf leisen Pfoten', image: 'assets/player-cat.svg' },
  { id: 'dog', name: 'Hund', article: 'der', color: '#fff20b', trait: 'Immer der Nase nach', image: 'assets/player-dog.svg' },
  { id: 'horse', name: 'Pferd', article: 'das', color: '#1d55ff', trait: 'Mit Schwung voraus', image: 'assets/player-horse.svg' },
  { id: 'monkey', name: 'Affe', article: 'der', color: '#40cea1', trait: 'Neugierig um jede Ecke', image: 'assets/player-monkey.svg' },
];
export function playableAnimals(saved, texts = {}) {
  return DEFAULT_ANIMALS.map(base => {
    const source = Array.isArray(saved) ? saved.find(animal => animal?.id === base.id) : null;
    return { ...base, name: texts[base.id + '_name'] ?? base.name, trait: texts[base.id + '_trait'] ?? base.trait,
      ...(source ? Object.fromEntries(Object.keys(base).filter(key => key !== 'id').map(key => [key, source[key] ?? base[key]])) : {}), id: base.id };
  });
}
