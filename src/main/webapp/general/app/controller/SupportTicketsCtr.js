/* global Ext */

Ext.define('testextjs.controller.SupportTicketsCtr', {
    extend: 'Ext.app.Controller',

    views: ['testextjs.view.support.SupportTickets'],
    refs: [
        {
            ref: 'ticketsGrid',
            selector: 'supporttickets gridpanel'
        }
    ],
    init: function (application) {
        this.control({
            'supporttickets gridpanel': {
                viewready: this.doInitStore
            },
            'supporttickets combobox#comboStatut': {
                change: this.onStatutFilterChange
            },
            'supporttickets button#btnActualiser': {
                click: this.doRefresh
            },
            'supporttickets button#btnNouveauTicket': {
                click: this.onNouveauTicket
            },
            'supporttickets button#btnExcel': {
                click: this.onExcel
            },
            'supporttickets button#btnImprimer': {
                click: this.onImprimer
            },
            'supporttickets gridpanel actioncolumn': {
                ouvrir: this.onOuvrirTicket
            }
        });
    },

    doInitStore: function () {
        this.getTicketsGrid().getStore().load();
    },

    doRefresh: function () {
        this.getTicketsGrid().getStore().reload();
    },

    /**
     * Dictionnaire de suivi des pannes : PDF paysage de TOUS les tickets (une ligne par ticket), ouvert dans un nouvel
     * onglet.
     */
    /* Export Excel des tickets : meme filtre de statut que l'ecran, tout le resultat. */
    onExcel: function () {
        const params = this.getTicketsGrid().getStore().getProxy().extraParams || {};
        window.location = '../api/v1/support/tickets/export/excel?'
                + Ext.Object.toQueryString({statut: params.statut || ''});
    },

    onImprimer: function () {
        const progress = Ext.MessageBox.wait('Génération du PDF . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/support/tickets/print',
            success: function (response) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true) || {};
                if (result.success && result.msg) {
                    window.open('..' + result.msg, '_blank');
                } else {
                    Ext.Msg.alert('Message', result.msg || 'Impossible de générer le PDF');
                }
            },
            failure: function () {
                progress.hide();
                Ext.Msg.alert('Message', 'Un problème avec le serveur');
            }
        });
    },

    onStatutFilterChange: function (combo, newValue) {
        const store = this.getTicketsGrid().getStore();
        store.getProxy().extraParams.statut = (newValue === 'TOUS') ? '' : newValue;
        store.loadPage(1);
    },

    onNouveauTicket: function () {
        const me = this;
        const modules = Ext.create('Ext.data.ArrayStore', {
            data: [['VENTE'], ['CAISSE'], ['STOCK'], ['COMMANDES'], ['INVENTAIRE'], ['STATISTIQUES'],
                ['IMPRESSION'], ['TIERS-PAYANT'], ['AUTRE']],
            fields: [{name: 'module', type: 'string'}]
        });
        const types = Ext.create('Ext.data.ArrayStore', {
            data: [['INCIDENT'], ['QUESTION'], ['ASSISTANCE'], ['AMELIORATION']],
            fields: [{name: 'type', type: 'string'}]
        });
        const priorites = Ext.create('Ext.data.ArrayStore', {
            data: [['BASSE'], ['MOYENNE'], ['HAUTE'], ['CRITIQUE']],
            fields: [{name: 'priorite', type: 'string'}]
        });
        const wind = Ext.create('Ext.window.Window', {
            title: 'Nouveau ticket support',
            modal: true,
            width: 550,
            layout: 'fit',
            items: [
                {
                    xtype: 'form',
                    bodyPadding: 10,
                    items: [
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Sujet',
                            labelWidth: 90,
                            name: 'sujet',
                            allowBlank: false,
                            maxLength: 255,
                            anchor: '100%'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Module',
                            labelWidth: 90,
                            name: 'module',
                            store: modules,
                            valueField: 'module',
                            displayField: 'module',
                            typeAhead: false,
                            editable: false,
                            mode: 'local',
                            value: 'AUTRE',
                            anchor: '100%'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type',
                            labelWidth: 90,
                            name: 'type',
                            store: types,
                            valueField: 'type',
                            displayField: 'type',
                            typeAhead: false,
                            editable: false,
                            mode: 'local',
                            value: 'INCIDENT',
                            anchor: '100%'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Priorité',
                            labelWidth: 90,
                            name: 'priorite',
                            store: priorites,
                            valueField: 'priorite',
                            displayField: 'priorite',
                            typeAhead: false,
                            editable: false,
                            mode: 'local',
                            value: 'MOYENNE',
                            anchor: '100%'
                        },
                        {
                            xtype: 'textareafield',
                            fieldLabel: 'Description',
                            labelWidth: 90,
                            name: 'description',
                            maxLength: 4000,
                            height: 120,
                            anchor: '100%'
                        }
                    ]
                }
            ],
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    layout: {
                        pack: 'end',
                        type: 'hbox'
                    },
                    items: [
                        {
                            xtype: 'button',
                            text: 'Créer',
                            handler: function (btn) {
                                const form = btn.up('window').down('form');
                                if (!form.isValid()) {
                                    return;
                                }
                                const values = form.getValues();
                                const progress = Ext.MessageBox.wait('Veuillez patienter . . .',
                                        'En cours de traitement!');
                                Ext.Ajax.request({
                                    method: 'POST',
                                    url: '../api/v1/support/tickets',
                                    headers: {'Content-Type': 'application/json'},
                                    params: Ext.JSON.encode(values),
                                    success: function (response) {
                                        progress.hide();
                                        const result = Ext.JSON.decode(response.responseText, true) || {};
                                        if (result.success) {
                                            wind.destroy();
                                            me.doRefresh();
                                        }
                                        Ext.Msg.alert('Message', result.msg || 'Opération effectuée');
                                    },
                                    failure: function () {
                                        progress.hide();
                                        Ext.Msg.alert('Message', 'Un problème avec le serveur');
                                    }
                                });
                            }
                        },
                        {
                            xtype: 'button',
                            text: 'Annuler',
                            handler: function (btn) {
                                btn.up('window').destroy();
                            }
                        }
                    ]
                }
            ]
        });
        wind.show();
    },

    onOuvrirTicket: function (view, rowIndex, colIndex, item, e, record) {
        const me = this;
        const data = record.data;

        const messagesStore = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: ['id', 'createdAt', 'auteur', 'direction', 'message'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/support/tickets/' + data.id + '/messages',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        const statuts = Ext.create('Ext.data.ArrayStore', {
            data: [['NOUVEAU'], ['OUVERT'], ['AFFECTE'], ['EN_COURS'], ['EN_ATTENTE_CLIENT'],
                ['RESOLU'], ['CLOTURE'], ['ANNULE']],
            fields: [{name: 'statut', type: 'string'}]
        });

        const summary = '<b>Sujet :</b> ' + Ext.String.htmlEncode(data.sujet) + '<br/>'
                + '<b>Module :</b> ' + Ext.String.htmlEncode(data.module)
                + ' &nbsp; <b>Type :</b> ' + Ext.String.htmlEncode(data.type)
                + ' &nbsp; <b>Priorité :</b> ' + Ext.String.htmlEncode(data.priorite)
                + ' &nbsp; <b>Statut :</b> ' + Ext.String.htmlEncode(data.statutTicket) + '<br/>'
                + '<b>Déclarant :</b> ' + Ext.String.htmlEncode(data.utilisateur)
                + ' &nbsp; <b>Créé le :</b> ' + Ext.String.htmlEncode(data.createdAt) + '<br/>'
                + (data.description
                        ? '<b>Description :</b><br/><div style="max-height:60px;overflow:auto;">'
                        + Ext.String.htmlEncode(data.description).replace(/\n/g, '<br/>') + '</div>'
                        : '');

        const wind = Ext.create('Ext.window.Window', {
            title: 'Ticket ' + data.numero,
            modal: true,
            width: 750,
            height: 560,
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            items: [
                {
                    xtype: 'component',
                    padding: 10,
                    maxHeight: 160,
                    autoScroll: true,
                    html: summary
                },
                {
                    xtype: 'gridpanel',
                    flex: 1,
                    title: 'Conversation',
                    store: messagesStore,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        emptyText: '<div style="margin:10px;">Aucun message</div>'
                    },
                    columns: [
                        {header: 'Date', dataIndex: 'createdAt', width: 130, sortable: false, menuDisabled: true},
                        {header: 'Auteur', dataIndex: 'auteur', width: 160, sortable: false, menuDisabled: true},
                        {header: 'Origine', dataIndex: 'direction', width: 80, sortable: false, menuDisabled: true},
                        {
                            header: 'Message',
                            dataIndex: 'message',
                            flex: 1,
                            sortable: false,
                            menuDisabled: true,
                            renderer: function (value) {
                                return '<div style="white-space:normal;">'
                                        + Ext.String.htmlEncode(value).replace(/\n/g, '<br/>') + '</div>';
                            }
                        }
                    ]
                },
                {
                    xtype: 'container',
                    layout: {
                        type: 'hbox',
                        align: 'stretch'
                    },
                    padding: 10,
                    height: 80,
                    items: [
                        {
                            xtype: 'textareafield',
                            itemId: 'nouveauMessage',
                            flex: 1,
                            emptyText: 'Votre message . . .'
                        },
                        {
                            xtype: 'button',
                            text: 'Ajouter',
                            margin: '0 0 0 10',
                            width: 90,
                            handler: function () {
                                const field = wind.down('#nouveauMessage');
                                const message = Ext.String.trim(field.getValue() || '');
                                if (!message) {
                                    return;
                                }
                                Ext.Ajax.request({
                                    method: 'POST',
                                    url: '../api/v1/support/tickets/' + data.id + '/messages',
                                    headers: {'Content-Type': 'application/json'},
                                    params: Ext.JSON.encode({message: message}),
                                    success: function (response) {
                                        const result = Ext.JSON.decode(response.responseText, true) || {};
                                        if (result.success) {
                                            field.setValue('');
                                            messagesStore.reload();
                                            me.doRefresh();
                                        } else {
                                            Ext.Msg.alert('Message', result.msg || 'Un problème est survenu');
                                        }
                                    },
                                    failure: function () {
                                        Ext.Msg.alert('Message', 'Un problème avec le serveur');
                                    }
                                });
                            }
                        }
                    ]
                }
            ],
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    items: [
                        {
                            xtype: 'combobox',
                            itemId: 'comboNouveauStatut',
                            fieldLabel: 'Statut',
                            labelWidth: 45,
                            width: 230,
                            store: statuts,
                            valueField: 'statut',
                            displayField: 'statut',
                            typeAhead: false,
                            editable: false,
                            mode: 'local',
                            value: data.statutTicket
                        },
                        {
                            xtype: 'button',
                            text: 'Changer le statut',
                            handler: function () {
                                const statut = wind.down('#comboNouveauStatut').getValue();
                                Ext.Ajax.request({
                                    method: 'POST',
                                    url: '../api/v1/support/tickets/' + data.id + '/statut',
                                    headers: {'Content-Type': 'application/json'},
                                    params: Ext.JSON.encode({statut: statut}),
                                    success: function (response) {
                                        const result = Ext.JSON.decode(response.responseText, true) || {};
                                        if (result.success) {
                                            messagesStore.reload();
                                            me.doRefresh();
                                        } else {
                                            Ext.Msg.alert('Message', result.msg || 'Un problème est survenu');
                                        }
                                    },
                                    failure: function () {
                                        Ext.Msg.alert('Message', 'Un problème avec le serveur');
                                    }
                                });
                            }
                        },
                        '->',
                        {
                            xtype: 'button',
                            text: 'Fermer',
                            handler: function () {
                                wind.destroy();
                            }
                        }
                    ]
                }
            ]
        });
        wind.show();
    }
});
