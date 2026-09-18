/* global Ext */

/*
 * Nouveau menu "Gestion des surstocks" (calculs corriges), independant de
 * l'ancien ecran "Articles en sur-stock" conserve tel quel pour comparaison.
 *
 * Definitions :
 *  - Moyenne mensuelle  = quantite vendue sur la periode / nb mois d'historique
 *  - Nb mois de stock   = stock disponible / moyenne mensuelle
 *  - Qte surplus        = stock - (moyenne mensuelle x nb mois de projection)
 *  - Valeur surplus     = qte surplus x prix d'achat
 *  - Coefficient        = stock disponible / quantite vendue sur la periode
 * Regle de surstock : stock > moyenne mensuelle x nb mois de projection.
 * API : ../api/v1/surstock
 */
Ext.define('testextjs.view.produits.GestionSurstock', {
    extend: 'Ext.panel.Panel',
    xtype: 'gestionsurstock',
    id: 'gestionsurstockID',
    frame: true,
    title: 'Gestion des surstocks',
    width: '98%',
    height: 600,
    cls: 'custompanel',
    layout: 'fit',
    initComponent: function () {
        var me = this;

        me.surstockStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'cip', 'libelle',
                {name: 'qteVendue', type: 'number'},
                {name: 'moyenneMensuelle', type: 'number'},
                {name: 'prixVente', type: 'number'},
                {name: 'prixAchat', type: 'number'},
                {name: 'stock', type: 'number'},
                {name: 'coefficient', type: 'number'},
                {name: 'nbMoisStock', type: 'number'},
                {name: 'qteSurplus', type: 'number'},
                {name: 'valeurSurplus', type: 'number'},
                /* Les quatre mois : le mois en cours puis les trois precedents. Ils etaient deja servis par
                 * l'API et presents dans le PDF et l'export, mais l'ecran ne les declarait pas - donc ne
                 * pouvait pas les montrer. Demande du 18/09 : « sur la vue rappeler les mois ». */
                {name: 'mois0', type: 'number'},
                {name: 'mois1', type: 'number'},
                {name: 'mois2', type: 'number'},
                {name: 'mois3', type: 'number'}],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/surstock',
                reader: {type: 'json', root: 'data', totalProperty: 'total', metaProperty: 'metaData'},
                timeout: 600000
            }
        });
        me.surstockStore.on('load', function (store, records, success) {
            var raw = store.getProxy().getReader().rawData;
            var cmp = me.down('#totalValeur');
            if (cmp && raw) {
                cmp.setValue(raw.totalValeur || 0);
            }
            /*
             * Les en-tetes des quatre colonnes de mois prennent les libelles CALCULES PAR LE SERVEUR, et ne
             * sont pas reconstitues en JavaScript : recalculer les mois ici les ferait deriver du calcul au
             * passage d'un mois a l'autre - une recherche lancee le 31 a 23h59 et affichee le 1er a 00h01
             * nommerait des mois qui ne sont pas ceux sur lesquels le chiffre porte.
             */
            if (raw && raw.mois) {
                me.majEntetesDesMois(raw.mois);
                me.majRappelPeriode(raw.mois);
            }
        });

        var comboStore = function (url) {
            return Ext.create('Ext.data.Store', {
                fields: ['id', 'libelle'],
                autoLoad: false,
                pageSize: 9999,
                proxy: {
                    type: 'ajax',
                    url: url,
                    reader: {type: 'json', root: 'data', totalProperty: 'total'}
                }
            });
        };

        var fmt = function (v) {
            return Ext.util.Format.number(v, '0,000.');
        };
        var fmt2 = function (v) {
            return Ext.util.Format.number(v, '0,000.00');
        };
        // Tooltip HTML sur une cellule (metaData.tdAttr) : agrandi, gras bleu
        // (style inline pour ne pas toucher les tooltips du reste de l'application)
        var TIP_STYLE = 'font-size:13px;color:#0D6EFD;font-weight:700;line-height:1.5;';
        var tip = function (metaData, texte) {
            var html = '<div style="' + TIP_STYLE + '">' + Ext.String.htmlEncode(texte) + '</div>';
            metaData.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(html) + '" data-qwidth="340"';
        };
        // Tooltip d'entete de colonne : definition simple, sans calcul.
        // IMPORTANT : aucun guillemet double ici — ExtJS concatene ce texte
        // brut dans data-qtip="..." (Column.initRenderData) et un " interne
        // casserait le HTML des entetes (grille vide).
        var headerTip = function (texte) {
            return "<div style='" + TIP_STYLE + "'>"
                    + Ext.String.htmlEncode(texte) + "</div>";
        };

        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'numberfield',
                            itemId: 'moisHistorique',
                            fieldLabel: 'Nbre mois historique',
                            labelWidth: 115,
                            width: 175,
                            minValue: 1,
                            value: 3,
                            hideTrigger: true,
                            enableKeyEvents: true,
                            listeners: {
                                afterrender: function (fld) {
                                    Ext.tip.QuickTipManager.register({
                                        target: fld.getEl(),
                                        title: 'Nbre mois historique',
                                        width: 340,
                                        text: '<div style="' + TIP_STYLE + '">'
                                                + 'Periode d\'historique des ventes utilisee pour calculer la moyenne '
                                                + 'mensuelle. Exemple : 3 = moyenne calculee sur les ventes des '
                                                + '3 derniers mois.</div>'
                                    });
                                },
                                specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.doSearch();
                                    }
                                }
                            }
                        }, {
                            xtype: 'numberfield',
                            itemId: 'moisProjection',
                            fieldLabel: 'Nbre mois stock projection',
                            labelWidth: 145,
                            width: 210,
                            minValue: 1,
                            value: 3,
                            hideTrigger: true,
                            enableKeyEvents: true,
                            listeners: {
                                afterrender: function (fld) {
                                    Ext.tip.QuickTipManager.register({
                                        target: fld.getEl(),
                                        title: 'Nbre mois stock projection',
                                        width: 340,
                                        text: '<div style="' + TIP_STYLE + '">'
                                                + 'Nombre de mois de stock juge normal a conserver, compare a la '
                                                + 'moyenne mensuelle de vente. Un produit est en surstock si son '
                                                + 'stock disponible depasse : moyenne mensuelle x ce nombre de mois. '
                                                + 'Exemple : 3 = alerte au-dela de 3 mois de stock disponible.</div>'
                                    });
                                },
                                specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.doSearch();
                                    }
                                }
                            }
                        }, {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            emptyText: 'CIP, nom ou EAN',
                            enableKeyEvents: true,
                            listeners: {
                                specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.doSearch();
                                    }
                                }
                            }
                        }, {
                            xtype: 'combobox',
                            itemId: 'rayons',
                            flex: 1,
                            store: comboStore('../api/v1/common/rayons'),
                            pageSize: 99999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Emplacement'
                        }, {
                            xtype: 'combobox',
                            itemId: 'grossiste',
                            flex: 1,
                            store: comboStore('../api/v1/common/grossiste'),
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Grossiste'
                        }, {
                            xtype: 'combobox',
                            itemId: 'codeFamille',
                            flex: 1,
                            store: comboStore('../api/v1/common/famillearticles'),
                            pageSize: 9999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Famille'
                        }, {
                            text: 'Rechercher',
                            itemId: 'rechercher',
                            iconCls: 'searchicon',
                            scope: me,
                            handler: me.doSearch
                        }
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            text: 'Imprimer',
                            iconCls: 'printable',
                            scope: me,
                            handler: me.doPrint
                        }, {
                            text: 'Export Excel',
                            tooltip: 'Exporter la liste filtree en Excel',
                            scope: me,
                            handler: me.doExcel
                        }, {
                            text: 'Creer inventaire',
                            iconCls: 'addicon',
                            tooltip: 'Creer un inventaire avec tous les produits de la liste filtree',
                            scope: me,
                            handler: me.onCreateInventaire
                        }, '-', {
                            /*
                             * RAPPEL DE PERIODE, en clair et sur l'ecran.
                             *
                             * « 3 mois » ne dit pas LESQUELS. L'ecart signale le 18/09 - 34 contre 35 - venait de
                             * la : on rapprochait un total et des colonnes de mois sans savoir qu'ils ne
                             * couvraient pas la meme chose. Le rappel nomme les mois retenus, dit que le mois en
                             * cours n'y entre pas, et previent quand l'historique demande depasse les trois mois
                             * affiches.
                             */
                            xtype: 'displayfield',
                            itemId: 'rappelPeriode',
                            fieldLabel: 'Historique',
                            labelWidth: 62,
                            width: 430,
                            fieldStyle: 'font-weight:700;',
                            value: '—'
                        }, '->', {
                            xtype: 'displayfield',
                            itemId: 'totalValeur',
                            fieldLabel: 'Valeur totale surplus (achat)',
                            labelWidth: 170,
                            fieldStyle: 'color:blue;font-weight:800;',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            value: 0
                        }
                    ]
                }
            ],
            items: [
                {
                    xtype: 'gridpanel',
                    itemId: 'surstockGrid',
                    autoScroll: true,
                    store: me.surstockStore,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [
                        {
                            header: 'Code CIP', dataIndex: 'cip', flex: 0.5,
                            tooltip: headerTip('Code CIP du produit')
                        },
                        {
                            header: 'Libell&eacute;', dataIndex: 'libelle', flex: 1.3,
                            tooltip: headerTip('Nom du produit')
                        },
                        {
                            header: 'Qt&eacute;.Vendue',
                            dataIndex: 'qteVendue',
                            align: 'right',
                            flex: 0.45,
                            tooltip: headerTip('Quantite vendue sur les mois COMPLETS de la periode '
                                    + 'd\'historique. Le mois en cours, incomplet, n\'y entre pas : il est '
                                    + 'affiche a part, dans sa propre colonne.'),
                            renderer: function (v, metaData, rec) {
                                // La periode est nommee par ses MOIS, pas par un nombre : c'est ce qui permet
                                // de rapprocher ce total des colonnes de mois qui le composent.
                                tip(metaData, 'Vendus de ' + me.periodeHistorique() + ' : ' + fmt(v)
                                        + ' — soit la somme des colonnes de mois, mois en cours exclu');
                                return fmt(v);
                            }
                        },
                        {
                            header: 'Moy.mensuelle',
                            dataIndex: 'moyenneMensuelle',
                            align: 'right',
                            flex: 0.5,
                            // Demande du 18/09 : la moyenne mensuelle en BLEU. C'est la grandeur qui commande
                            // tout le reste de la ligne (coefficient, mois de stock, surplus).
                            tdCls: 'surstock-moyenne',
                            tooltip: headerTip('Vente moyenne par mois, sur les mois complets de la periode '
                                    + 'd\'historique'),
                            renderer: function (v, metaData, rec) {
                                tip(metaData, rec.get('qteVendue') + ' vendus de ' + me.periodeHistorique()
                                        + ' / ' + me.down('#moisHistorique').getValue() + ' mois = ' + fmt2(v)
                                        + ' par mois');
                                return fmt2(v);
                            }
                        },
                        {
                            header: 'Prix.Vente', dataIndex: 'prixVente', align: 'right', flex: 0.45,
                            tooltip: headerTip('Prix de vente unitaire du produit'),
                            renderer: fmt
                        },
                        {
                            header: 'Prix.Achat', dataIndex: 'prixAchat', align: 'right', flex: 0.45,
                            tooltip: headerTip('Prix d\'achat unitaire du produit'),
                            renderer: fmt
                        },
                        {
                            header: 'Qt&eacute;.Stock', dataIndex: 'stock', align: 'right', flex: 0.45,
                            tooltip: headerTip('Stock disponible actuellement'),
                            renderer: fmt
                        },
                        {
                            header: 'Coefficient',
                            dataIndex: 'coefficient',
                            align: 'right',
                            flex: 0.45,
                            tooltip: headerTip('Importance du stock par rapport aux ventes : '
                                    + 'plus le coefficient est eleve, plus le stock est gros par rapport '
                                    + 'a ce qui se vend'),
                            renderer: function (v, metaData, rec) {
                                tip(metaData, 'Stock / quantite vendue sur la periode : ' + rec.get('stock') + ' / '
                                        + rec.get('qteVendue') + ' = ' + fmt2(v));
                                return fmt2(v);
                            }
                        },
                        {
                            header: 'Stock/Moyen',
                            dataIndex: 'nbMoisStock',
                            align: 'right',
                            flex: 0.5,
                            tooltip: headerTip('Nombre de mois que le stock actuel peut couvrir '
                                    + 'au rythme de vente moyen'),
                            renderer: function (v, metaData, rec) {
                                tip(metaData, 'Nb de mois de stock disponible : stock ' + rec.get('stock')
                                        + ' / moyenne mensuelle ' + fmt2(rec.get('moyenneMensuelle')) + ' = '
                                        + fmt2(v) + ' mois');
                                return fmt2(v);
                            }
                        },
                        {
                            header: 'Qt&eacute;.surplus',
                            dataIndex: 'qteSurplus',
                            align: 'right',
                            flex: 0.45,
                            // Demande du 18/09 : la quantite de surplus en VERT. C'est la conclusion de la
                            // ligne - ce qu'on peut retirer du stock.
                            tdCls: 'surstock-surplus',
                            tooltip: headerTip('Quantite en trop par rapport au stock juge normal '
                                    + '(nb de mois de projection)'),
                            renderer: function (v, metaData, rec) {
                                tip(metaData, 'Stock ' + rec.get('stock') + ' - (moyenne mensuelle '
                                        + fmt2(rec.get('moyenneMensuelle')) + ' x ' + me.down('#moisProjection').getValue()
                                        + ' mois de projection) = ' + fmt(v));
                                return fmt(v);
                            }
                        },
                        {
                            header: 'Valeur.Achat',
                            dataIndex: 'valeurSurplus',
                            align: 'right',
                            flex: 0.6,
                            tooltip: headerTip('Argent immobilise par le surplus, valorise au prix d\'achat'),
                            renderer: function (v, metaData, rec) {
                                tip(metaData, 'Qte surplus ' + rec.get('qteSurplus') + ' x prix achat '
                                        + fmt(rec.get('prixAchat')) + ' = ' + fmt(v));
                                return fmt(v);
                            }
                        },
                        /*
                         * LES QUATRE MOIS — demande du 18/09 : « sur la vue rappeler les mois (en cours et les
                         * 3 derniers) ». Ils etaient deja dans le PDF et dans l'export ; ils manquaient a
                         * l'ecran, c'est-a-dire a l'endroit ou l'on decide.
                         *
                         * Les en-tetes portent des libelles provisoires : ils sont remplaces par les vrais noms
                         * de mois a la premiere lecture, avec ceux que le serveur a calcules (majEntetesDesMois).
                         *
                         * Le mois en cours est presente a part, en grise et en italique : il est INCOMPLET et
                         * n'entre ni dans la quantite vendue ni dans la moyenne. Le confondre avec les autres
                         * est precisement ce qui a fait chercher un ecart de 34 contre 35.
                         */
                        {
                            header: 'Mois en cours',
                            itemId: 'colMois0',
                            dataIndex: 'mois0',
                            align: 'right',
                            flex: 0.45,
                            tdCls: 'surstock-mois-encours',
                            tooltip: headerTip('Ventes du mois EN COURS. Mois incomplet : il n\'entre pas dans '
                                    + 'la quantite vendue ni dans la moyenne mensuelle.'),
                            renderer: function (v, metaData, rec) {
                                tip(metaData, 'Mois en cours, incomplet : pour information seulement');
                                return fmt(v);
                            }
                        },
                        {
                            header: 'M-1', itemId: 'colMois1', dataIndex: 'mois1', align: 'right', flex: 0.42,
                            tooltip: headerTip('Ventes du mois precedent'), renderer: fmt
                        },
                        {
                            header: 'M-2', itemId: 'colMois2', dataIndex: 'mois2', align: 'right', flex: 0.42,
                            tooltip: headerTip('Ventes du mois d\'avant'), renderer: fmt
                        },
                        {
                            header: 'M-3', itemId: 'colMois3', dataIndex: 'mois3', align: 'right', flex: 0.42,
                            tooltip: headerTip('Ventes du troisieme mois precedent'), renderer: fmt
                        }
                    ],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: me.surstockStore,
                        displayInfo: true
                    }
                }
            ]
        });

        me.callParent(arguments);
        // pas de chargement automatique a l'ouverture : l'utilisateur lance
        // la recherche lui-meme (bouton Rechercher ou touche Entree)
    },
    /**
     * Renomme les quatre colonnes de mois avec les libelles calcules par le serveur.
     *
     * Le mois en cours garde une mention explicite : « Septembre (en cours) ». Sans elle, on additionne les
     * quatre colonnes et l'on ne retrouve pas la quantite vendue - c'est exactement le rapprochement qui a
     * fait chercher un ecart.
     *
     * @param {Object} mois libelles servis par l'API : mois0 (en cours) a mois3, plus histDebut / histFin
     */
    majEntetesDesMois: function (mois) {
        var me = this;
        var poser = function (selecteur, texte) {
            var colonne = me.down(selecteur);
            if (colonne && !colonne.isDestroyed) {
                colonne.setText(texte);
            }
        };
        me.libellesMois = mois;
        poser('#colMois0', Ext.String.htmlEncode(mois.mois0 || '') + ' <i>(en cours)</i>');
        poser('#colMois1', Ext.String.htmlEncode(mois.mois1 || 'M-1'));
        poser('#colMois2', Ext.String.htmlEncode(mois.mois2 || 'M-2'));
        poser('#colMois3', Ext.String.htmlEncode(mois.mois3 || 'M-3'));
    },

    /**
     * Rappelle en clair, dans la barre, sur quels mois porte le calcul.
     *
     * Deux precisions qui evitent de chercher un ecart inexistant : le mois en cours n'entre pas dans le
     * calcul, et lorsque l'historique demande depasse les trois mois affiches, les colonnes de mois ne
     * couvrent qu'une partie de la periode - la somme des colonnes ne peut alors pas egaler la quantite
     * vendue, et c'est normal.
     */
    majRappelPeriode: function (mois) {
        var me = this;
        var champ = me.down('#rappelPeriode');
        if (!champ || champ.isDestroyed) { return; }
        var nbMois = me.down('#moisHistorique').getValue() || 3;
        var texte = me.periodeHistorique() + ' (' + nbMois + ' mois complet'
                + (nbMois > 1 ? 's' : '') + ', ' + (mois.moisEnCours || '') + ' en cours exclu)';
        if (nbMois > 3) {
            texte += ' — les colonnes de mois n\'en montrent que les 3 derniers';
        }
        champ.setValue(texte);
    },

    /** La periode d'historique, nommee par ses mois : « juin à août » plutôt que « 3 mois ». */
    periodeHistorique: function () {
        var mois = this.libellesMois;
        if (!mois || !mois.histDebut) {
            return this.down('#moisHistorique').getValue() + ' mois complets';
        }
        return mois.histDebut === mois.histFin ? mois.histDebut : mois.histDebut + ' à ' + mois.histFin;
    },

    getFilters: function () {
        var me = this;
        return {
            moisHistorique: me.down('#moisHistorique').getValue() || 3,
            moisProjection: me.down('#moisProjection').getValue() || 3,
            query: me.down('#query').getValue() || '',
            codeRayon: me.down('#rayons').getValue() || '',
            codeGrossiste: me.down('#grossiste').getValue() || '',
            codeFamille: me.down('#codeFamille').getValue() || ''
        };
    },
    doSearch: function () {
        var me = this, filters = me.getFilters();
        var proxy = me.surstockStore.getProxy();
        Ext.Object.each(filters, function (k, v) {
            proxy.setExtraParam(k, v);
        });
        me.surstockStore.loadPage(1);
    },
    doPrint: function () {
        var me = this;
        var progress = Ext.MessageBox.wait('Generation du PDF . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            url: '../api/v1/surstock/pdf',
            method: 'GET',
            params: me.getFilters(),
            timeout: 600000,
            success: function (resp) {
                progress.hide();
                var r = Ext.JSON.decode(resp.responseText, true);
                if (r && r.success && r.url) {
                    window.open(r.url);
                } else {
                    Ext.MessageBox.alert('Impression', "La generation du PDF n'a pas abouti.");
                }
            },
            failure: function () {
                progress.hide();
                Ext.MessageBox.alert('Impression', 'La generation du PDF a echoue.');
            }
        });
    },
    doExcel: function () {
        window.location = '../api/v1/surstock/excel?' + Ext.Object.toQueryString(this.getFilters());
    },
    onCreateInventaire: function () {
        var me = this, filters = me.getFilters();
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Controle des produits');
        Ext.Ajax.request({
            url: '../api/v1/surstock/produits/count',
            method: 'GET',
            params: filters,
            timeout: 600000,
            success: function (resp) {
                progress.hide();
                var r = Ext.JSON.decode(resp.responseText, true);
                var count = (r && r.count) ? r.count : 0;
                if (count === 0) {
                    Ext.MessageBox.alert('Message', 'Aucun produit en surstock avec ces criteres.');
                    return;
                }
                Ext.MessageBox.confirm('Confirmation',
                        'Vous allez creer un inventaire contenant <b>' + count
                        + '</b> produit(s) en surstock (liste filtree complete).<br/>Confirmez-vous ?',
                        function (btn) {
                            if (btn !== 'yes') {
                                return;
                            }
                            var prog = Ext.MessageBox.wait('Veuillez patienter...', 'Creation de l\'inventaire');
                            Ext.Ajax.request({
                                // filtres en query string : le endpoint lit des @QueryParam
                                url: '../api/v1/surstock/create-inventaire?' + Ext.Object.toQueryString(filters),
                                method: 'POST',
                                timeout: 600000,
                                success: function (response) {
                                    prog.hide();
                                    var res = Ext.JSON.decode(response.responseText, true);
                                    if (res && res.success) {
                                        Ext.MessageBox.alert('Inventaire',
                                                'Inventaire cree.<br/>Produits en compte : <b>' + (res.count || 0) + '</b>');
                                    } else {
                                        Ext.MessageBox.alert('Erreur',
                                                (res && res.message) ? res.message : "La creation de l'inventaire a echoue.");
                                    }
                                },
                                failure: function () {
                                    prog.hide();
                                    Ext.MessageBox.alert('Erreur',
                                            "La creation de l'inventaire a echoue. Aucun inventaire partiel n'a ete cree.");
                                }
                            });
                        });
            },
            failure: function () {
                progress.hide();
                Ext.MessageBox.alert('Erreur', 'Le controle du nombre de produits a echoue.');
            }
        });
    }
});
