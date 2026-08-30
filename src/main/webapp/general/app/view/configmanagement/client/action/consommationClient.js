/* global Ext */

/**
 * Suivi de la consommation d'un client par medicament : pour chaque produit
 * achete, derniere date d'achat, quantite moyenne, frequence moyenne de
 * renouvellement, nombre d'achats sur la periode, montant cumule et habitude
 * d'achat (mensuel, bimensuel, ponctuel, dormant).
 */
Ext.define('testextjs.view.configmanagement.client.action.consommationClient', {
    extend: 'Ext.window.Window',
    xtype: 'consommationClient',
    id: 'consommationClientID',
    maximizable: true,
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'Ext.grid.*'
    ],
    config: {
        odatasource: '',
        parentview: '',
        titre: ''
    },
    initComponent: function () {
        var me = this;
        var clientId = this.getOdatasource().lg_CLIENT_ID;
        var unAnAvant = Ext.Date.add(new Date(), Ext.Date.MONTH, -12);

        var store = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'familleId', type: 'string'},
                {name: 'cip', type: 'string'},
                {name: 'name', type: 'string'},
                {name: 'premierAchat', type: 'string'},
                {name: 'dernierAchat', type: 'string'},
                {name: 'nbAchats', type: 'number'},
                {name: 'qteTotale', type: 'number'},
                {name: 'qteMoyenne', type: 'number'},
                {name: 'frequenceJours', type: 'number'},
                {name: 'montant', type: 'number'},
                {name: 'habitude', type: 'string'}
            ],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/consommation',
                extraParams: {
                    clientId: clientId
                },
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        me.consoStore = store;

        Ext.apply(me, {
            title: this.getTitre(),
            width: 1000,
            height: 560,
            layout: 'fit',
            autoShow: true,
            // Fenetre modale (retour d'officine) : evite les clics dans la liste derriere
            modal: true,
            items: [
                {
                    xtype: 'gridpanel',
                    store: store,
                    viewConfig: {
                        forceFit: true,
                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Du',
                                    itemId: 'dtStart',
                                    labelWidth: 20,
                                    flex: 1,
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    format: 'd/m/Y',
                                    value: unAnAvant
                                }, '-', {
                                    xtype: 'datefield',
                                    fieldLabel: 'Au',
                                    itemId: 'dtEnd',
                                    labelWidth: 20,
                                    flex: 1,
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    format: 'd/m/Y',
                                    value: new Date()
                                }, '-', {
                                    xtype: 'textfield',
                                    itemId: 'query',
                                    flex: 1,
                                    emptyText: 'Produit (nom ou CIP) — 2 caractères',
                                    enableKeyEvents: true,
                                    listeners: {
                                        specialkey: function (field, e) {
                                            if (e.getKey() === e.ENTER) {
                                                me.doSearch();
                                            }
                                        },
                                        /* recherche automatique des 2 caracteres (retour d'officine),
                                         * en fin de frappe pour n'envoyer qu'une requete */
                                        keyup: {
                                            buffer: 350,
                                            fn: function (champ) {
                                                const valeur = champ.getValue() || '';
                                                if (valeur.length === 1) {
                                                    return;
                                                }
                                                me.doSearch();
                                            }
                                        }
                                    }
                                }, '-', {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    iconCls: 'searchicon',
                                    handler: function () {
                                        me.doSearch();
                                    }
                                }, '-', {
                                    text: 'Excel',
                                    tooltip: 'Exporter le résultat en Excel',
                                    iconCls: 'export_excel_icon',
                                    handler: function () {
                                        window.location = '../api/v1/client/consommation/excel?' + me.buildParams();
                                    }
                                }, {
                                    text: 'Créer inventaire',
                                    tooltip: 'Créer un inventaire avec les produits du résultat',
                                    iconCls: 'addicon',
                                    handler: function () {
                                        me.creerInventaire();
                                    }
                                }, {
                                    text: 'Imprimer',
                                    tooltip: 'Imprimer la fiche de consommation du client',
                                    iconCls: 'printable',
                                    handler: function () {
                                        window.open('../api/v1/client/consommation/pdf?clientId=' + clientId
                                                + '&dtStart=' + me.down('#dtStart').getSubmitValue()
                                                + '&dtEnd=' + me.down('#dtEnd').getSubmitValue());
                                    }
                                }
                            ]
                        }
                    ],
                    columns: [
                        {
                            xtype: 'rownumberer',
                            text: 'LG',
                            width: 40
                        }, {
                            header: 'CIP',
                            dataIndex: 'cip',
                            flex: 0.7
                        }, {
                            header: 'Produit',
                            dataIndex: 'name',
                            flex: 2
                        }, {
                            header: 'Dernier achat',
                            dataIndex: 'dernierAchat',
                            align: 'center',
                            flex: 0.8,
                            renderer: function (v) {
                                return v ? Ext.Date.format(Ext.Date.parse(v, 'Y-m-d'), 'd/m/Y') : '';
                            }
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Nb achats',
                            dataIndex: 'nbAchats',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.6
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Qt&eacute; moyenne',
                            dataIndex: 'qteMoyenne',
                            format: '0,000.00',
                            align: 'right',
                            flex: 0.7
                        }, {
                            header: 'Fr&eacute;quence renouv.',
                            dataIndex: 'frequenceJours',
                            align: 'right',
                            flex: 0.8,
                            renderer: function (v, metaData, record) {
                                if (record.get('nbAchats') < 2) {
                                    return '-';
                                }
                                if (v < 1) {
                                    return '&lt; 1 jour';
                                }
                                return Ext.util.Format.number(v, '0,000.') + ' jour(s)';
                            }
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Montant cumul&eacute;',
                            dataIndex: 'montant',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.8
                        }, {
                            header: 'Habitude',
                            dataIndex: 'habitude',
                            align: 'center',
                            flex: 0.7,
                            renderer: function (v) {
                                var colors = {
                                    'Mensuel': '#2E7D32',
                                    'Bimensuel': '#0D47A1',
                                    'Ponctuel': '#E65100',
                                    'Dormant': '#9E9E9E'
                                };
                                var color = colors[v] || '#333';
                                return '<span style="color:' + color + ';font-weight:700;">' + v + '</span>';
                            }
                        }
                    ],
                    bbar: {
                        dock: 'bottom',
                        items: [
                            {
                                xtype: 'pagingtoolbar',
                                store: store,
                                pageSize: 20,
                                flex: 1,
                                displayInfo: true
                            },
                            {
                                xtype: 'tbseparator'
                            },
                            {
                                xtype: 'button',
                                text: 'Annuler',
                                tooltip: 'Fermer la fen&ecirc;tre',
                                iconCls: 'icon-clear-group',
                                handler: function () {
                                    me.close();
                                }
                            }
                        ]
                    }
                }
            ]
        });
        me.callParent(arguments);

        store.on('beforeload', function (s) {
            var proxy = s.getProxy();
            proxy.setExtraParam('dtStart', me.down('#dtStart').getSubmitValue());
            proxy.setExtraParam('dtEnd', me.down('#dtEnd').getSubmitValue());
            proxy.setExtraParam('query', me.down('#query').getValue());
        });
        me.on('afterrender', function () {
            store.load();
        }, me, {single: true, delay: 1});
    },
    doSearch: function () {
        this.consoStore.loadPage(1);
    },
    /* Filtres courants, pour l'export Excel et la creation d'inventaire */
    buildParams: function () {
        const me = this;
        return 'clientId=' + encodeURIComponent(me.getOdatasource().lg_CLIENT_ID)
                + '&dtStart=' + me.down('#dtStart').getSubmitValue()
                + '&dtEnd=' + me.down('#dtEnd').getSubmitValue()
                + '&query=' + encodeURIComponent(me.down('#query').getValue() || '');
    },
    /*
     * Inventaire des produits du resultat affiche (memes filtres), nomme
     * « INVENTAIRE PRODUITS CONSO CLIENTS <horodatage> ».
     */
    creerInventaire: function () {
        const me = this;
        Ext.MessageBox.confirm('Créer un inventaire',
                'Créer un inventaire avec les produits de ce résultat ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    testextjs.app.getController('App').ShowWaitingProcess();
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/client/consommation/inventaire?' + me.buildParams(),
                        timeout: 600000,
                        success: function (response) {
                            testextjs.app.getController('App').StopWaitingProcess();
                            const result = Ext.JSON.decode(response.responseText, true) || {};
                            if (result.success) {
                                Ext.Msg.alert('Inventaire',
                                        (result.count || 0) + ' produit(s) dans l\'inventaire « '
                                        + (result.libelle || '') + ' ».');
                            } else {
                                Ext.Msg.alert('Inventaire', result.msg || 'La création a échoué');
                            }
                        },
                        failure: function (response) {
                            testextjs.app.getController('App').StopWaitingProcess();
                            Ext.Msg.alert('Inventaire', 'Erreur du serveur ' + response.status);
                        }
                    });
                });
    }
});
