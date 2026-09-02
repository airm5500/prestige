/* global Ext */

/*
 * Point 2 : administration des modeles de messages SMS / WhatsApp (libelle, canal, contenu avec
 * variables, actif / inactif). Les modeles actifs sont proposes dans la fenetre SMS / WhatsApp du
 * suivi de consommation.
 */
Ext.define('testextjs.view.configmanagement.modelemessage.ModeleMessageManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'modelemessagemanager',
    frame: true,
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: 'fit',
    title: 'Modèles de messages SMS / WhatsApp',

    initComponent: function () {
        const me = this;
        const store = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle', 'canal', 'contenu', {name: 'actif', type: 'boolean'}],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/modeles-messages',
                extraParams: {tous: true},
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        Ext.applyIf(me, {
            tbar: [{
                    text: 'Nouveau modèle',
                    itemId: 'btnNouveau',
                    iconCls: 'addicon'
                }, {
                    text: 'Modifier',
                    itemId: 'btnModifier',
                    iconCls: 'editicon'
                }, {
                    text: 'Activer / désactiver',
                    itemId: 'btnBasculer'
                }, '->', {
                    xtype: 'tbtext',
                    text: '<span style="color:#555;">Variables : {client} {prenom} {nom} {medicament} {officine} '
                            + '{telephone_officine} {dernier_achat}</span>'
                }],
            items: [{
                    xtype: 'gridpanel',
                    itemId: 'grille',
                    store: store,
                    cls: 'vp-grille-survol',
                    viewConfig: {
                        forceFit: true,
                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [
                        {text: 'Libellé', dataIndex: 'libelle', flex: 1},
                        {text: 'Canal', dataIndex: 'canal', width: 100,
                            renderer: function (v) {
                                return v === 'TOUS' ? 'SMS + WhatsApp' : v;
                            }},
                        {text: 'Contenu', dataIndex: 'contenu', flex: 3},
                        {text: 'Actif', dataIndex: 'actif', width: 70, align: 'center',
                            renderer: function (v) {
                                return v ? '<span style="color:#1e7e34;font-weight:bold;">Oui</span>'
                                        : '<span style="color:#c0392b;font-weight:bold;">Non</span>';
                            }}
                    ]
                }]
        });
        me.callParent(arguments);
    }
});
