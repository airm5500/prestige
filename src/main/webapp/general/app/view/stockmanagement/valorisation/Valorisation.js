/* global Ext */

Ext.define('testextjs.view.stockmanagement.valorisation.Valorisation', {
    extend: 'Ext.panel.Panel',
    xtype: 'valorisationstock',
    requires: ['testextjs.view.stockmanagement.inventaire.action.selectionCriteres'],

    cls: 'pl-card',
    frame: true,
    title: 'Valorisation du stock',
    bodyPadding: 10,
    layout: { type: 'vbox', align: 'stretch' },
    width: 920,

    initComponent: function () {
        var me = this, itemsPerPage = 20;

        // ===== Couleurs des onglets (entetes) =====
        var ACCENT = { rayon: '#1e8e3e', reserve: '#e8830c', total: '#1457d6' };

        // Injection CSS (entetes colorees + animation onglet actif)
        (function injectCss() {
            if (document.getElementById('valo-tab-css')) { return; }
            var css = [
                '.pl-tab-rayon .x-tab-inner{color:' + ACCENT.rayon + ' !important;font-weight:800;font-size:14px;line-height:24px;}',
                '.pl-tab-reserve .x-tab-inner{color:' + ACCENT.reserve + ' !important;font-weight:800;font-size:14px;line-height:24px;}',
                '.pl-tab-total .x-tab-inner{color:' + ACCENT.total + ' !important;font-weight:800;font-size:14px;line-height:24px;}',
                // Centre verticalement le libelle sur la hauteur de son montant (les champs de
                // formulaire ExtJS sont des tableaux : la cellule du libelle est alignee en haut
                // par defaut, d'ou le decalage avec les grandes polices).
                '.valo-kpi .x-field-label-cell{vertical-align:middle !important;}',
                '.valo-kpi .x-form-item-label{padding-top:0 !important;}',
                '.x-tab-active.pl-tab-rayon{background:#e7f5ec;border-bottom:3px solid ' + ACCENT.rayon + ';}',
                '.x-tab-active.pl-tab-reserve{background:#fdf0e1;border-bottom:3px solid ' + ACCENT.reserve + ';}',
                '.x-tab-active.pl-tab-total{background:#e8f0fe;border-bottom:3px solid ' + ACCENT.total + ';}',
                '.pl-tab-pulse{animation:plPulse .6s ease;}',
                '@keyframes plPulse{0%{transform:scale(1);}50%{transform:scale(1.10);}100%{transform:scale(1);}}'
            ].join('');
            var style = document.createElement('style');
            style.id = 'valo-tab-css';
            style.type = 'text/css';
            style.appendChild(document.createTextNode(css));
            document.getElementsByTagName('head')[0].appendChild(style);
        })();

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

        // Donnees brutes par onglet
        var raw = {
            rayon:   { achat: 0, vente: 0 },
            reserve: { achat: 0, vente: 0 },
            total:   { achat: 0, vente: 0 }
        };
        var chartStores = {};

        // Axe du widget de selection multiple selon le mode (memes axes que la creation d'inventaire)
        var AXES = { 1: 'Famille', 2: 'Emplacement', 3: 'Grossiste' };

        function criteresPanel() {
            return me.down('#valoCriteres');
        }
        function idsCoches() {
            var p = criteresPanel();
            return p ? p.getValeurs() : [];
        }
        // Modes Famille/Emplacement/Grossiste : la selection se fait desormais par cases a
        // cocher (widget de la creation d'inventaire). Les anciennes combos a choix unique et
        // l'intervalle De/A restent masques : cocher remplace les deux usages.
        function toggleCriteria(val) {
            var f = Ext.getCmp('lg_FAMILLEARTICLE_ID'),
                z = Ext.getCmp('lg_ZONE_GEO_ID'),
                g = Ext.getCmp('lg_GROSSISTE_ID'),
                c = Ext.getCmp('contenaire_intervalle'),
                w = criteresPanel();
            f.hide(); z.hide(); g.hide();
            f.reset(); z.reset(); g.reset();
            c.hide(); Ext.getCmp('str_BEGIN').reset(); Ext.getCmp('str_END').reset();
            if (AXES[val]) {
                w.show();
                w.changerAxe(AXES[val]);
            } else {
                w.hide();
            }
        }
        // Dans les modes a cases, au moins un element doit etre coche : sans coche, on informe
        // et on n'execute rien (demande explicite : pas de valorisation implicite du tout).
        function controleSelection() {
            var mode = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
            if (AXES[mode] && idsCoches().length === 0) {
                // Ext.Msg.show avec largeur explicite : la boite par defaut de Ext.Msg.alert
                // est trop etroite et tronque la seconde ligne du message.
                Ext.Msg.show({
                    title: 'Aucun élément coché',
                    msg: 'Cochez au moins un élément (' + AXES[mode].toLowerCase() + ') à valoriser,<br/>'
                            + 'ou repassez le filtre sur « Simple » pour tout valoriser.',
                    buttons: Ext.Msg.OK,
                    icon: Ext.Msg.INFO,
                    width: 460
                });
                return false;
            }
            return true;
        }
        function maybeShowInterval(value) {
            var c = Ext.getCmp('contenaire_intervalle');
            if (value === '0') c.show(); else {
                c.hide(); Ext.getCmp('str_BEGIN').reset(); Ext.getCmp('str_END').reset();
            }
        }

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

        var cbType = Ext.create('Ext.form.field.ComboBox', {
            id: 'str_TYPE_TRANSACTION', fieldLabel: 'Filtrer par',
            store: storeType, valueField: 'value', displayField: 'label',
            queryMode: 'local', editable: false, value: 0,
            listeners: { select: function (cmp) { toggleCriteria(cmp.getValue()); updateMirrors(); } }
        });
        // Tri du detail imprime (PDF et Excel) : alphanumerique sur le code ou sur le
        // libelle. Sans effet sur l'ecran, qui n'affiche que les totaux.
        var storeTri = Ext.create('Ext.data.Store', {
            fields: ['value', 'label'],
            data: [
                { value: 'libelle', label: 'Libellé (A → Z)' },
                { value: 'code', label: 'Code (A → Z)' }
            ]
        });
        var cbTri = Ext.create('Ext.form.field.ComboBox', {
            id: 'str_TRI_IMPRESSION', fieldLabel: 'Trier par',
            store: storeTri, valueField: 'value', displayField: 'label',
            queryMode: 'local', editable: false, value: 'libelle',
            tooltip: 'Ordre des lignes sur les impressions et l’export Excel'
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

        // ===== Construction d'un onglet KPI =====
        function buildKpiTab(key, titleText, headCls, accent) {
            var chartStore = Ext.create('Ext.data.Store', {
                fields: ['label', 'value'],
                data: [{ label: 'Vente', value: 0 }, { label: 'Achat', value: 0 }]
            });
            chartStores[key] = chartStore;
            return {
                xtype: 'panel',
                title: titleText,
                stockKey: key,
                tabConfig: { cls: headCls, height: 32 },
                bodyPadding: 12,
                layout: { type: 'hbox', align: 'stretch' },
                items: [
                    {
                        // Valeurs agrandies et centrees verticalement : l'onglet occupe toute la
                        // hauteur disponible (surtout en mode Simple) et le camembert de droite
                        // est grand — des petites polices a cote paraissaient perdues.
                        xtype: 'container', flex: 1,
                        layout: { type: 'vbox', align: 'stretch', pack: 'center' },
                        // Libelles agrandis ; le centrage vertical libelle/montant est fait en
                        // CSS (classe valo-kpi : vertical-align middle sur la cellule du
                        // libelle), plus fiable qu'un padding calcule a la main. La meme
                        // largeur de libelle sur les quatre champs aligne tous les montants
                        // sur une meme verticale.
                        items: [
                            { xtype: 'displayfield', id: 'kpi_' + key + '_vente', fieldLabel: 'Valeur vente',
                              cls: 'valo-kpi', labelWidth: 140, labelStyle: 'font-size:1.5em;font-weight:700;',
                              value: fmtMoney(0), fieldStyle: 'font-size:2.8em;font-weight:900;color:' + accent + ';' },
                            { xtype: 'displayfield', id: 'kpi_' + key + '_achat', fieldLabel: 'Valeur achat',
                              cls: 'valo-kpi', labelWidth: 140, labelStyle: 'font-size:1.5em;font-weight:700;',
                              value: fmtMoney(0), fieldStyle: 'font-size:2.8em;font-weight:900;color:' + accent + ';' },
                            { xtype: 'component', height: 16 },
                            { xtype: 'displayfield', id: 'kpi_' + key + '_ecart', fieldLabel: 'Écart', value: '0',
                              cls: 'valo-kpi', labelWidth: 140, labelStyle: 'font-size:1.3em;font-weight:600;',
                              fieldStyle: 'font-size:1.8em;font-weight:700;color:' + accent + ';' },
                            { xtype: 'displayfield', id: 'kpi_' + key + '_marge', fieldLabel: 'Marge', value: '0%',
                              cls: 'valo-kpi', labelWidth: 140, labelStyle: 'font-size:1.3em;font-weight:600;',
                              fieldStyle: 'font-size:1.8em;font-weight:700;color:' + accent + ';' }
                        ]
                    },
                    {
                        xtype: 'container', flex: 1, layout: 'fit',
                        items: [ Ext.create('Ext.chart.Chart', {
                            animate: true, store: chartStore, insetPadding: 10,
                            series: [{
                                type: 'pie', angleField: 'value',
                                label: { field: 'label', display: 'rotate' }, highlight: true, donut: 20,
                                tips: { trackMouse: true, renderer: function (item) {
                                    this.setTitle(item.get('label') + ': ' + fmtMoney(item.get('value')));
                                } }
                            }]
                        }) ]
                    }
                ]
            };
        }

        function pulseActiveTab(tp) {
            try {
                var tab = tp.getActiveTab().tab;
                if (tab && tab.el) {
                    tab.el.removeCls('pl-tab-pulse');
                    tab.el.dom.offsetWidth; // reflow pour rejouer l'animation
                    tab.el.addCls('pl-tab-pulse');
                }
            } catch (e) {}
        }

        var kpiTabs = Ext.create('Ext.tab.Panel', {
            id: 'valo_tabs', flex: 1, height: 250, plain: true, activeTab: 0,
            listeners: { tabchange: function (tp) { pulseActiveTab(tp); } },
            items: [
                buildKpiTab('rayon', 'Stock rayon', 'pl-tab-rayon', ACCENT.rayon),
                buildKpiTab('reserve', 'Stock réserve', 'pl-tab-reserve', ACCENT.reserve),
                buildKpiTab('total', 'Stock total', 'pl-tab-total', ACCENT.total)
            ]
        });

        function buildParamsFromUI() {
            var mode = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
            // Les ids coches partent dans le parametre EXISTANT de l'axe, joints par des
            // virgules : le serveur applique une egalite (une valeur, SQL historique) ou un
            // IN (...) (plusieurs valeurs) — aucun nouveau parametre d'API.
            var ids = AXES[mode] ? idsCoches().join(',') : null;
            return {
                dtStart: Ext.getCmp('dt_periode').getSubmitValue(),
                mode: mode,
                lgGROSSISTEID: mode === 3 ? ids : Ext.getCmp('lg_GROSSISTE_ID').getValue(),
                lgFAMILLEARTICLEID: mode === 1 ? ids : Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue(),
                lgZONEGEOID: mode === 2 ? ids : Ext.getCmp('lg_ZONE_GEO_ID').getValue(),
                END: Ext.getCmp('str_END').getValue(),
                BEGIN: Ext.getCmp('str_BEGIN').getValue()
            };
        }

        function updateMirrors() {
            var d = Ext.getCmp('dt_periode').getValue();
            Ext.getCmp('date_selected_mirror').setValue(d ? Ext.Date.format(d, 'd/m/Y') : '');
            var mode = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
            var rec = storeType.findRecord('value', mode);
            var label = rec ? rec.get('label') : '';
            if (AXES[mode]) {
                label += ' (' + idsCoches().length + ' coché(s))';
            }
            Ext.getCmp('mode_selected_mirror').setValue(label);
        }

        function setTab(key, achat, vente) {
            Ext.getCmp('kpi_' + key + '_vente').setValue(fmtMoney(vente));
            Ext.getCmp('kpi_' + key + '_achat').setValue(fmtMoney(achat));
            var ecart = vente - achat;
            var margePct = vente ? ((ecart / vente) * 100) : 0;
            Ext.getCmp('kpi_' + key + '_ecart').setValue(fmt.number(ecart, '0,000.'));
            Ext.getCmp('kpi_' + key + '_marge').setValue(fmt.number(margePct, '0,0.00') + '%');
            chartStores[key].loadData([{ label: 'Vente', value: vente }, { label: 'Achat', value: achat }]);
        }

        function updateKPIs(data, meta) {
            raw.rayon = { achat: Number(data.value || 0), vente: Number(data.valueTwo || 0) };
            raw.reserve = { achat: Number(data.reserveValue || 0), vente: Number(data.reserveValueTwo || 0) };
            raw.total = { achat: Number(data.totalValue || 0), vente: Number(data.totalValueTwo || 0) };

            setTab('rayon', raw.rayon.achat, raw.rayon.vente);
            setTab('reserve', raw.reserve.achat, raw.reserve.vente);
            setTab('total', raw.total.achat, raw.total.vente);

            Ext.getCmp('str_NAME_USER').setValue(meta.user || '');
            Ext.getCmp('dt_CREATED').setValue(meta.dtCREATED || '');
            Ext.getCmp('btn_print').setDisabled(false);
            Ext.getCmp('btn_excel').setDisabled(false);
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

        // URL du servlet de valorisation (impression PDF ou export Excel) : memes
        // parametres dans les deux cas, typeStock selon l'onglet actif (1=rayon,
        // 2=reserve, 0=total).
        function urlServlet(modeServlet) {
            var p = buildParamsFromUI();
            var typeMap = { rayon: '1', reserve: '2', total: '0' };
            var at = Ext.getCmp('valo_tabs').getActiveTab();
            var key = (at && at.stockKey) ? at.stockKey : 'rayon';
            var typeStock = typeMap[key] || '1';
            return '../SockServlet?mode=' + modeServlet
                + '&tri=' + nn(Ext.getCmp('str_TRI_IMPRESSION').getValue())
                + '&dtStart=' + nn(p.dtStart)
                + '&action=' + nn(p.mode)
                + '&lgGROSSISTEID=' + nn(p.lgGROSSISTEID)
                + '&lgFAMILLEARTICLEID=' + nn(p.lgFAMILLEARTICLEID)
                + '&lgZONEGEOID=' + nn(p.lgZONEGEOID)
                + '&END=' + nn(p.END)
                + '&BEGIN=' + nn(p.BEGIN)
                + '&typeStock=' + typeStock;
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
                            if (!controleSelection()) { return; }
                            updateMirrors();
                            Ext.getCmp('btn_print').setDisabled(true);
                            Ext.getCmp('btn_excel').setDisabled(true);
                            callValorisation(buildParamsFromUI());
                        }
                    }
                ]
            }],

            items: [
                {
                    xtype: 'container',
                    layout: { type: 'hbox', align: 'stretch' },
                    defaults: { xtype: 'container', padding: 10, style: 'margin-bottom:10px;' },
                    items: [
                        {
                            xtype: 'container', cls: 'pl-card', flex: 1, layout: 'anchor',
                            items: [ userField, dateSystem ]
                        },
                        {
                            xtype: 'fieldset', title: 'Détails', flex: 1, style: 'margin-right:10px;border-radius:10px;',
                            defaults: { anchor: '100%' },
                            items: [
                                { xtype: 'displayfield', fieldLabel: 'Date sélectionnée', value: Ext.Date.format(new Date(), 'd/m/Y'), id: 'date_selected_mirror' },
                                { xtype: 'displayfield', fieldLabel: 'Mode', value: 'Simple', id: 'mode_selected_mirror' }
                            ]
                        },
                        {
                            xtype: 'fieldset', title: 'Critères', flex: 1.1, style: 'border-radius:10px;',
                            defaults: { anchor: '100%' },
                            items: [ cbType, cbTri, cbFamille, cbZone, cbGrossiste, fcIntervalle ]
                        }
                    ]
                },
                {
                    // Selection multiple des elements a valoriser (memes listes, recherche et
                    // boutons tout cocher / tout decocher que la creation d'inventaire).
                    // Visible uniquement en mode Famille / Emplacement / Grossiste.
                    xtype: 'inventaireselectioncriteres',
                    itemId: 'valoCriteres',
                    hidden: true,
                    height: 300,
                    style: 'margin-bottom:10px;'
                },
                kpiTabs
            ],

            buttons: [
                {
                    text: 'Valoriser le stock', id: 'btn_valoriser', minWidth: 160,
                    handler: function () {
                        if (!controleSelection()) { return; }
                        updateMirrors();
                        Ext.getCmp('btn_print').setDisabled(true);
                        Ext.getCmp('btn_excel').setDisabled(true);
                        callValorisation(buildParamsFromUI());
                    }
                },
                {
                    text: 'Imprimer', id: 'btn_print', disabled: true, minWidth: 120,
                    handler: function () {
                        if (!controleSelection()) { return; }
                        window.open(urlServlet('VALORISATION'));
                    }
                },
                {
                    text: 'Exporter Excel', id: 'btn_excel', disabled: true, minWidth: 120, iconCls: 'excelicon',
                    handler: function () {
                        if (!controleSelection()) { return; }
                        window.open(urlServlet('VALORISATION_EXCEL'));
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
        Ext.getCmp('btn_excel').setDisabled(true);
        callValorisation({ dtStart: Ext.getCmp('dt_periode').getSubmitValue(), mode: 0 });
        updateMirrors();
    }
});
