var url_services_transaction_retourfournisseur = '../webservices/commandemanagement/retourfournisseur/ws_transaction.jsp?mode=';

var Me;
var ref;

var LaborexWorkFlow;


Ext.define('testextjs.view.commandemanagement.retourfournisseur.action.reponseretourfournisseur', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.controller.LaborexWorkFlow',
        'testextjs.model.RetourFournisseurDetail'
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
    xtype: 'reponseretourfournisseurmanager',
    id: 'rreponseretourfournisseurmanagerID',
    frame: true,
    title: 'Prise en compte de la r&eacute;ponse du retour fournisseur',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function() {

        Me = this;
        var itemsPerPage = 20;

        ref = this.getNameintern();
        titre = this.getTitre();

        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});

        //url 
        var url_services_data_retourfournisseurdetails = '../webservices/commandemanagement/retourfournisseurdetail/ws_data.jsp?lg_RETOUR_FRS_ID=' + ref;
        //fin url

        //store
        var store = LaborexWorkFlow.BuildStore('testextjs.model.RetourFournisseurDetail', itemsPerPage, url_services_data_retourfournisseurdetails, true);
        //fin store

        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        Ext.apply(this, {
            width: '98%',
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 90,
                anchor: '100%',
                msgTarget: 'side'
            },
            layout: {
                type: 'vbox',
                align: 'stretch',
                padding: 10
            },
            defaults: {
                flex: 1
            },
            id: 'reponseRetourfournisseurID',
            items: [
                {
                    xtype: 'fieldset',
                    title: 'Infos Generales',
                    collapsible: true,
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'fieldcontainer',
                            layout: 'hbox',
                            combineErrors: true,
                            defaultType: 'displayfield',
                            items: [
                                {
                                    fieldLabel: 'Grossiste',
                                    flex: 1,
                                    id: 'str_GROSSISTE_REPONSERETOUR',
                                    fieldStyle: "color:blue;",
                                    margin: '0 5 0 5',
                                },
                                {
                                    fieldLabel: 'R&eacute;f&eacute;rence BL',
                                    id: 'str_REF_BL_REPONSERETOUR',
                                    fieldStyle: "color:blue;",
                                    flex: 1,
                                    margin: '0 5 0 5'
                                },
                                {
                                    fieldLabel: 'Montant Retour',
                                    id: 'dbl_AMOUNT_REPONSERETOUR',
                                    fieldStyle: "color:blue;",
                                    fieldWidth: 250,
                                    flex: 1,
                                    margin: '0 5 0 5'
                                }
                            ]
                        }]
                },
                {
                    xtype: 'fieldset',
                    title: 'Liste des produits',
                    collapsible: true,
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            id: 'gridpanelReponseretourID',
                            plugins: [this.cellEditing],
                            store: store,
                            height: 300,
                            columns: [
                                {
                                    xtype: 'rownumberer',
                                    text: 'LG',
                                    width: 45,
                                    sortable: true
                                },
                                {
                                    text: 'CIP',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_CIP'
                                },
                                {
                                    text: 'LEBELLE',
                                    flex: 2,
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_NAME'
                                },
                                {
                                    text: 'Stock pendant Ret',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_STOCK'
                                },
                                {
                                    text: 'QTE Retourn&eacute;e',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_NUMBER_RETURN'
                                },
                                {
                                    text: 'QTE Valid&eacute;',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_NUMBER_ANSWER',
                                    MaskRe: /[0-9.]/,
                                    minValue: 0,
                                    editor: {
                                        xtype: 'numberfield',
                                        allowBlank: true,
                                        minValue: 0,
                                        maskRe: /[0-9.]/,
                                        selectOnFocus: true,
                                        hideTrigger: true
                                    }
                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPage,
                                store: store,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            }/*,
                             listeners: {
                             scope: this,
                             //selectionchange: this.onSelectionChange
                             }*/
                        }]
                },
                {
                    xtype: 'toolbar',
                    ui: 'footer',
                    dock: 'bottom',
                    border: '0',
                    items: ['->',
                        {
                            text: 'Enregistrer',
                            id: 'btn_save_reponseretour',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            handler: this.onbtnvalider
                        },
                        {
                            text: 'Retour',
                            id: 'btn_cancel_reponseretour',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            handler: this.onbtncancel
                        }
                    ]
                }]
        });

        this.callParent();
        /*this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });*/

        Ext.getCmp('str_GROSSISTE_REPONSERETOUR').setValue(this.getOdatasource().str_GROSSISTE_LIBELLE);
        Ext.getCmp('str_REF_BL_REPONSERETOUR').setValue(this.getOdatasource().str_REF_LIVRAISON);
        Ext.getCmp('dbl_AMOUNT_REPONSERETOUR').setValue(Ext.util.Format.number(this.getOdatasource().MONTANTRETOUR, '0,000.') + "CFA");

        Ext.getCmp('gridpanelReponseretourID').on('validateedit', function(editor, e) {
            var plugin2 = Ext.getCmp('gridpanelReponseretourID').getPlugin();
            if (e.value <= e.record.data.int_NUMBER_RETURN) {
                Ext.Ajax.request({
                    url: url_services_transaction_retourfournisseur + 'updateanswer',
                    params: {
                        lg_RETOUR_FRS_DETAIL: e.record.data.lg_RETOUR_FRS_DETAIL,
                        int_NUMBER_RETURN: e.value
                    },
                    success: function(response)
                    {
                        var object = Ext.JSON.decode(response.responseText, false);
                        if (object.success == 0) {
                            Ext.MessageBox.alert('Error Message', object.errors);
                            return;
                        }
                        e.record.commit();
                    },
                    failure: function(response)
                    {
                        console.log("Bug " + response.responseText);
                        Ext.MessageBox.alert('Error Message', response.responseText);
                    }
                });
            } else {
                Ext.MessageBox.alert('Erreur', 'V&eacute;rifier la quantit&eacute; &agrave; en avoir',
                        function() {
                            e.record.data.int_NUMBER_ANSWER = e.record.data.int_NUMBER_ANSWER;
                            plugin2.startEdit(e.rowIdx, e.colIdx);
                        });
                return;
            }

        });
    },
    onbtncancel: function() {

        var xtype = "";
        xtype = "retourfrsmanager";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    onbtnvalider: function() {
        Ext.MessageBox.confirm('Confirmation',
                'Les quantit&eacute;s seront consid&eacute;es comme en Avoir',
                function(btn) {
                    if (btn == 'yes') {
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_retourfournisseur + 'Response',
                            params: {
                                lg_RETOUR_FRS_ID: ref,
                                str_REPONSE_FRS: "Prise en compte de la réponse du retour fournisseur liée au BL N° " + Ext.getCmp('str_REF_BL_REPONSERETOUR').getValue()

                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                Ext.MessageBox.alert('Confirmation', object.errors);
                                Me.onbtncancel();


                            },
                            failure: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });


                    }
                });

    }
});

