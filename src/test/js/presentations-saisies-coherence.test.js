/*
 * Test de coherence des presentations a l'essai des saisies (regle du 05/11, docs/notices/STRATEGIE_TESTS.md).
 *
 * Les regles de calcul des variantes A, B et C sont tirees au hasard sur des milliers de cas, avec une graine fixe :
 *   1. entrees : quantite recue = commandee - reliquat, jamais negative ; statut (lot manquant, ecart signe, conforme) ;
 *      totaux du bon = somme des lignes ; chaque ligne compte dans un seul statut ;
 *   2. commande : boites = somme des quantites, montant = somme des montants de ligne, montant de ligne = quantite x PAF ;
 *   3. enregistrement d'une quantite (suggestion et commande) : apres succes, l'ecran dit ce que dit le serveur ;
 *      apres echec, la ligne et les totaux reviennent exactement a l'etat d'avant ; les totaux de la suggestion lus
 *      pendant l'enregistrement ne sont jamais faussés par l'annulation.
 *
 * Le fichier de l'ecran est charge tel quel dans un bac a sable (faux Ext, aucune requete reelle). Les fonctions
 * internes sont lues en ajoutant une ligne avant « var RENDUS = { » : le test tourne donc aussi sur une ancienne
 * version du fichier, pour le voir echouer d'abord :
 *     node src/test/js/presentations-saisies-coherence.test.js [fichier.js]
 *     git show fa3b577fe^:src/main/webapp/general/resources/js/presentations-saisies.js > ancien.js && node ... ancien.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FICHIER = process.argv[2]
    || path.join(__dirname, '../../main/webapp/general/resources/js/presentations-saisies.js');
const GRAINE = 20261105;
const CAS = Number(process.env.CAS || 5000);

/* ------------------------------------------------------------------ tirage reproductible */

