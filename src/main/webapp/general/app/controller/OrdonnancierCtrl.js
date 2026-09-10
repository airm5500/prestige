/* global Ext */

Ext.define('testextjs.controller.OrdonnancierCtrl', {
    extend: 'Ext.app.Controller',
    requires: [
        'testextjs.model.caisse.Vente'
    ],
    views: ['testextjs.view.vente.Ordonnancier'],
    refs: [{
            ref: 'ordonnancier',
            selector: 'ordonnancier'
        },
        {
            ref: 'queryBtn',
            selector: 'ordonnancier #rechercher'
        },
        {
            // L'ecran porte desormais quatre grilles (le registre et les trois palmares) :
            // « ordonnancier gridpanel » designerait la premiere venue.
            ref: 'ordonnancierGrid',
            selector: 'ordonnancier #grilleRegistre'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'ordonnancier #grilleRegistre pagingtoolbar'
        }
        , {
            ref: 'dtStart',
            selector: 'ordonnancier #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'ordonnancier #dtEnd'
        }

        , {
            ref: 'medecin',
            selector: 'ordonnancier #medecin'
        }, {
            ref: 'queryField',
            selector: 'ordonnancier #query'
        }


    ],
    config: {
        datemisajour: null
    },
    init: function (application) {
        this.control({
            'ordonnancier #grilleRegistre pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'ordonnancier #rechercher': {
                click: this.doSearch
            },
            'ordonnancier #medecin': {
                select: this.doSearch
            },
            'ordonnancier #grilleRegistre': {
                viewready: this.doInitStore
            },
            'ordonnancier #grilleRegistre actioncolumn': {
                voirDetail: this.doVoirDetail
            },
            'ordonnancier #ongletsOrdonnancier': {
                tabchange: this.surChangementOnglet
            },
            'ordonnancier #analyseActualiser': {
                click: this.doAnalyser
            },
            'ordonnancier #analyseTop': {
                select: this.doAnalyser
            },
            'ordonnancier #analyseImprimer': {
                click: this.doImprimerAnalyse
            },
            'ordonnancier #analyseExporter': {
                click: this.doExporterAnalyse
            },
            'ordonnancier #analyseInventaire': {
                click: this.doInventaire
            },
            'ordonnancier #query': {
                // La touche Entree lance la recherche : personne ne va chercher le bouton
                // apres avoir tape un nom de client.
                specialkey: function (champ, e) {
                    if (e.getKey() === e.ENTER) {
                        this.doSearch();
                    }
                },
                scope: this
            },
            'ordonnancier #imprimer': {
                click: this.doImprimer
            },
            'ordonnancier #exporter': {
                click: this.doExporter
            },
            'ordonnancier #inventaire': {
                click: this.doInventaire
            }
            /* "ordonnancier gridpanel actioncolumn": {
             printTicket: this.printTicket,
             remove: this.testSuppression,
             facture: this.onFacture,
             toEdit: this.onEdite,
             toExport: this.onbtnexportCsv,
             onSuggestion: this.onSuggestion
             },*/

        });
    },

    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getOrdonnancierGrid().getStore().getProxy();
        myProxy.params = {

            medecinId: null,
            dtStart: null,
            dtEnd: null


        };
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('medecinId', me.getMedecin().getValue());
        myProxy.setExtraParam('query', me.getQueryField().getValue());

    },

    /**
     * Les criteres de la recherche en cours. Les editions, l'export et l'inventaire les reprennent
     * TELS QUELS : un etat qui ne dirait pas la meme chose que l'ecran d'ou il sort serait pire que
     * pas d'etat du tout.
     */
    criteres: function () {
        var me = this;
        return {
            dtStart: me.getDtStart().getSubmitValue(),
            dtEnd: me.getDtEnd().getSubmitValue(),
            medecinId: me.getMedecin().getValue() || '',
            query: me.getQueryField().getValue() || ''
        };
    },

    /**
     * Ouvre les produits de la vente choisie. Ils ne sont demandes qu'ici : la liste, elle, ne les
     * transporte pas.
     */
    doVoirDetail: function (view, rowIndex, colIndex, item, e, record) {
        if (!record) {
            return;
        }
        Ext.create('testextjs.view.vente.DetailProduitsVente', {
            venteId: record.get('lgPREENREGISTREMENTID'),
            reference: record.get('strREF'),
            urlDetail: '../api/v1/ventestats/ventesordonnanciers/detail/',
            avecTableau: true
        });
    },

    /**
     * L'analyse n'est lancee qu'a l'ouverture de son onglet, et une seule fois : elle coute une
     * lecture complete du registre, que l'utilisateur venu consulter une delivrance n'a pas a payer.
     * Ensuite, seuls « Actualiser » et un changement de filtres la relancent.
     */
    surChangementOnglet: function (onglets, onglet) {
        if (onglet && onglet.getItemId() === 'ongletAnalyse' && !this.analyseChargee) {
            this.doAnalyser();
        }
    },

    doAnalyser: function () {
        var me = this;
        var ecran = me.getOrdonnancier();
        var indicateurs = ecran.down('#analyseIndicateurs');
        var selectTop = ecran.down('#analyseTop');
        var criteres = Ext.apply({top: selectTop ? selectTop.getValue() : 20}, me.criteres());
        indicateurs.update('<i>Analyse en cours...</i>');
        Ext.Ajax.request({
            url: '../api/v1/ventestats/ventesordonnanciers/analyse',
            method: 'GET',
            params: criteres,
            timeout: 600000,
            success: function (reponse) {
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                var ind = objet.indicateurs || {};
                ecran.produitStore.loadData(objet.topProduits || []);
                ecran.clientStore.loadData(objet.topClients || []);
                ecran.medecinStore.loadData(objet.topMedecins || []);
                indicateurs.update('<b>' + (ind.delivrances || 0) + '</b> d&eacute;livrance(s) &middot; <b>'
                        + (ind.lignes || 0) + '</b> ligne(s) &middot; <b>' + (ind.produitsDistincts || 0)
                        + '</b> produit(s) &middot; <b>' + (ind.clientsDistincts || 0)
                        + '</b> client(s) &middot; <b>' + (ind.medecinsDistincts || 0)
                        + '</b> m&eacute;decin(s) &middot; <b>' + (ind.quantiteTotale || 0)
                        + '</b> unit&eacute;(s) &middot; <b>'
                        + Ext.util.Format.number(ind.montantTotal || 0, '0,000') + '</b> au total');
                me.analyseChargee = true;
            },
            failure: function () {
                indicateurs.update('<span style="color:#a00">L\'analyse n\'a pas pu &ecirc;tre '
                        + 'calcul&eacute;e.</span>');
            }
        });
    },

    /** Les criteres de l'analyse : ceux de la recherche, plus le nombre de lignes gardees. */
    criteresAnalyse: function () {
        var selectTop = this.getOrdonnancier().down('#analyseTop');
        return Ext.apply({top: selectTop ? selectTop.getValue() : 20}, this.criteres());
    },

    doImprimerAnalyse: function () {
        var attente = Ext.MessageBox.wait('Veuillez patienter . . .', 'Edition de l\'analyse');
        Ext.Ajax.request({
            url: '../api/v1/ventestats/ventesordonnanciers/analyse/pdf',
            method: 'GET',
            params: this.criteresAnalyse(),
            timeout: 600000,
            callback: function () {
                attente.hide();
            },
            success: function (reponse) {
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                if (objet.success && objet.url) {
                    window.open('..' + objet.url);
                } else {
                    Ext.MessageBox.alert('Message',
                            objet.msg || 'L\'&eacute;dition n\'a pas pu &ecirc;tre g&eacute;n&eacute;r&eacute;e.');
                }
            },
            failure: function () {
                Ext.MessageBox.alert('Message',
                        'L\'&eacute;dition n\'a pas pu &ecirc;tre g&eacute;n&eacute;r&eacute;e.');
            }
        });
    },

    doExporterAnalyse: function () {
        window.open('../api/v1/ventestats/ventesordonnanciers/analyse/excel?'
                + Ext.Object.toQueryString(this.criteresAnalyse()));
    },

    doImprimer: function () {
        var attente = Ext.MessageBox.wait('Veuillez patienter . . .', 'Edition du registre');
        Ext.Ajax.request({
            url: '../api/v1/ventestats/ventesordonnanciers/pdf',
            method: 'GET',
            params: this.criteres(),
            timeout: 600000,
            callback: function () {
                attente.hide();
            },
            success: function (reponse) {
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                if (objet.success && objet.url) {
                    window.open('..' + objet.url);
                } else {
                    Ext.MessageBox.alert('Message',
                            objet.msg || 'L\'&eacute;dition n\'a pas pu &ecirc;tre g&eacute;n&eacute;r&eacute;e.');
                }
            },
            failure: function () {
                Ext.MessageBox.alert('Message',
                        'L\'&eacute;dition n\'a pas pu &ecirc;tre g&eacute;n&eacute;r&eacute;e.');
            }
        });
    },

    doExporter: function () {
        // Un telechargement ne passe pas par Ext.Ajax : le navigateur doit recevoir le fichier.
        window.open('../api/v1/ventestats/ventesordonnanciers/excel?'
                + Ext.Object.toQueryString(this.criteres()));
    },

    doInventaire: function () {
        var criteres = this.criteres();
        var attente = Ext.MessageBox.wait('Veuillez patienter . . .', 'Contr&ocirc;le des produits');
        // On compte AVANT de creer : l'officine doit savoir sur quoi elle s'engage. Le meme point
        // d'entree sert aux deux, « controle » decidant s'il cree ou s'il se contente de compter.
        Ext.Ajax.request({
            url: '../api/v1/ventestats/ventesordonnanciers/inventaire',
            method: 'POST',
            params: Ext.apply({controle: true}, criteres),
            timeout: 600000,
            callback: function () {
                attente.hide();
            },
            success: function (reponse) {
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                var nombre = objet.count || 0;
                if (nombre === 0) {
                    Ext.MessageBox.alert('Message',
                            'Aucun produit sur la p&eacute;riode affich&eacute;e.');
                    return;
                }
                Ext.MessageBox.confirm('Confirmation',
                        'Vous allez cr&eacute;er un inventaire contenant <b>' + nombre
                        + '</b> produit(s) distinct(s), issus de <b>' + (objet.ventes || 0)
                        + '</b> d&eacute;livrance(s).<br/>Confirmez-vous ?',
                        function (choix) {
                            if (choix !== 'yes') {
                                return;
                            }
                            var creation = Ext.MessageBox.wait('Veuillez patienter . . .',
                                    'Cr&eacute;ation de l\'inventaire');
                            Ext.Ajax.request({
                                url: '../api/v1/ventestats/ventesordonnanciers/inventaire',
                                method: 'POST',
                                params: criteres,
                                timeout: 600000,
                                callback: function () {
                                    creation.hide();
                                },
                                success: function (rep) {
                                    var res = Ext.JSON.decode(rep.responseText, true) || {};
                                    if (res.success) {
                                        Ext.MessageBox.alert('Inventaire',
                                                'Inventaire cr&eacute;&eacute;.<br/>Produits en compte : <b>'
                                                + (res.count || 0) + '</b>');
                                    } else {
                                        Ext.MessageBox.alert('Message',
                                                res.message || 'La cr&eacute;ation de l\'inventaire a &eacute;chou&eacute;.');
                                    }
                                },
                                failure: function () {
                                    Ext.MessageBox.alert('Message',
                                            'La cr&eacute;ation de l\'inventaire a &eacute;chou&eacute;. '
                                            + 'Aucun inventaire partiel n\'a &eacute;t&eacute; cr&eacute;&eacute;.');
                                }
                            });
                        });
            },
            failure: function () {
                Ext.MessageBox.alert('Message',
                        'Le contr&ocirc;le du nombre de produits a &eacute;chou&eacute;.');
            }
        });
    },
    doInitStore: function () {
        var me = this;
        me.doSearch();
       
    },
    
    doSearch: function () {
        var me = this;
        // Les deux onglets partagent les filtres : changer de periode rend l'analyse affichee
        // fausse. On la relance si elle est visible, sinon on la marque a recalculer.
        if (me.analyseChargee) {
            var onglets = me.getOrdonnancier() ? me.getOrdonnancier().down('#ongletsOrdonnancier') : null;
            var actif = onglets ? onglets.getActiveTab() : null;
            me.analyseChargee = false;
            if (actif && actif.getItemId() === 'ongletAnalyse') {
                me.doAnalyser();
            }
        }
        me.getOrdonnancierGrid().getStore().load({
            params: {

                "dtStart": me.getDtStart().getSubmitValue(),
                "dtEnd": me.getDtEnd().getSubmitValue(),
                "medecinId": me.getMedecin().getValue(),
                "query": me.getQueryField().getValue()

            }
        });
    }
});