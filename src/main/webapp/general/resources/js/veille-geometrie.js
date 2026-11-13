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
 *      navigation, redimensionnement de la fenetre, apparition d'un ascenseur - on purge d'abord
 *      les memoires de mise en page perimees (correctifs-affichage.js, section 5 : c'est la cause
 *      mesuree du rabattement), on relance la mise en page de l'ecran affiche, et on verifie
 *      APRES COUP que sa largeur suit bien celle du conteneur. Si elle ne suit toujours pas, on la
 *      remet d'equerre.
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
        /* Volet de navigation en train de glisser sur le contenu : aucune mise en page maintenant,
           elle rechargerait l'iframe du tableau de bord (retour du 09/09, point 3). */
        if (window.PrestigeAffichage && window.PrestigeAffichage.resynchroniserMiseEnPage
                && window.PrestigeAffichage.resynchroniserMiseEnPage.regionFlottante
                && window.PrestigeAffichage.resynchroniserMiseEnPage.regionFlottante()) {
            return;
        }
        /* Premiere passe : purger les memoires de mise en page (lastBox) qui contredisent la
           taille reelle des elements, du viewport jusqu'a l'ecran, puis relancer la mise en page.
           C'est LA cause mesuree du rabattement (cf. correctifs-affichage.js, section 5) : apres un
           agrandissement de la fenetre, le navigateur etire les elements mais ExtJS garde
           l'ancienne taille en memoire, et le premier geste la repose. Un simple updateLayout
           n'y change rien, ExtJS etant convaincu que rien n'a bouge. */
        if (window.PrestigeAffichage && window.PrestigeAffichage.resynchroniserMiseEnPage) {
            window.PrestigeAffichage.resynchroniserMiseEnPage();
        }
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

        /*
         * Demande du 13/11 (captures « Paramétrage général », « Ventes terminées », « Campagnes ») : l'ecran se
         * rabat encore, a ~85 % de la largeur, apres un geste ordinaire (recherche, rechargement d'une liste) et sans
         * aucun redimensionnement. Les controles ci-dessus ne le voyaient pas : ils ne mesurent qu'a l'ouverture d'un
         * ecran et quand un conteneur change de taille. On mesure donc aussi apres chaque echange avec le serveur
         * (c'est ce qui suit un geste) et au retour sur la fenetre. La mesure ne coute que quelques lectures de
         * largeur ; on ne recale QUE si l'ecran ou le panneau central est rabattu.
         */
        var apresGeste = Ext.Function.createBuffered(function (declencheur) {
            if (centreRabattu(contentPanel)) {
                recalerCentre(contentPanel, declencheur);
            }
            var m = mesurer(contentPanel, declencheur);
            if (m && m.rabattu) {
                // trace avant recalage : recaler() ne trace que si sa premiere passe ne suffit pas
                tracer(m);
                recaler(contentPanel, declencheur);
            }
        }, 400);
        if (Ext.Ajax && Ext.Ajax.on) {
            Ext.Ajax.on('requestcomplete', function () {
                apresGeste('apres un echange avec le serveur');
            });
        }
        window.addEventListener('focus', function () {
            apresGeste('retour sur la fenetre');
        });
    }

    /* Le panneau central lui-meme ne va plus jusqu'au bord droit de la fenetre (fond vide a droite). */
    function centreRabattu(contentPanel) {
        if (!contentPanel || !contentPanel.rendered || !contentPanel.el || !contentPanel.isVisible()) {
            return false;
        }
        var r = contentPanel.el.dom.getBoundingClientRect(),
                fenetre = document.documentElement.clientWidth || window.innerWidth;
        return r.width > 0 && fenetre - r.right > 40;
    }

    function recalerCentre(contentPanel, declencheur) {
        if (window.PrestigeAffichage && window.PrestigeAffichage.resynchroniserMiseEnPage
                && window.PrestigeAffichage.resynchroniserMiseEnPage.regionFlottante
                && window.PrestigeAffichage.resynchroniserMiseEnPage.regionFlottante()) {
            return;
        }
        var vp = Ext.ComponentQuery.query('viewport')[0];
        if (!vp || !vp.rendered) {
            return;
        }
        var avant = Math.round(contentPanel.el.dom.getBoundingClientRect().width);
        // memoires de mise en page du viewport et du panneau central : celles qui figent l'ancienne largeur
        Ext.each([vp, contentPanel], function (c) {
            delete c.lastBox;
            if (c.el) {
                delete c.el.lastBox;
            }
        });
        vp.setSize(Ext.Element.getViewportWidth(), Ext.Element.getViewportHeight());
        vp.updateLayout({isRoot: true});
        tracer({quand: new Date().toISOString(), declencheur: declencheur + ' (panneau central)', largeurAvant: avant,
            largeurApres: Math.round(contentPanel.el.dom.getBoundingClientRect().width),
            fenetre: window.innerWidth + 'x' + window.innerHeight, rabattu: true});
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
