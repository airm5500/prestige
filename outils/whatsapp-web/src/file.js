'use strict';
/*
 * FILE D'ENVOI : chaque message demande par Prestige attend son tour, puis part selon les regles (src/regles.js).
 * La file est gardee sur disque (fichier JSON) : un redemarrage du service ne perd rien et ne renvoie rien.
 * Le connecteur WhatsApp est injecte (le vrai : connecteur-wwebjs.js ; un faux dans les tests), ce qui permet de
 * verifier tout le deroule sans telephone.
 *
 * connecteur = { pret(): bool, existe(numero): Promise<bool>, ecrire(numero, ms): Promise, envoyer(numero, texte): Promise<id> }
 * rapporter(statuts[]) : envoie a Prestige [{id, statut: sent|failed|delivered|read, erreur}]
 */
const fs = require('fs');
const path = require('path');
const R = require('./regles');

class FileEnvoi {
  constructor({ connecteur, rapporter, fichier, regles, horloge, alea, attendre, journal }) {
    this.connecteur = connecteur;
    this.rapporter = rapporter || (async () => {});
    this.fichier = fichier;
    this.r = R.regles(regles || {});
    this.horloge = horloge || (() => new Date());
    this.alea = alea || Math.random;
    this.attendre = attendre || ((ms) => new Promise((ok) => setTimeout(ok, ms)));
    this.journal = journal || (() => {});
    this.d = { messages: [], arrets: [], premiereConnexion: null, compteurs: {}, envoyesDepuisPause: 0, echecsConsecutifs: 0, pauseJusqua: 0 };
    this.charger();
    this.enCours = false;
  }

  charger() {
    try { if (this.fichier && fs.existsSync(this.fichier)) { Object.assign(this.d, JSON.parse(fs.readFileSync(this.fichier, 'utf8'))); } } catch (e) { this.journal('file illisible, repartie vide'); }
  }

