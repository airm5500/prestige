/* global Ext */

/*
 * Menu Details : chargements, editions PDF, exports Excel et creation d'inventaire.
 * Meme enchainement d'impression que l'analyse tiers payants : le serveur produit le
 * fichier et repond par son URL, que l'ecran ouvre dans un onglet.
 */
Ext.define('testextjs.controller.DetailsCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.produits.DetailsManager'],

    init: function () {
        this.control({
            'detailsmanager': {
                afterrender: this.onEcranAffiche
            },
            'detailsmanager #btnHistoRechercher': {
                click: this.onChargerHistorique
            },
            'detailsmanager #btnHistoImprimer': {
                click: this.onImprimerHistorique
            },
            'detailsmanager #btnHistoExcel': {
                click: this.onExcelHistorique
            },
            'detailsmanager #btnListeRechercher': {
                click: this.onChargerListe
            },
            'detailsmanager #btnListeVider': {
                click: this.onViderFiltres
            },
            'detailsmanager #btnListeImprimer': {
                click: this.onImprimerListe
            },
            'detailsmanager #btnListeExcel': {
                click: this.onExcelListe
            },
            'detailsmanager #btnListeInventaire': {
                click: this.onCreerInventaire
            },
            'detailsmanager #btnHistoInventaire': {
                click: this.onCreerInventaireHistorique
            },
            'detailsmanager #btnListeDecocher': {
                click: this.onToutDecocher
            },
            /* Cochage : on tient la memoire nous-memes, la pagination vide le magasin. */
            'detailsmanager #grilleProduits': {
                select: this.onCocher,
                deselect: this.onDecocher
            },
            /* Entree dans un filtre lance la recherche, sans viser le bouton. */
            'detailsmanager #rech': {
                specialkey: this.onToucheEntree
            },
            'detailsmanager #rechContenance': {
                specialkey: this.onToucheEntree
            },
            'detailsmanager #histoRech': {
                specialkey: this.onToucheEntreeHistorique
            }
        });
    },

    ecran: function (composant) {
        return composant.up('detailsmanager');
    },

    onEcranAffiche: function (ecran) {
        var me = this;
        /* Chaque chargement du magasin - recherche ou simple changement de page - remet en place
         * le cochage memorise. Passer par l'evenement du magasin couvre la barre de pagination,
         * que l'ecran ne pilote pas lui-meme. */
        ecran.storeProduits.on('load', function () {
            me.reappliquerCoches(ecran);
        });
        this.chargerListe(ecran);
        this.chargerHistorique(ecran);
        // Curseur directement dans la recherche, pret pour la saisie
        Ext.defer(function () {
            var champ = ecran.down('#rech');
            if (champ && champ.rendered) {
                champ.focus();
            }
        }, 400);
    },

    onToucheEntree: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.chargerListe(this.ecran(champ));
        }
    },

    onToucheEntreeHistorique: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.chargerHistorique(this.ecran(champ));
        }
    },

    chargerListe: function (ecran, garderCoches) {
        var me = this;
        var p = ecran.parametresListe();
        var store = ecran.storeProduits;
        /* Changer de filtre change la liste : garder un cochage fait sur d'autres criteres
         * conduirait a inventorier des produits que l'usager ne voit plus. Le changement de
         * page, lui, garde le cochage - c'est tout l'objet de la memoire. */
        if (!garderCoches) {
            ecran.cochesProduits = {};
        }
        store.getProxy().extraParams = p;
        store.loadPage(1);
    },

    /* Ecran d'une grille ou d'un modele de selection, quel que soit le chemin d'appel. */
    ecranDeSelection: function (selection) {
        var vue = selection.view || (selection.views && selection.views[0]);
        return vue ? vue.up('detailsmanager') : null;
    },

    /* Recoche, apres un chargement, les lignes retenues sur les pages precedentes. */
    reappliquerCoches: function (ecran) {
        var grille = ecran.down('#grilleProduits');
        if (!grille) {
            return;
        }
        var selection = grille.getSelectionModel();
        var aCocher = [];
        ecran.storeProduits.each(function (r) {
            if (ecran.cochesProduits[r.get('familleIdPP')]) {
                aCocher.push(r);
            }
        });
        /* Les evenements sont suspendus : cette recoche est un rétablissement d'affichage, pas
         * un geste de l'usager - la relayer modifierait la memoire qu'elle est en train de lire. */
        selection.suspendEvents();
        selection.deselectAll(true);
        if (aCocher.length) {
            selection.select(aCocher, false, true);
        }
        selection.resumeEvents();
        this.majCompteurCoches(ecran);
    },

    majCompteurCoches: function (ecran) {
        var nombre = Ext.Object.getKeys(ecran.cochesProduits).length;
        var texte = ecran.down('#compteurCoches');
        var bouton = ecran.down('#btnListeDecocher');
        if (texte) {
            texte.setText(nombre ? '<span style="color:#b36b00;font-weight:bold;">' + nombre
                    + ' produit(s) coché(s)</span>' : '');
        }
        if (bouton) {
            bouton.setVisible(nombre > 0);
        }
    },

    onCocher: function (selection, record) {
        var ecran = this.ecranDeSelection(selection);
        if (!ecran) {
            return;
        }
        ecran.cochesProduits[record.get('familleIdPP')] = true;
        this.majCompteurCoches(ecran);
    },

    onDecocher: function (selection, record) {
        var ecran = this.ecranDeSelection(selection);
        if (!ecran) {
            return;
        }
        delete ecran.cochesProduits[record.get('familleIdPP')];
        this.majCompteurCoches(ecran);
    },

    onToutDecocher: function (bouton) {
        var ecran = this.ecran(bouton);
        ecran.cochesProduits = {};
        this.reappliquerCoches(ecran);
    },

    chargerHistorique: function (ecran) {
        var p = ecran.parametresHistorique();
        var store = ecran.storeHistorique;
        store.getProxy().extraParams = p;
        store.loadPage(1);
    },

    onChargerListe: function (bouton) {
        this.chargerListe(this.ecran(bouton));
    },

    onChargerHistorique: function (bouton) {
        this.chargerHistorique(this.ecran(bouton));
    },

    onViderFiltres: function (bouton) {
        var ecran = this.ecran(bouton);
        ecran.down('#rech').setValue('');
        ecran.down('#rechContenance').setValue(null);
        this.chargerListe(ecran);
    },

    /*
     * Pas de boite « Génération du PDF » : le modele compile est en cache cote serveur, la
     * reponse est immediate - le PDF s'ouvre directement dans un nouvel onglet (URL relative
     * au contexte, comme les autres editions). On ne parle a l'usager qu'en cas d'echec.
     */
    imprimer: function (url, params) {
        /*
         * L'onglet est ouvert TOUT DE SUITE, pendant le clic, puis on y charge le PDF quand le
         * serveur repond. Ouvrir l'onglet dans le retour de la requete - ce que faisait ce code -
         * revient a l'ouvrir hors de tout geste de l'utilisateur : le navigateur y voit une
         * fenetre surgissante et la bloque, d'ou le « fenetre pop-up bloquee » signale en
         * recette. Les autres editions n'ont pas ce message parce qu'elles ouvrent leur onglet
         * directement au clic.
         *
         * Si la generation echoue, l'onglet ouvert pour rien est referme avant le message.
         */
        var onglet = window.open('', '_blank');
        var echec = function (message) {
            if (onglet && !onglet.closed) {
                onglet.close();
            }
            Ext.Msg.alert('Message', message);
        };
        Ext.Ajax.request({
            method: 'GET',
            url: url,
            params: params,
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success && r.msg) {
                    var adresse = '..' + r.msg;
                    if (onglet && !onglet.closed) {
                        onglet.location.href = adresse;
                    } else {
                        // onglet ferme entre-temps, ou bloque malgre tout : dernier recours
                        window.open(adresse, '_blank');
                    }
                } else {
                    echec(r.msg || 'Le PDF n\'a pas pu être généré.');
                }
            },
            failure: function () {
                echec('Le PDF n\'a pas pu être généré.');
            }
        });
    },

    onImprimerListe: function (bouton) {
        this.imprimer('../api/v1/details/produits/print', this.ecran(bouton).parametresListe());
    },

    onImprimerHistorique: function (bouton) {
        this.imprimer('../api/v1/details/historique/print', this.ecran(bouton).parametresHistorique());
    },

    onExcelListe: function (bouton) {
        window.open('../api/v1/details/produits/excel?'
                + Ext.Object.toQueryString(this.ecran(bouton).parametresListe()));
    },

    onExcelHistorique: function (bouton) {
        window.open('../api/v1/details/historique/excel?'
                + Ext.Object.toQueryString(this.ecran(bouton).parametresHistorique()));
    },

    /*
     * Inventaire depuis l'HISTORIQUE : les produits deconditionnes de la periode affichee, boite ET
     * detail. Le serveur rejoue les memes filtres, l'inventaire porte donc sur tout l'historique
     * filtre et non sur la seule page a l'ecran. La question posee rappelle la periode, pour qu'on
     * ne cree pas un inventaire de tout l'historique en croyant ne prendre que la journee.
     */
    onCreerInventaireHistorique: function (bouton) {
        var me = this, ecran = me.ecran(bouton);
        var p = ecran.parametresHistorique();
        var horodatage = Ext.Date.format(new Date(), 'dmYHis');
        /* Dates lisibles : les champs de l'ecran s'affichent en jour/mois/annee, la question doit
         * les rappeler sous la meme forme - « 2026-09-01 » est le format d'envoi, pas celui qu'on lit. */
        var jjmmaa = function (champ) {
            var v = ecran.down(champ).getValue();
            return v ? Ext.Date.format(v, 'd/m/Y') : null;
        };
        var debut = jjmmaa('#histoDebut'), fin = jjmmaa('#histoFin');
        var periode = (debut || fin)
                ? 'du ' + (debut || '(origine)') + ' au ' + (fin || "aujourd'hui")
                : '<b>tout l\'historique</b>';
        var nbAffiches = ecran.storeHistorique.getTotalCount();
        Ext.Msg.confirm('Inventaire',
                'Créer un inventaire avec les produits déconditionnés ' + periode
                + '&nbsp;?<br><br>Il portera sur le produit chapeau <b>et</b> son détail,'
                + ' pour les ' + nbAffiches + ' mouvement(s) trouvé(s).',
                function (choix) {
                    if (choix !== 'yes') {
                        return;
                    }
                    var progress = Ext.MessageBox.wait('Création de l\'inventaire . . .', 'Veuillez patienter');
                    Ext.Ajax.request({
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        url: '../api/v1/details/historique/inventaire',
                        params: Ext.JSON.encode({
                            dtStart: p.dtStart, dtEnd: p.dtEnd, recherche: p.recherche,
                            name: 'INVENTAIRE DECONDITIONNEMENTS ' + horodatage
                        }),
                        success: function (response) {
                            progress.hide();
                            var r = Ext.JSON.decode(response.responseText, true) || {};
                            Ext.Msg.alert('Message', r.success
                                    ? 'Inventaire « ' + r.name + ' » créé : ' + r.count + ' produit(s),'
                                            + ' issus de ' + r.mouvements + ' déconditionnement(s).'
                                    : (r.msg || 'La création a échoué.'));
                        },
                        failure: function () {
                            progress.hide();
                            Ext.Msg.alert('Message', 'La création a échoué.');
                        }
                    });
                });
    },

    /*
     * Inventaire : sur les produits COCHES s'il y en a - le cochage vaut sur toutes les pages -
     * sinon sur toute la liste filtree, comme avant. La question posee nomme le cas, pour qu'on
     * ne cree pas un inventaire de 400 lignes en croyant n'en cocher que trois.
     */
    onCreerInventaire: function (bouton) {
        var me = this, ecran = me.ecran(bouton);
        var p = ecran.parametresListe();
        var horodatage = Ext.Date.format(new Date(), 'dmYHis');
        var coches = Ext.Object.getKeys(ecran.cochesProduits);
        var question = coches.length
                ? 'Créer un inventaire avec les <b>' + coches.length + ' produit(s) coché(s)</b>'
                        + ' (principaux et détails)&nbsp;?'
                : 'Aucun produit coché : créer un inventaire avec <b>toute la liste filtrée</b>'
                        + ' (principaux et détails)&nbsp;?';
        Ext.Msg.confirm('Inventaire', question,
                function (choix) {
                    if (choix !== 'yes') {
                        return;
                    }
                    var corps = {
                        rech: p.rech, contenance: p.contenance,
                        name: 'INVENTAIRE PRODUITS DETAILLES ' + horodatage
                    };
                    if (coches.length) {
                        corps.lignes = coches;
                    }
                    var progress = Ext.MessageBox.wait('Création de l\'inventaire . . .', 'Veuillez patienter');
                    Ext.Ajax.request({
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        url: '../api/v1/details/produits/inventaire',
                        params: Ext.JSON.encode(corps),
                        success: function (response) {
                            progress.hide();
                            var r = Ext.JSON.decode(response.responseText, true) || {};
                            Ext.Msg.alert('Message', r.success
                                    ? 'Inventaire « ' + r.name + ' » créé : ' + r.count + ' produit(s).'
                                    : (r.msg || 'La création a échoué.'));
                        },
                        failure: function () {
                            progress.hide();
                            Ext.Msg.alert('Message', 'La création a échoué.');
                        }
                    });
                });
    }
});
