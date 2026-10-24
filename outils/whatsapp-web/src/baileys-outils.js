'use strict';
/*
 * Outils du connecteur Baileys, sans reseau ni etat global (testes dans test/baileys-outils.test.js). Repris du service
 * WhatsApp Web du CRM UBIPHARM (ubisenderpro, crm/wa-web/server.js), ou ils ont ete eprouves en production :
 *  - correspondance LID <-> numero : WhatsApp adresse de plus en plus les contacts par un identifiant masque
 *    (« 253270027194615@lid ») ; sans la correspondance apprise, la reponse d'un client serait perdue ;
 *  - cache des messages envoyes (borne, garde sur disque) : il permet de repondre aux demandes de renvoi du telephone
 *    du destinataire (« En attente de ce message ») meme apres un redemarrage ;
 *  - sante de la reception : apres une longue coupure, le chiffrement peut se desynchroniser ; l'envoi marche encore
 *    mais les reponses arrivent illisibles et se perdent. On le detecte (DEGRADE) au lieu de les jeter en silence.
 * Les journaux ne recoivent jamais le texte des messages ni les numeros.
 */
const fs = require('fs');
const path = require('path');

/** Adresse WhatsApp d'un numero international (chiffres seuls). */
function jidDe(numero) {
  return String(numero || '').replace(/[^0-9]/g, '') + '@s.whatsapp.net';
}

/** Identifiant LID porte par une cle de message, s'il y en a un. */
function lidDeCle(k) {
  if (!k) { return null; }
  for (const c of [k.remoteJid, k.senderLid, k.participant, k.lidJid]) {
    if (c && typeof c === 'string' && c.endsWith('@lid')) { return c.split('@')[0]; }
  }
  return null;
}

/**
 * Numero de telephone d'une cle de message entrant : le vrai numero (@s.whatsapp.net) dans l'un des champs connus ;
 * a defaut, la correspondance LID apprise. Quand numero et LID sont presents ensemble, la correspondance est apprise.
 */
function numeroDeCle(k, table) {
  if (!k) { return null; }
  for (const c of [k.remoteJid, k.remoteJidAlt, k.senderPn, k.participantPn, k.participant, k.participantAlt]) {
    if (c && typeof c === 'string' && c.endsWith('@s.whatsapp.net')) {
      const numero = c.split('@')[0];
      const lid = lidDeCle(k);
      if (lid && table) { table.apprendre(lid, numero); }
      return numero;
    }
  }
  const lid = lidDeCle(k);
  return lid && table ? table.numero(lid) : null;
}

/** Texte lisible d'un message entrant : {type, texte} ; null si la cle ne porte aucun message. */
function contenuEntrant(m) {
  const msg = m && m.message;
  if (!msg) { return null; }
  if (msg.conversation) { return { type: 'TEXTE', texte: msg.conversation }; }
  if (msg.extendedTextMessage && msg.extendedTextMessage.text) { return { type: 'TEXTE', texte: msg.extendedTextMessage.text }; }
  if (msg.imageMessage) { return { type: 'IMAGE', texte: msg.imageMessage.caption || '[image]' }; }
  if (msg.videoMessage) { return { type: 'VIDEO', texte: msg.videoMessage.caption || '[vidéo]' }; }
  if (msg.documentMessage) { return { type: 'DOCUMENT', texte: msg.documentMessage.fileName || '[document]' }; }
  if (msg.audioMessage) { return { type: 'AUDIO', texte: '[audio]' }; }
  return { type: 'TEXTE', texte: '[message]' };
}

/** Accuse Baileys (3 = distribue, 4 = lu, 5 = ecoute) -> niveau de la file de Prestige (2 = distribue, 3 = lu). */
function niveauAccuse(statut) {
  if (typeof statut !== 'number') { return null; }
  return statut >= 4 ? 3 : (statut === 3 ? 2 : null);
}

/** Table cle -> valeur gardee sur disque (ecriture differee, regroupee). */
class TableDisque {
  constructor(fichier, { max, differeMs = 2000, journal } = {}) {
    this.fichier = fichier; this.max = max || 0; this.differeMs = differeMs; this.journal = journal || (() => {});
    this.m = new Map(); this.minuteur = null;
    try {
      if (fichier && fs.existsSync(fichier)) {
        const brut = JSON.parse(fs.readFileSync(fichier, 'utf8'), (cle, val) =>
          (val && typeof val === 'object' && val.type === 'Buffer' && Array.isArray(val.data)) ? Buffer.from(val.data) : val);
        for (const [k, v] of Object.entries(brut || {})) { this.m.set(k, v); }
      }
    } catch (e) { this.journal('fichier ' + path.basename(fichier) + ' illisible, repart vide'); }
  }

