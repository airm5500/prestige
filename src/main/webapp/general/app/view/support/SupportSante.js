/* global Ext */

Ext.define('testextjs.view.support.SupportSante', {
    extend: 'Ext.panel.Panel',
    xtype: 'supportsante',
    frame: true,
    title: 'Centre de Support - Santé application',
    iconCls: 'icon-grid',
    width: '90%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    autoScroll: true,
    bodyPadding: 15,
    tbar: [
        {
            xtype: 'button',
            itemId: 'btnActualiser',
            text: 'Actualiser'
        },
        '-',
        {
            xtype: 'button',
            itemId: 'btnCoherence',
            text: 'Lancer les contrôles de cohérence'
        }
    ],
    items: [
        {
            xtype: 'component',
            itemId: 'santeContent',
            html: '<p>Chargement des indicateurs . . .</p>'
        }
    ]
});
