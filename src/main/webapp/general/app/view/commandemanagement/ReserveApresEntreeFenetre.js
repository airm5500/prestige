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

        /**
         * Ouvre « Gestion des réserves », onglet Suggestions, sur la suggestion donnee ; produits (retours du 25/10,
         * point 10) : la suggestion s'affiche limitee aux produits du bon (« Tout afficher » pour le reste).
         */
        ouvrirSuggestion: function (suggestionId, produits) {
            window.PRESTIGE_RESERVE_ONGLET = 'SUGGESTIONS';
            testextjs.app.getController('App').onLoadNewComponent('reservemanager', 'Gestion des reserves', '');
            Ext.defer(function () {
                var m = Ext.getCmp('reservemanagerID'), o = m && m.down('#ongletSuggestions');
                if (o && suggestionId) {
                    Ext.create('testextjs.view.stockmanagement.reserve.action.traitementSuggestion', {suggestionid: suggestionId, parentview: o,
                        produits: produits || null});
                }
            }, 400);
        },

        /** L'utilisateur a-t-il le menu « Gestion des réserves » (droit P_SM_RESERVE) ? */
        aLeMenuReserve: function () {
            var nav = Ext.ComponentQuery.query('navigation')[0], store = nav && nav.getStore ? nav.getStore() : null, trouve = false;
            if (store && store.getRootNode) {
                store.getRootNode().cascadeBy(function (n) {
                    if (n.get('id') === 'reservemanager') {
                        trouve = true;
                        return false;
                    }
                });
            }
            return trouve;
        }
    },

    initComponent: function () {
        var me = this, enc = Ext.String.htmlEncode;
        var refs = Ext.Array.unique(Ext.Array.map(me.lignes, function (l) {
            return l.ref;
        }));
        me.suggestionId = me.lignes[0].suggestionId;
        /* retours du 25/10 (point 10) : sans le menu Reserve, la suggestion ne s'ouvrait pas (« Erreur / Chargement
           impossible ») : message clair, et la liste reste imprimable pour la personne chargee de la reserve */
        me.droitReserve = me.self.aLeMenuReserve();
        me.items = [{
                xtype: 'grid', itemId: 'grilleReserve', border: false,
                store: Ext.create('Ext.data.Store', {fields: ['suggestionId', 'ref', 'categorie', 'cip', 'nom', 'stockRayon', 'stockReserve', 'seuil', 'quantite'],
                    data: me.lignes}),
                dockedItems: [{xtype: 'component', dock: 'top', padding: '10 12',
                        html: '<div style="font-size:13px">' + me.lignes.length + ' produit(s) de ce bon ont atteint leur seuil de réserve. Ils ont été ajoutés à la suggestion de réserve <b>'
                                + enc(refs.join(', ')) + '</b>' + (me.droitReserve ? ' : ouvrez-la pour déplacer les quantités.</div>'
                                        : '.</div><div class="rae-sans-droit" style="margin-top:8px;padding:8px 10px;background:#fff4e5;border:1px solid #f0b46a;'
                                        + 'border-radius:6px;color:#7a3b00">Vous n\'avez pas le droit de traiter la réserve : la liste a été transmise, '
                                        + 'imprimez-la pour la personne chargée de la réserve.</div>')}],
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
            {text: 'Imprimer', itemId: 'btnImprimer', tooltip: 'Imprimer la liste des produits à déplacer', handler: function () {
                    me.imprimer();
                }},
            {text: me.droitReserve ? 'Plus tard' : 'Fermer', itemId: 'btnPlusTard', tooltip: 'La suggestion reste à traiter dans « Gestion des réserves »', handler: function () {
                    me.close();
                }},
            {text: 'Ouvrir la suggestion de réserve', itemId: 'btnOuvrirSuggestion', cls: 'fen-btn fen-btn-principal', hidden: !me.droitReserve, handler: function () {
                    me.ouvrir = true;
                    me.close();
                }}
        ];
        me.on('destroy', function () {
            /* la suite part une fois la fenetre (et son masque) completement retiree */
            var ouvrir = me.ouvrir, suggestionId = me.suggestionId, suite = me.suite;
            var produits = Ext.Array.unique(Ext.Array.map(Ext.Array.filter(me.lignes, function (l) {
                return l.suggestionId === suggestionId && l.produitId;
            }), function (l) {
                return l.produitId;
            }));
            Ext.defer(function () {
                if (ouvrir) {
                    testextjs.view.commandemanagement.ReserveApresEntreeFenetre.ouvrirSuggestion(suggestionId, produits);
                } else if (suite) {
                    suite();
                }
            }, 50);
        });
        me.callParent(arguments);
    },

    /** Impression de la liste (cadre invisible : ni onglet ni fenetre du navigateur). */
    imprimer: function () {
        var me = this, enc = Ext.String.htmlEncode;
        var lignes = Ext.Array.map(me.lignes, function (l) {
            return '<tr><td>' + enc(l.cip || '') + '</td><td>' + enc(l.nom || '') + '</td><td>' + (l.categorie === 'RESERVE' ? 'Rayon → réserve' : 'Réserve → rayon')
                    + '</td><td class="n">' + (l.stockRayon || 0) + '</td><td class="n">' + (l.stockReserve || 0) + '</td><td class="n"><b>' + (l.quantite || 0) + '</b></td></tr>';
        }).join('');
        var html = '<html><head><meta charset="utf-8"><title>Produits à déplacer</title><style>body{font:12px Arial,sans-serif;margin:16px}'
                + 'h1{font-size:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:4px 6px;text-align:left}.n{text-align:right}</style></head>'
                + '<body><h1>Seuil de réserve atteint : produits à déplacer</h1><p>Suggestion ' + enc(Ext.Array.unique(Ext.Array.map(me.lignes, function (l) {
                    return l.ref;
                })).join(', ')) + ' · ' + Ext.Date.format(new Date(), 'd/m/Y H:i') + '</p>'
                + '<table><thead><tr><th>CIP</th><th>Produit</th><th>Sens</th><th class="n">Rayon</th><th class="n">Réserve</th><th class="n">À déplacer</th></tr></thead>'
                + '<tbody>' + lignes + '</tbody></table></body></html>';
        var cadre = document.getElementById('rae-impression');
        if (cadre) {
            cadre.parentNode.removeChild(cadre);
        }
        cadre = document.createElement('iframe');
        cadre.id = 'rae-impression';
        cadre.style.cssText = 'position:absolute;width:0;height:0;border:0;left:-1000px';
        document.body.appendChild(cadre);
        var d = cadre.contentWindow.document;
        d.open();
        d.write(html);
        d.close();
        me.impression = html;
        Ext.defer(function () {
            cadre.contentWindow.focus();
            cadre.contentWindow.print();
        }, 100);
    }
});
