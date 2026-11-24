/* global Ext */

/*
 * Retour du 22/11 sur le point 8.3 du plan du 21/11 : controle d'un numero de telephone a l'ecran, avec les memes regles
 * que le serveur (util.TelephoneCi), qui recontrole a l'enregistrement :
 *  - un numero precede de « + » ou de « 00 » et d'un autre indicatif que celui de l'officine est un numero etranger :
 *    valide s'il compte 8 a 15 chiffres (indicatif compris), garde sous la forme « +32470123456 » ;
 *  - officine en Cote d'Ivoire (225, par defaut) : regle ivoirienne d'avant, dix chiffres commencant par 01, 05 ou 07 ;
 *  - officine ailleurs : 6 a 12 chiffres hors zero de tete.
 * L'indicatif du pays de l'officine est lu une fois (GET v1/client-telephone/pays). controler(saisie, pays) rend
 * {valide, local, international, motif} ; la forme est aussi utilisable hors d'Ext (test de coherence sous Nashorn).
 */
(function () {
    var CI = '225';
    /* comme String.trim() de Java : caracteres de code <= 32 aux deux bouts */
    var trimJava = function (s) {
        var d = 0, f = s.length;
        while (d < f && s.charCodeAt(d) <= 32) {
            d++;
        }
        while (f > d && s.charCodeAt(f - 1) <= 32) {
            f--;
        }
        return s.substring(d, f);
    };
    var rejet = function (motif) {
        return {valide: false, local: '', international: '', motif: motif};
    };
    var T = {
        indicatif: CI,

        lireIndicatif: function (valeur) {
            var n = String(valeur === null || valeur === undefined ? '' : valeur).replace(/[ \t\n\x0B\f\r+]/g, '');
            if (n.indexOf('00') === 0) {
                n = n.substring(2);
            }
            return /^[1-9][0-9]{0,2}$/.test(n) ? n : CI;
        },

        aide: function (pays) {
            var p = pays || T.indicatif;
            return (p === CI ? 'Un numéro ivoirien compte dix chiffres et commence par 01, 05 ou 07 ; un' : 'Un')
                    + ' numéro étranger s\'écrit avec son indicatif, par exemple +33 6 12 34 56 78.';
        },

        controler: function (saisie, pays) {
            var p = pays || T.indicatif;
            if (saisie === null || saisie === undefined || trimJava(String(saisie)) === '') {
                return rejet('Numéro absent');
            }
            var nettoye = trimJava(String(saisie)).replace(/[ \t\n\x0B\f\r.\-()]/g, '');
            var plus = nettoye.charAt(0) === '+';
            if (plus) {
                nettoye = nettoye.substring(1);
            }
            if (!/^[0-9]+$/.test(nettoye)) {
                return rejet('Caractères non numériques');
            }
            /* « + » ou « 00 » puis un indicatif (jamais 0) ; « +07 08... » reste un numero du pays, comme avant */
            var chiffres = !plus && nettoye.indexOf('00') === 0 ? nettoye.substring(2) : nettoye;
            var avecIndicatif = (plus || nettoye.indexOf('00') === 0) && chiffres.charAt(0) !== '0';
            if (avecIndicatif && chiffres.indexOf(p) !== 0) {
                if (chiffres.length < 8 || chiffres.length > 15) {
                    return rejet('Numéro étranger : nombre de chiffres incorrect (' + chiffres.length + ')');
                }
                return {valide: true, local: '+' + chiffres, international: chiffres, motif: ''};
            }
            if (p !== CI) {
                var national = avecIndicatif ? chiffres.substring(p.length) : chiffres;
                var utile = national.charAt(0) === '0' ? national.substring(1) : national;
                if (utile.length < 6 || utile.length > 12) {
                    return rejet('Nombre de chiffres incorrect (' + national.length + ')');
                }
                return {valide: true, local: avecIndicatif ? '+' + chiffres : national, international: p + utile, motif: ''};
            }
            if (nettoye.indexOf('00' + CI) === 0) {
                nettoye = nettoye.substring(5);
            } else if (nettoye.indexOf(CI) === 0 && nettoye.length === 13) {
                nettoye = nettoye.substring(3);
            }
            if (nettoye.length === 8) {
                return rejet('Ancien format à 8 chiffres');
            }
            if (nettoye.length !== 10) {
                return rejet('Nombre de chiffres incorrect (' + nettoye.length + ')');
            }
            var prefixe = nettoye.substring(0, 2);
            if (prefixe === '21' || prefixe === '25' || prefixe === '27') {
                return rejet('Numéro fixe (non mobile)');
            }
            if (prefixe !== '01' && prefixe !== '05' && prefixe !== '07') {
                return rejet('Préfixe non mobile (' + prefixe + ')');
            }
            return {valide: true, local: nettoye, international: CI + nettoye, motif: ''};
        },

        /** Validateur d'un champ Ext : vrai si vide (allowBlank decide) ou valide, sinon le message affiche. */
        validateur: function (v) {
            if (!v || trimJava(String(v)) === '') {
                return true;
            }
            var r = T.controler(v);
            return r.valide ? true : 'Numéro invalide : ' + r.motif + '. ' + T.aide();
        }
    };
    if (typeof Ext !== 'undefined' && Ext.define) {
        Ext.define('testextjs.view.commun.TelephoneSaisie', {
            singleton: true,
            controler: T.controler,
            aide: function (pays) {
                return T.aide(pays);
            },
            validateur: T.validateur,
            indicatif: function () {
                return T.indicatif;
            },
            constructor: function () {
                /* indicatif du pays de l'officine, une fois ; 225 en attendant (ou si la lecture echoue) */
                if (Ext.Ajax) {
                    Ext.Ajax.request({url: '../api/v1/client-telephone/pays', method: 'GET', success: function (r) {
                            var o = Ext.JSON.decode(r.responseText, true) || {};
                            if (o.success) {
                                T.indicatif = T.lireIndicatif(o.indicatif);
                            }
                        }});
                }
            }
        });
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = T;
    }
}());
