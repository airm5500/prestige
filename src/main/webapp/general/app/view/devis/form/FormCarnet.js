/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global Ext */

Ext.define('testextjs.view.devis.form.FormCarnet', {
    extend: 'Ext.window.Window',
    xtype: 'formCarnetwindow',
    autoShow: false,
    height: 450,
    width: '70%',
    modal: true,
    title: 'Gestion des clients',
    closeAction: 'hide',
    closable: false,
    maximizable: true,
    layout: {
        type: 'fit'

    },
    initComponent: function () {
        var me = this;
        var villeStore = new Ext.data.Store({
            idProperty: 'lgVILLEID',
            fields: [
                {name: 'lgVILLEID', type: 'string'},
                {name: 'strName', type: 'string'}
            ],
            pageSize: null,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/villes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var tierspayantss = new Ext.data.Store({
            idProperty: 'lgTIERSPAYANTID',
            fields: [
                {name: 'lgTIERSPAYANTID', type: 'string'},
                {name: 'strFULLNAME', type: 'string'}
            ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/tiers-payants/2',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
      
        Ext.applyIf(me, {

            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    layout: {
                        pack: 'end',
                        type: 'hbox'
                    },
                    items: [
                        {
                            xtype: 'button',
                            itemId: 'btnAddClientAssurance',
                            text: 'Enregistrer'
                        },
                        {
                            xtype: 'button',
                            iconCls: 'cancelicon',
                            itemId: 'btnCancelAssClient',
                            text: 'Annuler'

                        }
                    ]
                }
            ],
            items: [
                {
                    xtype: 'form',
                    itemId: 'addaddclientwindowform',
                    bodyPadding: 2,
                    modelValidation: true,
                    layout: {
                        type: 'hbox',
                        align: 'stretch'
                    },
                    items: [

                        {
                            xtype: 'container',
                            flex: 1,
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    collapsible: false,
                                    height: 160,
                                    bodyPadding: 5,
                                    title: 'Information sur le client',
                                    layout: {
                                        type: 'vbox',
                                        align: 'stretch'
                                    },
                                    items: [
                                        {
                                            xtype: 'fieldcontainer',
                                            flex: 1,
                                            layout: {type: 'hbox', align: 'stretch'},
                                            items: [
                                                {
                                                    xtype: 'textfield',
                                                    fieldLabel: 'Nom',
                                                    emptyText: 'Nom',
                                                    name: 'strFIRSTNAME',
                                                    itemId: 'strFIRSTNAME',
                                                    height: 30, flex: 1,
                                                    allowBlank: false,
                                                    enableKeyEvents: true,
                                                    listeners: {
                                                        afterrender: function (field) {
                                                            field.focus(false, 100);
                                                        }
                                                    }

                                                }, {xtype: 'splitter'},
                                                {
                                                    xtype: 'textfield',
                                                    fieldLabel: 'Prénom',
                                                    emptyText: 'Prénom',
                                                    name: 'strLASTNAME',
                                                    height: 30, flex: 1,
                                                    allowBlank: false,
                                                    enableKeyEvents: true

                                                }
                                            ]
                                        },
                                        {
                                            xtype: 'fieldcontainer',
                                            flex: 1,
                                            layout: {type: 'hbox', align: 'stretch'},
                                            items: [
                                                {xtype: 'textfield',
                                                    fieldLabel: 'Matricule/SS',
                                                    emptyText: 'Numéro de matricule ',
                                                    name: 'strNUMEROSECURITESOCIAL',
                                                    height: 30, flex: 1,
                                                    enableKeyEvents: true

                                                }, {xtype: 'splitter'},
                                                {xtype: 'datefield',
                                                    fieldLabel: 'Date.Naiss',
                                                    emptyText: 'Date de naissance',
                                                    name: 'dtNAISSANCE',
                                                    height: 30, flex: 1,
                                                    submitFormat: 'Y-m-d',
                                                    format: 'd/m/Y',
                                                    maxValue: new Date(),
                                                    enableKeyEvents: true

                                                }
                                            ]
                                        }
                                        , {
                                            xtype: 'fieldcontainer',
                                            flex: 1,
                                            layout: {type: 'hbox', align: 'stretch'},
                                            items: [
                                                {xtype: 'textfield',
                                                    fieldLabel: 'Adresse',
                                                    emptyText: 'Adresse',
                                                    name: 'strADRESSE',
                                                    height: 30, flex: 1,
                                                    enableKeyEvents: true

                                                }, {xtype: 'splitter'},
                                                {
                                                    xtype: 'textfield',
                                                    fieldLabel: 'Code Postale',
                                                    emptyText: 'Code Postale',
                                                    name: 'strCODEPOSTAL',
                                                    height: 30, flex: 1,
                                                    enableKeyEvents: true

                                                }
                                            ]
                                        },
                                        {
                                            xtype: 'fieldcontainer',
                                            flex: 1,
                                            layout: {type: 'hbox', align: 'stretch'},
                                            items: [
                                                {
                                                    xtype: "radiogroup",
                                                    fieldLabel: "Genre",
                                                    allowBlank: true,
                                                    flex: 1,
                                                    vertical: true,
                                                    items: [
                                                        {boxLabel: 'Féminin', name: 'strSEXE', inputValue: 'F'},
                                                        {boxLabel: 'Masculin', name: 'strSEXE', inputValue: 'M'}
                                                    ]
                                                }, {xtype: 'splitter'},
                                                {
                                                    xtype: 'combobox',
                                                    fieldLabel: 'Ville',
                                                    flex: 1,
                                                    height: 30,
                                                    forceSelection:true,
                                                    minChars: 2,
                                                    name: 'lgVILLEID',
                                                    store: villeStore,
                                                    valueField: 'lgVILLEID',
                                                    displayField: 'strName',
                                                    editable: false,
                                                    queryMode: 'remote',
                                                    emptyText: 'Choisir une ville...'
                                                }
                                            ]
                                        }

                                    ]
                                },

                                {
                                    xtype: 'fieldset',
                                    collapsible: false,
                                    height: 120,
                                    bodyPadding: 5,
                                    title: 'Infos Compte Carnet',
                                    layout: {
                                        type: 'vbox', align: 'stretch'

                                    },
                                    items: [
                                        {
                                            xtype: 'fieldcontainer',
                                            flex: 1,
                                            layout: {type: 'hbox'},
                                            items: [
                                                {
                                                    xtype: 'combobox',
                                                    fieldLabel: 'Tiers.Payant',
                                                    name: 'lgTIERSPAYANTID',
                                                    flex: 1, height: 30,
                                                    minChars: 2,
//                                                    forceSelection:true,
                                                    store: tierspayantss,
                                                    valueField: 'lgTIERSPAYANTID',
                                                    displayField: 'strFULLNAME',
                                                    typeAhead: false,
                                                    allowBlank: false,
                                                    queryMode: 'remote',
                                                    emptyText: 'Choisir un tierspayant...'
                                                },
                                                {xtype: 'splitter'},
                                                {
                                                    xtype: 'numberfield',
                                                    flex: 1, height: 30,
                                                    fieldLabel: 'Pourcentage',
                                                    allowDecimals: false,
                                                    readOnly: true,
                                                    hideTrigger: true,
                                                    name: 'intPOURCENTAGE',
                                                    maxValue: 100,
                                                    value: 100

                                                }
                                            ]
                                        },
                                        {
                                            xtype: 'fieldcontainer',
                                            flex: 1,
                                            layout: {type: 'hbox'},
                                            items: [
                                                {
                                                    xtype: 'numberfield',
                                                    hideTrigger: true,
                                                    flex: 1, height: 30,
                                                    allowDecimals: false,
                                                    fieldLabel: 'Plafond.Vente',
                                                    name: 'dblQUOTACONSOMENSUELLE', minValue: 0,
                                                    emptyText: 'Plafond.Vente'
                                                },
                                                {xtype: 'splitter'},
                                                {
                                                    xtype: 'numberfield',
                                                    flex: 1,
                                                    hideTrigger: true,
                                                    allowDecimals: false,
                                                    fieldLabel: 'Plafond.Encours',
                                                    name: 'dbPLAFONDENCOURS', minValue: 0,
                                                    maxValue: 100, height: 30,
                                                    maskRe: /[0-100.]/,
                                                    emptyText: 'Plafond.Encours'
                                                }, {xtype: 'splitter'}, {xtype: 'splitter'}, {xtype: 'splitter'},
                                                {
                                                    xtype: 'checkbox',
                                                    boxLabel: 'Le plafond est-il absolu ?',
                                                    labelAlign: 'right',
                                                    flex: 1,
                                                    height: 30,
                                                    name: 'bIsAbsolute'
//                                                    checked: false

                                                }
                                                , {
                                                    xtype: 'hiddenfield',
                                                    name: 'lgCLIENTID'

                                                }, {
                                                    xtype: 'hiddenfield',
                                                    name: 'lgTYPECLIENTID',
                                                    value: '2'

                                                }
                                            ]
                                        }
                                    ]
                                }

                            ]
                        }

                    ]
                }
            ]
        });
        me.callParent(arguments);
    }

});

