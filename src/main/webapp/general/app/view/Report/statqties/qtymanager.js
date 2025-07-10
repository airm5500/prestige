/* global Ext */

Ext.define('testextjs.view.Report.statqties.qtymanager', {
    extend: 'Ext.panel.Panel',
    xtype: 'statproductsell',
    id: 'statproductsellID',
    requires: [
      
        'testextjs.view.Report.statqties.qtygrid'

    ],
    frame: true,
    title: 'Statistique vente produit',
    width: '98%',
    height: 570,
    minHeight: 570,
    maxHeight: 800,
    cls: 'custompanel',
//    autoScroll: true,
    layout: 'fit',
    items: [{
            xtype: 'statproduct-grid'

        }


    ] 

});


