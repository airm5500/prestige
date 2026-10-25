'use strict';
/*
 * SERVICE COMPAGNON WHATSAPP WEB de Prestige (retours du 07/10).
 *
 * Prestige (serveur Java) l'appelle avec un jeton partage (Authorization: Bearer <jeton>) ; le navigateur de
 * l'officine ne le joint jamais directement. Routes :
 *   GET  /etat          etat de la connexion (INITIALISATION, QR, CONNECTE, DECONNECTE...), numero, file d'attente
 *   GET  /qr            QR code a scanner (image data:...) quand l'etat est QR
 *   POST /deconnecter   deconnecte le numero (changement de telephone)
 *   POST /messages      {to, text, id?, media?} -> {id, position} : le message entre dans la file (regles anti-bannissement) ;
 *                       media = {type: image|document, base64, mimeType?, nomFichier?} (JPEG, PNG ou PDF, 16 Mo au plus),
 *                       text sert alors de legende
 *   PUT  /regles        regles d'envoi (voir src/regles.js) ; GET /regles pour les lire
 *   POST /arret         arret propre (caches ecrits, appareil NON delie : aucun QR a rescanner) ; utilise par arreter.bat
 *   GET  /sante         {ok:true} sans jeton ni information : le service repond (scripts de demarrage)
 * Les statuts (sent, delivered, read, failed), les messages entrants (STOP...) et la sante de la reception (OK,
 * DEGRADE) sont rapportes a Prestige sur PRESTIGE_WEBHOOK (POST v1/whatsapp/webhook-web) avec le meme jeton.
 *
 * Configuration (variables d'environnement ou fichier config.json a cote de ce dossier, ou designe par WHATSAPP_CONFIG) :
 *   PORT (3010), JETON (obligatoire), PRESTIGE_WEBHOOK, DOSSIER (dossier de la session et de la file),
 *   MOTEUR : baileys (defaut, repris du CRM UBIPHARM, sans navigateur) ou wwebjs (whatsapp-web.js, ancien moteur).
 * Les journaux ne contiennent jamais le texte des messages ni le jeton.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { FileEnvoi } = require('./file');
const R = require('./regles');

/* WHATSAPP_CONFIG : config.json ailleurs (service Windows : dans le dossier des donnees, qu'une mise a jour ne remplace pas) */
const fichierConfig = process.env.WHATSAPP_CONFIG || path.join(__dirname, '..', 'config.json');
const config = Object.assign({ PORT: 3010, DOSSIER: path.join(__dirname, '..', 'donnees') },
  fs.existsSync(fichierConfig) ? JSON.parse(fs.readFileSync(fichierConfig, 'utf8')) : {}, process.env);
if (!config.JETON || String(config.JETON).length < 16 || /^A_REMPLACER/.test(String(config.JETON))) {
  console.error('JETON absent, trop court (16 caracteres au moins) ou laisse a sa valeur d\'exemple dans config.json :'
    + ' le service refuse de demarrer. Mettre le meme jeton que dans Prestige (Parametrage WhatsApp > Comptes).');
  process.exit(1);
}
const journal = (m) => console.log(new Date().toISOString() + ' ' + m);

async function rapporter(corps) {
  if (!config.PRESTIGE_WEBHOOK) { return; }
  const r = await fetch(config.PRESTIGE_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.JETON }, body: JSON.stringify(corps) });
  if (!r.ok) { journal('Prestige a refuse le rapport : HTTP ' + r.status); }
}

