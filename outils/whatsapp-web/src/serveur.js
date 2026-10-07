'use strict';
/*
 * SERVICE COMPAGNON WHATSAPP WEB de Prestige (retours du 07/10).
 *
 * Prestige (serveur Java) l'appelle avec un jeton partage (Authorization: Bearer <jeton>) ; le navigateur de
 * l'officine ne le joint jamais directement. Routes :
 *   GET  /etat          etat de la connexion (INITIALISATION, QR, CONNECTE, DECONNECTE...), numero, file d'attente
 *   GET  /qr            QR code a scanner (image data:...) quand l'etat est QR
 *   POST /deconnecter   deconnecte le numero (changement de telephone)
 *   POST /messages      {to, text, id?} -> {id, position} : le message entre dans la file (regles anti-bannissement)
 *   PUT  /regles        regles d'envoi (voir src/regles.js) ; GET /regles pour les lire
 * Les statuts (sent, delivered, read, failed) et les messages entrants (STOP...) sont rapportes a Prestige sur
 * PRESTIGE_WEBHOOK (POST v1/whatsapp/webhook-web) avec le meme jeton.
 *
 * Configuration (variables d'environnement ou fichier config.json a cote de ce dossier) :
 *   PORT (3010), JETON (obligatoire), PRESTIGE_WEBHOOK, DOSSIER (dossier de la session et de la file).
 * Les journaux ne contiennent jamais le texte des messages ni le jeton.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { FileEnvoi } = require('./file');
const R = require('./regles');

const fichierConfig = path.join(__dirname, '..', 'config.json');
const config = Object.assign({ PORT: 3010, DOSSIER: path.join(__dirname, '..', 'donnees') },
  fs.existsSync(fichierConfig) ? JSON.parse(fs.readFileSync(fichierConfig, 'utf8')) : {}, process.env);
if (!config.JETON || String(config.JETON).length < 16) {
  console.error('JETON absent ou trop court (16 caracteres au moins) : le service refuse de demarrer.');
  process.exit(1);
}
const journal = (m) => console.log(new Date().toISOString() + ' ' + m);

async function rapporter(corps) {
  if (!config.PRESTIGE_WEBHOOK) { return; }
  const r = await fetch(config.PRESTIGE_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.JETON }, body: JSON.stringify(corps) });
  if (!r.ok) { journal('Prestige a refuse le rapport : HTTP ' + r.status); }
}

let file;
const connecteur = (process.env.WHATSAPP_FAUX === '1' ? require('./connecteur-faux') : require('./connecteur-wwebjs')).creerConnecteur({
  dossierSession: path.join(config.DOSSIER, 'session'), journal,
  surMessage: (numero, texte) => {
    if (R.estArret(texte)) { file.arreter(numero); journal('desinscription recue'); }
    rapporter({ entrants: [{ numero, texte }] }).catch(() => {});
  },
  surAccuse: (waId, ack) => file && file.accuse(waId, ack)
});
const fichierRegles = path.join(config.DOSSIER, 'regles.json');
file = new FileEnvoi({ connecteur, journal, fichier: path.join(config.DOSSIER, 'file.json'),
  regles: fs.existsSync(fichierRegles) ? JSON.parse(fs.readFileSync(fichierRegles, 'utf8')) : {},
  rapporter: (statuts) => rapporter({ statuts }) });

/* boucle d'envoi : une etape, puis on attend selon la reponse */
(async function boucle() {
  for (;;) {
    let r;
    try { r = await file.etape(); } catch (e) { journal('erreur de la file : ' + e.message); r = { attente: 'ERREUR' }; }
    if (r.attente) {
      const ms = r.reprise ? Math.min(Math.max(1000, new Date(r.reprise) - Date.now()), 60000) : 3000;
      await new Promise((ok) => setTimeout(ok, ms));
    }
  }
})();

function jetonValide(req) {
  const h = String(req.headers.authorization || '');
  const recu = Buffer.from(h.startsWith('Bearer ') ? h.slice(7) : '');
  const attendu = Buffer.from(String(config.JETON));
  return recu.length === attendu.length && crypto.timingSafeEqual(recu, attendu);
}

function repondre(res, code, o) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(o));
}

function lireCorps(req) {
  return new Promise((ok, ko) => {
    let t = '';
    req.on('data', (c) => { t += c; if (t.length > 64 * 1024) { ko(new Error('trop gros')); req.destroy(); } });
    req.on('end', () => { try { ok(t ? JSON.parse(t) : {}); } catch (e) { ko(e); } });
  });
}

http.createServer(async (req, res) => {
  if (!jetonValide(req)) { return repondre(res, 401, { erreur: 'jeton invalide' }); }
  const url = new URL(req.url, 'http://local');
  try {
    if (req.method === 'GET' && url.pathname === '/etat') { return repondre(res, 200, Object.assign(connecteur.etat(), { file: file.resume() })); }
    if (req.method === 'GET' && url.pathname === '/qr') { return repondre(res, 200, { etat: connecteur.etat().etat, image: connecteur.qrImage() }); }
    if (req.method === 'POST' && url.pathname === '/deconnecter') { await connecteur.deconnecter(); return repondre(res, 200, { ok: true }); }
    if (req.method === 'GET' && url.pathname === '/regles') { return repondre(res, 200, file.r); }
    if (req.method === 'PUT' && url.pathname === '/regles') {
      const r = await lireCorps(req);
      file.changerRegles(r);
      fs.mkdirSync(config.DOSSIER, { recursive: true });
      fs.writeFileSync(fichierRegles, JSON.stringify(file.r));
      return repondre(res, 200, file.r);
    }
    if (req.method === 'POST' && url.pathname === '/messages') {
      const m = await lireCorps(req);
      const r = file.ajouter({ id: m.id, to: m.to, text: m.text });
      return r.refuse ? repondre(res, 422, { erreur: r.refuse }) : repondre(res, 200, r);
    }
    return repondre(res, 404, { erreur: 'route inconnue' });
  } catch (e) {
    return repondre(res, 400, { erreur: 'demande illisible' });
  }
}).listen(Number(config.PORT), config.HOTE || '127.0.0.1', () => journal('service WhatsApp Web sur le port ' + config.PORT));
