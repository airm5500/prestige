'use strict';
/*
 * Branchement sur whatsapp-web.js : un vrai WhatsApp Web dans Chromium (puppeteer), la methode la plus proche d'un
 * usage humain. La session (apres le scan du QR code) est gardee dans le dossier de session : pas de nouveau scan au
 * redemarrage.
 */
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

function creerConnecteur({ dossierSession, journal, surMessage, surAccuse }) {
  const etat = { etat: 'INITIALISATION', qr: null, qrImage: null, numero: null, nom: null, depuis: new Date().toISOString(), erreur: null };
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: dossierSession }),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }
  });
  const changer = (e, extra) => { Object.assign(etat, { etat: e, depuis: new Date().toISOString() }, extra || {}); journal('etat : ' + e); };

  client.on('qr', async (qr) => {
    let image = null;
    try { image = await QRCode.toDataURL(qr, { margin: 1, width: 280 }); } catch (e) { /* le texte du QR reste disponible */ }
    changer('QR', { qr, qrImage: image });
  });
  client.on('authenticated', () => changer('AUTHENTIFIE', { qr: null, qrImage: null }));
  client.on('ready', () => {
    const w = client.info && client.info.wid ? client.info.wid.user : null;
    changer('CONNECTE', { numero: w, nom: client.info && client.info.pushname, erreur: null });
  });
  client.on('auth_failure', (m) => changer('ECHEC_AUTH', { erreur: String(m) }));
  client.on('disconnected', (raison) => {
    changer('DECONNECTE', { erreur: String(raison), numero: null });
    setTimeout(() => client.initialize().catch((e) => changer('ERREUR', { erreur: String(e.message) })), 5000);
  });
  client.on('message', (msg) => { if (!msg.fromMe && surMessage) { surMessage(String(msg.from || '').replace(/@.*$/, ''), msg.body); } });
  client.on('message_ack', (msg, ack) => { if (surAccuse && msg.id) { surAccuse(msg.id._serialized, ack); } });

  client.initialize().catch((e) => changer('ERREUR', { erreur: String(e.message) }));

  return {
    etat: () => Object.assign({}, etat, { qr: undefined }),
    qrImage: () => etat.qrImage,
    pret: () => etat.etat === 'CONNECTE',
    existe: async (numero) => !!(await client.getNumberId(numero)),
    ecrire: async (numero, ms) => {
      const chat = await client.getChatById(numero + '@c.us');
      await chat.sendStateTyping();
      await new Promise((ok) => setTimeout(ok, ms));
      await chat.clearState();
    },
    envoyer: async (numero, texte) => {
      const m = await client.sendMessage(numero + '@c.us', texte);
      return m && m.id ? m.id._serialized : null;
    },
    /** Deconnecte le numero (le prochain demarrage affiche un nouveau QR code). */
    deconnecter: async () => { try { await client.logout(); } catch (e) { /* deja deconnecte */ } changer('DECONNECTE', { numero: null }); setTimeout(() => client.initialize().catch(() => {}), 2000); }
  };
}

module.exports = { creerConnecteur };
