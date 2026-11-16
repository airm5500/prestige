/* global Ext, PrestigeConfirmation, PrestigeChargement, PrestigeToast */

/*
 * Onglet LISTE RESERVE (15/11) : premiere configuration de la reserve sur une longue liste de produits (base d'appaul),
 * sans ouvrir la fiche de chaque produit.
 *  - recherche et filtres (emplacement, famille, grossiste, etat) ; les coches sont gardees sur toutes les pages et
 *    tous les filtres, leur nombre reste affiche dans le bandeau ;
 *  - a l'ouverture, les produits deja en reserve sont coches ; un produit qui a du stock en reserve ne peut pas etre
 *    decoche (cadenas) ;
 *  - regle visible : capacite maxi rayon = VMJ x N jours (1 par defaut), seuil mini rayon = ½, ⅔ ou = capacite ; les
 *    valeurs proposees s'affichent en bleu des qu'on coche ; une valeur saisie a la main passe en violet (✎) ;
 *  - un seul « Enregistrer », confirme dans le bouton (aucune fenetre surgissante) ; refus affiches dans le bandeau ;
 *  - Excel et PDF (rp_liste_reserve) de toute la recherche, telle qu'enregistree en base.
 * VMJ : prevision du mois / 30, la meme que les autres ecrans. Retirer un produit garde sa capacite et son seuil.
 */
