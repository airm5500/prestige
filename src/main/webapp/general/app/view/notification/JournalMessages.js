/* global Ext */

/*
 * Plan du 21/11, point 8.1 : menu « Journal des messages » (CAMPAGNES SMS / WHATSAPP), droit P_SM_JOURNAL_MESSAGES.
 * Un envoi par ligne : SMS (clients et numéro d'administration : ticket Z, clôture de caisse, point d'activité) et
 * WhatsApp. Filtres : période, canal, origine, état, recherche par nom ou numéro. Compteurs de toute la sélection,
 * export CSV des mêmes lignes. Jamais le texte des messages.
 */
Ext.define('testextjs.view.notification.JournalMessages', {
    extend: 'Ext.panel.Panel',
    xtype: 'journalmessages',
    cls: 'jm-ecran',
    layout: {type: 'vbox', align: 'stretch'},
    bodyPadding: 8,

    CLASSES: {'En attente': 'av-msg-attente', 'Envoyé': 'av-msg-envoye', 'Distribué': 'av-msg-distribue',
        'Lu': 'av-msg-lu', 'Échec': 'av-msg-echec'},

    initComponent: function () {
        var me = this, aujourdhui = new Date();
        me.journal = Ext.create('Ext.data.Store', {
            fields: ['id', 'date', 'canal', 'origine', 'origineLibelle', 'destinataire', 'numero', 'etat', 'motif', 'utilisateur'],
            pageSize: 50,
            proxy: {type: 'ajax', url: '../api/v1/journal-messages', timeout: 120000,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (s) {
                    s.getProxy().extraParams = me.filtres();
                },
                load: function (s, recs, ok) {
                    var o = s.getProxy().getReader().rawData || {};
                    me.dessinerCompteurs(ok && o.compteurs ? o.compteurs : null);
                }
            }
        });
        me.origines = Ext.create('Ext.data.Store', {fields: ['code', 'libelle'], data: [{code: '', libelle: 'Toutes'}]});
        me.etats = Ext.create('Ext.data.Store', {fields: ['code', 'libelle'], data: [{code: '', libelle: 'Tous'}]});
        var etiquette = function (t) {
            return Ext.String.htmlEncode(t || '');
        };
        Ext.applyIf(me, {
            dockedItems: [{xtype: 'toolbar', dock: 'top', itemId: 'jmFiltres', cls: 'jm-filtres', items: [
                        {xtype: 'datefield', itemId: 'jmDu', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui},
                        {xtype: 'datefield', itemId: 'jmAu', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui},
                        {xtype: 'combobox', itemId: 'jmCanal', fieldLabel: 'Canal', labelWidth: 38, width: 150, queryMode: 'local', editable: false,
                            displayField: 'libelle', valueField: 'code', value: '',
                            store: Ext.create('Ext.data.Store', {fields: ['code', 'libelle'], data: [{code: '', libelle: 'Tous'},
                                    {code: 'SMS', libelle: 'SMS'}, {code: 'WHATSAPP', libelle: 'WhatsApp'}]})},
                        {xtype: 'combobox', itemId: 'jmOrigine', fieldLabel: 'Origine', labelWidth: 45, width: 210, queryMode: 'local', editable: false,
                            displayField: 'libelle', valueField: 'code', value: '', store: me.origines},
                        {xtype: 'combobox', itemId: 'jmEtat', fieldLabel: 'État', labelWidth: 30, width: 150, queryMode: 'local', editable: false,
                            displayField: 'libelle', valueField: 'code', value: '', store: me.etats}
                    ]}, {
                    /* seconde ligne : en 1280 px, filtres et boutons ne tiennent pas sur une seule */
                    xtype: 'toolbar', dock: 'top', itemId: 'jmActions', cls: 'jm-filtres', items: [
                        {xtype: 'textfield', itemId: 'jmRecherche', emptyText: 'Nom ou numéro', width: 260, enableKeyEvents: true,
                            listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.chercher();
                                    }
                                }}},
                        {xtype: 'button', itemId: 'jmChercher', text: 'Rechercher', iconCls: 'searchicon', cls: 'ordo-btn', handler: function () {
                                me.chercher();
                            }},
                        '->',
                        {xtype: 'button', itemId: 'jmExport', text: 'Export CSV', iconCls: 'excel', cls: 'ordo-btn',
                            tooltip: 'Les lignes filtrées, toutes pages, dans le même ordre', handler: function (b) {
                                me.exporter(b);
                            }}
                    ]}],
            items: [
                {xtype: 'component', itemId: 'jmCompteurs', cls: 'jm-compteurs', html: ''},
                {xtype: 'gridpanel', itemId: 'jmJournal', flex: 1, store: me.journal, cls: 'jm-journal',
                    viewConfig: {emptyText: '<div style="padding:12px;color:#64748b">Aucun message sur la période et les filtres choisis.</div>',
                        deferEmptyText: false},
                    columns: [
                        {header: 'Date', dataIndex: 'date', width: 135, sortable: false, menuDisabled: true},
                        {header: 'Canal', dataIndex: 'canal', width: 80, sortable: false, menuDisabled: true},
                        {header: 'Origine', dataIndex: 'origineLibelle', width: 130, sortable: false, menuDisabled: true, renderer: etiquette},
                        {header: 'Destinataire', dataIndex: 'destinataire', flex: 1, minWidth: 150, sortable: false, menuDisabled: true, renderer: etiquette},
                        {header: 'Numéro', dataIndex: 'numero', width: 110, sortable: false, menuDisabled: true, renderer: etiquette},
                        {header: 'État', dataIndex: 'etat', width: 100, itemId: 'jmColEtat', sortable: false, menuDisabled: true, renderer: function (v) {
                                return '<span class="av-msg ' + (me.CLASSES[v] || 'av-msg-attente') + '">' + etiquette(v) + '</span>';
                            }},
                        {header: 'Motif d\'échec', dataIndex: 'motif', flex: 1, minWidth: 140, sortable: false, menuDisabled: true, renderer: function (v, m) {
                                var t = etiquette(v);
                                if (t) {
                                    m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(t) + '"';
                                }
                                return t;
                            }},
                        {header: 'Utilisateur', dataIndex: 'utilisateur', width: 150, sortable: false, menuDisabled: true, renderer: function (v) {
                                return v ? etiquette(v) : '<span style="color:#94a3b8">Automatique</span>';
                            }}
                    ],
                    dockedItems: [{xtype: 'pagingtoolbar', dock: 'bottom', store: me.journal, displayInfo: true,
                            displayMsg: 'Messages {0} à {1} sur {2}', emptyMsg: 'Aucun message'}]
                }]
        });
        me.callParent(arguments);
        me.on('afterrender', function () {
            Ext.Ajax.request({url: '../api/v1/journal-messages/filtres', method: 'GET', success: function (r) {
                    var o = Ext.decode(r.responseText, true) || {};
                    if (o.success) {
                        me.origines.add(o.origines);
                        me.etats.add(Ext.Array.map(o.etats, function (e) {
                            return {code: e, libelle: e};
                        }));
                    }
                }});
            me.journal.loadPage(1);
        }, me, {single: true});
    },

    filtres: function () {
        var me = this, v = function (id) {
            var c = me.down('#' + id);
            return c ? (c.getSubmitValue ? c.getSubmitValue() : c.getValue()) || '' : '';
        };
        return {dtStart: v('jmDu'), dtEnd: v('jmAu'), canal: me.down('#jmCanal').getValue() || '',
            origine: me.down('#jmOrigine').getValue() || '', etat: me.down('#jmEtat').getValue() || '',
            query: me.down('#jmRecherche').getValue() || ''};
    },

    chercher: function () {
        this.journal.loadPage(1);
    },

    dessinerCompteurs: function (c) {
        var c0 = this.down('#jmCompteurs'), n = function (x) {
            return Ext.util.Format.number(x || 0, '0,000').replace(/,/g, ' ');
        };
        if (!c0) {
            return;
        }
        if (!c) {
            c0.update('');
            return;
        }
        var p = function (cle, libelle, classe, aide) {
            return '<span class="jm-compteur ' + classe + '" data-jm="' + cle + '" data-qtip="' + aide + '">' + libelle + ' <b>' + n(c[cle]) + '</b></span>';
        };
        c0.update(p('total', 'Messages', 'jm-total', 'Messages de la sélection')
                + p('envoyes', 'Envoyés', 'av-msg-envoye', 'Partis (y compris distribués et lus)')
                + p('distribues', 'Distribués', 'av-msg-distribue', 'Arrivés sur le téléphone (y compris lus)')
                + p('lus', 'Lus', 'av-msg-lu', 'Lus (WhatsApp)')
                + p('echecs', 'Échecs', 'av-msg-echec', 'Refusés ou non envoyés')
                + p('attente', 'En attente', 'av-msg-attente', 'Pas encore partis'));
    },

    exporter: function (bouton) {
        var url = '../api/v1/journal-messages/csv?' + Ext.Object.toQueryString(this.filtres());
        if (window.PrestigeChargement && PrestigeChargement.telecharger) {
            PrestigeChargement.telecharger(bouton, url, 'Export…');
        } else {
            window.open(url);
        }
    }
});
