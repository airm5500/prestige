'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const O = require('../src/baileys-outils');

const dossier = () => fs.mkdtempSync(path.join(os.tmpdir(), 'wa-'));

test('adresse WhatsApp d\'un numero : chiffres seuls', () => {
  assert.strictEqual(O.jidDe('+225 07 08 09 10 11'), '2250708091011@s.whatsapp.net');
});

test('numero d\'une reponse : champ direct, puis correspondance LID apprise', () => {
  const t = new O.TableLid(null);
  /* premiere reponse : numero et LID ensemble -> la correspondance est apprise */
  assert.strictEqual(O.numeroDeCle({ remoteJid: '253270027194615@lid', senderPn: '2250708091011@s.whatsapp.net' }, t), '2250708091011');
  /* reponse suivante : LID seul -> numero retrouve */
  assert.strictEqual(O.numeroDeCle({ remoteJid: '253270027194615@lid' }, t), '2250708091011');
  /* LID inconnu : rien plutot qu'un faux numero */
  assert.strictEqual(O.numeroDeCle({ remoteJid: '999@lid' }, t), null);
  assert.strictEqual(O.numeroDeCle({ remoteJid: '2250102030405@s.whatsapp.net' }, t), '2250102030405');
});

test('table LID gardee sur disque et rechargee', () => {
  const f = path.join(dossier(), 'lid.json');
  const t = new O.TableLid(f);
  t.apprendre('111', '2250708091011');
  t.sauver();
  assert.strictEqual(new O.TableLid(f).numero('111'), '2250708091011');
});

test('cache des envoyes : borne, Buffers relus tels quels apres redemarrage', () => {
  const f = path.join(dossier(), 'envoyes.json');
  const c = new O.CacheEnvoyes(f, { max: 3 });
  for (let i = 1; i <= 5; i++) { c.retenir({ key: { id: 'm' + i }, message: { imageMessage: { jpegThumbnail: Buffer.from([i]) } } }); }
  assert.strictEqual(c.taille, 3, 'les plus anciens sont oublies');
  assert.ok(!c.has('m1') && c.has('m5'));
  c.sauver();
  const relu = new O.CacheEnvoyes(f, { max: 3 });
  assert.ok(Buffer.isBuffer(relu.get('m5').imageMessage.jpegThumbnail), 'Buffer reconstruit (sinon le renvoi echoue)');
  assert.strictEqual(relu.get('m5').imageMessage.jpegThumbnail[0], 5);
});

test('fichier illisible : la table repart vide sans erreur', () => {
  const f = path.join(dossier(), 'abime.json');
  fs.writeFileSync(f, '{pas du json');
  const notes = [];
  const t = new O.TableLid(f, { journal: (m) => notes.push(m) });
  assert.strictEqual(t.taille, 0);
  assert.ok(/illisible/.test(notes[0]));
});

test('contenu des messages entrants', () => {
  assert.deepStrictEqual(O.contenuEntrant({ message: { conversation: 'STOP' } }), { type: 'TEXTE', texte: 'STOP' });
  assert.deepStrictEqual(O.contenuEntrant({ message: { extendedTextMessage: { text: 'Merci' } } }), { type: 'TEXTE', texte: 'Merci' });
  assert.deepStrictEqual(O.contenuEntrant({ message: { imageMessage: {} } }), { type: 'IMAGE', texte: '[image]' });
  assert.deepStrictEqual(O.contenuEntrant({ message: { documentMessage: { fileName: 'ordo.pdf' } } }), { type: 'DOCUMENT', texte: 'ordo.pdf' });
  assert.strictEqual(O.contenuEntrant({ key: {} }), null, 'sans message : illisible');
});

test('accuses Baileys -> niveaux de la file (2 distribue, 3 lu)', () => {
  assert.strictEqual(O.niveauAccuse(2), null);
  assert.strictEqual(O.niveauAccuse(3), 2);
  assert.strictEqual(O.niveauAccuse(4), 3);
  assert.strictEqual(O.niveauAccuse(5), 3);
});

test('sante : un incident passager ne declenche rien', () => {
  let t = 1000000; const changes = [];
  const s = new O.Sante({ horloge: () => t, surChangement: (r) => changes.push(r.sante) });
  s.lisible();
  t += 5000;
  assert.strictEqual(s.illisible('x'), false);
  assert.strictEqual(s.illisible('x'), false);
  assert.strictEqual(s.illisible('x'), false, '3 echecs mais reception saine il y a 5 s : passager');
  assert.strictEqual(s.etat, 'OK');
  assert.deepStrictEqual(changes, []);
});

test('sante : echecs consecutifs sans reception saine -> DEGRADE une seule fois, puis retour a OK', () => {
  let t = 1000000; const changes = [];
  const s = new O.Sante({ horloge: () => t, surChangement: (r) => changes.push(r.sante) });
  s.lisible();
  t += 120000;
  s.illisible('a'); s.illisible('a');
  assert.strictEqual(s.illisible('Messages entrants illisibles'), true);
  assert.strictEqual(s.illisible('a'), false, 'pas de seconde alerte');
  assert.strictEqual(s.resume().sante, 'DEGRADE');
  assert.strictEqual(s.resume().raisonSante, 'Messages entrants illisibles');
  s.lisible();
  assert.strictEqual(s.etat, 'OK');
  assert.deepStrictEqual(changes, ['DEGRADE', 'OK']);
});

test('sante : une reception lisible remet la serie d\'echecs a zero', () => {
  let t = 1000000;
  const s = new O.Sante({ horloge: () => t });
  t += 120000;
  s.illisible('a'); s.illisible('a'); s.lisible(); t += 120000;
  s.illisible('a'); s.illisible('a');
  assert.strictEqual(s.etat, 'OK', 'serie rompue par la reception lisible');
});
