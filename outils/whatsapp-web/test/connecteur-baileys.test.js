'use strict';
/* Connecteur Baileys avec une FAUSSE bibliotheque : les memes evenements que Baileys (QR, ouverture, message entrant,
   message illisible, accuses, coupure, appareil delie), sans telephone ni reseau. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { creerConnecteur } = require('../src/connecteur-baileys');

function fausseBibliotheque() {
  const sockets = [];
  const lib = {
    sockets,
    loggedOut: 401,
    useMultiFileAuthState: async () => ({ state: { creds: {}, keys: {} }, saveCreds: () => {} }),
    makeCacheableSignalKeyStore: (k) => k,
    fetchLatestBaileysVersion: async () => ({ version: [2, 3000, 1] }),
    fabrique: (opts) => {
      const ev = new EventEmitter();
      const s = { opts, ev, envois: [], presences: [], user: null, fin: false, delie: false,
        onWhatsApp: async (n) => (n === '2250000000000' ? [] : [{ exists: true, jid: n + '@s.whatsapp.net', lid: '777' + n.slice(-3) + '@lid' }]),
        presenceSubscribe: async () => {}, sendPresenceUpdate: async (p, jid) => { s.presences.push(p); },
        sendMessage: async (jid, contenu) => { s.envois.push([jid, contenu]); return { key: { id: 'W' + s.envois.length }, message: { conversation: contenu.text } }; },
        logout: async () => { s.delie = true; }, end: () => { s.fin = true; } };
      sockets.push(s);
      return s;
    }
  };
  return lib;
}

const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));

function connecteur(opts = {}) {
  const lib = fausseBibliotheque();
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-b-'));
  const recus = [], accuses = [], santes = [], notes = [];
  let t = 10000000;
  const c = creerConnecteur({ dossierSession: dossier, journal: (m) => notes.push(m), baileys: async () => lib, horloge: () => t, delaiReconnexionMs: 10,
    surMessage: (n, texte, info) => recus.push([n, texte, info.type]), surAccuse: (id, niv) => accuses.push([id, niv]), surSante: (r) => santes.push(r.sante) });
  return { c, lib, dossier, recus, accuses, santes, notes, avancer: (ms) => { t += ms; } };
}

async function connecte(x) {
  await pause(20);
  const s = x.lib.sockets[x.lib.sockets.length - 1];
  s.ev.emit('connection.update', { qr: 'QR-TEXTE' });
  await pause(50);
  assert.strictEqual(x.c.etat().etat, 'QR');
  assert.ok(/^data:image\/png;base64,/.test(x.c.qrImage()), 'QR en image');
  s.user = { id: '2250701020304:12@s.whatsapp.net', name: 'Officine' };
  s.ev.emit('connection.update', { connection: 'open' });
  await pause(5);
  return s;
}

test('QR puis connexion : etat CONNECTE, numero de l\'officine, pret a envoyer', async () => {
  const x = connecteur();
  assert.strictEqual(x.c.pret(), false);
  await connecte(x);
  const e = x.c.etat();
  assert.strictEqual(e.etat, 'CONNECTE');
  assert.strictEqual(e.numero, '2250701020304');
  assert.strictEqual(e.moteur, 'baileys');
  assert.strictEqual(e.sante, 'OK');
  assert.strictEqual(x.c.pret(), true);
  x.c.fermer();
});

test('envoi : numero resolu, « en train d\'ecrire », message garde pour les demandes de renvoi', async () => {
  const x = connecteur();
  const s = await connecte(x);
  assert.strictEqual(await x.c.existe('+225 07 08 09 10 11'), true);
  assert.strictEqual(await x.c.existe('2250000000000'), false, 'numero sans WhatsApp');
  await x.c.ecrire('2250708091011', 5);
  assert.deepStrictEqual(s.presences, ['composing', 'paused']);
  const id = await x.c.envoyer('2250708091011', 'Votre commande est prête');
  assert.strictEqual(id, 'W1');
  assert.deepStrictEqual(s.envois[0], ['2250708091011@s.whatsapp.net', { text: 'Votre commande est prête' }]);
  const renvoi = await s.opts.getMessage({ id: 'W1' });
  assert.deepStrictEqual(renvoi, { conversation: 'Votre commande est prête' }, 'le message peut etre renvoye au telephone qui le redemande');
  x.c.fermer();
  assert.ok(fs.existsSync(path.join(x.dossier, 'messages-envoyes.json')), 'cache ecrit a l\'arret');
  assert.ok(s.fin && !s.delie, 'arret propre : connexion fermee sans delier l\'appareil');
});

test('reponse d\'un client adressee en @lid : numero retrouve grace a la correspondance apprise a l\'envoi', async () => {
  const x = connecteur();
  const s = await connecte(x);
  await x.c.existe('2250708091011');
  s.ev.emit('messages.upsert', { type: 'notify', messages: [{ key: { remoteJid: '777011@lid', id: 'E1' }, message: { conversation: 'Merci' }, pushName: 'Awa' }] });
  assert.deepStrictEqual(x.recus, [['2250708091011', 'Merci', 'TEXTE']]);
  /* groupes et diffusions ignores, messages envoyes par l'officine ignores */
  s.ev.emit('messages.upsert', { type: 'notify', messages: [{ key: { remoteJid: '1@g.us' }, message: { conversation: 'x' } }, { key: { fromMe: true, remoteJid: '1@s.whatsapp.net' }, message: { conversation: 'x' } }] });
  assert.strictEqual(x.recus.length, 1);
  x.c.fermer();
});

