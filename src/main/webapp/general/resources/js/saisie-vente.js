/*
 * VENTES EN SAISIE (cahier des charges du 24/11, point 2), commun à la vente et à la vente en dépôt.
 *
 * - Signal : toutes les 30 s, l'écran qui tient une vente le dit au serveur. Sans signal depuis 2 min (poste éteint,
 *   réseau coupé, session expirée), le serveur marque la saisie « interrompue ».
 * - Sortie : changement de menu, autre vente chargée, fermeture du navigateur -> la saisie est déclarée interrompue
 *   (navigator.sendBeacon, qui part même quand la page se ferme), sauf si un geste l'a déjà réglée (mise en attente,
 *   suppression, clôture : le serveur ignore alors la déclaration).
 * - Retour (retours du 25/11) : fenêtre HTML à deux choix, « Mettre en attente et quitter » ou « Abandonner la
 *   vente » (abandon tracé, produits retirés, nouvelle saisie), et « Rester ». Un clic suffit. Même fenêtre en quittant
 *   l'écran (menu, en-tête) et, en trois choix, au rappel d'une autre vente en attente.
 * - Bandeau « Saisie interrompue » de l'auteur : 30 s pour la reprendre, sinon elle est abandonnée (tracé au journal,
 *   produits retirés) et la suivante est proposée. L'écran d'administration ne supprime jamais rien.
 * - Les droits et les états sont décidés par le serveur ; l'écran ne fait qu'afficher ses réponses.
 */
