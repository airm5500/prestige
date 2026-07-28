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
                    buffer: 400,
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
                        dtStartField.reset();
                        dtEndField.reset();
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
            viewConfig: {emptyText: 'Aucun mouvement enregistre.', deferEmptyText: false}
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
            width: 950,
            height: 530,
            minWidth: 650,
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

        // Chargement initial avec le filtre type passe en config
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
