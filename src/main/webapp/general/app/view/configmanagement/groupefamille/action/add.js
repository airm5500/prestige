var url_services_data_groupefamille = '../webservices/configmanagement/groupefamille/ws_data.jsp';
var url_services_transaction_groupefamille = '../webservices/configmanagement/groupefamille/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.groupefamille.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addgroupefamille',
    id: 'addgroupefamilleID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window'

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

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 140,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information Groupe Famille',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Code groupe Famille',
                            emptyText: 'Code groupe famille',
                            name: 'str_CODE_GROUPE_FAMILLE',
                            id: 'str_CODE_GROUPE_FAMILLE',
                            maskRe: /[0-9.]/,
                            allowBlank: false
                        },
                        {
                            fieldLabel: 'Libelle',
                            emptyText: 'Libelle du groupe de famille',
                            name: 'str_LIBELLE',
                            id: 'str_LIBELLE',
                           // maskRe: /[0-9.]/,
                            allowBlank: false
                        }, {
                            fieldLabel: 'Commentaire',
                            emptyText: 'Commentaire',
                            name: 'str_COMMENTAIRE',
                            id: 'str_COMMENTAIRE'
                        }

                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_GROUPE_FAMILLE_ID;

            Ext.getCmp('str_CODE_GROUPE_FAMILLE').setValue(this.getOdatasource().str_CODE_GROUPE_FAMILLE);
            Ext.getCmp('str_LIBELLE').setValue(this.getOdatasource().str_LIBELLE);
            Ext.getCmp('str_COMMENTAIRE').setValue(this.getOdatasource().str_COMMENTAIRE);

        }

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 200,
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


        //  alert(Ext.getCmp('str_LAST_NAME').getValue());

        var internal_url = "";


        if (Omode === "create") {
            //alert("create");
            internal_url = url_services_transaction_groupefamille + 'create';

        } else {
            //alert("update");
            internal_url = url_services_transaction_groupefamille + 'update&lg_GROUPE_FAMILLE_ID=' + ref;
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_LIBELLE: Ext.getCmp('str_LIBELLE').getValue(),
                str_COMMENTAIRE: Ext.getCmp('str_COMMENTAIRE').getValue(),
                str_CODE_GROUPE_FAMILLE: Ext.getCmp('str_CODE_GROUPE_FAMILLE').getValue()
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }else {
                    if(internal_url === url_services_transaction_groupefamille + 'create'){
                        Ext.MessageBox.alert('Creation de groupe famille article', 'creation effectuee avec succes');
                        
                    }else{
                        Ext.MessageBox.alert('Modification de groupe famille article', 'modification effectuee avec succes');
                       
                    }                                     
                }
                Oview.getStore().reload();

            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

        this.up('window').close();
    }
});