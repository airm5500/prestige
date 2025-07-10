/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global Ext */

Ext.define('testextjs.view.vente.user.UpdateVenteClientTpForm', {
    extend: 'Ext.window.Window',
    xtype: 'updateClientTpform',
    autoShow: false,
    height: 420,
    width: '80%',
    modal: true,
    title: 'Modification vente',
    closeAction: 'hide',
    closable: false,
    maximizable: true,
    layout: {
        type: 'fit'

    },
    requires: [
        'testextjs.store.caisse.RechercheClientAss'
    ],

    config: {
        venteId: null,
        client: null,
        clientId: null,
        ayantDroitId: null,
        compteClientTiersPayantId: null,
        tiersparent: null,
        ayantDroit: null,
        data: null,
        newVenteId: null,
        newData: null,
        typeVente: null,
        taux: null,
        message: null,
        selectedData: null
    },
    initComponent: function () {
        var me = this;
        var venteId = me.getVenteId();
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
                            text: 'Enregistrer',
                            handler: me.onSave
                        },
                        {
                            xtype: 'button',
                            iconCls: 'cancelicon',
                            itemId: 'btnCancelAssClient',
                            text: 'Annuler',
                            handler: me.closeWindow

                        }
                    ]
                }
            ],
            items: [
                {
                    xtype: 'form',
                    bodyPadding: 5,
                    modelValidation: true,
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },

                    items: [
                        {
                            xtype: 'fieldset',
                            collapsible: false,
                            bodyPadding: 5,
                            flex: 0.6,
                            title: '<span style="color:blue;">Information vente </span>',
                            layout: {
                                type: 'vbox', align: 'stretch'

                            },
                            items: [
                                {
                                    xtype: 'fieldcontainer',

                                    layout: {type: 'hbox'},
                                    items: [

                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Type vente:',
                                            flex: 1.5,
                                            labelWidth: 70,
//                                            hidden: true,
                                            itemId: 'strTYPEVENTE',
                                            name: 'strTYPEVENTE',
                                            fieldStyle: "color:blue;font-weight: bold;",
                                            margin: '0 10 0 0'
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Total vente:',
                                            flex: 0.8,
                                            labelWidth: 80,
                                            itemId: 'montantTotal',
                                            name: 'intPRICE',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;",
                                            margin: '0 10 0 0'
                                        },
                                        {xtype: 'splitter'},
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Part client:',
                                            flex: 0.8,
                                            labelWidth: 70,
                                            itemId: 'montantClient',
                                            name: 'intCUSTPART',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;",
                                            margin: '0 10 0 0'
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Part tiers-payant:',
                                            flex: 1,
                                            itemId: 'montantCredit',
                                            name: 'montantCredit',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;",
                                            margin: '0 10 0 0'
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Montant payé:',
                                            flex: 0.8,
                                            labelWidth: 90,
                                            itemId: 'montantPaye',
                                            name: 'montantPaye',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;",
                                            margin: '0 10 0 0'
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Montant restant:',
                                            flex: 0.8,
                                            labelWidth: 100,
                                            itemId: 'montantRestant',
                                            name: 'montantRestant',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;",
                                            margin: '0 10 0 0'
                                        }

                                    ]
                                }
                            ]
                        },

                        {
                            xtype: 'fieldcontainer',
                            layout: {type: 'hbox'},
                            flex: 1.2,
                            items: [
                                {
                                    xtype: 'fieldset',
                                    title: '<span style="color:blue;">INFOS ASSURE</span>',
                                    itemId: 'assureCmp',
                                    flex: 1,
                                    layout: {type: 'hbox'},
                                    items: [
                                        {
                                            xtype: 'container',
                                            flex: 1.5,
                                            layout: {type: 'vbox', align: 'stretch'},
                                            items: [

                                                {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'Nom :',
                                                    flex: 1,
                                                    itemId: 'nomAssure',
                                                    name: 'nomAssure',
                                                    fieldStyle: "color:blue;",
                                                    margin: '0 10 0 0'
                                                }, {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'Prénom(s):',
                                                    itemId: 'prenomAssure',
                                                    name: 'prenomAssure',
                                                    flex: 1,
                                                    fieldStyle: "color:blue;",
                                                    margin: '0 10 0 0'
                                                },
                                                {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'Matricule/SS:',
                                                    itemId: 'numAssure',
                                                    name: 'numAssure',
                                                    flex: 1,
                                                    fieldStyle: "color:blue;",
                                                    margin: '0 10 0 0'
                                                }

                                            ]

                                        },
                                        {
                                            xtype: 'container',
                                            flex: 0.5,
                                            layout: {type: 'vbox', align: 'middle'},
                                            items: [
                                                {
                                                    text: 'Changer le client ',
                                                    itemId: 'btnModifierInfo',
                                                    xtype: 'button',
                                                    handler: me.changeClient

                                                },
                                                {
                                                    text: 'Modifier infos  client ',
                                                    itemId: 'btnModifierClient',
                                                    margin: '10 0 0 0',
                                                    style: 'background-color:green !important;border-color:green !important; background:green !important;',
                                                    xtype: 'button',
                                                    handler: me.changeClientInfos

                                                }

                                            ]
                                        }
                                    ]

                                },
                                {
                                    xtype: 'fieldset',
                                    title: '<span style="color:blue;">INFOS AYANT DROIT</span>',
                                    itemId: 'ayantDroyCmp',
                                    flex: 1,
                                    layout: {type: 'hbox'},
                                    items: [
                                        {
                                            xtype: 'container',

                                            flex: 1.3,
                                            layout: {type: 'vbox', pack: 'start',
                                                align: 'middle'},
                                            items: [

                                                {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'Nom :',
                                                    flex: 1,
                                                    itemId: 'nomAyantDroit',
                                                    name: 'nomAyantDroit',
                                                    fieldStyle: "color:blue;",
                                                    margin: '0 10 0 0'
                                                }, {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'Prénom(s):',
                                                    itemId: 'prenomAyantDroit',
                                                    name: 'prenomAyantDroit',
                                                    flex: 1,
                                                    fieldStyle: "color:blue;",
                                                    margin: '0 10 0 0'
                                                },
                                                {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'Matricule/SS:',
                                                    itemId: 'numAyantDroit',
                                                    name: 'numAyantDroit',
                                                    flex: 1,
                                                    fieldStyle: "color:blue;",
                                                    margin: '0 10 0 0'
                                                }

                                            ]

                                        },
                                        {
                                            xtype: 'container',
                                            flex: 0.7,
                                            layout: {type: 'vbox', align: 'middle'},
                                            items: [

                                                {
                                                    text: 'Autre ayant droit',
                                                    itemId: 'btnModifierAyant',
                                                    xtype: 'button',
                                                    handler: me.changeAyantDroit

                                                },
                                                {
                                                    text: 'Modifier infos ayant droit ',
                                                    itemId: 'btnModifierAyantDroit',
                                                    margin: '10 0 0 0',
                                                    style: 'background-color:green !important;border-color:green !important; background:green !important;',
                                                    xtype: 'button',
                                                    handler: me.changeInfosAyantDroit

                                                }

                                            ]
                                        }
                                    ]

                                }
                            ]
                        },

                        {

                            xtype: 'fieldset',
                            title: '<span style="color:blue;">INFOS TIERS PAYANTS</span>',
                            itemId: 'tpContainer',
                            layout: {type: 'fit'},
                            flex: 1.2,
                            items: [
                                {
                                    layout: {type: 'hbox', align: 'stretch'},
                                    xtype: 'fieldcontainer',
                                    itemId: 'tpContainerform',
                                    border: 0,
                                    items: []
                                }
                            ]

                        }

                    ]



                }
            ]
        });
        me.callParent(arguments);
        me.loadVenteById(venteId);
    },

    buildtierspayant: function () {
        var me = this, tpContainerForm = me.down('form').down('#tpContainer').down('#tpContainerform');
        var tierspayants = me.getTiersparent();
        Ext.each(tierspayants, function (item) {
            var cmp = me.buildCmp(item);
            me.taux = item.taux;
            me.message = item.numBon;
            tpContainerForm.add(cmp);
        });


    },

    buildCmp: function (record, taux, numBon) {
        var percent = '40%';
        var me = this, typeVente = me.getTypeVente();
        if (typeVente === '3') {
            percent = '50%';
        }
        let _taux = record.taux;
        let itemId = record.itemId;
        let _numBon = record.numBon;
        if (numBon) {
            _numBon = numBon;
        }
        if (taux) {
            _taux = taux;
        }
        var cmp = {
            xtype: 'container',
            width: percent,
            margin: '0 10 0 0',
            layout: {type: 'vbox', align: 'stretch'},
            items: [

                {
                    xtype: 'fieldcontainer',
                    layout: {type: 'hbox', align: 'stretch'},
                    items: [{
                            xtype: 'displayfield',
                            fieldLabel: 'TP <span style="color:red;font-weight:bold;">' + _taux + '</span>',
                            flex: 1,
                            labelWidth: 50,
                            fieldStyle: "color:blue;",
                            value: record.tpFullName,
                            margin: '0 10 0 0'
                        }

                    ]
                }
                ,
                {
                    xtype: 'fieldcontainer',
                    layout: {type: 'hbox', align: 'stretch'},
                    items: [
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Ref.Bon:',
                            allowBlank: true,
                            labelWidth: 50,
                            name: 'refBon',
                            itemId: 'refBon',
                            flex: 1,
//                            readOnly: true,
                            height: 30,
                            margin: '0 10 0 0',
                            value: _numBon,
                            listeners: {
                                afterrender: function (field) {
                                    field.focus(false, 100);
                                }
                            }
                        },
                        {
                            xtype: 'button',
                            text: 'Modifier le tiers-payant',
                            margin: '0 10 0 0',
                            handler: me.changeTiespayant


                        }
                    ]
                },

                {
                    xtype: 'fieldcontainer',
                    layout: {type: 'hbox', align: 'stretch'},
                    items: [

                        {
                            xtype: 'numberfield',
                            fieldLabel: 'Taux:',
                            flex: 1,
                            labelWidth: 50,
//                            height: 30,
                            hideTrigger: true,
                            name: 'taux',
                            itemId: 'taux',
//                            fieldStyle: "color:blue;",
                            value: _taux,
                            readOnly: true,
                            margin: '0 10 0 0'

                        },
                        {
                            xtype: 'button',
                            text: 'Retirer',
                            hidden: true,
                            flex: 0.7,
                            margin: '0 10 0 0',
                            style: 'background-color:#d9534f  !important;border-color:#d9534f  !important; background:#d9534f  !important;',
                            handler: function (btn) {
                                var cp = btn.up('fieldcontainer');
                                var container = cp.up('container');
                                container.destroy();
                            }
                        }

                    ]
                },

                {
                    xtype: 'hiddenfield',
                    name: 'compteTp',
                    itemId: 'compteTp',
                    value: record.compteTp
                },
                {
                    xtype: 'hiddenfield',
                    name: 'detailId',
                    itemId: 'detailId',
                    value: itemId ? itemId : ""
                }



            ]
        };
        return cmp;
    },
    changeInfosAyantDroit: function (btn) {
        let me = btn.up('window');
        let ayantDroit = me.getAyantDroit();
        let client = me.getClient();
        if (client.strNUMEROSECURITESOCIAL === ayantDroit.strNUMEROSECURITESOCIAL) {
            Ext.MessageBox.show({
                title: 'Message',
                width: 320,
                msg: "Il n'est pas possible de modifier les inforamtions de l'ayant droit principal à ce niveau",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING

            });
        } else {
            var form = Ext.create('Ext.window.Window',
                    {
                        autoShow: true,
                        height: 240,
                        width: '40%',
                        modal: true,
                        title: 'MODIFICATION DES INFORMATIONS GENERALES DE L\'AYANT DROIT',
                        closeAction: 'hide',
                        closable: true,
                        layout: {
                            type: 'vbox',
                            align: 'stretch'
                        },
                        items: [
                            {
                                xtype: 'form',
                                bodyPadding: 5,
                                modelValidation: true,
                                layout: {
                                    type: 'fit',
                                    align: 'stretch'
                                },
                                items: [

                                    {
                                        xtype: 'fieldset',
                                        title: 'Informations',
                                        layout: 'anchor',
                                        defaults: {
                                            anchor: '100%',
                                            xtype: 'textfield',
                                            msgTarget: 'side',
                                            labelAlign: 'right',
                                            labelWidth: 115
                                        },
                                        items: [
                                            {
                                                fieldLabel: 'Nom',
                                                emptyText: 'Nom',
                                                name: 'strFIRSTNAME',
                                                value: ayantDroit.strFIRSTNAME,
                                                height: 30,
                                                allowBlank: false,
                                                enableKeyEvents: true

                                            }, {
                                                fieldLabel: 'Prénom',
                                                emptyText: 'Prénom',
                                                name: 'strLASTNAME',
                                                value: ayantDroit.strLASTNAME,
                                                height: 30,
                                                allowBlank: false,
                                                enableKeyEvents: true

                                            },
                                            {
                                                fieldLabel: 'Matricule',
                                                emptyText: 'Matricule',
                                                name: 'strNUMEROSECURITESOCIAL',
                                                value: ayantDroit.strNUMEROSECURITESOCIAL,
                                                height: 30,
                                                allowBlank: false,
                                                enableKeyEvents: true

                                            }

                                        ]
                                    }

                                ]
                            }
                        ],
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
                                        text: 'Enregistrer',
                                        handler: function (b) {
                                            var _this = b.up('window'), _form = _this.down('form');
                                            if (_form.isValid()) {
                                                var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                                                Ext.Ajax.request({
                                                    method: 'POST',
                                                    headers: {'Content-Type': 'application/json'},
                                                    url: '../api/v1/client/update-infos-ayantdroit/' + me.getAyantDroitId(),
                                                    params: Ext.JSON.encode(_form.getValues()),
                                                    success: function (response, options) {
                                                        progress.hide();
                                                        var result = Ext.JSON.decode(response.responseText, true);
                                                        if (result.success) {
                                                            form.destroy();
                                                            me.ayantDroit = result.data;
                                                            me.updateAyantDroitInfosContainer(me, result.data);

                                                        } else {
                                                            Ext.MessageBox.show({
                                                                title: 'Message d\'erreur',
                                                                width: 320,
                                                                msg: result.msg,
                                                                buttons: Ext.MessageBox.OK,
                                                                icon: Ext.MessageBox.ERROR

                                                            });
                                                        }

                                                    },
                                                    failure: function (response, options) {
                                                        progress.hide();
                                                        Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
                                                    }

                                                });
                                            }

                                        }


                                    },
                                    {
                                        xtype: 'button',
                                        text: 'Annuler',
                                        handler: function (btn) {
                                            form.destroy();
                                        }

                                    }
                                ]
                            }
                        ]
                    }
            );
        }

    },
    changeClientInfos: function (btn) {
        let me = btn.up('window');
        let client = me.getClient();
        var form = Ext.create('Ext.window.Window',
                {

                    autoShow: true,
                    height: 280,
                    width: '50%',
                    modal: true,
                    title: 'MODIFICATION DES INFORMATIONS GENERALES',
                    closeAction: 'hide',
                    closable: true,
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },
                    items: [
                        {
                            xtype: 'form',
                            bodyPadding: 5,
                            modelValidation: true,
                            layout: {
                                type: 'fit',
                                align: 'stretch'
                            },
                            items: [

                                {
                                    xtype: 'fieldset',
                                    title: 'Information du client',
                                    layout: 'anchor',
                                    defaults: {
                                        anchor: '100%',
                                        xtype: 'textfield',
                                        msgTarget: 'side',
                                        labelAlign: 'right',
                                        labelWidth: 115
                                    },
                                    items: [
                                        {
                                            fieldLabel: 'Nom',
                                            emptyText: 'Nom',
                                            name: 'strFIRSTNAME',
                                            value: client.strFIRSTNAME,
                                            height: 30,
                                            allowBlank: false,
                                            enableKeyEvents: true

                                        }, {
                                            fieldLabel: 'Prénom',
                                            emptyText: 'Prénom',
                                            name: 'strLASTNAME',
                                            value: client.strLASTNAME,
                                            height: 30,
                                            allowBlank: false,
                                            enableKeyEvents: true

                                        },
                                        {
                                            fieldLabel: 'Matricule',
                                            emptyText: 'Matricule',
                                            name: 'strNUMEROSECURITESOCIAL',
                                            value: client.strNUMEROSECURITESOCIAL,
                                            height: 30,
                                            allowBlank: false,
                                            enableKeyEvents: true

                                        },
                                        {
                                            fieldLabel: 'Téléphone',
                                            emptyText: 'Téléphone',
                                            name: 'strADRESSE',
                                            value: client.strADRESSE,
                                            height: 30,
                                            regex: /[0-9.]/,
                                            allowBlank: true,
                                            enableKeyEvents: true
                                        }
                                        , {
                                            fieldLabel: 'E-mail',
                                            emptyText: 'E-mail',
                                            name: 'email',
                                            height: 30,
                                            hidden: true,
                                            vtype: 'email',
                                            allowBlank: true,
                                            enableKeyEvents: true

                                        }

                                    ]
                                }

                            ]
                        }
                    ],
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
                                    text: 'Enregistrer',
                                    handler: function (b) {
                                        var _this = b.up('window'), _form = _this.down('form');
                                        if (_form.isValid()) {
                                            var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                                            Ext.Ajax.request({
                                                method: 'POST',
                                                headers: {'Content-Type': 'application/json'},
                                                url: '../api/v1/client/update-infos-client/' + me.getClientId(),
                                                params: Ext.JSON.encode(_form.getValues()),
                                                success: function (response, options) {
                                                    progress.hide();
                                                    var result = Ext.JSON.decode(response.responseText, true);
                                                    if (result.success) {
                                                        form.destroy();
                                                        var client = result.data;
                                                        me.client = client;
                                                        me.clientId = client.lgCLIENTID;
                                                        let ayantDroitRecord = {};
                                                        me.down('form').down('#prenomAssure').setValue(client.strLASTNAME);
                                                        me.down('form').down('#nomAssure').setValue(client.strFIRSTNAME);
                                                        me.down('form').down('#numAssure').setValue(client.strNUMEROSECURITESOCIAL);
                                                        if (client.ayantDroits.length > 0) {
                                                            if (client.ayantDroits.length == 0) {
                                                                ayantDroitRecord = client.ayantDroits[0];
                                                            } else {
                                                                ayantDroitRecord = client.ayantDroits.filter(e => e.strNUMEROSECURITESOCIAL == client.strNUMEROSECURITESOCIAL)[0];
                                                            }
                                                            me.updateAyantDroitInfosContainer(me, ayantDroitRecord);
                                                            me.ayantDroit = ayantDroitRecord;
                                                        } else {
                                                            me.down('form').down('#nomAyantDroit').setValue('');
                                                            me.down('form').down('#numAyantDroit').setValue('');
                                                            me.down('form').down('#prenomAyantDroit').setValue('');
                                                            me.ayantDroitId = null;
                                                            me.ayantDroit = null;
                                                        }

                                                    } else {
                                                        Ext.MessageBox.show({
                                                            title: 'Message d\'erreur',
                                                            width: 320,
                                                            msg: result.msg,
                                                            buttons: Ext.MessageBox.OK,
                                                            icon: Ext.MessageBox.ERROR

                                                        });
                                                    }

                                                },
                                                failure: function (response, options) {
                                                    progress.hide();
                                                    Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
                                                }

                                            });
                                        }

                                    }


                                },
                                {
                                    xtype: 'button',
                                    text: 'Annuler',
                                    handler: function (btn) {
                                        form.destroy();
                                    }

                                }
                            ]
                        }
                    ]
                }
        );

    },
    changeAyantDroit: function (btn) {
        let me = btn.up('window');
        var ayantStore = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.AyantDroit',
            autoLoad: false,
            pageSize: null,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/ayant-droits',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        });
        ayantStore.load({
            scope: this,
            params: {"clientId": me.getClient().lgCLIENTID},
            callback: function (records, operation, successful) {
                ayantStore.add({lgAYANTSDROITSID: '0', fullName: 'AJOUTER UN NOUVEL AYANT  DROIT'});
                if (successful) {
                    var form = Ext.create('Ext.window.Window',
                            {

                                autoShow: true,
                                height: 200,
                                width: 550,
                                modal: true,
                                title: "CHOISIR UN AYANT DROIT",
                                closeAction: 'hide',
                                closable: true,
                                maximizable: false,
                                bodyPadding: 10,
                                layout: {
                                    type: 'fit'

                                },
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
                                                handler: function (btn) {
                                                    let parentForm = btn.up('window');
                                                    let ayantDroitRecord = parentForm.down('#lgAYANTSDROITSID').findRecord("lgAYANTSDROITSID", parentForm.down('#lgAYANTSDROITSID').getValue());

                                                    if (ayantDroitRecord) {
                                                        me.down('form').down('#nomAyantDroit').setValue(ayantDroitRecord.get('strFIRSTNAME'));
                                                        me.down('form').down('#numAyantDroit').setValue(ayantDroitRecord.get('strNUMEROSECURITESOCIAL'));
                                                        me.down('form').down('#prenomAyantDroit').setValue(ayantDroitRecord.get('strLASTNAME'));
                                                        me.ayantDroitId = ayantDroitRecord.get('lgAYANTSDROITSID');
                                                        me.ayantDroit = ayantDroitRecord.data;
                                                    }
                                                    form.destroy();

                                                },
                                                text: 'Valider'

                                            },
                                            {
                                                xtype: 'button',
                                                handler: function (btn) {
                                                    form.destroy();
                                                },
                                                text: 'Annuler'

                                            }
                                        ]
                                    }
                                ],
                                items: [
                                    {
                                        xtype: 'fieldset',
                                        title: 'LISTE DES CLIENTS',
                                        defaultType: 'textfield',
                                        defaults: {
                                            anchor: '100%'
                                        },
                                        items: [

                                            {
                                                xtype: 'combobox',
                                                fieldLabel: 'Ayant droits',
                                                flex: 1,
                                                height: 30,
                                                minChars: 2,
                                                itemId: 'lgAYANTSDROITSID',
                                                forceSelection: true,
                                                store: ayantStore,
                                                valueField: 'lgAYANTSDROITSID',
                                                displayField: 'fullName',
                                                queryMode: 'local',
                                                allowBlank: false,
                                                emptyText: 'Choisir un ayant droit...',
                                                listeners: {
                                                    select: function (field) {
                                                        if (field.getValue() == '0') {
                                                            me.createNewAyantDroit(me, field);
                                                        }
                                                    }
                                                }

                                            }


                                        ]
                                    }

                                ]
                            });
                }
            }

        }

        );


    },
    changeClient: function (btn) {
        let me = btn.up('window');
        let url = '../api/v1/client/bytype/' + me.getTypeVente();
        var clientStore = Ext.create('Ext.data.Store', {
            autoLoad: false,
            pageSize: null,
            model: 'testextjs.model.caisse.ClientAssurance',
            proxy: {
                type: 'ajax',
                url: url,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
        var form = Ext.create('Ext.window.Window',
                {

                    autoShow: true,
                    height: 180,
                    width: 600,
                    modal: true,
                    title: "CHOISIR UN ASSURE",
                    closeAction: 'hide',
                    closable: false,
                    maximizable: false,
                    bodyPadding: 10,
                    layout: {
                        type: 'fit'

                    },
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
                                    handler: function (btn) {
                                        let parentForm = btn.up('window');
                                        let clientRecord = parentForm.down('#lgCLIENTID').findRecord("lgCLIENTID", parentForm.down('#lgCLIENTID').getValue());
                                        if (clientRecord) {
                                            let ayantDroits = clientRecord.get('ayantDroits');
                                            let  tiersPayants = clientRecord.get('tiersPayants');
                                            let taux = me.getTaux();
                                            let ayantDroitRecord = {};
                                            let tiersPayant = {};
                                            me.down('form').down('#prenomAssure').setValue(clientRecord.get('strLASTNAME'));
                                            me.down('form').down('#nomAssure').setValue(clientRecord.get('strFIRSTNAME'));
                                            me.down('form').down('#numAssure').setValue(clientRecord.get('strNUMEROSECURITESOCIAL'));
                                            if (ayantDroits.length > 0) {
                                                if (ayantDroits.length == 0) {
                                                    ayantDroitRecord = ayantDroits[0];
                                                } else {
                                                    ayantDroitRecord = ayantDroits.filter(e => e.strNUMEROSECURITESOCIAL == clientRecord.get('strNUMEROSECURITESOCIAL'))[0];
                                                }
                                                me.updateAyantDroitInfosContainer(me, ayantDroitRecord);
                                                me.ayantDroit = ayantDroitRecord;
                                            } else {
                                                me.down('form').down('#nomAyantDroit').setValue('');
                                                me.down('form').down('#numAyantDroit').setValue('');
                                                me.down('form').down('#prenomAyantDroit').setValue('');
                                                me.ayantDroitId = null;
                                                me.ayantDroit = null;
                                            }
                                            if (tiersPayants.length == 0) {
                                                tiersPayant = tiersPayants[0];
                                            } else {
                                                tiersPayant = tiersPayants.filter(e => e.order === 1)[0];
                                            }
//                                            me.tiersparent = tiersPayant;

//                                            tpContainerForm.removeAll();
                                            me.client = clientRecord.data;
                                            me.clientId = clientRecord.get('lgCLIENTID');
//                                            var cmp = me.buildCmp(tiersPayant, taux, me.getData().strREFBON );
//                                            tpContainerForm.add(cmp);
                                            form.destroy();
                                        }
                                    },
                                    text: 'Valider'

                                },
                                {
                                    xtype: 'button',
                                    handler: function (btn) {
                                        form.destroy();
                                    },
                                    text: 'Annuler'

                                }
                            ]
                        }
                    ],
                    items: [
                        {
                            xtype: 'fieldset',
                            title: 'LISTE DES CLIENTS',
                            defaultType: 'textfield',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Assurés',
                                    flex: 1,
                                    height: 30,
                                    minChars: 3,
                                    forceSelection: true,
                                    store: clientStore,
                                    itemId: 'lgCLIENTID',
                                    valueField: 'lgCLIENTID',
                                    displayField: 'fullName',
                                    queryMode: 'remote',
                                    allowBlank: false,
                                    emptyText: 'Choisir le client...'

                                }

                            ]
                        }

                    ]
                });

    },

    changeTiespayant: function (btn) {
        let container = btn.up("fieldcontainer").up('container');
        let hiddenfield = container.down('#compteTp');
        
        let rebonCt = btn.up("fieldcontainer").down("textfield");
        let displayfieldCmp = container.down("fieldcontainer:first").down("displayfield");

        let tauxCt = container.down("fieldcontainer:last").down("numberfield").getValue();
        let me = btn.up('window');
        me.selectedData = {"numBon": rebonCt.getValue(), "taux": tauxCt};

        let url = '../api/v1/client/tierspayantsbytype/2';
        if (me.getTypeVente() === '2') {
            url = '../api/v1/client/tierspayantsbytype/1';
        }
        var tpclientStore = new Ext.data.Store({
            idProperty: 'lgTIERSPAYANTID',
            fields: [
                {name: 'lgTIERSPAYANTID', type: 'string'},
                {name: 'strFULLNAME', type: 'string'}
            ],
            pageSize: null,
            autoLoad: false,

            proxy: {
                type: 'ajax',
                url: url,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            },
            listeners: {
                load: function () {
                    this.add({lgTIERSPAYANTID: '0', strFULLNAME: 'AJOUTER UN NOUVEAU TIERS-PAYANT'});
                }
            }

        });
        var form = Ext.create('Ext.window.Window',
                {

                    autoShow: true,
                    height: 230,
                    width: 500,
                    modal: true,
                    bodyPadding: 10,
                    title: "TIERS-PAYANTS ASSOCIES",
                    closeAction: 'hide',
                    closable: true,
                    maximizable: false,
                    layout: {
                        type: 'fit'

                    },
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
                                    text: 'Valider',
                                    handler: function (_this) {
                                        let parentForm = _this.up('window').down('form');
                                        let tpRecord = parentForm.down('#compteTp').findRecord("lgTIERSPAYANTID", parentForm.down('#compteTp').getValue());
                                        let numBon = parentForm.down('#numBon').getValue();
//                                        me.upadeTiersPayantContainer(me, tpRecord.data.strFULLNAME, tpRecord.data.lgTIERSPAYANTID, numBon, itemId, container, me.getSelectedData());
                                        me.upadeTiersPayantData(tpRecord.data.strFULLNAME, tpRecord.data.lgTIERSPAYANTID, rebonCt, displayfieldCmp, hiddenfield, numBon);
                                        form.destroy();
                                    }

                                },
                                {
                                    xtype: 'button',
                                    handler: function (btn) {
                                        form.destroy();
                                    },
                                    text: 'Annuler'

                                }
                            ]
                        }
                    ],
                    items: [{
                            xtype: 'form',
                            bodyPadding: 5,
                            layout: {
                                type: 'fit'

                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    title: 'Tiers-payans',
                                    bodyPadding: 5,
                                    defaultType: 'textfield',
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Tiers-payant',
                                            flex: 1,
                                            height: 30,
                                            minChars: 3,
                                            forceSelection: true,
                                            store: tpclientStore,
                                            name: 'compteTp',
                                            itemId: 'compteTp',
                                            valueField: 'lgTIERSPAYANTID',
                                            displayField: 'strFULLNAME',
                                            queryMode: 'remote',
                                            allowBlank: false,
                                            emptyText: 'Choisir un tiers-payant...',
                                            listeners: {
                                                select: function (field) {
                                                    if (field.getValue() !== '0') {
                                                        var parent = field.up('fieldset');
                                                        var numberField = parent.down('#numBon');
                                                        numberField.setValue(me.getSelectedData().numBon);
                                                        numberField.focus(false, 50);
                                                    } else {
                                                        /*******************************************************************/
                                                        field.up('fieldset').down('#numBon').setValue(me.getSelectedData().numBon);
                                                        me.buildNewTierspayantForm(me, field.up('fieldset').down('#numBon'), itemId);
                                                        /*********************************** FIND *******************************************/

                                                    }
                                                }
                                            }
                                        },

                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'Num bon',
                                            name: 'numBon',
                                            itemId: 'numBon',
                                            height: 30, flex: 1,
                                            allowBlank: false,
                                            minValue: 1

                                        }

                                    ]
                                }
                            ]
                        }

                    ]
                });
    },
    closeWindow: function () {
        let me = this;
        let wind = me.up('window');
        wind.destroy();
    },
    loadVenteById: function (id) {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/vente/find/infosclienttpforupdating',
            params: {"id": id},
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.data = result.data;
                    me.typeVente = me.getData().lgTYPEVENTEID;
                    let form = me.down('form');
                    let montantPaye = form.down('#montantPaye');
                    me.client = me.getData().client;
                    me.tiersparent = me.getData().tierspayants;
                    me.ayantDroit = me.getData().ayantDroit;
                    me.clientId = me.getClient().lgCLIENTID;
                    me.ayantDroitId = me.getAyantDroit().lgAYANTSDROITSID;
                    montantPaye.setValue(me.getData().montantPaye);
                    form.down('#strTYPEVENTE').setValue(me.getData().strTYPEVENTE);
                    form.down('#montantCredit').setValue(me.getData().montantCredit);
                    form.down('#montantClient').setValue(me.getData().intCUSTPART);
                    form.down('#montantTotal').setValue(me.getData().intPRICE);
                    form.down('#montantRestant').setValue(me.getData().montantRestant);
                    form.down('#prenomAssure').setValue(me.getClient().strLASTNAME);
                    form.down('#nomAssure').setValue(me.getClient().strFIRSTNAME);
                    form.down('#numAssure').setValue(me.getClient().strNUMEROSECURITESOCIAL);
                    form.down('#nomAyantDroit').setValue(me.getAyantDroit().strFIRSTNAME);
                    form.down('#numAyantDroit').setValue(me.getAyantDroit().strNUMEROSECURITESOCIAL);
                    form.down('#prenomAyantDroit').setValue(me.getAyantDroit().strLASTNAME);
                    me.buildtierspayant();
                }
            }

        });
    },
    buildTpData: function (me) {
        const tpContainerForm = me.down('form').down('#tpContainer').down('#tpContainerform');
        const items = tpContainerForm.items;
        const tierspayants = [];
        Ext.each(items.items, function (item) {
            if (item.items) {
                let numBonCmp = item.down('textfield:first');
                let tauxCmp = item.down('textfield:last');
                let compteTpCmp = item.down('hiddenfield:first');
                let itemId = item.down('hiddenfield:last');
                tierspayants.push(
                        {
                            "compteTp": compteTpCmp.getValue(),
                            "numBon": numBonCmp.getValue(),
                            "taux": parseInt(tauxCmp.getValue()),
                            "itemId": itemId.getValue()
                        }
                );
            }
        });
        return tierspayants;
    },
    onSave: function (btn) {
        let wind = btn.up('window');
        let tierspayantArray = wind.buildTpData(wind);
        let data = {
            'clientId': wind.getClientId(),
            'ayantDroitId': wind.getAyantDroitId(),
            'venteId': wind.getData().lgPREENREGISTREMENTID,
            'tierspayants': tierspayantArray
        };
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/updateclientortierpayant',
            params: Ext.JSON.encode(data),
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    Ext.MessageBox.show({
                        title: 'Impression du ticket',
                        msg: 'Voulez-vous imprimer le ticket ?',
                        buttons: Ext.MessageBox.YESNO,
                        fn: function (button) {
                            if ('yes' == button) {
                                wind.onPrintTicket(result.refId);
                            }

                        },
                        icon: Ext.MessageBox.QUESTION
                    });
                    wind.destroy();
                    var xtype = "ventemanager";
                    testextjs.app.getController('App').onRedirectTo(xtype, {});
                } else {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: result.msg,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR

                    });
                }

            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'Un problème avec le serveur');
            }
        });