function generateur(graine) {
    let a = graine >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const hasard = generateur(GRAINE);
const entier = (min, max) => min + Math.floor(hasard() * (max - min + 1));
const parmi = (t) => t[Math.floor(hasard() * t.length)];

/* ------------------------------------------------------------------ chargement du fichier de l'ecran */

const requetes = [];
function charger() {
    const src = fs.readFileSync(FICHIER, 'utf8');
    const marque = '\n    var RENDUS = {';
    if (src.indexOf(marque) < 0) {
        throw new Error('repere « var RENDUS = { » introuvable dans ' + FICHIER);
    }
    const noms = ['num', 'recue', 'statutEntree', 'totauxEntree', 'totaux', 'montantLigne', 'enregistrerQuantite'];
    const expo = '\n    window.__calculs = {' + noms.map((n) => n + ': typeof ' + n + ' === "function" ? ' + n + ' : null').join(', ') + '};';
    const bac = {
        window: {}, document: {cookie: '', activeElement: null},
        Ext: {
            Ajax: {request: (o) => requetes.push(o)},
            getCmp: () => null,
            JSON: {encode: JSON.stringify, decode: (s) => { try { return JSON.parse(s); } catch (e) { return null; } }},
            util: {Format: {number: (v) => String(v)}}
        },
        console
    };
    vm.createContext(bac);
    vm.runInContext(src.replace(marque, expo + marque), bac, {filename: FICHIER});
    return bac.window.__calculs;
}
const F = charger();

/* ------------------------------------------------------------------ verifications */

let total = 0;
const echecs = {};
function ok(regle, cond, detail) {
    total++;
    if (!cond) {
        const e = echecs[regle] || (echecs[regle] = {n: 0, exemple: detail});
        e.n++;
    }
}
const egal = (a, b) => Math.abs(a - b) < 1e-6;

/* ------------------------------------------------------------------ 1. entrees */

function ligneEntree(i) {
    const cmde = parmi([0, 1, 1, 2, entier(1, 12), entier(1, 500)]);
    /* reliquat : nul le plus souvent, parfois partiel, total, superieur a la commande, ou negatif (surplus livre) */
    const manquant = parmi([0, 0, 0, entier(0, cmde), cmde, cmde + entier(1, 5), -entier(1, 4)]);
    const brut = (v) => (hasard() < 0.2 ? String(v) : v);
    return {
        lg_BON_LIVRAISON_DETAIL: 'L' + i,
        /* l'API de la grille d'origine renvoie la recue egale a la commandee : seul le reliquat dit l'ecart */
        int_QTE_CMDE: brut(cmde), int_QTE_RECUE: brut(cmde), int_QTE_MANQUANT: brut(manquant),
        int_PAF: parmi([0, entier(1, 50) * 5, entier(100, 99999)]),
        freeQty: parmi([0, 0, entier(1, 10)]),
        quantiteSaisie: parmi([0, cmde, entier(0, 20)]),
        checked: hasard() < 0.5,
        prixDiff: hasard() < 0.2,
        lots: hasard() < 0.6 ? [{lot: 'X'}] : null
    };
}

function testerEntrees() {
    for (let c = 0; c < CAS; c++) {
        const gestionLot = hasard() < 0.5;
        const ctx = {cle: 'entree', ecran: {gestionLot: gestionLot}, lignes: []};
        const n = parmi([0, 1, 2, entier(3, 40)]);
        for (let i = 0; i < n; i++) {
            ctx.lignes.push(ligneEntree(i));
        }
        const attendu = {recu: 0, montant: 0, ecarts: 0, lots: 0, conformes: 0, pointees: 0, ug: 0, ugLignes: 0, prix: 0};
        ctx.lignes.forEach((l) => {
            const cmde = Number(l.int_QTE_CMDE), manq = Number(l.int_QTE_MANQUANT);
            const r = Math.max(0, cmde - manq);
            const detail = {gestionLot, cmde, manquant: manq, attendu: r};
            if (F.recue) {
                const v = F.recue(l);
                ok('recue = commandee - reliquat', v === r, Object.assign({obtenu: v}, detail));
                ok('recue jamais negative', v >= 0, Object.assign({obtenu: v}, detail));
            }
            const s = F.statutEntree(ctx, l);
            if (gestionLot && !l.lots) {
                ok('statut : lot manquant', s[2] === 'lots', Object.assign({obtenu: s}, detail));
                attendu.lots++;
            } else if (r !== cmde) {
                const lib = 'Écart ' + (r > cmde ? '+' : '−') + Math.abs(r - cmde);
                ok('statut : ecart signe = recue - commandee', s[2] === 'ecarts' && s[1] === lib, Object.assign({obtenu: s, libelle: lib}, detail));
                attendu.ecarts++;
            } else {
                ok('statut : conforme si recue = commandee', s[2] === null && s[1] === 'Conforme', Object.assign({obtenu: s}, detail));
                attendu.conformes++;
            }
            attendu.recu += r;
            attendu.montant += r * Number(l.int_PAF);
            attendu.ug += Number(l.freeQty);
            attendu.ugLignes += Number(l.freeQty) > 0 ? 1 : 0;
            attendu.pointees += l.checked ? 1 : 0;
            attendu.prix += l.prixDiff ? 1 : 0;
        });
        const t = F.totauxEntree(ctx);
        const d = {gestionLot, lignes: n, attendu, obtenu: t};
        ok('bon : nombre de lignes', t.lignes === n, d);
        ok('bon : recu = somme des recues', t.recu === attendu.recu, d);
        ok('bon : montant = somme recue x PAF', egal(t.montant, attendu.montant), d);
        ok('bon : ecarts', t.ecarts === attendu.ecarts, d);
        ok('bon : lots manquants', t.lots === attendu.lots, d);
        ok('bon : chaque ligne dans un seul statut', t.ecarts + t.lots + attendu.conformes === n, d);
        ok('bon : UG = somme des UG', t.ug === attendu.ug && t.ugLignes === attendu.ugLignes, d);
        ok('bon : lignes pointees', t.pointees === attendu.pointees, d);
        ok('bon : prix differents', t.prix === attendu.prix, d);
    }
}

/* ------------------------------------------------------------------ 2 et 3. commande et suggestion */

function nouvelEcran(cle, n) {
    const serveur = {};
    const lignes = [];
    for (let i = 0; i < n; i++) {
        const q = parmi([1, 1, 2, entier(1, 9), entier(10, 400)]);
        const paf = parmi([0, entier(1, 40) * 25, entier(100, 60000)]);
        const id = 'D' + i;
        serveur[id] = {q, paf};
        const l = cle === 'commande'
            ? {lg_ORDERDETAIL_ID: id, int_NUMBER: hasard() < 0.2 ? String(q) : q, int_PAF: paf, int_PRICE: q * paf, lg_FAMILLE_PRIX_VENTE: paf * 2}
            : {lg_SUGGESTION_ORDER_DETAILS_ID: id, int_NUMBER: q, int_PAF_SUGG: paf};
        lignes.push(l);
    }
    const ctx = {
        cle, v: parmi(['A', 'B', 'C']), lignes, enCours: 0,
        ecran: {getNameintern: () => 'E', getSuggestionAmount: () => null, getCommandeAmount: () => null},
        grille: {getStore: () => ({reload: () => { ctx.relectures = (ctx.relectures || 0) + 1; }, isLoading: () => false})}
    };
    return {ctx, serveur};
}
function sommeServeur(serveur) {
    let boites = 0, montant = 0;
    Object.keys(serveur).forEach((id) => {
        boites += serveur[id].q;
        montant += serveur[id].q * serveur[id].paf;
    });
    return {boites, montant};
}
/* L'enregistrement de la variante envoie une requete ; le faux serveur l'accepte ou la refuse. */
function repondre(req, accepte, serveur, id, q) {
    if (accepte) {
        serveur[id].q = q;
    }
    if (accepte) {
        req.success && req.success({responseText: JSON.stringify({success: true})});
    } else if (hasard() < 0.5) {
        req.failure && req.failure({status: 500});
    } else {
        /* refus metier : HTTP 200 mais success:false (commande) */
        if (req.success && /updateorderitem/.test(req.url)) {
            req.success({responseText: JSON.stringify({success: false})});
        } else {
            req.failure && req.failure({status: 500});
        }
    }
    req.callback && req.callback();
}

function testerSaisie(cle) {
    const idDe = (l) => (cle === 'commande' ? l.lg_ORDERDETAIL_ID : l.lg_SUGGESTION_ORDER_DETAILS_ID);
    for (let c = 0; c < Math.ceil(CAS / 5); c++) {
        const n = parmi([1, 2, entier(3, 25)]);
        const {ctx, serveur} = nouvelEcran(cle, n);
        if (cle === 'suggestion') {
            /* la suggestion compte aussi les lignes hors de la page affichee : totaux lus par l'agregat */
            for (let i = n; i < n + entier(0, 30); i++) {
                serveur['H' + i] = {q: entier(1, 50), paf: entier(0, 9000)};
            }
            const s = sommeServeur(serveur);
            ctx.srv = {lignes: Object.keys(serveur).length, boites: s.boites, montant: s.montant};
        }
        const pas = entier(1, 12);
        for (let k = 0; k < pas; k++) {
            const l = parmi(ctx.lignes), id = idDe(l), avant = JSON.stringify(l), srvAvant = ctx.srv && JSON.stringify(ctx.srv);
            const q = parmi([1, 2, Number(l.int_NUMBER), Number(l.int_NUMBER) + 1, entier(1, 999)]);
            const accepte = hasard() < 0.65;
            /* totaux de la suggestion relus pendant l'enregistrement (rechargement de la page de la grille) */
            const relu = cle === 'suggestion' && hasard() < 0.25;
            requetes.length = 0;
            ctx.relectures = 0;
            F.enregistrerQuantite(ctx, l, q);
            const req = requetes.shift();
            ok(cle + ' : une seule requete par enregistrement', !!req && requetes.length === 0, {q});
            if (!req) {
                continue;
            }
            if (relu) {
                const s = sommeServeur(serveur);
                ctx.srv = {lignes: Object.keys(serveur).length, boites: s.boites, montant: s.montant};
            }
            repondre(req, accepte, serveur, id, q);
            const d = {cle, accepte, relu, q, avant: JSON.parse(avant), apres: JSON.parse(JSON.stringify(l)), srvAvant, srv: ctx.srv};
            ok(cle + ' : quantite affichee = quantite en base', Number(l.int_NUMBER) === serveur[id].q, d);
            if (!accepte) {
                ok(cle + ' : un echec remet la ligne exactement', JSON.stringify(l) === avant, d);
                if (ctx.srv && !relu) {
                    ok(cle + ' : un echec remet les totaux exactement', JSON.stringify(ctx.srv) === srvAvant, d);
                }
            }
            ok(cle + ' : aucun enregistrement en cours a la fin', ctx.enCours === 0, d);
            ok(cle + ' : la grille d\'origine est relue apres chaque enregistrement', ctx.relectures === 1, d);
            if (relu && accepte) {
                /* totaux lus avant que la base ne change : la relecture de la grille (verifiee ci-dessus) relit l'agregat */
                const s = sommeServeur(serveur);
                ctx.srv = {lignes: Object.keys(serveur).length, boites: s.boites, montant: s.montant};
            }
            const t = F.totaux(ctx);
            if (cle === 'commande') {
                let boites = 0, montant = 0;
                ctx.lignes.forEach((x) => {
                    boites += serveur[idDe(x)].q;
                    montant += serveur[idDe(x)].q * serveur[idDe(x)].paf;
                    ok('commande : montant de ligne = quantite x PAF', egal(Number(x.int_PRICE), Number(x.int_NUMBER) * Number(x.int_PAF)), Object.assign({ligne: x}, d));
                });
                ok('commande : boites = somme des quantites', t.boites === boites, Object.assign({t}, d));
                ok('commande : montant = somme des lignes', egal(t.montant, montant), Object.assign({t}, d));
                ok('commande : nombre de lignes', t.lignes === ctx.lignes.length, d);
            } else {
                const s = sommeServeur(serveur);
                ok('suggestion : boites = agregat de la base', t.boites === s.boites, Object.assign({t, base: s}, d));
                ok('suggestion : montant = agregat de la base', egal(t.montant, s.montant), Object.assign({t, base: s}, d));
                ok('suggestion : nombre de lignes = agregat', t.lignes === Object.keys(serveur).length, d);
            }
        }
    }
}

function testerNum() {
    const cas = [[3, 3], ['3', 3], ['', 0], [null, 0], [undefined, 0], ['abc', 0], [NaN, 0], [Infinity, 0], ['2.5', 2.5], [-4, -4]];
    cas.forEach(([v, a]) => ok('num : lecture tolerante', F.num(v) === a, {v, attendu: a, obtenu: F.num(v)}));
}

/* ------------------------------------------------------------------ lancement */

testerNum();
testerEntrees();
testerSaisie('commande');
testerSaisie('suggestion');

const regles = Object.keys(echecs);
const nbEchecs = regles.reduce((s, r) => s + echecs[r].n, 0);
console.log('Coherence des presentations (graine ' + GRAINE + ', ' + CAS + ' cas, fichier ' + path.basename(FICHIER) + ')');
regles.forEach((r) => {
    console.log('  ECHEC ' + r + ' : ' + echecs[r].n + ' fois ; exemple ' + JSON.stringify(echecs[r].exemple).slice(0, 600));
});
console.log((total - nbEchecs) + '/' + total + ' verifications, ' + regles.length + ' regle(s) en echec');
process.exit(regles.length ? 1 : 0);
