/* global Ext */

var url_services_transaction_order = '../webservices/commandemanagement/order/ws_transaction.jsp?mode=';
var url_services_pdf_bonlivraison = '../webservices/commandemanagement/bonlivraison/ws_generate_pdf.jsp';
var url_services_pdf_fiche_etiquette = '../webservices/commandemanagement/bonlivraison/ws_generate_etiquette_pdf.jsp';
var Me_Workflow;
var Omode;
var lg_BON_LIVRAISON_ID_2, str_REF_LIVRAISON;
var ref;
var famille_id_search;
var in_total_vente;
var int_total_formated;
var str_TYPE_TRANSACTION;
var DISPLAYFILTER;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.bonlivraison.action.add', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel', 'Ext.grid.*', 'Ext.form.*', 'Ext.layout.container.Column',
        'testextjs.model.Famille', 'testextjs.model.Grossiste', 'testextjs.model.BonLivraisonDetail',
        'testextjs.view.commandemanagement.bonlivraison.BonLivraisonManager'
    ],
    config: {
        odatasource: '', parentview: '', mode: '', titre: '', plain: true,
        maximizable: true, closable: false, nameintern: '', checkLot: false, gestionLot: false
    },
    xtype: 'bonlivraisondetail',
    id: 'bonlivraisondetailID',
    frame: true,
    title: 'Details du bon de livraison',
    bodyPadding: 5,
    layout: 'column',

    initComponent: function () {
        Me_Workflow = this;
        var itemsPerPageGrid = 10;
        famille_id_search = "";
        in_total_vente = 0;
        int_total_formated = 0;
        str_TYPE_TRANSACTION = "ALL";
        DISPLAYFILTER = this.getOdatasource().DISPLAYFILTER;
        str_REF_LIVRAISON = this.getOdatasource().str_REF_LIVRAISON;
        ref = this.getNameintern();
        lg_BON_LIVRAISON_ID_2 = this.getNameintern();

        var store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [
                {str_TYPE_TRANSACTION: 'PRIX', str_desc: 'PRIX DE VENTE BL DIFFERENT DU PRIX EN MACHINE'},
                {str_TYPE_TRANSACTION: 'QTEZERO', str_desc: 'QUANTITE RECU EGAL A ZERO'},
                {str_TYPE_TRANSACTION: 'ALL', str_desc: 'Tous'}
            ]
        });

        var store_datecontrol = new Ext.data.Store({
            fields: ['name', 'value'],
            data: [{name: true, value: 'Produits avec contrôl de date de péremption'}, {name: false, value: 'Tous'}]
        });

        const store_details_livraison = new Ext.data.Store({
            model: 'testextjs.model.BonLivraisonDetail',
            pageSize: itemsPerPageGrid,
            autoLoad: false,
            remoteSort: true,
            sorters: [{property: 'lg_FAMILLE_NAME', direction: 'ASC'}],
            proxy: {
                type: 'ajax',
                url: '../api/v1/commande/bon/items/' + this.getNameintern(),
                reader: {type: 'json', root: 'data', totalProperty: 'total'},
                timeout: 240000,
                simpleSortMode: true
                        // sortParam / directionParam si ton backend attend d'autres noms
            },
            listeners: {
                beforeload: function (st, op) {
                    op.params = op.params || {};
                    op.params.sort = 'lg_FAMILLE_NAME';
                    op.params.dir = 'ASC';
                }
            }
        });

        Ext.apply(this, {
            width: '98%',
            cls: 'screen-wrap',
            fieldDefaults: {labelAlign: 'left', labelWidth: 150, anchor: '100%', msgTarget: 'side'},
            layout: {type: 'vbox', align: 'stretch', padding: 10},
            defaults: {flex: 1},
            id: 'panelID',
            items: [
                {
                    xtype: 'fieldset',
                    title: '<span class="ig-title">Infos Générales</span>',
                    collapsible: true,
                    border: false,
                    frame: false,
                    cls: 'ig-card ig-simple',
                    layout: 'column', // ← 3 colonnes ExtJS
                    defaults: {
                        xtype: 'container',
                        layout: {type: 'vbox', align: 'stretch'},
                        defaults: {xtype: 'component', cls: 'ig-row'},
                        padding: '0 16 0 0'
                    },
                    items: [
                        {
                            columnWidth: 1 / 3,
                            items: [
                                {html: '<span class="ig-label">Répartiteur</span> <span id="ig_repartiteur" class="ig-value"></span>'},
                                {html: '<span class="ig-label">Numéro BL</span> <span id="ig_bl" class="ig-value"></span>'},
                                {html: '<span class="ig-label">Date</span> <span id="ig_date" class="ig-value"></span>'}
                            ]
                        },
                        {
                            columnWidth: 1 / 3,
                            items: [
                                {html: '<span class="ig-label">Montant HT</span> <span id="ig_mht" class="ig-value"></span>'},
                                {html: '<span class="ig-label">TVA</span> <span id="ig_tva" class="ig-value"></span>'},
                                {html: '<span class="ig-label">Montant TTC</span> <span id="ig_ttc" class="ig-value"></span>'}
                            ]
                        },
                        {
                            columnWidth: 1 / 3,
                            layout: {type: 'anchor'},
                            items: [
                                {html: '<span class="ig-label">Commencer l\'impression à partir de:</span>'},
                                {
                                    xtype: 'numberfield',
                                    anchor: '100%',
                                    cls: 'ig-number',
                                    name: 'int_NUMBER_ETIQUETTE',
                                    id: 'int_NUMBER_ETIQUETTE',
                                    minValue: 1, maxValue: 65, value: 1
                                }
                            ]
                        }
                    ]
                }
                ,
                {
                    xtype: 'fieldset',
                    title: '<span class="ig-title">Detail(s) de la Commande</span>',
                    collapsible: true,
                    cls: 'dg-card',
                    layout: 'anchor',
                    defaults: {anchor: '100%'},
                    items: [
                        {
                            xtype: 'gridpanel',
                            id: 'gridpanelID',
                            cls: 'my-grid-header',
                            store: store_details_livraison,
                            height: 370,
                            columns: [
                                {text: 'Details Suggestion Id', flex: 1, sortable: true, hidden: true, dataIndex: 'lg_BON_LIVRAISON_DETAIL', id: 'lg_BON_LIVRAISON_DETAIL'},
                                {text: 'Famille', flex: 1, sortable: true, hidden: true, dataIndex: 'lg_FAMILLE_ID'},
                                {xtype: 'rownumberer', text: '#', hidden: false, width: 40, sortable: true},
                                {text: 'CIP', flex: 1, sortable: true, dataIndex: 'lg_FAMILLE_CIP'},
                                {text: 'LIBELLE', flex: 2, sortable: true, dataIndex: 'lg_FAMILLE_NAME'},
                                {text: 'PMP', flex: 1, sortable: true, renderer: amountformat, align: 'right', dataIndex: 'dbl_PRIX_MOYEN_PONDERE'},
                                {text: 'PRIX.ACHAT', flex: 1, sortable: true, renderer: amountformat, align: 'right', dataIndex: 'int_PAF'},
                                {text: 'PRIX.VENTE', flex: 1, sortable: true, renderer: amountformat, align: 'right', dataIndex: 'int_PRIX_VENTE'},
                                {header: 'Q.CDE', dataIndex: 'int_QTE_CMDE', align: 'center', flex: 1},
                                {header: 'Q.RECUE', dataIndex: 'int_QTE_RECUE', align: 'center', flex: 1,
                                    renderer: function (value, metadata, record) {
                                        if (record.get('int_QTE_CMDE') > record.get('int_QTE_RECUE')) {
                                            value = '<span style="color:red; font-weight: bold;">' + value + '</span>';
                                        }
                                        return value;
                                    }
                                },
                                {header: 'UG', dataIndex: 'lg_FAMILLE_PRIX_ACHAT', align: 'right', flex: 1},
                                {header: 'RELICAT', dataIndex: 'int_QTE_MANQUANT', flex: 1,
                                    renderer: function (val) {
                                        if (val < 0) {
                                            val = '<span style="color:red; font-weight: bold;">' + val + '</span>';
                                        }
                                        return val;
                                    }
                                },
                                {
                                    header: 'LOTS',
                                    dataIndex: 'lots',
                                    align: 'center',
                                    flex: 1
                                },
                                {
                                    header: 'DATE DE PEREMPTION',
                                    dataIndex: 'datePeremption',
                                    align: 'center',
                                    flex: 1
                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/page_white_edit.png',
                                            tooltip: 'Modifier Article',
                                            scope: this,
                                            handler: this.managePrice
                                        }]
                                },
                                {xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/add.png',
                                            tooltip: 'Ajout de lot',
                                            scope: this,
                                            handler: this.onAddProductClick/*,
                                             getClass: function (value, metadata, record) {
                                             if (record.get('checkExpirationdate')) {  
                                             return 'x-display-hide'; 
                                             } else {
                                             return 'x-hide-display'; 
                                             }
                                             }*/
                                        }]
                                },
                                {xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/delete.png', tooltip: 'Suppression de lot', scope: this, handler: this.onRemoveLotClick,
                                            getClass: function (v, m, r) {
                                                return (r.get('freeQty') > 0 || r.get('hasLots')) ? 'x-display-hide' : 'x-hide-display';
                                            }
                                        }]
                                }
                            ],
                            tbar: [
                                {xtype: 'textfield', cls: 'glass-input', id: 'rechercherDetail', name: 'rechercherDetail', emptyText: 'Recherche', flex: 1,
                                    listeners: {render: function (cmp) {
                                            cmp.getEl().on('keypress', function (e) {
                                                if (e.getKey() === e.ENTER) {
                                                    Me_Workflow.onRechClick();
                                                }
                                            });
                                        }}
                                }, '-',
                                {xtype: 'combobox', cls: 'glass-input', name: 'str_TYPE_TRANSACTION', margins: '0 0 0 10', id: 'str_TYPE_TRANSACTION',
                                    store: store_type, valueField: 'str_TYPE_TRANSACTION', displayField: 'str_desc',
                                    typeAhead: true, queryMode: 'local', emptyText: 'Filtre article...', width: 260, cls: 'no-border-field',
                                    listeners: {select: function (cmp) {
                                            str_TYPE_TRANSACTION = cmp.getValue();
                                            Me_Workflow.onRechClick();
                                        }}
                                }, '-',
                                {xtype: 'combobox', cls: 'glass-input', margins: '0 0 0 10', store: store_datecontrol,
                                    valueField: 'name', displayField: 'value', typeAhead: true, queryMode: 'local',
                                    hidden: DISPLAYFILTER, width: 260, emptyText: 'Filtre par...',
                                    listeners: {select: function (cmp) {
                                            const value = cmp.getValue();
                                            const store = Ext.getCmp('gridpanelID').getStore();
                                            store.load({params: {checkDatePeremption: value}});
                                        }}
                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPageGrid,
                                store: store_details_livraison,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            }
                        }
                    ]
                },

                /* ====== TOOLBAR BAS ====== */
                {
                    xtype: 'toolbar',
                    ui: 'footer',
                    dock: 'bottom',
                    border: '0',
                    items: ['->',
                        {text: 'Retour', id: 'btn_cancel', cls: 'btn-secondary', iconCls: 'icon-clear-group', scope: this, handler: this.onbtncancel},
                        {text: 'ENTREE EN STOCK', id: 'btn_enterstock', cls: 'btn-primary', iconCls: 'icon-clear-group', scope: this, handler: this.onbtnenterstock}
                    ]
                }
            ]
        });

        this.callParent();

        // Chargement grid
        // this.on('afterlayout', this.loadStore, this, {delay: 1, single: true});

        // Remplir les valeurs du header “Infos Générales” (labels/valeurs)
        this.on('afterlayout', function () {
            this.loadStore();
            const ds = this.getOdatasource() || {};
            const set = function (id, val) {
                const el = Ext.fly(id);
                if (el) {
                    el.setHTML(Ext.htmlEncode(val == null ? '' : String(val)));
                }
            };
            set('ig_repartiteur', ds.str_GROSSISTE_LIBELLE);
            set('ig_bl', ds.str_REF_LIVRAISON);
            set('ig_date', ds.dt_DATE_LIVRAISON);
            set('ig_mht', Ext.util.Format.number(ds.int_MHT || 0, '0,000.'));
            set('ig_tva', Ext.util.Format.number(ds.int_TVA || 0, '0,000.'));
            set('ig_ttc', Ext.util.Format.number(ds.int_HTTC || 0, '0,000.'));
            this.checkParamGestionLot();
        }, this, {single: true, delay: 50});
    },

    loadStore: function () {
        Ext.getCmp('gridpanelID').getStore().load({callback: this.onStoreLoad});
    },
    onStoreLoad: function () {},

    managePrice: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.commandemanagement.bonlivraison.action.editprice({
            odatasource: rec.data, parentview: this, mode: "editprice",
            titre: "Modification Article [" + rec.get('lg_FAMILLE_NAME') + "]"
        });
    },

    onAddProductClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        Ext.getCmp('btn_enterstock').enable();
        new testextjs.view.stockmanagement.etatstock.action.add({
            odatasource: rec.data, parentview: this, mode: "create", index: rowIndex,
            titre: "Ajout d'article [" + rec.get('lg_FAMILLE_NAME') + "]",
            reference: rec.get('str_REF_LIVRAISON'),
            directImport: Me_Workflow.getOdatasource().directImport,
            gestionLot: Me_Workflow.getGestionLot(),

        });
    },

    onRemoveLotClick: function (grid, rowIndex) {
        const me = this;
        const rec = grid.getStore().getAt(rowIndex);

        if (!me.getGestionLot()) {
            Ext.MessageBox.confirm('Message', 'Voullez-vous supprimer la quantité ajoutée ?', function (btn) {
                if (btn == 'yes') {
                    Ext.Ajax.request({
                        method: 'PUT',
                        url: '../api/v1/commande/remove-lots',
                        headers: {'Content-Type': 'application/json'},
                        params: Ext.JSON.encode({
                            removeLot: false,
                            idProduit: rec.get('lg_FAMILLE_ID'),
                            refBon: rec.get('str_REF_LIVRAISON'),
                            idBonDetail: rec.get('lg_BON_LIVRAISON_DETAIL')
                        }),
                        success: function () {
                            grid.getStore().reload();
                        },
                        failure: function (response) {
                            console.log("Bug " + response.responseText);
                            Ext.MessageBox.alert('Error Message', response.responseText);
                        }
                    });
                }
            });
        } else {
            new testextjs.view.stockmanagement.etatstock.action.removeLot({
                odatasource: rec.data, parentview: this, mode: "remove",
                titre: "Suppresion de lot de l'article [" + rec.get('lg_FAMILLE_NAME') + "]", reference: ''
            });
        }
    },
    onbtncancel: function () {
        testextjs.app.getController('App').onLoadNewComponentWithDataSource("bonlivraisonmanager", "", "", "");
    },

    onbtnenterstock: function () {
        doEntreeStock(lg_BON_LIVRAISON_ID_2);
    },

    onRechClick: function () {
        const val = Ext.getCmp('rechercherDetail');
        Ext.getCmp('gridpanelID').getStore().load({
            params: {query: val.getValue(), filtre: str_TYPE_TRANSACTION}
        });
    },
    checkParamGestionLot: function () {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/app-params/check/KEY_ACTIVATE_PEREMPTION_DATE',
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.gestionLot = result.data;
                }
            }

        });
    }
});

