/* global Ext */

/* Evolution 5, point 9 : analyse Posos.
 *
 * L'ecran ne parle jamais a Posos : il appelle v1/posos/status et v1/posos/analyse, qui sont authentifies
 * comme le reste de l'application. Aucun identifiant Posos ne transite par le navigateur - c'est la consigne
 * de l'officine, et c'est pour cela que le statut ne rend qu'un identifiant masque.
 *
 * L'ecran de vente n'est pas touche : les produits a analyser sont soit saisis ici par leur nom, soit relus
 * en base a partir de la reference d'une vente.
 */
Ext.define('testextjs.view.posos.PososManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'pososmanager',
    frame: true,
    title: 'ANALYSE POSOLOGIE',
    width: '99%',
    height: 'auto',
    minHeight: 560,
    cls: 'custompanel',
    layout: {
        type: 'vbox',
        align: 'stretch',
        padding: 8
    },
    initComponent: function () {
        var me = this;

        // Recherche produit : la meme ressource que la caisse, donc les memes produits et le meme stock.
        var storeProduits = new Ext.data.Store({
            fields: [
                {name: 'lgFAMILLEID', type: 'string'},
                {name: 'strNAME', type: 'string'},
                {name: 'intCIP', type: 'string'},
                {name: 'intNUMBERAVAILABLE', type: 'int'}
            ],
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/vente/search',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        // Lignes a analyser. Store local : rien n'est enregistre, l'analyse ne modifie aucune donnee.
        var storeLignes = new Ext.data.Store({
            fields: [
                {name: 'nom', type: 'string'},
                {name: 'cip', type: 'string'},
                {name: 'quantite', type: 'int'},
                {name: 'posologie', type: 'string'}
            ],
            data: []
        });

        var storeAlertes = new Ext.data.Store({
            fields: [
                {name: 'type', type: 'string'},
                {name: 'gravite', type: 'string'},
                {name: 'libelle', type: 'string'},
                {name: 'recommandation', type: 'string'},
                {name: 'majeure', type: 'boolean'},
                {name: 'produits'},
                /* Produits du rayon ayant la DCI recommandee par l'alerte (23/09). */
                {name: 'equivalents'},
                {name: 'proposer'}
            ],
            data: []
        });

        Ext.applyIf(me, {
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'top',
                items: [{
                    xtype: 'combobox',
                    itemId: 'produit',
                    store: storeProduits,
                    pageSize: 10,
                    width: 420,
                    valueField: 'lgFAMILLEID',
                    displayField: 'strNAME',
                    queryMode: 'remote',
                    minChars: 3,
                    typeAhead: false,
                    queryCaching: false,
                    forceSelection: true,
                    emptyText: 'Ajouter un produit par nom ou CIP...',
                    listConfig: {
                        loadingText: 'Recherche...',
                        emptyText: 'Pas de produit trouvé.',
                        getInnerTpl: function () {
                            return '<tpl for="."><span style="width:110px;display:inline-block;">{intCIP}</span>'
                                    + '<b>{strNAME}</b></tpl>';
                        }
                    }
                }, {
                    xtype: 'numberfield',
                    itemId: 'quantite',
                    fieldLabel: 'Qté',
                    labelWidth: 30,
                    width: 110,
                    minValue: 1,
                    value: 1,
                    hideTrigger: true
                }, '-', {
                    xtype: 'textfield',
                    itemId: 'referenceVente',
                    width: 220,
                    // Une vente OU une ordonnance client (N° ORD-...) : les deux menus sont lies (22/09).
                    emptyText: 'réf. vente ou N° ordonnance'
                }, {
                    text: 'Charger',
                    itemId: 'chargerVente',
                    iconCls: 'searchicon',
                    tooltip: 'Reprend les produits de cette vente ou de cette ordonnance (avec leurs posologies et '
                            + 'son contexte clinique), relus en base'
                }, '->', {
                    text: 'Analyser',
                    itemId: 'analyser',
                    cls: 'btn-primarya',
                    iconCls: 'icon-clear-group'
                }, {
                    text: 'Vider',
                    itemId: 'vider'
                }]
            }],
            items: [{
                // Bandeau d'etat. Toujours rendu : on le remplit par update(), jamais par setVisible()
                // avant rendu, ce qui leverait une erreur JavaScript.
                xtype: 'component',
                itemId: 'etatPasserelle',
                height: 28,
                html: ''
            }, {
                xtype: 'container',
                layout: 'hbox',
                height: 34,
                margin: '4 0 4 0',
                defaultType: 'textfield',
                items: [{
                    xtype: 'numberfield',
                    itemId: 'age',
                    fieldLabel: 'Âge',
                    labelWidth: 35,
                    width: 110,
                    minValue: 0,
                    maxValue: 130,
                    hideTrigger: true,
                    emptyText: 'ans'
                }, {
                    xtype: 'combobox',
                    itemId: 'sexe',
                    fieldLabel: 'Sexe',
                    labelWidth: 40,
                    width: 130,
                    margin: '0 0 0 10',
                    editable: false,
                    store: [['', '—'], ['F', 'Féminin'], ['M', 'Masculin']],
                    value: ''
                }, {
                    xtype: 'checkbox',
                    itemId: 'grossesse',
                    boxLabel: 'Grossesse',
                    margin: '0 0 0 14'
                }, {
                    xtype: 'checkbox',
                    itemId: 'allaitement',
                    boxLabel: 'Allaitement',
                    margin: '0 0 0 14'
                }, {
                    xtype: 'checkbox',
                    itemId: 'insuffisanceRenale',
                    boxLabel: 'Insuffisance rénale',
                    margin: '0 0 0 14'
                }, {
                    xtype: 'checkbox',
                    itemId: 'insuffisanceHepatique',
                    boxLabel: 'Insuffisance hépatique',
                    margin: '0 0 0 14'
                }, {
                    xtype: 'component',
                    flex: 1,
                    html: '<span style="color:#888;">Contexte clinique seulement : aucune donnée '
                            + 'identifiant le patient ne quitte l\'officine.</span>'
                }]
            }, {
                xtype: 'gridpanel',
                itemId: 'lignes',
                title: 'PRODUITS À ANALYSER',
                store: storeLignes,
                flex: 1,
                minHeight: 150,
                columns: [
                    {xtype: 'rownumberer', width: 40},
                    {text: 'C.CIP', dataIndex: 'cip', width: 110},
                    {text: 'PRODUIT', dataIndex: 'nom', flex: 3},
                    {text: 'QTÉ', dataIndex: 'quantite', width: 70, align: 'right'},
                    {
                        text: 'POSOLOGIE', dataIndex: 'posologie', flex: 2,
                        editor: {xtype: 'textfield', allowBlank: true}
                    },
                    {
                        xtype: 'actioncolumn', width: 34, menuDisabled: true, sortable: false,
                        items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Retirer ce produit'
                        }]
                    }
                ],
                plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1, pluginId: 'editionLignes'})],
                viewConfig: {emptyText: '<div style="padding:10px;color:#888;">Ajoutez des produits, '
                            + 'ou chargez une vente par sa référence.</div>', deferEmptyText: false}
            }, {
                xtype: 'gridpanel',
                itemId: 'alertes',
                title: 'RÉSULTAT DE L\'ANALYSE',
                store: storeAlertes,
                flex: 1,
                minHeight: 170,
                margin: '6 0 0 0',
                columns: [
                    {
                        text: '', width: 34, dataIndex: 'majeure', menuDisabled: true, sortable: false,
                        renderer: function (v) {
                            return v ? '<span style="color:#c0392b;font-weight:bold;">!</span>' : '';
                        }
                    },
                    {text: 'NATURE', dataIndex: 'type', width: 150},
                    {text: 'GRAVITÉ', dataIndex: 'gravite', width: 140},
                    {
                        text: 'ALERTE', dataIndex: 'libelle', flex: 3,
                        renderer: function (v, meta, rec) {
                            if (rec.get('majeure')) {
                                meta.style = 'color:#c0392b;font-weight:bold;';
                            }
                            return Ext.String.htmlEncode(v || '');
                        }
                    },
                    {
                        text: 'PRODUITS', dataIndex: 'produits', flex: 2,
                        renderer: function (v) {
                            return Ext.String.htmlEncode((v || []).join(', '));
                        }
                    },
                    {text: 'CONDUITE À TENIR', dataIndex: 'recommandation', flex: 3},
                    {text: 'EN RAYON (DCI RECOMMANDÉE)', dataIndex: 'equivalents', flex: 3, itemId: 'colEnRayon',
                        renderer: function (v, meta) {
                        /* Produits du rayon ayant EXACTEMENT la DCI recommandee : stock en bleu, prix en rouge. */
                        var l = Ext.isArray(v) ? v : [];
                        if (!l.length) {
                            return '';
                        }
                        var ligne = function (p) {
                            return Ext.String.htmlEncode(p.nom) + ' — <span style="color:' + (p.stock > 0 ? '#1E5FA8' : '#c0392b')
                                    + ';font-weight:bold">stock ' + p.stock + '</span> — <span style="color:#c0392b;font-weight:bold">'
                                    + Ext.util.Format.number(p.prix || 0, '0,000') + (p.detail ? ' /unité' : '') + '</span>';
                        };
                        meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(Ext.Array.map(l, ligne).join('<br/>')) + '"';
                        return Ext.Array.map(l.slice(0, 3), ligne).join('<br/>') + (l.length > 3 ? '<br/><i>+ '
                                + (l.length - 3) + ' autre(s)</i>' : '');
                    }}
                ],
                viewConfig: {emptyText: '<div style="padding:10px;color:#888;">Aucune analyse lancée.</div>',
                    deferEmptyText: false}
            }, {
                xtype: 'component',
                itemId: 'messageAnalyse',
                height: 26,
                html: ''
            }]
        });
        me.callParent(arguments);
    }
});
