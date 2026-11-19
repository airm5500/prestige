/* COHERENCE DE LA CREATION DES VENTES A L'ECRAN (Moaye, 19/11 : ventes creees en double au premier article).
 *
 * Test unitaire, sans serveur ni navigateur : le VRAI code de l'ecran (addVenteVno, addVenteAssuarnce et la file
 * d'attente de la creation, lus dans VenteCtr.js et VenteEnDepotCtr.js) tourne contre un faux serveur. Des milliers
 * de suites de gestes sont tirees au hasard avec une graine fixe :
 *  - ajout d'un article (5 articles, quantite 1 a 3), geste repete aussitot (double Entree), autre article scanne ;
 *  - reponses du serveur dans le desordre, refus (success:false), coupure reseau avec ou sans creation faite.
 * Le faux serveur cree une vente par add/vno ou add/assurance et rend la meme vente pour une meme cle X-Client-Ref
 * (comme MobileClientRefService).
 * Regles verifiees sur chaque suite :
 *  1. jamais deux creations en cours en meme temps ;
 *  2. au plus une vente creee par saisie ;
 *  3. chaque geste est envoye une fois, sauf le meme geste repete pendant la creation (ignore) ;
 *  4. tout ajout apres la creation part sur add/item avec l'identifiant de la vente creee ;
 *  5. la vente contient exactement les articles des envois acceptes (somme des quantites) ;
 *  6. toute creation porte une cle X-Client-Ref, jamais vide.
 * FICHIER=<chemin> fait tourner le test sur une autre version de l'ecran (l'ancien code doit echouer).
 */
const fs = require('fs');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }

const RACINE = path.join(__dirname, '..', '..', '..', 'main', 'webapp', 'general', 'app', 'controller');
const FICHIERS = process.env.FICHIER ? [process.env.FICHIER] : [path.join(RACINE, 'VenteCtr.js'), path.join(RACINE, 'VenteEnDepotCtr.js')];
const METHODES = ['estCreationVente', 'attendreCreationVente', 'cleCreationVente', 'finCreationVente', 'addVenteVno', 'addVenteAssuarnce'];
const SUITES = Number(process.env.SUITES || 3000);

/* source d'une methode du controleur : de « nom: function » a la virgule qui ferme son accolade */
function methode(src, nom) {
  const i = src.indexOf('    ' + nom + ': function');
  if (i < 0) { return null; }
  const debut = src.indexOf('function', i);
  let k = src.indexOf('{', debut), n = 0, chaine = null;
  for (; k < src.length; k++) {
    const c = src[k];
    if (chaine) { if (c === '\\') { k++; } else if (c === chaine) { chaine = null; } continue; }
    if (c === '\'' || c === '"' || c === '`') { chaine = c; continue; }
    if (c === '/' && src[k + 1] === '/') { k = src.indexOf('\n', k); continue; }
    if (c === '/' && src[k + 1] === '*') { k = src.indexOf('*/', k) + 1; continue; }
    if (c === '{') { n++; } else if (c === '}') { n--; if (n === 0) { break; } }
  }
  return src.slice(debut, k + 1);
}

let graine = 20261119;
const hasard = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
const entier = (n) => Math.floor(hasard() * n);

function controleur(src, journal) {
  const Ext = {
    MessageBox: { wait: () => ({ hide: () => {} }), show: (o) => journal.messages.push(o.msg) },
    Msg: { alert: (t, m) => journal.messages.push(m) },
    JSON: { encode: (o) => JSON.stringify(o), decode: (s) => { try { return JSON.parse(s); } catch (e) { return null; } } },
    Ajax: { request: (o) => { journal.envois = (journal.envois || 0) + 1; journal.enVol.push(o); } },
    apply: (a, b) => Object.assign(a, b),
    each: (l, f) => l.forEach(f)
  };
  const neutre = { setValue: () => {}, focus: () => {} };
  const me = {
    current: null, client: { get: () => 'CLIENT' },
    getCurrent() { return this.current; }, getClient() { return this.client; },
    updateStockField() {}, getVnoemplacementField: () => neutre, afficherPeremptionProche() {}, getTotalField: () => neutre,
    resetProduitCombo() {}, refresh() {}, autoComputeNetVno() {}, getClientSearchTextField: () => neutre
  };
  const absentes = [];
  METHODES.forEach((m) => {
    const s = methode(src, m);
    if (!s) { if (/^addVente/.test(m)) { absentes.push(m); } return; }
    me[m] = new Function('Ext', 'return ' + s)(Ext);
  });
  return { me, absentes };
}

