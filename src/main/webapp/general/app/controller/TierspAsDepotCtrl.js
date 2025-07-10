/* global Ext */

Ext.define('testextjs.controller.TierspAsDepotCtrl', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.Dashboard.TierspAsDepot'],
    refs: [{
            ref: 'tierpayantasdepot',
            selector: 'tierpayantasdepot'
        },

        {
            ref: 'queryCarnet',
            selector: 'tierpayantasdepot #carnetGrid #queryCarnet'
        },
      
        {
            ref: 'carnetGrid',
            selector: 'tierpayantasdepot #carnetGrid'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'tierpayantasdepot #carnetGrid pagingtoolbar'
        }
      
    ],
    init: function (application) {
        this.control({
            'tierpayantasdepot #carnetGrid pagingtoolbar': {
                beforechange: this.doBeforechange
            },
          
           
            'tierpayantasdepot #carnetGrid #rechercherCarnet': {
                click: this.doSearch
            },

            'tierpayantasdepot #carnetGrid #queryCarnet': {
                specialkey: this.onSpecialKey
            },
          
            'tierpayantasdepot #carnetGrid': {
                viewready: this.doInitStore
            },
         
            'tierpayantasdepot #carnetGrid [xtype=checkcolumn]': {
                checkchange: this.onCheckChange
            }
    

        });
    },

    onCheckChange: function (column, rowIndex, checked) {
       
        let me = this;
         let record = me.getCarnetGrid().getStore().getAt(rowIndex);
        
        let url='../api/v2/carnet-depot/exclure-inclure/' + record.data.id + '/' + checked;
        if(column.dataIndex==='toBeExclude'){
          url='../api/v2/carnet-depot/to-be-exclude/' + record.data.id + '/' + checked;  
        }
       
        Ext.Ajax.request({
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            url: url,
            success: function (response, options) {
                me.getCarnetGrid().getStore().reload();
            },
            failure: function (response, options) {
                Ext.Msg.alert("Message", 'Erreur  : [code erreur : ' + response.status + ' ]');
                me.getCarnetGrid().getStore().reload();
            }
        });
    },

    onSpecialKey: function (field, e, options) {
        var me = this;
        if (e.getKey() === e.ENTER) {
            me.doSearch();
        }
    },
  
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getCarnetGrid().getStore().getProxy();
        myProxy.params = {
            query: ''
        };
        let queryCarnet = me.getQueryCarnet().getValue();
        myProxy.setExtraParam('query', queryCarnet);
    },

 

    doInitStore: function () {
        var me = this;
        me.doSearch();
    },
  
    doSearch: function () {
        var me = this;
        const queryCarnet = me.getQueryCarnet().getValue();
        me.getCarnetGrid().getStore().load({
            params: {
                query: queryCarnet
            }
        });
    }
   

});