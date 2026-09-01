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
            ref: 'filtreDepot',
            selector: 'tierpayantasdepot #carnetGrid #filtreDepot'
        },

        {
            ref: 'filtreExclu',
            selector: 'tierpayantasdepot #carnetGrid #filtreExclu'
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

            'tierpayantasdepot #carnetGrid #filtreDepot': {
                select: this.doSearch
            },

            'tierpayantasdepot #carnetGrid #filtreExclu': {
                select: this.doSearch
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
  
    /* Criteres courants de l'ecran : la recherche et les deux filtres, qui se combinent.
     * Un filtre laisse sur « Tous » vaut chaine vide, le service ne restreint alors rien. */
    criteres: function () {
        var me = this;
        var depot = me.getFiltreDepot(), exclu = me.getFiltreExclu();
        return {
            query: me.getQueryCarnet().getValue(),
            depot: depot ? (depot.getValue() || '') : '',
            exclu: exclu ? (exclu.getValue() || '') : ''
        };
    },

    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getCarnetGrid().getStore().getProxy();
        myProxy.params = {
            query: ''
        };
        // Changer de page ne doit pas relacher les filtres en cours.
        var criteres = me.criteres();
        myProxy.setExtraParam('query', criteres.query);
        myProxy.setExtraParam('depot', criteres.depot);
        myProxy.setExtraParam('exclu', criteres.exclu);
    },



    doInitStore: function () {
        var me = this;
        me.doSearch();
    },

    doSearch: function () {
        var me = this;
        // Retour a la premiere page : apres un filtre qui restreint, rester sur l'ancienne page
        // afficherait une grille vide.
        me.getCarnetGrid().getStore().loadPage(1, {
            params: me.criteres()
        });
    }
   

});