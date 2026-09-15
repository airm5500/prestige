Ext.define('testextjs.view.stat.ArticleMvtGrid', {
    extend: 'Ext.grid.Panel',
    xtype: 'articlemvtgrid',

    requires: [
        'testextjs.store.ArticleMvtStore'
    ],

    title: 'Articles en mouvement',

    frame: true,
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: { type: 'fit' },

    forceFit: true,
    columnLines: true,
    viewConfig: { stripeRows: true, enableTextSelection: true },

    // Combo de filtre alimente par un service distant renvoyant {data:[{id, libelle}]}.
    // La valeur 'ALL' est l'entree "Tous" ajoutee cote serveur : elle vaut "pas de filtre".
    comboFiltre: function (itemId, libelle, url, largeur) {
        return {
            xtype: 'combobox',
            itemId: itemId,
            fieldLabel: libelle,
            labelWidth: 85,
            width: largeur || 250,
            store: Ext.create('Ext.data.Store', {
                fields: ['id', 'libelle'],
                autoLoad: true,
                proxy: {
                    type: 'ajax',
                    url: url,
                    reader: { type: 'json', root: 'data', totalProperty: 'total' }
                }
            }),
            valueField: 'id',
            displayField: 'libelle',
            // Pas de valeur initiale : le store est distant, forcer 'ALL' avant son
            // chargement afficherait le code brut. Vide et 'ALL' valent tous deux
            // "pas de filtre" cote serveur.
            editable: false,
            forceSelection: true,
            queryMode: 'local',
            emptyText: 'Tous'
        };
    },

    initComponent: function () {
        var me = this;

        me.store = Ext.create('testextjs.store.ArticleMvtStore', {
            autoLoad: false
        });

        me.selModel = Ext.create('Ext.selection.CheckboxModel', {
            mode: 'MULTI',
            checkOnly: true,
            allowDeselect: true,
            pruneRemoved: true // enlève la sélection quand le store change
        });

        Ext.apply(me, {
            dockedItems: [{
                // Premiere barre : periode et recherche libre.
                xtype: 'toolbar',
                dock: 'top',
                itemId: 'barreRecherche',
                items: [
                    { xtype: 'datefield', itemId: 'dtStart', fieldLabel: 'Du', labelWidth: 25, width: 160, format: 'Y-m-d', submitFormat: 'Y-m-d', maxValue: new Date(), value: new Date() },
                    { xtype: 'datefield', itemId: 'dtEnd', fieldLabel: 'Au', labelWidth: 20, width: 155, format: 'Y-m-d', submitFormat: 'Y-m-d', maxValue: new Date(), value: new Date() },
                    { xtype: 'textfield', itemId: 'queryField', flex: 1, emptyText: 'Rechercher (CIP ou Nom)...', enableKeyEvents: true },
                    { xtype: 'button', itemId: 'btnSearch', text: 'Rechercher', iconCls: 'icon-find' },
                    { xtype: 'button', itemId: 'btnReset', text: 'Réinitialiser', iconCls: 'icon-refresh' },
                    { xtype: 'button', itemId: 'btnExportExcel', text: 'Exporter Excel', iconCls: 'icon-excel' }
                ]
            }, {
                // Deuxieme barre : le "mode" de mouvement et les deux axes de classement de l'article.
                // Separee de la premiere pour que la recherche libre reste lisible.
                xtype: 'toolbar',
                dock: 'top',
                itemId: 'barreFiltres',
                items: [
                    me.comboFiltre('filtreTypeMvt', 'Mode de mvt', '../api/v1/articlemvt/types', 280),
                    me.comboFiltre('filtreEmplacement', 'Emplacement', '../api/v1/common/rayons', 230),
                    me.comboFiltre('filtreFamille', 'Famille', '../api/v1/common/famillearticles', 230),
                    '->',
                    { xtype: 'button', itemId: 'btnCreateInventaireListe', text: 'Créer inventaire (toute la liste)', iconCls: 'icon-add' },
                    { xtype: 'button', itemId: 'btnCreateInventaire', text: 'Créer inventaire (sélection)', iconCls: 'icon-add', disabled: true }
                ]
            }, {
                xtype: 'pagingtoolbar',
                dock: 'bottom',
                store: me.store,
                displayInfo: true
            }],

            columns: [
                { text: 'ID', dataIndex: 'lgFamilleId', hidden: true },
                { text: 'CIP', dataIndex: 'codeCip', flex: 1 },
                { text: 'Désignation', dataIndex: 'strName', flex: 3 },
                { text: 'Emplacement', dataIndex: 'emplacement', flex: 1.2 },
                { text: 'Famille', dataIndex: 'famille', flex: 1.2 },
                // Un article peut avoir bouge de plusieurs facons sur la periode : les types sont
                // concatenes cote serveur pour que la grille garde une seule ligne par article.
                { text: 'Type(s) de mouvement', dataIndex: 'typesMvt', flex: 2 },
                { text: 'PA', dataIndex: 'prixAchat', flex: 1, align: 'right', renderer: function (v) { return Ext.util.Format.number(v || 0, '0,0'); } },
                { text: 'PV', dataIndex: 'prixVente', flex: 1, align: 'right', renderer: function (v) { return Ext.util.Format.number(v || 0, '0,0'); } }
            ]
        });

        me.callParent(arguments);

        me.store.on('beforeload', function () {
            me.getSelectionModel().deselectAll(true);
        });
        me.store.on('load', function () {
            me.getSelectionModel().deselectAll(true);
        });

        me.getSelectionModel().on('selectionchange', function (sm, selections) {
            var b = me.down('button[itemId=btnCreateInventaire]');
            if (b) { b.setDisabled(selections.length === 0); }
        });

        // ✅ 3) méthode de reset “écran”
        me.resetScreen = function () {
            var q = me.down('textfield[itemId=queryField]');
            var d1 = me.down('datefield[itemId=dtStart]');
            var d2 = me.down('datefield[itemId=dtEnd]');

            if (q)  q.setValue('');
            if (d1) d1.setValue(null);
            if (d2) d2.setValue(null);

            Ext.Array.each(['filtreTypeMvt', 'filtreEmplacement', 'filtreFamille'], function (id) {
                var c = me.down('combobox[itemId=' + id + ']');
                if (c) { c.setValue(null); }
            });

            me.getSelectionModel().deselectAll(true);

            me.store.removeAll();
            me.store.currentPage = 1;

            var p = me.store.getProxy().extraParams || {};
            p.query = '';
            p.dtStart = '';
            p.dtEnd = '';
            p.typeMvt = '';
            p.emplacementId = '';
            p.familleId = '';
            me.store.getProxy().extraParams = p;
        };
    }
});