let file;
const moteur = process.env.WHATSAPP_FAUX === '1' ? 'faux' : (String(config.MOTEUR || 'baileys').toLowerCase() === 'wwebjs' ? 'wwebjs' : 'baileys');
const connecteur = require({ faux: './connecteur-faux', wwebjs: './connecteur-wwebjs', baileys: './connecteur-baileys' }[moteur]).creerConnecteur({
  /* le moteur baileys garde sa session dans son propre dossier : revenir a wwebjs ne melange pas les deux */
  dossierSession: path.join(config.DOSSIER, moteur === 'baileys' ? 'session-baileys' : 'session'), journal,
  /* fils de discussion de Prestige (demande du 25/10) : type, nom du profil et identifiant du message en plus ;
     le texte part seulement vers Prestige, jamais dans le journal */
  surMessage: (numero, texte, info) => {
    if (R.estArret(texte)) { file.arreter(numero); journal('desinscription recue'); }
    const i = info || {};
    rapporter({ entrants: [{ numero, texte, type: i.type || 'TEXTE', nom: i.nom || null, id: i.id || null }] }).catch(() => {});
  },
  surAccuse: (waId, ack) => file && file.accuse(waId, ack),
  surSante: (s) => rapporter({ sante: s }).catch(() => {})
});
journal('moteur WhatsApp : ' + moteur);
const fichierRegles = path.join(config.DOSSIER, 'regles.json');
file = new FileEnvoi({ connecteur, journal, fichier: path.join(config.DOSSIER, 'file.json'), dossierMedias: path.join(config.DOSSIER, 'medias'),
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

/* 64 Ko pour les reglages ; 25 Mo pour un message avec piece jointe (16 Mo encodes en base64) */
function lireCorps(req, max = 64 * 1024) {
  return new Promise((ok, ko) => {
    let t = '';
    req.on('data', (c) => { t += c; if (t.length > max) { ko(new Error('trop gros')); req.destroy(); } });
    req.on('end', () => { try { ok(t ? JSON.parse(t) : {}); } catch (e) { ko(e); } });
  });
}

/* arret propre (Ctrl+C, arret du service Windows, POST /arret) : file et caches ecrits, connexion fermee sans delier */
let arretEnCours = false;
function arretPropre(origine) {
  if (arretEnCours) { return; }
  arretEnCours = true;
  journal('arret demande (' + origine + ') : fermeture propre');
  try { file.sauver(); } catch (e) { /* on continue */ }
  try { if (connecteur.fermer) { connecteur.fermer(); } } catch (e) { /* idem */ }
  setTimeout(() => process.exit(0), 900);
}
process.on('SIGINT', () => arretPropre('SIGINT'));
process.on('SIGTERM', () => arretPropre('SIGTERM'));

const serveur = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  if (req.method === 'GET' && url.pathname === '/sante') { return repondre(res, 200, { ok: true }); }
  if (!jetonValide(req)) { return repondre(res, 401, { erreur: 'jeton invalide' }); }
  try {
    if (req.method === 'POST' && url.pathname === '/arret') { repondre(res, 200, { ok: true }); setTimeout(() => arretPropre('demande'), 100); return undefined; }
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
      const m = await lireCorps(req, 25 * 1024 * 1024);
      const r = file.ajouter({ id: m.id, to: m.to, text: m.text, media: m.media });
      return r.refuse ? repondre(res, 422, { erreur: r.refuse }) : repondre(res, 200, r);
    }
    return repondre(res, 404, { erreur: 'route inconnue' });
  } catch (e) {
    return repondre(res, 400, { erreur: 'demande illisible' });
  }
});
serveur.on('error', (e) => {
  if (e && e.code === 'EADDRINUSE') {
    console.error('LE PORT ' + config.PORT + ' EST DEJA UTILISE : une autre instance du service tourne probablement.'
      + ' Verifier http://127.0.0.1:' + config.PORT + '/sante, ou lancer arreter.bat puis relancer, ou changer PORT dans config.json.');
  } else {
    console.error('Erreur du serveur HTTP : ' + (e && e.message ? e.message : e));
  }
  process.exit(1);
});
serveur.listen(Number(config.PORT), config.HOTE || '127.0.0.1', () => journal('service WhatsApp Web sur le port ' + config.PORT));