(function () {
    'use strict';

    var API = '../api/v1/vente-saisie/';
    var SIGNAL_MS = 30000;
    /* décompte du bandeau « Saisie interrompue » (retours du 25/11, 1.2) */
    var DECOMPTE_S = 30;
    var bandeauReprise = null; // écran dont le bandeau propose une reprise (retiré quand l'écran se ferme)
    var ecrans = {};          // nom -> {fn, courant, dernierSignal}
    var regles = {};          // vente id -> true quand un geste l'a réglée (pas de déclaration d'interruption)

    var decompte = null;      // minuteur du décompte du bandeau « Saisie interrompue »

    function bandeau(msg, action) {
        var b = document.getElementById('psv-bandeau');
        if (decompte) {
            clearInterval(decompte);
            decompte = null;
        }
        bandeauReprise = null;
        if (!msg) {
            if (b) {
                /* vidé aussi : un décompte masqué ne doit pas rester dans la page avec sa dernière valeur */
                b.style.display = 'none';
                b.textContent = '';
            }
            return;
        }
        if (!b) {
            b = document.createElement('div');
            b.id = 'psv-bandeau';
            b.setAttribute('role', 'status');
            b.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:2147482000;'
                + 'background:#fff4e5;color:#7a3e00;border:1px solid #f0a040;border-top:0;border-radius:0 0 6px 6px;'
                + 'padding:6px 14px;font:600 13px/1.4 Segoe UI,Arial,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.15)';
            document.body.appendChild(b);
        }
        b.textContent = msg;
        if (action) {
            /* bouton dans le bandeau : la confirmation se fait dans le bouton (second clic) */
            var bt = document.createElement('button');
            bt.type = 'button';
            bt.id = 'psv-action';
            bt.textContent = action.texte;
            bt.style.cssText = 'margin-left:12px;font:inherit;padding:2px 10px;cursor:pointer';
            bt.addEventListener('click', function () {
                /* l'utilisateur s'en occupe : le décompte s'arrête */
                if (decompte) {
                    clearInterval(decompte);
                    decompte = null;
                    var dc = document.getElementById('psv-decompte');
                    if (dc) {
                        dc.parentNode.removeChild(dc);
                    }
                }
                if (!bt.psvArme) {
                    bt.psvArme = true;
                    bt.textContent = action.confirmer;
                    bt.className = 'psv-arme';
                    return;
                }
                bt.disabled = true;
                action.faire();
            });
            b.appendChild(bt);
            if (action.secondes > 0 && action.finDecompte) {
                /* retours du 25/11 (1.2) : sans reprise au bout du décompte, la vente est abandonnée */
                var reste = action.secondes, sp = document.createElement('span');
                sp.id = 'psv-decompte';
                sp.style.cssText = 'margin-left:10px;font-weight:400';
                var ecrire = function () {
                    sp.textContent = 'Abandon automatique dans ' + reste + ' s';
                };
                ecrire();
                b.appendChild(sp);
                decompte = setInterval(function () {
                    reste -= 1;
                    if (reste > 0) {
                        ecrire();
                        return;
                    }
                    clearInterval(decompte);
                    decompte = null;
                    bt.disabled = true;
                    sp.textContent = 'Abandon en cours…';
                    action.finDecompte();
                }, 1000);
            }
        }
        b.style.display = 'block';
    }

    /* saisies interrompues de l'utilisateur lui-même, aujourd'hui : proposées à l'ouverture de l'écran de vente */
    function proposerReprise(e) {
        Ext.Ajax.request({
            method: 'GET',
            url: API + 'en-cours',
            success: function (r) {
                /* seulement les saisies de CET écran (vente de l'officine ou vente en dépôt, et le même dépôt) */
                var d = decoder(r), miennes = (d.data || []).filter(function (x) {
                    return x.etat === 'INTERROMPUE' && x.auteur && x.reprenable && (x.ecran || 'vente') === e.nom
                            && (!e.accepte || e.accepte(x));
                });
                if (!miennes.length || e.courant || !e.ouvrir) {
                    return;
                }
                var v = miennes[miennes.length - 1];
                bandeau((miennes.length > 1 ? miennes.length + ' saisies interrompues aujourd\u2019hui. ' : '')
                        + 'Saisie interrompue : vente ' + v.numero + ' (' + v.lignes + ' ligne(s)).', {
                    texte: 'Reprendre la vente interrompue',
                    confirmer: 'Confirmer la reprise ?',
                    /* retours du 25/11 (1.2) : 30 s pour la rappeler ; sinon abandon (tracé), produits retirés, et la
                     * saisie interrompue suivante est proposée. Sans produit : aucun décompte. */
                    secondes: v.lignes > 0 ? DECOMPTE_S : 0,
                    finDecompte: function () {
                        poster(encodeURIComponent(v.id) + '/abandonner-interrompue', function () {
                            Ext.Ajax.request({
                                method: 'POST',
                                url: '../api/v1/ventestats/remove/' + encodeURIComponent(v.id),
                                callback: function () {
                                    bandeau(null);
                                    proposerReprise(e);
                                }
                            });
                        }, function (x) {
                            /* déjà reprise ou réglée ailleurs (autre onglet) : le motif du serveur est affiché */
                            bandeau(x.msg || 'Abandon refusé.');
                        });
                    },
                    faire: function () {
                        poster(encodeURIComponent(v.id) + '/reprendre', function () {
                            bandeau(null);
                            e.ouvrir(v.id);
                        }, function (x) {
                            bandeau(x.msg || 'Reprise refusée.');
                        });
                    }
                });
                bandeauReprise = e.nom;
            },
            failure: Ext.emptyFn
        });
    }

    function decoder(r) {
        try {
            return JSON.parse(r.responseText || '{}') || {};
        } catch (e) {
            return {};
        }
    }

    function poster(chemin, ok, ko) {
        Ext.Ajax.request({
            method: 'POST',
            url: API + chemin,
            success: function (r) {
                var d = decoder(r);
                (d.success ? ok : ko || Ext.emptyFn)(d);
            },
            failure: function (r) {
                var d = decoder(r);
                (ko || Ext.emptyFn)(d.msg ? d : {success: false, msg: 'Serveur injoignable : réessayez.'});
            }
        });
    }

    function declarerInterruption(id, cause) {
        if (!id || regles[id]) {
            return;
        }
        var url = API + encodeURIComponent(id) + '/interrompre?cause=' + cause;
        try {
            if (navigator.sendBeacon && navigator.sendBeacon(url, '')) {
                return;
            }
        } catch (e) {
            /* repli ci-dessous */
        }
        Ext.Ajax.request({method: 'POST', url: url, failure: Ext.emptyFn});
    }

    function signaler(e, id, premier) {
        e.dernierSignal = Date.now();
        poster(encodeURIComponent(id) + '/signal', function () {
            bandeau(null);
            /* retour du 25/11, point 4 : premier signal admis d'une vente ouverte -> l'écran relit ce qui en dépend
             * (nombre de ventes en attente du bouton : la vente rappelée n'est plus « en attente » en base) */
            if (premier && e.surPrise && e.courant === id) {
                try {
                    e.surPrise(id);
                } catch (x) {
                    /* sans effet sur la saisie */
                }
            }
        }, function (d) {
            if (!d.libre && d.msg && e.courant === id) {
                bandeau(d.msg);
            }
        });
    }

    function tic() {
        Object.keys(ecrans).forEach(function (nom) {
            var e = ecrans[nom], id = null;
            try {
                id = e.fn() || null;
            } catch (x) {
                id = null;
            }
            /* « ouvert » vaut l'état de l'écran (vrai, ou le dépôt choisi) : à chaque ouverture, ou changement de
             * dépôt, les saisies interrompues de l'utilisateur sur cet écran lui sont proposées */
            var ouvert = '';
            try {
                ouvert = e.ecranOuvert ? e.ecranOuvert() : '';
                ouvert = ouvert ? String(ouvert) : '';
            } catch (x) {
                ouvert = '';
            }
            if (ouvert && ouvert !== e.ouvertAvant && !id) {
                proposerReprise(e);
            }
            /* écran fermé (autre menu, autre dépôt) : sa proposition de reprise et son décompte s'arrêtent ; la vente
             * reste interrompue et sera reproposée, avec un nouveau décompte, à la prochaine ouverture */
            if (bandeauReprise === nom && ouvert !== e.ouvertAvant) {
                bandeau(null);
            }
            e.ouvertAvant = ouvert;
            if (id !== e.courant) {
                if (e.courant) {
                    declarerInterruption(e.courant, id ? 'ECRAN_QUITTE' : 'MENU');
                }
                e.courant = id;
                bandeau(null);
                if (id) {
                    delete regles[id];
                    signaler(e, id, true);
                }
                return;
            }
            if (id && Date.now() - e.dernierSignal >= SIGNAL_MS) {
                signaler(e, id);
            }
        });
    }

    window.addEventListener('pagehide', function () {
        Object.keys(ecrans).forEach(function (nom) {
            declarerInterruption(ecrans[nom].courant, 'FERMETURE');
        });
    });

    var minuteur = null;

    (function () {
        var s = document.createElement('style');
        s.textContent = '.psv-arme,.psv-arme .x-btn-inner{background:#c62828 !important;color:#fff !important}';
        (document.head || document.documentElement).appendChild(s);
    }());

    /*
     * Fenêtre de sortie d'une vente (retours du 25/11, exception voulue à « aucune fenêtre surgissante ») : vraie
     * fenêtre HTML, pas une fenêtre ExtJS. Un clic suffit. Échap, la croix ou le fond : « rester ». Tant qu'elle est
     * ouverte, les raccourcis de l'écran de vente ne reçoivent rien.
     *   o = {titre, texte, choix: [{id, texte, style: 'principal'|'danger'|'neutre', occupe, faire(fin)}], rester}
     *   faire(fin) : fin() ferme la fenêtre ; fin(msg) la ferme et affiche msg dans le bandeau.
     */
    var fenetreOuverte = null;

    function choisir(o) {
        if (fenetreOuverte) {
            fenetreOuverte.fermer();
        }
        var fond = document.createElement('div'), boite = document.createElement('div'), boutons = [];
        fond.id = 'psv-fenetre';
        fond.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483000;background:rgba(20,30,40,.45);display:flex;'
            + 'align-items:center;justify-content:center;font:14px/1.45 Segoe UI,Arial,sans-serif';
        boite.setAttribute('role', 'dialog');
        boite.setAttribute('aria-modal', 'true');
        boite.setAttribute('aria-labelledby', 'psv-fenetre-titre');
        boite.style.cssText = 'background:#fff;color:#1d2733;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.3);'
            + 'width:440px;max-width:92vw;padding:18px 20px 16px;position:relative';
        var croix = document.createElement('button');
        croix.type = 'button';
        croix.id = 'psv-fenetre-fermer';
        croix.setAttribute('aria-label', 'Rester sur la vente');
        croix.textContent = '×';
        croix.style.cssText = 'position:absolute;top:6px;right:10px;border:0;background:none;font-size:22px;'
            + 'line-height:1;cursor:pointer;color:#667';
        var titre = document.createElement('div');
        titre.id = 'psv-fenetre-titre';
        titre.textContent = o.titre;
        titre.style.cssText = 'font-weight:700;font-size:16px;margin:0 24px 8px 0';
        var texte = document.createElement('div');
        texte.id = 'psv-fenetre-texte';
        texte.textContent = o.texte || '';
        texte.style.cssText = 'margin-bottom:14px;color:#3a4654';
        boite.appendChild(croix);
        boite.appendChild(titre);
        boite.appendChild(texte);
        var couleurs = {
            principal: 'background:#1565c0;color:#fff;border:1px solid #1565c0',
            danger: 'background:#fff;color:#b71c1c;border:1px solid #c62828',
            neutre: 'background:#fff;color:#1d2733;border:1px solid #9aa5b1'
        };
        o.choix.forEach(function (c) {
            var b = document.createElement('button');
            b.type = 'button';
            b.id = 'psv-choix-' + c.id;
            b.textContent = c.texte;
            b.style.cssText = 'display:block;width:100%;margin-top:8px;padding:9px 12px;border-radius:5px;'
                + 'font:600 14px Segoe UI,Arial,sans-serif;cursor:pointer;text-align:center;'
                + (couleurs[c.style] || couleurs.neutre);
            b.addEventListener('click', function () {
                if (b.disabled) {
                    return;
                }
                if (!c.faire) {
                    fermer();
                    return;
                }
                boutons.forEach(function (x) {
                    x.disabled = true;
                    x.style.opacity = x === b ? '1' : '.5';
                });
                croix.disabled = true;
                if (c.occupe) {
                    b.textContent = c.occupe;
                }
                c.faire(function (msg) {
                    fermer(true);
                    if (msg) {
                        bandeau(msg);
                    }
                });
            });
            boutons.push(b);
            boite.appendChild(b);
        });
        fond.appendChild(boite);

        function occupee() {
            return croix.disabled;
        }

        function clavier(ev) {
            if (!boite.contains(ev.target) || ev.key === 'Escape' || ev.key === 'Tab') {
                ev.preventDefault();
            }
            ev.stopPropagation();
            if (ev.key === 'Escape' && !occupee()) {
                fermer();
                return;
            }
            if (ev.key === 'Tab') {
                var actifs = [croix].concat(boutons).filter(function (x) {
                    return !x.disabled;
                });
                if (!actifs.length) {
                    return;
                }
                var i = actifs.indexOf(document.activeElement);
                i = ev.shiftKey ? (i <= 0 ? actifs.length - 1 : i - 1) : (i + 1) % actifs.length;
                actifs[i].focus();
            }
        }

        function fermer(apresChoix) {
            window.removeEventListener('keydown', clavier, true);
            window.removeEventListener('keyup', bloquer, true);
            window.removeEventListener('keypress', bloquer, true);
            if (fond.parentNode) {
                fond.parentNode.removeChild(fond);
            }
            if (fenetreOuverte && fenetreOuverte.fond === fond) {
                fenetreOuverte = null;
            }
            if (!apresChoix && o.rester) {
                o.rester();
            }
        }

        function bloquer(ev) {
            ev.stopPropagation();
        }

        croix.addEventListener('click', function () {
            if (!occupee()) {
                fermer();
            }
        });
        fond.addEventListener('mousedown', function (ev) {
            if (ev.target === fond && !occupee()) {
                fermer();
            }
        });
        window.addEventListener('keydown', clavier, true);
        window.addEventListener('keyup', bloquer, true);
        window.addEventListener('keypress', bloquer, true);
        document.body.appendChild(fond);
        fenetreOuverte = {fond: fond, fermer: fermer};
        setTimeout(function () {
            if (boutons[0]) {
                boutons[0].focus();
            }
        }, 0);
        return fermer;
    }

    /*
     * Retour sur une vente en saisie (retours du 25/11, point 1.1) : « Mettre en attente et quitter », « Abandonner la
     * vente » (abandon tracé au journal, produits retirés, l'écran repart sur une nouvelle saisie), « Rester ».
     * actions = {attente(ok, ko), abandonner(ok, ko)} ; ko(msg).
     */
    function fenetreRetour(btn, actions) {
        return choisir({
            titre: 'Quitter la vente en cours ?',
            texte: 'Cette vente contient des produits. Que voulez-vous en faire ?',
            choix: [{
                id: 'attente', texte: 'Mettre en attente et quitter', style: 'principal', occupe: 'Mise en attente…',
                faire: function (fin) {
                    actions.attente(function () {
                        fin();
                    }, fin);
                }
            }, {
                id: 'abandonner', texte: 'Abandonner la vente', style: 'danger', occupe: 'Abandon…',
                faire: function (fin) {
                    actions.abandonner(function () {
                        fin();
                    }, fin);
                }
            }, {
                id: 'rester', texte: 'Rester sur la vente', style: 'neutre'
            }]
        });
    }

    /*
     * Rappel d'une autre vente en attente alors que la vente ouverte a des produits (retours du 25/11, point 1.6) :
     * « Mettre la vente actuelle en attente et rappeler l'autre », « Supprimer la vente actuelle et rappeler l'autre »
     * (abandon tracé, produits retirés), « Annuler ». actions = {attente(ok, ko), abandonner(ok, ko)}.
     */
    function fenetreRappel(actions) {
        return choisir({
            titre: 'Rappeler une autre vente ?',
            texte: 'La vente ouverte contient des produits. Que voulez-vous en faire avant de rappeler l’autre vente ?',
            choix: [{
                id: 'attente', texte: 'Mettre la vente actuelle en attente et rappeler l’autre', style: 'principal',
                occupe: 'Mise en attente…',
                faire: function (fin) {
                    actions.attente(function () {
                        fin();
                    }, fin);
                }
            }, {
                id: 'abandonner', texte: 'Supprimer la vente actuelle et rappeler l’autre', style: 'danger',
                occupe: 'Suppression…',
                faire: function (fin) {
                    actions.abandonner(function () {
                        fin();
                    }, fin);
                }
            }, {
                id: 'rester', texte: 'Annuler', style: 'neutre'
            }]
        });
    }

    /*
     * Garde de sortie (retours du 25/11, point 1.3) : menu, boutons de l'en-tête (menu principal, accueil, mon compte,
     * Metro). Chaque écran de vente déclare sortie(continuer) : null si rien n'est en cours (aucun produit, pas de
     * client à crédit), sinon {actions: {attente?, abandonner}} ; attente et abandon appellent continuer une fois faits.
     */
    var gardes = {}, passer = false;

    function retenir(cible, continuer, rester) {
        if (passer || fenetreOuverte) {
            return !!fenetreOuverte && !passer;
        }
        var poursuivre = function () {
            passer = true;
            try {
                continuer();
            } finally {
                passer = false;
            }
        };
        var s = null;
        Object.keys(gardes).some(function (nom) {
            var g = gardes[nom];
            if (g.xtypes.indexOf(cible) >= 0) {
                return false;
            }
            try {
                s = g.sortie(poursuivre);
            } catch (x) {
                s = null;
            }
            return !!s;
        });
        if (!s) {
            return false;
        }
        var choix = [];
        if (s.actions.attente) {
            choix.push({
                id: 'attente', texte: 'Mettre en attente et quitter', style: 'principal', occupe: 'Mise en attente…',
                faire: function (fin) {
                    s.actions.attente(function () {
                        fin();
                    }, fin);
                }
            });
        }
        choix.push({
            id: 'abandonner', texte: 'Abandonner la vente', style: 'danger', occupe: 'Abandon…',
            faire: function (fin) {
                s.actions.abandonner(function () {
                    fin();
                }, fin);
            }
        }, {id: 'rester', texte: 'Rester sur la vente', style: 'neutre'});
        choisir({
            titre: 'Quitter la vente en cours ?',
            texte: s.actions.attente ? 'Cette vente n’est pas terminée. Que voulez-vous en faire ?'
                : 'Un client à crédit est choisi sur cette vente. Voulez-vous l’abandonner ?',
            choix: choix,
            rester: rester
        });
        return true;
    }

    window.PrestigeSaisieVente = {
        /** Écran de vente : xtypes vers lesquels on reste sur l'écran (pas de garde), sortie(continuer). */
        garder: function (nom, xtypes, sortie) {
            gardes[nom] = {xtypes: xtypes, sortie: sortie};
        },
        /** Navigation : true si une vente en cours retient l'utilisateur (la fenêtre de choix est ouverte). */
        retenir: retenir,
        /** Écran qui tient des ventes : fn rend l'identifiant de la vente ouverte, ou null si l'écran est fermé. */
        suivre: function (nom, fn, ecranOuvert, ouvrir, accepte) {
            ecrans[nom] = {nom: nom, fn: fn, courant: null, dernierSignal: 0, ecranOuvert: ecranOuvert, ouvrir: ouvrir,
                accepte: accepte, ouvertAvant: ''};
            if (!minuteur) {
                minuteur = setInterval(tic, 2000);
            }
        },
        /** Retour du 25/11, point 4 : fn(id) appelée au premier signal admis d'une vente ouverte sur l'écran nom. */
        surPrise: function (nom, fn) {
            if (ecrans[nom]) {
                ecrans[nom].surPrise = fn;
            }
        },
        /** La vente a été réglée par un geste (attente, suppression, clôture) : pas de déclaration d'interruption. */
        regler: function (id) {
            if (id) {
                regles[id] = true;
            }
        },
        attente: function (id, ok, ko) {
            regles[id] = true;
            poster(encodeURIComponent(id) + '/attente', ok, function (d) {
                delete regles[id];
                ko(d.msg || 'Mise en attente refusée.');
            });
        },
        supprimer: function (id, ok, ko) {
            regles[id] = true;
            poster(encodeURIComponent(id) + '/retour-supprimer', ok, function (d) {
                delete regles[id];
                ko(d.msg || 'Suppression refusée.');
            });
        },
        /** Rappel d'une vente en attente : droit et état vérifiés au serveur avant d'ouvrir la vente. */
        rappeler: function (id, ok, ko) {
            Ext.Ajax.request({
                method: 'POST',
                url: '../api/v1/vente/rappel/' + encodeURIComponent(id),
                success: function (r) {
                    var d = decoder(r);
                    if (d.success) {
                        ok(d);
                    } else {
                        ko(d.msg || 'Rappel refusé.');
                    }
                },
                failure: function (r) {
                    var d = decoder(r);
                    ko(d.msg || 'Serveur injoignable : réessayez.');
                }
            });
        },
        choixRetour: fenetreRetour,
        choixRappel: fenetreRappel,
        choisir: choisir,
        bandeau: bandeau
    };
}());
