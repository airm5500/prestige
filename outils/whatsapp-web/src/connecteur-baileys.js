'use strict';
/*
 * Branchement sur Baileys (@whiskeysockets/baileys 6.7.24, version figee : l'API change entre versions mineures), repris
 * du service WhatsApp Web du CRM UBIPHARM. Pas de navigateur : le protocole de WhatsApp Web est parle directement, ce qui
 * est plus leger et plus stable que whatsapp-web.js (Chromium). Meme interface que les autres connecteurs (voir
 * file.js) ; la file d'envoi et les regles anti-bannissement de Prestige restent devant.
 *
 * Ce que ce connecteur reprend du CRM : cache des cles de chiffrement, reponse aux demandes de renvoi (cache des
 * messages envoyes garde sur disque), correspondance @lid <-> numero, sante de la reception (DEGRADE), reconnexion
 * automatique apres une coupure, arret propre qui ferme sans delier l'appareil.
 * Etats rendus a Prestige (inchanges) : INITIALISATION, QR, AUTHENTIFIE, CONNECTE, DECONNECTE, ERREUR.
 * Les journaux ne recoivent jamais le texte des messages ni les numeros.
 */
const fs = require('fs');
const path = require('path');
const O = require('./baileys-outils');

/** Baileys 6.7.x est un module ES : import() fonctionne depuis Node 18 (require seulement depuis Node 22). */
async function chargerBaileys() {
  const b = await import('@whiskeysockets/baileys');
  const fabrique = [b.makeWASocket, b.default && b.default.default, b.default].find((c) => typeof c === 'function');
  if (typeof fabrique !== 'function') {
    throw new Error('fabrique de connexion introuvable dans @whiskeysockets/baileys : reinstaller la version 6.7.24');
  }
  return { fabrique, useMultiFileAuthState: b.useMultiFileAuthState, makeCacheableSignalKeyStore: b.makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion: b.fetchLatestBaileysVersion, loggedOut: (b.DisconnectReason || {}).loggedOut || 401 };
}

