/* global Ext */

/*
 * SEUIL DE RESERVE ATTEINT APRES UNE ENTREE EN STOCK (retours du 13/10, point 6).
 *
 * A la cloture d'un bon de livraison, le serveur range deja les produits geres en reserve dont le seuil est atteint
 * dans la suggestion de reserve automatique (rayon trop plein : vers la reserve ; rayon sous le seuil mini : depuis la
 * reserve). Cette fenetre les montre a la fin de l'entree en stock et ouvre la suggestion dans « Gestion des
 * réserves » (onglet Suggestions). « Plus tard » reprend la suite habituelle ; la suggestion reste a traiter.
 */
Ext.define('testextjs.view.commandemanagement.ReserveApresEntreeFenetre', {
    extend: 'Ext.window.Window',
    xtype: 'reserveapresentree',
    title: 'Seuil de réserve atteint',
    modal: true,
    closeAction: 'destroy',
    width: 820,
    height: 440,
    layout: 'fit',
    lignes: [],
    suite: null,

    statics: {
        /** Fenetre seulement s'il y a des produits ; sinon « suite » tout de suite. */
        afficherPuis: function (lignes, suite) {
            if (!lignes || !lignes.length) {
                if (suite) {
                    suite();
                }
                return null;
            }
            var w = Ext.create('testextjs.view.commandemanagement.ReserveApresEntreeFenetre', {lignes: lignes, suite: suite});
            w.show();
            return w;
        },

        /** Ouvre « Gestion des réserves », onglet Suggestions, sur la suggestion donnee. */
        ouvrirSuggestion: function (suggestionId) {
            window.PRESTIGE_RESERVE_ONGLET = 'SUGGESTIONS';
            testextjs.app.getController('App').onLoadNewComponent('reservemanager', 'Gestion des reserves', '');
            Ext.defer(function () {
                var m = Ext.getCmp('reservemanagerID'), o = m && m.down('#ongletSuggestions');
                if (o && suggestionId) {
                    Ext.create('testextjs.view.stockmanagement.reserve.action.traitementSuggestion', {suggestionid: suggestionId, parentview: o});
                }
            }, 400);
        }
    },

    initComponent: function () {
        var me = this, enc = Ext.String.htmlEncode;
        var refs = Ext.Array.unique(Ext.Array.map(me.lignes, function (l) {
            return l.ref;
        }));
        me.suggestionId = me.lignes[0].suggestionId;
        me.items = [{
                xtype: 'grid', itemId: 'grilleReserve', border: false,
                store: Ext.create('Ext.data.Store', {fields: ['suggestionId', 'ref', 'categorie', 'cip', 'nom', 'stockRayon', 'stockReserve', 'seuil', 'quantite'],
                    data: me.lignes}),
                dockedItems: [{xtype: 'component', dock: 'top', padding: '10 12',
                        html: '<div style="font-size:13px">' + me.lignes.length + ' produit(s) de ce bon ont atteint leur seuil de réserve. Ils ont été ajoutés à la suggestion de réserve <b>'
                                + enc(refs.join(', ')) + '</b> : ouvrez-la pour déplacer les quantités.</div>'}],
                columns: [
                    {text: 'CIP', dataIndex: 'cip', width: 95},
                    {text: 'Produit', dataIndex: 'nom', flex: 1},
                    {text: 'Sens', dataIndex: 'categorie', width: 130, renderer: function (v) {
                            return v === 'RESERVE' ? '<b style="color:#8a5a00">Rayon → réserve</b>' : '<b style="color:#1a5f9e">Réserve → rayon</b>';
                        }},
                    {text: 'Rayon', dataIndex: 'stockRayon', width: 70, align: 'right'},
                    {text: 'Réserve', dataIndex: 'stockReserve', width: 75, align: 'right'},
                    {text: 'Seuil', dataIndex: 'seuil', width: 65, align: 'right'},
                    {text: 'À déplacer', dataIndex: 'quantite', width: 90, align: 'right', renderer: function (v) {
                            return '<b>' + v + '</b>';
                        }}
                ]
            }];
        me.buttons = [
            {text: 'Plus tard', itemId: 'btnPlusTard', tooltip: 'La suggestion reste à traiter dans « Gestion des réserves »', handler: function () {
                    me.close();
                }},
            {text: 'Ouvrir la suggestion de réserve', itemId: 'btnOuvrirSuggestion', cls: 'fen-btn fen-btn-principal', handler: function () {
                    me.ouvrir = true;
                    me.close();
                }}
        ];
        me.on('destroy', function () {
            /* la suite part une fois la fenetre (et son masque) completement retiree */
            var ouvrir = me.ouvrir, suggestionId = me.suggestionId, suite = me.suite;
            Ext.defer(function () {
                if (ouvrir) {
                    testextjs.view.commandemanagement.ReserveApresEntreeFenetre.ouvrirSuggestion(suggestionId);
                } else if (suite) {
                    suite();
                }
            }, 50);
        });
        me.callParent(arguments);
    }
});
