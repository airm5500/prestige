/* global Ext */

// Historique global des mouvements de reserve, classe par date decroissante.
//   typeFilter 'ALL'      -> assorts + reassorts combines
//   typeFilter 'ASSORT'   -> reappros reserve uniquement
//   typeFilter 'REASSORT' -> reassorts rayon uniquement
Ext.define('testextjs.view.stockmanagement.reserve.action.historiqueGlobal', {
    extend: 'Ext.window.Window',
    xtype: 'reservehistoriqueglobal',
    requires: ['Ext.grid.*', 'Ext.data.*', 'Ext.window.Window', 'Ext.form.*'],
    config: {
        typeFilter: 'ALL',
        titre: ''
    },
    initComponent: function () {
        var me = this;
        var typeFilter = me.getTypeFilter() || 'ALL';

        var store = new Ext.data.Store({
            fields: [
                'lg_MOUVEMENT_ID', 'int_CIP', 'str_NAME', 'str_TYPE',
                {name: 'int_QTE', type: 'int'},
                {name: 'int_STOCK_RAYON_AVANT', type: 'int'},
                {name: 'int_STOCK_RESERVE_AVANT', type: 'int'},
                {name: 'int_STOCK_RAYON_APRES', type: 'int'},
                {name: 'int_STOCK_RESERVE_APRES', type: 'int'},
                'str_USER', 'dt_CREATED'
            ],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/reserve/mouvements',
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });

        var loadWithFilters = function () {
            var extra = {};
            if (typeFilter !== 'ALL') {
                extra.type = typeFilter;
            }
            var terme = rechField.getValue();
            if (terme && terme.trim() !== '') {
                extra.search_value = terme.trim();
            }
            var dtStart = dtStartField.getValue();
            var dtEnd   = dtEndField.getValue();
            if (dtStart) {
                extra.dtStart = Ext.Date.format(dtStart, 'Y-m-d');
            }
            if (dtEnd) {
                extra.dtEnd = Ext.Date.format(dtEnd, 'Y-m-d');
            }
            store.getProxy().extraParams = extra;
            store.load();
        };

        // Recherche par produit : designation ou code CIP. Meme comportement que les autres
        // zones de recherche de la reserve - Entree cherche tout de suite, et a partir de trois
        // caracteres la recherche part seule apres une pause de frappe.
        var rechField = Ext.create('Ext.form.field.Text', {
            width: 200,
            emptyText: 'Produit ou CIP',
            listeners: {
                specialkey: function (f, e) {
                    if (e.getKey() === e.ENTER) {
                        f.dernierTerme = (f.getValue() || '').trim();
                        loadWithFilters();
                    }
                },
                change: {
                    buffer: 800,
                    fn: function (f, v) {
                        var terme = (v || '').trim();
                        if (terme.length > 0 && terme.length < 3) {
                            return;
                        }
                        if (terme === f.dernierTerme) {
                            return;
                        }
                        f.dernierTerme = terme;
                        loadWithFilters();
                    }
                }
            }
        });

        var dtStartField = Ext.create('Ext.form.field.Date', {
            fieldLabel: 'Du',
            labelWidth: 25,
            width: 160,
            format: 'd/m/Y',
            emptyText: 'jj/mm/aaaa'
        });

        var dtEndField = Ext.create('Ext.form.field.Date', {
            fieldLabel: 'Au',
            labelWidth: 25,
            width: 160,
            format: 'd/m/Y',
            emptyText: 'jj/mm/aaaa'
        });

        var typeCombo = Ext.create('Ext.form.field.ComboBox', {
            fieldLabel: 'Type',
            labelWidth: 35,
            width: 155,
            store: [['ALL', 'Tous'], ['ASSORT', 'Assort'], ['REASSORT', 'Reassort']],
            value: typeFilter,
            editable: false,
            listeners: {
                select: function (cb) {
                    typeFilter = cb.getValue();
                }
            }
        });

        var grid = Ext.create('Ext.grid.Panel', {
            store: store,
            border: false,
            tbar: [
                rechField, ' ',
                dtStartField, ' ',
                dtEndField, ' ',
                typeCombo, ' ',
                {text: 'Rechercher', handler: loadWithFilters},
                '-',
                {
                    text: 'Effacer',
                    handler: function () {
                        rechField.setValue('');
                        rechField.dernierTerme = '';
                        // On revient a la journee en cours, et non a une periode vide qui
                        // rechargerait tout l'historique.
                        var ceJour = new Date();
                        dtStartField.setValue(ceJour);
                        dtEndField.setValue(ceJour);
                        typeCombo.setValue(me.getTypeFilter() || 'ALL');
                        typeFilter = me.getTypeFilter() || 'ALL';
                        loadWithFilters();
                    }
                }
            ],
            columns: [
                {header: 'Date', dataIndex: 'dt_CREATED', flex: 1.3},
                {header: 'CIP', dataIndex: 'int_CIP', flex: 0.8},
                {header: 'Designation', dataIndex: 'str_NAME', flex: 1.6},
                {
                    header: 'Type', dataIndex: 'str_TYPE', flex: 1,
                    renderer: function (v, m) {
                        if (v === 'REASSORT') {
                            m.style = 'color:#1f7a1f; font-weight:bold;';
                        } else if (v === 'ASSORT') {
                            m.style = 'color:#cc6600; font-weight:bold;';
                        }
                        return v;
                    }
                },
                {header: 'Qte', dataIndex: 'int_QTE', align: 'center', flex: 0.6},
                {
                    header: 'Rayon (avant -> apres)', align: 'center', flex: 1.3,
                    renderer: function (v, m, r) {
                        return r.get('int_STOCK_RAYON_AVANT') + ' → ' + r.get('int_STOCK_RAYON_APRES');
                    }
                },
                {
                    header: 'Reserve (avant -> apres)', align: 'center', flex: 1.3,
                    renderer: function (v, m, r) {
                        return r.get('int_STOCK_RESERVE_AVANT') + ' → ' + r.get('int_STOCK_RESERVE_APRES');
                    }
                },
                {header: 'Utilisateur', dataIndex: 'str_USER', flex: 1}
            ],
            viewConfig: {emptyText: 'Aucun mouvement enregistre.', deferEmptyText: false},
            // Un meme produit peut apparaitre sur plusieurs mouvements : le nombre de lignes ne
            // dit donc pas combien de produits sont concernes. Les deux sont affiches.
            bbar: [{xtype: 'tbtext', itemId: 'compteurs', text: ''}]
        });

        // Recalcul des compteurs a chaque chargement, sur les lignes REELLEMENT ramenees.
        store.on('load', function (st, records) {
            var produits = {}, distincts = 0, i, id;
            records = records || [];
            for (i = 0; i < records.length; i++) {
                // Le CIP identifie le produit et fait partie des champs declares du store ;
                // lg_FAMILLE_ID ne l'est pas et serait lu comme vide.
                id = records[i].get('int_CIP');
                if (id && !produits[id]) {
                    produits[id] = true;
                    distincts++;
                }
            }
            var cmp = grid.down('#compteurs');
            if (cmp) {
                cmp.setText('<b>' + records.length + '</b> mouvement(s) &nbsp;&mdash;&nbsp; <b>'
                        + distincts + '</b> produit(s) distinct(s)');
            }
        });

        // Impression PDF via le modele JasperReports correspondant au type de mouvement
        // affiche : un modele dedie par zone, avec un en-tete explicite.
        var openPrint = function () {
            var proxy = store.getProxy();
            var extra = proxy.extraParams || {};
            var pdfMode = (extra.type === 'ASSORT') ? 'historique_reserve'
                    : (extra.type === 'REASSORT') ? 'historique_rayon'
                    : 'historique_global';
            var qs = 'mode=' + encodeURIComponent(pdfMode);
            if (extra.dtStart) {
                qs += '&dtStart=' + encodeURIComponent(extra.dtStart);
            }
            if (extra.dtEnd) {
                qs += '&dtEnd=' + encodeURIComponent(extra.dtEnd);
            }
            window.open('../webservices/stockmanagement/reserve/ws_generate_pdf_reserve.jsp?' + qs, '_blank');
        };

        var win = new Ext.window.Window({
            autoShow: true,
            title: me.getTitre() || 'Historique des mouvements',
            // Elargie : la designation et le type etaient tronques a 950.
            width: 1180,
            height: 560,
            minWidth: 900,
            minHeight: 380,
            layout: 'fit',
            modal: true,
            maximizable: true,
            resizable: true,
            items: [grid],
            buttons: [
                {text: 'Imprimer', handler: openPrint},
                {text: 'Fermer', handler: function () {
                        win.close();
                    }}
            ]
        });

        // A l'ouverture on se limite a la JOURNEE EN COURS, comme l'onglet HISTORIQUE : charger
        // tout l'historique coutait cher pour des lignes qu'on ne regarde pas. Les dates sont
        // posees dans les champs pour que la periode retenue soit visible et modifiable.
        var aujourdhui = new Date();
        dtStartField.setValue(aujourdhui);
        dtEndField.setValue(aujourdhui);
        loadWithFilters();

        // La recherche prend la main des l'ouverture : le delai laisse la fenetre finir son
        // rendu, sans quoi le focus se perdrait a l'affichage.
        Ext.defer(function () {
            if (rechField.inputEl && rechField.inputEl.dom) {
                rechField.inputEl.dom.focus();
            } else {
                rechField.focus(true, 50);
            }
        }, 200);

        me.callParent();
    }
});
