/*
 * EXPERIENCE UTILISATEUR (RUM, retour du 14/10) : ce que vit la personne a la caisse, mesure dans son navigateur.
 *  - API : duree de chaque appel au serveur (XMLHttpRequest, donc Ext.Ajax et les magasins, et fetch), echecs ;
 *  - ECRAN : temps entre le clic sur un menu et l'ecran pret (affiche ET ses appels termines) ;
 *  - ERREUR : erreurs JavaScript (le message seul, nettoye) ;
 *  - PAGE : chargement de l'application.
 * Les mesures sont regroupees par minute dans le navigateur et envoyees par lots toutes les 60 s (et a la fermeture)
 * a v1/support/rum. Aucun contenu, aucun parametre d'appel, aucune donnee de patient ou de vente n'est envoye : le
 * serveur ne garde qu'une cle normalisee (ecran, ou methode + chemin sans identifiants). Le serveur peut arreter
 * l'envoi (parametre SUPPORT_RUM_ACTIF).
 */
(function () {
    'use strict';
    if (window.PrestigeRum) {
        return;
    }
    var URL_ENVOI = '../api/v1/support/rum';
    var lots = {}, enCours = 0, actif = true;

    function minute() {
        return Math.floor(Date.now() / 60000) * 60000;
    }

    function ajouter(type, cle, ms, echec, methode) {
        if (!actif || !cle) {
            return;
        }
        var m = minute(), k = m + '|' + type + '|' + (methode || '') + '|' + cle, l = lots[k];
        if (!l) {
            l = lots[k] = {minute: m, type: type, cle: String(cle).substring(0, 300), methode: methode || '', nombre: 0, totalMs: 0, maxMs: 0, echecs: 0};
        }
        ms = Math.max(0, Math.round(ms || 0));
        l.nombre++;
        l.totalMs += ms;
        l.maxMs = Math.max(l.maxMs, ms);
        l.echecs += echec ? 1 : 0;
    }

    function exclu(url) {
        return !url || String(url).indexOf('support/rum') >= 0;
    }

    /* --- appels : XMLHttpRequest (Ext.Ajax, magasins, envois de fichiers) */
    var ouvrir = XMLHttpRequest.prototype.open, envoyer = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (methode, url) {
        this.__rum = {methode: methode, url: url};
        return ouvrir.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
        var x = this, r = x.__rum;
        if (r && !exclu(r.url)) {
            var debut = Date.now(), fini = false;
            enCours++;
            var terminer = function () {
                if (fini) {
                    return;
                }
                fini = true;
                enCours = Math.max(0, enCours - 1);
                ajouter('API', r.url, Date.now() - debut, !(x.status >= 200 && x.status < 400), r.methode);
            };
            x.addEventListener('loadend', terminer);
        }
        return envoyer.apply(this, arguments);
    };

    /* --- appels : fetch (ecrans recents) */
    if (window.fetch) {
        var fetchOrigine = window.fetch;
        window.fetch = function (entree, options) {
            var url = typeof entree === 'string' ? entree : (entree && entree.url), methode = (options && options.method) || (entree && entree.method) || 'GET';
            if (exclu(url)) {
                return fetchOrigine.apply(this, arguments);
            }
            var debut = Date.now();
            enCours++;
            return fetchOrigine.apply(this, arguments).then(function (rep) {
                enCours = Math.max(0, enCours - 1);
                ajouter('API', url, Date.now() - debut, !rep.ok, methode);
                return rep;
            }, function (e) {
                enCours = Math.max(0, enCours - 1);
                ajouter('API', url, Date.now() - debut, true, methode);
                throw e;
            });
        };
    }

    /* --- erreurs JavaScript (sans remplacer le collecteur du Centre de support) */
    window.addEventListener('error', function (e) {
        ajouter('ERREUR', String((e && e.message) || 'Erreur').replace(/[^A-Za-z0-9_. -]/g, ' ').substring(0, 100), 0, true);
    });
    window.addEventListener('unhandledrejection', function () {
        ajouter('ERREUR', 'Promesse rejetee', 0, true);
    });

    /* --- chargement de l'application */
    window.addEventListener('load', function () {
        setTimeout(function () {
            var t = window.performance && performance.timing;
            if (t && t.loadEventEnd > 0 && t.navigationStart > 0) {
                ajouter('PAGE', 'chargement', t.loadEventEnd - t.navigationStart, false);
            }
        }, 0);
    });

    /* --- ouverture d'un ecran : du clic jusqu'a l'ecran rendu et ses appels termines (calme 400 ms, 60 s au plus) */
    var ecran = null;
    function debutEcran(xtype) {
        ecran = {xtype: xtype, debut: Date.now()};
    }
    function finEcranQuandCalme(xtype) {
        var e = ecran;
        if (!e || e.xtype !== xtype) {
            return;
        }
        var calmeDepuis = null;
        var minuteur = setInterval(function () {
            if (ecran !== e) {
                clearInterval(minuteur);
                return;
            }
            var maintenant = Date.now();
            if (enCours === 0) {
                calmeDepuis = calmeDepuis || maintenant;
            } else {
                calmeDepuis = null;
            }
            if ((calmeDepuis && maintenant - calmeDepuis >= 400) || maintenant - e.debut > 60000) {
                clearInterval(minuteur);
                ecran = null;
                ajouter('ECRAN', xtype, (calmeDepuis || maintenant) - e.debut, maintenant - e.debut > 60000);
            }
        }, 100);
    }

    /* --- envoi */
    function lot() {
        var a = [], k, m = minute();
        for (k in lots) {
            if (lots.hasOwnProperty(k)) {
                a.push(lots[k]);
            }
        }
        lots = {};
        return a;
    }
    function envoyerLots(fermeture) {
        var a = lot();
        if (!a.length || !actif) {
            return;
        }
        var corps = JSON.stringify({lots: a});
        if (fermeture && navigator.sendBeacon) {
            navigator.sendBeacon(URL_ENVOI, new Blob([corps], {type: 'application/json'}));
            return;
        }
        try {
            fetchOrigineOuXhr(corps);
        } catch (e) {
            /* une mesure perdue ne doit jamais gener la caisse */
        }
    }
    function fetchOrigineOuXhr(corps) {
        var x = new XMLHttpRequest();
        ouvrir.call(x, 'POST', URL_ENVOI);
        x.setRequestHeader('Content-Type', 'application/json');
        x.onload = function () {
            try {
                var o = JSON.parse(x.responseText);
                if (o && o.actif === false) {
                    actif = false;
                }
            } catch (e) {
                /* sans importance */
            }
        };
        envoyer.call(x, corps);
    }
    setInterval(function () {
        envoyerLots(false);
    }, 60000);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            envoyerLots(true);
        }
    });

    window.PrestigeRum = {debutEcran: debutEcran, finEcranQuandCalme: finEcranQuandCalme, envoyer: envoyerLots,
        /* pour les tests : nombre d'appels en cours et lots en attente */
        etat: function () {
            return {enCours: enCours, lots: Object.keys(lots).length, actif: actif};
        }};
})();
