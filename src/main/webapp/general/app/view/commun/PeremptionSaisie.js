/* global Ext */

/*
 * Plan du 21/11, point 16.1 : lecture de la date de peremption tapee au clavier (commande en cours). Memes regles que
 * util.PeremptionSaisie cote serveur, qui recontrole a l'enregistrement :
 *  - MM/AA (01/27), MM/AAAA et MMAAAA (6 chiffres finissant par 20AA) : dernier jour du mois (31/01/2027) ;
 *  - autres 6 chiffres : JJMMAA (010127 = 01/01/2027) ; 8 chiffres : JJMMAAAA ;
 *  - JJ/MM/AA, JJ-MM-AA, JJ.MM.AA, et les memes avec l'annee sur 4 chiffres ;
 *  - refus avec un motif : date impossible (13/27, 32/01/27), date passee, saisie non reconnue.
 * lire(texte, aujourdhui) rend {date: Date} ou {motif: '...'} ; la forme est aussi utilisable hors d'Ext (tests node).
 */
(function () {
    var P = {
        deux: function (v) {
            return (v < 10 ? '0' : '') + v;
        },
        annee: function (a) {
            return a.length === 2 ? 2000 + parseInt(a, 10) : parseInt(a, 10);
        },
        /** Date du jour j/m/a, ou null si elle n'existe pas. */
        jour: function (j, m, a) {
            if (m < 1 || m > 12 || j < 1) {
                return null;
            }
            var d = new Date(a, m - 1, j);
            return d.getFullYear() === a && d.getMonth() === m - 1 && d.getDate() === j ? d : null;
        },
        finDeMois: function (m, a) {
            return m < 1 || m > 12 ? null : new Date(a, m, 0);
        },
        /** {date} | {impossible: true} | null (forme non reconnue). */
        interpreter: function (s) {
            var m, d;
            if (/^\d{6}$/.test(s)) {
                d = s.substr(2, 2) === '20' ? P.finDeMois(parseInt(s.substr(0, 2), 10), parseInt(s.substr(2), 10))
                        : P.jour(parseInt(s.substr(0, 2), 10), parseInt(s.substr(2, 2), 10), P.annee(s.substr(4)));
                return d ? {date: d} : {impossible: true};
            }
            if (/^\d{8}$/.test(s)) {
                d = P.jour(parseInt(s.substr(0, 2), 10), parseInt(s.substr(2, 2), 10), parseInt(s.substr(4), 10));
                return d ? {date: d} : {impossible: true};
            }
            m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/.exec(s);
            if (m) {
                d = P.jour(parseInt(m[1], 10), parseInt(m[2], 10), P.annee(m[3]));
                return d ? {date: d} : {impossible: true};
            }
            m = /^(\d{1,2})[\/.\-](\d{2}|\d{4})$/.exec(s);
            if (m) {
                d = P.finDeMois(parseInt(m[1], 10), P.annee(m[2]));
                return d ? {date: d} : {impossible: true};
            }
            return null;
        },
        texte: function (d) {
            return P.deux(d.getDate()) + '/' + P.deux(d.getMonth() + 1) + '/' + d.getFullYear();
        },
        /** {date, texte} ou {motif}. aujourdhui : Date (par defaut, le jour courant). */
        lire: function (saisie, aujourdhui) {
            var s = String(saisie === null || saisie === undefined ? '' : saisie).trim(), j = aujourdhui || new Date();
            if (!s) {
                return {motif: 'Date de péremption vide.'};
            }
            var r = P.interpreter(s);
            if (!r) {
                return {motif: 'Date non reconnue : « ' + s + ' ». Exemples : 01/27, 012027, 010127, 01/01/2027.'};
            }
            if (r.impossible) {
                return {motif: 'Date impossible : « ' + s + ' ».'};
            }
            var jour = new Date(j.getFullYear(), j.getMonth(), j.getDate());
            if (r.date < jour) {
                return {motif: 'Date passée : ' + P.texte(r.date) + '.'};
            }
            return {date: r.date, texte: P.texte(r.date)};
        }
    };
    if (typeof Ext !== 'undefined' && Ext.define) {
        Ext.define('testextjs.view.commun.PeremptionSaisie', {singleton: true, lire: P.lire, texte: P.texte, interpreter: P.interpreter});
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = P;
    }
}());
