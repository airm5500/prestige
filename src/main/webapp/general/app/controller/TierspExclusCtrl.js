/* global Ext */

Ext.define('testextjs.controller.TierspExclusCtrl', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.Dashboard.TierspExclus'],
    refs: [{
            ref: 'tierspExclus',
            selector: 'tierspExclus'
        },
        {
            ref: 'query',
            selector: 'tierspExclus #toExcludeGrid #query'
        },
      
        {
            ref: 'pagingtoolbar',
            selector: 'tierspExclus #carnetGrid pagingtoolbar'
        }
        ,
        {
            ref: 'toExcludeGrid',
            selector: 'tierspExclus #toExcludeGrid'
        }



    ],
    init: function (application) {
        this.control({
           
            'tierspExclus #toExcludeGrid pagingtoolbar': {
                beforechange: this.doBeforechange2
            },
            'tierspExclus #toExcludeGrid #rechercher': {
                click: this.doSearch2
            },
           

            'tierspExclus #toExcludeGrid #query': {
                specialkey: this.onSpecialKey2
            },
           
            'tierspExclus #toExcludeGrid': {
                viewready: this.doInitStore2
            },
           
             'tierspExclus #toExcludeGrid [xtype=checkcolumn]': {
                checkchange: this.onCheckChange2
            }


        });
    },
    onCheckChange2: function (column, rowIndex, checked) {
        let me = this;
        let record = me.getToExcludeGrid().getStore().getAt(rowIndex);
        Ext.Ajax.request({
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v2/tiers-payant/exclure-inclure/' + record.data.id + '/' + checked,
            success: function (response, options) {
                me.getToExcludeGrid().getStore().reload();
            },
            failure: function (response, options) {
                Ext.Msg.alert("Message", 'Erreur  : [code erreur : ' + response.status + ' ]');
                me.getToExcludeGrid().getStore().reload();
            }
        });
    },
   

    onSpecialKey2: function (field, e, options) {
        var me = this;
        if (e.getKey() === e.ENTER) {
            me.doSearch2();
        }
    },


    doBeforechange2: function (page, currentPage) {
        var me = this;
        var myProxy = me.getToExcludeGrid().getStore().getProxy();
        myProxy.params = {
            query: ''
        };
        let query = me.getQuery().getValue();
        myProxy.setExtraParam('query', query);
    },

  
    doInitStore2: function () {
        var me = this;
        me.doSearch2();
    },
  
    doSearch2: function () {
        var me = this;
        const query = me.getQuery().getValue();
        me.getToExcludeGrid().getStore().load({
            params: {
                query: query
            }
        });
    }


});