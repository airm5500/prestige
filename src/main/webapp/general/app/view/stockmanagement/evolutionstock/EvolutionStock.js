/* global Ext */

/*
 * Ecran "Evolution Stock" (menu Gestion du Stock).
 * Affiche l'evolution de la valorisation du stock sur une periode :
 *   - deux champs date (dtStart, dtEnd),
 *   - un bouton rechercher,
 *   - une courbe d'evolution de la valeur d'achat (avec tooltip),
 *   - une grille recapitulative,
 *   - un bouton imprimer.
 * API : ../api/v1/valorisation/all?dtStart=YYYY-MM-DD&dtEnd=YYYY-MM-DD
 * (retourne une liste d'objets {date, valeurAchat, valeurVente}).
 */
Ext.define('testextjs.view.stockmanagement.evolutionstock.EvolutionStock', {
    extend: 'Ext.panel.Panel',
    xtype: 'evolutionstock',
    id: 'evolutionstockID',
    requires: [
        'Ext.chart.*',
        'Ext.grid.*',
        'Ext.data.*',
        'Ext.form.field.Date'
    ],
    title: 'Evolution Stock',
    closable: false,
    frame: true,
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    width: '98%',
    height: 600,
    // Periode par defaut : 30 jours
    nbJoursDefaut: 30,
    initComponent: function () {
        var me = this;

        var today = new Date();
        var defautDebut = Ext.Date.add(today, Ext.Date.DAY, -me.nbJoursDefaut);

        var store = new Ext.data.Store({
            fields: [
                {name: 'date', type: 'string'},
                {name: 'valeurAchat', type: 'float'},
                {name: 'valeurVente', type: 'float'}
            ],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/valorisation/all',
                reader: {
                    type: 'json'
                    // la reponse est un tableau JSON a la racine
                },
                timeout: 2400000
            }
        });
        me.evolutionStore = store;

        Ext.apply(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            labelWidth: 25,
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y',
                            maxValue: new Date(),
                            value: defautDebut
                        }, {
                            xtype: 'tbseparator'
                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 25,
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y',
                            maxValue: new Date(),
                            value: today
                        }, {
                            xtype: 'tbseparator'
                        }, {
                            text: 'Rechercher',
                            tooltip: 'Rechercher',
                            iconCls: 'searchicon',
                            scope: me,
                            handler: me.doSearch
                        }, {
                            xtype: 'tbseparator'
                        }, {
                            text: 'Imprimer',
                            tooltip: 'Imprimer',
                            iconCls: 'printable',
                            scope: me,
                            handler: me.doPrint
                        }, '->', {
                            xtype: 'displayfield',
                            fieldLabel: 'Valeur achat moy.',
                            labelWidth: 110,
                            itemId: 'moyenneAchat',
                            fieldStyle: 'color:blue;font-weight:800;',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            value: 0
                        }
                    ]
                }
            ],
            items: [
                {
                    xtype: 'chart',
                    itemId: 'evolutionChart',
                    animate: true,
                    border: false,
                    flex: 1,
                    style: 'background:#fff',
                    store: store,
                    legend: {
                        position: 'bottom'
                    },
                    axes: [
                        {
                            type: 'Numeric',
                            position: 'left',
                            grid: true,
                            fields: ['valeurAchat'],
                            title: "Valeur d'achat",
                            minimum: 0
                        },
                        {
                            type: 'Category',
                            position: 'bottom',
                            fields: ['date'],
                            title: 'Date',
                            label: {
                                rotate: {degrees: 315}
                            }
                        }
                    ],
                    series: [
                        {
                            type: 'line',
                            axis: 'left',
                            xField: 'date',
                            yField: 'valeurAchat',
                            title: "Valeur d'achat",
                            smooth: true,
                            highlight: {
                                size: 7,
                                radius: 7
                            },
                            markerConfig: {
                                type: 'circle',
                                size: 4,
                                radius: 4
                            },
                            tips: {
                                trackMouse: true,
                                style: 'font-size:11px;background:#fff;color:#6D6D6D;',
                                width: 200,
                                height: 45,
                                renderer: function (storeItem) {
                                    this.setTitle(storeItem.get('date') + '<br/>Valeur achat : <span style="color:blue;font-weight:600;">'
                                            + Ext.util.Format.number(storeItem.get('valeurAchat'), '0,000') + '</span>');
                                }
                            }
                        }
                    ]
                },
                {
                    xtype: 'grid',
                    itemId: 'evolutionGrid',
                    flex: 1,
                    store: store,
                    columnLines: true,
                    columns: [
                        {
                            header: 'Date',
                            dataIndex: 'date',
                            flex: 1
                        },
                        {
                            header: "Valeur d'achat",
                            dataIndex: 'valeurAchat',
                            flex: 1,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }
                        },
                        {
                            header: 'Valeur de vente',
                            dataIndex: 'valeurVente',
                            flex: 1,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }
                        }
                    ]
                }
            ]
        });

        me.callParent(arguments);

        // Chargement initial sur la periode par defaut
        me.on('afterrender', me.doSearch, me, {single: true, delay: 100});
    },
    getPeriode: function () {
        var me = this;
        return {
            dtStart: me.down('#dtStart'),
            dtEnd: me.down('#dtEnd')
        };
    },
    doSearch: function () {
        var me = this;
        var p = me.getPeriode();
        var dtStartField = p.dtStart;
        var dtEndField = p.dtEnd;
        var dtStart = dtStartField.getValue();
        var dtEnd = dtEndField.getValue();

        if (Ext.isEmpty(dtStart) || Ext.isEmpty(dtEnd)) {
            Ext.MessageBox.alert('Information', 'Veuillez renseigner les deux dates.');
            return;
        }
        if (dtStart > dtEnd) {
            Ext.MessageBox.alert('Information', 'La date de debut doit etre anterieure ou egale a la date de fin.');
            return;
        }

        var progress = Ext.MessageBox.wait('Chargement . . .', 'Veuillez patienter');
        me.evolutionStore.load({
            params: {
                dtStart: dtStartField.getSubmitValue(),
                dtEnd: dtEndField.getSubmitValue()
            },
            callback: function (records, operation, success) {
                progress.hide();
                if (!success) {
                    Ext.MessageBox.alert('Erreur', 'Impossible de recuperer les donnees de valorisation.');
                    return;
                }
                // Valeur d'achat moyenne sur la periode
                var total = 0, n = me.evolutionStore.getCount();
                me.evolutionStore.each(function (r) {
                    total += (r.get('valeurAchat') || 0);
                });
                var moyenne = n > 0 ? Math.round(total / n) : 0;
                var champMoyenne = me.down('#moyenneAchat');
                if (champMoyenne) {
                    champMoyenne.setValue(moyenne);
                }
            }
        });
    },
    // Edition PDF via JasperReports (rp_evolution_stock.jrxml)
    doPrint: function () {
        var me = this;
        var p = me.getPeriode();
        var dtStartField = p.dtStart;
        var dtEndField = p.dtEnd;
        if (Ext.isEmpty(dtStartField.getValue()) || Ext.isEmpty(dtEndField.getValue())) {
            Ext.MessageBox.alert('Information', 'Veuillez renseigner les deux dates.');
            return;
        }
        var progress = Ext.MessageBox.wait('Generation du PDF . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            url: '../api/v1/valorisation/all/pdf',
            method: 'GET',
            params: {
                dtStart: dtStartField.getSubmitValue(),
                dtEnd: dtEndField.getSubmitValue()
            },
            timeout: 2400000,
            success: function (resp) {
                progress.hide();
                var r = Ext.JSON.decode(resp.responseText, true);
                if (r && r.success && r.url) {
                    window.open(r.url);
                } else {
                    Ext.MessageBox.alert('Impression', "La generation du PDF n'a pas abouti.");
                }
            },
            failure: function () {
                progress.hide();
                Ext.MessageBox.alert('Impression', "La generation du PDF a echoue.");
            }
        });
    }
});
