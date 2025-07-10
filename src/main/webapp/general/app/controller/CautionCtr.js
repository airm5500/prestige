/* global Ext */

Ext.define('testextjs.controller.CautionCtr', {
    extend: 'Ext.app.Controller',

    views: ['testextjs.view.caution.Caution', 'testextjs.view.caution.Add', 'testextjs.view.caution.Edit'],
    refs: [{
            ref: 'cautiontierspayant',
            selector: 'cautiontierspayant'
        },

        {
            ref: 'cautiontierspayantGrid',
            selector: 'cautiontierspayant gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'cautiontierspayant gridpanel pagingtoolbar'
        },
        {ref: 'rechercherButton',
            selector: 'cautiontierspayant #rechercher'

        },
        {ref: 'tiersPayantId',
            selector: 'cautiontierspayant #tiersPayantId'

        },
        {ref: 'cautionAddForm',
            selector: 'cautionAddForm'

        },
        {ref: 'form',
            selector: 'cautionAddForm form'

        },
        {
            ref: 'editForm',
            selector: 'cautionEditForm form'

        },
        {ref: 'btnsave',
            selector: 'cautionAddForm #btnsave'

        },
        {ref: 'btnCancel',
            selector: 'cautionAddForm #btnCancel'

        },
        {ref: 'cautionEditForm',
            selector: 'cautionEditForm'

        }, {ref: 'btnEdit',
            selector: 'cautionEditForm #btnsave'

        },
        {ref: 'btnCancelEdit',
            selector: 'cautionEditForm #btnCancel'

        },
        {ref: 'tiersPayantIdAddForm',
            selector: 'cautionAddForm #tiersPayantId'

        }




    ],
    init: function (application) {
        this.control({
            'cautiontierspayant gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },

            'cautiontierspayant #tiersPayantId': {
                select: this.doSearch
            },

            'cautiontierspayant gridpanel': {
                viewready: this.doInitStore
            },
            'cautiontierspayant #rechercher': {
                click: this.doSearch
            }
            ,
            "cautiontierspayant gridpanel actioncolumn": {
                remove: this.remove,
                editer: this.editer,
                fetchVentes: this.fetchVentes,
                fetchDepots: this.fetchDepots
            },

            'cautiontierspayant #addBtn': {
                click: this.add
            },
            'cautionAddForm #btnsave': {
                click: this.saveRecord
            },
            'cautionAddForm #btnCancel': {
                click: this.closeWindows
            },
            'cautionEditForm #btnsave': {
                click: this.edit
            },
            'cautionEditForm #btnCancel': {
                click: this.closeEditWindows
            }


        });
    },
    add: function () {
        const formwin = Ext.create('testextjs.view.caution.Add');
        formwin.show();
    },
    closeWindows: function () {
        const me = this;
        me.getCautionAddForm().destroy();
    },
    closeEditWindows: function () {
        const me = this;
        me.getCautionEditForm().destroy();
    },
   
   
    lunchPrinter: function (mvtCaisseId) {

        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/caisse/ticke-mvt-caisse?mvtCaisseId=' + mvtCaisseId,
            failure: function (response)
            {

                const object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + object);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });
    },
    edit: function () {
        const me = this;
        const   form = me.getEditForm();
        if (form.isValid()) {
            let datas = form.getValues();
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/cautions',
                params: Ext.JSON.encode(datas),
                success: function (response, options) {
                    progress.hide();
                    const result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 320,
                            msg: "Voulez-vous imprimer le ticket ?",
                            buttons: Ext.MessageBox.OKCANCEL,
                            icon: Ext.MessageBox.INFO,
                            fn: function (buttonId) {
                                if (buttonId === "ok") {

                                    me.lunchPrinter(result.mvtId);
                                }
                            }
                        });


                        me.closeEditWindows();
                        me.doSearch();
                    } else {
                        Ext.Msg.alert("Message", result.msg);
                    }




                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
                }
            });
        }

    },
    saveRecord: function () {
        const me = this;
        const   form = me.getForm();
        if (form.isValid()) {
            let datas = form.getValues();
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/cautions',
                params: Ext.JSON.encode(datas),
                success: function (response, options) {
                    progress.hide();
                    const result = Ext.JSON.decode(response.responseText, true);

                    if (result.success) {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 320,
                            msg: "Voulez-vous imprimer le ticket ?",
                            buttons: Ext.MessageBox.OKCANCEL,
                            icon: Ext.MessageBox.INFO,
                            fn: function (buttonId) {
                                if (buttonId === "ok") {

                                    me.lunchPrinter(result.mvtId);
                                }
                            }
                        });
                    } else {
                        Ext.Msg.alert("Message", result.msg);
                    }



                    me.closeWindows();
                    me.doSearch();
                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
                }
            });
        }

    },
    fetchDepots: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        me.buildHistorique(record);
      
    },
  
  
    fetchVentes: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        me.buildAchats(record);
     

    },
    editer: function (view, rowIndex, colIndex, item, e, record, row) {
        const formwin = Ext.create('testextjs.view.caution.Edit', {"idCaution": record.data.id, "tiersPayantName": record.data.tiersPayantName});
        formwin.show();

    },

    remove: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/cautions/' + record.get('id'),
            success: function (response, options) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.doSearch();
                } else {
                    Ext.Msg.alert("Message", result.msg);
                }

            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
            }
        });

    },

    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getCautiontierspayantGrid().getStore().getProxy();
        myProxy.params = {
            tiersPayantId: null
        };
        const query = me.getTiersPayantId().getValue();
        myProxy.setExtraParam('tiersPayantId', query);

    },
    doInitStore: function () {
        const me = this;
        me.doSearch();
    },


    doSearch: function () {
        const me = this;
        const query = me.getTiersPayantId().getValue();
        me.getCautiontierspayantGrid().getStore().load({
            params: {
                tiersPayantId: query

            }
        });
    },

    buildHistorique: function (rec) {
        const me = this;
        const dtStart = new Ext.form.field.Date({
            //  xtype: 'datefield',
            fieldLabel: 'Du',
            itemId: 'dtStart',
            margin: '0 10 0 0',
            submitFormat: 'Y-m-d',
            flex: 1,
            labelWidth: 20,
            maxValue: new Date(),
            value: new Date(),
            format: 'd/m/Y'

        });
        const dtEnd = new Ext.form.field.Date({
            //  xtype: 'datefield',
            fieldLabel: 'Au',
            itemId: 'dtEnd',
            labelWidth: 20,
            flex: 1,
            maxValue: new Date(),
            value: new Date(),
            margin: '0 9 0 0',
            submitFormat: 'Y-m-d',
            format: 'd/m/Y'
        });
        const historiques = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {
                            name: 'id',
                            type: 'string'
                        },

                        {
                            name: 'mvtDate',
                            type: 'string'
                        }
                        ,
                        {
                            name: 'user',
                            type: 'string'
                        },

                        {
                            name: 'montant',
                            type: 'int'
                        }

                    ], autoLoad: false,
            pageSize: 999999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/cautions/historiques',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });

        historiques.load({
            params: {
                idCaution: rec.get('id'),
                dtStart: dtStart.getSubmitValue(),
                dtEnd: dtEnd.getSubmitValue()
            }
        });
        const form = Ext.create('Ext.window.Window',
                {
                    xtype: 'cautionHistoriques',
                    alias: 'widget.cautionHistoriques',
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: '<span style="font-size:14px;">Historiques de depôts de ' + rec.get('tiersPayantName') + '</span>',

                    closeAction: 'hide',

                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                dtStart, dtEnd, {
                                    xtype: 'button',
                                    itemId: 'rechercher',
                                    iconCls: 'searchicon',
                                    text: 'Rechercher'
                                    ,
                                    handler: function () {
                                        historiques.load({
                                            params: {
                                                idCaution: rec.get('id'),
                                                dtStart: dtStart.getSubmitValue(),
                                                dtEnd: dtEnd.getSubmitValue()
                                            }
                                        });
                                    }

                                },
                                {
                                    xtype: 'button',
                                    itemId: 'btnPrint',
                                    iconCls: 'printable',
                                    // scope: this,
                                    text: 'Imprimer', handler: function () {
                                        const me = this;
                                        let dtStartV = dtStart.getSubmitValue();
                                        if (dtStartV === null || dtStartV === undefined) {
                                            dtStartV = '';
                                        }
                                        let dtEndV = dtEnd.getSubmitValue();
                                        if (dtEndV === null || dtEndV === undefined) {
                                            dtEndV = '';
                                        }
                                        const linkUrl = '../cautionServlet?mode=historiques&idCaution=' + rec.get('id') + '&dtStart=' + dtStartV + '&dtEnd=' + dtEndV;
                                        window.open(linkUrl);
                                    }

                                }

                            ]
                        },
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
                                    itemId: 'btnCancel',
                                    text: 'Fermer',
                                    handler: function () {
                                        form.destroy();
                                    }

                                }
                            ]
                        }
                    ],
                    items: [
                        {
                            xtype: 'gridpanel',
                            store: historiques,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns:
                                    [
                                        {xtype: 'rownumberer',
                                            width: 50
                                        },

                                        {
                                            header: 'Montant',
                                            dataIndex: 'montant',
                                            flex: 1,
                                            xtype: 'numbercolumn',
                                            align: 'right',
                                            format: '0,000.'

                                        }, {
                                            header: 'Date',
                                            dataIndex: 'mvtDate',
                                            flex: 1

                                        }
                                        , {
                                            header: 'Opérateur',
                                            dataIndex: 'user',
                                            flex: 1

                                        }


                                    ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: historiques,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = historiques.getProxy();
                                    myProxy.params = {
                                        idCaution: rec.get('id'),
                                        dtStart: null,
                                        dtEnd: null
                                    };
                                    myProxy.setExtraParam('idCaution', rec.get('id')),
                                            myProxy.setExtraParam('dtStart', me.getHistoriquesDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getHistoriquesDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });
    },

    buildAchats: function (rec) {
        const me = this;
        const dtStart = new Ext.form.field.Date({
            //  xtype: 'datefield',
            fieldLabel: 'Du',
            itemId: 'dtStart',
            margin: '0 10 0 0',
            submitFormat: 'Y-m-d',
            flex: 1,
            labelWidth: 20,
            maxValue: new Date(),
            value: new Date(),
            format: 'd/m/Y'

        });
        const dtEnd = new Ext.form.field.Date({
            //  xtype: 'datefield',
            fieldLabel: 'Au',
            itemId: 'dtEnd',
            labelWidth: 20,
            flex: 1,
            maxValue: new Date(),
            value: new Date(),
            margin: '0 9 0 0',
            submitFormat: 'Y-m-d',
            format: 'd/m/Y'
        });
        const achatsStore = Ext.create('Ext.data.Store', {

            model: 'testextjs.model.caisse.Vente',
            autoLoad: false,
            pageSize: 999999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/cautions/ventes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        });

        achatsStore.load({
            params: {
                idCaution: rec.get('id'),
                dtStart: dtStart.getSubmitValue(),
                dtEnd: dtEnd.getSubmitValue()
            }
        });
        const form = Ext.create('Ext.window.Window',
                {
                    xtype: 'cautionAchats',
                    alias: 'widget.cautionAchats',
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: '<span style="font-size:14px;">Liste des achats de ' + rec.get('tiersPayantName') + '</span>',

                    closeAction: 'hide',

                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                dtStart, dtEnd
                                        , {
                                            xtype: 'button',
                                            itemId: 'rechercher',
                                            iconCls: 'searchicon',
                                            text: 'Rechercher',

                                            handler: function () {
                                                achatsStore.load({
                                                    params: {
                                                        idCaution: rec.get('id'),
                                                        dtStart: dtStart.getSubmitValue(),
                                                        dtEnd: dtEnd.getSubmitValue()
                                                    }
                                                });
                                            }

                                        },
                                {
                                    xtype: 'button',
                                    itemId: 'btnPrint',
                                    iconCls: 'printable',
                                    // scope: this,
                                    text: 'Imprimer',
                                    handler: function () {
                                        const me = this;
                                        let dtStartV = dtStart.getSubmitValue();
                                        if (dtStartV === null || dtStartV === undefined) {
                                            dtStartV = '';
                                        }
                                        let dtEndV = dtEnd.getSubmitValue();
                                        if (dtEndV === null || dtEndV === undefined) {
                                            dtEndV = '';
                                        }
                                        const linkUrl = '../cautionServlet?mode=achats&idCaution=' + rec.get('id') + '&dtStart=' + dtStartV + '&dtEnd=' + dtEndV;
                                        window.open(linkUrl);
                                    }

                                }

                            ]
                        },
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
                                    itemId: 'btnCancel',
                                    text: 'Fermer',
                                    handler: function () {
                                        form.destroy();
                                    }

                                }
                            ]
                        }
                    ],
                    items: [
                        {
                            xtype: 'gridpanel',
                            store: achatsStore,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },

                            columns: [
                                {
                                    xtype: 'rownumberer',
                                    width: 50
                                },

                                {
                                    header: 'Reference',
                                    dataIndex: 'strREF',
                                    flex: 1,
                                    sortable: false,
                                    menuDisabled: true
                                }, {
                                    header: 'Montant',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intPRICE',
                                    align: 'right',
                                    sortable: false,
                                    menuDisabled: true,
                                    flex: 1,
                                    format: '0,000.'

                                }, {
                                    header: 'Montant caution',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'caution',
                                    align: 'right',
                                    sortable: false,
                                    menuDisabled: true,
                                    flex: 1,
                                    format: '0,000.'

                                },
                                {
                                    header: 'Date',
                                    dataIndex: 'dtUPDATED',
                                    sortable: false,
                                    menuDisabled: true,
                                    flex: 0.6,
                                    align: 'center'
                                }, {
                                    header: 'Heure',
                                    dataIndex: 'heure',
                                    sortable: false,
                                    menuDisabled: true,
                                    flex: 0.6,
                                    align: 'center'
                                }
                                , {
                                    header: 'Vendeur',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'userCaissierName',
                                    flex: 1
                                }


                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: achatsStore,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = achatsStore.getProxy();
                                    myProxy.params = {
                                        idCaution: rec.get('id'),
                                        dtStart: null,
                                        dtEnd: null
                                    };
                                    myProxy.setExtraParam('idCaution', rec.get('id')),
                                            myProxy.setExtraParam('dtStart', dtStart.getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', dtEnd.getSubmitValue());

                                }
                            }
                        }
                    ]
                });
    }

});