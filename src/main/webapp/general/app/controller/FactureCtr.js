/* global Ext */

Ext.define('testextjs.controller.FactureCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.facturation.EditerFactureProvisoire'],
    config: {
        tout: null
    },
    refs: [{
            ref: 'oneditfacture',
            selector: 'oneditfacture'
        },
        {
            ref: 'modeSelection',
            selector: 'oneditfacture #modeSelection'
        }
        , {
            ref: 'dtStart',
            selector: 'oneditfacture #dtStart'
        },
        {
            ref: 'dtEnd',
            selector: 'oneditfacture #dtEnd'
        },
        {
            ref: 'datacmp',
            selector: 'oneditfacture #datacmp'
        },
        {
            ref: 'bonscmp',
            selector: 'oneditfacture #bonscmp'
        },
        {ref: 'btnedit',
            selector: 'oneditfacture #btnedit'

        },
        {ref: 'btncancel',
            selector: 'oneditfacture #btncancel'

        },
        {ref: 'query',
            selector: 'oneditfacture #query'

        },
        {
            ref: 'groupTp',
            selector: 'oneditfacture #groupTp'
        }


        , {
            ref: 'btnSearch',
            selector: 'oneditfacture #btnSearch'
        }, {
            ref: 'tpayant',
            selector: 'oneditfacture #tpayant'
        }, {
            ref: 'typeTp',
            selector: 'oneditfacture #typeTp'
        }
        , {
            ref: 'codeGroup',
            selector: 'oneditfacture #codeGroup'
        }, {
            ref: 'one',
            selector: 'oneditfacture #one'
        }
        , {
            ref: 'dataselectmode',
            selector: 'oneditfacture #dataselectmode'
        }


    ],
    init: function (application) {
        this.control({
            'oneditfacture #datacmp pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'oneditfacture #dataselectmode pagingtoolbar': {
                beforechange: this.doBeforechangeSelect
            },
            'oneditfacture #bonscmp pagingtoolbar': {
                beforechange: this.doBeforechangeGrid
            },
            'oneditfacture #btnSearch': {
                click: this.doSearch
            },
            'oneditfacture #modeSelection': {
                select: this.onFilterMode
            },
            'oneditfacture #btnedit': {
                click: this.onGenerate
            },
            'oneditfacture #btncancel': {
                click: this.onCancel
            },
            'oneditfacture #query': {
                specialkey: this.onSpecialKey
            }
//                   
        });
    },
    isAll: function (_view) {
        var columns = _view.columnManager.columns;
        var columnLenght = columns.length;
        var _mycheckboxcolumn = columns[columnLenght - 1];
        return  _mycheckboxcolumn.el.hasCls(Ext.baseCSSPrefix + 'grid-hd-checker-on');
    },
    onSpecialKey: function (field, e, options) {
        var me = this;
        if (e.getKey() === e.ENTER) {
            me.doSearch();
        }
    },
    onCancel: function () {
        const xtype = "factureprovisoire";
        testextjs.app.getController('App').onRedirectTo(xtype, {});
    },
    onFilterMode: function (cmp) {
        var me = this;
        var value = cmp.getValue();
        switch (value) {
            case 'TYPETP':
                me.getTypeTp().show();
                me.getTpayant().hide();
                me.getGroupTp().hide();
                me.getCodeGroup().hide();
                me.getOne().getLayout().setActiveItem(0);
                break;
            case 'SELECT':
                me.getTypeTp().hide();
                me.getTpayant().hide();
                me.getGroupTp().hide();
                me.getCodeGroup().hide();
                me.getOne().getLayout().setActiveItem(1);
                break;
            case 'CODE_GROUP':
                me.getTypeTp().hide();
                me.getTpayant().hide();
                me.getGroupTp().hide();
                me.getCodeGroup().show();
                me.getOne().getLayout().setActiveItem(0);
                break;
            case 'ALL_TP':
                me.getTypeTp().hide();
                me.getTpayant().hide();
                me.getGroupTp().hide();
                me.getCodeGroup().hide();
                me.getOne().getLayout().setActiveItem(0);
                break;
            case 'TP':
                me.getTypeTp().hide();
                me.getTpayant().show();
                me.getGroupTp().hide();
                me.getCodeGroup().hide();
                me.getOne().getLayout().setActiveItem(0);
                break;
            case 'GROUP':
                me.getTypeTp().hide();
                me.getTpayant().hide();
                me.getGroupTp().show();
                me.getCodeGroup().hide();
                me.getOne().getLayout().setActiveItem(0);
                break;
            case 'BONS':
                me.getTypeTp().hide();
                me.getTpayant().show();
                me.getGroupTp().hide();
                me.getCodeGroup().hide();
                me.getOne().getLayout().setActiveItem(2);
                break;
        }
    },
    onPdfClick: function () {
        var me = this;
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var query = me.getQuery().getValue();
        var v = me.getUserCombo().getValue();
        if (!v) {
            v = '';
        }
        var linkUrl = '../FacturePdfServlet?mode=LISTE_DIFFERES&dtStart=' + dtStart + '&dtEnd=' + dtEnd + '&userId=' + v + '&query=' + query;
        window.open(linkUrl);
    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getDatacmp().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            mode: 'ALL',
            codegroup: null,
            tpid: null,
            typetp: null,
            groupTp: null

        };
        myProxy.setExtraParam('tpid', me.getTpayant().getValue());
        myProxy.setExtraParam('mode', me.getModeSelection().getValue());
        myProxy.setExtraParam('codegroup', me.getCodeGroup().getValue());
        myProxy.setExtraParam('groupTp', me.getGroupTp().getValue());
        myProxy.setExtraParam('typetp', me.getTypeTp().getValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
    },
    doBeforechangeSelect: function (page, currentPage) {
        var me = this;
        var myProxy = me.getDataselectmode().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            mode: 'ALL',
            codegroup: null,
            tpid: null,
            typetp: null,
            groupTp: null

        };
        myProxy.setExtraParam('tpid', me.getTpayant().getValue());
        myProxy.setExtraParam('mode', me.getModeSelection().getValue());
        myProxy.setExtraParam('codegroup', me.getCodeGroup().getValue());
        myProxy.setExtraParam('groupTp', me.getGroupTp().getValue());
        myProxy.setExtraParam('typetp', me.getTypeTp().getValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
    },
    doSearch: function () {
        var me = this, grid = null;
        var tpid = me.getTpayant().getValue();
        var mode = me.getModeSelection().getValue();
        var codegroup = me.getCodeGroup().getValue();
        var typetp = me.getTypeTp().getValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var dtStart = me.getDtStart().getSubmitValue();
        var groupTp = me.getGroupTp().getValue();
        var query = me.getQuery().getValue();
        switch (mode) {

            case 'SELECT':
                grid = me.getDataselectmode();
                break;
            case 'BONS':
                grid = me.getBonscmp();
                break;
            default :
                grid = me.getDatacmp();
                break;
        }


        grid.getStore().load({
            params: {
                dtStart: dtStart,
                dtEnd: dtEnd,
                query: query,
                mode: mode,
                typetp: typetp,
                codegroup: codegroup,
                tpid: tpid,
                groupTp: groupTp
            }
        });
    },
    doBeforechangeGrid: function (page, currentPage) {
        var me = this;
        var myProxy = me.getBonscmp().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            mode: 'ALL',
            codegroup: null,
            tpid: null,
            typetp: null,
            groupTp: null,
            query: null

        };
        myProxy.setExtraParam('tpid', me.getTpayant().getValue());
        myProxy.setExtraParam('mode', me.getModeSelection().getValue());
        myProxy.setExtraParam('codegroup', me.getCodeGroup().getValue());
        myProxy.setExtraParam('query', me.getQuery().getValue());
        myProxy.setExtraParam('groupTp', me.getGroupTp().getValue());
        myProxy.setExtraParam('typetp', me.getTypeTp().getValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
    },
    resetAll: function () {
        var me = this;
        me.getModeSelection().clearValue();
        me.getTpayant().clearValue();
        me.getTpayant().hide();
        me.getTypeTp().clearValue();
        me.getTypeTp().hide();
        me.getCodeGroup().setValue('');
        me.getCodeGroup().hide();
        me.getQuery().setValue('');
        me.getGroupTp().clearValue();
        me.getGroupTp().hide();
        me.getOne().getLayout().setActiveItem(0);
        me.getBonscmp().getStore().removeAll();
        me.getBonscmp().getStore().sync();
        me.getDataselectmode().getStore().removeAll();
        me.getDataselectmode().getStore().sync();
        me.getDatacmp().getStore().removeAll();
        me.getDatacmp().getStore().sync();
    },
    onPrint: function () {
        var storeMODEL = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },
                        {name: 'libelle',
                            type: 'string'

                        },
                        {name: 'valeur',
                            type: 'string'

                        }

                    ],
            autoLoad: true,
            pageSize: null,
            proxy: {
                type: 'ajax',
                url: '../api/v1/facturation/modelfacture',
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
                    title: 'SELECTION DU MODEL  DE FACTURE A IMPRIMER',
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
                                    text: 'Enregistrer',
                                    handler: function (btn) {
                                        var _this = btn.up('window'), _form = _this.down('form');
                                        if (_form.isValid()) {
                                            var values = _form.getValues();
                                            const url='../FactureProvisoire?mode=ALL&modeId='+values.modelId;
                                            window.open(url);
                                        }
                                        form.destroy();
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
//                              anchor: '100%',
                            layout: 'fit',
                            items: [
                                {
                                    xtype: 'fieldset',
                                    layout: 'anchor',
                                    collapsible: false,
                                    title: 'Information tiers-payant complémentaires',
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
                                            emptyText: 'Selectionner le modèle'


                                        }


                                    ]
                                }
                            ]
                        }

                    ]
                });
    },
    printAll: function (factures) {
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../FactureProvisoire',
            params: Ext.JSON.encode(factures)
        });
    },
    onGenerate: function () {
        var me = this;
        var tpid = me.getTpayant().getValue();
        var mode = me.getModeSelection().getValue();
        var codegroup = me.getCodeGroup().getValue();
        var typetp = me.getTypeTp().getValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var dtStart = me.getDtStart().getSubmitValue();
        var groupTp = me.getGroupTp().getValue();
        var query = me.getQuery().getValue();
        var all = null;
        var selects = [];
        switch (mode) {
            case 'BONS':
                var bn = me.getBonscmp();
                all = me.isAll(bn);
                if (!all) {
                    selects = bn.getSelectionModel().getSelection().map(function (e) {
                        return e.data.id;
                    });
                }

                break;
            case 'SELECT':
              
                selects = [];
                var _cmp = me.getDataselectmode();
                all = me.isAll(_cmp);
                if (!all) {
                    selects = _cmp.getSelectionModel().getSelection().map(function (e) {
                        return e.data.id;
                    });
                }
                break;
        }


        var data = {
            dtEnd: dtEnd,
            dtStart: dtStart,
            mode: mode,
            codegroup: codegroup,
            tpid: tpid,
            typetp: typetp,
            groupTp: groupTp,
            query: query,
            datas: selects

        };
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/facturation/summary/generer',
            params: Ext.JSON.encode(data),
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.onPrint();
                    me.resetAll();
                } else {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: "Erreur de génération ",
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


});