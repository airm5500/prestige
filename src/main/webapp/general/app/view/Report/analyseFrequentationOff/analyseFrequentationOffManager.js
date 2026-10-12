/* global Ext */

/*
 * Analyse de frequentation horaire (besoins du 11/10, point 12) : API REST v1/frequentation-horaire, choix de la tranche
 * (plages habituelles ou tranches regulieres de 1 a 6 h), tableau par tranche (ventes, montant, panier, quantites, part
 * du CA et des ventes), courbes dont l'infobulle donne la part de la tranche dans le chiffre d'affaires.
 */
Ext.define('testextjs.view.Report.analyseFrequentationOff.analyseFrequentationOffManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'analyseFrequentationOffManager',
    id: 'analyseFrequentationOffManagerID',
    title: 'Analyse de fréquentation par plage horaire',
    frame: true,
    width: '98%',
    height: 620,
    minHeight: 570,
    cls: 'custompanel',
    layout: {type: 'vbox', align: 'stretch'},

    initComponent: function () {
        var me = this;
        var nombre = function (v) {
            return Ext.util.Format.number(v || 0, '0,000');
        };
        var pourcent = function (v) {
            return Ext.util.Format.number(v || 0, '0.0') + ' %';
        };
        me.donnees = Ext.create('Ext.data.Store', {
            fields: ['tranche', {name: 'ventes', type: 'int'}, {name: 'montant', type: 'int'}, {name: 'panier', type: 'int'},
                {name: 'quantites', type: 'int'}, {name: 'partCa', type: 'float'}, {name: 'partVentes', type: 'float'}],
            data: []
        });
        me.items = [
            {
                xtype: 'gridpanel',
                itemId: 'grilleFrequentation',
                height: 260,
                store: me.donnees,
                features: [{ftype: 'summary'}],
                viewConfig: {emptyText: '<div style="padding:20px;text-align:center;">Pas de données sur la période</div>', deferEmptyText: false},
                columns: [
                    {text: 'Tranche horaire', dataIndex: 'tranche', flex: 1, summaryRenderer: function () {
                            return '<b>Total</b>';
                        }},
                    {text: 'Ventes', dataIndex: 'ventes', align: 'right', width: 90, renderer: nombre, summaryType: 'sum',
                        summaryRenderer: function (v) {
                            return '<b>' + nombre(v) + '</b>';
                        }},
                    {text: '% des ventes', dataIndex: 'partVentes', align: 'right', width: 105, renderer: pourcent},
                    {text: 'Montant', dataIndex: 'montant', align: 'right', width: 120, renderer: nombre, summaryType: 'sum',
                        summaryRenderer: function (v) {
                            return '<b>' + nombre(v) + '</b>';
                        }},
                    {text: '% du CA', dataIndex: 'partCa', align: 'right', width: 90, renderer: function (v) {
                            return '<b>' + pourcent(v) + '</b>';
                        }},
                    {text: 'Panier moyen', dataIndex: 'panier', align: 'right', width: 110, renderer: nombre},
                    {text: 'Quantités', dataIndex: 'quantites', align: 'right', width: 100, renderer: nombre, summaryType: 'sum',
                        summaryRenderer: function (v) {
                            return '<b>' + nombre(v) + '</b>';
                        }}
                ]
            },
            {
                xtype: 'chart',
                itemId: 'courbeFrequentation',
                flex: 1,
                animate: true,
                style: 'background:#fff',
                legend: {position: 'bottom'},
                store: me.donnees,
                axes: [
                    {type: 'Numeric', position: 'left', fields: ['ventes'], title: 'Nombre de ventes', minimum: 0, grid: true},
                    {type: 'Numeric', position: 'right', fields: ['montant'], title: 'Montant ventes', minimum: 0,
                        label: {renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000');
                            }}},
                    {type: 'Category', position: 'bottom', fields: ['tranche'], title: 'Tranche horaire'}
                ],
                series: [
                    me.serie('ventes', 'left', 'Nombre de ventes', '#3892d3'),
                    me.serie('montant', 'right', 'Montant ventes', '#cc3333')
                ]
            }
        ];
        me.dockedItems = [{
                xtype: 'toolbar',
                dock: 'top',
                items: [
                    {xtype: 'datefield', format: 'd/m/Y', submitFormat: 'Y-m-d', fieldLabel: 'Du', labelWidth: 20, width: 140,
                        itemId: 'debut', id: 'dt_start_Visitor', value: Ext.Date.getFirstDateOfMonth(new Date()), maxValue: new Date()},
                    {xtype: 'datefield', format: 'd/m/Y', submitFormat: 'Y-m-d', fieldLabel: 'Au', labelWidth: 20, width: 140,
                        itemId: 'fin', id: 'dt_end_Visitor', value: new Date(), maxValue: new Date()},
                    {xtype: 'combobox', itemId: 'tranche', fieldLabel: 'Tranche', labelWidth: 50, width: 210, editable: false,
                        queryMode: 'local', displayField: 'libelle', valueField: 'valeur', value: 0,
                        store: Ext.create('Ext.data.Store', {fields: ['valeur', 'libelle'], data: [
                                {valeur: 0, libelle: 'Plages habituelles'}, {valeur: 1, libelle: 'Toutes les heures'},
                                {valeur: 2, libelle: 'Toutes les 2 heures'}, {valeur: 3, libelle: 'Toutes les 3 heures'},
                                {valeur: 4, libelle: 'Toutes les 4 heures'}, {valeur: 6, libelle: 'Toutes les 6 heures'}]}),
                        listeners: {select: function () {
                                me.charger();
                            }}},
                    {xtype: 'button', itemId: 'rechercher', text: 'Rechercher', iconCls: 'searchicon', handler: function () {
                            me.charger();
                        }},
                    '->',
                    {xtype: 'button', itemId: 'imprimer', text: 'Imprimer', iconCls: 'printable',
                        tooltip: 'Impression des plages habituelles', handler: function () {
                            window.open('../webservices/Report/visitorstatistics/ws_visitorstatistics_pdf.jsp?dt_start_vente='
                                    + me.down('#debut').getSubmitValue() + '&dt_end_vente=' + me.down('#fin').getSubmitValue());
                        }}
                ]
            }];
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.charger();
        });
    },

    serie: function (champ, axe, titre, couleur) {
        var me = this;
        return {
            type: 'line', axis: axe, title: titre, xField: 'tranche', yField: champ, smooth: true,
            style: {stroke: couleur, 'stroke-width': 2},
            markerConfig: {type: 'circle', size: 4, radius: 4, fill: couleur, stroke: couleur},
            highlight: {size: 7, radius: 7},
            tips: {
                trackMouse: true, width: 240, height: 78,
                renderer: function (r) {
                    this.setTitle(Ext.String.htmlEncode(r.get('tranche')) + '<br>'
                            + Ext.util.Format.number(r.get('ventes'), '0,000') + ' ventes (' + Ext.util.Format.number(r.get('partVentes'), '0.0') + ' %)<br>'
                            + Ext.util.Format.number(r.get('montant'), '0,000') + ' — <b>' + Ext.util.Format.number(r.get('partCa'), '0.0') + ' % du CA</b>');
                }
            }
        };
    },

    charger: function () {
        var me = this;
        var debut = me.down('#debut').getSubmitValue(), fin = me.down('#fin').getSubmitValue();
        var tranche = me.down('#tranche').getValue();
        me.down('#imprimer').setDisabled(tranche !== 0);
        me.setLoading('Chargement…');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/frequentation-horaire',
            params: {debut: debut, fin: fin, tranche: tranche},
            success: function (response) {
                me.setLoading(false);
                var r = Ext.decode(response.responseText, true) || {};
                if (!r.success) {
                    me.donnees.removeAll();
                    Ext.MessageBox.alert('Fréquentation horaire', r.msg || 'Analyse impossible.');
                    return;
                }
                me.donnees.loadData(r.total && r.total.ventes > 0 ? r.data : []);
            },
            failure: function () {
                me.setLoading(false);
                Ext.MessageBox.alert('Fréquentation horaire', 'Le serveur n\'a pas répondu.');
            }
        });
    }
});
