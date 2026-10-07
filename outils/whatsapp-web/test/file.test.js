'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { FileEnvoi } = require('../src/file');

function faux({ existe = () => true, envoyer } = {}) {
  const envois = [], frappes = [];
  return { envois, frappes, pret: () => true, existe: async (n) => existe(n), ecrire: async (n, ms) => frappes.push([n, ms]),
    envoyer: envoyer || (async (n, t) => { envois.push([n, t]); return 'wa-' + envois.length; }) };
}

function file(opts = {}) {
  let maintenant = opts.debut || new Date(2026, 9, 7, 10, 0);
  const attentes = [];
  const rapports = [];
  const f = new FileEnvoi({ connecteur: opts.c || faux(), fichier: null, regles: opts.regles || {}, horloge: () => maintenant,
    alea: () => 0.5, attendre: async (ms) => { attentes.push(ms); maintenant = new Date(maintenant.getTime() + ms); }, rapporter: async (s) => rapports.push(...s) });
  return { f, attentes, rapports, avancer: (ms) => { maintenant = new Date(maintenant.getTime() + ms); } };
}

test('un message part apres « en train d\'ecrire », puis un delai aleatoire', async () => {
  const c = faux(); const { f, attentes, rapports } = file({ c });
  assert.ok(f.ajouter({ id: 'a', to: '+225 07 08 09 10 11', text: '{Bonjour|Bonsoir} Awa' }).id);
  const r = await f.etape();
  assert.deepStrictEqual(r, { envoye: 'a' });
  assert.deepStrictEqual(c.envois, [['2250708091011', 'Bonsoir Awa']], 'numero normalise, variation appliquee');
  assert.ok(c.frappes[0][1] >= 1500);
  assert.strictEqual(attentes[0], 40000, 'delai entre 20 et 60 s');
  assert.deepStrictEqual(rapports, [{ id: 'a', statut: 'sent', erreur: '' }]);
});

test('refus a l\'entree : numero invalide, doublon du jour, desinscrit', async () => {
  const { f } = file();
  assert.ok(f.ajouter({ to: 'abc', text: 'x' }).refuse);
  assert.ok(f.ajouter({ to: '2250708091011', text: '' }).refuse);
  assert.ok(f.ajouter({ to: '2250708091011', text: 'rappel' }).id);
  assert.match(f.ajouter({ to: '2250708091011', text: 'rappel' }).refuse, /identique/);
  f.arreter('2250708091011');
  assert.match(f.ajouter({ to: '2250708091011', text: 'autre' }).refuse, /ne plus recevoir/);
  assert.strictEqual(f.enAttente().length, 0, 'le message en attente du desinscrit est annule');
});

test('numero sans WhatsApp : echec sans envoi', async () => {
  const c = faux({ existe: () => false }); const { f, rapports } = file({ c });
  f.ajouter({ id: 'b', to: '2250101010101', text: 'x' });
  await f.etape();
  assert.strictEqual(c.envois.length, 0);
  assert.match(rapports[0].erreur, /pas de compte WhatsApp/);
});

test('montee en charge : 20 messages le premier jour, puis attente au lendemain', async () => {
  const c = faux(); const { f } = file({ c, regles: { plafondHeure: 1000 } });
  for (let i = 0; i < 25; i++) { f.ajouter({ to: '22507000000' + String(i).padStart(2, '0'), text: 'm' + i }); }
  let r; let n = 0;
  while ((r = await f.etape()).envoye) { n++; }
  assert.strictEqual(n, 20);
  assert.strictEqual(r.attente, 'PLAFOND_JOUR');
});

test('longue pause toutes les 15 messages, heures d\'envoi respectees', async () => {
  const c = faux(); const { f, attentes } = file({ c, regles: { monteeEnCharge: false, plafondHeure: 1000 } });
  for (let i = 0; i < 16; i++) { f.ajouter({ to: '22507000000' + String(i).padStart(2, '0'), text: 'm' }); }
  for (let i = 0; i < 16; i++) { await f.etape(); }
  assert.ok(attentes[14] >= 5 * 60000, 'pause longue apres le 15e : ' + attentes[14]);
  const soir = file({ debut: new Date(2026, 9, 7, 21, 0) });
  soir.f.ajouter({ to: '2250708091011', text: 'x' });
  assert.strictEqual((await soir.f.etape()).attente, 'HORS_HORAIRES');
});

test('trois echecs techniques consecutifs : pause de protection', async () => {
  const c = faux({ envoyer: async () => { throw new Error('reseau'); } }); const { f } = file({ c });
  for (let i = 0; i < 4; i++) { f.ajouter({ to: '2250700000' + i + '11', text: 'x' }); }
  await f.etape(); await f.etape(); await f.etape();
  assert.strictEqual((await f.etape()).attente, 'PAUSE');
});

test('accuses de reception rapportes (distribue, lu)', async () => {
  const { f, rapports } = file();
  f.ajouter({ id: 'z', to: '2250708091011', text: 'x' });
  await f.etape();
  f.accuse('wa-1', 2); f.accuse('wa-1', 3);
  assert.deepStrictEqual(rapports.map((x) => x.statut), ['sent', 'delivered', 'read']);
});
