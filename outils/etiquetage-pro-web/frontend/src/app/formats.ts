/** Mises en forme communes. */

/** « 1250 » -> « 1 250 » (espace fine insecable comme separateur de milliers). */
export function prix(v: string | null | undefined): string {
  if (!v) return '';
  return v.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Etat de la peremption jj/mm/aaaa : depassee, proche (moins de 6 mois), sinon rien. */
export function etatPeremption(v: string | null | undefined): 'depassee' | 'proche' | '' {
  if (!v) return '';
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return '';
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  const aujourd = new Date();
  aujourd.setHours(0, 0, 0, 0);
  if (d < aujourd) return 'depassee';
  const limite = new Date(aujourd);
  limite.setMonth(limite.getMonth() + 6);
  return d <= limite ? 'proche' : '';
}

/** Ouvre un PDF dans un nouvel onglet du navigateur (pas une fenetre de l'application). */
export function urlPdf(b: Blob): string {
  return URL.createObjectURL(new Blob([b], { type: 'application/pdf' }));
}
