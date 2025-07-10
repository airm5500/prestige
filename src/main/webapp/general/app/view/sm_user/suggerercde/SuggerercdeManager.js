/* global Ext, currentMonth */

var url_services_transaction_suggerercde = '../webservices/sm_user/suggerercde/ws_transaction.jsp?mode=';
var url_services_pdf_liste_suggerercde = '../webservices/sm_user/suggerercde/ws_generate_pdf.jsp';

var Me_Window;
var Omode;
var orderIdRef;
var famille_id_search;
var in_total_vente;
var int_total_formated;
var titre;
var int_montant_vente;
var LaborexWorkFlow, myAppController;
var int_montant_achat;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.sm_user.suggerercde.SuggerercdeManager', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.controller.LaborexWorkFlow',
        'testextjs.model.Grossiste',
        'testextjs.model.TSuggestionOrderDetails',
        'Ext.window.Window'
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
    xtype: 'suggerercdemanager',
    id: 'suggerercdemanagerID',
    frame: true,
    title: 'Traitement de suggestion',
    bodyStyle: 'background-color:  #E5E9EC;',
    bodyPadding: 5,
    layout: 'column',

    lastEditContext: null,
    focusContext: {
        row: 0
    },

    initComponent: function () {
        Me_Window = this;
        int_montant_vente = 0;
        int_montant_achat = 0;
        var itemsPerPageGrid = 10;
        titre = this.getTitre();
        myAppController = Ext.create('testextjs.controller.App', {});
        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});

        const AppController = testextjs.app.getController('App');
        orderIdRef = this.getNameintern();
        const store = Ext.create('testextjs.store.SearchStore');
        const storerepartiteur = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: 999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/grossiste/all',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }
        });

        const store_details_sugg = new Ext.data.Store({
            model: 'testextjs.model.TSuggestionOrderDetails',
            pageSize: itemsPerPageGrid,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/suggestion/list/items',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            },
            listeners: {
                load: function (store, records, successful) {
                    if (!successful) {
                        return;
                    }

                    var grid = Ext.getCmp('gridpanelSuggestionID');
                    Me_Window.getSuggestionAmount(orderIdRef);
                    
                    if (grid && store.getCount() === 0 && store.currentPage > 1) {
                        grid.down('pagingtoolbar').movePrevious();
                        return;
                    }
                    
                    if (grid) {
                        var focusIndex = 0; 
                        if (Me_Window.focusContext && Me_Window.focusContext.row !== undefined) {
                            focusIndex = Me_Window.focusContext.row;
                        }
                        
                        focusIndex = Math.max(0, Math.min(focusIndex, store.getCount() - 1));
                        
                        Me_Window.focusCell(grid, focusIndex);
                        
                        Me_Window.focusContext = { row: 0 }; 
                    }
                }
            }
        });
        
        const int_BUTOIR = new Ext.form.field.Display({
            xtype: 'displayfield', fieldLabel: 'Butoir ::', labelWidth: 50,
            name: 'int_DATE_BUTOIR_ARTICLE', id: 'int_DATE_BUTOIR_ARTICLE',
            fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;", margin: '0 15 0 0', value: "0"
        });
        const int_VENTE = new Ext.form.field.Display({
            xtype: 'displayfield', fieldLabel: 'Valeur Vente ::', labelWidth: 95,
            name: 'int_VENTE', id: 'int_VENTE',
            fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;", margin: '0 15 0 0', value: "0"
        });
        const int_ACHAT = new Ext.form.field.Display({
            xtype: 'displayfield', fieldLabel: 'Valeur Achat ::', labelWidth: 95,
            name: 'int_ACHAT', id: 'int_ACHAT',
            fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;", margin: '0 15 0 0', value: "0"
        });
        
        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1,
            pluginId: 'cellplugin'
        });

        Ext.apply(this, {
            width: '98%',
            fieldDefaults: {labelAlign: 'left', labelWidth: 90, anchor: '100%', msgTarget: 'side'},
            layout: {type: 'vbox', align: 'stretch', padding: 10},
            defaults: {flex: 1},
            id: 'panelID',
            items: [{
                xtype: 'fieldset',
                title: 'Informations sur la suggestion',
                collapsible: true, defaultType: 'textfield', margin: '5 0 5 0',
                layout: 'anchor', defaults: {anchor: '100%'},
                items: [
                    {
                        xtype: 'fieldcontainer', layout: 'hbox', combineErrors: true,
                        defaultType: 'textfield', defaults: {hideLabel: 'true'},
                        items: [{
                                xtype: 'combobox', fieldLabel: 'Repartiteur', allowBlank: false,
                                name: 'Code.Rep', margin: '0 15 0 0', id: 'lg_GROSSISTE_ID',
                                store: storerepartiteur, valueField: 'lg_GROSSISTE_ID', displayField: 'str_LIBELLE',
                                typeAhead: true, queryMode: 'remote', pageSize: 999, emptyText: 'Choisir un repartiteur...',
                                listeners: {
                                    select: function (cmp) {
                                        if (titre === 'Suggestion de commande') {
                                            Me_Window.onchangeGrossiste();
                                        }
                                    }
                                }
                            },
                            int_BUTOIR,
                            int_ACHAT,
                            int_VENTE]
                    }]
            },
            {
                xtype: 'fieldset',
                title: 'Ajout Produit',
                collapsible: true, defaultType: 'textfield', width: 300,
                layout: 'anchor', defaults: {anchor: '100%'},
                items: [
                    {
                        xtype: 'fieldcontainer', fieldLabel: 'Produit', layout: 'hbox',
                        combineErrors: true, defaultType: 'textfield',
                        defaults: {hideLabel: 'true'},
                        items: [
                            {
                                xtype: 'combobox', fieldLabel: 'Article', name: 'str_NAME',
                                id: 'str_NAME', store: store, margins: '0 10 5 10',
                                enableKeyEvents: true, valueField: 'CIP', displayField: 'str_DESCRIPTION',
                                pageSize: 20, typeAhead: true, flex: 2,
                                queryMode: 'remote', emptyText: 'Choisir un article par Nom ou Cip...',
                                listConfig: {
                                    loadingText: 'Recherche...',
                                    emptyText: 'Pas de produit trouvé.',
                                    getInnerTpl: function () {
                                        return '<tpl for="."><tpl if="int_NUMBER_AVAILABLE <=0"><span style="color:#17987e;font-weight:bold;"><span style="width:100px;display:inline-block;">{CIP}</span>{str_DESCRIPTION} <span style="float: right;"> ( {int_PRICE} )</span></span><tpl else><span style="font-weight:bold;"><span style="width:100px;display:inline-block;">{CIP}</span>{str_DESCRIPTION} <span style="float: right; "> ( {int_PRICE} )</span></span></tpl></tpl>';
                                    }
                                },
                                listeners: {
                                    select: function (cmp) {
                                        const value = cmp.getValue();
                                        const record = cmp.findRecord(cmp.valueField || cmp.displayField, value);
                                        Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(record.get('lg_FAMILLE_ID'));
                                        if (cmp.getValue() === "0" || cmp.getValue() === "Ajouter un nouvel article") {
                                            Me_Window.onbtnaddArticle();
                                        } else {
                                            Ext.getCmp('int_QUANTITE').focus(true, 100, function () {
                                                Ext.getCmp('int_QUANTITE').selectText(0, 1);
                                            });
                                        }
                                        Ext.getCmp('btn_detail').enable();
                                    }
                                }
                            },
                            {
                                xtype: 'displayfield', fieldLabel: 'Id produit :', name: 'lg_FAMILLE_ID_VENTE',
                                id: 'lg_FAMILLE_ID_VENTE', labelWidth: 120, hidden: true,
                                fieldStyle: "color:blue;", margin: '0 15 0 0'
                            },
                            {
                                fieldLabel: 'Quantit&eacute;', emptyText: 'Quantite', name: 'int_QUANTITE',
                                id: 'int_QUANTITE', xtype: 'numberfield', margin: '0 15 0 10',
                                minValue: 1, width: 400, value: 1, allowBlank: false,
                                enableKeyEvents: true, regex: /[0-9.]/,
                                listeners: {
                                    specialKey: function (field, e) {
                                        if (e.getKey() === e.ENTER) {
                                            if (Ext.getCmp('str_NAME').getValue() !== "") {
                                                Me_Window.onEdit();
                                            } else {
                                                Ext.MessageBox.alert('Error Message', 'Verifiez votre selection svp');
                                            }
                                        }
                                    }
                                }
                            },
                            {text: 'Ajouter', id: 'btn_add', margins: '0 0 0 6', hidden: true, xtype: 'button', handler: this.onbtnadd, disabled: true},
                            {text: 'Voir detail', id: 'btn_detail', margins: '0 0 0 6', xtype: 'button', handler: this.onbtndetail, disabled: true}
                        ]
                    }
                ]
            },
            {
                xtype: 'fieldset',
                title: 'Liste des produits de la suggestion',
                collapsible: true, defaultType: 'textfield', layout: 'anchor',
                defaults: {anchor: '100%'},
                items: [{
                        columnWidth: 0.65,
                        xtype: 'gridpanel',
                        id: 'gridpanelSuggestionID',
                        plugins: [this.cellEditing],
                        store: store_details_sugg,
                        height: 370,
                        columns: [
                            {text: 'CIP', flex: 0.7, sortable: true, dataIndex: 'str_FAMILLE_CIP', renderer: Me_Window.columnRenderer},
                            {text: 'LIBELLE', flex: 2.5, sortable: true, dataIndex: 'str_FAMILLE_NAME', renderer: Me_Window.columnRenderer},
                            {text: 'PRIX.VENTE', flex: 1, sortable: true, dataIndex: 'lg_FAMILLE_PRIX_VENTE', align: 'right', renderer: Me_Window.numberColumnRenderer, editor: {xtype: 'numberfield', minValue: 1, selectOnFocus: true, allowBlank: false, regex: /[0-9.]/}},
                            {text: 'PRIX A. TARIF', flex: 1, sortable: true, hidden: true, align: 'right', renderer: Me_Window.numberColumnRenderer, dataIndex: 'lg_FAMILLE_PRIX_ACHAT', editor: {xtype: 'numberfield', minValue: 1, allowBlank: false, selectOnFocus: true, regex: /[0-9.]/}},
                            {text: 'PRIX A. FACT', flex: 1, sortable: true, dataIndex: 'int_PAF_SUGG', align: 'right', renderer: Me_Window.numberColumnRenderer, editor: {xtype: 'numberfield', minValue: 1, allowBlank: false, regex: /[0-9.]/}},
                            {text: 'PRIX TIPS', flex: 1, sortable: true, hidden: true, align: 'right', renderer: Me_Window.numberColumnRenderer, dataIndex: 'int_PRIX_REFERENCE'},
                            {text: 'STOCK', flex: 1, sortable: true, dataIndex: 'int_STOCK', align: 'right', renderer: Me_Window.numberColumnRenderer},
                            {text: 'SEUIL', flex: 1, sortable: true, dataIndex: 'int_SEUIL', align: 'right', renderer: Me_Window.numberColumnRenderer, editor: {xtype: 'numberfield', minValue: 1, selectOnFocus: true, allowBlank: false, regex: /[0-9.]/}},
                            
                            {
                                header: 'Q.CDE', dataIndex: 'int_NUMBER', align: 'right',
                                renderer: Me_Window.numberColumnRenderer, flex: 1,
                                editor: {
                                    xtype: 'numberfield', minValue: 0,
                                    selectOnFocus: true, allowBlank: false,
                                    enableKeyEvents: true,
                                    listeners: {
                                        specialkey: function(field, e) {
                                            if (e.getKey() === e.ENTER) {
                                                e.stopEvent();
                                                var grid = Ext.getCmp('gridpanelSuggestionID');
                                                var sm = grid.getSelectionModel();
                                                var record = sm.getSelection()[0];
                                                var position = sm.getCurrentPosition();
                                                if (!record) return;
                                                var value = field.getValue();
                                                if (value === 0) {
                                                    Me_Window.onRemoveClick(grid, position.row);
                                                    return;
                                                }
                                                Me_Window.updateQty(record, value, position);
                                            }
                                        }
                                    }
                                }
                            },

                            {header: AppController.getMonthToDisplay(0, currentMonth), dataIndex: 'int_VALUE0', flex: 1, align: 'right', renderer: Me_Window.numberColumnRenderer},
                            {header: AppController.getMonthToDisplay(1, currentMonth), dataIndex: 'int_VALUE1', align: 'right', renderer: Me_Window.numberColumnRenderer, flex: 0.7},
                            {header: AppController.getMonthToDisplay(2, currentMonth), dataIndex: 'int_VALUE2', align: 'right', format: '0,000.', renderer: Me_Window.numberColumnRenderer, flex: 0.7},
                            {header: AppController.getMonthToDisplay(3, currentMonth), dataIndex: 'int_VALUE3', align: 'right', renderer: Me_Window.numberColumnRenderer, flex: 0.7},
                            {xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true, items: [{icon: 'resources/images/icons/fam/cog.png', tooltip: 'Qté détail', scope: this, handler: this.onQtyDetail, getClass: function (value, metadata, record) { if (record.get('bool_DECONDITIONNE_EXIST') === 1) { return 'x-display-hide'; } else { return 'x-hide-display';}}}]},
                            {xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true, items: [{icon: 'resources/images/icons/fam/application_view_list.png', tooltip: 'Detail sur l\'article', scope: this, handler: this.onDetailClick}]},
                            {xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true, items: [{/*icon: 'resources/images/icons/fam/delete.png',*/ tooltip: 'Supprimer', scope: this/*, handler: this.onRemoveClick*/}]}
                        ],
                        tbar: [{xtype: 'textfield', id: 'rechercherDetail', name: 'rechercherDetail', emptyText: 'Recherche', width: 300, listeners: {'render': function (cmp) {cmp.getEl().on('keypress', function (e) {if (e.getKey() === e.ENTER) {Me_Window.onRechClick();}});}}}],
                        
                        bbar: {
                            xtype: 'pagingtoolbar',
                            pageSize: itemsPerPageGrid,
                            store: store_details_sugg,
                            displayInfo: true,
                            plugins: new Ext.ux.ProgressBarPager(),
                            listeners: {
                                beforechange: function (page, currentPage) {
                                    Me_Window.focusContext = { row: 0 };
                                    const myProxy = this.store.getProxy();
                                    myProxy.params = {query: '', orderId: orderIdRef};
                                    myProxy.setExtraParam('query', Ext.getCmp('rechercherDetail').getValue());
                                    myProxy.setExtraParam('orderId', orderIdRef);
                                }
                            }
                        }
                    }]
            },
            {
                xtype: 'toolbar', ui: 'footer', dock: 'bottom', border: '0',
                items: ['->',
                    {text: 'Retour', id: 'btn_cancel', iconCls: 'icon-clear-group', scope: this, hidden: false, handler: this.onbtncancel},
                    {text: 'Imprimer', id: 'btn_print', iconCls: 'icon-clear-group', scope: this, hidden: true, handler: this.onbtnprint}
                ]
            }]
        });
        this.callParent();

        if (titre === "Suggestion de commande") {
            const OgridpanelSuggestionID = Ext.getCmp('gridpanelSuggestionID');
            Ext.getCmp('lg_GROSSISTE_ID').setValue(this.getOdatasource().lg_GROSSISTE_ID);
            Ext.getCmp('btn_print').show();
            int_montant_achat = Ext.util.Format.number(this.getOdatasource().int_TOTAL_ACHAT, '0,000.');
            int_montant_vente = Ext.util.Format.number(this.getOdatasource().int_TOTAL_VENTE, '0,000.');
            Ext.getCmp('int_VENTE').setValue(int_montant_vente + '  CFA');
            Ext.getCmp('int_ACHAT').setValue(int_montant_achat + '  CFA');
            Ext.getCmp('int_DATE_BUTOIR_ARTICLE').setValue(this.getOdatasource().int_DATE_BUTOIR_ARTICLE);
            
            OgridpanelSuggestionID.getStore().load({params: {orderId: orderIdRef, query: null}});
        }

        Ext.getCmp('gridpanelSuggestionID').on('edit', function (editor, e) {
            const OGrid = Ext.getCmp('gridpanelSuggestionID');
            let datas;
            let url;
            const suggId = e.record.data.lg_SUGGESTION_ORDER_ID;

            if (e.field === 'int_NUMBER') {
                return;
            }

            if (e.field === 'int_SEUIL') {
                url = '../api/v1/suggestion/item/update-seuil';
                const qtySeuil = Number(e.record.data.int_SEUIL);
                datas = {itemId: e.record.data.lg_SUGGESTION_ORDER_DETAILS_ID, seuil: qtySeuil};
            } else if (e.field === 'lg_FAMILLE_PRIX_VENTE') {
                url = '../api/v1/suggestion/item/update-prixvente';
                const prixVente = Number(e.record.data.lg_FAMILLE_PRIX_VENTE);
                datas = {itemId: e.record.data.lg_SUGGESTION_ORDER_DETAILS_ID, prixVente: prixVente};
            } else if (e.field === 'int_PAF_SUGG') {
                url = '../api/v1/suggestion/item/update-prixachat';
                const prixPaf = Number(e.record.data.int_PAF_SUGG);
                datas = {itemId: e.record.data.lg_SUGGESTION_ORDER_DETAILS_ID, prixPaf: prixPaf};
            } else {
                datas = null;
                url = null;
            }

            if (datas !== null && url !== null) {
                Ext.Ajax.request({
                    method: 'POST', url: url,
                    headers: {'Content-Type': 'application/json'},
                    params: Ext.JSON.encode(datas),
                    success: function (response, options) {
                        e.record.commit();
                        Me_Window.getSuggestionAmount(suggId);
                    },
                    failure: function (response, options) {
                        Ext.Msg.alert("Message", 'server-side failure with status code ' + response.status);
                    }
                });
            }
        });
    },

    focusCell: function(grid, rowIndex) {
        var store = grid.getStore();
        if (store.getCount() > 0 && rowIndex < store.getCount() && !grid.getPlugin('cellplugin').activeEditor) {
            Ext.defer(function() {
                var recordToFocus = store.getAt(rowIndex);
                var qteColumn = grid.down('gridcolumn[dataIndex=int_NUMBER]');
                if(recordToFocus && qteColumn) {
                    grid.getPlugin('cellplugin').startEdit(recordToFocus, qteColumn);
                }
            }, 150);
        }
    },
    
    restoreLastFocus: function() {
        var me = this;
        if (me.lastEditContext) {
            var grid = Ext.getCmp('gridpanelSuggestionID');
            var context = me.lastEditContext;
            
            Ext.defer(function() {
                grid.getPlugin('cellplugin').startEdit(context.record, context.column);
            }, 100);
            
            me.lastEditContext = null;
        }
    },

    // Utilise la mise à jour locale (sans reload) pour être rapide 
    updateQty: function(record, quantity, position) {
        const grid = Ext.getCmp('gridpanelSuggestionID');
        
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/suggestion/item/update-qte-cmde',
            headers: {'Content-Type': 'application/json'},
            params: Ext.JSON.encode({
                itemId: record.get('lg_SUGGESTION_ORDER_DETAILS_ID'),
                qte: quantity
            }),
            success: function(response) {
                record.set('int_NUMBER', quantity);
                record.commit();
                
                Me_Window.getSuggestionAmount(record.get('lg_SUGGESTION_ORDER_ID'), function() {
                    const store = grid.getStore();
                    const pagingToolbar = grid.down('pagingtoolbar');
                    const pageData = pagingToolbar.getPageData();
                    const isLastOnPage = (position.row === store.getCount() - 1);
                    const isLastPage = (pageData.currentPage >= pageData.pageCount);

                    if (isLastOnPage && isLastPage) {
                        Ext.MessageBox.alert('Fin de la Saisie', 'Dernier produit de la suggestion traité. Retour à la liste.', function() {
                            Me_Window.onbtncancel();
                        });
                    } else if (isLastOnPage) {
                        pagingToolbar.moveNext();
                    } else {
                        Me_Window.focusCell(grid, position.row + 1);
                    }
                });
            },
            failure: function() {
                record.reject();
                Ext.MessageBox.alert('Erreur', 'La mise à jour de la quantité a échoué.');
            }
        });
    },

    loadStore: function () {},

    loadStore: function () {},

    onbtnprint: function () {
        Ext.MessageBox.confirm('Message', 'Confirmation de l\'impression de cette suggestion',
                function (btn) {
                    if (btn == 'yes') {
                        Me_Window.onPdfClick(orderIdRef);
                    }
                });
    },

    onPdfClick: function (lg_SUGGESTION_ORDER_ID) {
        var linkUrl = url_services_pdf_liste_suggerercde + "?lg_SUGGESTION_ORDER_ID=" + lg_SUGGESTION_ORDER_ID;
        window.open(linkUrl);
    },

    setTitleFrame: function (str_data) {
        this.title = this.title + " :: Ref " + str_data;
    },

    onfiltercheck: function () {
        var str_name = Ext.getCmp('str_NAME').getValue();
        if (str_name.length < 4) {
            Ext.getCmp('btn_add').disable();
        }
    },

    onbtnadd: function () {
        if (orderIdRef === "" || orderIdRef === undefined) {
            orderIdRef = null;
        }

        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() === null) {
            Ext.MessageBox.alert('Error Message', 'Renseignez le Grossiste ', function () {
                Ext.getCmp('lg_GROSSISTE_ID').focus();
            });
        } else {
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: url_services_transaction_suggerercde + 'create',
                params: {
                    lg_FAMILLE_ID: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
                    lg_SUGGESTION_ORDER_ID: orderIdRef,
                    lg_SUGGESTION_ORDER_DETAILS_ID: null,
                    lg_GROSSISTE_ID: Ext.getCmp('lg_GROSSISTE_ID').getValue(),
                    int_NUMBER: Ext.getCmp('int_QUANTITE').getValue()
                },
                success: function (response) {
                    testextjs.app.getController('App').StopWaitingProcess();
                    let object = Ext.JSON.decode(response.responseText, false);
                    if (object.errors_code == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                    } else {
                        orderIdRef = object.ref;
                        Me_Window.setTitleFrame(object.ref);
                        Me_Window.focusContext = { row: 0 };
                        Ext.getCmp('gridpanelSuggestionID').getStore().reload();
                    }
                },
                failure: function (response) {
                    testextjs.app.getController('App').StopWaitingProcess();
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });
        }
    },

    
    onEdit: function () {
        const me = this;
        const suggestionId = me.getNameintern();
        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() === null) {
            Ext.MessageBox.alert('Error Message', 'Renseignez le Grossiste ', function () {
                Ext.getCmp('lg_GROSSISTE_ID').focus();
            });
        } else {
            testextjs.app.getController('App').ShowWaitingProcess();
            const data = {
                "qte": Ext.getCmp('int_QUANTITE').getValue(),
                "familleId": Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
                suggestionId
            };
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/suggestion/item/add',
                params: Ext.JSON.encode(data),
                success: function (response, options) {
                    testextjs.app.getController('App').StopWaitingProcess();
                    
                    Ext.getCmp('str_NAME').setValue("");
                    Ext.getCmp('int_QUANTITE').setValue(1);
                    Ext.getCmp('btn_detail').disable();
                    Ext.getCmp('str_NAME').focus();

                    var store = Ext.getCmp('gridpanelSuggestionID').getStore();
                    store.loadPage(1000); 
                },
                failure: function (response) {
                    Ext.MessageBox.alert('Error Message', response.responseText);
                    testextjs.app.getController('App').StopWaitingProcess();
                }
            });
        }
    },
    
    updateAmountFields: function (data) {
        if (data) {
            int_montant_achat = Ext.util.Format.number(data.montantAchat, '0,000.');
            int_montant_vente = Ext.util.Format.number(data.montantVente, '0,000.');
            Ext.getCmp('int_VENTE').setValue(int_montant_vente + '  CFA');
            Ext.getCmp('int_ACHAT').setValue(int_montant_achat + '  CFA');
        }
    },
    
    onchangeGrossiste: function () {
        let lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
        myAppController.ShowWaitingProcess();
        Ext.Ajax.request({
            url: '../api/v1/suggestion/change-grossiste',
            method: 'GET',
            timeout: 2400000,
            params: {suggestionId: orderIdRef, grossisteId: lg_GROSSISTE_ID},
            success: function (response) {
                myAppController.StopWaitingProcess();
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.response) {
                    Ext.MessageBox.confirm('Message', 'Une suggestion existe déjà pour ce grossiste. Voulez-vous les fusionner',
                            function (btn) {
                                if (btn == 'yes') {
                                    Me_Window.doFusion(orderIdRef, lg_GROSSISTE_ID);
                                }
                            });
                } else {
                    Ext.MessageBox.alert(' Message', "Operation effectuée avec succes");
                }
            },
            failure: function (response) {
                Ext.MessageBox.alert('Error Message', response.responseText);
                myAppController.StopWaitingProcess();
            }
        });
    },

    doFusion: function (lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID) {
        myAppController.ShowWaitingProcess();
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/suggestion/merge-suggestion',
            timeout: 2400000,
            params: {suggestionId: lg_SUGGESTION_ORDER_ID, grossisteId: lg_GROSSISTE_ID},
            success: function (response) {
                myAppController.StopWaitingProcess();
                Me_Window.onbtncancel();
            },
            failure: function (response) {
                myAppController.StopWaitingProcess();
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    
    
    onDetailClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        var gridPanel = Ext.getCmp('gridpanelSuggestionID');
        
        if (gridPanel.getPlugin('cellplugin').editing) {
            Me_Window.lastEditContext = gridPanel.getPlugin('cellplugin').context;
        }

        new testextjs.view.configmanagement.famille.action.detailArticle({
            odatasource: rec.data,
            produitId: rec.get('lg_FAMILLE_ID'),
            parentview: this,
            mode: "detail",
            titre: "Detail sur l'article [" + rec.get('str_DESCRIPTION') + "]",
            listeners: {
                close: function() {
                    Me_Window.restoreLastFocus();
                }
            }
        });
    },

    onQtyDetail: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        var gridPanel = Ext.getCmp('gridpanelSuggestionID');
        
        if (gridPanel.getPlugin('cellplugin').editing) {
            Me_Window.lastEditContext = gridPanel.getPlugin('cellplugin').context;
        }

        Ext.Ajax.request({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/suggestion/qty-detail/' + rec.get('lg_FAMILLE_ID'),
            success: function (response, options) {
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    var stock = result.stock;
                    var form = Ext.create('Ext.window.Window', {
                        autoShow: true, height: 200, width: 300, modal: true, title: 'STOCK DETAIL',
                        closeAction: 'destroy',
                        closable: true, maximizable: false, layout: {type: 'fit'},
                        dockedItems: [{xtype: 'toolbar', dock: 'bottom', ui: 'footer', layout: {pack: 'end', type: 'hbox'}, items: [{xtype: 'button', iconCls: 'cancelicon', handler: function (btn) {btn.up('window').close();}, text: 'FERMER'}]}],
                        items: [{xtype: 'fieldset', bodyPadding: 50, defaults: {anchor: '100%'}, collapsible: false, items: [{xtype: 'displayfield', margin: '40 9 0 0', fieldLabel: 'STOCK DETAIL', value: stock, renderer: function (v) {return Ext.util.Format.number(v, '0,000.');}, fieldStyle: "color:blue;font-weight:800;"}]}],
                        listeners: {
                            close: function() {
                                Me_Window.restoreLastFocus();
                            }
                        }
                    });
                }
            }
        });
    },

    onbtndetail: function () {
        new testextjs.view.configmanagement.famille.action.detailArticleOther({
            odatasource: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
            parentview: this,
            mode: "detail",
            titre: "Detail sur l'article [" + Ext.getCmp('str_NAME').getValue() + "]"
        });
    },
    
    onbtncancel: function () {
        const xtype = "i_sugg_manager";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    
    //  Gère le cas de la suppression du dernier article de la suggestion
onRemoveClick: function (grid, rowIndex) {
    grid = grid.xtype === 'gridpanel' ? grid : Ext.getCmp('gridpanelSuggestionID');
    const store = grid.getStore();
    const rec = store.getAt(rowIndex);
    if (!rec) return;

    const pagingToolbar = grid.down('pagingtoolbar');
    const pageData = pagingToolbar.getPageData();
    
    // On vérifie si c'est le dernier produit de la toute dernière page
    const isLastItemOverall = (store.getCount() === 1 && pageData.currentPage === pageData.pageCount);

    if (isLastItemOverall) {
        // Cas spécial : on supprime le tout dernier produit.
        Ext.MessageBox.confirm('Confirmation', 'Voulez-vous upprimer le dernier article. Voulez-vous continuer ?', function (btn) {
            if (btn === 'yes') {
                testextjs.app.getController('App').ShowWaitingProcess();
                Ext.Ajax.request({
                    method: 'DELETE',
                    url: '../api/v1/suggestion/item/' + rec.get('lg_SUGGESTION_ORDER_DETAILS_ID'),
                    success: function (response) {
                        testextjs.app.getController('App').StopWaitingProcess();
                        
                        // On rafraîchit la liste parente pour qu'elle soit à jour...
                        var parentView = Me_Window.getParentview();
                        if (parentView && parentView.getStore) {
                            parentView.getStore().load({
                                callback: function() {
                                    // ...et seulement APRES on ferme cette fenêtre.
                                    Me_Window.onbtncancel();
                                }
                            });
                        } else {
                            // Fallback si on ne trouve pas la vue parente
                            Me_Window.onbtncancel();
                        }
                    },
                    failure: function (response) {
                        testextjs.app.getController('App').StopWaitingProcess();
                        Ext.MessageBox.alert('Error Message', response.responseText);
                    }
                });
            }
        });
    } else {
        // Cas normal : il reste d'autres produits.
        // On prépare le contexte pour que le focus se mette sur l'item qui va remplacer celui-ci.
        Me_Window.focusContext = { row: rowIndex };
        
        Ext.Ajax.request({
            method: 'DELETE',
            url: '../api/v1/suggestion/item/' + rec.get('lg_SUGGESTION_ORDER_DETAILS_ID'),
            success: function (response) {
                // On recharge juste et Le listener 'load' du store s'occupe de tout.
                store.reload();
            },
            failure: function (response) {
                // En cas d'échec, on annule l'intention de focus.
                Me_Window.focusContext = null;
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    }
},
    
    onSelectionChange: function (model, records) {
        const rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    },
    
    onbtnaddArticle: function () {
        new testextjs.view.configmanagement.famille.action.add2({
            odatasource: "", parentview: this, mode: "create",
            titre: "Ajouter un nouvel article", type: "commande"
        });
    },
    
    onRechClick: function () {
        const val = Ext.getCmp('rechercherDetail');
        Me_Window.focusContext = { row: 0 };
        Ext.getCmp('gridpanelSuggestionID').getStore().load({
            params: {
                orderId: orderIdRef,
                query: val.getValue()
            }
        });
    },

    getSuggestionAmount: function (id, callback) {
        if (!id) {
            if (callback) callback();
            return;
        }
        Ext.Ajax.request({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/suggestion/amount/' + id,
            success: function (response) {
                const data = Ext.JSON.decode(response.responseText, true);
                if (data && data.montantAchat !== undefined) {
                    Me_Window.updateAmountFields(data);
                }
                if (callback) callback();
            },
            failure: function() {
                console.error("Impossible de récupérer les montants de la suggestion : " + id);
                if (callback) callback();
            }
        });
    },
    
    manageColor: function (r) {
        const produitStates = r?.data?.produitState;
        if (!produitStates) return '';
        const enSuggestion = produitStates.enSuggestion;
        const enCommande = produitStates.enCommande;
        const entree = produitStates.entree;
        if (enSuggestion !== undefined && enSuggestion > 1) {
            return 'background-color:#73C774;';
        }
        if (enCommande !== undefined && enCommande > 0) {
            return 'background-color:#5fa2dd;';
        }
        if (entree !== undefined && entree > 0) {
            return 'background-color:#ffc107;';
        }
        return '';
    },
    
    columnRenderer: function (v, m, r) {
        const st = Me_Window.manageColor(r);
        m.style = st;
        return v;
    },
    
    numberColumnRenderer: function (v, m, r) {
        const st = Me_Window.manageColor(r);
        m.style = st;
        return amountformat(v);
    }
});