Ext.define('testextjs.view.stockmanagement.reserve.ListeReserveGrid', {
    extend: 'Ext.grid.Panel',
    xtype: 'reservelistegrid',
    border: false,
    frame: true,
    columnLines: true,
    cls: 'lr-grille',

    statics: {
        /* meme regle que rest.service.impl.reserve.RegleListeReserve */
        capacite: function (vmj, jours) {
            if (vmj === null || vmj === undefined || !(vmj > 0) || !(jours > 0)) {
                return null;
            }
            return Math.max(1, Math.ceil(vmj * jours - 1e-9));
        },
        seuil: function (capacite, regle) {
            if (!(capacite > 0)) {
                return null;
            }
            if (regle === 'EGAL') {
                return capacite;
            }
            return Math.min(capacite, Math.max(1, Math.ceil(capacite * (regle === 'DEMI' ? 1 / 2 : 2 / 3) - 1e-9)));
        }
    },

    initComponent: function () {
        var me = this, base = '../api/v1/reserve/';
        me.changements = {};
        me.jours = 1;
        me.regleSeuil = 'DEUX_TIERS';
        me.etat = 'TOUS';
        me.nbEnReserveBase = 0;
        me.refus = [];

        me.store = new Ext.data.Store({
            pageSize: 25,
            autoLoad: false,
            remoteSort: false,
            fields: ['id', 'cip', 'designation', 'emplacement', 'famille', 'grossiste',
                {name: 'stockRayon', type: 'int'}, {name: 'stockReserve', type: 'int'},
                {name: 'vmj', useNull: true}, {name: 'enReserve', type: 'boolean'},
                {name: 'capacite', useNull: true}, {name: 'seuilMini', useNull: true}],
            proxy: {type: 'ajax', url: base + 'liste', reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (st) {
                    st.getProxy().extraParams = me.parametres();
                },
                /* un echec de chargement se dit dans le bandeau : une liste vide muette laisserait croire « aucun produit » */
                load: function (st, recs, reussi) {
                    var c = me.down('#lrCompteur');
                    if (!reussi && c) {
                        c.setText('<b style="color:#b42318">La liste n\'a pas pu être chargée : réessayez dans un instant.</b>');
                    }
                }
            }
        });

        var combo = function (itemId, url, vide, largeur) {
            return {
                xtype: 'combo', itemId: itemId, emptyText: vide, width: largeur || 150, queryMode: 'remote',
                minChars: 2, displayField: 'libelle', valueField: 'id', forceSelection: true, triggerAction: 'all',
                store: new Ext.data.Store({fields: ['id', 'libelle'], pageSize: null,
                    proxy: {type: 'ajax', url: url, reader: {type: 'json', root: 'data'}}}),
                listeners: {select: function () {
                        me.chercher();
                    }, change: function (c, v) {
                        if (!v) {
                            me.chercher();
                        }
                    }}
            };
        };
        var segment = function (itemId, items, valeur, action) {
            return {xtype: 'segmentedbutton', itemId: itemId, allowMultiple: false,
                items: Ext.Array.map(items, function (x) {
                    return {text: x[1], valeur: x[0], pressed: x[0] === valeur, tooltip: x[2] || null};
                }),
                listeners: {toggle: function (s, b, pressed) {
                        if (pressed) {
                            action(b.valeur);
                        }
                    }}};
        };
        var aSegment = !!Ext.ClassManager.getNameByAlias('widget.segmentedbutton');
        var boutons = function (itemId, items, valeur, action) {
            if (aSegment) {
                return segment(itemId, items, valeur, action);
            }
            return {xtype: 'container', itemId: itemId, layout: 'hbox', items: Ext.Array.map(items, function (x) {
                    return {xtype: 'button', text: x[1], valeur: x[0], enableToggle: true, toggleGroup: itemId + me.id,
                        pressed: x[0] === valeur, allowDepress: false, tooltip: x[2] || null, margin: '0 2 0 0',
                        toggleHandler: function (b, pressed) {
                            if (pressed) {
                                action(b.valeur);
                            }
                        }};
                })};
        };

        me.dockedItems = [{
                xtype: 'toolbar', dock: 'top', itemId: 'lrFiltres', items: [
                    {xtype: 'textfield', itemId: 'lrRecherche', emptyText: 'CIP, désignation… (Entrée)', width: 230, enableKeyEvents: true,
                        listeners: {specialkey: function (f, e) {
                                if (e.getKey() === e.ENTER) {
                                    me.chercher();
                                }
                            }}},
                    combo('lrZone', '../api/v1/common/rayons', 'Emplacement'),
                    combo('lrFamille', '../api/v1/common/famillearticles', 'Famille'),
                    combo('lrGrossiste', '../api/v1/common/grossiste', 'Grossiste'),
                    boutons('lrEtat', [['TOUS', 'Tous'], ['EN_RESERVE', 'En réserve'], ['HORS_RESERVE', 'Hors réserve'],
                        ['AVEC_STOCK', 'Avec stock réserve'], ['SANS_VENTE', 'Aucune vente', 'Produits sans VMJ : capacité et seuil à saisir']],
                            'TOUS', function (v) {
                                me.etat = v;
                                me.chercher();
                            })
                ]
            }, {
                xtype: 'toolbar', dock: 'top', itemId: 'lrRegle', items: [
                    {xtype: 'tbtext', text: '<b>Règle :</b> capacité maxi rayon = VMJ ×'},
                    {xtype: 'numberfield', itemId: 'lrJours', value: 1, minValue: 1, maxValue: 90, allowDecimals: false, width: 55,
                        listeners: {change: function (f, v) {
                                if (v >= 1) {
                                    me.jours = v;
                                    me.recalculer();
                                }
                            }}},
                    {xtype: 'tbtext', text: 'jour(s) · seuil mini rayon ='},
                    boutons('lrSeuil', [['DEMI', '½'], ['DEUX_TIERS', '⅔'], ['EGAL', '= capacité']], 'DEUX_TIERS', function (v) {
                        me.regleSeuil = v;
                        me.recalculer();
                    }),
                    {xtype: 'tbtext', text: '<span style="color:#5b6b7c">· VMJ = prévision du mois / 30</span>'},
                    '->',
                    {xtype: 'button', itemId: 'lrCocherTout', text: 'Cocher toute la recherche', iconCls: 'icon-check',
                        tooltip: 'Coche tous les produits de la recherche, sur toutes les pages', handler: function (b) {
                            me.cocherRecherche(b, true);
                        }},
                    {xtype: 'button', itemId: 'lrDecocherTout', text: 'Décocher la recherche', tooltip: 'Décoche toute la recherche ; les produits qui ont du stock en réserve restent cochés',
                        handler: function (b) {
                            me.cocherRecherche(b, false);
                        }}
                ]
            }, {
                xtype: 'toolbar', dock: 'top', itemId: 'lrBandeau', style: 'background:#fff7e6;border-bottom:1px solid #f1d9a8', items: [
                    {xtype: 'tbtext', itemId: 'lrCompteur', text: ''},
                    '->',
                    {xtype: 'button', itemId: 'lrAnnuler', text: 'Annuler les changements', disabled: true, handler: function () {
                            me.changements = {};
                            me.refus = [];
                            me.majBandeau();
                            me.getView().refresh();
                        }},
                    {xtype: 'button', itemId: 'lrEnregistrer', text: 'Enregistrer', cls: 'btn-primary', disabled: true,
                        handler: function (b) {
                            me.enregistrer(b);
                        }}
                ]
            }, {
                xtype: 'pagingtoolbar', dock: 'bottom', store: me.store, displayInfo: true,
                displayMsg: 'Produits {0} à {1} sur {2} · les coches sont gardées en changeant de page ou de filtre',
                items: ['-', {xtype: 'button', itemId: 'lrExcel', text: 'Excel', iconCls: 'export_excel_icon',
                        tooltip: 'Toute la recherche, telle qu\'enregistrée', handler: function (b) {
                            PrestigeChargement.telecharger(b, base + 'liste/excel?' + Ext.Object.toQueryString(me.parametres()), 'Excel', 'liste_reserve.xlsx');
                        }},
                    {xtype: 'button', itemId: 'lrPdf', text: 'PDF', iconCls: 'printable',
                        tooltip: 'Toute la recherche, telle qu\'enregistrée', handler: function (b) {
                            me.pdf(b);
                        }}]
            }];

        var rendu = function (champ) {
            return function (v, meta, rec) {
                var l = me.etatLigne(rec);
                if (!l.enReserve) {
                    return '<span style="color:#9aa5b1">' + (rec.get(champ) === null ? '—' : rec.get(champ)) + '</span>';
                }
                var val = l[champ];
                if (val === null || val === undefined) {
                    return '<span style="color:#b42318;font-weight:bold" title="Aucune vente : à saisir">à saisir</span>';
                }
                var c = me.changements[rec.get('id')];
                if (c && c.manuel && c.manuel[champ]) {
                    return '<span style="color:#5b3fa0;font-weight:bold" title="Saisi à la main : la règle ne l\'écrase plus">' + val + ' ✎</span>';
                }
                if (c && c.propose) {
                    return '<span style="color:#2563eb;font-weight:bold" title="Valeur proposée par la règle, pas encore enregistrée">'
                            + (rec.get(champ) === null ? '—' : rec.get(champ)) + ' → ' + val + '</span>';
                }
                return String(val);
            };
        };

        me.plugins = [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1, pluginId: 'lrEdition',
                listeners: {
                    beforeedit: function (ed, e) {
                        return me.etatLigne(e.record).enReserve;
                    },
                    edit: function (ed, e) {
                        me.saisie(e.record, e.field, e.value);
                    }
                }})];

        me.columns = [
            {text: '', dataIndex: 'enReserve', width: 34, sortable: false, menuDisabled: true, align: 'center', tdCls: 'lr-coche',
                renderer: function (v, meta, rec) {
                    var l = me.etatLigne(rec);
                    if (l.verrou) {
                        meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode('Encore ' + rec.get('stockReserve')
                                + ' en réserve : videz d\'abord la réserve vers le rayon pour retirer ce produit.') + '"';
                        return '<span class="lr-cadenas" style="cursor:not-allowed">🔒</span>';
                    }
                    return '<span class="lr-case" role="checkbox" aria-checked="' + l.enReserve + '" style="cursor:pointer;font-size:15px">'
                            + (l.enReserve ? '☑' : '☐') + '</span>';
                }},
            {text: 'CIP', dataIndex: 'cip', width: 85},
            {text: 'Désignation', dataIndex: 'designation', flex: 1, minWidth: 200},
            {text: 'Emplacement', dataIndex: 'emplacement', width: 110},
            {text: 'Famille', dataIndex: 'famille', width: 120},
            {text: 'Grossiste', dataIndex: 'grossiste', width: 110},
            {text: 'Stock rayon', dataIndex: 'stockRayon', width: 75, align: 'right'},
            {text: 'Stock réserve', dataIndex: 'stockReserve', width: 82, align: 'right'},
            {text: 'VMJ', dataIndex: 'vmj', width: 60, align: 'right', renderer: function (v) {
                    return v === null || v === undefined ? '—' : Ext.util.Format.number(v, '0,000.00').replace('.', ',');
                }},
            {text: 'Capacité maxi rayon', dataIndex: 'capacite', width: 125, align: 'right', renderer: rendu('capacite'),
                editor: {xtype: 'numberfield', minValue: 0, allowDecimals: false}},
            {text: 'Seuil mini rayon', dataIndex: 'seuilMini', width: 115, align: 'right', renderer: rendu('seuilMini'),
                editor: {xtype: 'numberfield', minValue: 0, allowDecimals: false}},
            {text: 'État', width: 150, sortable: false, renderer: function (v, meta, rec) {
                    return me.texteEtat(rec);
                }}
        ];

        me.listeners = {
            cellclick: function (view, td, col, rec, tr, row, e) {
                if (e.getTarget('.lr-case')) {
                    me.basculer(rec);
                }
            },
            afterrender: function () {
                /* phase de capture : la navigation clavier de la grille (ExtJS) prend Espace pour la selection et
                   arrete l'evenement ; ici la touche est traitee avant elle */
                me.getEl().dom.addEventListener('keydown', function (ev) {
                    var dansSaisie = /^(INPUT|TEXTAREA|SELECT)$/.test((ev.target && ev.target.tagName) || ''),
                            touche = ev.keyCode, fin = function () {
                                ev.preventDefault();
                                ev.stopPropagation();
                            };
                    if (touche === 32 && !ev.ctrlKey && !dansSaisie) {
                        var sel = me.getSelectionModel().getSelection()[0];
                        if (sel) {
                            fin();
                            me.basculer(sel);
                        }
                    } else if (ev.ctrlKey && touche === 65 && !dansSaisie) {
                        fin();
                        me.cocherPage();
                    } else if (ev.ctrlKey && touche === 83) {
                        fin();
                        var b = me.down('#lrEnregistrer');
                        if (b && !b.isDisabled()) {
                            me.enregistrer(b);
                        }
                    }
                }, true);
            }
        };
        me.callParent(arguments);
    },

    reloadGrid: function () {
        var me = this;
        me.store.loadPage(1);
        me.compterBase();
    },

    parametres: function () {
        var me = this, v = function (id) {
            var c = me.down('#' + id);
            return c && c.getValue() ? c.getValue() : '';
        };
        return {search: v('lrRecherche'), zoneId: v('lrZone'), familleId: v('lrFamille'), grossisteId: v('lrGrossiste'), etat: this.etat};
    },

    chercher: function () {
        this.store.loadPage(1);
    },

    /* nombre de produits en reserve en base (pour le bandeau) */
    compterBase: function () {
        var me = this;
        Ext.Ajax.request({url: '../api/v1/reserve/liste', method: 'GET', params: {etat: 'EN_RESERVE', limit: 1},
            success: function (r) {
                var o = Ext.decode(r.responseText, true);
                me.nbEnReserveBase = o && o.total ? o.total : 0;
                me.majBandeau();
            }});
    },

    /* etat affiche d'une ligne : base + changement en attente */
    etatLigne: function (rec) {
        var c = this.changements[rec.get('id')];
        var enReserve = c ? c.enReserve : rec.get('enReserve');
        return {
            enReserve: enReserve,
            verrou: rec.get('enReserve') && rec.get('stockReserve') > 0,
            capacite: c && c.capacite !== undefined ? c.capacite : rec.get('capacite'),
            seuilMini: c && c.seuilMini !== undefined ? c.seuilMini : rec.get('seuilMini')
        };
    },

    texteEtat: function (rec) {
        var me = this, l = me.etatLigne(rec), c = me.changements[rec.get('id')];
        var refus = Ext.Array.findBy(me.refus, function (x) {
            return x.id === rec.get('id');
        });
        if (refus) {
            return '<span style="color:#b42318;font-weight:bold" title="' + Ext.String.htmlEncode(refus.motif) + '">Refusé : ' + Ext.String.htmlEncode(refus.motif) + '</span>';
        }
        if (l.verrou) {
            return '<span style="color:#5b6b7c">En réserve, verrouillé</span>';
        }
        if (c && c.enReserve && !rec.get('enReserve')) {
            return '<span style="color:#17795f;font-weight:bold">Nouveau' + (c.manuel && (c.manuel.capacite || c.manuel.seuilMini) ? ', ajusté à la main' : '') + '</span>';
        }
        if (c && !c.enReserve && rec.get('enReserve')) {
            return '<span style="color:#a35400;font-weight:bold">À retirer</span>';
        }
        if (c && c.enReserve) {
            return '<span style="color:#5b3fa0;font-weight:bold">Réglage modifié</span>';
        }
        if (l.enReserve && (rec.get('vmj') === null || !(rec.get('vmj') > 0)) && (l.capacite === null || l.capacite === undefined)) {
            return '<span style="color:#b42318">Aucune vente : à saisir</span>';
        }
        return l.enReserve ? 'Déjà en réserve' : '';
    },

    /* proposition de la regle pour un produit nouvellement coche (sauf valeurs saisies a la main) */
    proposer: function (c) {
        var S = testextjs.view.stockmanagement.reserve.ListeReserveGrid;
        var cap = S.capacite(c.vmj, this.jours);
        if (!c.manuel.capacite) {
            c.capacite = cap === null ? c.base.capacite : cap;
        }
        if (!c.manuel.seuilMini) {
            c.seuilMini = cap === null ? c.base.seuilMini : S.seuil(c.capacite, this.regleSeuil);
        }
        c.propose = cap !== null;
    },

    nouveau: function (r) {
        return {base: {enReserve: r.enReserve, capacite: r.capacite, seuilMini: r.seuilMini}, vmj: r.vmj,
            stockReserve: r.stockReserve, manuel: {}};
    },

    /* Ctrl + A : coche toute la page affichee */
    cocherPage: function () {
        var me = this;
        me.store.each(function (rec) {
            if (!me.etatLigne(rec).enReserve) {
                me.appliquer(rec.get('id'), Ext.apply({id: rec.get('id')}, rec.data), true);
            }
        });
        me.majBandeau();
        me.getView().refresh();
        me.garderFocus();
    },

    /* apres un redessin, le focus revient sur la ligne choisie : Espace et les raccourcis restent utilisables */
    garderFocus: function () {
        var sel = this.getSelectionModel().getSelection()[0];
        if (sel && this.store.indexOf(sel) >= 0) {
            this.getView().focusRow(sel);
        }
    },

    /* coche ou decoche une ligne de la grille */
    basculer: function (rec) {
        var me = this, id = rec.get('id'), l = me.etatLigne(rec);
        if (l.verrou) {
            return;
        }
        me.appliquer(id, Ext.apply({id: id}, rec.data), !l.enReserve);
        me.refus = Ext.Array.filter(me.refus, function (x) {
            return x.id !== id;
        });
        me.majBandeau();
        me.getView().refreshNode(me.store.indexOf(rec));
        me.garderFocus();
    },

    appliquer: function (id, r, coche) {
        var me = this, c = me.changements[id];
        if (r.enReserve && r.stockReserve > 0 && !coche) {
            return false;
        }
        if (coche === r.enReserve) {
            delete me.changements[id];
            return true;
        }
        c = me.nouveau(r);
        c.enReserve = coche;
        if (coche) {
            me.proposer(c);
        } else {
            c.capacite = r.capacite;
            c.seuilMini = r.seuilMini;
        }
        me.changements[id] = c;
        return true;
    },

    saisie: function (rec, champ, valeur) {
        var me = this, id = rec.get('id'), c = me.changements[id];
        /* l'editeur a deja ecrit la saisie dans l'enregistrement : on revient d'abord a la valeur lue en base, sinon
           la base du changement serait la saisie elle-meme et un reglage d'un produit deja en reserve se perdrait */
        rec.reject();
        if (!c) {
            c = me.nouveau(rec.data);
            c.enReserve = true;
            c.capacite = rec.get('capacite');
            c.seuilMini = rec.get('seuilMini');
            me.changements[id] = c;
        }
        c.manuel[champ] = true;
        c[champ] = valeur === null || valeur === '' ? null : valeur;
        if (c.enReserve === c.base.enReserve && c.capacite === c.base.capacite && c.seuilMini === c.base.seuilMini) {
            delete me.changements[id];
        }
        me.majBandeau();
        me.getView().refreshNode(me.store.indexOf(rec));
    },

    recalculer: function () {
        var me = this;
        Ext.Object.each(me.changements, function (id, c) {
            if (c.enReserve && !c.base.enReserve) {
                me.proposer(c);
            }
        });
        me.majBandeau();
        me.getView().refresh();
    },

    bilan: function () {
        var n = {nouveaux: 0, retires: 0, reglages: 0};
        Ext.Object.each(this.changements, function (id, c) {
            if (c.enReserve && !c.base.enReserve) {
                n.nouveaux++;
            } else if (!c.enReserve && c.base.enReserve) {
                n.retires++;
            } else if (c.enReserve) {
                n.reglages++;
            }
        });
        n.total = n.nouveaux + n.retires + n.reglages;
        return n;
    },

    majBandeau: function () {
        var me = this, n = me.bilan(), coches = me.nbEnReserveBase + n.nouveaux - n.retires;
        var t = '<b style="color:#a35400">' + coches + ' produit(s) coché(s)</b> sur toutes les pages';
        if (n.total) {
            t += ' : ' + n.nouveaux + ' nouveau(x), ' + n.retires + ' retiré(s), ' + n.reglages + ' réglage(s) modifié(s)';
        }
        if (me.refus.length) {
            t += ' · <b style="color:#b42318">' + me.refus.length + ' refus</b> (voir la colonne État)';
        }
        var cpt = me.down('#lrCompteur');
        if (cpt) {
            cpt.setText(t);
        }
        var b = me.down('#lrEnregistrer');
        if (b && !b.prestigeConfirmation) {
            b.setText(n.total ? 'Enregistrer ' + n.total + ' changement(s)' : 'Enregistrer');
            b.setDisabled(!n.total);
        }
        var a = me.down('#lrAnnuler');
        if (a) {
            a.setDisabled(!n.total && !me.refus.length);
        }
    },

    cocherRecherche: function (b, coche) {
        var me = this, fin = PrestigeChargement.occuper(b, coche ? 'Cochage' : 'Décochage');
        Ext.Ajax.request({url: '../api/v1/reserve/liste/tout', method: 'GET', params: me.parametres(),
            callback: function (o, succes, r) {
                var rep = succes ? Ext.decode(r.responseText, true) : null;
                if (!rep || !rep.success) {
                    fin('Échec', false);
                    return;
                }
                var faits = 0, verrous = 0;
                Ext.Array.each(rep.data, function (x) {
                    var c = me.changements[x.id], actuel = c ? c.enReserve : x.enReserve;
                    if (actuel === coche) {
                        return;
                    }
                    if (me.appliquer(x.id, x, coche)) {
                        faits++;
                    } else {
                        verrous++;
                    }
                });
                me.majBandeau();
                me.getView().refresh();
                fin(coche ? faits + ' coché(s)' : faits + ' décoché(s)' + (verrous ? ', ' + verrous + ' restés cochés (stock réserve)' : ''), true);
            }});
    },

    enregistrer: function (b) {
        var me = this, n = me.bilan();
        if (!n.total) {
            return;
        }
        PrestigeConfirmation.bouton(b, 'Confirmer : ' + n.nouveaux + ' mis en réserve, ' + n.retires + ' retiré(s), ' + n.reglages + ' réglage(s) ?', function () {
            var lignes = [];
            Ext.Object.each(me.changements, function (id, c) {
                lignes.push({id: id, enReserve: c.enReserve,
                    capacite: c.enReserve ? (c.capacite === undefined ? null : c.capacite) : null,
                    seuilMini: c.enReserve ? (c.seuilMini === undefined ? null : c.seuilMini) : null});
            });
            var fin = PrestigeChargement.occuper(b, 'Enregistrement');
            Ext.Ajax.request({url: '../api/v1/reserve/liste/enregistrer', method: 'POST', jsonData: {lignes: lignes},
                callback: function (o, succes, r) {
                    var rep = succes ? Ext.decode(r.responseText, true) : null;
                    if (!rep || !rep.success) {
                        fin((rep && rep.msg) || 'Échec de l\'enregistrement', false);
                        return;
                    }
                    var ok = rep.misEnReserve + rep.retires + rep.reglages;
                    me.refus = rep.refus || [];
                    var gardes = {};
                    Ext.Array.each(me.refus, function (x) {
                        if (me.changements[x.id]) {
                            gardes[x.id] = me.changements[x.id];
                        }
                    });
                    me.changements = gardes;
                    fin(ok + ' produit(s) enregistré(s)' + (me.refus.length ? ', ' + me.refus.length + ' refus' : ''), !me.refus.length);
                    me.store.load();
                    me.compterBase();
                }});
        });
    },

    pdf: function (b) {
        var me = this, fin = PrestigeChargement.occuper(b, 'PDF');
        Ext.Ajax.request({url: '../api/v1/reserve/liste/pdf', method: 'GET', params: me.parametres(),
            callback: function (o, succes, r) {
                var rep = succes ? Ext.decode(r.responseText, true) : null;
                if (!rep || !rep.success || !rep.url) {
                    fin((rep && rep.msg) || 'Impression impossible', false);
                    return;
                }
                fin(rep.lignes + ' ligne(s)', true);
                window.open('..' + rep.url, '_blank');
            }});
    }
});
