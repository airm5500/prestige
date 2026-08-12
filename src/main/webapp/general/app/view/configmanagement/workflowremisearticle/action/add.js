var url_services_data_workflowremisearticle = '../webservices/configmanagement/workflowremisearticle/ws_data.jsp';
var url_services_data_grilleremise = '../webservices/configmanagement/grilleremise/ws_data.jsp';
//var url_services_data_typereglement = "../webservices/sm_user/typereglement/ws_data.jsp";
var url_services_transaction_workflowremisearticle = '../webservices/configmanagement/workflowremisearticle/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;
Ext.define('testextjs.view.configmanagement.workflowremisearticle.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addworkflowremisearticle',
    id: 'addworkflowremisearticleID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.Workflowremisearticle',
        'testextjs.model.GrilleRemise'

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

        var storegrilleremise = new Ext.data.Store({
            model: 'testextjs.model.GrilleRemise',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_grilleremise,
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
                    title: 'Information Workflowremisearticle',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        // str_DESCRIPTION
                        {
                            name: 'str_DESCRIPTION',
                            id: 'str_DESCRIPTION',
                            fieldLabel: 'Description',
                            emptyText: 'Description',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_CODE_REMISE_ARTICLE                       
                        {
                            name: 'str_CODE_REMISE_ARTICLE',
                            id: 'str_CODE_REMISE_ARTICLE',
                            fieldLabel: 'Code Remise',
                            emptyText: 'Code Remise',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_CODE_GRILLE_VO
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Grille Remise VO',
                            name: 'str_CODE_GRILLE',
                            id: 'str_CODE_GRILLE_VO',
                            store: storegrilleremise,
                            valueField: 'str_CODE_GRILLE',
                            displayField: 'str_CODE_GRILLE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir une grille remise...'
                        },
                        // str_CODE_GRILLE_VO
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Grille Remise VNO',
                            name: 'str_CODE_GRILLE',
                            id: 'str_CODE_GRILLE_VNO',
                            store: storegrilleremise,
                            valueField: 'str_CODE_GRILLE',
                            displayField: 'str_CODE_GRILLE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir une grille remise...'
                        }
                    ]
                }]
        });
        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_WORKFLOW_REMISE_ARTICLE_ID;
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('str_CODE_REMISE_ARTICLE').setValue(this.getOdatasource().str_CODE_REMISE_ARTICLE);
            Ext.getCmp('str_CODE_GRILLE_VO').setValue(this.getOdatasource().str_CODE_GRILLE_VO);
            Ext.getCmp('str_CODE_GRILLE_VNO').setValue(this.getOdatasource().str_CODE_GRILLE_VNO);

        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 600,
            height: 500,
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
            internal_url = url_services_transaction_workflowremisearticle + 'create';
        } else {
            internal_url = url_services_transaction_workflowremisearticle + 'update&lg_WORKFLOW_REMISE_ARTICLE_ID=' + ref;
        }

        // alert(" code remise  "+Ext.getCmp('str_CODE_REMISE_ARTICLE').getValue());//

        alert("str_CODE_GRILLE_VO   " + Ext.getCmp('str_CODE_GRILLE_VO').getValue());
        alert("str_CODE_GRILLE_VNO   " + Ext.getCmp('str_CODE_GRILLE_VNO').getValue());

        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                str_CODE_REMISE_ARTICLE: Ext.getCmp('str_CODE_REMISE_ARTICLE').getValue(),
                str_CODE_GRILLE_VO: Ext.getCmp('str_CODE_GRILLE_VO').getValue(),
                str_CODE_GRILLE_VNO: Ext.getCmp('str_CODE_GRILLE_VNO').getValue()

            },
            success: function (response)
            {
                //alert("succes");
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    if (internal_url === url_services_transaction_workflowremisearticle + 'create') {
                        Ext.MessageBox.alert('Creation work flow remis earticle', 'creation effectuee avec succes');

                    } else {
                        Ext.MessageBox.alert('Modification work flow remise article', 'modification effectuee avec succes');

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