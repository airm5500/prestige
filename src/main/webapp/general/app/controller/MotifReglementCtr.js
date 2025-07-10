/* global Ext */

Ext.define('testextjs.controller.MotifReglementCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.referentiels.motifreglement.MotifReglement', 'testextjs.view.referentiels.motifreglement.MotifReglementForm'],
    refs: [{
            ref: 'motifreglement',
            selector: 'motifreglement'
        },

        {
            ref: 'motifreglementGrid',
            selector: 'motifreglement gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'motifreglement gridpanel pagingtoolbar'
        },
        {ref: 'rechercherButton',
            selector: 'motifreglement #rechercher'

        },
        {ref: 'query',
            selector: 'motifreglement #query'

        },
        {ref: 'motifreglementForm',
            selector: 'motifreglementForm'

        },
        {ref: 'form',
            selector: 'motifreglementForm form'

        },
           {ref: 'btnsave',
            selector: 'motifreglementForm #btnsave'

        },
        {ref: 'btnCancel',
            selector: 'motifreglementForm #btnCancel'

        }
        



    ],
    init: function (application) {
        this.control({
            'motifreglement gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'motifreglement #rechercher': {
                click: this.doSearch
            },

            'motifreglement gridpanel': {
                viewready: this.doInitStore
            }
            ,
            "motifreglement gridpanel actioncolumn": {
                remove: this.remove,
                editer: this.editer

            },
            'motifreglement #query': {
                specialkey: this.onSpecialKey
            },
            'motifreglement #addBtn': {
                click: this.add
            },
             'motifreglementForm #btnsave': {
                click: this.saveRecord
            },
            'motifreglementForm #btnCancel': {
                click: this.closeWindows
            }

        });
    },
    add: function () {
        const formwin = Ext.create('testextjs.view.referentiels.motifreglement.MotifReglementForm');
        formwin.show();
    },
  closeWindows: function () {
        const me = this;
        me.getMotifreglementForm().destroy();
    },
    saveRecord: function () {
        const me = this;
      const  form = me.getForm();
        if (form.isValid()) {
            let datas = form.getValues();
            let progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/motifreglement/' ,
                params: Ext.JSON.encode(datas),
                success: function (response, options) {
                    progress.hide();
                    const result = Ext.JSON.decode(response.responseText, true);
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
        const me = this;
        const formwin = Ext.create('testextjs.view.referentiels.motifreglement.MotifReglementForm');
        me.getForm().loadRecord(record);
        formwin.show();

    },

    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            me.doSearch();
        }
    },
    remove: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/motifreglement/' + record.get('id'),
            success: function (response, options) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
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
        const me = this;
        let myProxy = me.getMotifreglementGrid().getStore().getProxy();
        myProxy.params = {
            query: null


        };
        const query = me.getQuery().getValue();
        myProxy.setExtraParam('query', query);

    },
    doInitStore: function () {
        const me = this;
        me.doSearch();
    },
    doSearch: function () {
        const me = this;
        const query = me.getQuery().getValue();
        me.getMotifreglementGrid().getStore().load({
            params: {
                query: query

            }
        });
    }

});