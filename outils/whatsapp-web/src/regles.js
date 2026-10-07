'use strict';
/*
 * REGLES ANTI-BANNISSEMENT de l'envoi par WhatsApp Web (retours du 07/10, sur le modele d'ubisenderpro).
 *
 * WhatsApp bannit un numero qui se comporte comme un robot : envois en rafale, a intervalle fixe, la nuit, vers des
 * numeros sans WhatsApp, le meme texte a tout le monde, un numero neuf qui envoie des centaines de messages le
 * premier jour. Ces fonctions (sans etat ni reseau, testees dans test/regles.test.js) decident QUAND envoyer :
 *   - delai aleatoire entre deux messages (jamais un intervalle fixe) ;
 *   - longue pause toutes les N messages ;
 *   - plafonds par heure et par jour, avec MONTEE EN CHARGE pour un numero recent ;
 *   - heures d'envoi seulement (en dehors, le message attend l'ouverture suivante) ;
 *   - « en train d'ecrire » simule, proportionnel a la longueur du texte ;
 *   - variation des textes ({Bonjour|Bonsoir}) quand le modele en contient ;
 *   - pause de protection apres plusieurs echecs consecutifs ;
 *   - mots d'arret (STOP...) : le numero n'est plus jamais servi.
 */

const DEFAUTS = Object.freeze({
  delaiMinSec: 20,          // entre deux messages
  delaiMaxSec: 60,
  pauseApres: 15,           // longue pause toutes les N messages
  pauseMinMin: 5,
  pauseMaxMin: 12,
  plafondHeure: 40,
  plafondJour: 150,
  monteeEnCharge: true,     // numero recent : 20 le 1er jour, +20 par jour jusqu'au plafond
  monteeDepart: 20,
  monteePas: 20,
  heureDebut: 8,            // heures locales d'envoi [debut, fin[
  heureFin: 20,
  frappeMsParCaractere: 45,
  frappeMinMs: 1500,
  frappeMaxMs: 8000,
  echecsAvantPause: 3,
  pauseEchecMin: 30,
  verifierNumero: true
});

const MOTS_ARRET = ['stop', 'arret', 'arrêt', 'desabonner', 'désabonner', 'desinscrire', 'désinscrire', 'unsubscribe'];

/** Regles completees par les defauts ; une valeur absurde reprend le defaut (jamais de delai negatif ou nul). */
function regles(r) {
  const x = Object.assign({}, DEFAUTS);
  for (const k of Object.keys(DEFAUTS)) {
    if (r && r[k] !== undefined && r[k] !== null && r[k] !== '') {
      if (typeof DEFAUTS[k] === 'boolean') { x[k] = r[k] === true || r[k] === 'true' || r[k] === 1 || r[k] === '1'; } else {
        const n = Number(r[k]);
        if (Number.isFinite(n) && n >= 0) { x[k] = n; }
      }
    }
  }
  if (x.delaiMinSec < 5) { x.delaiMinSec = 5; }                       // plancher de securite
  if (x.delaiMaxSec < x.delaiMinSec) { x.delaiMaxSec = x.delaiMinSec; }
  if (x.pauseMaxMin < x.pauseMinMin) { x.pauseMaxMin = x.pauseMinMin; }
  if (x.heureFin <= x.heureDebut || x.heureFin > 24) { x.heureDebut = DEFAUTS.heureDebut; x.heureFin = DEFAUTS.heureFin; }
  if (x.pauseApres < 1) { x.pauseApres = DEFAUTS.pauseApres; }
  return x;
}

const entre = (min, max, alea) => min + (max - min) * alea();

/** Delai avant le prochain message (ms) ; une longue pause apres chaque serie de pauseApres messages. */
function delaiSuivantMs(r, envoyesDepuisPause, alea = Math.random) {
  if (envoyesDepuisPause > 0 && envoyesDepuisPause % r.pauseApres === 0) {
    return Math.round(entre(r.pauseMinMin, r.pauseMaxMin, alea) * 60000);
  }
  return Math.round(entre(r.delaiMinSec, r.delaiMaxSec, alea) * 1000);
}

