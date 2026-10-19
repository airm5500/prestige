/* global Ext, PrestigeToast */

/*
 * GESTION DES COMMANDES > « Péremptions courtes » (demande mobile 36 D12) : lots à péremption courte acceptés ou
 * refusés à la réception (journal rempli par l'application de réception). Filtres période / grossiste / statut,
 * statut changé dans la cellule (sans fenêtre), exports Excel et PDF. Routes : ../api/v1/reception/peremptions-courtes.
 */
Ext.define('testextjs.view.receptionmobile.PeremptionsCourtes', {
    extend: 'Ext.panel.Panel',
    xtype: 'peremptionscourtes',
    requires: ['testextjs.view.commun.RaccourcisPeriode', 'Ext.grid.plugin.CellEditing'],
    layout: 'fit',
    border: false,
    header: false,
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    STATUTS: [{code: 'A_TRAITER', libelle: 'À traiter'}, {code: 'RECLAME', libelle: 'Réclamé'}, {code: 'AVOIR_RECU', libelle: 'Avoir reçu'}],

    initComponent: function () {
        var me = this, aujourdhui = new Date(), url = '../api/v1/reception/peremptions-courtes';
        var nombre = function (v) {
            return String(Math.round(Number(v) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        };
        var jour = function (v) {
            return v && v.length >= 10 ? v.substr(8, 2) + '/' + v.substr(5, 2) + '/' + v.substr(0, 4) : (v || '');
        };
        var libelleStatut = function (v) {
            var s = Ext.Array.findBy(me.STATUTS, function (x) {
                return x.code === v;
            });
            return s ? s.libelle : v;
        };
        var grossistes = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'], autoLoad: true, pageSize: 9999,
            proxy: {type: 'ajax', url: '../api/v1/common/grossiste', reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                load: function (st) {
                    st.insert(0, {id: '', libelle: 'Tous les grossistes'});
                }
            }
        });
        me.lignes = Ext.create('Ext.data.Store', {
            fields: ['id', 'bl', 'cip', 'produit', 'grossiste', 'numLot', 'datePeremption', {name: 'joursRestants', type: 'int'},
                {name: 'quantite', type: 'int'}, {name: 'valeur', type: 'int'}, 'decision', 'motif', 'statut', 'utilisateur', 'le'],
            proxy: {type: 'ajax', url: url, reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (st) {
                    st.getProxy().extraParams = me.filtres();
                },
                load: function (st) {
                    var o = st.getProxy().getReader().rawData || {};
                    me.down('#pcTotal').update('<b>' + (o.total || 0) + '</b> ligne(s) — valeur <b>' + nombre(o.valeur) + ' F CFA</b>');
                }
            }
        });
        var exporter = function (format) {
            var f = me.filtres(), qs = Ext.Object.toQueryString(f);
            if (format === 'excel') {
                window.location.href = url + '/excel?' + qs;
            } else {
                window.open(url + '/pdf?' + qs, '_blank');
            }
        };
        Ext.apply(me, {
            items: [{
                    xtype: 'gridpanel', store: me.lignes, itemId: 'pcGrille', columnLines: true,
                    plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1, listeners: {
                                edit: function (ed, e) {
                                    if (e.field === 'statut' && e.value !== e.originalValue) {
                                        me.changerStatut(e.record, e.value, e.originalValue);
                                    }
                                }
                            }})],
                    viewConfig: {emptyText: '<div style="padding:20px;color:#7f8c8d">Aucune péremption courte sur la période.</div>', deferEmptyText: false},
                    columns: [
                        {text: 'Date', dataIndex: 'le', width: 95, renderer: jour},
                        {text: 'BL', dataIndex: 'bl', width: 110},
                        {text: 'CIP', dataIndex: 'cip', width: 80},
                        {text: 'Produit', dataIndex: 'produit', flex: 1, minWidth: 200},
                        {text: 'Grossiste', dataIndex: 'grossiste', width: 130},
                        {text: 'Lot', dataIndex: 'numLot', width: 90},
                        {text: 'Péremption', dataIndex: 'datePeremption', width: 90, renderer: jour},
                        {text: 'Jours', dataIndex: 'joursRestants', width: 60, align: 'right'},
                        {text: 'Qté', dataIndex: 'quantite', width: 60, align: 'right'},
                        {text: 'Valeur', dataIndex: 'valeur', width: 85, align: 'right', renderer: nombre},
                        {text: 'Décision', dataIndex: 'decision', width: 80, renderer: function (v) {
                                return v === 'ACCEPTE' ? '<span style="color:#1b7f3b;font-weight:600">Accepté</span>'
                                        : '<span style="color:#c62828;font-weight:600">Refusé</span>';
                            }},
                        {text: 'Motif', dataIndex: 'motif', flex: 1, minWidth: 140, renderer: Ext.util.Format.htmlEncode},
                        {text: 'Statut', dataIndex: 'statut', width: 110, tooltip: 'Cliquer pour changer le statut (enregistré aussitôt)',
                            renderer: function (v) {
                                return '<span style="border-bottom:1px dashed #94a3b8;cursor:pointer">' + libelleStatut(v) + '</span>';
                            },
                            editor: {xtype: 'combobox', editable: false, queryMode: 'local', displayField: 'libelle', valueField: 'code',
                                store: Ext.create('Ext.data.Store', {fields: ['code', 'libelle'], data: me.STATUTS}),
                                /* le choix dans la liste enregistre aussitot (sans quitter la cellule) */
                                listeners: {select: function () {
                                        me.down('#pcGrille').editingPlugin.completeEdit();
                                    }}}},
                        {text: 'Saisi par', dataIndex: 'utilisateur', width: 120}
                    ]
                }],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'pcDebut', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.getFirstDateOfMonth(aujourdhui), maxValue: aujourdhui},
                        {xtype: 'datefield', itemId: 'pcFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui, plugins: [{ptype: 'raccourcisperiode', debut: 'pcDebut', declencher: 'pcRechercher'}]},
                        {xtype: 'combobox', itemId: 'pcGrossiste', fieldLabel: 'Grossiste', labelWidth: 60, width: 250, store: grossistes,
                            queryMode: 'local', displayField: 'libelle', valueField: 'id', emptyText: 'Tous les grossistes', editable: false,
                            listeners: {select: function () {
                                    me.lignes.load();
                                }}},
                        {xtype: 'combobox', itemId: 'pcStatut', fieldLabel: 'Statut', labelWidth: 40, width: 170, editable: false,
                            queryMode: 'local', displayField: 'libelle', valueField: 'code', value: '',
                            store: Ext.create('Ext.data.Store', {fields: ['code', 'libelle'], data: [{code: '', libelle: 'Tous'}].concat(me.STATUTS)}),
                            listeners: {select: function () {
                                    me.lignes.load();
                                }}},
                        {text: 'Rechercher', itemId: 'pcRechercher', iconCls: 'refresh', handler: function () {
                                me.lignes.load();
                            }},
                        '->',
                        {text: 'Excel', itemId: 'pcExcel', iconCls: 'excel', tooltip: 'Exporter la liste filtrée (Excel)', handler: function () {
                                exporter('excel');
                            }},
                        {text: 'PDF', itemId: 'pcPdf', iconCls: 'printable', tooltip: 'Imprimer la liste filtrée (PDF)', handler: function () {
                                exporter('pdf');
                            }}
                    ]
                }, {xtype: 'component', dock: 'bottom', itemId: 'pcTotal', padding: '6 10', html: ''}]
        });
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.lignes.load();
        }, me, {single: true});
    },

    filtres: function () {
        var me = this;
        return {du: me.down('#pcDebut').getSubmitValue(), au: me.down('#pcFin').getSubmitValue(),
            grossiste: me.down('#pcGrossiste').getValue() || '', statut: me.down('#pcStatut').getValue() || ''};
    },

    /* enregistre aussitot ; en cas de refus, la cellule revient a l'ancien statut et le motif s'affiche en bandeau */
    changerStatut: function (rec, statut, ancien) {
        Ext.Ajax.request({url: '../api/v1/reception/peremptions-courtes/' + encodeURIComponent(rec.get('id')) + '/statut?statut=' + statut,
            method: 'PUT',
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (o.success) {
                    rec.commit();
                    if (window.PrestigeToast) {
                        PrestigeToast.afficher('Statut enregistré.', {niveau: 'ok'});
                    }
                } else {
                    rec.set('statut', ancien);
                    rec.commit();
                    if (window.PrestigeToast) {
                        PrestigeToast.afficher(o.msg || 'Statut non enregistré.', {niveau: 'erreur'});
                    }
                }
            },
            failure: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                rec.set('statut', ancien);
                rec.commit();
                if (window.PrestigeToast) {
                    PrestigeToast.afficher(o.msg || 'Statut non enregistré.', {niveau: 'erreur'});
                }
            }});
    }
});
