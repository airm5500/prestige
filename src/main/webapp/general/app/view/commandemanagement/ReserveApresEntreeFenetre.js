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
        /* retour du 04/11 : la suggestion du bon porte son numero */
        var refs = Ext.Array.unique(Ext.Array.map(me.lignes, function (l) {
            return l.ref + (l.bon ? ' du BL ' + l.bon : '');
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

    /**
     * Impression de la liste (cadre invisible : ni onglet ni fenetre du navigateur). Plan du 08/11, point 8 : le PDF
     * de l\'edition (jrxml), lu en base comme la fenetre, remplace la page HTML construite ici.
     */
    imprimer: function () {
        var me = this, b = me.down('#btnImprimer');
        var ids = function (cle) {
            return Ext.Array.unique(Ext.Array.filter(Ext.Array.map(me.lignes, function (l) {
                return l[cle];
            }), function (x) {
                return !!x;
            })).join(',');
        };
        if (b) {
            b.disable();
        }
        Ext.Ajax.request({
            url: '../api/v1/suggestion-reserve/apres-entree/pdf', method: 'GET',
            params: {suggestions: ids('suggestionId'), produits: ids('produitId')},
            callback: function (opt, succes, rep) {
                if (b && !b.isDestroyed) {
                    b.enable();
                }
                var o = null;
                try {
                    o = Ext.decode(rep.responseText);
                } catch (e) {
                    o = null;
                }
                if (!succes || !o || !o.success || !o.url) {
                    if (window.PrestigeToast) {
                        PrestigeToast.afficher((o && o.msg) || 'Impression impossible.', {niveau: 'erreur', titre: 'Impression'});
                    }
                    return;
                }
                var cadre = document.getElementById('rae-impression');
                if (cadre) {
                    cadre.parentNode.removeChild(cadre);
                }
                cadre = document.createElement('iframe');
                cadre.id = 'rae-impression';
                cadre.style.cssText = 'position:absolute;width:0;height:0;border:0;left:-1000px';
                cadre.onload = function () {
                    try {
                        cadre.contentWindow.focus();
                        cadre.contentWindow.print();
                    } catch (e) {
                        window.open('..' + o.url);
                    }
                };
                me.impression = o.url;
                cadre.src = '..' + o.url;
                document.body.appendChild(cadre);
            }
        });
    }
});
