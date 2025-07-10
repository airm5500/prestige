
/* global Ext */

Ext.define('testextjs.controller.AvoirCtr', {
    extend: 'Ext.app.Controller',
    models: [
        'testextjs.model.caisse.Produit',
        'testextjs.model.caisse.VenteItem'

    ],
    views: [
        'testextjs.view.vente.TerminerAvoir'
    ],
    config: {
        current: null,
        client: null,
        ayantDroit: null

    },
    refs: [

        {
            ref: 'doAvoir',
            selector: 'doAvoir'
        }

        , {
            ref: 'contenu',
            selector: 'doAvoir #contenu'
        },
        {
            ref: 'infosClientStandard',
            selector: 'doAvoir #contenu #clientStandard'
        },
        {
            ref: 'totalField',
            selector: 'doAvoir #contenu #totalField'
        },
        {
            ref: 'nom',
            selector: 'doAvoir #nom'
        },

        {
            ref: 'mobile',
            selector: 'doAvoir #mobile'
        },
        {
            ref: 'nomAssure',
            selector: 'doAvoir #nomAssure'
        },

        {
            ref: 'numAssure',
            selector: 'doAvoir #numAssure'
        },
        {
            ref: 'nomAyant',
            selector: 'doAvoir #nomAyant'
        },

        {
            ref: 'numAyant',
            selector: 'doAvoir #numAyant'
        },
        {
            ref: 'refVente',
            selector: 'doAvoir #refVente'
        },
        {
            ref: 'vendeur',
            selector: 'doAvoir #vendeur'
        }, {
            ref: 'caissier',
            selector: 'doAvoir #caissier'
        },

        {
            ref: 'categorieVente',
            selector: 'doAvoir #categorieVente'
        },
        {
            ref: 'montant',
            selector: 'doAvoir #montant'
        },
        {
            ref: 'montantNet',
            selector: 'doAvoir #montantNet'
        },
        {
            ref: 'montantRemise',
            selector: 'doAvoir #montantRemise'
        },
        {
            ref: 'ventevno',
            selector: 'doAvoir #contenu panel'
        },
        {
            ref: 'ventevnoPaging',
            selector: 'doAvoir #contenu pagingtoolbar'
        },
        {
            ref: 'tpContainer',
            selector: 'doAvoir #contenu #tpContainer'
        },

        /* {ref: 'typeVenteCombo',
         selector: 'doAvoir #typeVente'
         },*/

        {ref: 'vnobtnCloture',
            selector: 'doAvoir #contenu [xtype=toolbar] #btnCloture'
        },
        {ref: 'vnobtnGoBack',
            selector: 'doAvoir #contenu [xtype=toolbar] #btnGoBack'
        },
        {ref: 'vnogrid',
            selector: 'doAvoir #contenu #gridContainer #venteGrid'
        },
        {ref: 'vnoactioncolumn',
            selector: 'doAvoir #contenu [xtype=gridpanel] [xtype=actioncolumn]'
        },
        {ref: 'queryField',
            selector: 'doAvoir #contenu #gridContainer [xtype=gridpanel] #query'
        },
        {ref: 'vnopagingtoolbar',
            selector: 'doAvoir #contenu #gridContainer gridpanel #pagingtoolbar'
        },
        {ref: 'detailGrid',
            selector: 'doAvoir #contenu [xtype=gridpanel]'
        },
        {ref: 'assureCmp',
            selector: 'doAvoir #assureCmp'
        },
        {ref: 'ayantCmp',
            selector: 'doAvoir #ayantCmp'
        },

        {ref: 'pagingtoolbar',
            selector: 'doAvoir #contenu [xtype=gridpanel] #pagingtoolbar'
        }


    ],
    init: function () {
        this.control(
                {
                    'doAvoir': {
                        render: this.onReady
                    },
                    'doAvoir #contenu [xtype=gridpanel] pagingtoolbar': {
                        beforechange: this.doBeforechangeVno
                    },
                    'doAvoir #contenu [xtype=gridpanel] #btnRecherche': {
                        click: this.refresh
                    },
                    'doAvoir #contenu [xtype=gridpanel] #query': {
                        specialkey: this.onSpecialSpecialKey
                    },

                    'doAvoir #contenu [xtype=toolbar] #btnGoBack': {
                        click: this.goBack
                    },
                    'doAvoir #contenu [xtype=toolbar] #btnCloture': {
                        click: this.doCloture
                    }

                });
    },
    onReady: function () {
        var me = this;
        me.goToVenteView();


    },
    resettpContainer: function () {
        var me = this;
        me.getNomAssure().setValue('');
        me.getPrenomAssure().setValue('');
        me.getNumAssure().setValue('');
    },

    onSpecialSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.refresh();


        }
    },

    refresh: function () {
        var me = this;
        var vente = me.getCurrent();
        var venteId = null;
        if (vente) {
            venteId = vente.lgPREENREGISTREMENTID;
        }
        var query = me.getQueryField().getValue();
        var grid = me.getVnogrid();
        grid.getStore()
                .load({
                    params: {
                        venteId: venteId,
                        query: query,
                        statut: null
                    }
                });
    },

    doBeforechangeVno: function (page, currentPage) {
        var me = this;
        var myProxy = me.getVnogrid().getStore().getProxy();
        var vente = me.getCurrent();
        var venteId = null;
        if (vente) {
            venteId = vente.lgPREENREGISTREMENTID;
        }
        var query = me.getQueryField().getValue();
        myProxy.params = {
            venteId: null,
            query: null,
            statut: null

        };
        myProxy.setExtraParam('venteId', venteId);
        myProxy.setExtraParam('query', query);
        myProxy.setExtraParam('statut', null);
    },

    doSearch: function () {
        var me = this;
        me.refresh();
    },

    updateComboxFields: function (venteId) {
        var me = this;

        me.getTypeVenteCombo().getStore().load(function (records, operation, success) {
            me.getTypeVenteCombo().setValue(venteId);
        });
    },
    updateAmountFields: function (record) {
        var me = this;
        var strTYPEVENTENAME = record.strTYPEVENTENAME, userCaissierName = record.userCaissierName;
        var intPRICEREMISE = record.intPRICEREMISE, intPRICE = record.intPRICE, userFullName = record.userFullName
                ;
        me.getTotalField().setValue(intPRICE);
        me.getMontant().setValue(intPRICE);
        me.getMontantNet().setValue(intPRICE - intPRICEREMISE);
        me.getMontantRemise().setValue(intPRICEREMISE);
        me.getRefVente().setValue(record.strREF);
        me.getCategorieVente().setValue(strTYPEVENTENAME);
        me.getCaissier().setValue(userCaissierName);
        me.getVendeur().setValue(userFullName);
    },
    goBack: function () {
        var xtype = 'venteavoirmanager';
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },

    updateClientStandard: function (client) {
        const me = this;
        const clientStandard = me.getInfosClientStandard();
        clientStandard.show();
        me.getNom().setValue(client.strFIRSTNAME + ' ' + client.strLASTNAME);
        me.getMobile().setValue(client.strADRESSE);

    },
    updateAyantCmp: function (ayantDroit) {
        const me = this;
        if (ayantDroit) {
            me.getAyantCmp().show();
            me.getNomAyant().setValue(ayantDroit.strFIRSTNAME + ' ' + ayantDroit.strLASTNAME);
            me.getNumAyant().setValue(ayantDroit.strNUMEROSECURITESOCIAL);
        }
    },
    updateAssurerCmp: function (client) {
        const me = this;
        const assureCmp = me.getAssureCmp();

        assureCmp.show();
        if (client) {
            me.getNomAssure().setValue(client.strFIRSTNAME + ' ' + client.strLASTNAME);
            me.getNumAssure().setValue(client.strNUMEROSECURITESOCIAL);
        }
    },
    resetAyantCmp: function () {
        const me = this;
        me.getNomAyant().setValue('');
        me.getNumAyant().setValue('');

    },
    resteAssurerCmp: function () {
        const me = this;
        me.getNomAssure().setValue('');
        me.getNumAssure().setValue('');
    },
    resetClientStandard: function () {
        const me = this;
        me.getNom().setValue('');
        me.getMobile().setValue('');

    },
    loadVenteData: function (venteId) {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventestats/' + venteId,
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    var record = result.data;
                    var lgTYPEVENTEID = record.lgTYPEVENTEID,
                            ayantDroit = record.ayantDroit, client = record.client;
                    me.current = {
                        'intPRICE': record.intPRICE,
                        'lgPREENREGISTREMENTID': record.lgPREENREGISTREMENTID
                    };

                    me.ayantDroit = ayantDroit;

                    me.updateAmountFields(record);
                    if (lgTYPEVENTEID === '2' || lgTYPEVENTEID === '3') {
                        me.updateAssurerCmp(client);
                        me.updateAyantCmp(ayantDroit);
                    } else {

                        me.updateClientStandard(client);
                    }


                    me.refresh();


                }

            }
        });

    },
    loadExistant: function (record) {
        var me = this;
        me.loadVenteData(record.lgPREENREGISTREMENTID);
    },
    goToVenteView: function () {
        var me = this, view = me.getDoAvoir();
        var data = view.getData();
        if (data) {
            var isEdit = data.isEdit;
            if (isEdit) {
                var record = data.record;
                me.loadExistant(record);
            } else {
                me.current = null;
                me.client = null;

            }
        } else {
            me.current = null;

        }
    },

    resetAlls: function () {
        const me = this;
        me.current = null;
        me.client = null;
        me.getVnogrid().getStore().load();
        me.getTotalField().setValue(0);
        me.getVnobtnCloture().disable();



    },

    doCloture: function () {
        var me = this;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
//        me.resetAlls();
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/vente/clotureravoir/' + me.getCurrent().lgPREENREGISTREMENTID,
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    Ext.MessageBox.show({
                        title: 'Message',
                        width: 320,
                        msg: result.msg,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.INFO,
                        fn: function (buttonId) {
                            if (buttonId === "ok") {
                                me.goBack();
                            }
                        }
                    });

                } else {
                    Ext.Msg.alert("Message", 'Un problème avec le serveur');

                }

            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'Un problème avec le serveur');
            }
        });

    }


}
);