test('accuses : distribue puis lu', async () => {
  const x = connecteur();
  const s = await connecte(x);
  s.ev.emit('messages.update', [{ key: { id: 'W1', fromMe: true }, update: { status: 3 } }, { key: { id: 'W1', fromMe: true }, update: { status: 4 } }]);
  assert.deepStrictEqual(x.accuses, [['W1', 2], ['W1', 3]]);
  x.c.fermer();
});

test('reponses illisibles en serie sans reception saine : sante DEGRADE signalee, puis OK a la reception suivante', async () => {
  const x = connecteur();
  const s = await connecte(x);
  x.avancer(120000);
  for (let i = 0; i < 3; i++) { s.ev.emit('messages.upsert', { type: 'notify', messages: [{ key: { remoteJid: '1@s.whatsapp.net', id: 'I' + i } }] }); }
  assert.strictEqual(x.c.etat().sante, 'DEGRADE');
  assert.ok(/reconnectez/i.test(x.c.etat().raisonSante));
  s.ev.emit('messages.upsert', { type: 'notify', messages: [{ key: { remoteJid: '2250708091011@s.whatsapp.net', id: 'E2' }, message: { conversation: 'ok' } }] });
  assert.strictEqual(x.c.etat().sante, 'OK');
  assert.deepStrictEqual(x.santes, ['DEGRADE', 'OK']);
  x.c.fermer();
});

test('coupure : reconnexion automatique ; appareil delie depuis le telephone : session effacee, nouveau QR', async () => {
  const x = connecteur();
  const s = await connecte(x);
  s.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 428 } } } });
  assert.strictEqual(x.c.etat().etat, 'DECONNECTE');
  assert.strictEqual(x.c.etat().numero, '2250701020304', 'coupure simple : le numero reste connu');
  await pause(60);
  assert.strictEqual(x.lib.sockets.length, 2, 'nouvelle connexion ouverte seule');
  const s2 = x.lib.sockets[1];
  fs.writeFileSync(path.join(x.dossier, 'creds.json'), '{}');
  s2.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 401 } } } });
  assert.strictEqual(x.c.etat().numero, null);
  assert.ok(!fs.existsSync(path.join(x.dossier, 'creds.json')), 'session effacee');
  x.c.fermer();
});

test('les journaux ne contiennent ni texte de message ni numero', async () => {
  const x = connecteur();
  const s = await connecte(x);
  await x.c.envoyer('2250708091011', 'Texte confidentiel');
  s.ev.emit('messages.upsert', { type: 'notify', messages: [{ key: { remoteJid: '2250708091011@s.whatsapp.net', id: 'E3' }, message: { conversation: 'Réponse confidentielle' } }] });
  await s.opts.getMessage({ id: 'W1' });
  x.c.fermer();
  const tout = x.notes.join('\n');
  assert.ok(!/confidentiel/i.test(tout) && !/0708091011/.test(tout), tout);
});

test('reseau coupe : les tentatives s\'espacent (pas de martelage), etat « Demarrage » tant que le numero n\'est pas appaire', async () => {
  const x = connecteur();
  await pause(20);
  const debut = Date.now();
  for (let i = 0; i < 4; i++) {
    const s = x.lib.sockets[x.lib.sockets.length - 1];
    s.ev.emit('connection.update', { connection: 'connecting' });
    assert.strictEqual(x.c.etat().etat, 'INITIALISATION', 'jamais appaire : pas de « connexion en cours »');
    s.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 408 } } } });
    const n = x.lib.sockets.length;
    await new Promise((ok) => { const v = setInterval(() => { if (x.lib.sockets.length > n) { clearInterval(v); ok(); } }, 2); });
  }
  /* delais 10, 20, 40, 80 ms : au moins 150 ms pour 4 tentatives (une reprise fixe a 10 ms en prendrait 40) */
  assert.ok(Date.now() - debut >= 150, 'delai qui double : ' + (Date.now() - debut) + ' ms');
  x.c.fermer();
});
