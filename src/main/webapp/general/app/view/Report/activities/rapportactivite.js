/* global Ext */

Ext.define('testextjs.view.Report.activities.rapportactivite', {
    extend: 'Ext.panel.Panel',
    xtype: 'activitiessummary',
    initComponent: function () {
        var me = this;
        var castore = new Ext.data.Store({
            fields: [
                {name: 'montTTC', type: 'string'},
                {name: 'montHT', type: 'string'},
                {name: 'remiseHT', type: 'string'},
                {name: 'montantHTCNET', type: 'string'},
                {name: 'montTTC', type: 'string'},
                {name: 'VNO', type: 'string'},
                {name: 'VO', type: 'string'},
                {name: 'datatva', type: 'auto'},
                {name: 'name', type: 'string'},
                {name: 'montant', type: 'string'},
                {name: 'value', type: 'number'},
                {name: 'recettes', type: 'auto'},
                {name: 'achats', type: 'auto'}

            ],
            proxy: {
                type: 'ajax',
                url: '../webservices/Report/recapactivities/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }

        });
        var mvtstore = new Ext.data.Store({
            fields: [
                {name: 'mvt', type: 'string'},
                {name: 'montant', type: 'string'},
                {name: 'totalmvt', type: 'number'}
            ],
            proxy: {
                type: 'ajax',
                url: '../webservices/Report/recapactivities/ws_mvts.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }

        });
        var achatsgrossisstes = new Ext.data.Store({
            fields: [
                {name: 'grossiste', type: 'string'},
                {name: 'th', type: 'string'},
                {name: 'ttc', type: 'string'}, {name: 'tva', type: 'string'}
            ],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../webservices/Report/recapactivities/ws_achats.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }

        });
        var totauxstore = new Ext.data.Store({
            fields: [
                {name: 'montant', type: 'string'},
                {name: 'nbclient', type: 'string'},
                {name: 'nb', type: 'string'}
            ],
            autoLoad: true,
            pageSize: 1,
            proxy: {
                type: 'ajax',
                url: '../webservices/Report/recapactivities/ws_totaux.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }

        });

        var reglementStore = new Ext.data.Store({
            fields: [
                {name: 'montant', type: 'string'},
                {name: 'montantfact', type: 'string'},
                {name: 'rest', type: 'string'},
                {name: 'code', type: 'string'},
                {name: 'nametp', type: 'string'},
                {name: 'nametypetp', type: 'string'}
            ],
            autoLoad: true,
            pageSize: 10,
            proxy: {
                type: 'ajax',
                url: '../webservices/Report/recapactivities/ws_reglements.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }

        });
        var storeCredits = new Ext.data.Store({
            fields: [
                {name: 'montant', type: 'string'},
                {name: 'nb', type: 'string'},
                {name: 'name', type: 'string'},
                {name: 'nametype', type: 'string'},
                {name: 'nbclient', type: 'string'}
            ],
            pageSize: 10,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../webservices/Report/recapactivities/ws_credits.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }

        });
        var tplca = Ext.create("Ext.XTemplate",
                '<table class="caTTCtable"> <tplfor="."><tr class="cadata"><td>CA Total HT:</td> <td>{montHT}</td>  <td>Total remise:</td> <td>{remiseHT}</td>  </tr><tr><td>Total Net:</td>\n\
  <td>{montantHTCNET}</td>  <td>Chiffre d\'Affaire TTC:</td><td>{montTTC} </td></tr></tpl></table>'
                );
        var tpltva = Ext.create("Ext.XTemplate",
                '<table class="caTTCtable"> <tplfor="."><tr class="tvadata"><td>{name}</td> <td>{montant}</td> </tr></tpl></table>'

                );
        var tplcmt = Ext.create("Ext.XTemplate",
                '<table class="caTTCtable"> <tplfor="."><tr class="cmpdata"><td>Comptant:</td> <td>{VNO}</td></tr><tr><td>Crédit:</td> <td>{VO}</td></tr></tpl></table>'
                );
        var tplrecette = Ext.create("Ext.XTemplate",
                '<ul class="ulrecette"> <tplfor="."><li class="recettitem"><span> Ventes {name}: </span><span>{montant} CFA</span></li></tpl></ul>'
                );
        var tplmvt = Ext.create("Ext.XTemplate",
                '<ul class="ulrecette"> <tplfor="."><li class="mvttitem"><span> {mvt}: </span><span>{montant} CFA</span></li></tpl></ul>'
                );
        var tplMarge = Ext.create("Ext.XTemplate",
                '<table class="caTTCtable" style="width: 100%;" > <tplfor="."><tr class="margeitem"><td>Total HT:</td> <td>{th} CFA</td>  <td>Total TVA:</td> <td>{tva} CFA</td> <td>Total TTC:</td> <td>{ttc} CFA</td><td>Marge:</td> <td>{marge} CFA</td><td>Ratio:</td> <td>{ratio}</td> </tr></tpl></table>'
                );
        var tplgrossistes = Ext.create("Ext.XTemplate",
                '<table class="cagrossiste"><thead><tr><th></th><th>MONTANT HT </th><th>MONTANT TVA</th><th>MONTANT TTC</th></tr></thead><tbody> <tplfor="."><tr class="grositem"><td>{grossiste}</td><td style="text-align: right;">{th} CFA</td>  <td style="text-align: right;">{tva} CFA</td><td style="text-align: right;">{ttc} CFA</td></tr></tpl></tbody></table>'
                );
        var tvaStore = Ext.create("Ext.data.Store", {
            fields: ["name", "montant", "value"],
            data: []
        });
        var tvaCmt = Ext.create("Ext.data.Store", {
            fields: ["VNO", "VO"],
            data: []
        });
        var recettes = Ext.create("Ext.data.Store", {
            fields: ["name", "montant"],
            data: []
        });
        var achatsstore = Ext.create("Ext.data.Store", {
            fields: ["th", "ttc", "marge", "ratio", "tva"],
            data: []
        });
        castore.on({
            'load': {
                fn: function (store, records, success, eOpts) {
                    tvaStore.removeAll();
                    tvaCmt.removeAll();
                    recettes.removeAll();
                    achatsstore.removeAll();
                    Ext.each(records, function (record, index, records) {
                        tvaCmt.add({'VNO': record.get('VNO'), 'VO': record.get('VO')});
                        Ext.each(record.data.datatva, function (r, i) {

                            tvaStore.add(r);
                        });
                        Ext.each(record.data.recettes, function (r, i) {

                            recettes.add(r);
                        });
                        Ext.each(record.data.achats, function (r, i) {

                            achatsstore.add(r);
                        });
                    }, this);
                },
                scope: this
            }
        });
        castore.load();


        totauxstore.on({
            'load': {
                fn: function (store, records, success, eOpts) {

                    Ext.each(records, function (record, index, records) {

                        Ext.getCmp("totalnb").setValue(record.get('nb'));
                        Ext.getCmp("totalmontant").setValue(record.get('montant'));
                        Ext.getCmp("totalnbclient").setValue(record.get('nbclient'));
                    }, this);

                },
                scope: this
            }
        });

        mvtstore.on({
            'load': {
                fn: function (store, records, success, eOpts) {
                    var total = 0;
                    Ext.each(records, function (record, index, records) {
                        total += Number(record.get('totalmvt'));

                    }, this);
                    Ext.getCmp('totalmvt').setValue(total);
                },
                scope: this
            }
        });
        mvtstore.load();
        var myCAview = Ext.create('Ext.view.View', {
            store: castore, tpl: tplca,
            padding: 5,
            flex: 2,
            itemSelector: 'tr.cadata',
            emptyText: ''
        });
        var myTVAview = Ext.create('Ext.view.View', {
            store: tvaStore, tpl: tpltva,
            padding: 5,
            flex: 1,
            itemSelector: 'tr.tpltva',
            emptyText: ''
        });
        var mytplcmt = Ext.create('Ext.view.View', {
            store: tvaCmt, tpl: tplcmt,
            padding: 5,
            flex: 1,
            itemSelector: 'tr.cmpdata',
            emptyText: ''
        });
        var recetteView = Ext.create('Ext.view.View', {
            store: recettes, tpl: tplrecette,
            padding: 5,
            width: '100%',
            itemSelector: 'li.recettitem',
            emptyText: ''
        });
        var mvtsView = Ext.create('Ext.view.View', {
            store: mvtstore, tpl: tplmvt,
            padding: 5,
            width: '100%',
            itemSelector: 'li.mvttitem',
            emptyText: ''
        });
        var viewMarge = Ext.create('Ext.view.View', {
            store: achatsstore, tpl: tplMarge,
            padding: 5,
            width: '100%',
            itemSelector: 'tr.margeitem',
            emptyText: ''
        });
        var viewGRo = Ext.create('Ext.view.View', {
            store: achatsgrossisstes, tpl: tplgrossistes,
            padding: 5,
            width: '100%',
            itemSelector: 'tr.grositem',
            emptyText: ''
        });
        me.title = 'Récapitulatif activité',
                me.width = '98%',
//                me.height = 570,
                me.minHeight = 800,
//                me.maxHeight = 800,
                me.autoScroll = true,
//        me.frame = true,
                me.items = [
                    {
                        xtype: 'fieldset',
                        collapsible: false,
                        layout: 'hbox',
                        title: '',
                        margin: '5',
                        items: [
                            {
                                xtype: 'container',
                                layout: 'hbox',
                                margin: '5 15 5 5',
                                items: [
                                    {
                                        xtype: 'datefield',
                                        format: 'd/m/Y',
                                        emptyText: 'Date debut',
                                        submitFormat: 'Y-m-d',
                                        fieldLabel: 'Du',
                                        labelWidth: 30,
                                        margin: '0 10 0 0',
                                        value: new Date(),
                                        width: 350,
                                        id: 'dt_start_activities',
                                        listeners: {
                                            change: function () {
                                                Ext.getCmp('dt_end_activities').setMinValue(this.getValue());
                                            }
                                        }

                                    }, {
                                        xtype: 'tbseparator'
                                    },
                                    {
                                        xtype: 'datefield',
                                        format: 'd/m/Y',
                                        emptyText: 'Date fin',
                                        submitFormat: 'Y-m-d',
                                        fieldLabel: 'Au',
                                        labelWidth: 30,
                                        value: new Date(),
                                        width: 350,
                                        id: 'dt_end_activities',
                                        listeners: {
                                            change: function () {
                                                Ext.getCmp('dt_start_activities').setMaxValue(this.getValue());
                                            }
                                        }

                                    }
                                    ,
                                    {

                                        xtype: 'button',
                                        style: 'margin-left:5px;',
                                        iconCls: 'activitiessearch',
                                        text: 'Rechercher',
                                        handler: function () {
                                            var dt_start_activities = Ext.getCmp('dt_start_activities').getSubmitValue();
                                            var dt_end_activities = Ext.getCmp('dt_end_activities').getSubmitValue();
                                            castore.load({
                                                params: {
                                                    dt_end: dt_end_activities,
                                                    dt_start: dt_start_activities

                                                }
                                            });
                                            mvtstore.load({
                                                params: {
                                                    dt_end: dt_end_activities,
                                                    dt_start: dt_start_activities

                                                }
                                            });
                                            achatsgrossisstes.load({
                                                params: {
                                                    dt_end: dt_end_activities,
                                                    dt_start: dt_start_activities

                                                }
                                            });

                                            storeCredits.load({
                                                params: {
                                                    dt_end: dt_end_activities,
                                                    dt_start: dt_start_activities,
                                                    search_value: Ext.getCmp('crediSearch').getValue()

                                                }
                                            });
                                            totauxstore.load({
                                                params: {
                                                    dt_end: dt_end_activities,
                                                    dt_start: dt_start_activities,
                                                    search_value: Ext.getCmp('crediSearch').getValue()

                                                }
                                            });
                                            reglementStore.load({
                                                params: {
                                                    dt_end: dt_end_activities,
                                                    dt_start: dt_start_activities,
                                                    search_value: Ext.getCmp('regSearch').getValue()

                                                }
                                            });
                                        }

                                    },
                                    {

                                        // width: 100,
                                        xtype: 'button',
                                        style: 'margin-left:5px;',
                                        iconCls: 'activitiessearch',
                                        text: 'Imprimer',
                                        listeners: {
                                            click: function () {

                                                var search_value = Ext.getCmp('regSearch').getValue();
                                                var search = Ext.getCmp('crediSearch').getValue();
                                                var dt_start_activities = Ext.getCmp('dt_start_activities').getSubmitValue();
                                                var dt_end_activities = Ext.getCmp('dt_end_activities').getSubmitValue();
                                                var linkUrl = "../webservices/Report/recapactivities/ws_generate_pdf.jsp" + "?dt_end=" + dt_end_activities + "&dt_start=" + dt_start_activities + "&search_value=" + search_value + "&search=" + search;
                                                window.open(linkUrl);
                                            }
                                        }


                                    }

                                ]
                            }
                        ]
                    },
                    {
                        xtype: 'panel',
                        title: 'CHIFFRE D\'AFFAIRE',
                        width: '99%',
                        margin: '5',
                        id: 'panelca',
                        layout: 'hbox',
                        border: true,
                        items: [myCAview, myTVAview, mytplcmt]
                    },
                    {
                        xtype: 'panel',
                        title: 'RECETTES',
                        width: '99%',
                        margin: '5',
                        id: 'panelrc',
                        layout: 'fit',
                        border: true,
                        items: [recetteView]
                    },
                    {
                        xtype: 'panel',
                        title: 'MOUVEMENTS DE CAISSE',
                        width: '99%',
                        margin: '5',
                        id: 'panelmv',
                        layout: 'vbox',
                        border: true,
                        items: [mvtsView, {

                                xtype: 'displayfield',
                                fieldLabel: 'Total mouvements',
                                labelWidth: 120,
                                id: 'totalmvt',
                                fieldStyle: "color:blue;font-weight:800;",
                                margin: '0 10 0 50',
                                renderer: function (value) {
                                    return Ext.util.Format.number(value, '0,000') + " CFA";
                                }

                            }]
                    },
                    {
                        xtype: 'panel',
                        title: 'ACHATS',
                        width: '99%',
                        margin: '5',
                        id: 'panelorders',
                        layout: 'vbox',
                        border: true,
                        items: [viewMarge, viewGRo]
                    },
                    {
                        xtype: 'panel',
                        title: 'CREDITS ACCORDES',
                        width: '99%',
                        margin: '5',
                        id: 'panelcredit',
                        // layout:'fit',
                        border: true,
                        dockedItems: [{
                                xtype: "toolbar",
                                dock: "top",
                                items: [{
                                        xtype: "tbtext",
                                        text: "Recherche"
                                    },
                                    "-",
                                    {
                                        xtype: "textfield",
                                        emptyText: 'Recherche',
                                        id: 'crediSearch',
                                        width: 350,
                                        enableKeyEvents: true,
                                        listeners: {
                                            specialKey: function (field, e, options) {
                                                if (e.getKey() === e.ENTER) {
                                                    var grid = Ext.getCmp('crditacordeID');

                                                    var dt_end = Ext.getCmp('dt_end_activities').getSubmitValue();
                                                    var dt_start = Ext.getCmp('dt_start_activities').getSubmitValue();
                                                    grid.getStore().load({
                                                        params: {
                                                            dt_end: dt_end,
                                                            dt_start: dt_start,
                                                            search_value: field.getValue()

                                                        }
                                                    });
                                                    totauxstore.load({
                                                        params: {
                                                            dt_end: dt_end,
                                                            dt_start: dt_start,
                                                            search_value: field.getValue()

                                                        }
                                                    });
                                                }
                                            }
                                        }

                                    }

                                ]

                            }

                        ],
                        items: [

                            /*************************/
                            {
                                xtype: 'grid',
                                id: 'crditacordeID',
                                store: storeCredits,
                                columns: [{
                                        header: 'Nom TP',
                                        dataIndex: 'name',
                                        flex: 1

                                    },
                                    {
                                        header: 'Type',
                                        dataIndex: 'nametype',
                                        flex: 1

                                    },
                                    {
                                        header: 'Nb.Bons',
                                        dataIndex: 'nb',
                                        align: 'right',
                                        flex: 1
                                    },
                                    {
                                        header: 'Montant',
                                        dataIndex: 'montant',
                                        align: 'right',
                                        flex: 1
                                    },
                                    {
                                        header: 'Nb.Clients',
                                        dataIndex: 'nbclient',
                                        align: 'right',
                                        flex: 1
                                    }
                                ],

                                bbar: {
                                    xtype: 'pagingtoolbar',
                                    store: storeCredits,
                                    dock: 'bottom',
                                    pageSize: 10,
                                    displayInfo: true,
                                    listeners: {
                                        beforechange: function (page, currentPage) {
                                            var myProxy = this.store.getProxy();
                                            myProxy.params = {

                                                dt_start: '',
                                                dt_end: '',
                                                search_value: ''
                                            };
                                            var dt_end = Ext.getCmp('dt_end_activities').getSubmitValue();
                                            var dt_start = Ext.getCmp('dt_start_activities').getSubmitValue();

                                            var search_value = Ext.getCmp('crediSearch').getValue();
                                            myProxy.setExtraParam('dt_start', dt_start);
                                            myProxy.setExtraParam('dt_end', dt_end);
                                            myProxy.setExtraParam('search_value', search_value);

                                        }

                                    },
                                    items: [

                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Total Nb Bons',
                                            labelWidth: 110,
                                            id: 'totalnb',
                                            fieldStyle: "color:blue;font-weight:800;",
                                            margin: '0 10 0 10'
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Total Montant',
                                            labelWidth: 110,
                                            id: 'totalmontant',
                                            fieldStyle: "color:blue;font-weight:800;",
                                            margin: '0 10 0 10'
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: ' Total Nb Clients',
                                            labelWidth: 110,
                                            id: 'totalnbclient',
                                            fieldStyle: "color:blue;font-weight:800;",
                                            margin: '0 10 0 10'
                                        }


                                    ]
                                }
                            }


                            /********end ***********************/
                        ]
                    },
                    {
                        xtype: 'panel',
                        title: 'REGLEMENTS TP / TP',
                        width: '99%',
                        margin: '5',
                        id: 'panelrgtp',
                        border: true,
                        dockedItems: [{
                                xtype: "toolbar",
                                dock: "top",
                                items: [{
                                        xtype: "tbtext",
                                        text: "Recherche"
                                    },
                                    "-",
                                    {
                                        xtype: "textfield",
                                        emptyText: 'Recherche',
                                        id: 'regSearch',
                                        width: 350,
                                        enableKeyEvents: true,

                                        listeners: {
                                            specialKey: function (field, e, options) {
                                                if (e.getKey() === e.ENTER) {
                                                    var grid = Ext.getCmp('regID');

                                                    var dt_end = Ext.getCmp('dt_end_activities').getSubmitValue();
                                                    var dt_start = Ext.getCmp('dt_start_activities').getSubmitValue();


                                                    grid.getStore().load({
                                                        params: {
                                                            dt_end: dt_end,
                                                            dt_start: dt_start,
                                                            search_value: field.getValue()

                                                        }
                                                    });
                                                }
                                            }
                                        }

                                    }

                                ]

                            }

                        ],
                        items: [

                            {
                                xtype: 'grid',
                                id: 'regID',
                                store: reglementStore,
                                columns: [{
                                        header: 'Nom TP',
                                        dataIndex: 'nametp',
                                        flex: 1

                                    },
                                    {
                                        header: 'Type',
                                        dataIndex: 'nametypetp',
                                        flex: 1

                                    },
                                    {
                                        header: 'Facture',
                                        dataIndex: 'code',
                                        flex: 1

                                    },
                                    {
                                        header: 'Montant Facture',
                                        dataIndex: 'montantfact',
                                        align: 'right',
                                        flex: 1
                                    },
                                    {
                                        header: 'Montant Régl',
                                        dataIndex: 'montant',
                                        align: 'right',
                                        flex: 1
                                    },
                                    {
                                        header: 'Montant Restant',
                                        dataIndex: 'rest',
                                        align: 'right',
                                        flex: 1
                                    }
                                ],

                                bbar: {
                                    xtype: 'pagingtoolbar',
                                    store: reglementStore,
                                    dock: 'bottom',
                                    pageSize: 10,
                                    displayInfo: true,
                                    listeners: {
                                        beforechange: function (page, currentPage) {
                                            var myProxy = this.store.getProxy();
                                            myProxy.params = {

                                                dt_start: '',
                                                dt_end: '',
                                                search_value: ''
                                            };
                                            var dt_end = Ext.getCmp('dt_end_activities').getSubmitValue();
                                            var dt_start = Ext.getCmp('dt_start_activities').getSubmitValue();

                                            var search_value = Ext.getCmp('regSearch').getValue();
                                            myProxy.setExtraParam('dt_start', dt_start);
                                            myProxy.setExtraParam('dt_end', dt_end);
                                            myProxy.setExtraParam('search_value', search_value);

                                        }

                                    }
                                }
                            }

                        ]
                    }

                ];
        me.callParent();
    }
});