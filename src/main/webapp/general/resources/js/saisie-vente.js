/*
 * VENTES EN SAISIE (cahier des charges du 24/11, point 2), commun à la vente et à la vente en dépôt.
 *
 * - Signal : toutes les 30 s, l'écran qui tient une vente le dit au serveur. Sans signal depuis 2 min (poste éteint,
 *   réseau coupé, session expirée), le serveur marque la saisie « interrompue ».
 * - Sortie : changement de menu, autre vente chargée, fermeture du navigateur -> la saisie est déclarée interrompue
 *   (navigator.sendBeacon, qui part même quand la page se ferme), sauf si un geste l'a déjà réglée (mise en attente,
 *   suppression, clôture : le serveur ignore alors la déclaration).
 * - Retour : le choix se fait dans la barre de boutons (aucune fenêtre) : « Mettre en attente et quitter »,
 *   « Supprimer la vente » (qui se confirme dans le bouton lui-même), « Annuler ».
 * - Les droits et les états sont décidés par le serveur ; l'écran ne fait qu'afficher ses réponses.
 */
(function () {
    'use strict';

    var API = '../api/v1/vente-saisie/';
    var SIGNAL_MS = 30000;
    var ecrans = {};          // nom -> {fn, courant, dernierSignal}
    var regles = {};          // vente id -> true quand un geste l'a réglée (pas de déclaration d'interruption)

    function bandeau(msg, action) {
        var b = document.getElementById('psv-bandeau');
        if (!msg) {
            if (b) {
                b.style.display = 'none';
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
                    faire: function () {
                        poster(encodeURIComponent(v.id) + '/reprendre', function () {
                            bandeau(null);
                            e.ouvrir(v.id);
                        }, function (x) {
                            bandeau(x.msg || 'Reprise refusée.');
                        });
                    }
                });
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

    function signaler(e, id) {
        e.dernierSignal = Date.now();
        poster(encodeURIComponent(id) + '/signal', function () {
            bandeau(null);
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
            e.ouvertAvant = ouvert;
            if (id !== e.courant) {
                if (e.courant) {
                    declarerInterruption(e.courant, id ? 'ECRAN_QUITTE' : 'MENU');
                }
                e.courant = id;
                bandeau(null);
                if (id) {
                    delete regles[id];
                    signaler(e, id);
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

    function boutonsRetour(btn, actions) {
        var tb = btn.ownerCt, idx = tb.items.indexOf(btn), ajoutes = [];
        var attenteSupprimer = null;

        function fermer() {
            if (attenteSupprimer) {
                clearTimeout(attenteSupprimer);
            }
            Ext.Array.forEach(ajoutes, function (c) {
                tb.remove(c, true);
            });
            ajoutes = [];
            btn.show();
            btn.enable();
            Ext.getDoc().un('keydown', echap);
        }

        function echap(ev) {
            if (ev.getKey() === ev.ESC) {
                ev.stopEvent();
                fermer();
            }
        }

        function occupe(b, texte) {
            Ext.Array.forEach(ajoutes, function (c) {
                c.disable();
            });
            b.setText(texte);
        }

        var hauteur = btn.getHeight() || 38;
        var attente = {
            xtype: 'button', itemId: 'btnRetourAttente', text: 'METTRE EN ATTENTE ET QUITTER',
            cls: 'btn-primarya', height: hauteur,
            handler: function (b) {
                occupe(b, 'MISE EN ATTENTE…');
                actions.attente(function () {
                    fermer();
                }, function (msg) {
                    fermer();
                    bandeau(msg);
                });
            }
        };
        var supprimer = {
            xtype: 'button', itemId: 'btnRetourSupprimer', text: 'SUPPRIMER LA VENTE', cls: 'btn-secondary',
            height: hauteur,
            handler: function (b) {
                if (!b.psvArme) {
                    /* la confirmation se fait dans le bouton lui-même : second clic dans les 5 s */
                    b.psvArme = true;
                    b.setText('CONFIRMER LA SUPPRESSION');
                    b.addCls('psv-arme');
                    attenteSupprimer = setTimeout(function () {
                        if (!b.isDestroyed) {
                            b.psvArme = false;
                            b.setText('SUPPRIMER LA VENTE');
                            b.removeCls('psv-arme');
                        }
                    }, 5000);
                    return;
                }
                clearTimeout(attenteSupprimer);
                occupe(b, 'SUPPRESSION…');
                actions.supprimer(function () {
                    fermer();
                }, function (msg) {
                    fermer();
                    bandeau(msg);
                });
            }
        };
        var annuler = {
            xtype: 'button', itemId: 'btnRetourAnnuler', text: 'ANNULER', cls: 'btn-secondary', height: hauteur,
            handler: fermer
        };
        btn.hide();
        ajoutes = tb.insert(idx, [attente, supprimer, annuler]);
        Ext.getDoc().on('keydown', echap);
        ajoutes[0].focus(false, 50);
        return fermer;
    }

    window.PrestigeSaisieVente = {
        /** Écran qui tient des ventes : fn rend l'identifiant de la vente ouverte, ou null si l'écran est fermé. */
        suivre: function (nom, fn, ecranOuvert, ouvrir, accepte) {
            ecrans[nom] = {nom: nom, fn: fn, courant: null, dernierSignal: 0, ecranOuvert: ecranOuvert, ouvrir: ouvrir,
                accepte: accepte, ouvertAvant: ''};
            if (!minuteur) {
                minuteur = setInterval(tic, 2000);
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
        choixRetour: boutonsRetour,
        bandeau: bandeau
    };
}());
