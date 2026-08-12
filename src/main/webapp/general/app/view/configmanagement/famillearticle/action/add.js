var url_services_data_famillearticle = '../webservices/configmanagement/famillearticle/ws_data.jsp';
var url_services_data_groupefamille = '../webservices/configmanagement/groupefamille/ws_data.jsp';
var url_services_transaction_famillearticle = '../webservices/configmanagement/famillearticle/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;
Ext.define('testextjs.view.configmanagement.famillearticle.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addfamillearticle',
    id: 'addfamillearticleID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.FamilleArticle',
        'testextjs.model.GroupeFamille'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '', 
        titre: ''
    },
    initComponent: function () {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        var itemsPerPage = 20;

        var storegroupefamille = new Ext.data.Store({
            model: 'testextjs.model.GroupeFamille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_groupefamille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 160,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information Famille',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        // str_CODE_FAMILLE
                        {
                            name: 'str_CODE_FAMILLE',
                            id: 'str_CODE_FAMILLE',
                            fieldLabel: 'Code Famille',
                            emptyText: 'Code Famille',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            allowBlank: false
                        },
                        // str_LIBELLE
                        {
                            name: 'str_LIBELLE',
                            id: 'str_LIBELLE',
                            fieldLabel: 'Libelle',
                            emptyText: 'Libelle',
                            flex: 1,                            
                            allowBlank: false
                        },
                        // str_COMMENTAIRE                       
                        {
                            name: 'str_COMMENTAIRE',
                            id: 'str_COMMENTAIRE',
                            fieldLabel: 'Commentaires',
                            emptyText: 'Commentaires',
                            flex: 1,
                            //allowBlank: false
                        },
                        // lg_GROUPE_FAMILLE_ID
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Groupe Famille',
                            name: 'lg_GROUPE_FAMILLE_ID',
                            id: 'lg_GROUPE_FAMILLE_ID',
                            store: storegroupefamille,
                            valueField: 'lg_GROUPE_FAMILLE_ID',
                            displayField: 'str_LIBELLE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un groupe famille...'

                        }
                    ]
                }]
        });
        //Initialisation des valeur
 

        if (Omode === "update") {

            ref = this.getOdatasource().lg_FAMILLEARTICLE_ID;
            Ext.getCmp('str_LIBELLE').setValue(this.getOdatasource().str_LIBELLE);
            Ext.getCmp('str_CODE_FAMILLE').setValue(this.getOdatasource().str_CODE_FAMILLE);
            Ext.getCmp('str_COMMENTAIRE').setValue(this.getOdatasource().str_COMMENTAIRE);
            Ext.getCmp('lg_GROUPE_FAMILLE_ID').setValue(this.getOdatasource().lg_GROUPE_FAMILLE_ID);
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 300,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });
    },
    onbtnsave: function () {

        var internal_url = "";
        if (Omode === "create") {
            internal_url = url_services_transaction_famillearticle + 'create';
        } else {
            internal_url = url_services_transaction_famillearticle + 'update&lg_FAMILLEARTICLE_ID=' + ref;
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_LIBELLE: Ext.getCmp('str_LIBELLE').getValue(),
                str_CODE_FAMILLE: Ext.getCmp('str_CODE_FAMILLE').getValue(),
                str_COMMENTAIRE: Ext.getCmp('str_COMMENTAIRE').getValue(),
                lg_GROUPE_FAMILLE_ID: Ext.getCmp('lg_GROUPE_FAMILLE_ID').getValue()

            },
            success: function (response)
            {
                //alert("succes");
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }else {
                    if(internal_url === url_services_transaction_famillearticle + 'create'){
                        Ext.MessageBox.alert('Creation de famille article', 'creation effectuee avec succes');
                        
                    }else{
                        Ext.MessageBox.alert('Modification de famille article', 'modification effectuee avec succes');
                       
                    }                                     
                }
                Oview.getStore().reload();
            },
            failure: function (response)
            {
                //alert("echec");
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
        this.up('window').close();
    }
});