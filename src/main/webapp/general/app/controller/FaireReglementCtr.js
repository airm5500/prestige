
/* global Ext */

Ext.define('testextjs.controller.FaireReglementCtr', {
    extend: 'Ext.app.Controller',
    models: [
        'testextjs.model.caisse.ClientLambda'

    ],
    views: [
        'testextjs.view.reglement.FaireReglement'
    ],
    config: {
        current: null,
        selected: []

    },
    refs: [

        {
            ref: 'fairereglement',
            selector: 'fairereglement'
        },
        {
            ref: 'client',
            selector: 'fairereglement #client'
        },
        {ref: 'gridReglement',
            selector: 'fairereglement gridpanel'
        },
        {ref: 'adresse',
            selector: 'fairereglement #adresse'
        },
        {ref: 'matricule',
            selector: 'fairereglement #matricule'
        },
        {ref: 'dtStart',
            selector: 'fairereglement #dtStart'
        },
        {ref: 'dtEnd',
            selector: 'fairereglement #dtEnd'
        },
        {ref: 'nature',
            selector: 'fairereglement #nature'
        },
        {ref: 'dtReglement',
            selector: 'fairereglement #dtReglement'
        },

        {ref: 'montantRestant',
            selector: 'fairereglement #montantRestant'
        },
        {ref: 'nb',
            selector: 'fairereglement #nb'
        },
        {ref: 'selectALL',
            selector: 'fairereglement #selectALL'
        },
        {ref: 'typeReglement',
            selector: 'fairereglement #typeReglement'
        },
        {ref: 'cbContainer',
            selector: 'fairereglement #cbContainer'
        },
        {ref: 'refCb',
            selector: 'fairereglement #refCb'
        },
        {ref: 'banque',
            selector: 'fairereglement #banque'
        },
        {ref: 'lieuxBanque',
            selector: 'fairereglement #lieuxBanque'
        },
        {ref: 'montantRecu',
            selector: 'fairereglement #montantRecu'
        },
        {ref: 'montantRemis',
            selector: 'fairereglement #montantRemis'
        },
        {ref: 'montantNet',
            selector: 'fairereglement #montantNet'
        },
        {ref: 'cbContainer',
            selector: 'fairereglement #cbContainer'
        },
        {ref: 'montantPayer',
            selector: 'fairereglement #montantPayer'
        }


    ],
    init: function () {
        this.control(
                {
                    'fairereglement': {
                        render: this.onReady
                    }, 'fairereglement #client': {
                        select: this.onClientSelect
                    },

                    'fairereglement #btnGoBack': {
                        click: this.goBack
                    },
                    'fairereglement #btnValider': {
                        click: this.doReglement
                    },
                    'fairereglement [xtype=gridpanel] pagingtoolbar': {
                        beforechange: this.doBeforechange
                    },
                    'fairereglement #rechercher': {
                        click: this.doSearch
                    },
                    'fairereglement gridpanel': {
                        viewready: this.doInitStore,
                        select: this.onSelect,
                        deselect: this.onDeselect
                    },
                    'fairereglement #typeReglement': {
                        select: this.typeReglementSelectEvent
                    },
                    'fairereglement #nature': {
                        select: this.natureSelectEvent
                    },

                    'fairereglement #montantRecu': {
                        change: this.montantRecuChangeListener,
                        specialkey: this.onMontantRecuVnoKey
                    }
                });
    },
    onMontantRecuVnoKey: function (field, e, options) {
        var me = this;
        if (e.getKey() === e.ENTER) {
            if (field.getValue()) {
                me.doReglement();
            }
        }

    },
    monnaiRendue: function (montantRecu) {
        var me = this;
        var vnomontantRemise = me.getMontantRemis();
        var montantPayer = me.getMontantPayer();
        var nature = me.getNature().getValue();
        var totalRecap = me.getMontantRestant().getValue();
        var monnais = 0;
        if (montantRecu > 0) {
            var netTopay = nature === 2 ? totalRecap : me.getMontantNet().getValue();
            monnais = (montantRecu > netTopay) ? montantRecu - netTopay : 0;
            vnomontantRemise.setValue(monnais);
            if (monnais > 0) {
                montantPayer.setValue(0);
            } else {
                montantPayer.setValue(netTopay - montantRecu);
            }
        } else if (montantRecu <= 0) {
            vnomontantRemise.setValue(0);
            montantPayer.setValue(netTopay);

        }
    },
    montantRecuChangeListener: function (field, value, options) {
        var me = this;
        let montantRecu = parseInt(field.getValue());
        me.monnaiRendue(montantRecu);
    },

    natureSelectEvent: function (field) {
        let me = this;
        me.monnaiRendue(parseInt(me.getMontantRecu().getValue()));
    },
    onSelect: function (_this, record, index) {
        var me = this;
        var total = 0;
        Ext.each(_this.getSelection(), function (item) {
            total += item.get('montantRegle');

        });
        me.getMontantNet().setValue(total);
        me.selected = [];
        me.selected = _this.getSelection().map(function (e) {
            return e.data.id;
        });
    },
    onDeselect: function (_this, record, index) {
        var total = 0;
        var me = this;
        Ext.each(_this.getSelection(), function (item) {
            total += item.get('montantRegle');

        });
        me.getMontantNet().setValue(total);
        me.selected = [];
        me.selected = _this.getSelection().map(function (e) {
            return e.data.id;
        });

    },

    typeReglementSelectEvent: function (field) {
        let me = this;
        let value = field.getValue().trim();
        let nature = me.getNature().getValue();
        if (value === '1' || value === '7' || value === '8' || value === '8') {
            me.getMontantRecu().enable();
            me.getMontantRecu().setReadOnly(false);
            me.getCbContainer().hide();
        } else {

            if (nature === 2) {
                if (value === '2' || value === '3' || value === '6') {
                    me.showAndHideCbInfos(value);
                    me.getMontantRecu().setValue(me.getMontantNet().getValue());
                    me.getMontantRecu().disable();

                }
            } else {
                if (value === '2' || value === '3' || value === '6') {
                    me.showAndHideCbInfos0(value);
                    me.getMontantRecu().enable();
                    me.getMontantRecu().setReadOnly(false);
                }

            }


        }
    },
    showAndHideCbInfos: function (v) {
        var me = this;
        if (v === '2' || v === '3' || v === '6') {
            me.getCbContainer().show();
            if (v !== '6') {
                me.getRefCb().setFieldLabel('NOM');
                me.getMontantRecu().setReadOnly(true);
            } else {
                me.getRefCb().setFieldLabel('REFERENCE');
                me.getMontantRecu().setReadOnly(false);
            }
        } else {

            me.getCbContainer().hide();
        }
    },

    showAndHideCbInfos0: function (v) {
        var me = this;
        if (v === '2' || v === '3' || v === '6') {
            me.getCbContainer().show();
            if (v !== '6') {
                me.getRefCb().setFieldLabel('NOM');

            } else {
                me.getRefCb().setFieldLabel('REFERENCE');

            }
        } else {

            me.getCbContainer().hide();
        }
    },
    updateCombox: function (x) {
        var me = this;
        me.getTypeReglement().getStore().load(function (records, operation, success) {
            me.getTypeReglement().setValue('1');
        });

        if (x) {
            me.getClient().getStore().load(function (records, operation, success) {
                me.getClient().setValue(x);
            });
        } else {
            me.getClient().clearValue();
            me.getClient().setValue(null);
        }

    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getGridReglement().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            userId: null,
            pairclient: true

        };

        myProxy.setExtraParam('pairclient', true);
        myProxy.setExtraParam('userId', me.getClient().getValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());

    },

    doInitStore: function () {
        var me = this;

        me.doSearch();
    },

    doSearch: function () {
        var me = this;
        if (me.getClient().getValue()) {
            me.getGridReglement().getStore().load({
                params: {
                    dtStart: me.getDtStart().getSubmitValue(),
                    dtEnd: me.getDtEnd().getSubmitValue(),
                    userId: me.getClient().getValue(),
                    pairclient: true

                },
                callback: function (records, operation, successful) {
                    var total = 0, nb = 0;
                    Ext.each(records, function (item) {
                        total += item.get('montantAttendu');
                        nb++;
                    });
                    me.getMontantRestant().setValue(total);
                    me.getMontantNet().setValue(total);
                    me.getMontantPayer().setValue(total);
                    me.getNb().setValue(nb);
                }
            });
        }

    }
    ,
    onReady: function () {
        var me = this;
        var me = this, view = me.getFairereglement();
        var data = view.getData();
        if (data) {
            var isEdit = data.isEdit;
            if (isEdit) {
            } else {
                me.current = null;

                me.updateCombox(null);
            }
        } else {
            me.current = null;

            me.updateCombox(null);
        }

    },

    onClientSelect: function (cmp) {
        var me = this;
        var record = cmp.findRecord("lgCLIENTID", cmp.getValue());
        me.getMatricule().setValue(record.get('strNUMEROSECURITESOCIAL'));
        me.getAdresse().setValue(record.get('strADRESSE'));
        me.doSearch();

    },

    goBack: function () {
        var xtype = 'delayed';
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    onPrintTicket: function (id) {
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            url: '../api/v1/reglement/ticket/' + id,
            method: 'PUT',
            success: function (response)
            {
                progress.hide();


            },
            failure: function (response)
            {
                progress.hide();
            }
        });
    },

    doReglement: function () {
        var me = this;
        var nature = me.getNature().getValue();
        var mode = me.getTypeReglement().getValue();
        var clientId = me.getClient().getValue();
        var nom = "", banque = "", lieux = "";
        if (mode !== '1') {
            if (me.getRefCb()) {
                nom = me.getRefCb().getValue();
                banque = me.getBanque().getValue();
                lieux = me.getLieuxBanque().getValue();
            }
        }
        var dateReglement = me.getDtReglement().getSubmitValue();
        var totalRecap = me.getMontantRestant().getValue();
        var montantNet = me.getMontantNet().getValue();
        var montantRecu = me.getMontantRecu().getValue();
        var montantRemis = (montantRecu > montantNet) ? montantRecu - montantNet : 0;
        var montantPaye = montantRecu - montantRemis;

        if (nature === 2) {
            if (montantRecu < totalRecap) {
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 320,
                    msg: "Veuillez saisir un montant correspondant au total à payer; ou choisr l'option règlement partiel",
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.ERROR,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            me.getMontantRecu().focus(true, 100);
                        }
                    }
                });
                return;
            } else {

                var dtStart = me.getDtStart().getSubmitValue(),
                        dtEnd = me.getDtEnd().getSubmitValue();
                var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                Ext.Ajax.request({
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    url: '../api/v1/reglement/reglementdiffere-all',
                    params: Ext.JSON.encode({
                        "montantRecu": montantRecu,
                        "montantRemis": montantRemis,
                        "montantPaye": montantPaye,
                        "clientId": clientId,
                        "typeRegleId": mode,
                        "nom": nom,
                        "totalRecap": totalRecap,
                        "banque": banque,
                        "lieux": lieux,
                        "userVendeurId": dtStart,
                        "compteClientId": dtEnd,
                        "natureVenteId": dateReglement
                    }),
                    success: function (response, options) {
                        var result = Ext.JSON.decode(response.responseText, true);
                        progress.hide();
                        if (result.success) {

                            Ext.MessageBox.show({
                                title: 'Impression du ticket',
                                msg: 'Voulez-vous imprimer le ticket ?',
                                buttons: Ext.MessageBox.YESNO,
                                fn: function (button) {
                                    if ('yes' == button)
                                    {
                                        me.onPrintTicket(result.ref);
                                    }
                                    me.goBack();

                                },
                                icon: Ext.MessageBox.QUESTION
                            });
                        } else {
                            Ext.MessageBox.show({
                                title: 'Message d\'erreur',
                                width: 320,
                                msg: result.msg,
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.ERROR,
                                fn: function (buttonId) {
                                    if (buttonId === "ok") {
                                        me.getMontantRecu().focus(true, 100);
                                    }
                                }
                            });
                        }

                    },
                    failure: function (response, options) {
                        progress.hide();
                         Ext.MessageBox.alert('Error Message', response.responseText);
                      
                    }

                });
            }

        } else {
            if (montantRecu > 0) {
                var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                Ext.Ajax.request({
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    url: '../api/v1/reglement/reglementdiffere',
                    params: Ext.JSON.encode({
                        "montantRecu": montantRecu,
                        "montantRemis": montantRemis,
                        "montantPaye": montantPaye,
                        "clientId": clientId,
                        "typeRegleId": mode,
                        "nom": nom,
                        "banque": banque,
                        "lieux": lieux,
                        "totalRecap": totalRecap,
                        "natureVenteId": dateReglement,
                        "commentaire": JSON.stringify(me.getSelected())
                    }),
                    success: function (response, options) {
                        var result = Ext.JSON.decode(response.responseText, true);
                        progress.hide();
                        if (result.success) {

                            Ext.MessageBox.show({
                                title: 'Impression du ticket',
                                msg: 'Voulez-vous imprimer le ticket ?',
                                buttons: Ext.MessageBox.YESNO,
                                fn: function (button) {
                                    if ('yes' == button)
                                    {
                                        me.onPrintTicket(result.ref);
                                    }
                                    me.goBack();

                                },
                                icon: Ext.MessageBox.QUESTION
                            });
                        } else {
                            Ext.MessageBox.show({
                                title: 'Message d\'erreur',
                                width: 320,
                                msg: result.msg,
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.ERROR,
                                fn: function (buttonId) {
                                    if (buttonId === "ok") {
                                        me.getMontantRecu().focus(true, 100);
                                    }
                                }
                            });
                        }

                    },
                    failure: function (response, options) {
                        progress.hide();
                        Ext.Msg.alert("Message", 'Erreur du serveur ' + response.status);
                    }

                });

            }
        }
    }


}
);
