var winMajSeuilOuverte = null;
/* global Ext, testextjs */

// MAJ SEUIL groupee : met a jour Q1_seuil_reappro / Q2_qte_reappro de plusieurs produits.
// Inspire du basculement d'emplacements (selection multi-pages : SELECTED / ALL).
// Variables prefixees "maj" pour ne pas entrer en collision avec basculement.js (globals).
var majOview, majMe;
var majSelected = [];   // ids coches (mode SELECTED)
var majUnchecked = [];  // ids decoches en mode ALL (exceptions)
var majSelectAll = false;

function majAmountFormat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.configmanagement.famille.action.maj_seuil', {
    extend: 'Ext.window.Window',
    xtype: 'majseuil',
    id: 'majSeuilWinID',
    maximizable: true,
    requires: ['Ext.form.*', 'Ext.window.Window', 'Ext.ux.ProgressBarPager', 'Ext.grid.*'],
    config: {
        parentview: '',
        titre: ''
    },
    initComponent: function () {
        majSelected = [];
        majUnchecked = [];
        majSelectAll = false;
        majOview = this.getParentview();
        majMe = this;
        var itemsPerPage = 15;

        var rayonStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'], autoLoad: true, pageSize: 9999,
            proxy: {type: 'ajax', url: '../api/v1/common/rayons', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        var familleStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'], autoLoad: true, pageSize: 9999,
            proxy: {type: 'ajax', url: '../api/v1/common/famillearticles', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        var classeAbcStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'code', 'libelle'], autoLoad: true, pageSize: 9999,
            proxy: {type: 'ajax', url: '../api/v1/articles/abc/classes', reader: {type: 'json', root: 'data'}}
        });

        var store = Ext.create('Ext.data.Store', {
            fields: ['lg_FAMILLE_ID', 'int_CIP', 'str_NAME', 'int_Q1_SEUIL_REAPPRO', 'int_Q2_QTE_REAPPRO',
                {name: 'isChecked', type: 'boolean', defaultValue: false}],
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/fichearticle/maj-seuil/list',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            },
            listeners: {
                load: function (st) {
                    st.each(function (r) {
                        var id = r.get('lg_FAMILLE_ID'), checked;
                        if (majSelectAll) {
                            checked = (majUnchecked.indexOf(id) === -1);
                        } else {
                            checked = (majSelected.indexOf(id) !== -1);
                        }
                        r.set('isChecked', checked);
                    });
                    st.commitChanges();
                }
            }
        });

        var grid = {
            xtype: 'gridpanel',
            id: 'majSeuilGridID',
            flex: 1,
            store: store,
            columns: [
                {header: 'ID', dataIndex: 'lg_FAMILLE_ID', flex: 1, hidden: true},
                {header: 'CIP', dataIndex: 'int_CIP', flex: 1},
                {header: 'LIBELLE', dataIndex: 'str_NAME', flex: 2.5},
                {header: 'Q1 actuel', dataIndex: 'int_Q1_SEUIL_REAPPRO', align: 'right', flex: 0.7},
                {header: 'Q2 actuel', dataIndex: 'int_Q2_QTE_REAPPRO', align: 'right', flex: 0.7},
                {
                    xtype: 'checkcolumn', text: '&#10003;', dataIndex: 'isChecked', flex: 0.5,
                    menuDisabled: true, sortable: false,
                    listeners: {checkChange: this.onMajCheckChange}
                }
            ],
            tbar: [
                {
                    xtype: 'textfield', id: 'majRech', emptyText: 'Recherche (CIP, libellé)', flex: 1,
                    listeners: {
                        render: function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) { majMe.onMajRech(); }
                            });
                        }
                    }
                },
                {
                    xtype: 'combobox', id: 'majFam', store: familleStore, fieldLabel: 'Famille', labelWidth: 60,
                    valueField: 'id', displayField: 'libelle', typeAhead: true, queryMode: 'local', flex: 2,
                    emptyText: 'Famille...',
                    listeners: {
                        select: function () {
                            var z = Ext.getCmp('majZone'); if (z) { z.setValue(null); }
                            majMe.onMajRech();
                        }
                    }
                },
                {
                    xtype: 'combobox', id: 'majZone', store: rayonStore, fieldLabel: 'Emplacement', labelWidth: 90,
                    valueField: 'id', displayField: 'libelle', typeAhead: true, queryMode: 'local', flex: 2,
                    emptyText: 'Emplacement...',
                    listeners: {
                        select: function () {
                            var f = Ext.getCmp('majFam'); if (f) { f.setValue(null); }
                            majMe.onMajRech();
                        }
                    }
                },
                {
                    xtype: 'combobox', id: 'majClasseAbc', store: classeAbcStore, fieldLabel: 'Classe ABC',
                    labelWidth: 75, valueField: 'id', displayField: 'libelle', typeAhead: true, queryMode: 'local',
                    flex: 1.5, emptyText: 'Classe ABC...',
                    listeners: {
                        select: function () {
                            majMe.onMajRech();
                        }
                    }
                },
                {
                    text: '', tooltip: 'Effacer le filtre classe ABC', iconCls: 'cancelicon',
                    handler: function () {
                        var c = Ext.getCmp('majClasseAbc'); if (c) { c.setValue(null); }
                        majMe.onMajRech();
                    }
                },
                {text: 'rechercher', iconCls: 'searchicon', scope: this, handler: this.onMajRech},
                {
                    xtype: 'checkbox', id: 'majAll', boxLabel: 'Tous Sélectionner', margin: '0 0 0 8',
                    listeners: {
                        change: function (cb, val) {
                            majSelectAll = val;
                            majUnchecked = [];
                            majSelected = [];
                            var st = Ext.getCmp('majSeuilGridID').getStore();
                            st.each(function (r) { r.set('isChecked', val); });
                            st.commitChanges();
                        }
                    }
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar', pageSize: itemsPerPage, store: store, displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager(),
                listeners: {
                    beforechange: function () {
                        majMe.applyFilterParams(store);
                    }
                }
            }
        };

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            layout: {type: 'vbox', align: 'stretch'},
            items: [
                {
                    xtype: 'container', layout: 'hbox', margin: '0 0 8 0',
                    items: [
                        {
                            xtype: 'numberfield', id: 'majQ1', fieldLabel: 'Q1_seuil_reappro', labelWidth: 150,
                            width: 300, minValue: 0, allowDecimals: false,
                            fieldStyle: 'background-color:#FFA500;color:#000;font-weight:bold;'
                        },
                        {xtype: 'splitter'},
                        {
                            xtype: 'numberfield', id: 'majQ2', fieldLabel: 'Q2_qte_reappro', labelWidth: 150,
                            width: 300, minValue: 0, allowDecimals: false,
                            fieldStyle: 'background-color:#FFA500;color:#000;font-weight:bold;'
                        }
                    ]
                },
                grid
            ]
        });

        // Une seule fenetre a la fois : un nouveau clic remplace la precedente.
        if (winMajSeuilOuverte && !winMajSeuilOuverte.isDestroyed) {
            winMajSeuilOuverte.destroy();
        }
        var win = winMajSeuilOuverte = new Ext.window.Window({
            autoShow: true, title: this.getTitre() || 'MAJ SEUIL groupée',
            maximizable: true, width: '85%', height: 600, minWidth: 600, minHeight: 300,
            layout: 'fit', plain: true, modal: true, items: form,
            buttons: [
                {text: 'Appliquer', scope: this, handler: this.onMajApply},
                {text: 'Fermer', handler: function () { win.close(); }}
            ]
        });

        this.callParent();
        this.applyFilterParams(store);
        store.loadPage(1);
    },

    // Renseigne les params du proxy a partir des filtres courants
    applyFilterParams: function (store) {
        var proxy = store.getProxy();
        proxy.setExtraParam('search', (Ext.getCmp('majRech') && Ext.getCmp('majRech').getValue()) || '');
        proxy.setExtraParam('codeFamille', (Ext.getCmp('majFam') && Ext.getCmp('majFam').getValue()) || '');
        proxy.setExtraParam('zoneGeoId', (Ext.getCmp('majZone') && Ext.getCmp('majZone').getValue()) || '');
        proxy.setExtraParam('classeAbcId', (Ext.getCmp('majClasseAbc') && Ext.getCmp('majClasseAbc').getValue()) || '');
    },

    onMajRech: function () {
        var st = Ext.getCmp('majSeuilGridID').getStore();
        this.applyFilterParams(st);
        st.loadPage(1);
    },

    onMajCheckChange: function (column, rowIndex, checked) {
        var rec = Ext.getCmp('majSeuilGridID').getStore().getAt(rowIndex);
        if (!rec) { return; }
        var id = rec.get('lg_FAMILLE_ID');
        var rm = function (arr, v) { var i = arr.indexOf(v); if (i > -1) { arr.splice(i, 1); } };
        if (majSelectAll) {
            // en mode ALL on gere les exceptions (decoches)
            if (checked) { rm(majUnchecked, id); } else if (majUnchecked.indexOf(id) === -1) { majUnchecked.push(id); }
        } else {
            if (checked) { if (majSelected.indexOf(id) === -1) { majSelected.push(id); } } else { rm(majSelected, id); }
        }
        Ext.getCmp('majSeuilGridID').getStore().commitChanges();
    },

    onMajApply: function () {
        var q1Fld = Ext.getCmp('majQ1'), q2Fld = Ext.getCmp('majQ2');
        var q1 = q1Fld.getValue(), q2 = q2Fld.getValue();
        if (q1 === null || q1 === '' || isNaN(q1) || q2 === null || q2 === '' || isNaN(q2)) {
            Ext.MessageBox.show({title: 'Valeurs requises', width: 420,
                msg: 'Veuillez saisir des valeurs <b>numériques</b> pour Q1_seuil_reappro et Q2_qte_reappro.',
                buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING,
                fn: function () { q1Fld.focus(true, 100); }});
            return;
        }
        var codeFamille = (Ext.getCmp('majFam') && Ext.getCmp('majFam').getValue()) || '';
        var zoneGeoId = (Ext.getCmp('majZone') && Ext.getCmp('majZone').getValue()) || '';
        var search = (Ext.getCmp('majRech') && Ext.getCmp('majRech').getValue()) || '';
        var classeAbcId = (Ext.getCmp('majClasseAbc') && Ext.getCmp('majClasseAbc').getValue()) || '';
        var mode = majSelectAll ? 'ALL' : 'SELECTED';
        if (mode === 'ALL' && !codeFamille && !zoneGeoId && !search && !classeAbcId) {
            Ext.MessageBox.show({title: 'Filtre requis', width: 440,
                msg: 'En mode « Tous Sélectionner », veuillez d\'abord filtrer par <b>famille</b>, <b>emplacement</b>, <b>classe ABC</b> ou <b>recherche</b>.',
                buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
            return;
        }
        if (mode === 'SELECTED' && majSelected.length === 0) {
            Ext.MessageBox.show({title: 'Sélection requise', width: 420,
                msg: 'Veuillez cocher au moins un produit (ou utiliser « Tous Sélectionner »).',
                buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
            return;
        }
        Ext.MessageBox.confirm('MAJ SEUIL',
                'Mettre à jour Q1=' + q1 + ' et Q2=' + q2 + ' pour les produits ' + (mode === 'ALL' ? 'du filtre' : 'cochés') + ' ?',
                function (btn) {
                    if (btn !== 'yes') { return; }
                    var progress = Ext.MessageBox.wait('Mise à jour en cours . . .', 'Veuillez patienter');
                    Ext.Ajax.request({
                        url: '../api/v1/fichearticle/maj-seuil/apply',
                        method: 'POST',
                        timeout: 1800000,
                        headers: {'Content-Type': 'application/json'},
                        jsonData: {
                            mode: mode, codeFamille: codeFamille, zoneGeoId: zoneGeoId, search: search,
                            classeAbcId: classeAbcId,
                            ids: majSelected, uncheckedIds: majUnchecked, q1: Number(q1), q2: Number(q2)
                        },
                        success: function (resp) {
                            progress.hide();
                            var r = Ext.JSON.decode(resp.responseText, true) || {};
                            Ext.MessageBox.show({title: 'MAJ SEUIL', width: 460,
                                msg: r.success ? ('Mise à jour effectuée pour <b>' + (r.count || 0) + '</b> produit(s).')
                                        : 'La mise à jour a échoué.',
                                buttons: Ext.MessageBox.OK, icon: r.success ? Ext.MessageBox.INFO : Ext.MessageBox.ERROR});
                            majSelected = []; majUnchecked = []; majSelectAll = false;
                            var allCb = Ext.getCmp('majAll'); if (allCb) { allCb.setValue(false); }
                            Ext.getCmp('majSeuilGridID').getStore().reload();
                        },
                        failure: function (resp) {
                            progress.hide();
                            Ext.MessageBox.show({title: 'Erreur', width: 460,
                                msg: 'Échec. Code HTTP : ' + resp.status, buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.ERROR});
                        }
                    });
                });
    }
});
