
/* global Ext */

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.configmanagement.logfile.logGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.logfile-grid',
    requires: [
        'testextjs.store.Statistics.logStore',
        'testextjs.model.caisse.User'
    ],
    initComponent: function () {
        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.User',
            pageSize: 100,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/users',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });


        var store = Ext.create('Ext.data.Store', {
            fields: [
                {
                    name: 'dtCREATED', type: 'string'
                },
                {
                    name: 'HEURE', type: 'string'
                },
                {
                    name: 'strDESCRIPTION', type: 'string'
                },
                {
                    name: 'typeLog', type: 'string'
                },
                {
                    name: 'userFullName', type: 'string'
                },
                {
                    name: 'strTYPELOG', type: 'string'
                },
                /* retours du 10/10 : poste, adresse IP, application, detail avant / apres */
                'poste', 'ip', 'application', 'detail'
            ],
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/logs',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000

            }
        });

        var filters = Ext.create('Ext.data.Store', {
            fields: [
                {
                    name: 'order', type: 'number'
                },
                {
                    name: 'strDESCRIPTION', type: 'string'
                }

            ],
            autoLoad: false,
            pageSize: 999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/log-filtres',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        /* retours du 10/10 : le filtre de poste suit toutes les recherches (bouton, pagination, Entree) */
        store.on('beforeload', function (st) {
            var c = Ext.getCmp('cmbposte');
            st.getProxy().setExtraParam('poste', c ? (c.getRawValue() || '') : '');
        });
        var postes = Ext.create('Ext.data.Store', {fields: ['poste'], autoLoad: true,
            proxy: {type: 'ajax', url: '../api/v1/common/logs/postes', reader: {type: 'json', root: 'data'}}});
        var rechercher = function () {
            var b = Ext.ComponentQuery.query('#logfileGrid button[text=Rechercher]')[0];
            if (b) {
                b.fireEvent('click', b);
            }
        };
        store.load();
        Ext.apply(this, {

            id: 'logfileGrid',
            store: store,
            viewConfig: {
                forceFit: true,
                emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
            },

            features: [
                {
                    ftype: 'rowbody',
                    getAdditionalData: function (data) {
                        return {
                            rowBody: "<p style='margin-left:5%;font-size:14px;font-weight:700;'>" + data.strDESCRIPTION + "</p>"
                                    + (data.detail ? "<p class='journal-detail' style='margin:-6px 0 6px 5%;color:#1f5f9e;font-size:12px'>Avant / après : "
                                            + Ext.String.htmlEncode(data.detail) + "</p>" : ''),
                            rowBodyColspan: 6
                        };
                    }
                }],

            columns: [

                {
                    header: 'ACTION',
                    dataIndex: 'typeLog',
                    flex: 1

                },

                {
                    header: 'DATE',
                    dataIndex: 'dtCREATED',
                    flex: 0.8

                },
                {
                    header: 'HEURE',
                    dataIndex: 'HEURE',
                    flex: 0.6

                },

                {
                    header: 'Opérateur',
                    dataIndex: 'userFullName',
                    flex: 1

                },
                /* retours du 10/10 : d'ou vient l'operation */
                {header: 'Poste', dataIndex: 'poste', flex: 0.8, renderer: function (v) {
                        return Ext.String.htmlEncode(v || '');
                    }},
                {header: 'Adresse IP', dataIndex: 'ip', flex: 0.7, renderer: function (v) {
                        return Ext.String.htmlEncode(v || '');
                    }},
                {header: 'Application', dataIndex: 'application', flex: 0.9, renderer: function (v) {
                        return Ext.String.htmlEncode(v || '');
                    }}

            ],
            selModel: {
                selType: 'cellmodel'
            },
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            id: 'dt_log_start',
                            labelWidth: 15,
                            flex: 1,
                            emptyText: 'Du',
                            value: new Date(),
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'



                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            id: 'dt_end_log',
                            labelWidth: 15,
                            flex: 1,
                            emptyText: 'Au',
                            submitFormat: 'Y-m-d',
                            value: new Date(),
                            format: 'd/m/Y'



                        }

                        , {
                            xtype: 'tbseparator'
                        },

                        {
                            xtype: 'textfield',
                            id: 'rechlog',
                            flex: 0.8,
                            emptyText: 'Recherche',
                            listeners: {
                                specialKey: function (field, e, Familletion) {
                                    if (e.getKey() === e.ENTER) {
                                        var grid = Ext.getCmp('logfileGrid');
                                        var cmbologfile = Ext.getCmp('cmbologfile').getValue();
                                        var cmbousers = Ext.getCmp('cmbousers').getValue();
                                        if (!cmbologfile && cmbologfile == null) {
                                            cmbologfile = -1;
                                        }
                                        grid.getStore().load({
                                            params: {
                                                query: Ext.getCmp('rechlog').getValue(),
                                                criteria: cmbologfile,
                                                dtEnd: Ext.getCmp('dt_end_log').getSubmitValue(),
                                                dtStart: Ext.getCmp('dt_log_start').getSubmitValue(),
                                                userId: cmbousers
                                            }
                                        });
                                    }

                                }
                            }
                        }, {
                            xtype: 'tbseparator'
                        }
                        ,
                        {
                            xtype: 'combo',
                            emptyText: 'Actions',
//                    fieldLabel: 'Action',
                            labelWidth: 50,
                            flex: 1.5,
                            id: 'cmbologfile',
                            valueField: 'order',
                            displayField: 'strDESCRIPTION',
                            store: filters,
                            listeners: {
                                select: function (cmp) {
                                    var grid = Ext.getCmp('logfileGrid');
                                    var cmbologfile = Ext.getCmp('cmbologfile').getValue();
                                    var cmbousers = Ext.getCmp('cmbousers').getValue();
                                    if (!cmbologfile && cmbologfile == null) {
                                        cmbologfile = -1;
                                    }
                                    grid.getStore().load({
                                        params: {
                                            query: Ext.getCmp('rechlog').getValue(),
                                            criteria: cmbologfile,
                                            dtEnd: Ext.getCmp('dt_end_log').getSubmitValue(),
                                            dtStart: Ext.getCmp('dt_log_start').getSubmitValue(),
                                            userId: cmbousers
                                        }
                                    });
                                }
                            }

                        }
                        ,
                        {
                            xtype: 'combo',
                            emptyText: 'Sélectionner un utilisateur',
                            flex: 1.5,
                            id: 'cmbousers',
                            valueField: 'lgUSERID',
                            displayField: 'fullName',
                            pageSize: null,
                            store: storeUser,

                            listeners: {
                                select: function (cmp) {
                                    var grid = Ext.getCmp('logfileGrid');
                                    var cmbologfile = Ext.getCmp('cmbologfile').getValue();
                                    var cmbousers = Ext.getCmp('cmbousers').getValue();
                                    if (!cmbologfile && cmbologfile == null) {
                                        cmbologfile = -1;
                                    }
                                    grid.getStore().load({
                                        params: {
                                            query: Ext.getCmp('rechlog').getValue(),
                                            criteria: cmbologfile,
                                            dtEnd: Ext.getCmp('dt_end_log').getSubmitValue(),
                                            dtStart: Ext.getCmp('dt_log_start').getSubmitValue(),
                                            userId: cmbousers
                                        }
                                    });
                                }
                            }

                        }

                        , {
                            xtype: 'tbseparator'
                        },
                        {
                            // flex: 0.4,
                            width: 95,
                            xtype: 'button',
                            iconCls: 'searchicon',
                            text: 'Rechercher',
                            listeners: {
                                click: function () {
                                    var grid = Ext.getCmp('logfileGrid');
                                    var cmbologfile = Ext.getCmp('cmbologfile').getValue();
                                    var cmbousers = Ext.getCmp('cmbousers').getValue();
                                    if (!cmbologfile && cmbologfile == null) {
                                        cmbologfile = -1;
                                    }


                                    grid.getStore().load({
                                        params: {
                                            query: Ext.getCmp('rechlog').getValue(),
                                            criteria: cmbologfile,
                                            dtEnd: Ext.getCmp('dt_end_log').getSubmitValue(),
                                            dtStart: Ext.getCmp('dt_log_start').getSubmitValue(),
                                            userId: cmbousers
                                        }
                                    });
                                }
                            }


                        }, {
                            xtype: 'tbseparator'
                        }
                        ,
                        {
                            width: 85,
                            xtype: 'button',
                            text: 'Imprimer',
                            iconCls: 'printable',
//                    glyph: 0xf1c1,
                            listeners: {
                                click: function () {

                                    var rech = Ext.getCmp('rechlog').getValue();
                                    var user = Ext.getCmp('cmbousers').getValue();

                                    var dt_end = Ext.getCmp('dt_end_log').getSubmitValue(),
                                            dt_start = Ext.getCmp('dt_log_start').getSubmitValue();
                                    var cmbologfile = Ext.getCmp('cmbologfile').getValue();
                                    if (cmbologfile == null) {
                                        cmbologfile = -1;
                                    }

                                    if (user == null) {
                                        user = '';
                                    }
                                    // parametres encodes : espaces, accents et & dans la recherche
                                    var linkUrl = '../FacturePdfServlet?' + Ext.Object.toQueryString({
                                        mode: 'LOG',
                                        dtStart: dt_start,
                                        dtEnd: dt_end,
                                        userId: user,
                                        criteria: cmbologfile,
                                        query: rech || ''
                                    });
                                    window.open(linkUrl);

                                }
                            }


                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            /* Point 14 : export Excel du journal. Memes criteres que la recherche
                             * a l'ecran, mais toutes les lignes du resultat - le serveur ne
                             * pagine pas cet appel. */
                            width: 95,
                            xtype: 'button',
                            text: 'Excel',
                            tooltip: 'Exporter le r&eacute;sultat complet vers Excel',
                            icon: 'resources/images/icons/fam/excel_icon.png',
                            listeners: {
                                click: function () {
                                    var criteria = Ext.getCmp('cmbologfile').getValue();
                                    if (criteria === null || criteria === undefined || criteria === '') {
                                        criteria = -1;
                                    }
                                    var lien = '../api/v1/common/logs/export-excel?' + Ext.Object.toQueryString({
                                        dtStart: Ext.getCmp('dt_log_start').getSubmitValue(),
                                        dtEnd: Ext.getCmp('dt_end_log').getSubmitValue(),
                                        userId: Ext.getCmp('cmbousers').getValue() || '',
                                        criteria: criteria,
                                        query: Ext.getCmp('rechlog').getValue() || '',
                                        poste: Ext.getCmp('cmbposte').getRawValue() || ''
                                    });
                                    window.location = lien;
                                }
                            }
                        }


                    ]
                },

                {
                    xtype: 'toolbar', dock: 'top', itemId: 'barreJournal2',
                    items: [
                        {xtype: 'combobox', id: 'cmbposte', itemId: 'cmbposte', width: 230, emptyText: 'Tous les postes', store: postes,
                            displayField: 'poste', valueField: 'poste', queryMode: 'local', typeAhead: false, anyMatch: true, autoSelect: false,
                            tooltip: 'Opérations faites depuis ce poste (nom ou adresse IP)',
                            listeners: {select: rechercher, specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        rechercher();
                                    }
                                }}},
                        {xtype: 'button', text: 'Alertes', itemId: 'btnAlertesJournal', enableToggle: true,
                            tooltip: 'Annulations en série et opérations hors horaires sur la période',
                            toggleHandler: function (b, actif) {
                                var p = Ext.getCmp('logfileGrid').down('#alertesJournal');
                                p.setVisible(actif);
                                if (actif) {
                                    Ext.getCmp('logfileGrid').chargerAlertes();
                                }
                            }},
                        '->',
                        {xtype: 'textfield', itemId: 'nomCePoste', fieldLabel: 'Ce poste', labelWidth: 55, width: 230, maxLength: 60,
                            enforceMaxLength: true, emptyText: 'Ex. : Caisse 1', value: window.PrestigePoste ? window.PrestigePoste.lire() : '',
                            tooltip: 'Nom de ce poste, saisi une fois et mémorisé sur ce poste : il figure dans le journal (sinon le nom réseau)'},
                        {xtype: 'button', text: 'Enregistrer', itemId: 'btnNomPoste', tooltip: 'Mémoriser le nom de ce poste',
                            handler: function (b) {
                                var v = Ext.String.trim(b.up('toolbar').down('#nomCePoste').getValue() || '');
                                if (window.PrestigePoste) {
                                    window.PrestigePoste.ecrire(v);
                                }
                                b.up('toolbar').down('#nomCePoste').setValue(window.PrestigePoste ? window.PrestigePoste.lire() : v);
                            }}
                    ]
                },
                {
                    xtype: 'component', dock: 'top', itemId: 'alertesJournal', hidden: true, cls: 'journal-alertes',
                    style: 'padding:6px 10px;background:#fff8e1;border-bottom:1px solid #f0d58c;max-height:220px;overflow:auto', html: ''
                },
                {
                    xtype: 'pagingtoolbar',
                    store: store,
                    pageSize: 15,
                    dock: 'bottom',
                    displayInfo: true,

                    listeners: {
                        beforechange: function (page, currentPage) {
                            var myProxy = this.store.getProxy();
                            myProxy.params = {
                                dtStart: '',
                                query: '',
                                dtEnd: '',
                                criteria: -1,
                                userId: ''
                            };

                            var rech = Ext.getCmp('rechlog').getValue();
                            var user = Ext.getCmp('cmbousers').getValue();

                            var dt_end = Ext.getCmp('dt_end_log').getSubmitValue(),
                                    dt_start = Ext.getCmp('dt_log_start').getSubmitValue();
                            var cmbologfile = Ext.getCmp('cmbologfile').getValue();
                            // 0 (Deconditionnement) est une valeur valide : ne pas la remplacer par -1
                            if (cmbologfile == null) {
                                cmbologfile = -1;
                            }


                            myProxy.setExtraParam('dtEnd', dt_end);
                            myProxy.setExtraParam('dtStart', dt_start);
                            myProxy.setExtraParam('criteria', cmbologfile);
                            myProxy.setExtraParam('query', rech);
                            myProxy.setExtraParam('userId', user);


                        }

                    }
                }]
        });
        this.callParent();
    },

    /** Retours du 10/10 : alertes du journal sur la periode affichee. */
    chargerAlertes: function () {
        var me = this, zone = me.down('#alertesJournal'), enc = Ext.String.htmlEncode;
        zone.update('Calcul des alertes…');
        Ext.Ajax.request({url: '../api/v1/common/logs/alertes', method: 'GET',
            params: {dtStart: Ext.getCmp('dt_log_start').getSubmitValue(), dtEnd: Ext.getCmp('dt_end_log').getSubmitValue()},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    zone.update('<span style="color:#b42318">' + enc(o.msg || 'Alertes indisponibles') + '</span>');
                    return;
                }
                var h = '<b>Annulations en série</b> (' + o.seuil + ' ventes ou plus en ' + o.minutes + ' min) : ';
                h += o.annulationsEnSerie.length ? '<ul class="journal-series">' + Ext.Array.map(o.annulationsEnSerie, function (a) {
                    return '<li>' + enc(a.utilisateur) + ' : <b>' + a.nombre + '</b> annulations du ' + enc(a.debut) + ' au ' + enc(a.fin)
                            + (a.poste ? ' (' + enc(a.poste) + ')' : '') + '</li>';
                }).join('') + '</ul>' : 'aucune.<br>';
                h += '<b>Opérations hors horaires</b> (avant ' + enc(o.debut) + ' ou après ' + enc(o.fin) + ') : ';
                h += o.horsHoraires.length ? o.nbHorsHoraires + '<ul class="journal-hors-horaires">' + Ext.Array.map(o.horsHoraires, function (a) {
                    return '<li>' + enc(a.quand) + ' — ' + enc(a.utilisateur) + ' — ' + enc(a.action) + (a.poste ? ' (' + enc(a.poste) + ')' : '') + '</li>';
                }).join('') + '</ul>' : 'aucune.';
                zone.update(h);
            }});
    }
});


