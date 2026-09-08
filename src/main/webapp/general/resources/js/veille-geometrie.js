/* global Ext */

/*
 * Veille de geometrie du panneau central (retour du 08/09).
 *
 * Symptome rapporte sur un portable 15 pouces : l'ecran ouvert depuis le menu se « rabat » sur la
 * droite - il occupe ~1 500 px dans un panneau qui en fait ~1 800, une bande vide reste a droite -
 * et se retracte a nouveau apres l'ajout d'un produit a la vente. Le support n'a rien capture. Sur
 * le banc, ni le repli du menu de navigation, ni le redimensionnement de la fenetre, ni le zoom,
 * ni l'ajout d'un produit ne l'ont reproduit.
 *
 * Deux choses sont donc faites ici, en attendant la sequence exacte :
 *
 *   1. SE RECALER. Les ecrans du menu sont dimensionnes en pourcentage de leur conteneur
 *      (width: '97%' / '99%'). Des que ce conteneur change de taille - repli ou depli du menu de
 *      navigation, redimensionnement de la fenetre, apparition d'un ascenseur - on relance la mise
 *      en page de l'ecran affiche, et on verifie APRES COUP que sa largeur suit bien celle du
 *      conteneur. Si elle ne suit pas, on la remet d'equerre.
 *
 *   2. TRACER. Chaque ecart constate est journalise (console et window.PrestigeGeometrie.journal),
 *      avec la largeur du conteneur, celle de l'ecran, l'etat du menu de navigation et ce qui a
 *      declenche la mesure : c'est ce qui manque pour comprendre, et ce que le support pourra
 *      enfin capturer (F12, onglet Console, lignes « [GEOMETRIE] »).
 */
(function () {
    'use strict';

    var journal = [];
    var TOLERANCE = 0.9;   // en dessous de 90 % de la largeur disponible, l'ecran est « rabattu »

    function ecranAffiche(contentPanel) {
        var items = contentPanel && contentPanel.items ? contentPanel.items.items : [];
        for (var i = 0; i < items.length; i++) {
            if (items[i] && items[i].rendered && !items[i].floating && items[i].isVisible()) {
                return items[i];
            }
        }
        return null;
    }

    function mesurer(contentPanel, declencheur) {
        var ecran = ecranAffiche(contentPanel);
        if (!ecran || !contentPanel.body) {
            return null;
        }
        var nav = Ext.ComponentQuery.query('navigation')[0];
        var disponible = contentPanel.body.getWidth(true);
        var largeur = ecran.getWidth();
        return {
            quand: new Date().toISOString(),
            declencheur: declencheur,
            ecran: ecran.xtype,
            largeurEcran: largeur,
            largeurDisponible: disponible,
            largeurConfig: ecran.width,
            fenetre: window.innerWidth + 'x' + window.innerHeight,
            navigation: nav ? (nav.collapsed ? 'repliee' : 'depliee') + ' (' + nav.getWidth() + 'px)' : '?',
            zoom: Math.round(window.devicePixelRatio * 100) + ' %',
            rabattu: disponible > 0 && largeur < disponible * TOLERANCE
        };
    }

    function tracer(mesure) {
        journal.push(mesure);
        if (journal.length > 50) {
            journal.shift();
        }
        if (window.console && console.warn) {
            console.warn('[GEOMETRIE] ecran rabattu : ' + JSON.stringify(mesure));
        }
    }

    function recaler(contentPanel, declencheur) {
        var ecran = ecranAffiche(contentPanel);
        if (!ecran) {
            return;
        }
        // Premiere passe : la mise en page normale, qui re-resout les largeurs en pourcentage.
        ecran.updateLayout();
        var mesure = mesurer(contentPanel, declencheur);
        if (mesure && mesure.rabattu) {
            tracer(mesure);
            /* Seconde passe : la mise en page n'a pas suivi. On force la largeur attendue a
               partir de la configuration en pourcentage, puis on relance la mise en page. */
            var pourcentage = typeof ecran.width === 'string' && /%$/.test(ecran.width)
                    ? parseFloat(ecran.width) / 100 : 0.99;
            ecran.setWidth(Math.floor(mesure.largeurDisponible * pourcentage));
            ecran.updateLayout();
            var apres = mesurer(contentPanel, declencheur + ' (apres recalage)');
            if (apres) {
                journal.push(apres);
            }
        }
    }

    function surveiller(contentPanel) {
        if (!contentPanel || contentPanel._veilleGeometrie) {
            return;
        }
        contentPanel._veilleGeometrie = true;
        var differe = Ext.Function.createBuffered(function (declencheur) {
            recaler(contentPanel, declencheur);
        }, 250);

        contentPanel.on('resize', function () {
            differe('conteneur redimensionne');
        });
        contentPanel.on('add', function () {
            // Apres l'ouverture d'un ecran : le temps que sa mise en page se pose.
            Ext.defer(function () {
                var m = mesurer(contentPanel, 'ouverture');
                if (m && m.rabattu) {
                    recaler(contentPanel, 'ouverture');
                }
            }, 600);
        });
        Ext.EventManager.onWindowResize(function () {
            differe('fenetre redimensionnee');
        });
        var nav = Ext.ComponentQuery.query('navigation')[0];
        if (nav) {
            nav.on('expand', function () {
                differe('navigation depliee');
            });
            nav.on('collapse', function () {
                differe('navigation repliee');
            });
        }
    }

    window.PrestigeGeometrie = {
        surveiller: surveiller,
        mesurer: function () {
            return mesurer(Ext.getCmp('content-panel'), 'demande');
        },
        recaler: function () {
            recaler(Ext.getCmp('content-panel'), 'demande');
        },
        journal: journal
    };
}());
