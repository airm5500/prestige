var url_services_data_ayantdroit_list = '../webservices/configmanagement/ayantdroit/ws_data.jsp';
var url_services_transaction_ayantdroit = '../webservices/configmanagement/ayantdroit/ws_transaction.jsp?mode=';
var url_services_pdf_ayantdroit = '../webservices/configmanagement/ayantdroit/ws_generate_pdf.jsp';
// REST dedie a cet ecran (memes formats JSON que les JSP) : liste + create/update/toggle-statut
var url_rest_data_ayantdroit = '../api/v1/ayants-droits';
var url_services_rest_ayantdroit = '../api/v1/ayants-droits/';

var Oview;
var Omode;
var Me_Workflow;
var ref;


Ext.define('testextjs.view.configmanagement.ayantdroit.AyantDroitManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'ayantdroitmanager',
    id: 'ayantdroitmanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.AyantDroit',
        'testextjs.view.configmanagement.ayantdroit.action.add',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion des Ayants droits',
    closable: false,
    frame: true,
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function() {
        Oview = this.getParentview();
        Omode = this.getMode();
        Me_Workflow = this;


        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.AyantDroit',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_rest_data_ayantdroit,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });

        Ext.apply(this, {
            width: '98%',
            height: 580,
            store: store,
            id: 'ayantdroitgrid',
            columns: [{
                    header: 'lg_AYANTS_DROITS_ID',
                    dataIndex: 'lg_AYANTS_DROITS_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                {
                    header: 'Assures',
                    dataIndex: 'lg_CLIENT_ID',
                    flex: 2
                },
                {
                    header: 'Code.Interne',
                    dataIndex: 'str_CODE_INTERNE',
                    flex: 0.7
                }, {
                    header: 'Matricule',
                    dataIndex: 'str_NUMERO_SECURITE_SOCIAL',
                    flex: 1
                },
                {
                    header: 'Nom',
                    dataIndex: 'str_FIRST_NAME',
                    flex: 1
                },
                {
                    header: 'Prenoms',
                    dataIndex: 'str_LAST_NAME',
                    flex: 1
                },
                {
                    header: 'Date de Naissance',
                    dataIndex: 'dt_NAISSANCE',
                    flex: 1
                },
                {
                    header: 'Genre',
                    dataIndex: 'str_SEXE',
//                    hidden: true,
                    flex: 0.5
                },
                {
                    header: 'Cat.Ayant.Droit',
                    dataIndex: 'lg_CATEGORIE_AYANTDROIT_ID',
                    flex: 1
                },
                {
                    header: 'Risque',
                    dataIndex: 'lg_RISQUE_ID',
                    flex: 1
                },
                {
                    header: 'Ville',
                    dataIndex: 'lg_VILLE_ID',
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: this.onEditClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            // La suppression definitive est remplacee par la desactivation
                            // (reversible via le bouton 'Desactives' de la barre d'outils)
                            icon: 'resources/images/icons/fam/disable.png',
                            tooltip: 'D&eacute;sactiver / R&eacute;activer cet ayant droit',
                            scope: this,
                            handler: this.onToggleStatutClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    hidden: true, // bouton 'Supprimer' masque a la demande (fonction conservee)
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Supprimer',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Creer',
                    scope: this,
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher_ayantdroit',
                    name: 'user',
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
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }, '-', {
                    text: 'Imprimer',
                    id: 'P_BT_PRINT',
                    iconCls: 'printable',
                    handler: this.onPrintClick
                }, '->', {
                    text: 'D&eacute;sactiv&eacute;s',
                    id: 'BT_AYANTDROIT_VOIR_DESACTIVES',
                    enableToggle: true,
                    hidden: true, // visible uniquement pour les profils administrateurs (voir est-admin)
                    icon: 'resources/images/icons/fam/disable.png',
                    tooltip: 'Afficher les ayants droits d&eacute;sactiv&eacute;s (pour les r&eacute;activer)',
                    scope: this,
                    toggleHandler: function (btn, pressed) {
                        var store = this.getStore();
                        store.getProxy().setExtraParam('actifs', !pressed);
                        store.loadPage(1);
                    }
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });

        if (Omode === "detail") {
            // Filtre par client via extraParam (sans plus corrompre l'URL globale partagee)
            store.getProxy().setExtraParam('lgCLIENTID', this.getOdatasource().lg_CLIENT_ID);
            lgCLIENTID = this.getOdatasource().lg_CLIENT_ID;
        }

        // Le bouton 'Desactives' n'est propose qu'aux profils administrateurs
        Ext.Ajax.request({
            url: '../api/v1/roles/est-admin',
            method: 'GET',
            success: function (response) {
                var object = Ext.JSON.decode(response.responseText, true);
                var bouton = Ext.getCmp('BT_AYANTDROIT_VOIR_DESACTIVES');
                if (object && object.authorize === true && bouton) {
                    bouton.show();
                }
            }
        });

        this.on('edit', function(editor, e) {



            Ext.Ajax.request({
                url: url_services_rest_ayantdroit + 'update',
                method: 'POST',
                params: {
                    lg_AYANTS_DROITS_ID: e.record.data.lg_AYANTS_DROITS_ID,
                    str_CODE_INTERNE: e.record.data.str_CODE_INTERNE,
                    str_FIRST_NAME: e.record.data.str_FIRST_NAME,
                    str_LAST_NAME: e.record.data.str_LAST_NAME,
                    dt_NAISSANCE: e.record.data.dt_NAISSANCE,
                    str_SEXE: e.record.data.str_SEXE,
                    lg_VILLE_ID: e.record.data.lg_VILLE_ID,
                    lg_CLIENT_ID: e.record.data.lg_CLIENT_ID,
                    lg_CATEGORIE_AYANTDROIT_ID: e.record.data.lg_CATEGORIE_AYANTDROIT_ID,
                    lg_RISQUE_ID: e.record.data.lg_RISQUE_ID

                },
                success: function(response)
                {
                    console.log(response.responseText);
                    e.record.commit();
                    store.reload();
                },
                failure: function(response)
                {
                    console.log("Bug " + response.responseText);
                    alert(response.responseText);
                }
            });
        });

    },
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
    },
    onAddClick: function() {

        new testextjs.view.configmanagement.ayantdroit.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Ayant Droit",
            type: "ayantdroitclient"
        });
    },
   onPrintClick: function() {      
        var linkUrl = url_services_pdf_ayantdroit + '?search_value=' + Ext.getCmp('rechecher_ayantdroit').getValue();
        testextjs.app.getController('App').onGeneratePdfFile(linkUrl);
    },
    onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function(btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_ayantdroit + 'delete',
                            params: {
                                lg_AYANTS_DROITS_ID: rec.get('lg_AYANTS_DROITS_ID')
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
                                }

                            },
                            failure: function(response)
                            {
testextjs.app.getController('App').StopWaitingProcess();
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
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.ayantdroit.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            type: "ayantdroitclient",
            titre: "Modification Ayant Droit  [" + rec.get('str_LAST_NAME') + "]"
        });
    },
    onRechClick: function() {
        // extraParam persistant : la recherche est conservee quand on change de page
        var val = Ext.getCmp('rechecher_ayantdroit');
        var store = this.getStore();
        store.getProxy().setExtraParam('search_value', val.getValue());
        store.loadPage(1);
    },
    onToggleStatutClick: function (grid, rowIndex) {
        // En vue normale on desactive ; en vue 'Desactives' on reactive
        var enDesactives = Ext.getCmp('BT_AYANTDROIT_VOIR_DESACTIVES')
                && Ext.getCmp('BT_AYANTDROIT_VOIR_DESACTIVES').pressed;
        var actif = enDesactives ? true : false;
        var rec = grid.getStore().getAt(rowIndex);
        Ext.MessageBox.confirm('Message',
                (actif ? 'R&eacute;activer' : 'D&eacute;sactiver') + " l'ayant droit <br><b>"
                + rec.get('str_FIRST_NAME') + ' ' + rec.get('str_LAST_NAME') + '</b> ?',
                function (btn) {
                    if (btn === 'yes') {
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_rest_ayantdroit + 'toggle-statut',
                            method: 'POST',
                            params: {
                                lg_AYANTS_DROITS_ID: rec.get('lg_AYANTS_DROITS_ID'),
                                actif: actif
                            },
                            success: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                Ext.MessageBox.alert('Confirmation', object.errors);
                                grid.getStore().reload();
                            },
                            failure: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                    }
                });
    }

});