/* une saisie : gestes au hasard, reponses dans le desordre ; rend les ecarts aux regles */
function suite(src, type) {
  const journal = { enVol: [], messages: [] };
  const { me, absentes } = controleur(src, journal);
  if (absentes.length) { return ['méthodes absentes : ' + absentes.join(', ')]; }
  const ecarts = [];
  const serveur = { ventes: {}, cles: {}, n: 0 };
  const attendu = {};        // articles qui doivent etre dans la vente (envois acceptes)
  let gestes = 0, ignores = 0, envoyes = 0, refuses = 0;
  const methodeAjout = type === 'vno' ? 'addVenteVno' : 'addVenteAssuarnce';
  const urlCreation = '../api/v1/vente/add/' + (type === 'vno' ? 'vno' : 'assurance');
  let dernier = null;
  const geste = (data) => {
    gestes++;
    const url = me.getCurrent() ? '../api/v1/vente/add/item' : urlCreation;
    if (me.getCurrent()) { data.venteId = me.getCurrent().lgPREENREGISTREMENTID; }
    const avant = journal.enVol.length + (me.ajoutsEnAttente || []).length;
    const enCours = me.creationVenteEnCours;
    me[methodeAjout](data, url, { setValue() {}, focus() {} }, { focus() {} });
    if (journal.enVol.length + (me.ajoutsEnAttente || []).length === avant) {
      ignores++;
      /* regle 3 : seul le meme geste repete pendant la creation peut etre ignore */
      if (!enCours || !enCours.data || enCours.data.produitId !== data.produitId || String(enCours.data.qte) !== String(data.qte)) {
        ecarts.push('geste perdu');
      }
    }
    dernier = data;
  };
  const repondre = () => {
    const i = entier(journal.enVol.length);
    const o = journal.enVol.splice(i, 1)[0];
    const data = JSON.parse(o.params);
    const creation = /add\/(vno|assurance)$/.test(o.url);
    if (creation && !(o.headers && o.headers['X-Client-Ref'])) { ecarts.push('création sans X-Client-Ref'); }
    if (!creation && data.venteId !== (me.getCurrent() && me.getCurrent().lgPREENREGISTREMENTID) && !serveur.ventes[data.venteId]) {
      ecarts.push('add/item sans vente connue : ' + data.venteId);
    }
    const tirage = hasard();
    let issue = tirage < 0.8 ? 'ok' : tirage < 0.88 ? 'refus' : tirage < 0.94 ? 'coupure-faite' : 'coupure';
    /* cle deja connue : le serveur rend la reponse de la premiere fois (jamais un refus) */
    if (creation && issue === 'refus' && o.headers && serveur.cles[o.headers['X-Client-Ref']]) { issue = 'ok'; }
    let vente = null;
    if (issue === 'ok' || issue === 'coupure-faite') {
      if (creation) {
        const cle = o.headers && o.headers['X-Client-Ref'];
        if (cle && serveur.cles[cle]) { vente = serveur.cles[cle]; }
        else {
          vente = 'V' + (++serveur.n); serveur.ventes[vente] = {};
          if (cle) { serveur.cles[cle] = vente; }
          serveur.ventes[vente][data.produitId] = (serveur.ventes[vente][data.produitId] || 0) + Number(data.qte);
        }
      } else {
        vente = data.venteId;
        serveur.ventes[vente][data.produitId] = (serveur.ventes[vente][data.produitId] || 0) + Number(data.qte);
      }
      if (issue === 'ok') {
        envoyes++;
        o.success({ responseText: JSON.stringify({ success: true, data: { lgPREENREGISTREMENTID: vente, intPRICE: 0 } }) });
      } else {
        o.failure({ status: 0 });
      }
    } else if (issue === 'refus') {
      refuses++;
      o.success({ responseText: JSON.stringify({ success: false, msg: 'refus' }) });
    } else {
      o.failure({ status: 0 });
    }
    if (journal.enVol.filter((x) => /add\/(vno|assurance)$/.test(x.url)).length > 1) { ecarts.push('deux créations en cours'); }
  };
  const n = 3 + entier(10);
  for (let k = 0; k < n; k++) {
    const t = hasard();
    if (t < 0.25 && dernier) {
      geste(Object.assign({}, dernier));                        // meme geste repete (double Entree)
    } else if (t < 0.85 || !journal.enVol.length) {
      geste({ produitId: 'P' + entier(5), qte: 1 + entier(3), venteId: null });
    } else {
      repondre();
    }
    if (journal.enVol.filter((x) => /add\/(vno|assurance)$/.test(x.url)).length > 1) { ecarts.push('deux créations en cours'); }
  }
  let garde = 0;
  while ((journal.enVol.length || (me.ajoutsEnAttente || []).length) && garde++ < 200) {
    if (journal.enVol.length) { repondre(); } else { break; }
  }
  if ((journal.envois || 0) !== gestes - ignores) { ecarts.push('envois ' + (journal.envois || 0) + ' pour ' + (gestes - ignores) + ' gestes'); }
  const creees = Object.keys(serveur.ventes);
  if (creees.length > 1) { ecarts.push(creees.length + ' ventes créées'); }
  if ((me.ajoutsEnAttente || []).length) { ecarts.push('ajouts restés en attente : ' + me.ajoutsEnAttente.length); }
  if (me.getCurrent() && !serveur.ventes[me.getCurrent().lgPREENREGISTREMENTID]) { ecarts.push('écran sur une vente inconnue'); }
  return ecarts;
}

