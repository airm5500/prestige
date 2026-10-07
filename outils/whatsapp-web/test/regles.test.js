'use strict';
const test = require('node:test');
const assert = require('node:assert');
const R = require('../src/regles');

const fixe = (v) => () => v;

test('regles : defauts, valeurs absurdes ramenees a des valeurs sures', () => {
  const r = R.regles({ delaiMinSec: -3, delaiMaxSec: 'abc', heureDebut: 22, heureFin: 6, pauseApres: 0 });
  assert.strictEqual(r.delaiMinSec, 20, 'negatif ignore');
  assert.strictEqual(r.delaiMaxSec, 60);
  assert.strictEqual(r.heureDebut, 8); assert.strictEqual(r.heureFin, 20);
  assert.strictEqual(r.pauseApres, 15);
  assert.strictEqual(R.regles({ delaiMinSec: 1 }).delaiMinSec, 5, 'plancher de 5 s');
});

test('delai aleatoire entre min et max, longue pause toutes les N', () => {
  const r = R.regles({});
  assert.strictEqual(R.delaiSuivantMs(r, 3, fixe(0)), 20000);
  assert.strictEqual(R.delaiSuivantMs(r, 3, fixe(0.999999)), 60000);
  assert.strictEqual(R.delaiSuivantMs(r, 15, fixe(0)), 5 * 60000, 'apres 15 messages : pause de 5 a 12 min');
  const vus = new Set(); for (let i = 0; i < 50; i++) { vus.add(R.delaiSuivantMs(r, 1)); }
  assert.ok(vus.size > 40, 'jamais un intervalle fixe');
});

test('heures d\'envoi et prochaine ouverture', () => {
  const r = R.regles({});
  assert.ok(R.dansHoraires(r, new Date(2026, 9, 7, 9, 0)));
  assert.ok(!R.dansHoraires(r, new Date(2026, 9, 7, 20, 30)));
  assert.deepStrictEqual(R.prochaineOuverture(r, new Date(2026, 9, 7, 21, 0)), new Date(2026, 9, 8, 8, 0));
  assert.deepStrictEqual(R.prochaineOuverture(r, new Date(2026, 9, 7, 6, 15)), new Date(2026, 9, 7, 8, 0));
});

test('montee en charge et plafonds', () => {
  const r = R.regles({});
  assert.strictEqual(R.plafondDuJour(r, 0), 20);
  assert.strictEqual(R.plafondDuJour(r, 3), 80);
  assert.strictEqual(R.plafondDuJour(r, 30), 150);
  assert.strictEqual(R.plafondDuJour(R.regles({ monteeEnCharge: false }), 0), 150);
  const m = new Date(2026, 9, 7, 10, 0);
  assert.deepStrictEqual(R.peutEnvoyer(r, { envoyesJour: 0, envoyesHeure: 0, joursActif: 10 }, m), { ok: true });
  assert.strictEqual(R.peutEnvoyer(r, { envoyesJour: 20, envoyesHeure: 0, joursActif: 0 }, m).raison, 'PLAFOND_JOUR');
  assert.strictEqual(R.peutEnvoyer(r, { envoyesJour: 0, envoyesHeure: 40, joursActif: 10 }, m).raison, 'PLAFOND_HEURE');
  assert.strictEqual(R.peutEnvoyer(r, { envoyesJour: 0, envoyesHeure: 0, joursActif: 10, pauseJusqua: m.getTime() + 1000 }, m).raison, 'PAUSE');
  assert.strictEqual(R.peutEnvoyer(r, { envoyesJour: 0, envoyesHeure: 0, joursActif: 10 }, new Date(2026, 9, 7, 23, 0)).raison, 'HORS_HORAIRES');
});

test('frappe, variation, arret, numero', () => {
  const r = R.regles({});
  assert.strictEqual(R.dureeFrappeMs(r, 'ok', fixe(0.5)), 1500, 'minimum');
  assert.strictEqual(R.dureeFrappeMs(r, 'x'.repeat(1000), fixe(0.5)), 8000, 'maximum');
  assert.strictEqual(R.variation('{Bonjour|Bonsoir} Awa, {merci}', fixe(0.9)), 'Bonsoir Awa, {merci}');
  assert.ok(R.estArret('STOP')); assert.ok(R.estArret(' Arrêt. ')); assert.ok(!R.estArret('stop le traitement ?'));
  assert.strictEqual(R.numero('+225 07 08 09 10 11'), '2250708091011');
  assert.strictEqual(R.numero('abc'), null);
});
