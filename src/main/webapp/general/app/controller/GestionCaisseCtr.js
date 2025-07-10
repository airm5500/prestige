/* global Ext */

Ext.define('testextjs.controller.GestionCaisseCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.caisseManager.GestionCaisse'],
    refs: [{
            ref: 'gestcaissemanager',
            selector: 'gestcaissemanager'
        },
        {
            ref: 'imprimerBtn',
            selector: 'gestcaissemanager #imprimer'
        },
        {
            ref: 'totalAmount',
            selector: 'gestcaissemanager #totalAmount'
        },

        {
            ref: 'listeCaisseGrid',
            selector: 'gestcaissemanager gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'gestcaissemanager listeCaisseGrid pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'gestcaissemanager #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'gestcaissemanager  #dtEnd'
        },

        {ref: 'userComboField',
            selector: 'gestcaissemanager #user'
        },
        {ref: 'rechercherButton',
            selector: 'gestcaissemanager #rechercher'

        }




    ],
    init: function (application) {
        this.control({
            'gestcaissemanager gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'gestcaissemanager #rechercher': {
                click: this.doSearch
            },
            'gestcaissemanager #imprimer': {
                click: this.onPdfClick
            },

            'gestcaissemanager #reglement': {
                select: this.doSearch
            },
            'gestcaissemanager #user': {
                select: this.doSearch
            },
            'gestcaissemanager gridpanel': {
                viewready: this.doInitStore
            },

            "gestcaissemanager gridpanel actioncolumn": {
                toprint: this.toprint,
                valider: this.valider,
                annuler: this.annuler,
                showReglment: this.showReglment

            },
            'gestcaissemanager #dtStart': {
                afterrender: this.setdate
            }

        });
    },
    showReglment: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;

        const ligneResumeCaisses = record.get('ligneResumeCaisses');
       

        const form = Ext.create('Ext.window.Window',
                {

                    autoShow: true,
                    height: 340,
                    width: '35%',
                    modal: true,
                    title: 'Détails règlement',
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
                                    iconCls: 'cancelicon',
                                    handler: function (btn) {
                                        form.destroy();
                                    },
                                    text: 'Fermer'

                                }
                            ]
                        }
                    ],
                    items: [
                        {
                            xtype: 'container',
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    flex: 1,
                                    layout: {
                                        type: 'vbox',
                                        align: 'stretch'
                                    },
                                    defaults: {
                                        xtype: 'displayfield',
                                        fieldStyle: "color:blue;font-weight:bold;font-size:1em",
                                        labelWidth: 100
                                    },
                                    collapsible: false,
                                    title: 'Ventes',
                                    items: me.buildReglements(ligneResumeCaisses)
                                },
                                {
                                    xtype: 'fieldset',
                                    flex: 1,
                                    layout: {
                                        type: 'vbox',
                                        align: 'stretch'
                                    },
                                    defaults: {
                                        xtype: 'displayfield',
                                        fieldStyle: "color:blue;font-weight:bold;font-size:1em",
                                        labelWidth: 100
                                    },
                                    collapsible: false,
                                    title: 'Mouvements de caisse',
                                    items: me.buildReglements(record.get('ligneReglements'))
                                }
                            ]
                        }

                    ]
                });




    },
    buildReglements: function (reglements) {
        let datas = [];

        Ext.each(reglements, function (item) {
            console.log(item);
            datas.push(
                    {
                        fieldLabel: item.libelleReglement,
                        flex: 1,
                        value: item.montant,
                        renderer: function (v) {
                            return Ext.util.Format.number(v, '0,000.');
                        }
                    }
            );

        });

        return datas;
    },
    toprint: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        me.onPrintBilletage(record.get('ldCAISSEID'));
    },
    annuler: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        me.onRemoveClick(record);
    },
    valider: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        me.onValidateClotureClick(record);
    },
    setdate: function (cmp) {
        const CurrentDate = new Date();
        CurrentDate.setMonth(CurrentDate.getMonth() - 1);
        cmp.setValue(CurrentDate);

    },
    handleActionColumn: function (view, rowIndex, colIndex, item, e, r, row) {
        const me = this;
        const store = me.getListeCaisseGrid().getStore(),
                rec = store.getAt(colIndex);

        if (parseInt(item) === 12) {
            me.onRemoveClick(rec);
        } else if (parseInt(item) === 11) {
            me.onPrintBilletage(rec.get('ldCAISSEID'));
        } else if (parseInt(item) === 10) {
            me.onValidateClotureClick(rec);
        }

    },
    onValidateClotureClick: function (rec) {
        const me = this;
        Ext.MessageBox.confirm('Message',
                'Confirmer la validation de la cloture de la caisse de  ' + rec.get('userFullName'),
                function (btn) {
                    if (btn == 'yes') {
                        Ext.Ajax.request({
                            method: 'PUT',
                            url: '../api/v1/caisse/validatecloture/' + rec.get('ldCAISSEID'),
                            success: function (response)
                            {
                                const object = Ext.JSON.decode(response.responseText, false);
                                if (!object.success) {
                                    Ext.MessageBox.alert('Error Message', object.msg);
                                    return;
                                } else {
                                    Ext.MessageBox.alert(' Message', "Opération effectuée");
                                }
                                me.doSearch();
                            },
                            failure: function (response)
                            {

                            }
                        });
                    }
                });


    },
    onPrintBilletage: function (id) {
        const linkUrl = '../webservices/sm_user/gestcaisse/ws_generate_pdf.jsp?lg_CAISSE_ID=' + id;
        window.open(linkUrl);

    },
    onRemoveClick: function (rec) {
        const me = this;
        Ext.MessageBox.confirm('Message',
                'Voulez-Vous annuler la cloture de la caisse de ' + rec.get('userFullName'),
                function (btn) {
                    if (btn === 'yes') {

                        Ext.Ajax.request({
                            timeout: 240000,
                            method: 'PUT',
                            url: '../api/v1/caisse/rollbackclose/' + rec.get('ldCAISSEID'),
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (!object.success) {
                                    Ext.MessageBox.alert('Error Message', object.msg);
                                    return;
                                } else {
                                    Ext.MessageBox.alert(' Message', "Opération effectuée");
                                }

                                me.doSearch();
                            },
                            failure: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });

    },
    onPdfClick: function () {
        const me = this;
        let userId = '';
        let user = me.getUserComboField().getValue();
        if (user != null && user != '') {
            userId = user;

        }
        const dtStart = me.getDtStart().getSubmitValue();
        const dtEnd = me.getDtEnd().getSubmitValue();

        const linkUrl = '../BalancePdfServlet?mode=GESTION_CAISSE&dtStart=' + dtStart + '&dtEnd=' + dtEnd + "&userId=" + userId;
        window.open(linkUrl);
    },

    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getListeCaisseGrid().getStore().getProxy();
        myProxy.params = {
            userId: null,
            dtStart: null,
            dtEnd: null

        };
        myProxy.setExtraParam('userId', me.getUserComboField().getValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

    },
    doMetachange: function (store, meta) {
        const me = this;
        me.getTotalAmount().setValue(meta.summary);

    },
    doInitStore: function () {
        const me = this;
        me.getListeCaisseGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();

    },

    doSearch: function () {
        const me = this;
        me.getListeCaisseGrid().getStore().load({
            params: {
                userId: me.getUserComboField().getValue(),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()

            }
        });
    }
});