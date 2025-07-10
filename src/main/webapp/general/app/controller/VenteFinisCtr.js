/* global Ext */

Ext.define('testextjs.controller.VenteFinisCtr', {
    extend: 'Ext.app.Controller',
    requires: [
        'testextjs.model.caisse.Vente',
        'testextjs.view.vente.user.UpdateVenteClientTpForm', 'testextjs.view.vente.DetailVente', 'testextjs.view.vente.form.VenteDateForm'
    ],
    views: ['testextjs.view.vente.VentesFinis'],
    refs: [{
            ref: 'ventemanager',
            selector: 'ventemanager'
        },
        {
            ref: 'queryBtn',
            selector: 'ventemanager #rechercher'
        },
        {
            ref: 'ventemanagerGrid',
            selector: 'ventemanager gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'ventemanager gridpanel pagingtoolbar'
        }
        , {
            ref: 'dtStart',
            selector: 'ventemanager #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'ventemanager #dtEnd'
        }

        , {
            ref: 'hStart',
            selector: 'ventemanager #hStart'
        }, {
            ref: 'hEnd',
            selector: 'ventemanager #hEnd'
        }
        , {
            ref: 'queryField',
            selector: 'ventemanager #query'
        }, {
            ref: 'typeVente',
            selector: 'ventemanager #typeVente'
        }, {
            ref: 'nature',
            selector: 'ventemanager #nature'
        }
        , {
            ref: 'salesItem',
            selector: 'salesItem'
        }



    ],
    config: {
        datemisajour: null
    },
    init: function (application) {
        this.control({
            'ventemanager gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'ventemanager #rechercher': {
                click: this.doSearch
            },
            'ventemanager #typeVente': {
                select: this.doSearch
            },
            'ventemanager #nature': {
                select: this.doSearch
            },
            'ventemanager gridpanel': {
                viewready: this.doInitStore
            },
            "ventemanager gridpanel actioncolumn": {
                printTicket: this.printTicket,
                remove: this.testSuppression,
                facture: this.onFacture,
                toEdit: this.onEdite,
                toExport: this.onbtnexportCsv,
                onSuggestion: this.onSuggestion,
                ticketModifie: this.printTicketR,
                toClientOrTp: this.onUpdateClientOrTp,
                toExportToJson: this.toExportToJson,
                goto: this.goto,
                onUpdateDate: this.onUpdateVenteDate
            },
            'ventemanager #query': {
                specialkey: this.onSpecialKey
            },
            'salesItem #btnCancel': {
                click: this.onCloseSalesItem
            }
        });
    },
    onCloseSalesItem: function () {
        const me = this;
        me.getSalesItem().destroy();
    },
    onUpdateClientOrTp: function (view, rowIndex, colIndex, item, e, rec, row) {
        if (rec.get('intPRICE') > 0 && !rec.get('cancel') && rec.get('modificationClientTp')) {
            Ext.create('testextjs.view.vente.user.UpdateVenteClientTpForm', {venteId: rec.get('lgPREENREGISTREMENTID')}).show();
        }

    },
    onUpdateVenteDate: function (view, rowIndex, colIndex, item, e, rec, row) {
        if (rec.get('intPRICE') > 0 && !rec.get('cancel') && rec.get('modificationVenteDate') && rec.get('strTYPEVENTE') === "VO") {
            Ext.create('testextjs.view.vente.form.VenteDateForm', {vente: rec, grid: view}).show();
        }

    },
    /*
     * methode qui permet de rediriger l'impression du tiket selon que ça soit une ancienne version
     */
    checkIfODVersion: function () {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/common/datemisajour',
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.datemisajour = new Date(result.datemisajour);
                }
            }

        });
    },
    onEdite: function (view, rowIndex, colIndex, item, e, rec, row) {
        if (rec.get('intPRICE') > 0 && !rec.get('cancel') && rec.get('modification')) {
            const data = {'isEdit': true, 'record': rec.data, 'isDevis': false, 'categorie': 'COPY'};
            const xtype = "doventemanager";
            testextjs.app.getController('App').onRedirectTo(xtype, data);
        }

    },
    testSuppression: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        if (record.get('intPRICE') > 0) {
            if (record.get('beCancel') && !record.get('cancel')) {
                me.onRemoveClick(record);
            }
        }
    },
    updateInfosvente: function (win, formulaire, rec, linkUrl) {
        const me = this;
        if (formulaire.isValid()) {
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/client/add/venteclientinfos/' + rec.get('lgPREENREGISTREMENTID'),
                params: Ext.JSON.encode(formulaire.getValues()),
                success: function (response, options) {
                    progress.hide();
                    const result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        win.destroy();
                        window.open(linkUrl);
                        me.doSearch();

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
                    Ext.Msg.alert("Message", 'Erreur du système ' + response.status);
                }

            });
        }


    },
    onFacture: function (view, rowIndex, colIndex, item, e, rec, row) {
        const me = this;
        const client = rec.get('clientFullName');
        const linkUrl = '../webservices/sm_user/detailsvente/ws_generate_facture_pdf.jsp?lg_PREENREGISTREMENT_ID=' + rec.get('lgPREENREGISTREMENTID');
        if (client !== '') {
            window.open(linkUrl);
        } else {
            me.buildLambdaClientGrid(rec, linkUrl);
        }


    },
    onbtnexportCsv: function (view, rowIndex, colIndex, item, e, rec, row) {
        if (rec.get('lgTYPEVENTEID') === "5") {
            const liste_param = "search_value:" + rec.get('lgPREENREGISTREMENTID');
            const extension = "csv";
            window.location = '../MigrationServlet?table_name=TABLE_MISEAJOUR_STOCKDEPOT' + "&extension=" + extension + "&liste_param=" + liste_param;
        }

    },
    onSuggestion: function (view, rowIndex, colIndex, item, e, rec, row) {
        const me = this;
        if (rec.get('intPRICE') > 0 && !rec.get('cancel')) {
            Ext.MessageBox.confirm('Message',
                    'Voulez-vous envoyer la vente ' + rec.get('strREF') + ' en suggestion',
                    function (btn) {
                        if (btn === 'yes') {

                            Ext.Ajax.request({
                                timeout: 240000,
                                url: "../webservices/sm_user/detailsvente/suggestion.jsp?mode=generate_suggestion",
                                params: {
                                    lg_PREENREGISTREMENT_ID: rec.get('lgPREENREGISTREMENTID')
                                },
                                success: function (response)
                                {
                                    const object = Ext.JSON.decode(response.responseText, false);
                                    if (object.success == "0") {
                                        Ext.MessageBox.alert('Error Message', object.errors);
                                    } else {
                                        Ext.MessageBox.alert('confirmation', object.errors);
                                        me.doSearch();
                                    }
                                },
                                failure: function (response)
                                {

                                    Ext.MessageBox.alert('Error Message', response.responseText);
                                }
                            });
                        }
                    });
        }

    },
    printTicketR: function (view, rowIndex, colIndex, item, e, rec, row) {
        const me = this;
        me.onPrintTicket(rec.get('lgPREENREGISTREMENTID'), rec.get('lgTYPEVENTEID'), false);
    },
    printTicket: function (view, rowIndex, colIndex, item, e, rec, row) {
        const me = this;
        if (me.getDatemisajour()) {
            let dateVente = new Date(rec.get('mvdate'));
            if (dateVente.getTime() < me.getDatemisajour().getTime()) {
                const url_services_pdf_ticket = '../webservices/sm_user/detailsvente/ws_generate_pdf.jsp?lg_PREENREGISTREMENT_ID=' + rec.get('lgPREENREGISTREMENTID');
                Ext.Ajax.request({
                    url: url_services_pdf_ticket
                });
            } else {
                me.onPrintTicket(rec.get('lgPREENREGISTREMENTID'), rec.get('lgTYPEVENTEID'), rec.get('copy'));
            }
        } else {
            me.onPrintTicket(rec.get('lgPREENREGISTREMENTID'), rec.get('lgTYPEVENTEID'), rec.get('copy'));
        }
    },
    onPrintTicket: function (id, lgTYPEVENTEID, copy) {
        let url = (lgTYPEVENTEID === '1') ? '../api/v1/vente/ticket/vno/' + id : '../api/v1/vente/ticket/vo/' + id;
        if (copy) {
            url = '../api/v1/vente/copy/' + id;
        }
        if (lgTYPEVENTEID === '5') {
            url = '../api/v1/vente/ticket/depot/' + id;
        }
        let progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            headers: {'Content-Type': 'application/json'},
            method: 'POST',
            url: url,
            success: function (response, options) {
                progress.hide();
            },
            failure: function (response, options) {
                progress.hide();
            }

        });
    },
    onRemoveClick: function (rec) {
        const me = this;
        Ext.MessageBox.confirm('Message',
                'Voulez-Vous Annuler La Vente',
                function (btn) {
                    if (btn === 'yes') {
                        let progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                        Ext.Ajax.request({
                            timeout: 240000,
                            method: 'GET',
                            url: '../api/v1/vente/annulation/' + rec.get('lgPREENREGISTREMENTID'),
                            success: function (response)
                            {
                                progress.hide();
                                const object = Ext.JSON.decode(response.responseText, false);
                                if (object.success) {

                                    Ext.MessageBox.confirm('Message',
                                            'Confirmer l\'impression du ticket',
                                            function (btn) {
                                                if (btn === 'yes') {
                                                    me.onPrintTicket(object.ref, rec.get('lgTYPEVENTEID'));
                                                }
                                            });
                                    me.doSearch();
                                } else {
                                    progress.hide();
                                    Ext.MessageBox.alert('Error Message', object.msg);
                                }

                            },
                            failure: function (response)
                            {
                                progress.hide();
                                Ext.MessageBox.alert('Error Message', "L'opération a échoué");
                            }
                        });
                    }
                });
    },
    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getVentemanagerGrid().getStore().getProxy();
        myProxy.params = {
            query: null,
            typeVenteId: null,
            dtStart: null,
            dtEnd: null,
            hEnd: null,
            hStart: null,
            onlyAvoir: false,
            sansBon: false,
            nature: null

        };
        myProxy.setExtraParam('sansBon', false);
        myProxy.setExtraParam('onlyAvoir', false);
        myProxy.setExtraParam('query', me.getQueryField().getValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('typeVenteId', me.getTypeVente().getValue());
        myProxy.setExtraParam('hStart', me.getHStart().getSubmitValue());
        myProxy.setExtraParam('hEnd', me.getHEnd().getSubmitValue());
        myProxy.setExtraParam('nature', me.getNature().getValue());
    },
    doInitStore: function () {
        const me = this;
        me.doSearch();
        me.checkIfODVersion();
    },
    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            me.doSearch();
        }
    },
    doSearch: function () {
        const me = this;
        me.getVentemanagerGrid().getStore().load({
            params: {
                "query": me.getQueryField().getValue(),
                "dtStart": me.getDtStart().getSubmitValue(),
                "dtEnd": me.getDtEnd().getSubmitValue(),
                "typeVenteId": me.getTypeVente().getValue(),
                "hStart": me.getHStart().getSubmitValue(),
                "hEnd": me.getHEnd().getSubmitValue(),
                "onlyAvoir": false,
                "sansBon": false,
                "nature": me.getNature().getValue()
            }
        });
    },
    toExportToJson: function (view, rowIndex, colIndex, item, e, rec, row) {
        window.location = '../api/v1/vente-depot/as/order/' + rec.get('lgPREENREGISTREMENTID');
    },
    goto: function (view, rowIndex, colIndex, item, e, rec, row) {
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventestats/find-one/' + rec.get('lgPREENREGISTREMENTID'),
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                Ext.create('testextjs.view.vente.DetailVente', {vente: result.data}).show();
            }

        });
    },
    buildForm: function (rec, linkUrl) {
        const me = this;
        const form = Ext.create('Ext.window.Window',
                {
                    extend: 'Ext.window.Window',
                    autoShow: true,
                    height: 320,
                    width: '50%',
                    modal: true,
                    title: 'Mise à jour des infos du client',
                    closeAction: 'hide',
                    closable: true,
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },
                    items: [
                        {
                            xtype: 'form',
                            bodyPadding: 5,
                            modelValidation: true,
                            layout: {
                                type: 'fit',
                                align: 'stretch'
                            },
                            items: [

                                {
                                    xtype: 'fieldset',
                                    title: 'Information sur le client',
                                    layout: 'anchor',
                                    defaults: {
                                        anchor: '100%',
                                        xtype: 'textfield',
                                        msgTarget: 'side',
                                        labelAlign: 'right',
                                        labelWidth: 115
                                    },
                                    items: [
                                        {
                                            fieldLabel: 'Nom',
                                            emptyText: 'Nom',
                                            name: 'strFIRSTNAME',
                                            height: 35,
                                            allowBlank: false,
                                            enableKeyEvents: true,
                                            listeners: {
                                                afterrender: function (field) {
                                                    field.focus(true, 50);
                                                },
                                                specialKey: function (field, e) {
                                                    if (e.getKey() === e.ENTER) {
                                                        let formulaire = field.up('form');
                                                        me.updateInfosvente(form, formulaire, rec, linkUrl);
                                                    }
                                                }
                                            }

                                        }, {
                                            fieldLabel: 'Prénom',
                                            emptyText: 'Prénom',
                                            name: 'strLASTNAME',
                                            height: 35,
                                            allowBlank: false,
                                            enableKeyEvents: true,
                                            listeners: {
                                                specialKey: function (field, e) {
                                                    if (e.getKey() === e.ENTER) {
                                                        let formulaire = field.up('form');
                                                        me.updateInfosvente(form, formulaire, rec, linkUrl);
                                                    }
                                                }
                                            }

                                        },
                                        {
                                            fieldLabel: 'Téléphone',
                                            emptyText: 'Téléphone',
                                            name: 'strADRESSE',
                                            height: 35,
                                            regex: /[0-9.]/,
                                            allowBlank: false,
                                            enableKeyEvents: true,
                                            listeners: {
                                                specialKey: function (field, e) {
                                                    if (e.getKey() === e.ENTER) {
                                                        const formulaire = field.up('form');
                                                        me.updateInfosvente(form, formulaire, rec, linkUrl);
                                                    }
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'hiddenfield',
                                            name: 'lgTYPECLIENTID',
                                            value: '6',
                                            allowBlank: false
                                        },
                                        {
                                            xtype: "radiogroup",
                                            fieldLabel: "Genre",
                                            allowBlank: true,
                                            vertical: true,
                                            items: [
                                                {boxLabel: 'Féminin', name: 'strSEXE', inputValue: 'F'},
                                                {boxLabel: 'Masculin', name: 'strSEXE', inputValue: 'M'}
                                            ]
                                        }

                                    ]
                                }

                            ],
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
                                                const formulaire = btn.up('form');
                                                me.updateInfosvente(form, formulaire, rec, linkUrl);
                                            }
                                        },
                                        {
                                            xtype: 'button',
                                            text: 'Annuler',
                                            handler: function (btn) {
                                                form.destroy();
                                            }

                                        }
                                    ]
                                }
                            ]
                        }
                    ]

                });
    },
    buildLambdaClientGrid: function (rec, linkUrl) {
        const me = this;
        const form = Ext.create('Ext.window.Window',
                {
                    extend: 'Ext.window.Window',
                    autoShow: true,
                    height: 390,
                    width: '50%',
                    modal: true,
                    title: 'Mise à jour des infos du client',
                    closeAction: 'destroy',
                    maximizable: true,
                    closable: true,
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },
                    items: [{

                            xtype: 'grid',
                            itemId: 'lambdaClientGrid',
                            selModel: {
                                selType: 'rowmodel',
                                mode: 'SINGLE'
                            },
                            store: Ext.create('Ext.data.Store', {
                                autoLoad: false,
                                pageSize: null,
                                model: 'testextjs.model.caisse.ClientLambda',
                                proxy: {
                                    type: 'ajax',
                                    url: '../api/v1/client/lambda',
                                    reader: {
                                        type: 'json',
                                        root: 'data',
                                        totalProperty: 'total'
                                    }
                                }

                            }),
                            height: 'auto',
                            minHeight: 350,
                            columns: [
                                {
                                    text: '#',
                                    width: 30,
                                    dataIndex: 'lgCLIENTID',
                                    hidden: true

                                },
                                {
                                    xtype: 'rownumberer',
                                    text: 'LG',
                                    width: 45,
                                    sortable: true
                                }, {
                                    text: 'Nom',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'strFIRSTNAME'
                                }, {
                                    header: 'Prénom(s)',
                                    dataIndex: 'strLASTNAME',
                                    flex: 1

                                },
                                {
                                    header: 'Téléphone',
                                    dataIndex: 'strADRESSE',
                                    flex: 1

                                },
                                {
                                    header: 'E-mail',
                                    dataIndex: 'email',
                                    flex: 1

                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [
                                        {
                                            icon: 'resources/images/icons/add16.gif',
                                            tooltip: 'Ajouter',
                                            scope: this,
                                            handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                                const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                                                Ext.Ajax.request({
                                                    method: 'PUT',
                                                    url: '../api/v1/vente/update-vno-client/' + rec.get('lgPREENREGISTREMENTID') + '/' + record.get('lgCLIENTID'),

                                                    success: function (response, options) {
                                                        progress.hide();
                                                        form.destroy();
                                                        window.open(linkUrl);
                                                        me.doSearch();
                                                    },
                                                    failure: function (response, options) {
                                                        progress.hide();
                                                        Ext.Msg.alert("Message", 'Erreur du système ' + response.status);
                                                    }

                                                });


                                            }

                                        }]
                                }],
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
                                            text: 'Annuler',
                                            handler: function () {
                                                form.destroy();
                                            }

                                        }
                                    ]
                                },

                                {
                                    xtype: 'toolbar',
                                    dock: 'top',
                                    ui: 'footer',
                                    items: [
                                        {
                                            xtype: 'textfield',
                                            itemId: 'queryClientLambda',
                                            emptyText: 'Taper ici pour rechercher',
                                            width: '60%',
                                            height: 35,
                                            enableKeyEvents: true,
                                            listeners: {
                                                specialKey: function (field, e) {
                                                    if (e.getKey() === e.ENTER) {
                                                        form.query('#lambdaClientGrid')[0].getStore().load({
                                                            params: {
                                                                query: field.getValue()
                                                            }
                                                        });
                                                    }
                                                }

                                            }
                                        }, '-', {
                                            text: 'rechercher',
                                            tooltip: 'rechercher',
                                            scope: this,
                                            itemId: 'btnRechercheLambda',
                                            iconCls: 'searchicon',
                                            handler: function (buton) {
                                                const query = form.query('#queryClientLambda')[0];

                                                form.query('#lambdaClientGrid')[0].getStore().load({
                                                    params: {
                                                        query: query.getValue()
                                                    }
                                                });

                                            }

                                        },
                                        '-', {
                                            text: 'Nouveau client',
                                            scope: this,
                                            itemId: 'btnAddNewLambda',
                                            icon: 'resources/images/icons/add16.gif',
                                            handler: function () {
                                                form.destroy();
                                                me.buildForm(rec, linkUrl);
                                            }

                                        }
                                    ]
                                }
                            ]


                        }]});
    }
});


