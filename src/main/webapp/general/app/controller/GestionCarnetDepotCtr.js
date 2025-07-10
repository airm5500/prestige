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
    init: function (application) {
        this.control({
            'reglementdepot #btnVentePanel': {
                click: this.searchAll
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
    onSelectTiersPayant: function (cmp) {
        let me = this;
        let value = cmp.getValue();
        let record = cmp.findRecord("id" || "nomComplet", value);
        me.getAccountReglement().setValue(record.get('account'));
         me.getAccount().setValue(record.get('account'));
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
            linkUrl = '../TiersPayantExcludServlet?mode=RETOUR_CARNET_DEPOT&dtStart=' + dtStart +
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
    searchAll: function () {
        let me = this;
        let itemId = me.getReglementdepot().getLayout().getActiveItem().getItemId();
        if (itemId === 'ventePanel') {
            me.doSearchVente();
        } else if (itemId === 'reglementPanel') {
            me.doSearchReglement();
        } else if (itemId === 'produitsPanel') {
me.doSearchProduits();
        }else if(itemId === 'depensePanel'){
            me.doSearchDepense();
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