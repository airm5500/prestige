/* global Ext */

Ext.define('testextjs.view.Viewport', {
    extend: 'Ext.container.Viewport',
    requires: [
        'Ext.layout.container.Border',
        'testextjs.view.layout.North',
        'testextjs.view.layout.West',
        'testextjs.view.layout.Center'

                ,
        'testextjs.view.Header',
        'testextjs.view.ThemeSwitcher',
        'testextjs.view.Navigation',
        'testextjs.view.ContentPanel',
        'testextjs.view.DescriptionPanel',
        'testextjs.view.CodePreview'


    ],
    layout: {
        type: 'border'
    },
    listeners: {
        /* themes du menu A, C, D (resources/js/menu-prestige.js) : sans choix, le menu actuel reste tel quel */
        afterrender: function (vp) {
            if (window.PrestigeMenu) {
                Ext.defer(function () {
                    window.PrestigeMenu.demarrer(vp);
                }, 1);
            }
        }
    },
    items: [
        {xtype: 'appHeader', region: 'north'},
        {
            region: 'west',
            xtype: 'navigation',
            width: 260,
            minWidth: 180,
            split: true,
            collapsible: true,
            collapsed: true,
            animCollapse: true
        },
        {
            region: 'center',
            xtype: 'contentPanel',
            autoScroll: true,
            height:Ext.getBody().getViewSize().height
        } /*{ 
         region: 'east',
         id: 'east-region',
         title: 'Example Info',
         stateful: true,
         stateId: 'mainnav.east',
         split: true,
         collapsible: true,
         layout: {
         type: 'vbox',
         align: 'stretch'
         },
         width: 250,
         height: 200,
         minWidth: 100,
         tools: [{
         type: 'gear',
         regionTool: true
         }],
         items: [{
         xtype: 'descriptionPanel',
         stateful: true,
         stateId: 'mainnav.east.description',
         height: 200,
         minHeight: 100
         }, {
         xtype: 'splitter',
         collapsible: true,
         collapseTarget: 'prev'
         }, {
         xtype: 'codePreview',
         flex: 1//,
         //minHeight: 100
         }]
         }*/
    ]
});


