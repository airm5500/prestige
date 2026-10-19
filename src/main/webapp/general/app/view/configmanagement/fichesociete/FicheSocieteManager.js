var url_services_data_fichesociete = '../webservices/configmanagement/fichesociete/ws_data.jsp';
var url_services_transaction_fichesociete = '../webservices/configmanagement/fichesociete/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.configmanagement.fichesociete.FicheSocieteManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'fichesocietemanager',
    id: 'fichesocietemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.FicheSociete',
        'testextjs.view.configmanagement.fichesociete.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion Fiche Societe',
    plain: true,
    maximizable: true,
    //tools: [{type: "pin"}],
    //closable: true,
    frame: true,
    initComponent: function () {

//url_services_data_fichesociete = '../webservices/configmanagement/fichesociete/ws_data.jsp';


        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.FicheSociete',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_fichesociete,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        

        Ext.apply(this, {
            width: '98%',
            height: 580,
            store: store,
            columns: [{
                    header: 'lg_FICHE_SOCIETE_ID',
                    dataIndex: 'lg_FICHE_SOCIETE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Code Interne',
                    dataIndex: 'str_CODE_INTERNE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Libelle Entreprise',
                    dataIndex: 'str_LIBELLE_ENTREPRISE',
                    flex: 1,
                   /* editor: {
                        allowBlank: false
                    }*/
                }, {
                    header: 'Code Facture',
                    dataIndex: 'str_CODE_FACTURE',
                    hidden: false,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                /*
                 {
                 header: 'Adresse Rue 2',
                 dataIndex: 'str_ADRESSE_RUE_2',
                 flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 }
                 /
                 , {
                 header: 'Code Postal',
                 dataIndex: 'str_CODE_POSTAL',
                 flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 },
                 {
                 header: 'Bureau Distributeur',
                 dataIndex: 'str_BUREAU_DISTRIBUTEUR',
                 hidden: false,
                 flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 
                 }, */
                {
                    header: 'Raison Sociale',
                    dataIndex: 'str_RAISON_SOCIALE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Adresse Principale',
                    dataIndex: 'str_ADRESSE_PRINCIPALE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                /*
                 {
                 header: 'Delai Reglement',
                 dataIndex: 'int_DELAI_REGLEMENT_AUTORISE',
                 hidden: false,
                 flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 
                 }, */
                 {
                 header: 'Chiffre Affaire',
                 dataIndex: 'dbl_CHIFFRE_AFFAIRE',
                 flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 },/* {
                 header: 'Type Reglement',
                 dataIndex: 'lg_TYPE_REGLEMENT_ID',
                 flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 
                 }, 
                 */
                {
                    header: 'Ville',
                    dataIndex: 'lg_VILLE_ID',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },{
                    header: 'Escompte Societe',
                    dataIndex: 'lg_ESCOMPTE_SOCIETE_ID',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },{
                    header: 'Code Bon Livraison',
                    dataIndex: 'str_CODE_BON_LIVRAISON',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
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
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.gif',
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
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'fichesociete',
                    emptyText: 'Rech'
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 10,
                store: store,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager()
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true 
        }),
                this.on('edit', function (editor, e) {

                    Ext.Ajax.request({
                        url: url_services_transaction_fichesociete + 'update',
                        params: {
                            lg_FICHE_SOCIETE_ID: e.record.data.lg_FICHE_SOCIETE_ID,
                            str_LIBELLE_ENTREPRISE: e.record.data.str_LIBELLE_ENTREPRISE,
                            str_CODE_INTERNE: e.record.data.str_CODE_INTERNE,
                            //str_TYPE_SOCIETE: e.record.data.str_TYPE_SOCIETE,                            
                            //str_CODE_REGROUPEMENT: e.record.data.str_CODE_REGROUPEMENT,
                            //str_CONTACTS_TELEPHONIQUES: e.record.data.str_CONTACTS_TELEPHONIQUES,
                            //str_COMPTE_COMPTABLE: e.record.data.str_COMPTE_COMPTABLE,                            
                            dbl_CHIFFRE_AFFAIRE: e.record.data.dbl_CHIFFRE_AFFAIRE,
                            //str_DOMICIALIATION_BANCAIRE: e.record.data.str_DOMICIALIATION_BANCAIRE,
                            //str_RIB_SOCIETE: e.record.data.str_RIB_SOCIETE,                            
                            str_CODE_EXONERATION_TVA: e.record.data.str_CODE_EXONERATION_TVA,
                            //bool_CLIENT_EN_COMPTE: e.record.data.bool_CLIENT_EN_COMPTE,
                            //bool_LIVRE: e.record.data.bool_LIVRE,
                            
                            //dbl_REMISE_SUPPLEMENTAIRE: e.record.data.dbl_REMISE_SUPPLEMENTAIRE,
                            //dbl_MONTANT_PORT: e.record.data.dbl_MONTANT_PORT,
                            //int_ECHEANCE_PAIEMENT: e.record.data.int_ECHEANCE_PAIEMENT,                            
                            //bool_EDIT_FACTION_FIN_VENTE: e.record.data.bool_EDIT_FACTION_FIN_VENTE,
                            str_CODE_FACTURE: e.record.data.str_CODE_FACTURE,
                            str_CODE_BON_LIVRAISON: e.record.data.str_CODE_BON_LIVRAISON,                            
                            str_RAISON_SOCIALE: e.record.data.str_RAISON_SOCIALE,
                            str_ADRESSE_PRINCIPALE: e.record.data.str_ADRESSE_PRINCIPALE,
                            str_AUTRE_ADRESSE: e.record.data.str_AUTRE_ADRESSE,                            
                            //str_CODE_POSTAL: e.record.data.str_CODE_POSTAL,
                            str_BUREAU_DISTRIBUTEUR: e.record.data.str_BUREAU_DISTRIBUTEUR,
                            
                            lg_ESCOMPTE_SOCIETE_ID: e.record.data.lg_ESCOMPTE_SOCIETE_ID,                            
                            lg_VILLE_ID: e.record.data.lg_VILLE_ID
                            
                        },
                        success: function (response)
                        {
                            console.log(response.responseText);
                            e.record.commit();
                            store.reload();
                        },
                        failure: function (response)
                        {
                            console.log("Bug " + response.responseText);
                            alert(response.responseText);
                        }
                    });
                });


    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    
    onAddClick: function () {

        new testextjs.view.configmanagement.fichesociete.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Fiche Societe"
        });
    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.fichesociete.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Fiche Societe  [" + rec.get('str_LIBELLE_ENTREPRISE') + "]"
        });

    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_fichesociete + 'delete',
                            params: {
                                lg_FICHE_SOCIETE_ID: rec.get('lg_FICHE_SOCIETE_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE_ENTREPRISE') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE_ENTREPRISE') + ']', 'Suppression effectuee avec succes');
//                                    

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
                    });


    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_fichesociete);
    }

});