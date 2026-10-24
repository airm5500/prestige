'use strict';
/* PIECES JOINTES (image, PDF) : la piece est gardee sur disque le temps de l'envoi, jamais dans la file JSON ;
   les regles s'appliquent ; le doublon du jour tient compte de la piece. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { FileEnvoi } = require('../src/file');

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a5e70000000049454e44ae426082', 'hex');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

function faux() {
  const envois = [];
  return { envois, pret: () => true, existe: async () => true, ecrire: async () => {},
    envoyer: async (n, t) => { envois.push(['texte', n, t]); return 'wa-' + envois.length; },
    envoyerMedia: async (n, m, legende) => { envois.push(['media', n, m.type, m.mimeType, m.nomFichier, m.donnees.length, legende]); return 'wa-' + envois.length; } };
}

function file(c) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-m-'));
  let maintenant = new Date(2026, 9, 7, 10, 0);
  const rapports = [];
  const f = new FileEnvoi({ connecteur: c, fichier: path.join(dossier, 'file.json'), dossierMedias: path.join(dossier, 'medias'), regles: {}, horloge: () => maintenant,
    alea: () => 0.5, attendre: async (ms) => { maintenant = new Date(maintenant.getTime() + ms); }, rapporter: async (s) => rapports.push(...s) });
  return { f, dossier, rapports };
}

test('image avec legende : gardee a part, envoyee, puis effacee du disque', async () => {
  const c = faux(); const { f, dossier } = file(c);
  const r = f.ajouter({ id: 'p1', to: '2250708091011', text: 'Votre ordonnance est prête', media: { type: 'image', base64: PNG.toString('base64'), mimeType: 'image/png', nomFichier: 'visuel.png' } });
  assert.ok(r.id, JSON.stringify(r));
  const brut = fs.readFileSync(path.join(dossier, 'file.json'), 'utf8');
  assert.ok(!brut.includes(PNG.toString('base64')), 'la piece n\'est jamais dans la file JSON');
  assert.strictEqual(fs.readdirSync(path.join(dossier, 'medias')).length, 1);
  assert.deepStrictEqual(await f.etape(), { envoye: 'p1' });
  assert.deepStrictEqual(c.envois[0], ['media', '2250708091011', 'image', 'image/png', 'visuel.png', PNG.length, 'Votre ordonnance est prête']);
  assert.strictEqual(fs.readdirSync(path.join(dossier, 'medias')).length, 0, 'piece effacee apres l\'envoi');
});

test('document PDF sans texte : accepte (legende vide)', async () => {
  const c = faux(); const { f } = file(c);
  assert.ok(f.ajouter({ id: 'p2', to: '2250708091011', text: '', media: { type: 'document', base64: PDF.toString('base64'), mimeType: 'application/pdf', nomFichier: 'facture.pdf' } }).id);
  await f.etape();
  assert.deepStrictEqual(c.envois[0].slice(0, 5), ['media', '2250708091011', 'document', 'application/pdf', 'facture.pdf']);
});

test('refus a l\'entree : type inconnu, piece vide, trop lourde, PDF qui n\'en est pas un', () => {
  const { f } = file(faux());
  assert.match(f.ajouter({ to: '2250708091011', text: 'x', media: { type: 'video', base64: PNG.toString('base64') } }).refuse, /image ou un document/);
  assert.match(f.ajouter({ to: '2250708091011', text: 'x', media: { type: 'image', base64: '' } }).refuse, /vide/);
  assert.match(f.ajouter({ to: '2250708091011', text: 'x', media: { type: 'document', base64: Buffer.alloc(17 * 1024 * 1024).toString('base64'), mimeType: 'application/pdf' } }).refuse, /16 Mo/);
  assert.match(f.ajouter({ to: '2250708091011', text: 'x', media: { type: 'document', base64: Buffer.from('pas un pdf').toString('base64'), mimeType: 'application/pdf' } }).refuse, /PDF/);
  assert.match(f.ajouter({ to: '2250708091011', text: 'x', media: { type: 'image', base64: PDF.toString('base64'), mimeType: 'image/png' } }).refuse, /image/);
});

test('doublon du jour : meme texte et meme piece refuses, meme texte avec une autre piece accepte', () => {
  const { f } = file(faux());
  const m = (b) => ({ type: 'image', base64: b.toString('base64'), mimeType: 'image/png', nomFichier: 'a.png' });
  assert.ok(f.ajouter({ to: '2250708091011', text: 'Promo', media: m(PNG) }).id);
  assert.match(f.ajouter({ to: '2250708091011', text: 'Promo', media: m(PNG) }).refuse, /identique/);
  const autre = Buffer.concat([PNG, Buffer.from([0])]);
  assert.ok(f.ajouter({ to: '2250708091011', text: 'Promo', media: m(autre) }).id, 'autre visuel : accepte');
  assert.ok(f.ajouter({ to: '2250708091011', text: 'Promo' }).id, 'texte seul : accepte');
});

test('echec d\'envoi : piece effacee aussi ; desinscription : pieces en attente effacees', async () => {
  const c = faux(); c.envoyerMedia = async () => { throw new Error('reseau'); };
  const { f, dossier } = file(c);
  f.ajouter({ id: 'e1', to: '2250708091011', text: 'x', media: { type: 'image', base64: PNG.toString('base64'), mimeType: 'image/png' } });
  await f.etape();
  assert.strictEqual(fs.readdirSync(path.join(dossier, 'medias')).length, 0);
  f.ajouter({ id: 'e2', to: '2250102030405', text: 'y', media: { type: 'image', base64: PNG.toString('base64'), mimeType: 'image/png' } });
  f.arreter('2250102030405');
  assert.strictEqual(fs.readdirSync(path.join(dossier, 'medias')).length, 0);
});

test('connecteur sans pieces jointes (ancien) : echec clair, pas de plantage', async () => {
  const c = faux(); delete c.envoyerMedia;
  const { f, rapports } = file(c);
  f.ajouter({ id: 'v1', to: '2250708091011', text: 'x', media: { type: 'image', base64: PNG.toString('base64'), mimeType: 'image/png' } });
  await f.etape();
  assert.match(rapports[0].erreur, /pièces jointes/);
});
