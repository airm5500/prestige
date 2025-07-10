/* global Ext */

Ext.define('testextjs.controller.LaboratoireCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.produits.Laboratoire', 'testextjs.view.produits.form.LaboratoireForm'],
    refs: [{
            ref: 'laboratoireproduits',
            selector: 'laboratoireproduits'
        },

        {
            ref: 'laboratoireGrid',
            selector: 'laboratoireproduits gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'laboratoireproduits gridpanel pagingtoolbar'
        },
        {ref: 'rechercherButton',
            selector: 'laboratoireproduits #rechercher'

        },
        {ref: 'query',
            selector: 'laboratoireproduits #query'

        },
        {ref: 'laboratoireForm',
            selector: 'laboratoireForm'

        },
        {ref: 'form',
            selector: 'laboratoireForm form'

        },
        {ref: 'btnsave',
            selector: 'laboratoireForm #btnsave'

        },
        {ref: 'btnCancel',
            selector: 'laboratoireForm #btnCancel'

        }



    ],
    init: function (application) {
        this.control({
            'laboratoireproduits gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'laboratoireproduits #rechercher': {
                click: this.doSearch
            },

            'laboratoireproduits gridpanel': {
                viewready: this.doInitStore
            }
            ,
            "laboratoireproduits gridpanel actioncolumn": {
                remove: this.remove,
                editer: this.editer

            },
            'laboratoireproduits #query': {
                specialkey: this.onSpecialKey
            },
            'laboratoireproduits #addBtn': {
                click: this.add
            },
            'laboratoireForm #btnsave': {
                click: this.saveRecord
            },
            'laboratoireForm #btnCancel': {
                click: this.closeWindows
            }

        });
    },
    add: function () {
        var formwin = Ext.create('testextjs.view.produits.form.LaboratoireForm');
        formwin.show();
    },
    closeWindows: function () {
        var me = this;
        me.getLaboratoireForm().destroy();
    },
    saveRecord: function () {
        const me = this;
     const   form = me.getForm();
        if (form.isValid()) {
            let datas = form.getValues();
            var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/laboratoireproduits/',
                params: Ext.JSON.encode(datas),
                success: function (response, options) {
                    progress.hide();
                    var result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        me.closeWindows();
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
        }

    },

    editer: function (view, rowIndex, colIndex, item, e, record, row) {
        var me = this;
        var formwin = Ext.create('testextjs.view.produits.form.LaboratoireForm');
        me.getForm().loadRecord(record);
        formwin.show();

    },

    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearch();
        }
    },
    remove: function (view, rowIndex, colIndex, item, e, record, row) {
        var me = this;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/laboratoireproduits/' + record.get('id'),
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
        var myProxy = me.getLaboratoireGrid().getStore().getProxy();
        myProxy.params = {
            query: null


        };
        var query = me.getQuery().getValue();
        myProxy.setExtraParam('query', query);

    },
    doInitStore: function () {
        var me = this;
        me.doSearch();
    },
    doSearch: function () {
        var me = this;
        var query = me.getQuery().getValue();
        me.getLaboratoireGrid().getStore().load({
            params: {
                query: query

            }
        });
    }

});