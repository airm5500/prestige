/* global Ext */

Ext.define('testextjs.view.stockmanagement.valorisation.Valorisation', {
    extend: 'Ext.panel.Panel',
    xtype: 'valorisationstock',

    cls: 'pl-card',
    frame: true,
    title: 'Valorisation du stock',
    bodyPadding: 10,
    layout: { type: 'vbox', align: 'stretch' },
    width: 860,

    initComponent: function () {
        var me = this, itemsPerPage = 20;

        // ===== STORES =====
        var storeFamille = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.FamilleArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: { type: 'ajax', url: '../webservices/configmanagement/famillearticle/ws_data_other.jsp',
                reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });
        var storeZone = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: { type: 'ajax', url: '../webservices/configmanagement/zonegeographique/ws_data_other.jsp',
                reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });
        var storeGrossiste = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: { type: 'ajax', url: '../webservices/configmanagement/grossiste/ws_data_other.jsp',
                reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });
        var storeType = Ext.create('Ext.data.Store', {
            fields: ['value', 'label'],
            data: [
                { value: 0, label: 'Simple' },
                { value: 1, label: 'Famille' },
                { value: 2, label: 'Emplacement' },
                { value: 3, label: 'Grossiste' }
            ]
        });

        // ===== HELPERS =====
        var fmt = Ext.util.Format;
        var fmtMoney = fmt.numberRenderer('0,000.');
        function nn(v){ return (v === null || v === undefined) ? '' : v; }

        function toggleCriteria(val) {
            var f = Ext.getCmp('lg_FAMILLEARTICLE_ID'),
                z = Ext.getCmp('lg_ZONE_GEO_ID'),
                g = Ext.getCmp('lg_GROSSISTE_ID'),
                c = Ext.getCmp('contenaire_intervalle');
            f.hide(); z.hide(); g.hide();
            f.reset(); z.reset(); g.reset();
            c.hide(); Ext.getCmp('str_BEGIN').reset(); Ext.getCmp('str_END').reset();
            if (val === 1) f.show(); else if (val === 2) z.show(); else if (val === 3) g.show();
        }
        function maybeShowInterval(value) {
            var c = Ext.getCmp('contenaire_intervalle');
            if (value === '0') c.show(); else {
                c.hide(); Ext.getCmp('str_BEGIN').reset(); Ext.getCmp('str_END').reset();
            }
        }

        // ===== CHART STORE =====
        var chartStore = Ext.create('Ext.data.Store', {
            fields: ['label','value'],
            data: [{label:'Vente', value:0},{label:'Achat', value:0}]
        });

        // ===== UI FIELDS =====
        var userField = Ext.create('Ext.form.field.Display', {
            id: 'str_NAME_USER', fieldLabel: 'Utilisateur',
            fieldStyle: 'color:#1f4fde;font-weight:700;', value: ''
        });
        var dateSystem = Ext.create('Ext.form.field.Display', {
            id: 'dt_CREATED', fieldLabel: 'Date système',
            fieldStyle: 'color:green;font-weight:700;', value: ''
        });
        var dateJour = Ext.create('Ext.form.field.Date', {
            id: 'dt_periode', fieldLabel: 'Date',
            format: 'd/m/Y', submitFormat: 'Y-m-d', maxValue: new Date(), value: new Date()
        });

        var kpiVente = Ext.create('Ext.form.field.Display', {
            id: 'TOTAL_VENTE', fieldLabel: 'Valeur vente', value: fmtMoney(0),
            fieldStyle: 'font-size:1.3em;font-weight:900;color:#0d6efd;'
        });
        var kpiAchat = Ext.create('Ext.form.field.Display', {
            id: 'TOTAL_ACHAT', fieldLabel: 'Valeur achat', value: fmtMoney(0),
            fieldStyle: 'font-size:1.3em;font-weight:900;color:#0d6efd;'
        });

        var dfEcart = Ext.create('Ext.form.field.Display', {
            id: 'DF_ECART', fieldLabel: 'Écart', value: '0',
            labelWidth: 80, cls: 'pl-green-strong'
        });
        var dfMarge = Ext.create('Ext.form.field.Display', {
            id: 'DF_MARGE', fieldLabel: 'Marge', value: '0%',
            labelWidth: 80, cls: 'pl-green-strong'
        });

        // Raw (non formatés) pour calculs
        var hiddenRaw = { vente: 0, achat: 0 };

        var cbType = Ext.create('Ext.form.field.ComboBox', {
            id: 'str_TYPE_TRANSACTION', fieldLabel: 'Filtrer par',
            store: storeType, valueField: 'value', displayField: 'label',
            queryMode: 'local', editable: false, value: 0,
            listeners: { select: function (cmp) { toggleCriteria(cmp.getValue()); updateMirrors(); } }
        });
        var cbFamille = Ext.create('Ext.form.field.ComboBox', {
            id: 'lg_FAMILLEARTICLE_ID', fieldLabel: 'Famille article',
            store: storeFamille, hidden: true, valueField: 'lg_FAMILLEARTICLE_ID', displayField: 'str_LIBELLE',
            pageSize: itemsPerPage, typeAhead: true, minChars: 1, queryMode: 'remote', emptyText: 'Sélectionner…',
            listeners: { select: function (cmp) { maybeShowInterval(cmp.getValue()); } }
        });
        var cbZone = Ext.create('Ext.form.field.ComboBox', {
            id: 'lg_ZONE_GEO_ID', fieldLabel: 'Emplacement',
            store: storeZone, hidden: true, valueField: 'lg_ZONE_GEO_ID', displayField: 'str_LIBELLEE',
            pageSize: itemsPerPage, typeAhead: true, minChars: 1, queryMode: 'remote', emptyText: 'Sélectionner…',
            listeners: { select: function (cmp) { maybeShowInterval(cmp.getValue()); } }
        });
        var cbGrossiste = Ext.create('Ext.form.field.ComboBox', {
            id: 'lg_GROSSISTE_ID', fieldLabel: 'Grossiste',
            store: storeGrossiste, hidden: true, valueField: 'lg_GROSSISTE_ID', displayField: 'str_LIBELLE',
            pageSize: itemsPerPage, typeAhead: true, minChars: 1, queryMode: 'remote', emptyText: 'Sélectionner…',
            listeners: { select: function (cmp) { maybeShowInterval(cmp.getValue()); } }
        });

        var fcIntervalle = {
            xtype: 'fieldcontainer', id: 'contenaire_intervalle', fieldLabel: 'Intervalle', hidden: true,
            layout: 'hbox',
            items: [
                { xtype:'textfield', id:'str_BEGIN', fieldLabel:'De', labelAlign:'top', width:120, margin:'0 10 0 0' },
                { xtype:'textfield', id:'str_END', fieldLabel:'À', labelAlign:'top', width:120 }
            ]
        };

        var chartPanel = Ext.create('Ext.chart.Chart', {
            animate: true,
            store: chartStore,
            insetPadding: 10,
            flex: 1,
            series: [{
                type: 'pie',
                angleField: 'value',
                label: { field: 'label', display: 'rotate' },
                highlight: true,
                donut: 20,
                tips: {
                    trackMouse: true,
                    renderer: function (storeItem) {
                        this.setTitle(storeItem.get('label') + ': ' + fmtMoney(storeItem.get('value')));
                    }
                }
            }]
        });

        function buildParamsFromUI() {
            return {
                dtStart: Ext.getCmp('dt_periode').getSubmitValue(),
                mode: Ext.getCmp('str_TYPE_TRANSACTION').getValue(),
                lgGROSSISTEID: Ext.getCmp('lg_GROSSISTE_ID').getValue(),
                lgFAMILLEARTICLEID: Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue(),
                lgZONEGEOID: Ext.getCmp('lg_ZONE_GEO_ID').getValue(),
                END: Ext.getCmp('str_END').getValue(),
                BEGIN: Ext.getCmp('str_BEGIN').getValue()
            };
        }

        function updateMirrors() {
            var d = Ext.getCmp('dt_periode').getValue();
            Ext.getCmp('date_selected_mirror').setValue(d ? Ext.Date.format(d, 'd/m/Y') : '');
            var rec = storeType.findRecord('value', Ext.getCmp('str_TYPE_TRANSACTION').getValue());
            Ext.getCmp('mode_selected_mirror').setValue(rec ? rec.get('label') : '');
        }

        function updateKPIs(data, meta) {
            hiddenRaw.vente = Number(data.valueTwo || 0);
            hiddenRaw.achat = Number(data.value || 0);

            Ext.getCmp('TOTAL_VENTE').setValue(fmtMoney(hiddenRaw.vente));
            Ext.getCmp('TOTAL_ACHAT').setValue(fmtMoney(hiddenRaw.achat));

            // Écart + Marge (verts, gras, sous "Date système")
            var ecart = hiddenRaw.vente - hiddenRaw.achat;
            var margePct = hiddenRaw.vente ? ((ecart / hiddenRaw.vente) * 100) : 0;
            Ext.getCmp('DF_ECART').setValue(fmt.number(ecart, '0,000.'));
            Ext.getCmp('DF_MARGE').setValue(fmt.number(margePct, '0,0.00') + '%');

            // Chart
            chartStore.loadData([
                { label: 'Vente', value: hiddenRaw.vente },
                { label: 'Achat', value: hiddenRaw.achat }
            ]);

            // Header infos
            Ext.getCmp('str_NAME_USER').setValue(meta.user || '');
            Ext.getCmp('dt_CREATED').setValue(meta.dtCREATED || '');

            // Print ON
            Ext.getCmp('btn_print').setDisabled(false);
        }

        function callValorisation(params) {
            var progress = Ext.MessageBox.wait('Veuillez patienter…', 'En cours de traitement');
            Ext.Ajax.request({
                method: 'GET',
                url: '../api/v1/produit/valorisation',
                timeout: 6000000,
                params: params,
                success: function (resp) {
                    progress.hide();
                    var json = Ext.JSON.decode(resp.responseText, true) || {},
                        data = json.data || {};
                    updateKPIs(data, json);
                },
                failure: function () {
                    progress.hide();
                    Ext.Msg.alert('Erreur', 'Échec de la valorisation. Réessayez.');
                }
            });
        }

        function exportCSV() {
            var p = buildParamsFromUI();
            var rec = storeType.findRecord('value', p.mode);
            var modeLabel = rec ? rec.get('label') : '';
            var ecart = hiddenRaw.vente - hiddenRaw.achat;
            var margePct = hiddenRaw.vente ? ((ecart / hiddenRaw.vente) * 100) : 0;

            var rows = [];
            rows.push(['Date', 'Mode', 'Famille', 'Emplacement', 'Grossiste', 'Intervalle De', 'Intervalle À',
                       'Valeur Vente', 'Valeur Achat', 'Écart', 'Marge %']);
            rows.push([
                nn(p.dtStart), modeLabel,
                nn(Ext.getCmp('lg_FAMILLEARTICLE_ID').getRawValue()),
                nn(Ext.getCmp('lg_ZONE_GEO_ID').getRawValue()),
                nn(Ext.getCmp('lg_GROSSISTE_ID').getRawValue()),
                nn(p.BEGIN), nn(p.END),
                hiddenRaw.vente, hiddenRaw.achat, ecart, Ext.util.Format.number(margePct, '0.00')
            ]);

            var csv = rows.map(function (r) {
                return r.map(function (c) {
                    var s = String(nn(c)).replace(/"/g, '""');
                    return /[",;\n]/.test(s) ? '"' + s + '"' : s;
                }).join(';');
            }).join('\n');

            var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            var url = (window.URL || window.webkitURL).createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'valorisation.csv';
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                (window.URL || window.webkitURL).revokeObjectURL(url);
            }, 100);
        }

        Ext.apply(me, {
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'top',
                items: [
                    { xtype: 'tbtext', text: '<span class="pl-title">Valorisation du stock</span>' },
                    '->',
                    dateJour,
                    { xtype: 'tbspacer', width: 10 },
                    {
                        xtype: 'button', text: 'Actualiser', iconCls: 'refreshicon',
                        handler: function () {
                            Ext.getCmp('btn_print').setDisabled(true);
                            callValorisation({ dtStart: Ext.getCmp('dt_periode').getSubmitValue(), mode: 0 });
                        }
                    },
                    { xtype: 'button', text: 'Export CSV', iconCls: 'excelicon', handler: exportCSV }
                ]
            }],

            items: [
                // Header + KPIs + Graph + Infos
                {
                    xtype: 'container',
                    layout: { type: 'hbox', align: 'stretch' },
                    defaults: { xtype: 'container', padding: 10, style: 'margin-bottom:10px;' },
                    items: [
                        {
                            xtype: 'container', cls: 'pl-card', flex: 1, layout: 'anchor',
                            items: [
                                userField,
                                dateSystem
                                
                            ]
                        },
                        {
                            xtype: 'container', cls: 'pl-card', flex: 1, layout: 'anchor',
                            items: [ kpiVente,kpiAchat,
                                { xtype: 'component', height: 6 },
                                dfEcart,
                                dfMarge ]
                        }/*,
                        {
                            xtype: 'container', cls: 'pl-card', flex: 1, layout: 'anchor',
                            items: [ kpiAchat ]
                        }*/
                    ]
                },
                {
                    xtype: 'container',
                    layout: { type: 'hbox', align: 'stretch' },
                    height: 260,
                    items: [
                        {
                            xtype: 'fieldset', title: 'Détails', flex: 1, style: 'margin-right:10px;border-radius: 10px;',
                            defaults: { anchor: '100%' },
                            items: [
                                { xtype: 'displayfield', fieldLabel: 'Date sélectionnée', value: Ext.Date.format(new Date(), 'd/m/Y'), id: 'date_selected_mirror' },
                                { xtype: 'displayfield', fieldLabel: 'Mode', value: 'Simple', id: 'mode_selected_mirror' }
                            ]
                        },
                        {
                            xtype: 'fieldset', title: 'Critères', flex: 1.1, style: 'margin-right:10px;border-radius: 10px;',
                            defaults: { anchor: '100%' },
                            items: [ cbType, cbFamille, cbZone, cbGrossiste, fcIntervalle ]
                        },
                        {
                            xtype: 'fieldset', title: 'Graphique', flex: 1.2,style: 'margin-right:10px;border-radius: 10px;',
                            layout: 'fit',
                            items: [ chartPanel ]
                        }
                    ]
                }
            ],

            buttons: [
                {
                    text: 'Valoriser le stock', id: 'btn_valoriser', minWidth: 160,
                    handler: function () {
                        Ext.getCmp('btn_print').setDisabled(true);
                        callValorisation(buildParamsFromUI());
                    }
                },
                {
                    text: 'Imprimer', id: 'btn_print', disabled: true, minWidth: 120,
                    handler: function () {
                        var p = buildParamsFromUI();
                        var linkUrl = '../SockServlet?mode=VALORISATION'
                            + '&dtStart=' + nn(p.dtStart)
                            + '&action=' + nn(p.mode)
                            + '&lgGROSSISTEID=' + nn(p.lgGROSSISTEID)
                            + '&lgFAMILLEARTICLEID=' + nn(p.lgFAMILLEARTICLEID)
                            + '&lgZONEGEOID=' + nn(p.lgZONEGEOID)
                            + '&END=' + nn(p.END)
                            + '&BEGIN=' + nn(p.BEGIN);
                        window.open(linkUrl);
                    }
                }
            ]
        });

        // Miroirs simples
        Ext.getCmp('dt_periode').on('change', updateMirrors);
        Ext.getCmp('str_TYPE_TRANSACTION').on('change', updateMirrors);

        me.callParent(arguments);

        // Chargement initial
        Ext.getCmp('btn_print').setDisabled(true);
        callValorisation({ dtStart: Ext.getCmp('dt_periode').getSubmitValue(), mode: 0 });
        updateMirrors();
    }
});