function creerConnecteur({ dossierSession, journal, surMessage, surAccuse, surSante, baileys, horloge, delaiReconnexionMs }) {
  const etat = { etat: 'INITIALISATION', qrImage: null, numero: null, nom: null, depuis: new Date().toISOString(), erreur: null };
  const changer = (e, extra) => { Object.assign(etat, { etat: e, depuis: new Date().toISOString() }, extra || {}); journal('etat : ' + e); };
  const lid = new O.TableLid(path.join(dossierSession, 'lid-numeros.json'), { journal });
  const envoyes = new O.CacheEnvoyes(path.join(dossierSession, 'messages-envoyes.json'), { journal });
  const sante = new O.Sante({ horloge, surChangement: (r) => { journal('sante de la reception : ' + r.sante); if (surSante) { surSante(r); } } });
  const relances = new Map();
  const cacheRelances = { get: (k) => relances.get(k), set: (k, v) => relances.set(k, v), del: (k) => relances.delete(k), flushAll: () => relances.clear() };
  let sock = null, demarrage = null, arrete = false, lib = null, echecs = 0, enregistre = false;
  /* reseau coupe : on ne martele pas WhatsApp ; le delai double a chaque echec (2 s, 4 s ... 1 min), remis a zero a l'ouverture */
  const delaiReprise = () => Math.min(60000, (delaiReconnexionMs || 2000) * Math.pow(2, Math.min(echecs, 10)));

  async function demarrer() {
    if (arrete || demarrage || (sock && etat.etat !== 'DECONNECTE')) { return demarrage; }
    demarrage = (async () => {
      lib = lib || (baileys ? await baileys() : await chargerBaileys());
      const { state, saveCreds } = await lib.useMultiFileAuthState(dossierSession);
      enregistre = !!(state.creds && state.creds.registered);
      let version;
      try { if (lib.fetchLatestBaileysVersion) { ({ version } = await lib.fetchLatestBaileysVersion()); } } catch (e) { /* version interne */ }
      /* cache memoire des cles : evite que la session de chiffrement soit reconstruite a chaque envoi */
      const silencieux = { level: 'silent', child() { return this; }, trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {} };
      const cles = typeof lib.makeCacheableSignalKeyStore === 'function' ? lib.makeCacheableSignalKeyStore(state.keys, silencieux) : state.keys;
      const s = lib.fabrique({
        version, auth: { creds: state.creds, keys: cles }, printQRInTerminal: false, logger: silencieux,
        browser: ['Prestige', 'Chrome', '1.0.0'], msgRetryCounterCache: cacheRelances,
        /* demande de renvoi du telephone du destinataire (« En attente de ce message ») */
        getMessage: async (cle) => {
          if (cle && cle.id && envoyes.has(cle.id)) { journal('demande de renvoi : message retrouve'); return envoyes.get(cle.id); }
          journal('demande de renvoi : message introuvable');
          return undefined;
        }
      });
      sock = s;
      s.ev.on('creds.update', saveCreds);
      s.ev.on('connection.update', async (u) => {
        if (u.qr) {
          let image = null;
          try { image = await require('qrcode').toDataURL(u.qr, { margin: 1, width: 280 }); } catch (e) { /* QR a regenerer */ }
          changer('QR', { qrImage: image });
        }
        /* numero deja appaire : « connexion en cours » ; jamais appaire : « demarrage » jusqu'au QR */
        if (u.connection === 'connecting' && etat.etat !== 'QR') { changer(enregistre ? 'AUTHENTIFIE' : 'INITIALISATION'); }
        if (u.connection === 'open') {
          echecs = 0; enregistre = true;
          sante.reinitialiser();
          const id = s.user && s.user.id ? String(s.user.id).split(/[:@]/)[0] : null;
          changer('CONNECTE', { qrImage: null, numero: id, nom: s.user ? s.user.name || null : null, erreur: null });
        }
        if (u.connection === 'close') {
          const code = u.lastDisconnect && u.lastDisconnect.error && u.lastDisconnect.error.output && u.lastDisconnect.error.output.statusCode;
          const delie = code === lib.loggedOut;
          sock = null;
          changer('DECONNECTE', { qrImage: null, numero: delie ? null : etat.numero, erreur: delie ? 'Appareil délié depuis le téléphone' : 'Connexion coupée (code ' + (code || '?') + ')' });
          if (delie) {
            /* appareil delie : la session ne vaut plus rien, un nouveau QR sera propose */
            try { fs.rmSync(dossierSession, { recursive: true, force: true }); } catch (e) { /* deja absent */ }
          }
          if (!arrete) {
            const d = delaiReprise(); echecs++;
            setTimeout(() => demarrer().catch((e) => changer('ERREUR', { erreur: String(e.message) })), d);
          }
        }
      });
      s.ev.on('messages.upsert', (ev) => {
        if (!ev || ev.type !== 'notify' || !Array.isArray(ev.messages)) { return; }
        for (const m of ev.messages) {
          if (!m || !m.key || m.key.fromMe) { continue; }
          const jid = m.key.remoteJid || '';
          if (jid.endsWith('@g.us') || jid.endsWith('@broadcast')) { continue; }
          const contenu = O.contenuEntrant(m);
          if (!contenu) {
            sante.illisible('Messages entrants illisibles (chiffrement désynchronisé) : reconnectez le téléphone.');
            continue;
          }
          const numero = O.numeroDeCle(m.key, lid);
          if (!numero) { journal('message entrant sans numero resolu (adresse masquee inconnue)'); continue; }
          sante.lisible();
          if (surMessage) { surMessage(numero, contenu.texte, { type: contenu.type, nom: m.pushName || null, id: m.key.id }); }
        }
      });
      s.ev.on('messages.update', (maj) => {
        for (const u of (Array.isArray(maj) ? maj : [])) {
          if (!u || !u.key || !u.key.fromMe || !u.update) { continue; }
          const niveau = O.niveauAccuse(u.update.status);
          if (niveau && surAccuse) { surAccuse(u.key.id, niveau); }
        }
      });
    })().finally(() => { demarrage = null; });
    return demarrage;
  }

  demarrer().catch((e) => changer('ERREUR', { erreur: String(e.message) }));

  /** Adresse WhatsApp reelle d'un numero (null s'il n'a pas WhatsApp) ; apprend au passage sa correspondance @lid. */
  async function resoudre(numero) {
    const propre = String(numero || '').replace(/[^0-9]/g, '');
    if (!sock || propre.length < 6) { return null; }
    const r = await sock.onWhatsApp(propre);
    if (r && r[0] && r[0].exists) {
      if (r[0].lid) { lid.apprendre(String(r[0].lid).split('@')[0], String(r[0].jid).split('@')[0]); }
      return r[0].jid;
    }
    return null;
  }

  return {
    etat: () => Object.assign({}, etat, { qrImage: undefined }, sante.resume(), { moteur: 'baileys' }),
    qrImage: () => etat.qrImage,
    pret: () => etat.etat === 'CONNECTE' && !!sock,
    existe: async (numero) => !!(await resoudre(numero)),
    ecrire: async (numero, ms) => {
      const jid = O.jidDe(numero);
      try { await sock.presenceSubscribe(jid); await sock.sendPresenceUpdate('composing', jid); } catch (e) { /* presence facultative */ }
      await new Promise((ok) => setTimeout(ok, ms));
      try { await sock.sendPresenceUpdate('paused', jid); } catch (e) { /* idem */ }
    },
    envoyer: async (numero, texte) => {
      const jid = (await resoudre(numero)) || O.jidDe(numero);
      const r = await sock.sendMessage(jid, { text: String(texte) });
      envoyes.retenir(r);
      return r && r.key ? r.key.id : null;
    },
    /** Piece jointe : image (JPEG, PNG) ou document PDF, avec une legende facultative. */
    envoyerMedia: async (numero, media, legende) => {
      const jid = (await resoudre(numero)) || O.jidDe(numero);
      const caption = legende && String(legende).trim() ? String(legende) : undefined;
      const contenu = media.type === 'document'
        ? { document: media.donnees, mimetype: media.mimeType || 'application/pdf', fileName: media.nomFichier || 'document.pdf', caption }
        : { image: media.donnees, mimetype: media.mimeType, caption };
      const r = await sock.sendMessage(jid, contenu);
      envoyes.retenir(r);
      return r && r.key ? r.key.id : null;
    },
    /** Delie l'appareil (changement de telephone) : un nouveau QR est propose. */
    deconnecter: async () => {
      const s = sock;
      try { if (s) { await s.logout(); } } catch (e) { /* deja delie */ }
      sock = null;
      try { fs.rmSync(dossierSession, { recursive: true, force: true }); } catch (e) { /* deja absent */ }
      changer('DECONNECTE', { numero: null, qrImage: null });
      if (!arrete) { setTimeout(() => demarrer().catch(() => {}), delaiReconnexionMs || 2000); }
    },
    /** Arret propre : caches ecrits, connexion fermee SANS delier l'appareil (aucun QR a rescanner). */
    fermer: () => {
      arrete = true;
      envoyes.sauver(); lid.sauver();
      try { if (sock) { sock.end(undefined); } } catch (e) { /* deja fermee */ }
    }
  };
}

module.exports = { creerConnecteur, chargerBaileys };
