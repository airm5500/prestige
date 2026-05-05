/* global Ext */


var Me;
var val;
var listOrderSelected;
var listGrossisteSelected;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.order.OrderManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'i_order_manager',

    frame: true,
    animCollapse: false,
    title: 'Liste des commandes en cours ',
    plain: true,
    maximizable: true,
    closable: false,
    requires: ['testextjs.view.commandemanagement.bonlivraison.ImportXLS'],

    initComponent: function () {

        Me = this;
        listOrderSelected = [];
        listGrossisteSelected = [];
        let itemsPerPage = 18;
        const store_order = new Ext.data.Store({
            model: 'testextjs.model.Order',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/commande/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 180000
            }

        });

        Ext.apply(this, {
            width: '98%',
            height: valheight,
            store: store_order,
            id: 'OderGrid',
            columns: [
                {
                    header: 'lg_ORDER_ID',
                    dataIndex: 'lg_ORDER_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },

                {
                    header: '',
                    dataIndex: 'lg_GROSSISTE_ID',
                    flex: 1,
                    hidden: true
                },
                {
                    header: 'Ref.',
                    dataIndex: 'str_REF_ORDER',
                    flex: 1
                },
                {
                    header: 'Grossiste',
                    dataIndex: 'str_GROSSISTE_LIBELLE',
                    flex: 1,
                    renderer: function (value) {
                        return '<div style="font-weight: bold; color: purple;">' + value + '</div>';
                    }
                },

                {
                    header: 'Nbre.Ligne',
                    dataIndex: 'int_LINE',
                    align: 'right',
                    flex: 0.5,
                    renderer: function (value) {
                        return '<div style="font-weight: bold; color: green;">' + value + '</div>';
                    }
                },

                {
                    header: 'Nbre.Produits',
                    dataIndex: 'int_NBRE_PRODUIT',
                    align: 'right',
                    flex: 0.5
                },
                {
                    header: 'P.ACHAT',
                    dataIndex: 'PRIX_ACHAT_TOTAL',
                    renderer: amountformat,
                    align: 'right',
                    flex: 0.5,
                     renderer: function (value) {
                         return '<span style="color:blue; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';            
                    }
                },
                {
                    header: 'P.VENTE',
                    dataIndex: 'PRIX_VENTE_TOTAL',
                    align: 'right',
                    flex: 0.5,
                     renderer: function (value) {
                         return '<span style="color:red; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';            
                    }
                },
                {
                    header: 'Op&eacute;rateur',
                    dataIndex: 'lg_USER_ID',
                    align: 'center',
                    flex: 1
                },
                {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 0.7,
                     renderer: function (value) {
                         return '<span style="color:green; font-weight:bold; font-size:1em;">' +value+'</span>';            
                    }
                }, {
                    header: 'Heure',
                    dataIndex: 'dt_UPDATED',
                    flex: 0.5,
                     renderer: function (value) {
                         return '<span style="color:green; font-weight:bold; font-size:1em;">' +value+ '</span>';            
                    }
                },
                {
                    text: '',
                    width: 30,
                    dataIndex: 'isChecked',
                    xtype: 'checkcolumn',
                    listeners: {
                        checkChange: this.onCheckChange
                    }

                },
                {
                    xtype: 'actioncolumn',
                    flex: 2,
                    sortable: false,
                    menuDisabled: true,
                    items: [

                        {
                            icon: 'resources/images/icons/order_tracking.png',
                            tooltip: 'ENVOI PAR PHARMAML',
                            scope: this,
                            hidden: true,
                            handler: this.envoiPharmaML
                        }, '-',

                        {
                            icon: 'resources/images/icons/fam/folder_go.png',
                            tooltip: 'Créer le bon de livraisson',
                            scope: this,
                            handler: this.onCreateBLClick
                        }, '-',
                        {
                            icon: 'resources/images/icons/fam/printer.png',
                            tooltip: 'Imprimer',
                            scope: this,
                            handler: this.onbtnprint
                        }, '-',
                        {
                            icon: 'resources/images/icons/fam/upload_icone.png',
                            tooltip: 'Importer la reponse du grossiste',
                            scope: this,
                            handler: this.onEditOrderByImportClick
                        }, '-',
                        {
                            icon: 'resources/images/icons/fam/excel_csv.png',
                            tooltip: 'Generer le fichier CSV de la commande',
                            scope: this,
                            handler: this.onbtnexport
                        }, '-',
                        {
                            //icon: 'resources/images/icons/fam/exceller.png',
                            tooltip: 'Exporter la commande en Excel (détails produits)',
                            scope: this,
                            handler: this.onbtnExportExcel,
                            iconCls: 'export_excel_icon'
                        },'-',
                        {
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: this.onManageDetailsClick
                        }, '-',
                        {
                            icon: 'resources/images/icons/fam/delete.gif',
                            tooltip: 'Supprimer',
                            scope: this,
                            handler: this.onRemoveClick
                        }
                         

                    ]
                }

            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'NOUVELLE COMMANDE',
                    scope: this,
                    iconCls: 'addicon',
                    cls: 'btn-primaryb',
                    handler: this.onAddClick
                }, '-',
                {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'suggestion',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();

                                }
                            });
                        }
                    }
                },
                {
                    text: 'RECHERCHER',
                    tooltip: 'rechercher',
                    scope: this,
                    iconCls: 'searchicon',
                    handler: this.onRechClick
                }, '-',
                {
                    text: 'IMPORTER UNE NOUVELLE COMMANDE',
                    tooltip: 'Importer une nouvelle commande',
                    scope: this,
                    iconCls: 'importicon',
                    cls: 'btn-primary',
                    handler: function () {
                        new testextjs.view.commandemanagement.bonlivraison.ImportXLS();
                    }
                }, '-',
                {
                    text: 'VERIFICATION DU FICHIER IMPORTE',
                    tooltip: 'Vérification du fichier importé',
                    iconCls: 'importicon',
                    scope: this,
                    menu: [
                        {
                            text: 'V&eacute;rifier le fichier FACTURE 1',
                            iconCls: 'printable',
                            handler: function () {
                                new testextjs.view.commandemanagement.order.action.importOrder({
                                    odatasource: 'TABLE_ORDER',
                                    parentview: this,
                                    mode: "checkimportfile",
                                    titre: "V&eacute;rifier les lignes du fichier qui ne sont pas import&eacute;es",
                                    type: 'format1'
                                });
                            }
                        },
                        {
                            text: 'V&eacute;rifier le fichier FACTURE 2',
                            iconCls: 'importicon',
                            handler: function () {
                                new testextjs.view.commandemanagement.order.action.importOrder({
                                    odatasource: 'TABLE_ORDER',
                                    parentview: this,
                                    mode: "checkimportfile",
                                    titre: "V&eacute;rifier les lignes du fichier qui ne sont pas import&eacute;es",
                                    type: 'format2'
                                });
                            }
                        }
                    ]
                },

                {
                    text: 'FUSIONNER DES COMMANDES',
                    iconCls: 'fusionicon',
                    scope: this,
                    handler: this.funsionCommande
                },

                '-', {
                    text: 'Verifier l\'importation',
                    tooltip: 'Verifier l\'importation',
                    id: 'btn_checkimport',
                    iconCls: 'check_icon',
                    scope: this,
                    hidden: true,
                    handler: this.onbtncheckimport
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: itemsPerPage,
                store: store_order,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager()
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });


    },
    loadStore: function () {
        this.getStore().load();
    },

    onbtncheckimport: function () {
        new testextjs.view.commandemanagement.order.action.importOrder({
            odatasource: 'TABLE_ORDER',
            parentview: this,
            mode: "checkimportfile",
            titre: "Verification de l'importation des differents articles de l'officine"
        });
    },

    onEditOrderByImportClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.commandemanagement.order.action.importOrder({
            odatasource: rec.data,
            parentview: this,
            mode: "importfileUpdate",
            titre: "Importation de la commande  [" + rec.get('str_REF_ORDER') + "]"
        });
    },
    onManageDetailsClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        const xtype = "ordermanagerlist";

        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Modifier les informations de la commande", rec.get('lg_ORDER_ID'), rec.data);
    },
    onbtnprint: function (grid, rowIndex) {

        const rec = grid.getStore().getAt(rowIndex);

        Ext.MessageBox.confirm('Message',
                'Imprimer la commande en cours?',
                function (btn) {
                    if (btn === 'yes') {
                        Me.onPdfClick(rec);

                    }
                });

    },
    onPdfClick: function (rec) {

        const linkUrl = '../EditionCommandeServlet?orderId=' + rec.get('lg_ORDER_ID') + '&refCommande=' + rec.get('str_REF_ORDER');

        window.open(linkUrl);

    },
    onAddClick: function () {
        const xtype = "ordermanagerlist";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Ajouter les articles a une commande", "0", "is_Process");
    },

    envoiPharmaML: function (grid, rowIndex) {
        const record = grid.getStore().getAt(rowIndex);
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'PUT',
            timeout: 240000,
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/pharma/' + record.get('lg_ORDER_ID'),
            success: function (response, options) {


                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {

                    let message = result.nbreproduit + '/' + result.totalProduit + ' produit pris en compte ';
                    if (result.nbrerupture > 0) {
                        message += ' ' + result.nbrerupture + ' produit(s) en rupture';
                    }
                    Ext.MessageBox.show({
                        title: 'Message',
                        width: 320,
                        msg: message,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR

                    });
                    grid.getStore().reload();

                } else {
                    progress.hide();
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: "ERROR",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR

                    });
                }

            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'Erreur du serveur ' + response.status);
            }

        });
    },

    onbtnexport: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Voulez-vous generer le fichier CSV de la commande?',
                function (btn) {
                    if (btn === 'yes') {
                        const rec = grid.getStore().getAt(rowIndex);
                        window.location = '../api/v1/commande/export-csv?id=' + rec.get('lg_ORDER_ID');

                    }
                });
    },
    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        const rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            method: 'DELETE',
                            timeout: 240000,
                            url: '../api/v1/commande/order/' + rec.get('lg_ORDER_ID'),

                            success: function (response) {

                                testextjs.app.getController('App').StopWaitingProcess();

                                Ext.MessageBox.alert('Confirmation', 'Opération terminée');
                                grid.getStore().reload();

                            },
                            failure: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });

                    }
                });

    },
    onRechClick: function () {
        this.getStore().load({
            params: {
                query: Ext.getCmp('rechecher').value
            }
        });

    },
    onCheckChange: function (column, rowIndex, checked, eOpts) {
        Array.prototype.unset = function (val) {
            let index = this.indexOf(val);
            if (index > -1) {
                this.splice(index, 1);
            }
        };
        const store = Ext.getCmp('OderGrid').getStore();
        const rec = store.getAt(rowIndex);

        if (checked === true) {
            if (listOrderSelected.length === 0) {
                listOrderSelected.push(rec.get('lg_ORDER_ID'));
                listGrossisteSelected.push(rec.get('lg_GROSSISTE_ID'));
            } else {
                if (listGrossisteSelected.indexOf(rec.get('lg_GROSSISTE_ID')) < 0) {
                    Ext.MessageBox.alert('Avertissement', "Veuillez s&eacute;lectionner une commande du m&ecirc;me grossiste");
                    rec.set('isChecked', false);
                } else {
                    listOrderSelected.push(rec.get('lg_ORDER_ID'));
                    listGrossisteSelected.push(rec.get('lg_GROSSISTE_ID'));
                }

            }
        } else {
            listOrderSelected.unset(rec.get('lg_ORDER_ID'));
            listGrossisteSelected.unset(rec.get('lg_GROSSISTE_ID'));

        }

    },
    funsionCommande: function () {
        if (listOrderSelected.length >= 2) {
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/commande/merge-order',
                timeout: 2400000,
                params: Ext.JSON.encode({

                    orderId: listOrderSelected
                }),
                success: function (response) {
                    testextjs.app.getController('App').StopWaitingProcess();
                    Ext.MessageBox.alert('Info', "Fusion effectu&eacute;e avec succ&egrave;s");
                    listGrossisteSelected = [];
                    listOrderSelected = [];
                    Ext.getCmp('OderGrid').getStore().load();

                },
                failure: function (response) {
                    testextjs.app.getController('App').StopWaitingProcess();
                    listGrossisteSelected = [];
                    listOrderSelected = [];
                    Ext.MessageBox.alert('Error Message', "La fusion a &eacute;chou&eacute;e ");
                    Ext.getCmp('OderGrid').getStore().load();
                }

            });
        } else {
            Ext.MessageBox.alert('Avertissement', "Veuillez s&eacute;lectionner au moins deux commandes du m&ecirc;me grossiste");
        }

    },
    onCreateBLClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.commandemanagement.cmde_passees.action.add({
            idOrder: rec.get('lg_ORDER_ID'),
            odatasource: rec.get('str_REF_ORDER'),
            montantachat: rec.get('PRIX_ACHAT_TOTAL'),
            parentview: this,
            mode: "create",
            titre: "Creation bon de livraison"
        });
    },
    
    onbtnExportExcel: function (grid, rowIndex) {
    Ext.MessageBox.confirm(
        'Export Excel',
        'Voulez-vous générer le fichier Excel (détail des produits) de la commande ?',
        function (btn) {
            if (btn === 'yes') {
                const rec = grid.getStore().getAt(rowIndex);
                window.location =
                    '../api/v1/commande/export-excel-details?id=' + rec.get('lg_ORDER_ID');
            }
        }
    );
}

});