function onPdfBLClick(url) {
    window.open(url);
}

function doEntreeStock(lg_BON_LIVRAISON_ID) {
    if (parseInt(Ext.getCmp('int_NUMBER_ETIQUETTE').getValue()) > 65 || parseInt(Ext.getCmp('int_NUMBER_ETIQUETTE').getValue()) < 1) {
        Ext.MessageBox.show({
            title: 'Avertissement', width: 320,
            msg: 'Veuillez renseigner un nombre inférieur ou égal à 65 et supérieur à 0',
            buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING,
            fn: function (buttonId) {
                if (buttonId === "ok") {
                    Ext.getCmp('int_NUMBER_ETIQUETTE').focus(false, 100, function () {
                        this.setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                    });
                }
            }
        });
        return;
    }

    Ext.Msg.show({
        title: 'Message',
        msg: "Confirmer l'entrée en stock",
        buttons: Ext.Msg.YESNO,
        icon: Ext.Msg.QUESTION,
        cls: 'custom-messagebox',
        fn: function (btn) {
            if (btn === 'yes') {
                testextjs.app.getController('App').ShowWaitingProcess();
                Ext.Ajax.request({
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    url: '../api/v1/commande/validerbl/' + lg_BON_LIVRAISON_ID,
                    timeout: 1800000,
                    success: function (response) {
                        testextjs.app.getController('App').StopWaitingProcess();
                        var object = Ext.JSON.decode(response.responseText, false);
                        if (!object.success) {
                            Ext.Msg.show({
                                title: "Message d'erreur",
                                msg: object.msg,
                                buttons: Ext.Msg.OK,
                                icon: Ext.Msg.WARNING,
                                cls: 'custom-messagebox'
                            });
                        } else {
                            Ext.Msg.show({
                                title: 'Message',
                                msg: "Confirmation de l'impression des entrées réapprovisionnements",
                                buttons: Ext.Msg.YESNO,
                                icon: Ext.Msg.QUESTION,
                                cls: 'custom-messagebox',
                                fn: function (btn) {
                                    if (btn === 'yes') {
                                        onPdfBLClick(url_services_pdf_bonlivraison + '?lg_BON_LIVRAISON_ID=' + lg_BON_LIVRAISON_ID);
                                        Ext.Msg.show({
                                            title: 'Message',
                                            msg: "Voulez-vous aussi imprimer les étiquettes ?",
                                            buttons: Ext.Msg.YESNO,
                                            icon: Ext.Msg.QUESTION,
                                            cls: 'custom-messagebox',
                                            fn: function (btn) {
                                                if (btn === 'yes') {
                                                    // onPdfBLClick('../Etiquete?lg_BON_LIVRAISON_ID=' + lg_BON_LIVRAISON_ID + "&int_NUMBER=" + Ext.getCmp('int_NUMBER_ETIQUETTE').getValue());
                                                    const linkUrl = url_services_pdf_fiche_etiquette + '?lg_BON_LIVRAISON_ID=' + lg_BON_LIVRAISON_ID + "&int_NUMBER=" + Ext.getCmp('int_NUMBER_ETIQUETTE').getValue();
                                                    onPdfBLClick(linkUrl);
                                                    testextjs.app.getController('App').onLoadNewComponentWithDataSource("bonlivraisonmanager", "", "", "");
                                                } else {
                                                    testextjs.app.getController('App').onLoadNewComponentWithDataSource("bonlivraisonmanager", "", "", "");
                                                }
                                            }
                                        });
                                    } else {
                                        testextjs.app.getController('App').onLoadNewComponent("bonlivraisonmanager", "Bon de livraison", "");
                                    }
                                }
                            });
                        }
                    },
                    failure: function (response) {
                        testextjs.app.getController('App').StopWaitingProcess();
                        Ext.Msg.show({
                            title: 'Erreur',
                            msg: response.responseText,
                            buttons: Ext.Msg.OK,
                            icon: Ext.Msg.ERROR,
                            cls: 'custom-messagebox'
                        });
                    }
                });
            } else {
                testextjs.app.getController('App').onLoadNewComponent("bonlivraisonmanager", "Bon de livraison", "");
            }
        }
    });

}
