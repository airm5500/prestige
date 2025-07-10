/* global Ext */

Ext.define('testextjs.controller.CategorieNotificationCtr', {
    extend: 'Ext.app.Controller',

    views: ['testextjs.view.notification.CategorieNotification', 'testextjs.view.notification.CategorieNotificationForm'],
    refs: [{
            ref: 'categorieNotificationlist',
            selector: 'categorieNotification'
        },

      

        {
            ref: 'categorieNotificationGrid',
            selector: 'categorieNotification gridpanel'
        },
        {
            ref: 'notificationFormGrid',
            selector: 'notificationForm gridpanel'
        }
        ,

        {
            ref: 'pagingtoolbar',
            selector: 'categorieNotification gridpanel pagingtoolbar'
        }

    ],
    config: {
        data: null
    },
    init: function (application) {
        this.control({
          
         
            'categorieNotification gridpanel': {
                viewready: this.doInitStore
            },
           
            "categorieNotification gridpanel actioncolumn": {
                editer: this.toItem

            }
           

        });
    },

  
    toItem: function (view, rowIndex, colIndex, item, e, record, row) {

        Ext.create('testextjs.view.notification.CategorieNotificationForm', {data: record.data, grid: view}).show();

    },



    doInitStore: function () {
        const me = this;
        me.doSearch();

    },
    onReady: function () {
        const me = this;
        me.data = null;

    },
  
    doSearch: function () {
        const me = this;
        me.getCategorieNotificationGrid().getStore().load();
    }

});