  sauver() {
    if (!this.fichier) { return; }
    fs.mkdirSync(path.dirname(this.fichier), { recursive: true });
    const tmp = this.fichier + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.d));
    fs.renameSync(tmp, this.fichier);
  }

  changerRegles(r) { this.r = R.regles(r || {}); }

  jour(d) { return d.toISOString().slice(0, 10); }
  heure(d) { return d.toISOString().slice(0, 13); }

  etat(maintenant) {
    const c = this.d.compteurs;
    const premiere = this.d.premiereConnexion ? new Date(this.d.premiereConnexion) : maintenant;
    return {
      envoyesJour: c['j' + this.jour(maintenant)] || 0,
      envoyesHeure: c['h' + this.heure(maintenant)] || 0,
      joursActif: Math.floor((maintenant - premiere) / 86400000),
      echecsConsecutifs: this.d.echecsConsecutifs,
      pauseJusqua: this.d.pauseJusqua
    };
  }

  /** Ajoute un message ; refuse (sans le mettre en file) un numero invalide, arrete, ou un doublon du jour. */
  ajouter({ id, to, text }) {
    const n = R.numero(to);
    const maintenant = this.horloge();
    if (!n) { return { refuse: 'Numéro invalide.' }; }
    if (!text || !String(text).trim()) { return { refuse: 'Message vide.' }; }
    if (String(text).length > 4096) { return { refuse: 'Message trop long (4096 caractères au plus).' }; }
    if (this.d.arrets.includes(n)) { return { refuse: 'Le destinataire a demandé à ne plus recevoir de messages.' }; }
    const jour = this.jour(maintenant);
    if (this.d.messages.some((m) => m.to === n && m.text === text && m.jour === jour && m.statut !== 'failed')) {
      return { refuse: 'Message identique déjà envoyé aujourd\'hui à ce numéro.' };
    }
    const m = { id: id || 'wweb-' + maintenant.getTime() + '-' + Math.floor(this.alea() * 1e6), to: n, text: String(text), statut: 'queued', jour, cree: maintenant.toISOString() };
    this.d.messages.push(m);
    this.purger(maintenant);
    this.sauver();
    return { id: m.id, position: this.d.messages.filter((x) => x.statut === 'queued').length };
  }

  /** Garde 7 jours d'historique (pour les doublons et l'etat). */
  purger(maintenant) {
    const limite = new Date(maintenant.getTime() - 7 * 86400000).toISOString();
    this.d.messages = this.d.messages.filter((m) => m.statut === 'queued' || m.cree >= limite);
  }

  arreter(numero) {
    const n = R.numero(numero);
    if (n && !this.d.arrets.includes(n)) { this.d.arrets.push(n); }
    for (const m of this.d.messages) { if (m.to === n && m.statut === 'queued') { m.statut = 'failed'; m.erreur = 'Désinscrit (STOP)'; } }
    this.sauver();
  }

  enAttente() { return this.d.messages.filter((m) => m.statut === 'queued'); }

  /**
   * Traite UN message si les regles le permettent. Rend {envoye|echec|attente: raison, reprise} ; la boucle du service
   * l'appelle sans cesse. Toutes les attentes passent par this.attendre (instantanees dans les tests).
   */
  async etape() {
    const m = this.enAttente()[0];
    if (!m) { return { attente: 'VIDE' }; }
    if (!this.connecteur.pret()) { return { attente: 'NON_CONNECTE' }; }
    const maintenant = this.horloge();
    const v = R.peutEnvoyer(this.r, this.etat(maintenant), maintenant);
    if (!v.ok) { return { attente: v.raison, reprise: v.reprise }; }
    if (!this.d.premiereConnexion) { this.d.premiereConnexion = maintenant.toISOString(); }
    try {
      if (this.r.verifierNumero && !(await this.connecteur.existe(m.to))) {
        return this.fini(m, 'failed', 'Ce numéro n\'a pas de compte WhatsApp.', false);
      }
      const texte = R.variation(m.text, this.alea);
      await this.connecteur.ecrire(m.to, R.dureeFrappeMs(this.r, texte, this.alea));
      m.waId = await this.connecteur.envoyer(m.to, texte);
      const res = this.fini(m, 'sent', null, true);
      await this.attendre(R.delaiSuivantMs(this.r, this.d.envoyesDepuisPause, this.alea));
      return res;
    } catch (e) {
      return this.fini(m, 'failed', String(e && e.message || e).slice(0, 200), false, true);
    }
  }

  fini(m, statut, erreur, compte, echecTechnique) {
    const maintenant = this.horloge();
    m.statut = statut; m.erreur = erreur || undefined; m.fin = maintenant.toISOString();
    if (compte) {
      const c = this.d.compteurs;
      c['j' + this.jour(maintenant)] = (c['j' + this.jour(maintenant)] || 0) + 1;
      c['h' + this.heure(maintenant)] = (c['h' + this.heure(maintenant)] || 0) + 1;
      this.d.envoyesDepuisPause++;
      this.d.echecsConsecutifs = 0;
    } else if (echecTechnique) {
      this.d.echecsConsecutifs++;
      if (this.d.echecsConsecutifs >= this.r.echecsAvantPause) {
        this.d.pauseJusqua = maintenant.getTime() + this.r.pauseEchecMin * 60000;
        this.d.echecsConsecutifs = 0;
        this.journal('trop d\'echecs consecutifs : pause de ' + this.r.pauseEchecMin + ' min');
      }
    }
    this.sauver();
    this.rapporter([{ id: m.id, statut, erreur: erreur || '' }]).catch(() => {});
    return statut === 'sent' ? { envoye: m.id } : { echec: m.id, erreur };
  }

  /** Accuse de reception de WhatsApp (2 = distribue, 3 = lu) pour un message envoye. */
  accuse(waId, niveau) {
    const m = this.d.messages.find((x) => x.waId === waId);
    if (!m) { return; }
    const statut = niveau >= 3 ? 'read' : (niveau >= 2 ? 'delivered' : null);
    if (statut && m.statut !== statut) { m.statut = statut; this.sauver(); this.rapporter([{ id: m.id, statut, erreur: '' }]).catch(() => {}); }
  }

  resume() {
    const maintenant = this.horloge();
    const e = this.etat(maintenant);
    return { enAttente: this.enAttente().length, envoyesAujourdhui: e.envoyesJour, envoyesCetteHeure: e.envoyesHeure,
      plafondDuJour: R.plafondDuJour(this.r, e.joursActif), joursActif: e.joursActif,
      pauseJusqua: e.pauseJusqua > maintenant.getTime() ? new Date(e.pauseJusqua).toISOString() : null, regles: this.r };
  }
}

module.exports = { FileEnvoi };
