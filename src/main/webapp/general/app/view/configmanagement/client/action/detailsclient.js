

/* global Ext */

var Oview;
var Omode;
var Me;
var ref;
var valdatedebutDetail;
var valdatefinDetail;
var valdatedebutDetailOrder;
var valdatefinDetailOrder;
var OgridpanelID;
var OgridpanelOrder;
var lg_GROSSISTE_ORDER_ID;

Ext.define('testextjs.view.configmanagement.client.action.detailsclient', {
    extend: 'Ext.window.Window',
    xtype: 'detailsclient',
    id: 'detailsclientID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'Ext.selection.CellModel',
        'Ext.grid.*'
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

        var ayantdroits = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.AyantDroit',
            proxy: {
                type: 'ajax',
                // REST : memes cles que la JSP historique clientayantdroits.jsp
                url: '../api/v1/ayants-droits',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }

            }
        });

        ayantdroits.load({
            params: {
                lg_CLIENT_ID: this.getOdatasource().lg_CLIENT_ID

            }

        });
        var tierspayant = new Ext.data.Store({
            model: 'testextjs.model.CompteClientTierspayant',
            proxy: {
                type: 'ajax',
                // REST : memes cles que la JSP historique clienttierspayants.jsp
                url: '../api/v1/client/gestion/tiers-payants',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        tierspayant.load({
            params: {
                lg_COMPTE_CLIENT_ID: this.getOdatasource().lg_COMPTE_CLIENT_ID

            }

        });
        var tpl = Ext.create("Ext.XTemplate",
                '<table class="clientdata">\n\
                    <tr>\n\
                        <th class="cell">Code Interne</th> \n\
                                            <th class="cell">N° S&eacute;curit&eacute;</th>   \n\
                                            <th class="cell" > Nom&Pr&eacute;nom(s)</th><th class="cell">Date de naissance</th>\n\
                                            <th class="cell"> Sexe</th>\n\
                    </tr>',
                '<tplfor=".">',
                '<tr class ="ayantdroit">\n\
                     <td class="cell">{str_CODE_INTERNE}</td>\n\
                     <td class="cell">{str_NUMERO_SECURITE_SOCIAL}</td>\n\
                     <td class="cell">{str_FIRST_LAST_NAME}</td>  \n\
                     <td class="cell">{dt_NAISSANCE}</td>   \n\
                     <td class="cell"> {str_SEXE}</td>       \n\
                </tr>',
                '</tpl>\n\
                </table>');


        var tpltierps = Ext.create("Ext.XTemplate",
                '<table class="clientdata "><tr><th class="cell">Organisme</th> <th class="cell">Pourcentage</th>   <th class="cell">R&eacute;gime</th></tr>',
                '<tplfor=".">',
                '<tr class ="ayantdroit"><td class="cell">{str_TIERS_PAYANT_NAME}</td><td class="cell">{int_POURCENTAGE}</td><td class="cell">{str_REGIME}</td>        </tr>',
                '</tpl></table>');

        var myDataview = Ext.create('Ext.view.View', {
            store: ayantdroits, tpl: tpl,
            padding:10,
            itemSelector: 'tr.ayantdroit',
//            selectedClass: 'emplSelected',
//            overClass: 'emplOver',
            emptyText: '<b>Ce Client n\'a pas d\'ayants droit</b>'
        });

        var myDataviewTierspayants = Ext.create('Ext.view.View', {
            store: tierspayant, tpl: tpltierps,
            padding: 10,
            itemSelector: 'tr.ayantdroit'
//            selectedClass: 'emplSelected',
//            overClass: 'emplOver'

        });


        var form = new Ext.form.Panel({
            bodyPadding: 15,
            autoScroll: true,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                layout: {
                    type: 'vbox',
                    align: 'stretch',
                    padding: 10
                },
                defaults: {
                    flex: 1
                },
                msgTarget: 'side'
            },
            items: [
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'hbox',
                    title: 'Infos.Generales sur le client',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'container',
                            layout: 'vbox',
                            defaultType: 'displayfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Code Interne',
                                    id: 'cl_CODE_INTERNE',
                                    width: 100,
                                    fieldStyle: "color:blue;font-weight:300;"
//                                  
                                },
                                {
                                    fieldLabel: 'Nom',
//                                    width: 400,
                                    id: 'cl_FIRST_NAME',
                                    fieldStyle: "color:blue;font-weight:300;"
                                },
                                {
                                    fieldLabel: 'Pr&eacute;nom(s)',
                                    xtype: 'displayfield',
//                                   width: 400,
                                    id: 'cl_LAST_NAME',
                                    fieldStyle: "color:blue;font-weight:300;"
                                }, {
                                    fieldLabel: 'Date de naissance',
                                    xtype: 'displayfield',
//                                   width: 400,
                                    id: 'cl_NAISSANCE',
                                    fieldStyle: "color:blue;font-weight:300;"
                                }
                                , {
                                    fieldLabel: 'Civilit&eacute;',
                                    xtype: 'displayfield',
                                    id: 'cl_SEXE',
                                    fieldStyle: "color:blue;font-weight:300;"
                                }


                            ]
                        }
                        , {
                            xtype: 'container',
                            layout: 'vbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Num&eacute;ro de scurit&eacute; social',
//                                    labelWidth: 110,
//                                    width: 400,
                                    id: 'cl_NUMERO_SECURITE_SOCIAL',
                                    fieldStyle: "color:blue;font-weight:300;"

                                }, {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Adresse',
//                                    labelWidth: 110,
//                                    width: 400,
                                    id: 'clstr_ADRESSE',
                                    fieldStyle: "color:blue;font-weight:300;"
//                                  
                                },
                                {
                                    fieldLabel: 'Ville',
                                    xtype: 'displayfield',
                                    id: 'cl_VILLE',
                                    fieldStyle: "color:blue;font-weight:300;"
                                },
                                {
                                    fieldLabel: 'Code Postal',
                                    xtype: 'displayfield',
                                    id: 'cl_CODE_POSTAL',
                                    fieldStyle: "color:blue;font-weight:300;"
                                }
                                , {
                                    fieldLabel: 'Autre Adresse',
                                    xtype: 'displayfield',
                                    id: 'cl_AUTREADRESSE',
                                    fieldStyle: "color:blue;font-weight:300;"
                                }

                            ]
                        }
                        , {
                            xtype: 'container',
                            layout: 'vbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Cat&eacute;gorie ayant droit',
//                                    labelWidth: 110,
//                                    width: 400,
                                    id: 'cllg_CATEGORIE_AYANTDROIT_ID',
                                    fieldStyle: "color:blue;font-weight:300;"

                                }, {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Type Client',
//                                    labelWidth: 110,
//                                    width: 400,
                                    id: 'cllg_TYPE_CLIENT_ID',
                                    fieldStyle: "color:blue;font-weight:300;"
//                                  
                                },
                                {
                                    fieldLabel: 'Encours',
                                    xtype: 'displayfield',
                                    id: 'cldbl_total_differe',
                                    fieldStyle: "color:blue;font-weight:300;"
                                },
                                {
                                    fieldLabel: 'Risque',
                                    xtype: 'displayfield',
                                    id: 'cllg_RISQUE_ID',
                                    fieldStyle: "color:blue;font-weight:300;"
                                }


                            ]
                        }


                    ]
                },
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'hbox',
                    title: 'Informations Compl&eacute;mentaires',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'panel',
                            title: 'Liste des ayants droits',
                            width:'50%',
                            margin:'0 5 0 0',
                            border:false, 
                            items: [myDataview]
                        },
                        {
                            xtype: 'panel',
                            title: 'Liste des tiers payants',
                            width:'50%',
                            border:false,
                            items: [myDataviewTierspayants]
                        }


                    ]



                }



            ]


        });
        Ext.getCmp('cl_CODE_INTERNE').setValue(this.getOdatasource().str_CODE_INTERNE);
        Ext.getCmp('cl_FIRST_NAME').setValue(this.getOdatasource().str_FIRST_NAME);
        Ext.getCmp('cl_LAST_NAME').setValue(this.getOdatasource().str_LAST_NAME);
        Ext.getCmp('cl_NAISSANCE').setValue(this.getOdatasource().dt_NAISSANCE);
        Ext.getCmp('cl_SEXE').setValue(this.getOdatasource().str_SEXE);
        Ext.getCmp('cl_VILLE').setValue(this.getOdatasource().lg_VILLE_ID);
        Ext.getCmp('cldbl_total_differe').setValue(this.getOdatasource().dbl_total_differe);
        Ext.getCmp('cl_AUTREADRESSE').setValue(this.getOdatasource().str_AUTRE_ADRESSE);
        Ext.getCmp('cl_CODE_POSTAL').setValue(this.getOdatasource().cl_CODE_POSTAL);
        Ext.getCmp('clstr_ADRESSE').setValue(this.getOdatasource().str_ADRESSE);
        Ext.getCmp('cllg_TYPE_CLIENT_ID').setValue(this.getOdatasource().lg_TYPE_CLIENT_ID);
        Ext.getCmp('cllg_CATEGORIE_AYANTDROIT_ID').setValue(this.getOdatasource().lg_CATEGORIE_AYANTDROIT_ID);
        Ext.getCmp('cllg_RISQUE_ID').setValue(this.getOdatasource().lg_RISQUE_ID);
        /* Ext.getCmp('clstr_DOMICILE').setValue(this.getOdatasource().str_DOMICILE); */
        Ext.getCmp('cl_NUMERO_SECURITE_SOCIAL').setValue(this.getOdatasource().str_NUMERO_SECURITE_SOCIAL);


        var win = new Ext.window.Window({
            modal: true,
            autoShow: true, title: this.getTitre(),
            width: '90%',
            height: 600,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }],
            listeners: {// controle sur le button fermé en haut de fenetre
                beforeclose: function () {
                    // Ext.getCmp('rechecher').focus();
                }
            }
        });

    }



});