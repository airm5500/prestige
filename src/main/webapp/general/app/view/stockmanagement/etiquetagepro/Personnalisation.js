/* global Ext */
/*
 * Etiquettage Pro, onglet « Personnalisation » (retours du 11/10) : vue reelle de l'etiquette pour un type de code et
 * une dimension, informations a cocher (imprimee ; dans le code pour DataMatrix+ / QR+), deplacement a la souris ou au
 * clavier, agrandissement par les points d'extension, zoom de la zone de travail (la dimension de l'etiquette ne change
 * pas). Le serveur controle la lisibilite a chaque changement (code, polices, marges, chevauchements) et rend le texte
 * exactement comme il sera imprime ; « Valider » n'est possible que sans probleme bloquant. Modification reservee au
 * droit P_SM_ETIQUETTE_PERSO (administrateur par defaut) ; sinon lecture seule. Aucune fenetre.
 * API v1/etiquetage-pro/disposition/...
 */
Ext.define('testextjs.view.stockmanagement.etiquetagepro.Personnalisation', {
    extend: 'Ext.panel.Panel',
    xtype: 'etqpersonnalisation',
    border: false,
    layout: {type: 'hbox', align: 'stretch'},
    cls: 'etqp-perso',

    /** pixels par millimetre a 100 % (ecran a 96 points par pouce) */
    PX_MM: 96 / 25.4,
    PT_MM: 25.4 / 72,
    POLICE_MIN: 4.5,
    POLICE_MAX: 24,
    PAS: 0.1,

    initComponent: function () {
        var me = this;
        me.disp = null;
        me.demande = 0;
        me.selection = null;
        me.modifie = false;
        me.exempleCourant = null;
        me.elementsStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle', {name: 'imprime', type: 'boolean'}, {name: 'dansLeCode', type: 'boolean'},
                {name: 'possibleDansLeCode', type: 'boolean'}, {name: 'police', type: 'float'}, {name: 'texte', type: 'boolean'}, 'etat'],
            proxy: {type: 'memory'}
        });
        me.typesStore = Ext.create('Ext.data.Store', {fields: ['id', 'libelle', 'etendu'], proxy: {type: 'memory'}});
        me.tbar = {xtype: 'toolbar', enableOverflow: true, items: [
                {xtype: 'combobox', itemId: 'persoType', fieldLabel: 'Type de code', labelWidth: 85, width: 330, store: me.typesStore,
                    valueField: 'id', displayField: 'libelle', queryMode: 'local', editable: false, listeners: {select: function () {
                            me.charger();
                        }}},
                {xtype: 'combobox', itemId: 'persoModele', fieldLabel: 'Planche', labelWidth: 50, width: 330, valueField: 'id',
                    displayField: 'libelle', queryMode: 'local', editable: false, listeners: {select: function () {
                            me.charger();
                        }}},
                {xtype: 'tbtext', itemId: 'persoDim', text: ''},
                '-',
                {xtype: 'tbtext', text: 'Zoom'},
                {xtype: 'slider', itemId: 'persoZoom', width: 140, minValue: 100, maxValue: 1000, increment: 25, value: 400,
                    tipText: function (t) {
                        return t.value + ' %';
                    }, listeners: {change: function () {
                            me.majZoom();
                        }}},
                {xtype: 'tbtext', itemId: 'persoZoomTexte', text: '400 %'},
                '-',
                {xtype: 'textfield', itemId: 'persoCip', emptyText: 'CIP d\'un produit (exemple)', width: 170, enableKeyEvents: true,
                    listeners: {specialkey: function (f, e) {
                            if (e.getKey() === e.ENTER) {
                                me.chargerExemple();
                            }
                        }}},
                {text: 'Aperçu avec ce produit', itemId: 'persoExemple', handler: function () {
                        me.chargerExemple();
                    }},
                {text: 'Pire cas', itemId: 'persoPireCas', tooltip: 'Nom très long, prix et lot les plus longs : la disposition doit rester lisible',
                    handler: function () {
                        me.exempleCourant = me.pireCas();
                        me.controler();
                    }}
            ]};
        me.items = [
            {xtype: 'gridpanel', itemId: 'persoElements', title: 'Informations', width: 330, store: me.elementsStore, columnLines: true,
                plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1, listeners: {
                            beforeedit: function () {
                                return me.peutModifier();
                            },
                            edit: function (ed, e) {
                                if (e.field === 'police') {
                                    me.changerPolice(e.record.get('id'), e.value);
                                }
                            }
                        }})],
                columns: [
                    {text: 'Information', dataIndex: 'libelle', flex: 1, renderer: function (v, m, r) {
                            var etat = r.get('etat');
                            var couleur = etat === 'bloquant' ? '#b42318' : etat === 'avertissement' ? '#b26a00' : '#1b2430';
                            return '<span style="color:' + couleur + (etat ? ';font-weight:bold' : '') + '">' + Ext.String.htmlEncode(v)
                                    + (etat === 'bloquant' ? ' ⛔' : etat === 'avertissement' ? ' ⚠' : '') + '</span>';
                        }},
                    {xtype: 'checkcolumn', text: 'Imprimée', itemId: 'colImprime', dataIndex: 'imprime', width: 72, listeners: {
                            beforecheckchange: function (c, i) {
                                var r = me.elementsStore.getAt(i);
                                return me.peutModifier() && r.get('id') !== 'CODE';
                            },
                            checkchange: function (c, i, coche) {
                                me.cocher(me.elementsStore.getAt(i).get('id'), 'imprime', coche);
                            }
                        }},
                    {xtype: 'checkcolumn', text: 'Dans le code', itemId: 'colDansLeCode', dataIndex: 'dansLeCode', width: 88, listeners: {
                            beforecheckchange: function (c, i) {
                                return me.peutModifier() && me.elementsStore.getAt(i).get('possibleDansLeCode');
                            },
                            checkchange: function (c, i, coche) {
                                me.cocher(me.elementsStore.getAt(i).get('id'), 'dansLeCode', coche);
                            }
                        }, renderer: function (v, m, r) {
                            if (!r.get('possibleDansLeCode')) {
                                return r.get('id') === 'CIP' ? '<span style="color:#5b6b7b">toujours</span>' : '';
                            }
                            return '<img class="x-grid-checkcolumn' + (v ? ' x-grid-checkcolumn-checked' : '') + '" src="' + Ext.BLANK_IMAGE_URL + '"/>';
                        }},
                    {text: 'Police (pt)', dataIndex: 'police', width: 70, align: 'right', editor: {xtype: 'numberfield', minValue: 4.5,
                            maxValue: 24, step: 0.5, decimalPrecision: 1, decimalSeparator: ','}, renderer: function (v, m, r) {
                            return r.get('texte') ? Ext.util.Format.number(v, '0.0') : '';
                        }}
                ],
                listeners: {select: function (sm, r) {
                        me.selectionner(r.get('id'), true);
                    }},
                bbar: [{xtype: 'tbtext', itemId: 'persoAlignTexte', text: 'Alignement :'},
                    {text: 'Gauche', itemId: 'alignG', handler: function () {
                            me.aligner('G');
                        }},
                    {text: 'Centre', itemId: 'alignC', handler: function () {
                            me.aligner('C');
                        }},
                    {text: 'Droite', itemId: 'alignD', handler: function () {
                            me.aligner('D');
                        }}]
            },
            {xtype: 'panel', itemId: 'persoZone', flex: 1, autoScroll: true, bodyStyle: 'background:#e9edf1', margin: '0 8',
                html: '<div class="etqp-plan-cadre" style="padding:24px;display:inline-block;min-width:100%;box-sizing:border-box"></div>'},
            {xtype: 'panel', itemId: 'persoDroite', width: 360, autoScroll: true, bodyPadding: 10, layout: {type: 'vbox', align: 'stretch'}, items: [
                    {xtype: 'component', itemId: 'persoSource', html: ''},
                    {xtype: 'component', itemId: 'persoControle', margin: '8 0', html: ''},
                    {xtype: 'container', layout: {type: 'hbox'}, margin: '4 0', items: [
                            {xtype: 'button', text: 'Valider', itemId: 'persoValider', cls: 'btn-primary', scale: 'medium', margin: '0 8 0 0',
                                handler: function () {
                                    me.valider();
                                }},
                            {xtype: 'button', text: 'Essai (PDF)', itemId: 'persoEssai', margin: '0 8 0 0', tooltip: 'Une étiquette d\'exemple imprimée comme à l\'impression, en première case',
                                handler: function () {
                                    me.essai();
                                }},
                            {xtype: 'button', text: 'Annuler les modifications', itemId: 'persoAnnuler', handler: function () {
                                    me.charger();
                                }}
                        ]},
                    {xtype: 'button', text: 'Rétablir la disposition d\'origine', itemId: 'persoOrigine', margin: '6 0 0 0',
                        tooltip: 'Retire la disposition enregistrée pour ce type et ce format : l\'impression reprend le dessin d\'origine',
                        handler: function () {
                            me.origine();
                        }},
                    {xtype: 'component', itemId: 'persoScan', margin: '12 0 0 0', html: ''},
                    {xtype: 'component', margin: '12 0 0 0', html: '<div class="etqp-aide" style="font-size:12px">Glissez une information pour la déplacer ;'
                                + ' tirez ses points d\'extension pour l\'agrandir (un texte agrandi en hauteur grossit sa police). Au clavier : flèches = 0,1 mm,'
                                + ' Maj + flèches = 1 mm. Le zoom ne change pas la taille réelle de l\'étiquette.</div>'}
                ]}
        ];
        if (!Ext.get('etqp-perso-styles')) {
            Ext.util.CSS.createStyleSheet('.etqp-plan{position:relative;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.25);outline:none}'
                    + '.etqp-marge{position:absolute;border:1px dashed #9fb3c8;pointer-events:none}'
                    + '.etqp-el{position:absolute;box-sizing:border-box;cursor:move;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#000;'
                    + 'outline:1px dotted rgba(11,94,120,.35)}'
                    + '.etqp-el.etqp-sel{outline:2px solid #0b5e78;z-index:5}'
                    + '.etqp-el.etqp-bloquant{outline:2px solid #b42318;background:rgba(180,35,24,.06)}'
                    + '.etqp-el.etqp-avert{outline:2px solid #e3a008}'
                    + '.etqp-el .etqp-ligne{white-space:nowrap;overflow:hidden}'
                    + '.etqp-silence{position:absolute;border:1px dotted #9fb3c8;pointer-events:none}'
                    + '.etqp-poignee{position:absolute;width:10px;height:10px;background:#fff;border:2px solid #0b5e78;box-sizing:border-box;z-index:6}'
                    + '.etqp-lecture-seule .etqp-el{cursor:default}', 'etqp-perso-styles');
        }
        me.callParent(arguments);
        me.on('destroy', function () {
            me.arreterGlisser();
        });
    },

    /* ------------------------------------------------------------------ chargement */

    peutModifier: function () {
        return !!(this.etat && this.etat.personnaliser);
    },

    /** Appelee par l'ecran a l'ouverture de l'onglet. */
    ouvrir: function () {
        var me = this, cfg = me.ecran.cfg;
        if (!cfg) {
            return;
        }
        if (!me.typesStore.getCount()) {
            me.typesStore.loadData(cfg.codes || []);
            me.down('#persoModele').bindStore(me.ecran.modelesStore);
        }
        var imp = me.ecran.options();
        if (!me.down('#persoType').getValue()) {
            me.down('#persoType').setValue(imp.code || cfg.code || 'CODE128');
        }
        me.down('#persoModele').setValue(imp.modele || cfg.modele);
        me.charger();
    },

    options: function () {
        var me = this, o = me.ecran.options();
        o.code = me.down('#persoType').getValue();
        o.modele = me.down('#persoModele').getValue();
        return o;
    },

    charger: function () {
        var me = this;
        me.ecran.appel('disposition/charger', {options: me.options()}, function (o) {
            me.etat = o;
            me.disp = o.disposition;
            me.ctrl = null;
            me.mise = {};
            me.modifie = false;
            me.selection = null;
            me.down('#persoDim').setText('<b>' + me.mm(o.largeur) + ' × ' + me.mm(o.hauteur) + ' mm</b> (taille réelle)');
            var grille = me.down('#persoElements'), colonne = grille.down('#colDansLeCode');
            if (colonne.isVisible() !== me.estEtendu()) {
                colonne.setVisible(me.estEtendu());
                if (grille.getView().rendered) {
                    grille.getView().refresh();
                }
            }
            me.setLectureSeule(!o.personnaliser);
            me.ajusterZoom();
            me.controler();
        });
    },

    setLectureSeule: function (ls) {
        var me = this;
        me[ls ? 'addCls' : 'removeCls']('etqp-lecture-seule');
        ['#persoValider', '#persoOrigine', '#persoAnnuler', '#alignG', '#alignC', '#alignD'].forEach(function (s) {
            me.down(s).setVisible(!ls);
        });
        me.down('#persoAlignTexte').setVisible(!ls);
    },

    estEtendu: function () {
        var t = this.disp && this.disp.typeCode;
        return t === 'QR_PLUS' || t === 'DATAMATRIX_PLUS';
    },

    estDeuxD: function () {
        return this.disp && this.disp.typeCode !== 'CODE128';
    },

    mm: function (v) {
        return Ext.util.Format.number(v, '0.0').replace('.', ',');
    },

    /* ------------------------------------------------------------------ exemple */

    exempleDefaut: function () {
        var cfg = this.ecran.cfg || {}, d = new Date();
        d.setFullYear(d.getFullYear() + 2);
        return {officine: this.ecran.options().officine || cfg.officine || 'PHARMACIE', designation: 'DOLIPRANE 1000MG CPR B/8',
            cip: '3400930000014', ean: '3400930000014', prix: '1250', monnaie: this.ecran.options().monnaie || 'CFA', grossiste: 'LABOREX',
            codeGeo: 'B-04', lot: 'A2410B', peremption: Ext.Date.format(d, 'd/m/Y'), date: this.ecran.options().date || cfg.date || '',
            mention: ''};
    },

    pireCas: function () {
        var e = this.exempleDefaut();
        return Ext.apply(e, {designation: 'AMOXICILLINE ACIDE CLAVULANIQUE BIOGARAN 1G/125MG POUDRE POUR SUSPENSION BUVABLE SACHET B/24',
            prix: '999999', grossiste: 'LABOREX-CI ZONE INDUSTRIELLE YOPOUGON', codeGeo: 'RESERVE-12-B', lot: 'ABCDEFGHJKLMNPQRSTUV',
            mention: 'MENTION LIBRE LONGUE'});
    },

    chargerExemple: function () {
        var me = this, cip = Ext.String.trim(me.down('#persoCip').getValue() || '');
        if (!cip) {
            me.exempleCourant = null;
            me.controler();
            return;
        }
        me.ecran.appel('produits', {cips: [cip]}, function (o) {
            var p = o.produits[cip];
            if (!p) {
                me.ecran.message('Aucun produit pour le CIP ' + cip + ' : l\'aperçu garde l\'exemple.', true);
                return;
            }
            me.exempleCourant = Ext.apply(me.exempleDefaut(), {cip: cip, designation: p.designation, prix: p.prix,
                ean: p.ean || '', grossiste: p.grossiste, codeGeo: p.codeGeo || ''});
            me.ecran.message('Aperçu avec ' + p.designation + '.');
            me.controler();
        });
    },

    /* ------------------------------------------------------------------ controle */

    /** Controle par le serveur (lisibilite, texte tel qu'imprime, modules du code), puis dessin. */
    controler: function () {
        var me = this;
        if (!me.disp) {
            return;
        }
        var demande = ++me.demande;
        me.ecran.appel('disposition/controler', {disposition: me.disp, exemple: me.exempleCourant || me.exempleDefaut()}, function (o) {
            if (demande !== me.demande) {
                return;
            }
            me.disp = o.disposition;
            me.ctrl = o.controle;
            me.valeurs = o.valeurs;
            me.mise = o.mise || {};
            me.symbole = o.symbole;
            me.contenuLisible = o.contenuLisible;
            me.majElements();
            me.dessiner();
            me.majPanneau();
        });
    },

    problemesDe: function (id) {
        return Ext.Array.filter((this.ctrl && this.ctrl.problemes) || [], function (p) {
            return p.element === id;
        });
    },

    majElements: function () {
        var me = this, lignes = [], libelles = {};
        Ext.each(me.etat.elements, function (e) {
            libelles[e.id] = e;
        });
        Ext.each(me.disp.elements, function (p) {
            var e = libelles[p.element] || {libelle: p.element};
            var pb = me.problemesDe(p.element);
            var etat = Ext.Array.some(pb, function (x) {
                return x.bloquant;
            }) ? 'bloquant' : pb.length ? 'avertissement' : '';
            lignes.push({id: p.element, libelle: e.libelle, imprime: p.imprime, dansLeCode: p.dansLeCode,
                possibleDansLeCode: !!e.dansLeCode, police: p.police, texte: p.element !== 'CODE', etat: etat});
        });
        me.elementsStore.loadData(lignes);
        if (me.selection) {
            var r = me.elementsStore.findRecord('id', me.selection, 0, false, true, true);
            if (r) {
                me.down('#persoElements').getSelectionModel().select(r, false, true);
            }
        }
    },

    majPanneau: function () {
        var me = this, o = me.etat, enc = Ext.String.htmlEncode, html;
        if (o.source === 'enregistree') {
            html = '<div class="etqp-info"><b>Disposition enregistrée</b> : utilisée à l\'impression de ce type sur ce format.</div>';
        } else if (o.source === 'echelle') {
            html = '<div class="etqp-info" style="background:#fff4e0"><b>Reportée à l\'échelle</b> depuis la disposition '
                    + enc(o.depuis) + ' : vérifiez-la, puis validez pour l\'utiliser sur ce format.</div>';
        } else if (o.historique) {
            html = '<div class="etqp-info"><b>Aucune disposition enregistrée</b> : l\'impression utilise le dessin d\'origine.'
                    + ' Ci-dessous, la disposition proposée (nom du produit sous la pharmacie, date d\'édition, grossiste) : validez-la pour l\'utiliser.</div>';
        } else {
            html = '<div class="etqp-info"><b>Disposition proposée</b> : utilisée à l\'impression de ce code étendu tant qu\'aucune'
                    + ' autre n\'est validée.</div>';
        }
        if (me.modifie) {
            html += '<div class="etqp-modifie" style="margin-top:6px;color:#b26a00;font-weight:bold">Modifications non enregistrées.</div>';
        }
        if (!o.personnaliser) {
            html += '<div style="margin-top:6px;color:#5b6b7b">Lecture seule : la personnalisation est réservée à l\'administrateur.</div>';
        }
        me.down('#persoSource').update(html);
        var c = me.ctrl || {problemes: []}, bloquants = 0;
        var liste = c.problemes.map(function (p) {
            if (p.bloquant) {
                bloquants++;
            }
            return '<li class="' + (p.bloquant ? 'etqp-pb-bloquant' : 'etqp-pb-avert') + '" style="color:' + (p.bloquant ? '#b42318' : '#b26a00')
                    + ';margin-bottom:4px">' + (p.bloquant ? '⛔ ' : '⚠ ') + enc(p.message) + '</li>';
        }).join('');
        var point = c.moduleMm ? 'Point du code : <b>' + me.mm2(c.moduleMm) + ' mm</b>' + (c.modules ? ' (' + c.modules + ' modules)' : '') : '';
        me.down('#persoControle').update('<div class="etqp-controle">' + (c.valide
                ? '<div class="etqp-valide" style="color:#17795f;font-weight:bold">✔ Lisible : code et informations</div>'
                : '<div class="etqp-invalide" style="color:#b42318;font-weight:bold">Disposition illisible : ' + bloquants + ' point(s) à corriger</div>')
                + (point ? '<div style="margin-top:4px">' + point + '</div>' : '')
                + (liste ? '<ul style="margin:6px 0 0 16px;padding:0">' + liste + '</ul>' : '') + '</div>');
        var scan = me.contenuLisible ? '<div style="font-size:12px"><b>Au scan, le code rend :</b><div class="etqp-scan" style="font-family:monospace;'
                + 'word-break:break-all;background:#f4f6f8;padding:6px;margin-top:4px">' + enc(me.contenuLisible) + '</div>'
                + (me.symbole && me.symbole.caracteres ? '<div style="color:#5b6b7b">' + me.symbole.caracteres + ' caractère(s)</div>' : '') + '</div>' : '';
        me.down('#persoScan').update(scan);
        me.down('#persoValider').setDisabled(!c.valide || !o.personnaliser || (o.source === 'enregistree' && !me.modifie));
        me.down('#persoOrigine').setDisabled(o.source !== 'enregistree');
    },

    mm2: function (v) {
        return Ext.util.Format.number(v, '0.00').replace('.', ',');
    },

    /* ------------------------------------------------------------------ dessin */

    k: function () {
        return this.PX_MM * (this.down('#persoZoom').getValue() / 100);
    },

    ajusterZoom: function () {
        var me = this, z = me.down('#persoZone'), largeur = (z.body ? z.body.getWidth() : 700) - 60;
        var zoom = Math.max(100, Math.min(1000, Math.floor(largeur / (me.etat.largeur * me.PX_MM) * 100 / 25) * 25));
        me.down('#persoZoom').setValue(zoom, false);
        me.down('#persoZoomTexte').setText(zoom + ' %');
    },

    majZoom: function () {
        var me = this;
        me.down('#persoZoomTexte').setText(me.down('#persoZoom').getValue() + ' %');
        me.dessiner();
    },

    placement: function (id) {
        return Ext.Array.findBy(this.disp.elements, function (p) {
            return p.element === id;
        });
    },

    dessiner: function () {
        var me = this, z = me.down('#persoZone');
        if (!me.disp || !z.body) {
            return;
        }
        if (!me.ctrl) {
            /* rien a dessiner avant la premiere reponse du serveur (texte et code tels qu'imprimes) */
            return;
        }
        var cadre = z.body.dom.querySelector('.etqp-plan-cadre'), k = me.k(), d = me.disp;
        cadre.innerHTML = '';
        var plan = document.createElement('div');
        plan.className = 'etqp-plan';
        plan.tabIndex = 0;
        plan.setAttribute('aria-label', 'Étiquette ' + me.mm(d.largeur) + ' × ' + me.mm(d.hauteur) + ' mm');
        plan.style.width = (d.largeur * k) + 'px';
        plan.style.height = (d.hauteur * k) + 'px';
        var marge = me.etat.marge || 1, m = document.createElement('div');
        m.className = 'etqp-marge';
        Ext.apply(m.style, {left: marge * k + 'px', top: marge * k + 'px', width: (d.largeur - 2 * marge) * k + 'px', height: (d.hauteur - 2 * marge) * k + 'px'});
        plan.appendChild(m);
        Ext.each(d.elements, function (p) {
            if (!p.imprime) {
                return;
            }
            var el = document.createElement('div');
            el.className = 'etqp-el';
            el.setAttribute('data-el', p.element);
            var pb = me.problemesDe(p.element);
            if (Ext.Array.some(pb, function (x) {
                return x.bloquant;
            })) {
                el.className += ' etqp-bloquant';
            } else if (pb.length) {
                el.className += ' etqp-avert';
            }
            if (me.selection === p.element) {
                el.className += ' etqp-sel';
            }
            me.positionner(el, p, k);
            if (p.element === 'CODE') {
                me.dessinerCode(el, p, k);
            } else {
                me.dessinerTexte(el, p, k);
            }
            el.addEventListener('mousedown', function (ev) {
                me.debutGlisser(ev, p.element, null);
            });
            plan.appendChild(el);
        });
        if (me.selection && me.peutModifier()) {
            var s = me.placement(me.selection);
            if (s && s.imprime) {
                ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(function (dir) {
                    var h = document.createElement('div');
                    h.className = 'etqp-poignee etqp-poignee-' + dir;
                    h.setAttribute('data-dir', dir);
                    var x = s.x + (dir.indexOf('w') >= 0 ? 0 : dir.indexOf('e') >= 0 ? s.l : s.l / 2);
                    var y = s.y + (dir.indexOf('n') >= 0 ? 0 : dir.indexOf('s') >= 0 ? s.h : s.h / 2);
                    h.style.left = (x * k - 5) + 'px';
                    h.style.top = (y * k - 5) + 'px';
                    h.style.cursor = dir + '-resize';
                    h.addEventListener('mousedown', function (ev) {
                        ev.stopPropagation();
                        me.debutGlisser(ev, me.selection, dir);
                    });
                    plan.appendChild(h);
                });
            }
        }
        plan.addEventListener('keydown', function (ev) {
            me.clavier(ev);
        });
        cadre.appendChild(plan);
        me.plan = plan;
    },

    positionner: function (el, p, k) {
        Ext.apply(el.style, {left: p.x * k + 'px', top: p.y * k + 'px', width: p.l * k + 'px', height: p.h * k + 'px'});
    },

    /** Texte tel qu'il sera imprime (lignes et taille calculees par le moteur PDF). */
    dessinerTexte: function (el, p, k) {
        var me = this, mise = me.mise[p.element], texte = me.valeurs && me.valeurs[p.element];
        var align = p.alignement === 'G' ? 'left' : p.alignement === 'D' ? 'right' : 'center';
        if (!mise || !texte) {
            el.innerHTML = '<div style="color:#9fb3c8;font-size:' + Math.max(9, 5 * me.PT_MM * k) + 'px;text-align:' + align + '">'
                    + Ext.String.htmlEncode((Ext.Array.findBy(me.etat.elements, function (e) {
                        return e.id === p.element;
                    }) || {}).libelle || p.element) + ' (vide pour ce produit)</div>';
            return;
        }
        var taille = mise.taille * me.PT_MM * k, hauteurLigne = taille * 1.15, total = mise.lignes.length * hauteurLigne;
        var info = Ext.Array.findBy(me.etat.elements, function (e) {
            return e.id === p.element;
        }) || {};
        el.style.fontWeight = info.gras ? 'bold' : 'normal';
        el.style.fontSize = taille + 'px';
        el.style.lineHeight = hauteurLigne + 'px';
        el.style.textAlign = align;
        el.innerHTML = '<div style="padding-top:' + Math.max(0, (p.h * k - total) / 2) + 'px">' + mise.lignes.map(function (l) {
            return '<div class="etqp-ligne">' + Ext.String.htmlEncode(l) + '</div>';
        }).join('') + '</div>';
    },

    /** Le code, module par module, centre dans son cadre ; sa zone de silence en pointille. */
    dessinerCode: function (el, p, k) {
        var me = this, s = me.symbole;
        if (!s || !s.lignes) {
            el.innerHTML = '<div style="color:#b42318;font-size:12px;padding:4px">' + Ext.String.htmlEncode((s && s.erreur) || 'Code indisponible') + '</div>';
            return;
        }
        var cv = document.createElement('canvas'), largeurPx = Math.max(1, Math.round(p.l * k)), hauteurPx = Math.max(1, Math.round(p.h * k));
        cv.width = largeurPx;
        cv.height = hauteurPx;
        cv.style.width = largeurPx + 'px';
        cv.style.height = hauteurPx + 'px';
        var c = cv.getContext('2d'), lignes = s.lignes, n = lignes[0].length, q = s.silence;
        c.fillStyle = '#000';
        if (s.lineaire) {
            var mod = largeurPx / (n + 2 * q), x0 = (largeurPx - mod * (n + 2 * q)) / 2 + q * mod;
            for (var i = 0; i < n; i++) {
                if (lignes[0].charAt(i) === '1') {
                    c.fillRect(x0 + i * mod, 0, mod + 0.3, hauteurPx);
                }
            }
        } else {
            var total = Math.min(largeurPx, hauteurPx), module = total / (n + 2 * q);
            var ox = (largeurPx - total) / 2 + q * module, oy = (hauteurPx - total) / 2 + q * module;
            for (var y = 0; y < lignes.length; y++) {
                for (var xx = 0; xx < n; xx++) {
                    if (lignes[y].charAt(xx) === '1') {
                        c.fillRect(ox + xx * module, oy + y * module, module + 0.3, module + 0.3);
                    }
                }
            }
            var sil = document.createElement('div');
            sil.className = 'etqp-silence';
            Ext.apply(sil.style, {left: ox + 'px', top: oy + 'px', width: n * module + 'px', height: lignes.length * module + 'px'});
            el.appendChild(sil);
        }
        el.appendChild(cv);
    },

    /* ------------------------------------------------------------------ edition */

    selectionner: function (id, depuisListe) {
        var me = this;
        me.selection = id;
        if (!depuisListe) {
            var r = me.elementsStore.findRecord('id', id, 0, false, true, true);
            if (r) {
                me.down('#persoElements').getSelectionModel().select(r, false, true);
            }
        }
        me.dessiner();
        if (me.plan) {
            me.plan.focus();
        }
    },

    marquerModifie: function () {
        this.modifie = true;
        this.controler();
    },

    cocher: function (id, champ, coche) {
        var me = this, p = me.placement(id);
        if (!p) {
            return;
        }
        p[champ] = coche;
        if (champ === 'imprime' && coche) {
            me.selection = id;
            me.placerLibre(p);
        }
        me.marquerModifie();
    },

    /**
     * Information cochee : posee sur la premiere place libre de l'etiquette (dans les marges, sans toucher les autres
     * ni le code) ; s'il n'y en a pas, elle reste ou elle est et apparait en rouge avec la raison.
     */
    placerLibre: function (p) {
        var me = this, d = me.disp, marge = (me.etat && me.etat.marge) || 1, autres = Ext.Array.filter(d.elements, function (x) {
            return x.imprime && x.element !== p.element;
        });
        var libre = function (x, y) {
            return !Ext.Array.some(autres, function (o) {
                return x < o.x + o.l && o.x < x + p.l && y < o.y + o.h && o.y < y + p.h;
            });
        };
        if (libre(p.x, p.y) && p.x >= marge && p.y >= marge && p.x + p.l <= d.largeur - marge && p.y + p.h <= d.hauteur - marge) {
            return;
        }
        /* a sa taille, puis plus etroit, puis police reduite (jamais sous le minimum lisible) */
        var depart = {l: p.l, h: p.h, police: p.police};
        for (var police = depart.police; police >= me.POLICE_MIN - 0.001; police -= 0.5) {
            var h = p.element === 'CODE' ? depart.h : Math.max(police * me.PT_MM * 1.15, police === depart.police ? depart.h : 0);
            for (var largeur = depart.l; largeur >= Math.min(depart.l, 8) - 0.001; largeur -= 2) {
                p.l = largeur;
                p.h = h;
                for (var y = marge; y + p.h <= d.hauteur - marge + 0.001; y += me.PAS) {
                    for (var x = marge; x + p.l <= d.largeur - marge + 0.001; x += me.PAS) {
                        if (libre(x, y)) {
                            p.x = me.arrondi(x);
                            p.y = me.arrondi(y);
                            p.l = me.arrondi(p.l);
                            p.h = Math.ceil(p.h * 100) / 100;
                            p.police = police;
                            return;
                        }
                    }
                }
            }
            if (p.element === 'CODE') {
                break;
            }
        }
        /* aucune place : il reste a sa place d'origine, en rouge avec la raison */
        p.l = depart.l;
        p.h = depart.h;
        p.police = depart.police;
    },

    changerPolice: function (id, valeur) {
        var me = this, p = me.placement(id);
        if (!p || id === 'CODE' || !valeur) {
            return;
        }
        var police = Math.max(me.POLICE_MIN, Math.min(me.POLICE_MAX, valeur));
        /* le cadre suit la police (au moins une ligne) */
        var ligne = police * me.PT_MM * 1.15;
        p.police = police;
        if (p.h < ligne) {
            p.h = Math.min(me.disp.hauteur - p.y, ligne);
        }
        me.marquerModifie();
    },

    aligner: function (a) {
        var me = this, p = me.selection && me.placement(me.selection);
        if (!p || p.element === 'CODE' || !me.peutModifier()) {
            return;
        }
        p.alignement = a;
        me.marquerModifie();
    },

    arrondi: function (v) {
        return Math.round(v / this.PAS) * this.PAS;
    },

    /** Deplacement (dir null) ou agrandissement par un point d'extension. */
    debutGlisser: function (ev, id, dir) {
        var me = this;
        if (ev.button !== 0) {
            return;
        }
        ev.preventDefault();
        if (me.selection !== id) {
            me.selectionner(id);
        }
        if (!me.peutModifier()) {
            return;
        }
        var p = me.placement(id), k = me.k();
        me.glisse = {p: p, dir: dir, x0: ev.clientX, y0: ev.clientY, depart: Ext.apply({}, p), k: k};
        me.surBouger = function (e) {
            me.bouger(e);
        };
        me.surLacher = function () {
            me.lacher();
        };
        document.addEventListener('mousemove', me.surBouger);
        document.addEventListener('mouseup', me.surLacher);
    },

    bouger: function (e) {
        var me = this, g = me.glisse;
        if (!g) {
            return;
        }
        var dx = (e.clientX - g.x0) / g.k, dy = (e.clientY - g.y0) / g.k, d = g.depart, p = g.p, W = me.disp.largeur, H = me.disp.hauteur;
        if (!g.dir) {
            p.x = me.arrondi(Math.max(0, Math.min(W - d.l, d.x + dx)));
            p.y = me.arrondi(Math.max(0, Math.min(H - d.h, d.y + dy)));
        } else {
            var x1 = d.x, y1 = d.y, x2 = d.x + d.l, y2 = d.y + d.h;
            if (g.dir.indexOf('w') >= 0) {
                x1 = Math.max(0, Math.min(x2 - 1, d.x + dx));
            }
            if (g.dir.indexOf('e') >= 0) {
                x2 = Math.min(W, Math.max(x1 + 1, x2 + dx));
            }
            if (g.dir.indexOf('n') >= 0) {
                y1 = Math.max(0, Math.min(y2 - 1, d.y + dy));
            }
            if (g.dir.indexOf('s') >= 0) {
                y2 = Math.min(H, Math.max(y1 + 1, y2 + dy));
            }
            if (p.element === 'CODE' && me.estDeuxD()) {
                /* code 2D : reste carre (le plus grand cote tire), sans sortir de l'etiquette */
                var cote = Math.max(x2 - x1, y2 - y1);
                cote = Math.min(cote, g.dir.indexOf('w') >= 0 ? x2 : W - x1, g.dir.indexOf('n') >= 0 ? y2 : H - y1);
                if (g.dir.indexOf('w') >= 0) {
                    x1 = x2 - cote;
                } else {
                    x2 = x1 + cote;
                }
                if (g.dir.indexOf('n') >= 0) {
                    y1 = y2 - cote;
                } else {
                    y2 = y1 + cote;
                }
            }
            p.x = me.arrondi(x1);
            p.y = me.arrondi(y1);
            p.l = me.arrondi(x2 - x1);
            p.h = me.arrondi(y2 - y1);
            if (p.element !== 'CODE' && (g.dir.indexOf('n') >= 0 || g.dir.indexOf('s') >= 0) && d.h > 0) {
                /* un texte agrandi en hauteur grossit sa police (dans les bornes lisibles) */
                p.police = Math.round(Math.max(me.POLICE_MIN, Math.min(me.POLICE_MAX, d.police * p.h / d.h)) * 4) / 4;
            }
        }
        var el = me.plan && me.plan.querySelector('[data-el="' + p.element + '"]');
        if (el) {
            me.positionner(el, p, g.k);
        }
        g.bouge = true;
    },

    lacher: function () {
        var me = this, g = me.glisse;
        me.arreterGlisser();
        if (g && g.bouge) {
            me.marquerModifie();
        }
    },

    arreterGlisser: function () {
        var me = this;
        if (me.surBouger) {
            document.removeEventListener('mousemove', me.surBouger);
            document.removeEventListener('mouseup', me.surLacher);
        }
        me.surBouger = me.surLacher = null;
        me.glisse = null;
    },

    /** Fleches : 0,1 mm (Maj : 1 mm) ; Tab : information suivante. */
    clavier: function (ev) {
        var me = this, p = me.selection && me.placement(me.selection);
        var pas = ev.shiftKey ? 1 : me.PAS, dx = 0, dy = 0;
        if (ev.key === 'ArrowLeft') {
            dx = -pas;
        } else if (ev.key === 'ArrowRight') {
            dx = pas;
        } else if (ev.key === 'ArrowUp') {
            dy = -pas;
        } else if (ev.key === 'ArrowDown') {
            dy = pas;
        } else {
            return;
        }
        ev.preventDefault();
        if (!p || !me.peutModifier()) {
            return;
        }
        p.x = me.arrondi(Math.max(0, Math.min(me.disp.largeur - p.l, p.x + dx)));
        p.y = me.arrondi(Math.max(0, Math.min(me.disp.hauteur - p.h, p.y + dy)));
        me.modifie = true;
        clearTimeout(me.minuterie);
        me.dessiner();
        me.plan.focus();
        me.minuterie = setTimeout(function () {
            me.controler();
        }, 300);
    },

    /* ------------------------------------------------------------------ actions */

    valider: function () {
        var me = this;
        me.ecran.appel('disposition/enregistrer', {disposition: me.disp}, function (o) {
            me.ecran.message(o.msg);
            me.charger();
        });
    },

    origine: function () {
        var me = this;
        me.ecran.appel('disposition/supprimer', {type: me.disp.typeCode, largeur: me.disp.largeur, hauteur: me.disp.hauteur}, function (o) {
            me.ecran.message(o.msg);
            me.charger();
        });
    },

    essai: function () {
        var me = this, o = me.options();
        o.position = 1;
        var f = document.createElement('form');
        f.method = 'POST';
        f.action = me.ecran.URL + 'disposition/pdf';
        f.target = '_blank';
        f.style.display = 'none';
        var i = document.createElement('input');
        i.type = 'hidden';
        i.name = 'donnees';
        i.value = Ext.JSON.encode({disposition: me.disp, exemple: me.exempleCourant || me.exempleDefaut(), options: o});
        f.appendChild(i);
        document.body.appendChild(f);
        f.submit();
        document.body.removeChild(f);
        me.ecran.message('Essai envoyé : une étiquette d\'exemple en première case, à imprimer à 100 %.');
    }
});
