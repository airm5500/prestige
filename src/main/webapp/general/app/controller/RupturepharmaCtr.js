/* global Ext */

Ext.define('testextjs.controller.RupturepharmaCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.pharmaml.Rupturepharma'],
    refs: [{
            ref: 'rupturepharma',
            selector: 'rupturepharma'
        },
        {
            ref: 'imprimerBtn',
            selector: 'rupturepharma #imprimer'
        },
        {
            ref: 'ruptureGrid',
            selector: 'rupturepharma gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'rupturepharma gridpanel pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'rupturepharma #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'rupturepharma #dtEnd'
        },
        {ref: 'rechercherButton',
            selector: 'rupturepharma #rechercher'

        },
        {ref: 'query',
            selector: 'rupturepharma #query'

        },
        {
            ref: 'grossiste',
            selector: 'rupturepharma #grossiste'
        },
        {
            ref: 'fusion',
            selector: 'rupturepharma #fusion'
        }

    ],
    init: function (application) {
        this.control({
            'rupturepharma gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'rupturepharma #rechercher': {
                click: this.doSearch
            },
            'rupturepharma #imprimer': {
                click: this.onPdfClick
            },
            'rupturepharma #grossiste': {
                select: this.doSearch
            }, 'rupturepharma #query': {
                specialkey: this.onSpecialSpecialKey
            },
            'rupturepharma gridpanel': {
                viewready: this.doInitStore
            }
            ,
            "rupturepharma gridpanel actioncolumn": {
                remove: this.remove,
                exportCsv: this.exportCsv,
                envoiPharmaML: this.envoiPharmaML
            },
            'rupturepharma #fusion': {
                click: this.funsionner
            }

        });
    },
    isAll: function (_view) {
        var columns = _view.columnManager.columns;
        var columnLenght = columns.length;
        var _mycheckboxcolumn = columns[columnLenght - 1];
        return  _mycheckboxcolumn.el.hasCls(Ext.baseCSSPrefix + 'grid-hd-checker-on');
    },
    funsionner: function () {
        var me = this;
        var selects = [];
        selects = me.getRuptureGrid().getSelectionModel().getSelection().map(function (e) {
            return e.data.id;
        });
        if (selects.length > 1) {
            var storeMODEL = Ext.create('Ext.data.Store', {
                idProperty: 'id',
                fields:
                        [
                            {name: 'id',
                                type: 'string'

                            },
                            {name: 'libelle',
                                type: 'string'

                            }

                        ],
                autoLoad: true,
                pageSize: 999,
                proxy: {
                    type: 'ajax',
                    url: '../api/v1/common/grossiste',
                    reader: {
                        type: 'json',
                        root: 'data',
                        totalProperty: 'total'
                    }

                }

            });
            var form = Ext.create('Ext.window.Window',
                    {
                        autoShow: true,
                        height: 150,
                        width: 450,
                        modal: true,
                        title: 'SELECTIONNEZ UN GROSSISTE',
                        closeAction: 'hide',
                        closable: true,
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
                                        text: 'Fusionner',
                                        handler: function (btn) {
                                            var _this = btn.up('window'), _form = _this.down('form');
                                            if (_form.isValid()) {
                                                var values = _form.getValues();
                                                var data = {
                                                    organismeId: values.modelId,
                                                    datas: selects
                                                };
                                                var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                                                Ext.Ajax.request({
                                                    method: 'POST',
                                                    headers: {'Content-Type': 'application/json'},
                                                    url: '../api/v1/rupture/fusionner',
                                                    params: Ext.JSON.encode(data),
                                                    success: function (response, options) {
                                                        progress.hide();
                                                        var result = Ext.JSON.decode(response.responseText, true);
                                                        if (result.success) {
                                                            form.destroy();
                                                            me.doSearch();
                                                        } else {
                                                            Ext.MessageBox.show({
                                                                title: 'Message d\'erreur',
                                                                width: 320,
                                                                msg: "Erreu de génération ",
                                                                buttons: Ext.MessageBox.OK,
                                                                icon: Ext.MessageBox.ERROR

                                                            });
                                                        }

                                                    },
                                                    failure: function (response, options) {
                                                        progress.hide();
                                                        Ext.Msg.alert("Message", 'Erreur de génération de la facture : [code erreur : ' + response.status + ' ]');
                                                    }
                                                });



                                            }
//                                         
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
                        items: [

                            {
                                xtype: 'form',
                                layout: 'fit',
                                items: [
                                    {
                                        xtype: 'fieldset',
                                        layout: 'anchor',
                                        collapsible: false,
                                        title: 'Grosssite',
                                        items: [
                                            {
                                                xtype: 'combobox',
                                                name: 'modelId',
                                                anchor: '100%',
                                                store: storeMODEL,
                                                pageSize: 999,
                                                valueField: 'id',
                                                displayField: 'libelle',
                                                minChars: 2,
                                                queryMode: 'remote',
                                                enableKeyEvents: true,
                                                emptyText: 'Selectionner le grossiste'


                                            }


                                        ]
                                    }
                                ]
                            }

                        ]
                    });

        }
    }
    ,
    envoiPharmaML: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
      
        const grid = me.getRuptureGrid();
        var grossisteId = record.get('grossisteId');
        var store = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },
                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: true,
            pageSize: 999,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/grossiste',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 150,
                    width: 450,
                    modal: true,
                    title: 'SELECTIONNEZ UN GROSSISTE',
                    closeAction: 'hide',
                    closable: true,
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
                                    text: 'Envoyer',
                                    handler: function (btn) {
                                        var _this = btn.up('window'), _form = _this.down('form');
                                        if (_form.isValid()) {
                                            var values = _form.getValues();
                                            if (values.modelId != null) {
                                                grossisteId = values.modelId;
                                            }
                                            me.onEnvoiPharma(record, grossisteId,grid);


                                        }
//                                         
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
                    items: [

                        {
                            xtype: 'form',
                            layout: 'fit',
                            items: [
                                {
                                    xtype: 'fieldset',
                                    layout: 'anchor',
                                    collapsible: false,
                                    title: 'Grosssite',
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            name: 'modelId',
                                            anchor: '100%',
                                            store: store,
                                            pageSize: 999,
                                            valueField: 'id',
                                            displayField: 'libelle',
                                            minChars: 2,
                                            queryMode: 'remote',
                                            value: grossisteId,
                                            enableKeyEvents: true,
                                            emptyText: 'Selectionner le grossiste'


                                        }


                                    ]
                                }
                            ]
                        }

                    ]
                });
    },

    onEnvoiPharma: function (record, grossisteId,grid) {
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'PUT',
            timeout: 240000,
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/pharma/rupture/' + record.get('id') + '/' + grossisteId,
            success: function (response, options) {
               
                   const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                  let message = result.nbreproduit + '/' + result.totalProduit + ' produit pris en compte ';
                    if (result.nbrerupture > 0) {
                        message += ' ' + result.nbrerupture + ' produit(s) en rupture';
                    }
                    Ext.MessageBox.show({
                        title: 'Message',
                        width: 320,
                        msg: message,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR

                    });
                    grid.getStore().reload();
                } else {
                    progress.hide();
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: "ERROR",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR

                    });
                }

            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'Erreur du serveur ' + response.status);
            }

        });
    },

    onSpecialSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearch();
        }
    },
    exportCsv: function (view, rowIndex, colIndex, item, e, record, row) {
        var me = this;

        var storeMODEL = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },
                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: true,
            pageSize: 999,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/grossiste',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 150,
                    width: 450,
                    modal: true,
                    title: 'SELECTIONNEZ UN GROSSISTE POUR EXPORTER',
                    closeAction: 'hide',
                    closable: true,
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
                                    text: 'Exporter',
                                    handler: function (btn) {
                                        var _this = btn.up('window'), _form = _this.down('form');
                                        if (_form.isValid()) {
                                            var values = _form.getValues();


                                            window.location = '../api/v1/rupture/csv?id=' + record.get('id') + '&organismeId=' + values.modelId;
                                            form.destroy();


                                        }
//                                         
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
                    items: [

                        {
                            xtype: 'form',
                            layout: 'fit',
                            items: [
                                {
                                    xtype: 'fieldset',
                                    layout: 'anchor',
                                    collapsible: false,
                                    title: 'SELECTIONNER UN GROSSISTE',
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            name: 'modelId',
                                            anchor: '100%',
                                            store: storeMODEL,
                                            pageSize: 999,
                                            valueField: 'id',
                                            displayField: 'libelle',
                                            minChars: 2,
                                            queryMode: 'remote',
                                            enableKeyEvents: true,
                                            emptyText: 'Selectionner le grossiste'


                                        }


                                    ]
                                }
                            ]
                        }

                    ]
                });
    },
    onPdfClick: function () {
        var me = this;
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var codeGrossiste = me.getGrossiste().getValue();
        var query = me.getQuery().getValue();
        if (codeGrossiste == null) {
            codeGrossiste = '';
        }
        var linkUrl = '../SockServlet?mode=RUPTURE_PHARMAML&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&grossisteId=' + codeGrossiste + '&query=' + query;
        window.open(linkUrl);
    },
    remove: function (view, rowIndex, colIndex, item, e, record, row) {
        var me = this;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/rupture/' + record.get('id'),
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.doSearch();
                } else {
                    Ext.Msg.alert("Message", "L'opérateur a échouée");
                }

            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
            }
        });
    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getRuptureGrid().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            grossisteId: null,
            query: null

        };
        var codeGrossiste = me.getGrossiste().getValue();
        var query = me.getQuery().getValue();
        myProxy.setExtraParam('query', query);
        myProxy.setExtraParam('grossisteId', codeGrossiste);
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
    },
    doInitStore: function () {
        var me = this;
        me.doSearch();
    },
    doSearch: function () {
        var me = this;
        var codeGrossiste = me.getGrossiste().getValue();
        var query = me.getQuery().getValue();
        me.getRuptureGrid().getStore().load({
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                grossisteId: codeGrossiste,
                query: query

            }
        });
    }

});