  get(k) { return this.m.get(k); }
  has(k) { return this.m.has(k); }
  get taille() { return this.m.size; }

  set(k, v) {
    this.m.set(k, v);
    while (this.max && this.m.size > this.max) { this.m.delete(this.m.keys().next().value); }
    this.planifier();
  }

  planifier() {
    if (!this.fichier || this.minuteur) { return; }
    this.minuteur = setTimeout(() => { this.minuteur = null; this.sauver(); }, this.differeMs);
    if (this.minuteur.unref) { this.minuteur.unref(); }
  }

  /** Ecriture immediate (arret propre) ; jamais d'exception. */
  sauver() {
    if (!this.fichier) { return; }
    if (this.minuteur) { clearTimeout(this.minuteur); this.minuteur = null; }
    try {
      fs.mkdirSync(path.dirname(this.fichier), { recursive: true });
      const tmp = this.fichier + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.m)), 'utf8');
      fs.renameSync(tmp, this.fichier);
    } catch (e) { this.journal('sauvegarde de ' + path.basename(this.fichier) + ' impossible'); }
  }
}

/** Correspondances LID -> numero. */
class TableLid extends TableDisque {
  apprendre(lid, numero) { if (lid && numero && this.get(lid) !== numero) { this.set(lid, numero); } }
  numero(lid) { return this.get(lid) || null; }
}

/** Nombre de messages envoyes gardes pour repondre aux demandes de renvoi. */
const MAX_ENVOYES = 300;

/** Cache des messages envoyes (id WhatsApp -> contenu du message). */
class CacheEnvoyes extends TableDisque {
  constructor(fichier, opts) { super(fichier, Object.assign({ max: MAX_ENVOYES }, opts)); }
  retenir(resultat) {
    if (resultat && resultat.key && resultat.key.id && resultat.message) { this.set(resultat.key.id, resultat.message); }
  }
}

/** Echecs de dechiffrement consecutifs avant de declarer la reception degradee. */
const SEUIL_ECHECS = 3;
/** Delai sans aucune reception lisible avant de pouvoir la declarer degradee. */
const DELAI_SANS_RECEPTION_MS = 60000;

/**
 * Sante de la reception : OK ou DEGRADE. Un incident passager (WhatsApp relivre souvent le message une seconde plus
 * tard) ne declenche rien : il faut plusieurs echecs CONSECUTIFS et aucune reception saine recente. surChangement
 * n'est appele qu'au basculement (pas de rafale d'alertes).
 */
class Sante {
  constructor({ horloge, surChangement } = {}) {
    this.horloge = horloge || (() => Date.now());
    this.surChangement = surChangement || (() => {});
    this.reinitialiser();
  }

  reinitialiser() {
    this.etat = 'OK'; this.raison = null; this.illisibles = 0; this.consecutifs = 0;
    this.derniereReception = this.derniereReception || null;
  }

  illisible(raison) {
    this.illisibles++; this.consecutifs++;
    if (this.etat === 'DEGRADE') { return false; }
    const depuis = this.horloge() - (this.derniereReception || 0);
    if (this.consecutifs < SEUIL_ECHECS || depuis < DELAI_SANS_RECEPTION_MS) { return false; }
    this.etat = 'DEGRADE'; this.raison = raison;
    this.surChangement(this.resume());
    return true;
  }

  lisible() {
    this.derniereReception = this.horloge(); this.consecutifs = 0;
    if (this.etat !== 'DEGRADE') { return false; }
    this.etat = 'OK'; this.raison = null;
    this.surChangement(this.resume());
    return true;
  }

  resume() {
    return { sante: this.etat, raisonSante: this.raison, illisibles: this.illisibles,
      derniereReception: this.derniereReception ? new Date(this.derniereReception).toISOString() : null };
  }
}

module.exports = { jidDe, lidDeCle, numeroDeCle, contenuEntrant, niveauAccuse, TableDisque, TableLid, CacheEnvoyes, Sante,
  MAX_ENVOYES, SEUIL_ECHECS, DELAI_SANS_RECEPTION_MS };
