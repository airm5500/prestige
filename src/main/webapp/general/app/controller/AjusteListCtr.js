/* global Ext */

Ext.define('testextjs.controller.AjusteListCtr', {
    extend: 'Ext.app.Controller',
    requires: [
        'testextjs.model.caisse.Ajustement'
    ],
    views: ['testextjs.view.produits.AjustementTabPanel', 'testextjs.view.produits.Ajustement',
        'testextjs.view.produits.AnalyseAjustement', 'testextjs.view.produits.ItemAjustement'],
    refs: [{
            ref: 'ajustementmanagerlist',
            selector: 'ajustementgestion'
        },
        {
            ref: 'itemAjustement',
            selector: 'itemAjustement'
        },
        {ref: 'commentaire',
            selector: 'itemAjustement #commentaire'
        },
        {
            ref: 'queryBtn',
            selector: 'ajustementgestion #rechercher'
        }, {
            ref: 'typeAjustement',
            selector: 'ajustementgestion #typeAjustement'
        },

        {
            ref: 'ajustementmanagerGrid',
            selector: 'ajustementgestion gridpanel'
        },
        {
            ref: 'itemAjustementGrid',
            selector: 'itemAjustement gridpanel'
        }, {
            ref: 'pagingDetail',
            selector: 'itemAjustement gridpanel pagingtoolbar'
        }
        ,

        {
            ref: 'pagingtoolbar',
            selector: 'ajustementgestion gridpanel pagingtoolbar'
        }
        ,

        {
            ref: 'dtStart',
            selector: 'ajustementgestion #dtStart'
        },
        {
            ref: 'userName',
            selector: 'itemAjustement #userName'
        }, {
            ref: 'dateOp',
            selector: 'itemAjustement #dateOp'
        },

        {
            ref: 'dtEnd',
            selector: 'ajustementgestion #dtEnd'
        }

        , {
            ref: 'queryField',
            selector: 'ajustementgestion #query'
        }
        , {
            ref: 'detailQuery',
            selector: 'itemAjustement #query'
        }

        , {
            ref: 'addBtn',
            selector: 'ajustementgestion #addBtn'
        }
    ],
    config: {
        data: null
    },
    init: function (application) {
        this.control({
            'ajustementgestion gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'itemAjustement gridpanel pagingtoolbar': {
                beforechange: this.doBeforechangeDetails
            },

            'itemAjustement': {
                render: this.onReady
            },
            'ajustementgestion #rechercher': {
                click: this.doSearch
            },
            'itemAjustement #btnRecherche': {
                click: this.doSearchDetails
            },
            'ajustementgestion gridpanel': {
                viewready: this.doInitStore,
                inventaireAjustement: this.onInventaireAjustement,
                suggestionAjustement: this.onSuggestionAjustement
            },
            'itemAjustement gridpanel': {
                viewready: this.doInitDetailsStore
            },

            'ajustementgestion #query': {
                specialkey: this.onSpecialKey
            },
            'itemAjustement #query': {
                specialkey: this.onSpecialQuery
            },

            "ajustementgestion gridpanel actioncolumn": {
                toItem: this.toItem,
                print: this.print
            },
            'ajustementgestion #addBtnRayon': {
                click: this.onAddRayonClick
            },
            'ajustementgestion #addBtnReserve': {
                click: this.onAddReserveClick
            },
            'ajustementgestion #zoneFiltre': {
                select: this.doSearch
            },
            'itemAjustement [xtype=toolbar] #btnGoBack': {
                click: this.goBack
            },
            'itemAjustement [xtype=toolbar] #btnCloture': {
                click: this.onPrintPdf
            },
            'ajustementgestion #imprimer': {
                click: this.onPdfClick
            },
            'ajustementgestion #exportCsv': {
                click: this.onExportCsvClick
            },
            'ajustementgestion #exportExcel': {
                click: this.onExportExcelClick
            },
            'ajustementgestion #creerSuggestion': {
                click: this.onCreerSuggestionClick
            },
            'ajustementgestion #creerInventaire': {
                click: this.onCreerInventaireClick
            },
        });
    },
    buildAnalyseParams: function () {
        var me = this;
        return 'dtStart=' + me.getDtStart().getSubmitValue() + '&dtEnd=' + me.getDtEnd().getSubmitValue();
    },
    onExportCsvClick: function () {
        window.location = '../api/v1/ajustement/analyse/csv?' + this.buildAnalyseParams();
    },
    onExportExcelClick: function () {
        window.location = '../api/v1/ajustement/analyse/excel?' + this.buildAnalyseParams();
    },
    onCreerSuggestionClick: function () {
        this.doAnalyseAction('suggestion',
                'Cr&eacute;er une suggestion avec les produits ajust&eacute;s sur la p&eacute;riode ?',
                'Suggestion cr&eacute;&eacute;e');
    },
    onCreerInventaireClick: function () {
        this.doAnalyseAction('inventaire',
                'Cr&eacute;er un inventaire avec les produits ajust&eacute;s sur la p&eacute;riode ?',
                'Inventaire cr&eacute;&eacute;');
    },
    doAnalyseAction: function (action, confirmMsg, successMsg) {
        var me = this;
        Ext.MessageBox.confirm('Message', confirmMsg, function (btn) {
            if (btn === 'yes') {
                var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                Ext.Ajax.request({
                    method: 'GET',
                    url: '../api/v1/ajustement/analyse/' + action + '?' + me.buildAnalyseParams(),
                    success: function (response) {
                        progress.hide();
                        var result = Ext.JSON.decode(response.responseText, true);
                        if (result && result.success) {
                            Ext.MessageBox.alert('Confirmation', successMsg + ' : ' + result.count + ' produit(s).');
                        } else {
                            Ext.MessageBox.alert('Message', 'Aucun produit ajust&eacute; sur la p&eacute;riode.');
                        }
                    },
                    failure: function (response) {
                        progress.hide();
                        Ext.MessageBox.alert('Error Message', response.responseText);
                    }
                });
            }
        });
    },
    onPrintPdf: function () {
        var me = this;
        var data = me.getData();
        var id = data.lgAJUSTEMENTID;
        var url = '../webservices/stockmanagement/ajustementmanagement/ws_generate_pdf.jsp?lg_AJUSTEMENT_ID=' + id;
        window.open(url);
        //me.goBack();
    },
    goBack: function () {
        var xtype = 'ajustementmanager';
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },

    onAddRayonClick: function () {
        this.ouvrirCreation('RAYON');
    },

    onAddReserveClick: function () {
        this.ouvrirCreation('RESERVE');
    },

    /**
     * Ouvre la saisie sur la zone choisie.
     *
     * La zone est portee par le bouton et non plus par une liste deroulante : elle est donc
     * connue avant le premier produit, ne peut pas etre changee en cours de saisie, et le meme
     * produit dans les deux zones se traite naturellement par deux ajustements distincts.
     */
    ouvrirCreation: function (zone) {
        window.PRESTIGE_AJUSTEMENT_ZONE = zone;
        var xtype = "doajustementmanager";
        var data = {'isEdit': false, 'record': {}};
        testextjs.app.getController('App').onRedirectTo(xtype, data);
    },

    /** Inventaire portant sur les produits de l'ajustement de la ligne. */
    onInventaireAjustement: function (record) {
        var id = record.get('lgAJUSTEMENTID');
        Ext.MessageBox.confirm('Creer un inventaire',
                'Creer un inventaire sur les produits de cet ajustement ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Creation de l\'inventaire');
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/ajustement/' + encodeURIComponent(id) + '/inventaire',
                        jsonData: {},
                        success: function (response) {
                            progress.hide();
                            var res = Ext.JSON.decode(response.responseText, true) || {};
                            Ext.MessageBox.alert(res.success === false ? 'Message' : 'Inventaire cree',
                                    res.message || res.msg || 'Inventaire cree.');
                        },
                        failure: function () {
                            progress.hide();
                            Ext.MessageBox.alert('Erreur', 'La creation de l\'inventaire a echoue.');
                        }
                    });
                });
    },

    /** Suggestion de reserve portant sur les produits de l'ajustement de la ligne. */
    onSuggestionAjustement: function (record) {
        var id = record.get('lgAJUSTEMENTID');
        // Le sens est celui de la zone ajustee : un ajustement de la reserve appelle un
        // rangement en reserve, un ajustement du rayon un reappro du rayon.
        var categorie = (record.get('zone') === 'RESERVE') ? 'RESERVE' : 'RAYON';
        var storeMotifs = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'],
            proxy: {
                type: 'ajax', url: '../api/v1/suggestion-reserve/motifs',
                extraParams: {categorie: categorie}, reader: {type: 'json'}
            }
        });
        storeMotifs.load();

        var win = Ext.create('Ext.window.Window', {
            title: 'Creer une suggestion depuis cet ajustement',
            width: 520, modal: true, bodyPadding: 10, layout: 'anchor',
            defaults: {anchor: '100%', labelWidth: 90},
            items: [
                {
                    xtype: 'component',
                    html: '<div style="margin-bottom:8px;color:#0b57d0;font-weight:bold;">'
                            + 'La suggestion portera sur les produits de cet ajustement.</div>'
                },
                {
                    xtype: 'combo', itemId: 'cboMotifAj', fieldLabel: 'Motif *',
                    editable: false, allowBlank: false, forceSelection: true, queryMode: 'local',
                    displayField: 'libelle', valueField: 'id',
                    emptyText: 'Motif (obligatoire)', store: storeMotifs
                },
                {xtype: 'textfield', itemId: 'txtComAj', fieldLabel: 'Commentaire', emptyText: 'Facultatif'}
            ],
            buttons: [
                {
                    text: 'Creer la suggestion',
                    handler: function () {
                        var cbo = win.down('#cboMotifAj');
                        if (!cbo || !cbo.getValue()) {
                            cbo.markInvalid('Motif obligatoire');
                            Ext.MessageBox.alert('Motif obligatoire',
                                    'Indiquez le motif de cette suggestion avant de la creer.');
                            return;
                        }
                        var com = win.down('#txtComAj');
                        var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Creation en cours');
                        Ext.Ajax.request({
                            method: 'POST',
                            url: '../api/v1/ajustement/' + encodeURIComponent(id) + '/suggestion',
                            jsonData: {
                                categorie: categorie,
                                motifId: cbo.getValue(),
                                commentaire: com ? com.getValue() : null
                            },
                            success: function (response) {
                                progress.hide();
                                var res = Ext.JSON.decode(response.responseText, true) || {};
                                if (res.success === false) {
                                    Ext.MessageBox.alert('Message', res.message || 'Creation impossible.');
                                    return;
                                }
                                win.close();
                                Ext.MessageBox.alert('Suggestion creee',
                                        (res.message || '') + '<br>Retrouvez-la dans la gestion des reserves, '
                                        + 'onglet SUGGESTIONS.');
                            },
                            failure: function () {
                                progress.hide();
                                Ext.MessageBox.alert('Erreur', 'La creation a echoue.');
                            }
                        });
                    }
                },
                {text: 'Annuler', handler: function () {
                        win.close();
                    }}
            ]
        });
        win.show();
    },
    toItem: function (view, rowIndex, colIndex, item, e, record, row) {
        var me = this;
        me.goToItem(record);

    },
    print: function (view, rowIndex, colIndex, item, e, record, row) {
        var me = this;
        me.printTicket(record.get('lgAJUSTEMENTID'));
    },

    goToItem: function (rec) {
        var data = {'record': rec.data, 'isEdit': true};
        var xtype = "itemAjustement";
        testextjs.app.getController('App').onRedirectTo(xtype, data);
    },
    printTicket: function (id) {
        var linkUrl = '../webservices/stockmanagement/ajustementmanagement/ws_generate_pdf.jsp?lg_AJUSTEMENT_ID=' + id;
        Ext.MessageBox.confirm('Message',
                'Confirmation de l\'impression du detail de cet ajustement',
                function (btn) {
                    if (btn == 'yes') {
                        window.open(linkUrl);
                        return;
                    }
                });

    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getAjustementmanagerGrid().getStore().getProxy();

        myProxy.params = {
            query: null,
            dtStart: null,
            dtEnd: null,
            typeFiltre: null

        };

        myProxy.setExtraParam('typeFiltre', me.getTypeAjustement().getValue());
        var zone = me.getZoneFiltre();
        myProxy.setExtraParam('zone', (zone && zone.getValue()) ? zone.getValue() : '');
        myProxy.setExtraParam('query', me.getQueryField().getValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

    },
    doInitDetailsStore: function () {
        var me = this;
        me.doSearchDetails();

    },
    doInitStore: function () {
        var me = this;
        me.doSearch();

    },
    onReady: function () {
        var me = this;
        me.data = null;
        var me = this, view = me.getItemAjustement();
        var rec = view.getData().record;
        me.data = rec;
    },
    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearch();
        }
    },
    doBeforechangeDetails: function (page, currentPage) {
        const me = this;
        const myProxy = me.getItemAjustementGrid().getStore().getProxy();
        let ajustement = me.getData();
        let ajustementId = null;
        if (ajustement) {
            ajustementId = ajustement.lgAJUSTEMENTID;
        }
        let query = me.getDetailQuery().getValue();
        myProxy.params = {
            ajustementId: ajustementId,
            query: query

        };
        myProxy.setExtraParam('ajustementId', ajustementId);
        myProxy.setExtraParam('query', query);

    },
    onSpecialQuery: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearchDetails();
        }
    },
    doSearchDetails: function () {
        var me = this;
        var ajustement = me.getData();
        var detailQuery = me.getDetailQuery().getValue();
        var ajustementId = null;
        if (ajustement) {
            ajustementId = ajustement.lgAJUSTEMENTID;
        }
        me.getItemAjustementGrid().getStore().load({
            params: {
                "ajustementId": ajustementId,
                "query": detailQuery
            }, callback: function (records, operation, successful) {

                me.getUserName().setValue(ajustement.userFullName);
                me.getDateOp().setValue(ajustement.dtUPDATED);
                me.getCommentaire().setValue(ajustement.commentaire);
            }
        });
    },
    doSearch: function () {
        var me = this;
        me.getAjustementmanagerGrid().getStore().load({
            params: {
                "query": me.getQueryField().getValue(),
                "dtStart": me.getDtStart().getSubmitValue(),
                "dtEnd": me.getDtEnd().getSubmitValue(),
                "typeFiltre": me.getTypeAjustement().getValue(),
                "zone": me.getZoneFiltre() && me.getZoneFiltre().getValue()
                        ? me.getZoneFiltre().getValue() : ''
            }
        });
    },
    onPdfClick: function () {
        var me = this;
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var query = me.getQueryField().getValue();
        var typeFiltre = me.getTypeAjustement().getValue();
        if (typeFiltre == null) {
            typeFiltre = '';
        }
        var linkUrl = '../DataReportingServlet?mode=ALL_AJUSTEMENTS&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&typeFiltre=' + typeFiltre + '&query=' + query;
        window.open(linkUrl);
    }

});