//       
    },
    onPrintTicket: function (id) {
        var url = '../api/v1/vente/ticket/vo/' + id;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            headers: {'Content-Type': 'application/json'},
            method: 'POST',
            url: url,
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
            },
            failure: function (response, options) {
                progress.hide();
            }

        });
    },
    buildNewTierspayantForm: function (me, field, itemId) {
        var groupesStore = new Ext.data.Store({
            model: 'testextjs.model.GroupeModel',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/groupe/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
        let formTp = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 340,
                    width: 600,
                    modal: true,
                    title: "Ajout un tiers-payant",
                    closeAction: 'hide',
                    closable: false,
                    maximizable: false,
                    layout: {
                        type: 'fit'

                    },
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
                                    text: 'Enregistrer',
                                    handler: function (btn) {
                                        me.addNewTiersPayant(btn, me, field, formTp, itemId);

                                    }
                                },
                                {
                                    xtype: 'button',
                                    iconCls: 'cancelicon',
                                    handler: function (btn) {
                                        formTp.destroy();
                                    },
                                    text: 'Annuler'

                                }
                            ]
                        }
                    ],
                    items: [{
                            xtype: 'form',
                            bodyPadding: 5,
                            layout: {
                                type: 'fit'

                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    title: '',
                                    defaultType: 'textfield',
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    items: [
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'Nom abrégé',
                                            emptyText: 'Nom abrégé',
                                            name: 'strNAME',
                                            itemId: 'strNAME',
                                            height: 30, flex: 1,
                                            allowBlank: false,
                                            enableKeyEvents: true,
                                            listeners: {
                                                afterrender: function (field) {
                                                    field.focus(false, 100);
                                                }
                                            }

                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'Nom complet',
                                            emptyText: 'Nom complet',
                                            itemId: 'strFULLNAME',
                                            name: 'strFULLNAME',
                                            height: 30, flex: 1,
                                            allowBlank: false,
                                            enableKeyEvents: true

                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'Téléphone',
                                            emptyText: 'Téléphone',
                                            itemId: 'strTELEPHONE',
                                            name: 'strTELEPHONE',
                                            allowBlank: false,
                                            maskRe: /[0-9.]/,
                                            height: 30, flex: 1,
                                            enableKeyEvents: true

                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'Adresse',
                                            emptyText: 'Adresse',
                                            itemId: 'strADRESSE',
                                            name: 'strADRESSE',
                                            allowBlank: false,
                                            height: 30, flex: 1,
                                            enableKeyEvents: true

                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'Code organisme',
                                            emptyText: 'Code organisme',
                                            itemId: 'strCODEORGANISME',
                                            name: 'strCODEORGANISME',
                                            allowBlank: false,
                                            height: 30, flex: 1,
                                            enableKeyEvents: true

                                        },
                                        {

                                            xtype: 'combobox',
                                            fieldLabel: 'Groupe',
                                            name: 'groupeId',
                                            itemId: 'groupeId',
                                            store: groupesStore,
                                            valueField: 'lg_GROUPE_ID',
                                            displayField: 'str_LIBELLE',
                                            typeAhead: true,
                                            height: 30, flex: 1,
                                            queryMode: 'remote',
                                            emptyText: 'Choisir un groupe...'

                                        }


                                    ]
                                }
                            ]
                        }

                    ]
                });

    },
    addNewTiersPayant: function (btn, me, field, formTp, itemId) {
        let typeTiersPayant = '2';
        if (me.getTypeVente() === '2') {
            typeTiersPayant = '1';
        }
        var _this = btn.up('window'), _form = _this.down('form');
        if (_form.isValid()) {
            var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/client/add-tierspayant/' + me.getClientId() + '/' + typeTiersPayant + '/' + me.getTaux(),
                params: Ext.JSON.encode(_form.getValues()),
                success: function (response, options) {
                    progress.hide();
                    var result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        formTp.destroy();
                        var tierspayant = result.data;
                        me.upadeTiersPayantContainer(me, tierspayant.strFULLNAME, tierspayant.lgTIERSPAYANTID, field.getValue(), itemId);
                        _this.destroy();
                        field.up('window').destroy();

                    } else {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 320,
                            msg: result.msg,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.ERROR

                        });
                    }

                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'server-side failure with status code ' + response.status);
                }

            });
        }
    },
    upadeTiersPayantData: function (fullName, lgTiersPayantId, rebonCmp, displayfieldCmp, hiddenfield, numBon) {
        displayfieldCmp.setValue(fullName);
        hiddenfield.setValue(lgTiersPayantId);
         console.log(hiddenfield);
        console.log(hiddenfield.getValue());
        rebonCmp.setValue(numBon);
        

    },

    upadeTiersPayantContainer: function (me, fullName, lgTiersPayantId, numBon, detailId, container) {
        var tpContainerForm = me.down('form').down('#tpContainer').down('#tpContainerform');
        if (container) {

            tpContainerForm.remove(container, true);
            tpContainerForm.update();
            tpContainerForm.doLayout();
        } else {
            tpContainerForm.removeAll();
        }

        let obj = {"numBon": numBon ? numBon : null, "tpFullName": fullName, "compteTp": lgTiersPayantId, "taux": me.getTaux(), "itemId": detailId};

        let cmp = me.buildCmp(obj);
        tpContainerForm.add(cmp);
    },
    createNewAyantDroit: function (me, field) {
        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 320,
                    width: 600,
                    modal: true,
                    title: "Ajout d'ayant droit",
                    closeAction: 'hide',
                    closable: false,
                    maximizable: false,
                    layout: {
                        type: 'fit'

                    },
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
                                    text: 'Enregistrer',
                                    handler: function (btn) {
                                        var _this = btn.up('window'), _form = _this.down('form');
                                        if (_form.isValid()) {
                                            var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                                            Ext.Ajax.request({
                                                method: 'POST',
                                                headers: {'Content-Type': 'application/json'},
                                                url: '../api/v1/client/ayant-droits/' + me.getClientId(),
                                                params: Ext.JSON.encode(_form.getValues()),
                                                success: function (response, options) {
                                                    progress.hide();
                                                    var result = Ext.JSON.decode(response.responseText, true);
                                                    if (result.success) {
                                                        form.destroy();
                                                        var ayant = result.data;
                                                        me.ayantDroit = ayant;
                                                        me.updateAyantDroitInfosContainer(me, {"strFIRSTNAME": ayant.strFIRSTNAME, "strLASTNAME": ayant.strLASTNAME, "strNUMEROSECURITESOCIAL": ayant.strNUMEROSECURITESOCIAL, "lgAYANTSDROITSID": ayant.lgAYANTSDROITSID});
                                                        field.up("window").destroy();
                                                    } else {
                                                        Ext.MessageBox.show({
                                                            title: 'Message d\'erreur',
                                                            width: 320,
                                                            msg: result.msg,
                                                            buttons: Ext.MessageBox.OK,
                                                            icon: Ext.MessageBox.ERROR

                                                        });
                                                    }

                                                },
                                                failure: function (response, options) {
                                                    progress.hide();
                                                    Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
                                                }

                                            });
                                        }


                                    }
                                },
                                {
                                    xtype: 'button',
                                    iconCls: 'cancelicon',
                                    handler: function (btn) {
                                        form.destroy();
                                    },
                                    text: 'Annuler'

                                }
                            ]
                        }
                    ],
                    items: [{
                            xtype: 'form',
                            bodyPadding: 5,
                            layout: {
                                type: 'fit'

                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    title: 'Ayant.Droits',
                                    defaultType: 'textfield',
                                    defaults: {
                                        anchor: '100%'
                                    },
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

                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'Prénom',
                                            emptyText: 'Prénom',
                                            name: 'strLASTNAME',
                                            height: 30, flex: 1,
                                            allowBlank: false,
                                            enableKeyEvents: true

                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'Matricule/SS',
                                            emptyText: 'Numéro de matricule ',
                                            name: 'strNUMEROSECURITESOCIAL',
                                            height: 30, flex: 1,
                                            enableKeyEvents: true

                                        },
                                        {
                                            xtype: "radiogroup",
                                            fieldLabel: "Genre",
                                            allowBlank: true,
                                            vertical: true,
                                            flex: 1,
                                            items: [
                                                {boxLabel: 'Féminin', name: 'strSEXE', inputValue: 'F'},
                                                {boxLabel: 'Masculin', name: 'strSEXE', inputValue: 'M'}
                                            ]
                                        },
                                        {
                                            xtype: 'datefield',
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
                            ]
                        }

                    ]
                });
    },
    updateAyantDroitInfosContainer: function (me, data) {
        me.down('form').down('#nomAyantDroit').setValue(data.strFIRSTNAME);
        me.down('form').down('#numAyantDroit').setValue(data.strNUMEROSECURITESOCIAL);
        me.down('form').down('#prenomAyantDroit').setValue(data.strLASTNAME);
        me.ayantDroitId = data.lgAYANTSDROITSID;

    }

});