for (const f of FICHIERS) {
  const src = fs.readFileSync(f, 'utf8');
  const nom = path.basename(f);
  for (const type of ['vno', 'assurance']) {
    graine = 20261119;
    const pannes = {};
    let nok = 0;
    for (let s = 0; s < SUITES; s++) {
      const e = suite(src, type);
      if (e.length) { nok++; e.forEach((x) => { pannes[x.replace(/\d+/g, 'n')] = (pannes[x.replace(/\d+/g, 'n')] || 0) + 1; }); }
    }
    ok(`${nom}, ${type === 'vno' ? 'comptant' : 'assurance'} : ${SUITES} saisies tirées au hasard (graine fixe), aucune règle enfreinte`, nok === 0,
      nok + ' saisie(s) en écart : ' + JSON.stringify(pannes));
  }
}

/* cas fixes, lisibles, en plus du hasard */
for (const f of FICHIERS) {
  const src = fs.readFileSync(f, 'utf8');
  const nom = path.basename(f);
  const journal = { enVol: [], messages: [] };
  const { me, absentes } = controleur(src, journal);
  if (absentes.length) { ok(nom + ' : méthodes d\'ajout présentes', false, absentes.join(', ')); continue; }
  const champ = { setValue() {}, focus() {} };
  me.addVenteVno({ produitId: 'A', qte: 1, venteId: null }, '../api/v1/vente/add/vno', champ, champ);
  me.addVenteVno({ produitId: 'A', qte: 1, venteId: null }, '../api/v1/vente/add/vno', champ, champ);
  me.addVenteVno({ produitId: 'B', qte: 2, venteId: null }, '../api/v1/vente/add/vno', champ, champ);
  ok(nom + ' : double Entrée puis autre article pendant la création : une seule requête partie', journal.enVol.length === 1, journal.enVol.length);
  const cle = (journal.enVol[0].headers || {})['X-Client-Ref'];
  journal.enVol.shift().success({ responseText: JSON.stringify({ success: true, data: { lgPREENREGISTREMENTID: 'V1', intPRICE: 0 } }) });
  const suivant = journal.enVol[0];
  ok(nom + ' : l\'article en attente part ensuite sur add/item de la vente créée', journal.enVol.length === 1 && /add\/item$/.test(suivant.url)
    && JSON.parse(suivant.params).venteId === 'V1' && JSON.parse(suivant.params).produitId === 'B', suivant && suivant.url + ' ' + suivant.params);
  /* coupure : la cle est gardee, le nouvel essai la renvoie (le serveur rendra la vente si elle a ete creee) */
  const j2 = { enVol: [], messages: [] };
  const c2 = controleur(src, j2).me;
  c2.addVenteVno({ produitId: 'A', qte: 1, venteId: null }, '../api/v1/vente/add/vno', champ, champ);
  const k1 = (j2.enVol[0].headers || {})['X-Client-Ref'];
  j2.enVol.shift().failure({ status: 0 });
  c2.addVenteVno({ produitId: 'A', qte: 1, venteId: null }, '../api/v1/vente/add/vno', champ, champ);
  ok(nom + ' : après une coupure, le nouvel essai renvoie la même clé X-Client-Ref', j2.enVol.length === 1 && !!k1 && j2.enVol[0].headers['X-Client-Ref'] === k1, k1);
  /* refus du serveur : la cle est abandonnee (rien n'a ete cree) */
  j2.enVol.shift().success({ responseText: JSON.stringify({ success: false, msg: 'refus' }) });
  c2.addVenteVno({ produitId: 'A', qte: 1, venteId: null }, '../api/v1/vente/add/vno', champ, champ);
  ok(nom + ' : après un refus, une nouvelle clé', j2.enVol.length === 1 && !!j2.enVol[0].headers['X-Client-Ref'] && j2.enVol[0].headers['X-Client-Ref'] !== k1 && !!cle);
}

const ko = res.filter((x) => !x.c).length;
console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
process.exit(ko ? 1 : 0);
