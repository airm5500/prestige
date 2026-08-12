var url_services_data_codegestion = '../webservices/configmanagement/codegestion/ws_data.jsp';
var url_services_data_optimisationquantite = '../webservices/configmanagement/optimisationquantite/ws_data.jsp';
var url_services_transaction_codegestion = '../webservices/configmanagement/codegestion/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;
Ext.define('testextjs.view.configmanagement.codegestion.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addcodegestion',
    id: 'addcodegestionID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.OptimisationQuantite',
        'testextjs.model.CodeGestion'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        var itemsPerPage = 20;
        var storeoptimisationquantite = new Ext.data.Store({
            model: 'testextjs.model.OptimisationQuantite',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_optimisationquantite,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_seuil_optimisation_cmd = Ext.create('Ext.data.Store', {
            fields: ['display', 'value'],
            data: [{"display": "Oui", "value": "1"},
                {"display": "Non", "value": "0"}]
        });


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 200,
                msgTarget: 'side'
            },
            items: [
                {
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Information Code gestion',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            name: 'str_CODE_BAREME',
                            id: 'str_CODE_BAREME',
                            fieldLabel: 'Code bareme',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            allowBlank: false,
                            minValue: '001',
                            maxValue: '999'
                        },
                        {
                            fieldLabel: 'Nombre jours couverture stock',
                            name: 'int_JOURS_COUVERTURE_STOCK',
                            id: 'int_JOURS_COUVERTURE_STOCK',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            minValue: '01',
                            maxValue: '99',
                            allowBlank: false
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Nombre de mois historique de vente',
                            name: 'int_MOIS_HISTORIQUE_VENTE',
                            id: 'int_MOIS_HISTORIQUE_VENTE',
                            minValue: 1,
                            maxValue: 6,
                            maskRe: /[0-9.]/,
                            store: ['1', '2', '3', '4', '5', '6'],
                            valueField: 'int_MOIS_HISTORIQUE_VENTE',
                            displayField: 'int_MOIS_HISTORIQUE_VENTE',
//                            typeAhead: true,
                            editable: false,
                            queryMode: 'local',
                            emptyText: 'Choisir...'
                        },
                        {
                            fieldLabel: 'Date butoir article',
                            name: 'int_DATE_BUTOIR_ARTICLE',
                            id: 'int_DATE_BUTOIR_ARTICLE',
                            minValue: '1',
                            maxValue: '31',
                            maskRe: /[0-9.]/,
                            allowBlank: false
                        },
                        {
                            fieldLabel: 'Date limite extrapolation',
                            name: 'int_DATE_LIMITE_EXTRAPOLATION',
                            id: 'int_DATE_LIMITE_EXTRAPOLATION',
                            minValue: '1',
                            maxValue: '31',
                            maskRe: /[0-9.]/,
                            allowBlank: false
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Optimisation quantite',
                            name: 'lg_OPTIMISATION_QUANTITE_ID',
                            id: 'lg_OPTIMISATION_QUANTITE_ID',
                            store: storeoptimisationquantite,
                            valueField: 'lg_OPTIMISATION_QUANTITE_ID',
                            displayField: 'str_LIBELLE_OPTIMISATION',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir mode optimisation...',
                            listeners: {
                                select: function(cmp) {
                                    var value = cmp.getValue();

                                    if (value === "1") {
                                        Ext.getCmp('int_COEFFICIENT_PONDERATION').disable(true);
                                        Ext.getCmp('coefficient_ponderation').hide();
                                    } else {
                                        Ext.getCmp('int_COEFFICIENT_PONDERATION').enable();
                                        Ext.getCmp('int_COEFFICIENT_PONDERATION').setValue(1);
                                        if (value == "54221054333093637650") {
                                            Ext.getCmp('coefficient_ponderation').show();
                                        } else {
                                            Ext.getCmp('coefficient_ponderation').hide();
                                        }
                                    }


                                }

                            }
                        },
                        {
                            xtype: 'checkbox',
                            fieldLabel: 'Seuil de commande',
                            emptyText: 'Seuil de commande',
                            name: 'bool_OPTIMISATION_SEUIL_CMDE',
                            id: 'bool_OPTIMISATION_SEUIL_CMDE'
                        },
                        {
                            fieldLabel: 'Coefficient de ponderation',
                            name: 'int_COEFFICIENT_PONDERATION',
                            id: 'int_COEFFICIENT_PONDERATION',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            allowBlank: false,
                            value: 1
                        }

                    ]
                },
                {
                    xtype: 'fieldset',
                    title: 'Information sur les coefficients de ponderations',
                    id: 'coefficient_ponderation',
                    hidden: true,
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            name: 'int_COEFFICIENT_PONDERATION1',
                            id: 'int_COEFFICIENT_PONDERATION1',
                            fieldLabel: 'Mois (-1)',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            allowBlank: false,
                            minValue: 1,
                            value: 1
                        },
                        {
                            name: 'int_COEFFICIENT_PONDERATION2',
                            id: 'int_COEFFICIENT_PONDERATION2',
                            fieldLabel: 'Mois (-2)',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            allowBlank: false,
                            minValue: 1,
                            value: 1
                        },
                        {
                            name: 'int_COEFFICIENT_PONDERATION3',
                            id: 'int_COEFFICIENT_PONDERATION3',
                            fieldLabel: 'Mois (-3)',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            allowBlank: false,
                            minValue: 1,
                            value: 1
                        },
                        {
                            name: 'int_COEFFICIENT_PONDERATION4',
                            id: 'int_COEFFICIENT_PONDERATION4',
                            fieldLabel: 'Mois (-4)',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            allowBlank: false,
                            minValue: 1,
                            value: 1
                        },
                        {
                            name: 'int_COEFFICIENT_PONDERATION5',
                            id: 'int_COEFFICIENT_PONDERATION5',
                            fieldLabel: 'Mois (-5)',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            allowBlank: false,
                            minValue: 1,
                            value: 1
                        },
                        {
                            name: 'int_COEFFICIENT_PONDERATION6',
                            id: 'int_COEFFICIENT_PONDERATION6',
                            fieldLabel: 'Mois (-6)',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            allowBlank: false,
                            minValue: 1,
                            value: 1
                        }

                    ]
                }
            ]
        });
        //Initialisation des valeur


        if (Omode === "update") {

            //

            ref = this.getOdatasource().lg_CODE_GESTION_ID;
            Ext.getCmp('str_CODE_BAREME').setValue(this.getOdatasource().str_CODE_BAREME);
            Ext.getCmp('int_JOURS_COUVERTURE_STOCK').setValue(this.getOdatasource().int_JOURS_COUVERTURE_STOCK);
            Ext.getCmp('int_MOIS_HISTORIQUE_VENTE').setValue(this.getOdatasource().int_MOIS_HISTORIQUE_VENTE);
            Ext.getCmp('int_DATE_BUTOIR_ARTICLE').setValue(this.getOdatasource().int_DATE_BUTOIR_ARTICLE);
            Ext.getCmp('int_DATE_LIMITE_EXTRAPOLATION').setValue(this.getOdatasource().int_DATE_LIMITE_EXTRAPOLATION);
            Ext.getCmp('bool_OPTIMISATION_SEUIL_CMDE').setValue(this.getOdatasource().bool_OPTIMISATION_SEUIL_CMDE);
            Ext.getCmp('lg_OPTIMISATION_QUANTITE_ID').setValue(this.getOdatasource().lg_OPTIMISATION_QUANTITE_ID);
            Ext.getCmp('int_COEFFICIENT_PONDERATION').setValue(this.getOdatasource().int_COEFFICIENT_PONDERATION);

            Ext.getCmp('int_COEFFICIENT_PONDERATION1').setValue(this.getOdatasource().int_COEFFICIENT_PONDERATION1);
            Ext.getCmp('int_COEFFICIENT_PONDERATION2').setValue(this.getOdatasource().int_COEFFICIENT_PONDERATION2);
            Ext.getCmp('int_COEFFICIENT_PONDERATION3').setValue(this.getOdatasource().int_COEFFICIENT_PONDERATION3);
            Ext.getCmp('int_COEFFICIENT_PONDERATION4').setValue(this.getOdatasource().int_COEFFICIENT_PONDERATION4);
            Ext.getCmp('int_COEFFICIENT_PONDERATION5').setValue(this.getOdatasource().int_COEFFICIENT_PONDERATION5);
            Ext.getCmp('int_COEFFICIENT_PONDERATION6').setValue(this.getOdatasource().int_COEFFICIENT_PONDERATION6);

            if (this.getOdatasource().lg_OPTIMISATION_QUANTITE_ID == "54221054333093637650" || this.getOdatasource().lg_OPTIMISATION_QUANTITE_ID == "coefficient de ponderation") {
                Ext.getCmp('coefficient_ponderation').show();
            }
                
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 600,
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
                    handler: function() {
                        win.close();
                    }
                }]
        });
    },
    onbtnsave: function(button) {

        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');

        if (formulaire.isValid()) {

            var internal_url = "";
            if (Omode === "create") {

                internal_url = url_services_transaction_codegestion + 'create';
            } else {

                internal_url = url_services_transaction_codegestion + 'update&lg_CODE_GESTION_ID=' + ref;
            }

            Ext.Ajax.request({
                url: internal_url,
                params: {
                    str_CODE_BAREME: Ext.getCmp('str_CODE_BAREME').getValue(),
                    int_JOURS_COUVERTURE_STOCK: Ext.getCmp('int_JOURS_COUVERTURE_STOCK').getValue(),
                    int_MOIS_HISTORIQUE_VENTE: Ext.getCmp('int_MOIS_HISTORIQUE_VENTE').getValue(),
                    int_DATE_BUTOIR_ARTICLE: Ext.getCmp('int_DATE_BUTOIR_ARTICLE').getValue(),
                    int_DATE_LIMITE_EXTRAPOLATION: Ext.getCmp('int_DATE_LIMITE_EXTRAPOLATION').getValue(),
                    bool_OPTIMISATION_SEUIL_CMDE: Ext.getCmp('bool_OPTIMISATION_SEUIL_CMDE').getValue(),
                    lg_OPTIMISATION_QUANTITE_ID: Ext.getCmp('lg_OPTIMISATION_QUANTITE_ID').getValue(),
                    int_COEFFICIENT_PONDERATION: Ext.getCmp('int_COEFFICIENT_PONDERATION').getValue(),
                    int_COEFFICIENT_PONDERATION1: Ext.getCmp('int_COEFFICIENT_PONDERATION1').getValue(),
                    int_COEFFICIENT_PONDERATION2: Ext.getCmp('int_COEFFICIENT_PONDERATION2').getValue(),
                    int_COEFFICIENT_PONDERATION3: Ext.getCmp('int_COEFFICIENT_PONDERATION3').getValue(),
                    int_COEFFICIENT_PONDERATION4: Ext.getCmp('int_COEFFICIENT_PONDERATION4').getValue(),
                    int_COEFFICIENT_PONDERATION5: Ext.getCmp('int_COEFFICIENT_PONDERATION5').getValue(),
                    int_COEFFICIENT_PONDERATION6: Ext.getCmp('int_COEFFICIENT_PONDERATION6').getValue()

                },
                success: function(response)
                {
                    //alert("succes");
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success === 0) {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {
                        Me_Workflow = Oview;
                        Ext.MessageBox.alert('Confirmation', object.errors);
                        Oview.getStore().reload();
                        fenetre.close();
                    }

                },
                failure: function(response)
                {
                    //alert("echec");
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });


        } else {
            Ext.MessageBox.alert('Echec', 'Formulaire non valide');
        }

    }
});