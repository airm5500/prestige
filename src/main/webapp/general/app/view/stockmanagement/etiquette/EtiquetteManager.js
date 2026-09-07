/*
 * Cet ecran passe par l'API REST. Les trois pages qu'il appelait - ws_data.jsp,
 * ws_data_type_etiquette.jsp et le mode delete de ws_transaction.jsp - restent en place, mais
 * verification faite, aucun autre ecran ne les appelait : elles ne servaient qu'ici.
 *
 * Le nom est prefixe et ne reprend PAS url_services_data_typeetiquette : quatre autres fichiers
 * declarent ce nom-la, en variable globale, pour une page differente. Le dernier charge l'emporte,
 * et l'ecran aurait fini par interroger le service de l'autre.
 */
var url_api_etiquette = '../api/v1/etiquette';
var url_services_pdf_etiquette = '../webservices/stockmanagement/etiquette/ws_generate_pdf.jsp';

var valdatedebut;
var valdatefin;
var store_;
var Me_Workflow;
var lg_TYPEETIQUETTE_ID = "";
Ext.define('testextjs.view.stockmanagement.etiquette.EtiquetteManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'etiquette',
    id: 'etiquetteID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion des etiquettes',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        Me_Workflow = this;
        valdatedebut = "";
        valdatefin = "";
        lg_TYPEETIQUETTE_ID = "";
        store_ = new Ext.data.Store({
            model: 'testextjs.model.Etiquette',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_api_etiquette,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_typeetiquette = new Ext.data.Store({
            model: 'testextjs.model.Typeetiquette',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_api_etiquette + '/types',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });


        Ext.apply(this, {
            width: '98%',
            height: valheight,
            plugins: [this.cellEditing],
            store: store_,
            id: 'GridetiquetteID',
            columns: [{
                    xtype: 'rownumberer',
                    text: 'Num.Ligne',
                    width: 45,
                    sortable: true/*,
                     locked: true*/
                }, {
                    header: 'lg_ETIQUETTE_ID',
                    dataIndex: 'lg_ETIQUETTE_ID',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'Code',
                    dataIndex: 'str_CODE',
                    hidden: true,
                    flex: 1
                },
                {
                    header: 'CIP',
                    dataIndex: 'int_CIP',
                    flex: 0.7
                },
                {
                    header: 'Designation',
                    dataIndex: 'lg_FAMILLE_ID',
                    flex: 1.5
                },
                {
                    header: 'Type etiquette',
                    dataIndex: 'lg_TYPEETIQUETTE_ID',
                    flex: 1
                }, {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 1
                },
//                {
//                    header: 'Num.Etiquette',
//                    dataIndex: 'int_NUMBER',
//                    flex: 1
//                }, 
                {
                    header: 'Quantite.Article/Lot',
                    dataIndex: 'int_NUMBER',
                    flex: 1
                },
                /*{
                 header: 'Quantite.Article/Lot',
                 dataIndex: 'int_QUANTITY',
                 flex: 1
                 },*/
                {
                    header: 'Etat',
                    dataIndex: 'str_STATUT',
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/printer.png',
                            tooltip: 'Editer une etiquette',
                            scope: this,
                            handler: this.onEditClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Supprimer une etiquette',
                            scope: this,
                            handler: this.onDeleteClick
                        }
                    ]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [{
                    text: 'Creer',
                    scope: this,
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'datefield',
                    id: 'datedebut',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    format: 'd/m/Y',
                    listeners: {
                        'change': function(me) {
                            /* Les criteres partent en parametres de la recherche (onRechClick) : les
                             * recopier dans l'URL du proxy les y laissait ensuite pour toujours, y compris
                             * sur les changements de page. */
                            valdatedebut = me.getSubmitValue();
                            Ext.getCmp('datefin').setMinValue(me.getValue());
                        }
                    }
                }, '-', {
                    xtype: 'datefield',
                    id: 'datefin',
                    name: 'datefin',
                    emptyText: 'Date fin',
                    maxValue: new Date(),
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function(me) {
                            valdatefin = me.getSubmitValue();
                            Ext.getCmp('datedebut').setMaxValue(me.getValue());
                        }
                    }
                }, '-', {
                    xtype: 'combobox',
                    name: 'lg_TYPEETIQUETTE_ID',
                    margins: '0 0 0 10',
                    id: 'lg_TYPEETIQUETTE_ID',
                    store: store_typeetiquette,
                    valueField: 'lg_TYPEETIQUETTE_ID',
                    displayField: 'str_DESCRIPTION',
                    typeAhead: true,
                    queryMode: 'remote',
                    flex: 1,
                    emptyText: 'Selectionner type etiquette...',
                    listeners: {
                        select: function(cmp) {
                            lg_TYPEETIQUETTE_ID = cmp.getValue();
                            Me_Workflow.onRechClick();
                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me_Workflow.onRechClick();
                                }
                            });
                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    iconCls: 'searchicon',
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store_, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();


        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        })


    },
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
   /* onAddClick: function() {

        new testextjs.view.stockmanagement.etiquette.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Creation d'etiquette"
        });
    },*/
    onAddClick: function() {
        var xtype = "doEtiquette";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Etiquettage massif", "0");
    },
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.stockmanagement.etiquette.action.printEtiquette({
            odatasource: rec.data,
            parentview: this,
            mode: "printer",
            titre: "Edition d'etiquette de [" + rec.get('lg_FAMILLE_ID') + "]"
        });


    },
    /*onEditClick: function (grid, rowIndex) {
     Ext.MessageBox.confirm('Message',
     'Confirmer l\'edition de cette etiquette',
     function (btn) {
     if (btn === 'yes') {
     var rec = grid.getStore().getAt(rowIndex);
     var lg_ETIQUETTE_ID = rec.get('lg_ETIQUETTE_ID');
     onPdfClickEtiquette(lg_ETIQUETTE_ID);
     return;
     }
     });
     
     
     },*/
    onDeleteClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppression de l\'etiquette',
                function(btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            /* L'adresse etait construite en collant 'delete' a un nom de fichier, sans le
                             * « ?mode= » attendu : elle designait ws_transaction.jspdelete, qui n'existe
                             * pas. La suppression rendait donc un 404 depuis toujours. */
                            url: url_api_etiquette + '/' + encodeURIComponent(rec.get('lg_ETIQUETTE_ID')),
                            method: 'DELETE',
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, true) || {};
                                if (!object.success) {
                                    Ext.MessageBox.alert('Error Message', object.msg || 'Suppression impossible');
                                    return;
                                }
                                Ext.MessageBox.alert('Confirmation', object.msg);
                                grid.getStore().reload();
                            },
                            failure: function(response)
                            {
                                // alert("non ok");
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
//    testaction: function (Ovalue) {
//        if (Ovalue == "0") {
//            return '';
//        } else if (Ovalue == "1") {
//            return 'x-hide-display';
//        }
//    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        if (new Date(valdatedebut) > new Date(valdatefin)) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }

        /* Les criteres sont poses sur le PROXY et non passes a ce seul chargement : sans cela, le
         * changement de page repartirait sans eux et rendrait la liste entiere. C'est ce que la
         * reecriture de l'URL cherchait a faire, en laissant les criteres colles a l'adresse. */
        this.getStore().getProxy().extraParams = {
            search_value: val.getValue(),
            datedebut: valdatedebut,
            datefin: valdatefin,
            lg_TYPEETIQUETTE_ID: lg_TYPEETIQUETTE_ID
        };
        /* Retour a la premiere page : sans cela, une recherche lancee depuis la page 4 demande la
         * page 4 du NOUVEAU resultat, souvent vide, et la liste parait vide a tort. */
        this.getStore().loadPage(1);
    }

});


/*function onPdfClickEtiquette(lg_ETIQUETTE_ID, begin) {
 var chaine = location.pathname;
 var reg = new RegExp("[/]+", "g");
 var tableau = chaine.split(reg);
 var sitename = tableau[1];
 var linkUrl = url_services_pdf_etiquette + '?lg_ETIQUETTE_ID=' + lg_ETIQUETTE_ID + "&begin="+begin;
 // alert("Ok ca marche " + linkUrl);
 window.open(linkUrl);
 
 }*/