/* global Ext */

Ext.define('testextjs.controller.GestionCarnetDepotCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.Dashboard.CarnetDepot'],
    refs: [{
            ref: 'reglementdepot',
            selector: 'reglementdepot'
        },

        {
            ref: 'imprimerBtn',
            selector: 'reglementdepot #imprimer'
        }


        , {
            ref: 'dtStart',
            selector: 'reglementdepot #dtStart'
        },

        {
            ref: 'dtEnd',
            selector: 'reglementdepot #dtEnd'
        },
        {
            ref: 'tiersPayantsExclus',
            selector: 'reglementdepot #tiersPayantsExclus'
        },
        {
            ref: 'venteGrid',
            selector: 'reglementdepot #ventePanel [xtype=gridpanel]'
        },
        {
            ref: 'reglementGrid',
            selector: 'reglementdepot #reglementPanel [xtype=gridpanel]'
        },
{
            ref: 'produitGrid',
            selector: 'reglementdepot #produitsPanel [xtype=gridpanel]'
        },
        {
            ref: 'montant',
            selector: 'reglementdepot #ventePanel [xtype=gridpanel] #montant'
        },
        {
            ref: 'nbreVente',
            selector: 'reglementdepot #ventePanel [xtype=gridpanel] #nbreVente'
        },
        {
            ref: 'montantPayer',
            selector: 'reglementdepot #reglementPanel [xtype=gridpanel] #montantPayer'
        },
        {
            ref: 'montantPaye',
            selector: 'reglementdepot #reglementPanel [xtype=gridpanel] #montantPaye'
        },
        {
            ref: 'accountReglement',
            selector: 'reglementdepot #reglementPanel [xtype=gridpanel] #accountReglement'
        },
        
         {
            ref: 'montantAchat',
            selector: 'reglementdepot #produitsPanel [xtype=gridpanel] #montantAchat'
        },
        {
            ref: 'montantVente',
            selector: 'reglementdepot #produitsPanel [xtype=gridpanel] #montantVente'
        },
 {
            ref: 'depenseGrid',
            selector: 'reglementdepot #depensePanel [xtype=gridpanel]'
        }
,
 {
            ref: 'montantDepensePaye',
            selector: 'reglementdepot #depensePanel [xtype=gridpanel] #montantDepensePaye'
        },
         {
            ref: 'montantDepensePayer',
            selector: 'reglementdepot #depensePanel [xtype=gridpanel] #montantDepensePayer'
        },
 {
            ref: 'account',
            selector: 'reglementdepot #depensePanel [xtype=gridpanel] #account'
        }
        
    ],
    /* Onglet FACTURES du carnet depot. La selection de tiers-payant de la barre superieure
       restreint la liste a un carnet precis ; sans selection, tous les carnets depot. */
    chargerFacturesDepot: function () {
        const ecran = this.getReglementdepot();
        if (!ecran) {
            return;
        }
        const grille = ecran.down('#grilleFacturesDepot');
        if (!grille) {
            return;
        }
        const tiersPayant = ecran.down('#tiersPayantsExclus');
        const debut = ecran.down('#dtStart');
        const fin = ecran.down('#dtEnd');
        const recherche = grille.down('#rechercheFactureDepot');
        /* Point 17 : les trois criteres de l'ecran filtrent enfin la liste. La periode affichee en
           haut ne changeait rien : l'onglet rendait tout l'historique du carnet, quelle que soit
           la periode demandee juste au-dessus. */
        grille.getStore().getProxy().extraParams = {
            tpid: (tiersPayant && tiersPayant.getValue()) || '',
            dtStart: (debut && debut.getSubmitValue()) || '',
            dtEnd: (fin && fin.getSubmitValue()) || '',
            query: (recherche && (recherche.getValue() || '').trim()) || ''
        };
        grille.getStore().loadPage(1);
    },

    /* Les deux boutons ne valent que sur une selection : grises tant que rien n'est coche. */
    surSelectionFacturesDepot: function () {
        const ecran = this.getReglementdepot();
        const grille = ecran && ecran.down('#grilleFacturesDepot');
        if (!grille) {
            return;
        }
        const selection = grille.getSelectionModel().getSelection();
        const supprimer = grille.down('#btnSupprimerFactureDepot');
        const imprimer = grille.down('#btnImprimerFactureDepot');
        if (imprimer) {
            imprimer.setDisabled(selection.length === 0);
        }
        if (supprimer) {
            // Une facture definitive ne se supprime pas : le bouton reste gris tant que la
            // selection en contient une, plutot que d'aller chercher un refus du serveur.
            const toutesProvisoires = selection.length > 0
                    && Ext.Array.every(selection, function (f) {
                        return f.get('template') === true;
                    });
            supprimer.setDisabled(!toutesProvisoires);
        }
    },

    /**
     * Suppression des factures cochees : meme geste que sur les factures provisoires, meme service.
     * Le serveur refuse une par une celles qui ne sont plus provisoires.
     */
    supprimerFacturesDepot: function () {
        const me = this;
        const ecran = me.getReglementdepot();
        const grille = ecran && ecran.down('#grilleFacturesDepot');
        if (!grille) {
            return;
        }
        const selection = grille.getSelectionModel().getSelection();
        if (!selection.length) {
            return;
        }
        Ext.MessageBox.confirm('Confirmation',
                'Supprimer <b>' + selection.length + '</b> facture(s) provisoire(s) ?',
                function (choix) {
                    if (choix !== 'yes') {
                        return;
                    }
                    Ext.Ajax.request({
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        url: '../api/v1/facturation/provisoires/supprimer',
                        jsonData: {ids: Ext.Array.map(selection, function (f) {
                                return f.get('lgFACTUREID');
                            })},
                        callback: function (opts, succes, reponse) {
                            let json = {};
                            try {
                                json = Ext.decode(reponse.responseText);
                            } catch (e) {
                            }
                            Ext.MessageBox.alert('Message',
                                    json.msg || json.message || (json.success ? 'Suppression effectuée'
                                            : 'La suppression a échoué'));
                            me.chargerFacturesDepot();
                        }
                    });
                });
    },

    /**
     * Impression des factures carnet depot : UN SEUL bouton, le choix de l'edition est pose dans la
     * fenetre.
     *
     * <p>
     * Deux icones voisines dans la colonne d'action se confondaient, et il fallait cliquer ligne a
     * ligne. Le bouton porte sur la selection, et le choix « sans » ou « avec le detail des
     * medicaments » est demande UNE FOIS pour tout le lot.
     * </p>
     */
    imprimerFacturesDepot: function () {
        const me = this;
        const ecran = me.getReglementdepot();
        const grille = ecran && ecran.down('#grilleFacturesDepot');
        if (!grille) {
            return;
        }
        const selection = grille.getSelectionModel().getSelection();
        if (!selection.length) {
            Ext.MessageBox.alert('Information', 'Cochez au moins une facture à imprimer.');
            return;
        }
        const identifiants = Ext.Array.map(selection, function (f) {
            return f.get('lgFACTUREID');
        });
        const fenetre = Ext.create('Ext.window.Window', {
            title: 'Impression de ' + identifiants.length + ' facture(s)',
            modal: true,
            width: 460,
            bodyPadding: 12,
            layout: 'anchor',
            defaults: {anchor: '100%'},
            items: [{
                    xtype: 'radiogroup',
                    itemId: 'choixEdition',
                    columns: 1,
                    vertical: true,
                    items: [{
                            boxLabel: 'Sans le détail des médicaments (une ligne par bon)',
                            name: 'edition',
                            inputValue: 'simple',
                            checked: true
                        }, {
                            boxLabel: 'Avec le détail des médicaments (modèle DETAIL_ARTICLE)',
                            name: 'edition',
                            inputValue: 'details'
                        }]
                }],
            buttons: [{
                    text: 'Imprimer',
                    handler: function () {
                        const choix = fenetre.down('#choixEdition').getValue().edition;
                        fenetre.destroy();
                        me.lancerImpressionsDepot(identifiants, choix === 'details');
                    }
                }, {
                    text: 'Annuler',
                    handler: function () {
                        fenetre.destroy();
                    }
                }]
        });
        fenetre.show();
    },

    /* Les editions sont espacees : ouvertes dans la meme milliseconde, le navigateur bloque toutes
       les fenetres sauf la premiere. */
    lancerImpressionsDepot: function (identifiants, avecDetails) {
        const me = this;
        Ext.Array.each(identifiants, function (id, rang) {
            Ext.defer(function () {
                if (!avecDetails) {
                    window.open('../api/v1/facturation/facture/' + encodeURIComponent(id) + '/carnet-depot/pdf');
                    return;
                }
                /* Avec le detail des medicaments : le service REST directement, et non la page
                   d'impression historique. Cette page lit le modele de facture du tiers payant
                   avant tout - un carnet depot n'en a pas, et elle plantait (retour du 08/09). */
                me.editionAvecDetails(id);
            }, rang * 400);
        });
    },

    editionAvecDetails: function (id) {
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/facturation/facture/' + encodeURIComponent(id) + '/detail-articles',
            callback: function (opts, succes, reponse) {
                let json = {};
                try {
                    json = Ext.decode(reponse.responseText);
                } catch (e) {
                }
                if (json.success && json.url) {
                    window.open('..' + json.url);
                } else {
                    Ext.MessageBox.alert('Message', json.msg || 'L\'édition avec le détail a échoué');
                }
            }
        });
    },

    /* Creation : on ouvre l'ecran de facturation EXISTANT en mode carnet depot, plutot que d'ecrire
       une seconde fois la generation. Seul le perimetre des bons proposes change. */
    creerFactureDepot: function () {
        const ecran = this.getReglementdepot();
        const tiersPayant = ecran && ecran.down('#tiersPayantsExclus');
        testextjs.app.getController('App').onRedirectTo('oneditfacture', {
            carnetDepot: true,
            tiersPayantId: (tiersPayant && tiersPayant.getValue()) || ''
        });
    },

    init: function (application) {
        this.control({
            'reglementdepot #btnVentePanel': {
                click: this.searchAll
            },
            'reglementdepot': {
                // Chaque onglet etait alimente sur « viewready », qui ne se declenche QU'UNE FOIS,
                // au premier rendu. Passer d'un onglet a l'autre, ou changer de tiers payant, ne
                // rechargeait donc rien : il fallait sortir du menu et y revenir pour voir les
                // donnees a jour -- et entre-temps l'ecran affichait des chiffres perimes sans
                // que rien ne l'indique.
                tabchange: this.surChangementOnglet
            },
            'reglementdepot #facturesPanel [xtype=gridpanel]': {
                viewready: this.chargerFacturesDepot
            },
            'reglementdepot #btnRafraichirFacturesDepot': {
                click: this.chargerFacturesDepot
            },
            'reglementdepot #btnCreerFactureDepot': {
                click: this.creerFactureDepot
            },
            'reglementdepot #btnSupprimerFactureDepot': {
                click: this.supprimerFacturesDepot
            },
            'reglementdepot #btnImprimerFactureDepot': {
                click: this.imprimerFacturesDepot
            },
            'reglementdepot #grilleFacturesDepot': {
                selectionchange: this.surSelectionFacturesDepot
            },
            'reglementdepot #rechercheFactureDepot': {
                specialkey: function (champ, evenement) {
                    if (evenement.getKey() === evenement.ENTER) {
                        this.chargerFacturesDepot();
                    }
                }
            },
 
            'reglementdepot #imprimer': {
                click: this.onPdfClick
            }, 'reglementdepot #ventePanel [xtype=gridpanel]': {
                viewready: this.doInitVenteStore
            },
            'reglementdepot #reglementPanel [xtype=gridpanel]': {
                viewready: this.doInitReglementStore
            },

            'reglementdepot #ventePanel [xtype=gridpanel] pagingtoolbar': {
                beforechange: this.doVentechange
            },
            'reglementdepot #reglementPanel [xtype=gridpanel] pagingtoolbar': {
                beforechange: this.doReglementchange
            },
            'reglementdepot #tiersPayantsExclus': {
                select: this.onSelectTiersPayant
            },
            'reglementdepot #reglementPanel [xtype=gridpanel] #btnReglement': {
                click: this.reglementForm
            },
            "reglementdepot #reglementPanel [xtype=gridpanel] actioncolumn": {
                printTicket: this.printTicket
            }, 'reglementdepot #produitsPanel [xtype=gridpanel] pagingtoolbar': {
                beforechange: this.doProduitchange
            },
             'reglementdepot #produitsPanel [xtype=gridpanel]': {
                viewready: this.doInitProduitStore
            },
            'reglementdepot #depensePanel [xtype=gridpanel] #btnDepense': {
                click: this.depenseForm
            },
             'reglementdepot #depensePanel [xtype=gridpanel]': {
                viewready: this.doInitDepensesStore
            },
 'reglementdepot #depensePanel [xtype=gridpanel] pagingtoolbar': {
                beforechange: this.doDepenseschange
            }
            
            
        });
    },
    /* Le solde s'affiche sur les deux onglets (reglements, depenses) : les deux sont mis a jour
       d'un coup, et le carnet du selecteur aussi, pour que le retour sur l'onglet ne ramene pas
       l'ancienne valeur. */
    afficherSolde: function (solde) {
        const me = this;
        if (solde === undefined || solde === null) {
            return;
        }
        if (me.getAccountReglement()) {
            me.getAccountReglement().setValue(solde);
        }
        if (me.getAccount()) {
            me.getAccount().setValue(solde);
        }
        const combo = me.getTiersPayantsExclus();
        const carnet = combo && combo.findRecord('id', combo.getValue());
        if (carnet) {
            carnet.set('account', solde);
            carnet.commit();
        }
    },
    onSelectTiersPayant: function (cmp) {
        let me = this;
        let value = cmp.getValue();
        let record = cmp.findRecord("id", value);
        // Le solde n'est repris que si le carnet a ete retrouve dans le store : sans
        // cette garde, un enregistrement absent faisait echouer la selection.
        if (record) {
            me.getAccountReglement().setValue(record.get('account'));
            me.getAccount().setValue(record.get('account'));
        }
        // Choisir un carnet lance directement la recherche de l'onglet ouvert
        // (ventes, reglements, depenses ou produits) : l'utilisateur n'a plus a
        // cliquer sur Rechercher apres avoir choisi son tiers payant.
        me.searchAll();
    },
    printTicket: function (view, rowIndex, colIndex, item, e, rec, row) {
        const me = this;
        me.onPrintTicket(rec.get('idDossier'));
    },
    onPdfClick: function () {
        let me = this;
        let itemId = me.getReglementdepot().getLayout().getActiveItem().getItemId();
        let tiersPayantId = me.getTiersPayantsExclus().getValue();
        if (tiersPayantId === null || tiersPayantId === undefined) {
            tiersPayantId = '';
        }
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        let linkUrl = ""; 
        if (itemId === 'ventePanel'  ) {
            // L'onglet Ventes imprimait l'edition « RETOUR DEPOT » (mode RETOUR_CARNET_DEPOT),
            // sans rapport avec son contenu : il imprime desormais les ventes du depot.
            linkUrl = '../TiersPayantExcludServlet?mode=VENTES_CARNET_DEPOT&dtStart=' + dtStart +
                    '&dtEnd=' + dtEnd + '&tiersPayantId=' + tiersPayantId;
        } else if(itemId==='produitsPanel'){
               linkUrl = '../TiersPayantExcludServlet?mode=PRODUITS&dtStart=' + dtStart +
                    '&dtEnd=' + dtEnd + '&tiersPayantId=' + tiersPayantId;
        }else if(itemId === 'reglementPanel' || itemId === 'depensePanel'){
             linkUrl = '../TiersPayantExcludServlet?mode=REGLEMENTS_CARNET_DEPOT&dtStart=' + dtStart +
                    '&dtEnd=' + dtEnd + '&tiersPayantId=' + tiersPayantId;
        }
        
       /* else if(itemId === 'depensePanel'){
             linkUrl = '../TiersPayantExcludServlet?mode=REGLEMENTS_CARNET_DEPOT&dtStart=' + dtStart +
                    '&dtEnd=' + dtEnd + '&tiersPayantId=' + tiersPayantId+'&typeReglementCarnet=DEPENSE';
            
        }*/
        window.open(linkUrl);
    },

    doMetachange: function (store, meta) {
        const me = this;
        me.buildSummary(meta);

    },

    buildSummary: function (rec) {
        const me = this;
        me.getMontant().setValue(rec.chiffreAffaire);
        me.getNbreVente().setValue(rec.nbreVente);
    },
    doVentechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getVenteGrid().getStore().getProxy();
        me.initProxy(myProxy,me,'REGLEMENT');
    },
    /**
     * Recharge l'onglet qui vient d'etre ouvert.
     *
     * Le chargement se fait A L'OUVERTURE et non a l'avance : recharger les cinq onglets a chaque
     * recherche couterait cinq appels pour celui qu'on regarde.
     */
    surChangementOnglet: function () {
        this.searchAll();
    },

    searchAll: function () {
        let me = this;
        const actif = me.getReglementdepot() ? me.getReglementdepot().getLayout().getActiveItem() : null;
        if (!actif) {
            return;
        }
        const itemId = actif.getItemId();
        if (itemId === 'ventePanel') {
            me.doSearchVente();
        } else if (itemId === 'reglementPanel') {
            me.doSearchReglement();
        } else if (itemId === 'produitsPanel') {
            me.doSearchProduits();
        } else if (itemId === 'depensePanel') {
            me.doSearchDepense();
        } else if (itemId === 'facturesPanel') {
            // L'onglet des factures etait le seul absent de cette liste : il ne se rechargeait
            // donc jamais, pas meme sur « Rechercher ».
            me.chargerFacturesDepot();
        }
    },
    doSearchVente: function () {
        const me = this;
        me.getVenteGrid().getStore().load({
            params: {
                dtEnd: me.getDtEnd().getSubmitValue(),
                dtStart: me.getDtStart().getSubmitValue(),
                tiersPayantId: me.getTiersPayantsExclus().getValue()
            }
        });
    },
    doInitVenteStore: function () {
        const me = this;
        me.getVenteGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearchVente();
    },
    doInitReglementStore: function () {
        const me = this;
        me.getReglementGrid().getStore().addListener('metachange', this.doReglementMetachange, this);
        me.doSearchReglement();
    },
        doInitDepensesStore: function () {
        const me = this;
        me.getDepenseGrid().getStore().addListener('metachange', this.doDepensesMetachange, this);
        me.doSearchReglement();
    },
     doDepensesMetachange: function (store, meta) {
        const me = this;
        me.buildDepensesSummary(meta);

    },
    doReglementMetachange: function (store, meta) {
        const me = this;
        me.buildReglementSummary(meta);

    },
     doProduitMetachange: function (store, meta) {
        const me = this;
        me.buildProduitSummary(meta);

    },
     buildProduitSummary: function (rec) {
        const me = this;
        me.getMontantVente().setValue(rec.montantVente  );
        me.getMontantAchat().setValue(rec.montantAchat);
    },
 buildReglementSummary: function (rec) {
        const me = this;
        me.getMontantPaye().setValue(rec.montantPaye);
        me.getMontantPayer().setValue(rec.montantPayer);
    },
     buildDepensesSummary: function (rec) {
        const me = this;
        me.getMontantDepensePaye().setValue(rec.montantPaye);
        me.getMontantDepensePayer().setValue(rec.montantPayer);
    },
    doSearchReglement: function () {
        const me = this;
        me.getReglementGrid().getStore().load({
            params: {
                dtEnd: me.getDtEnd().getSubmitValue(),
                dtStart: me.getDtStart().getSubmitValue(),
                tiersPayantId: me.getTiersPayantsExclus().getValue(),
                "typeReglementCarnet":'REGLEMENT'
            }
        });
    },
       doSearchDepense: function () {
        const me = this;
        me.getDepenseGrid().getStore().load({
            params: {
                dtEnd: me.getDtEnd().getSubmitValue(),
                dtStart: me.getDtStart().getSubmitValue(),
                tiersPayantId: me.getTiersPayantsExclus().getValue(),
                "typeReglementCarnet":'DEPENSE'
            }
        });
    },
    doReglementchange: function (page, currentPage) {
        const me = this;
        let myProxy = me.getReglementGrid().getStore().getProxy();
       me.initProxy(myProxy,me,'REGLEMENT');

    },
      doDepenseschange: function (page, currentPage) {
        const me = this;
        let myProxy = me.getDepensesGrid().getStore().getProxy();
       me.initProxy(myProxy,me,'DEPENSE');

    },
    initProxy:function(myProxy,me,type){
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            tiersPayantId: null,
             "typeReglementCarnet":type
        };
        myProxy.setExtraParam('tiersPayantId', me.getTiersPayantsExclus().getValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
         myProxy.setExtraParam('typeReglementCarnet', type);
    },
    doProduitchange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getProduitGrid().getStore().getProxy();
        me.initProxy(myProxy,me);

    },
     doSearchProduits: function () {
        const me = this;
        me.getProduitGrid().getStore().load({
            params: {
                dtEnd: me.getDtEnd().getSubmitValue(),
                dtStart: me.getDtStart().getSubmitValue(),
                tiersPayantId: me.getTiersPayantsExclus().getValue()
            }
        });
    },
       doInitProduitStore: function () {
        const me = this;
        me.getProduitGrid().getStore().addListener('metachange', this.doProduitMetachange, this);
        me.doSearchProduits();
    },
    getMotifReglementStore: function(){
        return Ext.create('Ext.data.Store', {
                idProperty: 'id',
            fields:
                    [
                        {
                            name: 'id',
                            type: 'number'
                        },
                        {
                            name: 'libelle',
                            type: 'string'
                        }

                    ],
            autoLoad: true,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/motifreglement',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            

            }
        });
    },
    reglementForm: function () {
        let me = this;
        let tiersPayantId = me.getTiersPayantsExclus().getValue();
        if (tiersPayantId) {
            const form = Ext.create('Ext.window.Window',
                    {

                        autoShow: true,
                        height: 350,
                        width: 600,
                        modal: true,
                        title: "Nouveau règlement",
                        closeAction: 'destroy',
                        closable: false,
                        maximizable: false,
                        layout: {
                            type: 'fit'

                        },
                        dockedItems: [
                            {
                                xtype: 'toolbar',
                                dock: 'bottom',
                                ui: 'footer',
                                layout: {
                                    pack: 'end',
                                    type: 'hbox'
                                },
                                items: [
                                    {
                                        xtype: 'button',
                                        text: 'Enregistrer',
                                        handler: function (btn) {
                                            const _this = btn.up('window'), _form = _this.down('form');
                                            if (_form.isValid()) {
                                                const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                                                Ext.Ajax.request({
                                                    method: 'PUT',
                                                    headers: {'Content-Type': 'application/json'},
                                                    url: '../api/v2/carnet-depot/regler/' + tiersPayantId,
                                                    params: Ext.JSON.encode(_form.getValues()),
                                                    success: function (response, options) {
                                                        progress.hide();
                                                        const result = Ext.JSON.decode(response.responseText, true);
                                                        if (result.success) {
                                                            form.destroy();
                                                            Ext.Msg.confirm("Information", "Voulez-vous imprimer ?",
                                                                    function (btn) {
                                                                        if (btn === "yes") {
//                                  
                                                                            me.onPrintTicket(result.ref);

                                                                        }
                                                                    });

                                                            me.getReglementGrid().getStore().reload();
                                                            me.afficherSolde(result.solde);
                                                        } else {
                                                            Ext.MessageBox.show({
                                                                title: 'Message d\'erreur',
                                                                width: 320,
                                                                msg: result.msg,
                                                                buttons: Ext.MessageBox.OK,
                                                                icon: Ext.MessageBox.ERROR

                                                            });
                                                        }

                                                    },
                                                    failure: function (response, options) {
                                                        progress.hide();
                                                        Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
                                                    }

                                                });
                                            }

                                        }
                                    },
                                    {
                                        xtype: 'button',
                                        iconCls: 'cancelicon',
                                        handler: function (btn) {
                                            form.destroy();
                                        },
                                        text: 'Annuler'

                                    }
                                ]
                            }
                        ],
                        items: [{
                                xtype: 'form',
                                bodyPadding: 5,
                                layout: {
                                    type: 'fit'

                                },
                                items: [
                                    {
                                        xtype: 'fieldset',
                                        title: 'Informations règlements',
                                        defaultType: 'textfield',
                                           labelWidth: 100,
                                        defaults: {
                                            anchor: '100%'
                                        },
                                        items: [
                                            {
                                                xtype: 'textfield',
                                                fieldLabel: 'Montant',
                                                emptyText: 'Montant',
                                                name: 'montantPaye',
                                                itemId: 'montantPaye',
                                                height: 30, flex: 1,
                                                allowBlank: false,
                                                enableKeyEvents: true,
                                                listeners: {
                                                    afterrender: function (field) {
                                                        field.focus(false, 100);
                                                    }
                                                }

                                            },
                                            {
                                                xtype: 'combobox',
                                               
                                                fieldLabel: 'Type règlement',
                                                name: 'typeReglement',
                                                flex: 1,
                                                height: 30,
                                                store: Ext.create('Ext.data.Store', {
                                                    autoLoad: true,
                                                    pageSize: 999,

                                                    fields: [
                                                        {name: 'id', type: 'string'},
                                                        {name: 'libelle', type: 'string'}
                                                    ],
                                                    proxy: {
                                                        type: 'ajax',
                                                        url: '../api/v1/common/type-reglements',
                                                        reader: {
                                                            type: 'json',
                                                            root: 'data',
                                                            totalProperty: 'total'
                                                        }
                                                    }

                                                }),
                                                value: '1',
                                                valueField: 'id',
                                                displayField: 'libelle',
                                                typeAhead: true,
                                                queryMode: 'remote',
                                                emptyText: 'Choisir un type de reglement...'},
                                                  {
                            xtype: 'datefield',
                            fieldLabel: 'Date',
                            name: 'dateReglement',
                          
                            submitFormat: 'Y-m-d',
                            height: 30, flex: 1,
                           
                            maxValue: new Date(),
                            format: 'd/m/Y'

                        },
                                            {
                            xtype: 'combobox',
                           flex: 1,
                            height: 30,
                            fieldLabel: 'Motif réglèment',
                            name: 'motif',
                            store: me.getMotifReglementStore(),
                            pageSize: 9999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'local',
                            minChars: 2,
                            emptyText: 'Sélectionnez le motif'
                        },
                  
                                            
                                            
                                            {
                                                xtype: 'textareafield',
                                                fieldLabel: 'Description',
                                                emptyText: 'Description',
                                                name: 'description',
                                                itemId: 'description',
                                                flex: 1
                                            }

                                        ]
                                    }
                                ]
                            }

                        ]
                    });
        } else {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 320,
                msg: 'Veuillez choisir le tiers-payant ',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING

            });
        }
    },
    onPrintTicket: function (id) {
        Ext.Ajax.request({
            url: '../api/v1/reglement/ticket-carnet/' + id,
            method: 'PUT'
        });
    },
    
     depenseForm: function () {
        let me = this;
        let tiersPayantId = me.getTiersPayantsExclus().getValue();
        if (tiersPayantId) {
            const form = Ext.create('Ext.window.Window',
                    {

                        autoShow: true,
                        height: 350,
                        width: 600,
                        modal: true,
                        title: "Nouvelle depense",
                        closeAction: 'destroy',
                        closable: false,
                        maximizable: false,
                        layout: {
                            type: 'fit'

                        },
                        dockedItems: [
                            {
                                xtype: 'toolbar',
                                dock: 'bottom',
                                ui: 'footer',
                                layout: {
                                    pack: 'end',
                                    type: 'hbox'
                                },
                                items: [
                                    {
                                        xtype: 'button',
                                        text: 'Enregistrer',
                                        handler: function (btn) {
                                            let _this = btn.up('window'), _form = _this.down('form');
                                            if (_form.isValid()) {
                                                const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                                                Ext.Ajax.request({
                                                    method: 'PUT',
                                                    headers: {'Content-Type': 'application/json'},
                                                    url: '../api/v2/carnet-depot/regler/depense/' + tiersPayantId,
                                                    params: Ext.JSON.encode(_form.getValues()),
                                                    success: function (response, options) {
                                                        progress.hide();
                                                        const result = Ext.JSON.decode(response.responseText, true);
                                                        if (result.success) {
                                                            form.destroy();
                                                            Ext.Msg.confirm("Information", "Voulez-vous imprimer ?",
                                                                    function (btn) {
                                                                        if (btn === "yes") {
//                                  
                                                                            me.onPrintTicket(result.ref);

                                                                        }
                                                                    });

                                                            me.getDepenseGrid().getStore().reload();
                                                            me.afficherSolde(result.solde);
                                                        } else {
                                                            Ext.MessageBox.show({
                                                                title: 'Message d\'erreur',
                                                                width: 320,
                                                                msg: result.msg,
                                                                buttons: Ext.MessageBox.OK,
                                                                icon: Ext.MessageBox.ERROR

                                                            });
                                                        }

                                                    },
                                                    failure: function (response, options) {
                                                        progress.hide();
                                                        Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
                                                    }

                                                });
                                            }

                                        }
                                    },
                                    {
                                        xtype: 'button',
                                        iconCls: 'cancelicon',
                                        handler: function (btn) {
                                            form.destroy();
                                        },
                                        text: 'Annuler'

                                    }
                                ]
                            }
                        ],
                        items: [{
                                xtype: 'form',
                                bodyPadding: 5,
                                layout: {
                                    type: 'fit'

                                },
                                items: [
                                    {
                                        xtype: 'fieldset',
                                        title: 'Informations',
                                        defaultType: 'textfield',
                                         labelWidth: 100,
                                        defaults: {
                                            anchor: '100%'
                                        },
                                        items: [
                                            {
                                                xtype: 'textfield',
                                                fieldLabel: 'Montant',
                                                emptyText: 'Montant',
                                                name: 'montantPaye',
                                                
                                                height: 30, flex: 1,
                                                allowBlank: false,
                                                enableKeyEvents: true,
                                                listeners: {
                                                    afterrender: function (field) {
                                                        field.focus(false, 100);
                                                    }
                                                }

                                            },
                                            {
                                                xtype: 'combobox',
                                              
                                                fieldLabel: 'Type règlement',
                                                name: 'typeReglement',
                                                flex: 1,
                                                height: 30,
                                                store: Ext.create('Ext.data.Store', {
                                                    autoLoad: true,
                                                    pageSize: 999,

                                                    fields: [
                                                        {name: 'id', type: 'string'},
                                                        {name: 'libelle', type: 'string'}
                                                    ],
                                                    proxy: {
                                                        type: 'ajax',
                                                        url: '../api/v1/common/type-reglements',
                                                        reader: {
                                                            type: 'json',
                                                            root: 'data',
                                                            totalProperty: 'total'
                                                        }
                                                    }

                                                }),
                                                value: '1',
                                                valueField: 'id',
                                                displayField: 'libelle',
                                                typeAhead: true,
                                                queryMode: 'remote',
                                                emptyText: 'Choisir un type de reglement...'},
                                             {
                            xtype: 'datefield',
                            fieldLabel: 'Date',
                            name: 'dateReglement',
                           
                            submitFormat: 'Y-m-d',
                            height: 30, flex: 1,
                          
                            maxValue: new Date(),
                            format: 'd/m/Y'

                        },
                                            {
                            xtype: 'combobox',
                           flex: 1,
                                                height: 30,
                            fieldLabel: 'Motif réglèment',
                            name: 'motif',
                            store: me.getMotifReglementStore(),
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'local',
                            minChars: 2,
                            emptyText: 'Sélectionnez le motif'
                        },
                                            {
                                                xtype: 'textareafield',
                                                fieldLabel: 'Description',
                                                emptyText: 'Description',
                                                name: 'description',
                                                itemId: 'description',
                                                flex: 1
                                            }

                                        ]
                                    }
                                ]
                            }

                        ]
                    });
        } else {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 320,
                msg: 'Veuillez choisir le tiers-payant ',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING

            });
        }
    }
});