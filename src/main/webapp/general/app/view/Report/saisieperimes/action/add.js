
/* global Ext */

var Me;

var int_montant_achat;
var LaborexWorkFlow_facture;
var listProductSelected;
var myAppController;
var uncheckedList;
var lg_CLIENT_ID = "";
lg_TYPE_TIERS_PAYANT_ID = "";

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.Report.saisieperimes.action.add', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.controller.LaborexWorkFlow',
        'Ext.ux.CheckColumn',
        'Ext.selection.CheckboxModel',
        'testextjs.model.articleSearchModel',
        'testextjs.model.perimesModel'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        plain: true,
        maximizable: true,
        closable: false,
        nameintern: ''
    },
    xtype: 'addPerimer',
    id: 'addPerimerID',
    frame: true,
    title: 'Ajout de produit p&eacute;rim&eacute;s',
    bodyPadding: 5,
    layout: 'column',

    initComponent: function () {
        Me = this;
        var itemsPerPage = 20;
        ref = this.getNameintern();
        titre = this.getTitre();
        ref = this.getNameintern();
        LaborexWorkFlow_facture = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        myAppController = Ext.create('testextjs.controller.App', {});

        var articlestore = new Ext.data.Store({
            model: 'testextjs.model.articleSearchModel',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/Report/saisieperimes/ws_article_list.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        var pendingStore = new Ext.data.Store({
            fields: [
                {name: 'id', type: 'string'},
                {name: 'lot', type: 'string'},
                {name: 'produitId', type: 'string'},
                {name: 'datePeremption', type: 'string'},
                {name: 'dateEntree', type: 'string'},
                {name: 'produitCip', type: 'string'},
                {name: 'produitLibelle', type: 'string'},
                {name: 'quantity', type: 'number'},
                {name: 'stockInitial', type: 'number'},
                {name: 'stockFinal', type: 'number'}
            ],
            pageSize: 20,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/gestionperime/saisie-encours',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        Ext.apply(this, {
            width: '98%',
            cls: 'custompanel',
            fieldDefaults: {
                labelAlign: 'left',
                anchor: '100%'
            },
            layout: {
                type: 'vbox',
                align: 'stretch',
                padding: 0
            },
            defaults: {
                flex: 1
            },
            id: 'panelArticlePerimes',
            items: [
                {
                    xtype: 'container',
                    border: false,
                    items: [{
                            xtype: 'fieldset',
                            collapsible: false,
                            padding: '3 15 3 15',
                            defaultType: 'textfield',
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    xtype: 'container',
                                    cls: 'ig-card ig-simple',
                                    layout: 'hbox',
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Article',
                                            flex: 1.5,
                                            margin: '0 15 0 0',
                                            labelWidth: 50,
                                            id: 'cmb_Article',
                                            store: articlestore,
                                            pageSize: 20,
                                            valueField: 'lg_FAMILLE_ID',
                                            displayField: 'str_NAME',
                                            typeAhead: true,
                                            queryMode: 'remote',
                                            minChars: 3,
                                            emptyText: 'Selectionnez un article',
                                            enableKeyEvents: true,
                                            listConfig: {
                                                loadingText: 'Recherche...',
                                                emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                                                getInnerTpl: function () {
                                                    return '<span>{str_NAME}</span>';
                                                }
                                            },
                                            listeners: {
                                                keypress: function (field, e, options) {
                                                    if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {
                                                        if (field.getValue().length <= 2) {
                                                            field.getStore().load();
                                                        }
                                                    } else if (e.getKey() === e.ENTER) {
                                                        Ext.getCmp('str_CODE_LOT').focus();
                                                    }
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'Lot',
                                            margin: '0 0 0 15',
                                            id: 'str_CODE_LOT',
                                            emptyText: 'Numero Lot',
                                            labelWidth: 40,
                                            flex: 1, enableKeyEvents: true,
                                            listeners: {
                                                keypress: function (field, e, options) {
                                                    if (e.getKey() === e.ENTER) {
                                                        Ext.getCmp('perimeQTY').focus();
                                                    }
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'numberfield',
                                            fieldLabel: 'Quantit&eacute;',
                                            id: 'perimeQTY',
                                            labelWidth: 60,
                                            flex: 0.8,
                                            margin: '0 0 0 15',
                                            minValue: 1,
                                            hideTrigger: true,
                                            emptyText: 'Quantite',
                                            enableKeyEvents: true,
                                            listeners: {
                                                keypress: function (field, e, options) {
                                                    if (e.getKey() === e.ENTER) {
                                                        Ext.getCmp('str_DATEPERMTION').focus();
                                                    }
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'datefield',
                                            fieldLabel: 'Date P&eacute;remption',
                                            margin: '0 0 0 15',
                                            id: 'str_DATEPERMTION',
                                            emptyText: 'Date de peremption',
                                            labelWidth: 110,
                                            flex: 1.5,
                                            enableKeyEvents: true,
                                            listeners: {
                                                keypress: function (field, e, options) {
                                                    if (e.getKey() === e.ENTER) {
                                                        Me.onAddItem();
                                                    }
                                                }
                                            }
                                        },
                                        {
                                            text: 'Enregistrer',
                                            id: 'btn_add',
                                            cls: 'btn-primary',
                                            margins: '0 0 0 15',
                                            xtype: 'button',
                                            handler: this.onAddItem
                                        }
                                    ]
                                }
                            ]
                        }]
                },
                {
                    xtype: 'fieldset',
                    padding: '3 15 3 15',
                    collapsible: false,
                    cls: 'ig-card ig-simple',
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            minHeight: 450,
                            /*plugins: [
                                {
                                    ptype: "rowediting",
                                    clicksToEdit: 0
                                }
                            ],*/
                            id: 'gridpanelArticlePerimes',
                            cls: 'my-grid-header',
                            store: pendingStore,
                            columns: [
                                {header: 'ID', dataIndex: 'id', hidden: true, width: 40},
                                {header: 'CODE CIP', dataIndex: 'produitCip', flex: 1},
                                {header: 'ARTICLE', dataIndex: 'produitLibelle', flex: 1},
                                {header: 'LOT', dataIndex: 'lot', editor: {xtype: "textfield", allowBlank: false}, flex: 1},
                                {header: 'STOCK ACTUEL', dataIndex: 'stockInitial', renderer: amountformat, align: 'right', editor: {xtype: "numberfield", minValue: 1, allowBlank: false}, flex: 1},
                                {header: 'QUANTITE', dataIndex: 'quantity', renderer: amountformat, align: 'right', editor: {xtype: "numberfield", minValue: 1, allowBlank: false}, flex: 1},
                                {header: 'STOCK FINAL', dataIndex: 'stockFinal', renderer: amountformat, align: 'right', editor: {xtype: "numberfield", minValue: 1, allowBlank: false}, flex: 1},
                                {header: 'DATE ENTREE', dataIndex: 'dateEntree', flex: 1},
                                {header: 'DATE PEREMPTION', dataIndex: 'datePeremption', flex: 1},
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [
                                        {
                                            getClass: function (v, meta, rec) {
                                                return 'unpaid';
                                            },
                                            getTip: function (v, meta, rec) {
                                                return 'Supprimer ';
                                            },
                                            scope: this,
                                            handler: this.onRemoveClick
                                        }
                                    ]
                                }
                            ],
                            listeners: {
                                edit: function (src, e) {
                                    var record = e.record;
                                    Ext.Ajax.request({
                                        url: '../api/v1/gestionperime/update',
                                        method: 'POST',
                                        headers: {'Content-Type': 'application/json'},
                                        params: Ext.JSON.encode({
                                            refParent: record.get("DATEPEREMPTION"),
                                            refTwo: record.get("LOT"),
                                            value: record.get("QTY"),
                                            ref: record.get("ID")
                                        }),
                                        success: function (response)
                                        {
                                            var obj = Ext.decode(response.responseText);
                                            if (obj.success) {
                                                e.record.commit();
                                            } else {
                                                // Logique de focus conditionnel sur erreur serveur
                                                Ext.MessageBox.show({
                                                    title: 'Infos',
                                                    width: 320,
                                                    msg: obj.message,
                                                    buttons: Ext.MessageBox.OK,
                                                    icon: Ext.MessageBox.ERROR,
                                                    fn: function(buttonId) {
                                                        if (buttonId === "ok") {
                                                            var stockMatch = obj.message.match(/Quantité en stock\s+(\d+)/);
                                                            if (stockMatch && parseInt(stockMatch[1], 10) > 0) {
                                                                Ext.getCmp('perimeQTY').focus(true, 10);
                                                            } else {
                                                                Ext.getCmp('cmb_Article').focus(true, 10);
                                                            }
                                                        }
                                                    }
                                                });
                                                Ext.getCmp('gridpanelArticlePerimes').getStore().load();
                                            }
                                        },
                                        failure: function (response)
                                        {
                                            // Handle failure
                                        }
                                    });
                                }
                            },
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 20,
                                store: pendingStore,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            }
                        },
                        {
                            xtype: 'toolbar',
                            ui: 'footer',
                            dock: 'bottom',
                            border: '0',
                            items: ['->',
                                {
                                    text: 'Imprimer',
                                    id: 'btn_print_perime',
                                    cls: 'btn-secondary',
                                    iconCls: 'printable',
                                    tooltip: 'Imprimer la saisie en cours pour la contr&ocirc;ler avant validation',
                                    scope: this,
                                    handler: this.onPrintSaisie
                                }, {
                                    text: 'Terminer',
                                    id: 'btn_create_perime',
                                    cls: 'btn-primary',
                                    iconCls: 'icon-clear-group',
                                    hidden: true,
                                    scope: this,
                                    handler: this.CreateFacture
                                }, {
                                    text: 'RETOUR',
                                    id: 'btn_cancel',
                                    cls: 'btn-secondary',
                                    iconCls: 'icon-clear-group',
                                    scope: this,
                                    handler: this.onbtncancel
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });
        this.loadCloturePrivilege();
    },

    loadStore: function () {
        // Focus sur le champ article au chargement
        Ext.getCmp('cmb_Article').focus(true, 200);
    },

    // Affiche le bouton 'Terminer' uniquement si l'utilisateur detient le
    // privilege 'Autorisation cloture saisie de perimés' (controle aussi cote serveur).
    loadCloturePrivilege: function () {
        Ext.Ajax.request({
            url: '../api/v1/gestionperime/autorisation-cloture',
            method: 'GET',
            success: function (response) {
                var o = Ext.JSON.decode(response.responseText, true) || {};
                var btn = Ext.getCmp('btn_create_perime');
                if (btn && o.authorize === true) {
                    btn.setVisible(true);
                }
            }
        });
    },

    onPrintSaisie: function () {
        Ext.Ajax.request({
            url: '../api/v1/gestionperime/saisie-encours',
            method: 'GET',
            params: {start: 0, limit: 9999},
            success: function (response) {
                var o = Ext.JSON.decode(response.responseText, true) || {};
                var rows = o.data || [];
                if (rows.length === 0) {
                    Ext.MessageBox.show({title: 'Infos', width: 320,
                        msg: 'Aucune saisie en cours &agrave; imprimer.',
                        buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING});
                    return;
                }
                var html = '<html><head><title>Contr&ocirc;le saisie de produits p&eacute;rim&eacute;s</title>'
                        + '<style>body{font-family:Arial,sans-serif;font-size:12px;}'
                        + 'h2{font-size:16px;margin-bottom:2px;} .soustitre{margin:0 0 10px 0;color:#555;}'
                        + 'table{border-collapse:collapse;width:100%;}'
                        + 'th,td{border:1px solid #444;padding:4px 6px;text-align:left;}'
                        + 'th{background:#eee;} td.num{text-align:right;}</style></head><body>'
                        + '<h2>Contr&ocirc;le saisie de produits p&eacute;rim&eacute;s</h2>'
                        + '<p class="soustitre">Saisie en cours (non valid&eacute;e) du '
                        + Ext.Date.format(new Date(), 'd/m/Y H:i') + ' - ' + rows.length + ' ligne(s)</p>'
                        + '<table><thead><tr><th>CODE CIP</th><th>ARTICLE</th><th>LOT</th>'
                        + '<th>STOCK ACTUEL</th><th>QUANTITE</th><th>STOCK FINAL</th>'
                        + '<th>DATE ENTREE</th><th>DATE PEREMPTION</th></tr></thead><tbody>';
                var totalQte = 0;
                Ext.Array.each(rows, function (r) {
                    totalQte += Number(r.quantity || 0);
                    html += '<tr><td>' + (r.produitCip || '') + '</td>'
                            + '<td>' + (r.produitLibelle || '') + '</td>'
                            + '<td>' + (r.lot || '') + '</td>'
                            + '<td class="num">' + amountformat(r.stockInitial || 0) + '</td>'
                            + '<td class="num">' + amountformat(r.quantity || 0) + '</td>'
                            + '<td class="num">' + amountformat(r.stockFinal || 0) + '</td>'
                            + '<td>' + (r.dateEntree || '') + '</td>'
                            + '<td>' + (r.datePeremption || '') + '</td></tr>';
                });
                html += '<tr><th colspan="4" style="text-align:right;">TOTAL QUANTITE</th>'
                        + '<th style="text-align:right;">' + amountformat(totalQte) + '</th>'
                        + '<th colspan="3"></th></tr>';
                html += '</tbody></table></body></html>';
                var printWindow = window.open('', '_blank');
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
            },
            failure: function () {
                Ext.MessageBox.show({title: 'Infos', width: 320, msg: 'Erreur de serveur',
                    buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.ERROR});
            }
        });
    },

    onbtncancel: function () {
        var xtype = "saisieperime";
        testextjs.app.getController('App').onLoadNewComponent(xtype, "", "");
    },
    
    onAddItem: function () {
        var dt_peremption = Ext.Date.format(Ext.getCmp('str_DATEPERMTION').getValue(), 'Y-m-d');
        var int_NUM_LOT = Ext.getCmp('str_CODE_LOT').getValue();
        var int_NUMBER = Ext.getCmp('perimeQTY').getValue();
        var lg_FAMILLE_ID = Ext.getCmp('cmb_Article').getValue();

        // Validation côté client avec focus sur erreur
        if (lg_FAMILLE_ID === "" || lg_FAMILLE_ID === null) {
            Ext.MessageBox.show({
                title: 'Infos', width: 320, msg: 'Veuillez s&eacute;lectionnez le produit', buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) { if (buttonId === "ok") { Ext.getCmp('cmb_Article').focus(); } }
            });
            return;
        }
        if (dt_peremption === "" || dt_peremption === null) {
            Ext.MessageBox.show({
                title: 'Infos', width: 320, msg: 'Veuillez saissir la date p&eacute;remption', buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) { if (buttonId === "ok") { Ext.getCmp('str_DATEPERMTION').focus(); } }
            });
            return;
        }
        if (int_NUM_LOT === "") {
            Ext.MessageBox.show({
                title: 'Infos', width: 320, msg: 'Veuillez saissir le num&eacute;ro de lot', buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) { if (buttonId === "ok") { Ext.getCmp('str_CODE_LOT').focus(); } }
            });
            return;
        }
        if (int_NUMBER === "" || int_NUMBER <= 0) {
            Ext.MessageBox.show({
                title: 'Infos', width: 320, msg: 'Veuillez saissir la quantit&eacute;', buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) { if (buttonId === "ok") { Ext.getCmp('perimeQTY').focus(); } }
            });
            return;
        }

        Ext.Ajax.request({
            url: '../api/v1/gestionperime/add',
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            params: Ext.JSON.encode({
                refParent: dt_peremption,
                refTwo: int_NUM_LOT,
                value: int_NUMBER,
                ref: lg_FAMILLE_ID
            }),
            success: function (response, options) {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success) {
                    Ext.getCmp('gridpanelArticlePerimes').getStore().load();
                    Ext.getCmp('str_DATEPERMTION').setValue('');
                    Ext.getCmp('str_CODE_LOT').setValue('');
                    Ext.getCmp('perimeQTY').setValue('');
                    Ext.getCmp('cmb_Article').setValue('');
                    
                    Ext.getCmp('cmb_Article').focus(true, 10);

                } else {
                    // Logique de focus conditionnel sur erreur serveur
                    Ext.MessageBox.show({
                        title: 'Infos', 
                        width: 320, 
                        msg: object.message, 
                        buttons: Ext.MessageBox.OK, 
                        icon: Ext.MessageBox.ERROR,
                        fn: function(buttonId) {
                            if (buttonId === "ok") {
                                // On cherche la chaîne "Quantité en stock" suivie d'un nombre
                                var stockMatch = object.message.match(/Quantité en stock\s+(\d+)/);
                                // Si on trouve et que le nombre est supérieur à 0
                                if (stockMatch && parseInt(stockMatch[1], 10) > 0) {
                                    Ext.getCmp('perimeQTY').focus(true, 10);
                                } else {
                                    Ext.getCmp('cmb_Article').focus(true, 10);
                                }
                            }
                        }
                    });
                }
            },
            failure: function (response, options) {
                Ext.MessageBox.show({title: 'Infos', width: 320, msg: "Erreur de serveur", buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.ERROR});
            }
        });
    },

    onRemoveClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        Ext.Ajax.request({
            url: '../api/v1/gestionperime/' + rec.get('id'),
            method: 'DELETE',
            success: function (response, options) {
                // Suppression silencieuse
                Ext.getCmp('gridpanelArticlePerimes').getStore().load();
                Ext.getCmp('cmb_Article').focus(true, 10);
            },
            failure: function (response, options) {
                Ext.MessageBox.show({title: 'Infos', width: 320, msg: "Erreur de serveur", buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.ERROR});
            }
        });
    },

    CreateFacture: function (val) {
        var store = Ext.getCmp('gridpanelArticlePerimes').getStore();
        if (store.getCount() <= 0) {
            return;
        } else {
            var record = store.getAt(0);
            myAppController.ShowWaitingProcess();
            Ext.Ajax.request({
                url: '../api/v1/gestionperime/close/' + record.get('id'),
                method: 'PUT',
                timeout: 24000000,
                success: function (response, options) {
                    myAppController.StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success) {
                        Ext.MessageBox.show({
                            title: 'Infos',
                            width: 320,
                            msg: "Nombre de produit retiré:<span style='font-weight:900;'>" + object.NB + "</span> ",
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.INFO
                        });
                    } else {
                        myAppController.StopWaitingProcess();
                    }
                    store.load();
                    if (typeof refreshNotificationBadge === 'function') {
                        refreshNotificationBadge();
                    }
                }, failure: function (response, options) {
                    myAppController.StopWaitingProcess();
                }
            });
        }
    }
});