function dansHoraires(r, d) {
  const h = d.getHours() + d.getMinutes() / 60;
  return h >= r.heureDebut && h < r.heureFin;
}

/** Prochaine ouverture des heures d'envoi a partir de d (d lui-meme s'il est dans les heures). */
function prochaineOuverture(r, d) {
  if (dansHoraires(r, d)) { return d; }
  const o = new Date(d);
  o.setMinutes(0, 0, 0);
  o.setHours(r.heureDebut);
  if (d.getHours() + d.getMinutes() / 60 >= r.heureFin) { o.setDate(o.getDate() + 1); }
  return o;
}

/** Plafond du jour, montee en charge comprise (joursActif = jours depuis la premiere connexion du numero, 0 = 1er jour). */
function plafondDuJour(r, joursActif) {
  if (!r.monteeEnCharge) { return r.plafondJour; }
  return Math.min(r.plafondJour, r.monteeDepart + r.monteePas * Math.max(0, Math.floor(joursActif)));
}

/**
 * Peut-on envoyer maintenant ? etat = {envoyesJour, envoyesHeure, joursActif, echecsConsecutifs, pauseJusqua (ms)}.
 * Rend {ok:true} ou {ok:false, raison, reprise (Date)}.
 */
function peutEnvoyer(r, etat, maintenant) {
  if (etat.pauseJusqua && etat.pauseJusqua > maintenant.getTime()) {
    return { ok: false, raison: 'PAUSE', reprise: new Date(etat.pauseJusqua) };
  }
  if (!dansHoraires(r, maintenant)) {
    return { ok: false, raison: 'HORS_HORAIRES', reprise: prochaineOuverture(r, maintenant) };
  }
  if (etat.envoyesJour >= plafondDuJour(r, etat.joursActif)) {
    const demain = new Date(maintenant); demain.setDate(demain.getDate() + 1); demain.setHours(r.heureDebut, 0, 0, 0);
    return { ok: false, raison: 'PLAFOND_JOUR', reprise: demain };
  }
  if (etat.envoyesHeure >= r.plafondHeure) {
    const h = new Date(maintenant); h.setHours(h.getHours() + 1, 0, 0, 0);
    return { ok: false, raison: 'PLAFOND_HEURE', reprise: prochaineOuverture(r, h) };
  }
  return { ok: true };
}

/** Duree de « en train d'ecrire » avant l'envoi. */
function dureeFrappeMs(r, texte, alea = Math.random) {
  const base = String(texte || '').length * r.frappeMsParCaractere * entre(0.8, 1.2, alea);
  return Math.round(Math.max(r.frappeMinMs, Math.min(r.frappeMaxMs, base)));
}

/** {a|b|c} -> une des variantes ; les accolades sans | restent telles quelles. */
function variation(texte, alea = Math.random) {
  return String(texte || '').replace(/\{([^{}]*\|[^{}]*)\}/g, (_, choix) => {
    const l = choix.split('|');
    return l[Math.min(l.length - 1, Math.floor(alea() * l.length))];
  });
}

function estArret(texte) {
  const t = String(texte || '').trim().toLowerCase().replace(/[.!\s]+$/g, '');
  return MOTS_ARRET.includes(t);
}

/** Numero international sans + ni espaces (ex. 2250708091011) ; null si inutilisable. */
function numero(n) {
  const d = String(n || '').replace(/[^0-9]/g, '');
  return d.length >= 8 && d.length <= 15 ? d : null;
}

module.exports = { DEFAUTS, regles, delaiSuivantMs, dansHoraires, prochaineOuverture, plafondDuJour, peutEnvoyer, dureeFrappeMs, variation, estArret, numero };
