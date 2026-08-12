/* global Ext */

var url_services_data_rupturefournisseur_list = '../webservices/commandemanagement/rupturefournisseur/ws_data.jsp';
var url_services_transaction_suggerercde = '../webservices/sm_user/suggerercde/ws_transaction.jsp?mode=';
var listProductSelected;
var checkedList;
var Me;
var store_grossiste;

var myAppController;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.rupturefournisseur.RuptureFournisseurManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'rupturefournisseurmanager',
    id: 'rupturefournisseurmanagerID',
    frame: true,
    collapsible: false,
    animCollapse: false,
    title: 'Liste des ruptures de stock',
    iconCls: 'icon-grid',
    initComponent: function () {
      
        url_services_data_rupturefournisseur_list = '../webservices/commandemanagement/rupturefournisseur/ws_data.jsp';
        url_services_pdf = '../webservices/commandemanagement/rupturefournisseur/ws_rp_EtatControle.jsp';
        myAppController = Ext.create('testextjs.controller.App', {});
        listProductSelected = [];
        checkedList = [];
        Me = this;

        var itemsPerPage = 20;
        store_grossiste = new Ext.data.Store({
            model: "testextjs.model.Grossiste",
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: "ajax",
                 url: '../api/v1/grossiste/all',
                reader: {
                    type: "json",
                    root: "results",
                    totalProperty: "total"
                }
            }

        });

        var store_rupturefournisseur = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_rupturefournisseur_list,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        Ext.apply(this, {
            width: '98%',
            height: valheight,
            store: store_rupturefournisseur,
            id: 'gridID',
            columns: [
                {
                    xtype: 'rownumberer',
                    text: 'LG',
                    width: 45,
                    hidden: true,
                    sortable: true
                },
                {
                    header: 'lg_FAMILLEARTICLE_ID',
                    dataIndex: 'lg_FAMILLEARTICLE_ID',
                    hidden: true,
                    flex: 2
                },
                {
                    header: 'CIP',
                    dataIndex: 'int_CIP',
                    flex: 0.7
                },
                {
                    header: 'Description',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 2
                },
                {
                    header: 'Quantit&eacute;',
                    dataIndex: 'int_NUMBER_AVAILABLE',
                    flex: 1
                }, {
                    header: 'Choix',
                    dataIndex: 'is_select',
                    xtype: 'checkcolumn',
                    flex: 0.5,
                    editor: {
                        xtype: 'checkcolumn',
                        flex: 0.5,
                    },
                    listeners: {
                        checkChange: this.onAllChecked
                    }
                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    xtype: 'textfield',
                    id: 'rechRuptureFourn',
                    name: 'suggestion',
//                    flex: 1,
                    emptyText: 'Recherche'
                },
                {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                },
                {
                    text: 'Suggerer',
                    tooltip: 'Suggerer',
                    scope: this,
                    handler: this.Response
                },
                {
//                    hidden: true,
                    xtype: 'checkbox',
                    margins: '0 0 5 5',
                    boxLabel: 'Tous S&eacute;lectionner',
                    id: 'selectALL',
                    checked: false,
                    listeners: {
                        change: function () {

                            //
                            var grid = Ext.getCmp('gridID');
                            var CODEstore = grid.getStore();
                            if (this.getValue()) {
                                if (listProductSelected.length > 0) {
                                    listProductSelected = [];
                                }
                                for (var i = 0; i < CODEstore.getCount(); i++) {
                                    var record = CODEstore.getAt(i);
                                    record.set('is_select', true);
                                }


                            } else {

                                CODEstore.each(function (rec, id) {
                                    rec.set('is_select', false);
                                });

                            }
                            CODEstore.commitChanges();
                            grid.reconfigure(CODEstore);

                        }
                    }
                }




            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: itemsPerPage,
                store: store_rupturefournisseur,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager()
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });
        var all = Ext.getCmp('selectALL');

        this.getStore().on({
            'load': {
                fn: function (store, records, success, eOpts) {

                    if (listProductSelected.length > 0) {
                        var record;
                        Ext.each(listProductSelected, function (lg, index) {
                            Ext.each(records, function (record, index, records) {
                                if (record.get('lg_FAMILLEARTICLE_ID') === lg) {
                                    record.set('is_select', 'true');
                                }
                            }, this);


                        });

                    }

                    if (all.getValue()) {
                        Ext.each(records, function (record, index, records) {

                            record.set('is_select', 'true');
                        }, this);
//                        




                        Ext.each(records, function (record, index, records) {
                            Ext.each(checkedList, function (lg, index) {

                                if (record.get('lg_FAMILLEARTICLE_ID') === lg) {
                                    record.set('is_select', 'false');
                                }

                            });

                            this.reconfigure(this.getStore());

                        }, this);
                        this.reconfigure(this.getStore());






                    }
                },
                scope: this
            }
        });



    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {


    },
    onPrintClick: function () {

        Ext.MessageBox.confirm('Message',
                'Imprimer l etat de controle des achats?',
                function (btn) {
                    if (btn === 'yes') {
                        Me.onPdfClick();
                        return;
                    }
                });



    },
    onRechClick: function () {
        var val = Ext.getCmp('rechRuptureFourn');

        this.getStore().load({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_rupturefournisseur_list);

    },
    onPdfClick: function () {
        var linkUrl = url_services_pdf;
        window.open(linkUrl);

    },
    onCheckChange: function (column, rowIndex, checked, eOpts) {

        // get index of column   
        var rec = Ext.getCmp('gridID').getStore().getAt(rowIndex); // on recupere la ligne courante de la grid

        if (checked === true) {
            listProductSelected.push(rec.get('lg_FAMILLEARTICLE_ID')); //on ajoute l'index de la ligne selectionnée au tableau
        } else {
            Array.prototype.unset = function (val) {
                var index = this.indexOf(val);
                if (index > -1) {
                    this.splice(index, 1)
                }
            };
            listProductSelected.unset(rec.get('lg_FAMILLEARTICLE_ID'));
        }
        rec.commit();


    },
    onSuggereClick: function () {
        var lstFinal = "";
        for (var i = 0; i < listProductSelected.length; i++) {
            lstFinal += listProductSelected[i] + ";";
        }
        lstFinal = lstFinal.substring(0, lstFinal.length - 1);

        Ext.Ajax.request({
            url: url_services_transaction_suggerercde + 'sendRuptureToSuggestion',
            params: {
                listProductSelected: lstFinal
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);

                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    Ext.MessageBox.alert('confirmation', object.errors);
                    var OGrid = Ext.getCmp('gridID');
                    OGrid.getStore().reload();
                }
            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    onAllChecked: function (column, rowIndex, checked, eOpts) {
        Array.prototype.unset = function (val) {
            var index = this.indexOf(val);
            if (index > -1) {
                this.splice(index, 1);
            }
        };
        var store = Ext.getCmp('gridID').getStore();
        var rec = store.getAt(rowIndex); // on recupere la ligne courante de la grid

        if (checked === true) {
            listProductSelected.push(rec.get('lg_FAMILLEARTICLE_ID')); //on ajoute l'index de la ligne selectionnée au tableau
            checkedList.unset(rec.get('lg_FAMILLEARTICLE_ID'));
        } else {
            var all = Ext.getCmp('selectALL');
            if (all.getValue()) {
                checkedList.push(rec.get('lg_FAMILLEARTICLE_ID'));
            }

            listProductSelected.unset(rec.get('lg_FAMILLEARTICLE_ID'));


        }
        //  alert(JSON.stringify(listProductSelected));

    },
    Response: function () {
        var status = 0;
        var all = Ext.getCmp('selectALL');
        if (listProductSelected.length > 0 || all.getValue()) {


            if (all.getValue()) {
                status = 1
            }
            ;

            var win = Ext.create("Ext.window.Window", {
                title: "Choisir un repartiteur",
                id: 'repartiteurwindow',
                width: 500,
                layout: {
                    type: 'fit'
                },
                height: 150,
                items: [{
                        xtype: 'form',
                        id: 'repartiteurform',
                        bodyPadding: 5,
                        modelValidation: true,
                        items: [
                            {
                                xtype: 'fieldset',
                                flex: 1,
                                title: 'Choisir un repartiteur',
                                layout: 'anchor',
                                defaults: {
                                    anchor: '100%',
                                    msgTarget: 'side',
                                    labelAlign: 'top',
                                    labelWidth: 130
                                },
                                items: [
                                    {
                                        xtype: 'combobox',
                                        name: 'lg_GROSSISTE_ID',
                                        flex: 3,//XCDFV
                                        store: store_grossiste,
                                        pageSize: 10,
                                        valueField: 'lg_GROSSISTE_ID',
                                        displayField: 'str_LIBELLE',
                                        minChars: 2,
                                        allowBlank: false,
                                        queryMode: 'remote',
                                        enableKeyEvents: true,
                                        emptyText: 'Selectionner un repartiteur',
                                        listConfig: {
                                            loadingText: 'Recherche...',
                                            emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                                            getInnerTpl: function () {
                                                return '<span>{str_LIBELLE}</span>';
                                            }

                                        },
                                        listeners: {
                                            specialKey: function (field, e) {

                                                if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                                    if (field.getValue().length <= 2) {
                                                        field.getStore().load();
                                                    }

                                                }

                                            }
                                        }
                                    }
                                ]}]

                    }]
                ,
                dockedItems: [
                    {
                        xtype: 'toolbar',
                        dock: 'bottom',
                        ui: 'footer',
                        layout: {
                            pack: 'end', //#22
                            type: 'hbox'
                        },
                        items: [
                            {
                                xtype: 'button',
                                text: 'Enregistrer',
                                listeners: {
                                    click: function () {
                                        var form = Ext.getCmp('repartiteurform');
                                        var rechRuptureFourn = Ext.getCmp('rechRuptureFourn').getValue();
                                        if (form && form.isValid()) {
                                            myAppController.ShowWaitingProcess();
                                            form.submit({
                                                clientValidation: true,
                                                url: '../webservices/sm_user/suggerercde/ws_transaction.jsp?mode=doSuggestion&checkedList=' + Ext.encode(checkedList) + '&listassuggerer=' + Ext.encode(listProductSelected) + '&search_value=' + rechRuptureFourn + '&ALL=' + status,
                                                scope: this,
                                                success: function (response) {
                                                    Ext.getCmp('gridID').getStore().load();
                                                    myAppController.StopWaitingProcess();
                                                    Ext.MessageBox.alert('confirmation', "op&eacute;ration &eacute;ffectu&eacute;e avec succ&egrave;s");
                                                    win.close();
                                                },
                                                failure: function (response) {

                                                    myAppController.StopWaitingProcess();

                                                    Ext.MessageBox.alert('confirmation', "op&eacute;ration &eacute;ffectu&eacute;e avec succ&egrave;s");
                                                    win.close();
                                                    Ext.getCmp('gridID').getStore().load();


                                                }
                                            });
                                        }
                                    }
                                }
                            },
                            {
                                xtype: 'button',
                                text: 'Annuler',
//                   
                                listeners: {
                                    click: function () {
                                        win.close();
                                    }

                                }
                            }
                        ]
                    }
                ]

            });
            win.show();
        } else {

            Ext.MessageBox.alert('Avertissement', 'Veuillez choisir au moins un repartiteur');

        }
    }
});