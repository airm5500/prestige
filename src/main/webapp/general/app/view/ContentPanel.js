Ext.define('testextjs.view.ContentPanel', {
    extend: 'Ext.panel.Panel',
    xtype: 'contentPanel',
    id: 'content-panel',
    border: false,
    bodyStyle: "background-color:red;",
    title: '&nbsp;',
   
    // autoScroll: true,
    requires:[
    'testextjs.view.dashboard'
    ],
    /* retour du 25/10 : un ecran « colle » prend la taille du panneau par la mise en page d'ExtJS (disposition fit),
       comme l'en-tete, au lieu d'un calcul en pixels sur des evenements (resources/js/correctifs-affichage.js) */
    listeners: {
        beforeadd: function (panneau, ecran) {
            if (window.PrestigeAffichage && window.PrestigeAffichage.disposerConteneur) {
                window.PrestigeAffichage.disposerConteneur(panneau, ecran);
            }
        }
    },
    items: [
        {

            /* xtype: 'mainmenumanager'*/ //appel du metro
          //  xtype: 'dashboard'
          xtype: xtypeload

        /*    
            xtype: 'mainmenumanager' 
 xtype: 'testmenu'*/

            
 


        }
    ]

});