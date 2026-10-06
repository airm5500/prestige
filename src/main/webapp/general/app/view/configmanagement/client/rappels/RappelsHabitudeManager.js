/* global Ext */

/*
 * RAPPELS ET PILULIERS A PREPARER (plan d'octobre, section 4.1, lot L10). Les produits achetes regulierement par un
 * client (au moins 3 achats, ecarts stables) dont le prochain achat arrive bientot : l'equipe prepare (pilulier, mise
 * de cote), marque prepare ou ecarte, et envoie le rappel SMS (consentement et numero controles par le serveur ; les
 * medicaments ne sont cites que si la fiche client le permet), par SMS, WhatsApp, ou WhatsApp avec repli SMS. Une ligne sort d'elle-meme quand le client rachete.
 */
Ext.define('testextjs.view.configmanagement.client.rappels.RappelsHabitudeManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'rappelshabitude',
    id: 'rappelshabitudeID',
    title: 'Rappels et piluliers à préparer',
    frame: true,
    width: '98%',
    height: 620,

    STATUTS: {A_PREPARER: ['À préparer', '#e67e22'], PREPARE: ['Préparé', '#27ae60'], ECARTE: ['Écarté', '#7f8c8d'],
        ACHETE: ['Racheté', '#2980b9']},

    initComponent: function () {
        var me = this;
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'clientId', 'client', 'telephone', 'consentSms', 'msgMedicaments', 'familleId', 'cip', 'produit',
                {name: 'stock', type: 'int'}, 'dernierAchat', 'prevu', {name: 'frequence', type: 'int'},
                {name: 'achats', type: 'int'}, 'statut', 'envoi', 'traitePar'],
            groupField: 'client',
            autoLoad: false,
            proxy: {type: 'ajax', url: '../api/v1/rappels-habitude/liste', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        store.on('beforeload', function (st) {
            st.getProxy().extraParams = me.filtres();
        });
        store.on('load', function (st, recs, ok) {
            var r = st.getProxy().getReader().rawData || {};
            if (r.success === false && r.msg) {
                Ext.MessageBox.alert('Rappels', r.msg);
            }
            me.majBoutons();
        });
        var surEntree = {specialkey: function (f, e) {
                if (e.getKey() === e.ENTER) {
                    me.rechercher();
                }
            }};
        var date = function (v) {
            return v ? Ext.Date.format(Ext.Date.parse(v, 'Y-m-d'), 'd/m/Y') : '';
        };
        var gris = function (t) {
            return '<span style="color:#9aa8b6">' + t + '</span>';
        };
        Ext.apply(me, {
            store: store,
            selModel: Ext.create('Ext.selection.CheckboxModel', {checkOnly: false}),
            features: [{ftype: 'grouping', groupHeaderTpl: '{name} ({rows.length} produit{[values.rows.length > 1 ? "s" : ""]})',
                    hideGroupedHeader: true, startCollapsed: false}],
            viewConfig: {emptyText: 'Aucun traitement à préparer pour ces critères.', deferEmptyText: false},
            columns: [
                {text: 'Prévu le', dataIndex: 'prevu', width: 95, renderer: function (v) {
                        var d = v ? Ext.Date.parse(v, 'Y-m-d') : null, j = Ext.Date.clearTime(new Date());
                        return d && d < j ? '<b style="color:#c0392b">' + date(v) + '</b>' : date(v);
                    }},
                {text: 'Client', dataIndex: 'client', width: 170},
                {text: 'Téléphone', dataIndex: 'telephone', width: 110, renderer: function (v) {
                        return v ? Ext.String.htmlEncode(v) : gris('—');
                    }},
                {text: 'CIP', dataIndex: 'cip', width: 80},
                {text: 'Produit', dataIndex: 'produit', flex: 1, minWidth: 180},
                {text: 'Stock', dataIndex: 'stock', width: 60, align: 'right', renderer: function (v) {
                        return v > 0 ? v : '<b style="color:#c0392b">' + v + '</b>';
                    }},
                {text: 'Fréquence', dataIndex: 'frequence', width: 90, align: 'right', renderer: function (v, m, r) {
                        m.tdAttr = 'data-qtip="' + r.get('achats') + ' achats réguliers"';
                        return 'tous les ' + v + ' j';
                    }},
                {text: 'Dernier achat', dataIndex: 'dernierAchat', width: 95, renderer: date},
                {text: 'Statut', dataIndex: 'statut', width: 95, renderer: function (v, m, r) {
                        var s = me.STATUTS[v] || [v, '#555'];
                        if (r.get('traitePar')) {
                            m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(r.get('traitePar')) + '"';
                        }
                        return '<span style="color:' + s[1] + ';font-weight:600">' + s[0] + '</span>';
                    }},
                {text: 'SMS', dataIndex: 'envoi', width: 105, renderer: function (v, m, r) {
                        if (v) {
                            return '<span style="color:#27ae60">✓ ' + Ext.Date.format(new Date(v), 'd/m H:i') + '</span>';
                        }
                        if (r.get('consentSms') === false) {
                            m.tdAttr = 'data-qtip="Le client a refusé les SMS"';
                            return gris('refusé');
                        }
                        return r.get('msgMedicaments') === false ? gris('neutre') : gris('—');
                    }}
            ],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'combobox', itemId: 'statut', width: 190, editable: false, queryMode: 'local', displayField: 'l',
                            valueField: 'v', value: '',
                            store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [
                                    {v: '', l: 'À préparer et préparés'}, {v: 'A_PREPARER', l: 'À préparer'},
                                    {v: 'PREPARE', l: 'Préparés'}, {v: 'ECARTE', l: 'Écartés'},
                                    {v: 'ACHETE', l: 'Rachetés'}, {v: 'TOUS', l: 'Tous'}]}),
                            listeners: {select: function () {
                                    me.rechercher();
                                }}},
                        {xtype: 'datefield', itemId: 'du', width: 120, emptyText: 'Prévu du', format: 'd/m/Y', submitFormat: 'Y-m-d'},
                        {xtype: 'datefield', itemId: 'au', width: 120, emptyText: 'au', format: 'd/m/Y', submitFormat: 'Y-m-d'},
                        {xtype: 'textfield', itemId: 'query', width: 200, emptyText: 'Client, téléphone, produit…', listeners: surEntree},
                        {text: 'Rechercher', itemId: 'btnRechercher', iconCls: 'searchicon', handler: function () {
                                me.rechercher();
                            }},
                        {text: 'Actualiser la liste', itemId: 'btnActualiser', iconCls: 'refresh',
                            tooltip: 'Recalcule les habitudes d\'achat et ajoute les traitements dont le prochain achat arrive',
                            handler: function () {
                                me.actualiser();
                            }}
                    ]
                }, {
                    xtype: 'toolbar', dock: 'top', items: [
                        {text: 'Marquer préparé', itemId: 'btnPrepare', iconCls: 'checkicon', disabled: true, handler: function () {
                                me.marquer('PREPARE');
                            }},
                        {text: 'Écarter', itemId: 'btnEcarter', disabled: true, handler: function () {
                                me.marquer('ECARTE');
                            }},
                        {text: 'Remettre à préparer', itemId: 'btnRemettre', disabled: true, handler: function () {
                                me.marquer('A_PREPARER');
                            }},
                        '-',
                        {text: 'Envoyer le rappel', itemId: 'btnSms', disabled: true,
                            tooltip: 'Un message par client ; consentement et numéro contrôlés',
                            menu: {items: [
                                    {text: 'Par SMS', itemId: 'envSms', handler: function () {
                                            me.envoyer('SMS');
                                        }},
                                    {text: 'Par WhatsApp', itemId: 'envWhatsapp', handler: function () {
                                            me.envoyer('WHATSAPP');
                                        }},
                                    {text: 'Par WhatsApp, SMS si WhatsApp échoue', itemId: 'envWhatsappSms', handler: function () {
                                            me.envoyer('SMS_WHATSAPP');
                                        }}
                                ]}},
                        '->',
                        {xtype: 'tbtext', itemId: 'resume', text: ''}
                    ]
                }]
        });
        me.callParent(arguments);
        me.on('selectionchange', function () {
            me.majBoutons();
        });
        me.on('afterrender', function () {
            store.load();
        });
    },

    filtres: function () {
        var me = this, v = function (id) {
            var c = me.down('#' + id);
            return c ? c.getValue() : null;
        };
        var d = function (id) {
            var x = v(id);
            return x ? Ext.Date.format(x, 'Y-m-d') : '';
        };
        return {statut: v('statut') || '', query: v('query') || '', dtStart: d('du'), dtEnd: d('au')};
    },

    selection: function () {
        return Ext.Array.map(this.getSelectionModel().getSelection(), function (r) {
            return r.get('id');
        });
    },

    majBoutons: function () {
        var n = this.getSelectionModel().getSelection().length, st = this.getStore();
        Ext.each(['btnPrepare', 'btnEcarter', 'btnRemettre', 'btnSms'], function (id) {
            var b = this.down('#' + id);
            if (b) {
                b.setDisabled(n === 0);
            }
        }, this);
        var clients = {};
        st.each(function (r) {
            clients[r.get('clientId')] = true;
        });
        var t = this.down('#resume');
        if (t) {
            t.setText(st.getCount() + ' produit(s), ' + Ext.Object.getSize(clients) + ' client(s)' + (n ? ' · ' + n + ' choisi(s)' : '')
                    + (this.infoActualiser ? ' · ' + this.infoActualiser : ''));
        }
    },

    rechercher: function () {
        this.getStore().load();
    },

    appel: function (url, ids, suite) {
        var me = this;
        me.setLoading(true);
        Ext.Ajax.request({
            url: url, method: 'POST', headers: {'Content-Type': 'application/json'}, jsonData: ids || [],
            success: function (response) {
                me.setLoading(false);
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success === false) {
                    Ext.MessageBox.alert('Rappels', r.msg || r.message || 'Action refusée.');
                    return;
                }
                suite(r);
            },
            failure: function () {
                me.setLoading(false);
                Ext.MessageBox.alert('Rappels', 'Le serveur n\'a pas répondu.');
            }
        });
    },

    actualiser: function () {
        var me = this;
        me.appel('../api/v1/rappels-habitude/actualiser' + (me.jourForce ? '?jour=' + me.jourForce : ''), [], function (r) {
            me.infoActualiser = 'liste actualisée : ' + (r.inscrits || 0) + ' ajout(s), ' + (r.achetes || 0) + ' racheté(s)';
            me.getStore().load();
        });
    },

    marquer: function (statut) {
        var me = this, ids = me.selection();
        if (!ids.length) {
            return;
        }
        me.appel('../api/v1/rappels-habitude/marquer?statut=' + statut, ids, function () {
            me.getSelectionModel().deselectAll();
            me.getStore().load();
        });
    },

    CANAUX: {SMS: 'par SMS', WHATSAPP: 'par WhatsApp', SMS_WHATSAPP: 'par WhatsApp (SMS si WhatsApp échoue)'},

    envoyerSms: function () {
        this.envoyer('SMS');
    },

    envoyer: function (canal) {
        var me = this, ids = me.selection();
        if (!ids.length) {
            return;
        }
        Ext.MessageBox.confirm('Rappel', 'Envoyer le rappel ' + me.CANAUX[canal] + ' aux clients choisis (un message par client) ?', function (b) {
            if (b !== 'yes') {
                return;
            }
            me.appel('../api/v1/rappels-habitude/envoyer?canal=' + canal, ids, function (r) {
                var refus = Ext.Array.map(r.refus || [], function (x) {
                    return Ext.String.htmlEncode(x.client) + ' : ' + Ext.String.htmlEncode(x.motif);
                });
                Ext.MessageBox.alert('Rappel', Ext.String.htmlEncode(r.message || '') + (refus.length ? '<br><br>' + refus.join('<br>') : ''));
                me.getStore().load();
            });
        });
    }
});
