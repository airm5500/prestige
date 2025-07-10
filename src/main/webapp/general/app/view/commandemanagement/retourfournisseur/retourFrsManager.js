/* global Ext */

var url_services_data_retourfournisseur_list = '../webservices/commandemanagement/retourfournisseur/ws_data.jsp';
var url_services_transaction_retourfournisseur = '../webservices/commandemanagement/retourfournisseur/ws_transaction.jsp?mode=';
var url_services_data_grossiste = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_pdf_retourfournisseur = '../webservices/commandemanagement/retourfournisseur/ws_generate_pdf.jsp';
var url_services_data_famille_select_dovente = '../webservices/sm_user/famille/ws_data_jdbc.jsp';
var Me;
var valdatedebut = "";
var valdatefin = "";
//var store_retourfournisseur;
//var val;
var LaborexWorkFlow;
var store_famille_dovente = null;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.retourfournisseur.retourFrsManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'retourfrsmanager',
    id: 'retourfrsmanagerID',
    frame: true,
//    collapsible: true,
    animCollapse: false,
    title: 'Liste des retours fournisseurs',
//    iconCls: 'icon-grid',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    plugins: [{
            ptype: 'rowexpander',
            rowBodyTpl: new Ext.XTemplate(
                    '<p> {str_FAMILLE_ITEM}</p>',
                    {
                        formatChange: function (v) {
                            var color = v >= 0 ? 'green' : 'red';
                            return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
                        }
                    })
        }],
    initComponent: function () {

        url_services_data_retourfournisseur_list = '../webservices/commandemanagement/retourfournisseur/ws_data.jsp';

        Me = this;

        var itemsPerPage = 20;
        var store_grossiste = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                  url: '../api/v1/grossiste/all',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_retourfournisseur = new Ext.data.Store({
            model: 'testextjs.model.RetourFournisseur',
            pageSize: 9999,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/retours-data',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 180000
            }

        });

        Ext.apply(this, {
//            width: 1200,
            width: '98%',
            height: 580,
            store: store_retourfournisseur,
            columns: [
                {
                    header: 'lg_RETOUR_FRS_ID',
                    dataIndex: 'lg_RETOUR_FRS_ID',
                    hidden: true,
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                },
                {
                    xtype: 'rownumberer',
                    text: 'LG',
                    width: 45,
                    sortable: true/*,
                     locked: true*/
                },
                // str_REF
                {
                    header: 'Ref. Retour',
                    dataIndex: 'str_REF_RETOUR_FRS',
                    flex: 1
                },
                {
                    header: 'Grossiste',
                    dataIndex: 'str_GROSSISTE_LIBELLE',
                    flex: 1
                },
                {
                    header: 'N° BL',
                    dataIndex: 'str_REF_LIVRAISON',
                    flex: 1
                },
                {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 1
                },
                {
                    header: 'Date d\'Entr&eacute;e',
                    dataIndex: 'DATEBL',
                    flex: 1
                },
                // int_LINE
                {
                    header: 'Montant',
                    dataIndex: 'MONTANTRETOUR',
                    align: 'right',
                    renderer: amountformat,
                    flex: 1
                },
                {
                    header: 'Reponse',
                    dataIndex: 'str_REPONSE_FRS',
                    flex: 1
                },
                {
                    header: 'Commentaire',
                    dataIndex: 'str_COMMENTAIRE',
                    flex: 1
                },
                {
                    header: 'Opearateur',
                    dataIndex: 'lg_USER_ID',
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    hidden: true,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/folder_go.png',
                            tooltip: 'Commander',
                            scope: this,
                            handler: this.onPasseRetourFournisseurClick,
                            getClass: function (value, metadata, record) {
                                if (record.get('str_STATUT') == "enable") {  //read your condition from the record
                                    return 'x-display-hide'; //affiche l'icone
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 130,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: this.onManageDetailsClick,
                            getClass: function (value, metadata, record) {
                                if (record.get('str_STATUT') == "is_Process") {  //read your condition from the record
                                    return 'x-display-hide'; //affiche l'icone
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }, '-',
                        {
                            icon: 'resources/images/icons/fam/response-16.png',
                            tooltip: 'Repondre',
                            scope: this,
                            handler: this.Response,
                            getClass: function (value, metadata, record) {
                                if (!record.get('closed')) {  //read your condition from the record
                                    return 'x-display-hide'; //affiche l'icone
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }, '-', {

                            scope: this,

                            getClass: function (value, metadata, record) {

                                if (record.get('BTNDELETE')) {
                                    return 'unpaid';
                                } else {
                                    return 'lock';
                                }
                            }, getTip: function (v, meta, rec) {

                                if (rec.get('BTNDELETE')) {
                                    return 'Supprimer';
                                } else
                                {
                                    // return ' ';
                                }
                            },
                            handler: this.onRemoveClick
                        }, '-',
                        {
                            icon: 'resources/images/icons/fam/printer.png',
                            tooltip: 'Imprimer le retour',
                            scope: this,
                            handler: this.onPrintClick,
                            getClass: function (value, metadata, record) {
                                if (record.get('str_STATUT') === "enable") {  //read your condition from the record
                                    if (record.get('BTNDELETE'))
                                        return 'x-display-hide';
                                    else
                                        return 'lock';
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }




                    ]
                }

            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'NOUVEAU RETOUR',
                    scope: this,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'combobox',
                    name: 'lg_GROSSISTE_ID',
                    margins: '0 0 0 10',
                    id: 'lg_GROSSISTE_ID',
                    store: store_grossiste,
                    //disabled: true,
                    valueField: 'lg_GROSSISTE_ID',
                    displayField: 'str_LIBELLE',
                    typeAhead: true,
                    queryMode: 'remote',
                    minChars: 2,
                    flex: 1,
                    emptyText: 'Sectionner grossiste...',
                    listeners: {
                        select: function (cmp) {
                            Me.onRechClick();
                        }
                    }

                },
                      {
                            xtype: 'combo',
                            emptyText: 'Filtre',
                            labelWidth: 1,
                            flex: 1,
                            editable: false,
                            id: 'filtre',
                            valueField: 'ID',
                            displayField: 'VALUE',
                            value: 'ALL',
                            store: Ext.create("Ext.data.Store", {
                                fields: ["ID", "VALUE"],

                                data: [{'ID': "NOT", "VALUE": "SANS REPONSE"},
                                    {'ID': "WITH", "VALUE": "AVEC REPONSE"},
                                
                                    {'ID': "ALL", "VALUE": "Tous"}

                                ]
                            })
                        },
                
                
                {
                    xtype: 'datefield',
                    id: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    value: new Date(),
                    flex: 0.7,
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                           
                            valdatedebut = me.getSubmitValue();
                        }
                    }
                }, '-', {
                    xtype: 'datefield',
                    id: 'datefin',
                    emptyText: 'Date fin',
                    maxValue: new Date(),
                    value: new Date(),
                    flex: 0.7,
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                          
                            valdatefin = me.getSubmitValue();
                        }
                    }
                }, '-',
                {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'suggestion',
                    emptyText: 'Rech',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();

                                }
                            });
                        }
                    }
                }, '',
                {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                }, '',
                {
                    text: 'Imprimer',
                    iconCls: 'printable',
                    tooltip: 'imprimer',
                    scope: this,
                    handler: this.printLitToPDF
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 9999,
                store: store_retourfournisseur,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager(),
                listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            dtStart: null,
                            query: null,
                            dtEnd: null,
                            fourId: null,
                            filtre:null
                        };

                        var query = Ext.getCmp('rechecher').getValue();
                           var filtre = Ext.getCmp('filtre').getValue();
                        var dtStart = Ext.getCmp('datedebut').getSubmitValue();
                        var dtEnd = Ext.getCmp('datefin').getSubmitValue();
                        var fourId = Ext.getCmp('lg_GROSSISTE_ID').getValue();
                        myProxy.setExtraParam('dtStart', dtStart);
                        myProxy.setExtraParam('dtEnd', dtEnd);
                        myProxy.setExtraParam('fourId', fourId);
                        myProxy.setExtraParam('query', query);
                         myProxy.setExtraParam('filtre', filtre);

                    }

                }
            }
        });

        this.callParent();

    },

    onManageDetailsClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "retourfournisseurmanagerlist";
 
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Modification fiche retour fournisseur", rec.get('lg_RETOUR_FRS_ID'), rec.data);
        //alert("test"+rec.get('lg_RETOUR_FRS_ID'));
    },
    onAddClick: function () {
        var xtype = "retourfournisseurmanagerlist";
    
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Ajouter detail retour fournisseur", "0");

    },
    onPrintClick: function (grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_retourfournisseur + '?lg_RETOUR_FRS_ID=' + rec.get('lg_RETOUR_FRS_ID');
        window.open(linkUrl);
//        testextjs.app.getController('App').onLunchPrinter(linkUrl);
    },
    onPasseRetourFournisseurClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la transformation en commande',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_retourfournisseur + 'passeretourfournisseur',
                            params: {
                                lg_RETOUR_FRS_ID: rec.get('lg_RETOUR_FRS_ID'),
                                str_STATUT: rec.get('str_STATUT')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
                                }

                            },
                            failure: function (response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                    }
                });


        //alert('Commande passee avec succes');



    },
    onRemoveClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        if (rec.get('BTNDELETE') === false) {
            return;
        }
        Ext.MessageBox.confirm('Message',
                'confirm la suppresssion',
                function (btn) {
                    if (btn === 'yes') {

                        Ext.Ajax.request({
                            url: url_services_transaction_retourfournisseur + 'delete',
                            params: {
                                lg_RETOUR_FRS_ID: rec.get('lg_RETOUR_FRS_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });

    },
    printLitToPDF: function () {

        var query = Ext.getCmp('rechecher').getValue();
        var dtStart = Ext.getCmp('datedebut').getSubmitValue();
        var dtEnd = Ext.getCmp('datefin').getSubmitValue();
        var fourId = Ext.getCmp('lg_GROSSISTE_ID').getValue();
           var filtre = Ext.getCmp('filtre').getValue();
        if(fourId===null || fourId===undefined ){
            fourId='';
        }
        if(filtre===null || filtre===undefined ){
            filtre='';
        }
        var linkUrl = '../DataReportingServlet?dtStart=' + dtStart + "&dtEnd=" + dtEnd + "&query=" + query + "&mode=RETOUR_FOURNISSEUR" + "&fourId=" + fourId+ "&filtre=" + filtre;

        window.open(linkUrl);
    },
    onRechClick: function () {

        if (new Date(valdatedebut) > new Date(valdatefin)) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }

        var val = Ext.getCmp('rechecher');
        var lg_GROSSISTE_ID = "";
        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() !== null) {
            lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
        }

        this.getStore().load({
            params: {
                query: val.value,
                fourId: lg_GROSSISTE_ID,
                filtre:Ext.getCmp('filtre').getValue(),
                dtEnd: Ext.getCmp('datefin').getSubmitValue(),
                dtStart: Ext.getCmp('datedebut').getSubmitValue()
            }
        });

    },
    Response: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        console.log(rec);
        var xtype = "reponseretourfournisseurmanager";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Prise en compte de la r&eacute;ponse du retour fournisseur " + rec.get('str_REF_RETOUR_FRS'), rec.get('lg_RETOUR_FRS_ID'), rec.data);

    }

});