
/* global Ext */

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.Report.RapportGestions.RapportGestionsGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.rapportGestionGrid-grid',
    initComponent: function () {
        var store = Ext.create('testextjs.store.Statistics.RapporGestions');
        store.on({
            'load': {
                fn: function (store, records, success, eOpts) {
                    var depenses = 0, reglement = 0;
//                    var record;

                    Ext.each(records, function (record, index, records) {
                        if (Number(record.get('STATUS')) === 3) {
                            depenses += Number(record.get('AMOUNT'));

                        }
                        if (Number(record.get('STATUS')) === 4) {
                            reglement += Number(record.get('AMOUNT'));

                        }
                    }

                    , this);
                    /* retours du 08/10 : chargement termine apres la fermeture de l'ecran -> champs deja detruits */
                    var totalDepenses = Ext.getCmp('TOTALDEPENSES'), totalReglement = Ext.getCmp('TOTALREGLEMENT');
                    if (totalDepenses) {
                        totalDepenses.setValue(depenses);
                    }
                    if (totalReglement) {
                        totalReglement.setValue(reglement);
                    }
                },
                scope: this
            }
        });

        Ext.apply(this, {
            features: [
                {
                    ftype: 'groupingsummary',
                    collapsible: true,
                    groupHeaderTpl: "{[values.rows[0].data.TYPEMVT]}",
                    hideGroupedHeader: true,
                    showSummaryRow: false
                }],
            id: 'rapportGrid',
            store: store,
            viewConfig: {
                forceFit: true,
                emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
            },
            columns: [
                {
                    header: '',
                    dataIndex: 'STATUS',
                    flex: 1

                },
                {
                    header: '',
                    dataIndex: 'DISPLAY',
                    flex: 1,
                    summaryType: "sum",
                    hidden: true

                },
                {
                    header: 'Libellé',
                    dataIndex: 'LIBELLE',
                    flex: 2
                },
                {
                    text: 'Montant',
                    dataIndex: 'AMOUNT',
                    flex: 1,
                    renderer: function (v, w, r) {
                        var statuts = Number(r.get('STATUS'));

                        if (statuts === 3) {
                            return "<span style='color:red;'>" + amountformat(v) + "<span>";
                        } else {
                            return amountformat(v);
                        }
                    },
                    align: 'right',
                    summaryType: "sum",
                    summaryRenderer: function (v, w, d) {

                        if (d.data.DISPLAY >= 3) {
                            return "<b style='color:blue;'>Total :" + amountformat(v) + "</b>";
                        } else {
                            return;
                        }
                    }
                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: false,
                items: [
                    {
                        xtype: 'displayfield',
                        fieldLabel: 'TOTAL DEPENSES',
                        labelWidth: 150,
                        id: 'TOTALDEPENSES',
                        fieldStyle: "color:red;font-weight:800;",
                        margin: '0 10 0 10',
                        renderer: function (value) {
                            return Ext.util.Format.number(value, '0,000') + " F";
                        }
                    },
                    {
                        xtype: 'displayfield',
                        fieldLabel: 'TOTAL REGLEMENTS',
                        labelWidth: 150,
                        id: 'TOTALREGLEMENT',
                        fieldStyle: "color:blue;font-weight:800;",
                        margin: '0 10 0 10',
                        renderer: function (value) {
                            return Ext.util.Format.number(value, '0,000') + " F";
                        }
                    }


                ]
            }
        });
        this.callParent();
    }
});


