/* global Ext */
/*
 * Etiquettage Pro (retours du 10/10) : etiquettes de produits importes d'un fichier CSV / Excel ou saisis a l'ecran,
 * en code-barres standard, DataMatrix ou QR code, sur les planches de Prestige. Impression seule : rien n'est enregistre
 * dans les fiches articles.
 *
 * Assistant en 4 etapes, dans l'ecran (aucune fenetre) :
 *  1. Source : fichier (CSV, Excel ; feuille au choix ; 1re ligne = titres) ou saisie directe ;
 *  2. Zones : pour chaque zone de l'etiquette, une colonne du fichier, un texte fixe ou un modele (« Lot {Lot} ») ;
 *     zones obligatoires au choix (le CIP l'est toujours) ; zones ajoutees (nom libre) ; correspondance retenue par
 *     poste pour les fichiers de meme forme ;
 *  3. Produits : tableau modifiable (ajouter, supprimer, completer depuis Prestige par le CIP), lignes en erreur en
 *     rouge, non imprimees ;
 *  4. Impression : type de code, planche (modeles de Prestige ou format libre), calage, premiere position, pharmacie,
 *     monnaie, date ; page de test ; PDF.
 * API v1/etiquetage-pro.
 */
Ext.define('testextjs.view.stockmanagement.etiquetagepro.EtiquetagePro', {
    extend: 'Ext.panel.Panel',
    xtype: 'etiquetagepro',
    title: 'Étiquettage Pro',
    cls: 'etqp-ecran',
    layout: {type: 'vbox', align: 'stretch'},
    config: {nameintern: '', titre: '', data: null},

    URL: '../api/v1/etiquetage-pro/',
    ETAPES: ['Source', 'Zones', 'Produits', 'Impression'],
    REGLAGES: [
        ['KEY_ETIQUETTE_NB_COLONNES', 'Colonnes', 1, 20, 0],
        ['KEY_ETIQUETTE_NB_LIGNES', 'Lignes', 1, 40, 0],
        ['KEY_ETIQUETTE_LARGEUR_MM', 'Largeur (mm)', 5, 210, 2],
        ['KEY_ETIQUETTE_HAUTEUR_MM', 'Hauteur (mm)', 5, 297, 2],
        ['KEY_ETIQUETTE_ESPACE_H_MM', 'Espace horizontal (mm)', 0, 50, 2],
        ['KEY_ETIQUETTE_ESPACE_V_MM', 'Espace vertical (mm)', 0, 50, 2],
        ['KEY_ETIQUETTE_MARGE_GAUCHE_MM', 'Marge gauche (mm)', 0, 100, 2],
        ['KEY_ETIQUETTE_MARGE_HAUT_MM', 'Marge haut (mm)', 0, 100, 2],
        ['KEY_ETIQUETTE_DECALAGE_X_MM', 'Décalage X (mm)', -50, 50, 2],
        ['KEY_ETIQUETTE_DECALAGE_Y_MM', 'Décalage Y (mm)', -50, 50, 2],
        ['KEY_ETIQUETTE_ECHELLE_POURCENT', 'Échelle (%)', 50, 150, 1]
    ],
    DIMENSIONS: ['KEY_ETIQUETTE_NB_COLONNES', 'KEY_ETIQUETTE_NB_LIGNES', 'KEY_ETIQUETTE_LARGEUR_MM', 'KEY_ETIQUETTE_HAUTEUR_MM',
        'KEY_ETIQUETTE_ESPACE_H_MM', 'KEY_ETIQUETTE_ESPACE_V_MM'],

    initComponent: function () {
        var me = this;
        me.cfg = null;
        me.tableau = null;
        me.zonesStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle', {name: 'obligatoire', type: 'boolean'}, {name: 'verrouillee', type: 'boolean'},
                {name: 'ajoutee', type: 'boolean'}, 'source', 'apercu'],
            proxy: {type: 'memory', reader: {type: 'json'}}
        });
        me.sourcesStore = Ext.create('Ext.data.Store', {fields: ['modele', 'libelle'], proxy: {type: 'memory'}});
        me.modelesStore = Ext.create('Ext.data.Store', {fields: ['id', 'libelle', 'parPage'], proxy: {type: 'memory'}});
        me.produitsStore = Ext.create('Ext.data.Store', {fields: me.champsProduits([]), proxy: {type: 'memory', reader: {type: 'json'}}});
        me.apercuStore = Ext.create('Ext.data.Store', {fields: [], proxy: {type: 'memory'}});

        me.items = [
            {xtype: 'toolbar', itemId: 'etapes', cls: 'etqp-etapes', items: me.ETAPES.map(function (t, i) {
                    return {text: (i + 1) + '. ' + t, itemId: 'etape' + i, enableToggle: true, toggleGroup: 'etqp-etape-' + me.id,
                        allowDepress: false, disabled: i > 0, handler: function () {
                            me.allerA(i);
                        }};
                })},
            {xtype: 'container', itemId: 'cartes', flex: 1, layout: 'card', items: [
                    me.carteSource(), me.carteZones(), me.carteProduits(), me.carteImpression()
                ]},
            {xtype: 'toolbar', dock: 'bottom', items: [
                    {text: '« Précédent', itemId: 'precedent', disabled: true, handler: function () {
                            me.allerA(me.etape - 1);
                        }},
                    {xtype: 'tbtext', itemId: 'etat', text: ''},
                    '->',
                    {text: 'Suivant »', itemId: 'suivant', cls: 'btn-primary', disabled: true, handler: function () {
                            me.suivant();
                        }}
                ]}
        ];
        if (!Ext.get('etqp-styles')) {
            Ext.util.CSS.createStyleSheet('.etqp-ligne-erreur .x-grid-cell{background-color:#fdecea !important}'
                    + '.etqp-aide{color:#5b6b7b}.etqp-info{padding:6px 10px;background:#eef4fb;border-radius:4px}'
                    + '.etqp-etapes .x-btn-pressed{font-weight:bold}'
                    + '.etqp-col{border-collapse:collapse;width:100%;font-size:12px}.etqp-col th,.etqp-col td{border:1px solid #d5dde6;padding:3px 5px;text-align:left;vertical-align:top}'
                    + '.etqp-col th{background:#eef4fb}.etqp-col-titre{margin:4px 0}', 'etqp-styles');
        }
        me.callParent(arguments);
        me.etape = 0;
        me.on('afterrender', function () {
            me.down('#etape0').toggle(true, true);
            me.chargerConfig();
        });
    },

    /* ------------------------------------------------------------------ outils */

    champsProduits: function (ajoutees) {
        var f = ['numero', 'CIP', 'DESIGNATION', 'PRIX', 'GROSSISTE', 'LOT', 'PEREMPTION', 'EAN', 'NOMBRE', 'DATE', 'MENTION',
            'erreurs', 'avertissements', {name: 'imprimable', type: 'boolean', defaultValue: true}, {name: 'etiquettes', type: 'int'}];
        Ext.each(ajoutees, function (a) {
            f.push('A:' + a);
        });
        return f;
    },

    appel: function (chemin, corps, ok) {
        var me = this;
        Ext.Ajax.request({
            url: me.URL + chemin, method: corps ? 'POST' : 'GET', jsonData: corps || undefined, timeout: 300000,
            success: function (r) {
                var o = Ext.JSON.decode(r.responseText, true) || {};
                if (o.success) {
                    ok(o);
                } else {
                    me.message(o.msg || 'Opération impossible.', true);
                }
            },
            failure: function () {
                me.message('Le serveur ne répond pas.', true);
            }
        });
    },

    /** Message dans la barre du bas (pas de fenetre). */
    message: function (texte, erreur) {
        var e = this.down('#etat');
        if (e) {
            e.setText('<span class="' + (erreur ? 'etqp-msg-erreur' : 'etqp-msg') + '" style="color:' + (erreur ? '#b42318' : '#17795f')
                    + ';font-weight:bold">' + Ext.String.htmlEncode(texte) + '</span>');
        }
    },

    normaliser: function (s) {
        return String(s || '').normalize ? String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
                : String(s || '').toLowerCase();
    },

    /** Meme regle que le serveur : {Colonne} ou {zone ajoutee} remplaces, le reste tel quel. */
    evaluer: function (modele, cellules, ajoutees) {
        var me = this;
        if (!modele) {
            return '';
        }
        var reference = false, renseigne = false;
        var r = String(modele).replace(/\{([^{}]+)\}/g, function (m, ref) {
            reference = true;
            var n = me.normaliser(ref), v = null;
            Ext.Object.each(ajoutees || {}, function (k, x) {
                if (me.normaliser(k) === n) {
                    v = x;
                }
            });
            if (v === null && me.tableau) {
                var i = Ext.Array.findBy(me.tableau.colonnes, function (c) {
                    return me.normaliser(c) === n;
                });
                v = i ? cellules[me.tableau.colonnes.indexOf(i)] : '';
            }
            v = v === null || v === undefined ? '' : v;
            renseigne = renseigne || String(v).trim() !== '';
            return v;
        }).replace(/\s{2,}/g, ' ').trim();
        /* « Lot {Lot} » sans lot : zone vide (meme regle que le serveur) */
        return reference && !renseigne ? '' : r;
    },

    /** Ouvre l'edition d'une cellule une fois la grille affichee (changement d'etape en cours). */
    editer: function (grille, plugin, record, colonne) {
        Ext.defer(function () {
            var c = grille.headerCt.getGridColumns()[colonne];
            if (record && c && grille.isVisible(true)) {
                grille.getPlugin(plugin).startEdit(record, c);
            }
        }, 100);
    },

    /* ----------------------------------------------------------------- etapes */

    allerA: function (i) {
        var me = this;
        if (i < 0 || i > 3) {
            return;
        }
        if (i === 2 && me.etape !== 2) {
            me.preparerProduits();
        }
        if (i === 3) {
            me.majResume();
        }
        me.etape = i;
        me.down('#cartes').getLayout().setActiveItem(i);
        me.down('#etape' + i).toggle(true, true);
        me.down('#precedent').setDisabled(i === 0);
        me.down('#suivant').setVisible(i < 3);
        me.majSuivant();
    },

    majSuivant: function () {
        var me = this, ok = false;
        if (me.etape === 0) {
            ok = !!me.tableau;
        } else if (me.etape === 1) {
            ok = !!me.tableau && !!me.zonesStore.findRecord('id', 'CIP').get('source');
        } else if (me.etape === 2) {
            ok = me.produitsStore.getCount() > 0;
        }
        me.down('#suivant').setDisabled(!ok);
    },

    suivant: function () {
        var me = this;
        if (me.etape === 1) {
            me.appliquer(function () {
                me.debloquer(2);
                me.allerA(2);
            });
            return;
        }
        me.debloquer(me.etape + 1);
        me.allerA(me.etape + 1);
    },

    debloquer: function (i) {
        for (var k = 0; k <= i; k++) {
            this.down('#etape' + k).setDisabled(false);
        }
    },

    chargerConfig: function () {
        var me = this;
        me.appel('config', null, function (o) {
            me.cfg = o;
            me.modelesStore.loadData(o.modeles);
            var zones = [];
            Ext.each(o.zones, function (z) {
                zones.push({id: z.id, libelle: z.libelle, obligatoire: z.obligatoire, verrouillee: z.verrouillee, ajoutee: false, source: '', apercu: ''});
            });
            me.zonesStore.loadData(zones);
            var imp = me.down('#etapeImpression');
            imp.down('#code').setValue({code: o.code});
            imp.down('#modele').setValue(o.modele);
            imp.down('#officine').setValue(o.officine);
            imp.down('#monnaie').setValue(o.monnaie);
            imp.down('#date').setValue(o.date);
            Ext.Object.each(o.reglages, function (k, v) {
                var f = imp.down('#' + k);
                if (f && v !== '') {
                    f.setValue(Number(String(v).replace(',', '.')));
                }
            });
            me.majFormat();
            me.majColonnes();
        });
    },

    /* ----------------------------------------------------------- 1. Source */

    carteSource: function () {
        var me = this;
        return {xtype: 'container', itemId: 'etapeSource', layout: {type: 'vbox', align: 'stretch'}, padding: 10, items: [
                {xtype: 'container', itemId: 'formFichier', layout: {type: 'hbox', align: 'middle'}, defaults: {margin: '0 12 0 0'}, items: [
                        {xtype: 'filefield', name: 'fichier', itemId: 'fichier', buttonOnly: true, hideLabel: true,
                            buttonText: 'Importer un fichier (CSV, Excel)', buttonConfig: {cls: 'btn-primary'},
                            listeners: {change: function (f, v) {
                                    if (v) {
                                        me.lireFichier(null);
                                    }
                                }}},
                        {xtype: 'checkbox', name: 'titres', itemId: 'titres', boxLabel: '1re ligne = titres des colonnes', checked: true, inputValue: 'true', uncheckedValue: 'false',
                            listeners: {change: function () {
                                    me.lireFichier(me.down('#feuille').getValue());
                                }}},
                        {xtype: 'combobox', itemId: 'feuille', name: 'feuille', fieldLabel: 'Feuille', labelWidth: 50, width: 260, hidden: true,
                            queryMode: 'local', editable: false, store: [], listeners: {select: function (c) {
                                    me.lireFichier(c.getValue());
                                }}},
                        {xtype: 'tbspacer', flex: 1},
                        {xtype: 'button', itemId: 'saisie', text: 'Saisir les produits à la main', handler: function () {
                                me.saisieDirecte();
                            }}
                    ]},
                {xtype: 'component', itemId: 'infoFichier', margin: '10 0', html: '<div class="etqp-aide">Importez un fichier CSV (séparateur ; , tabulation ou |) ou Excel (.xlsx, .xls). '
                            + 'Ses colonnes seront associées aux zones de l\'étiquette à l\'étape suivante. Vous pouvez aussi saisir les produits directement.</div>'},
                {xtype: 'container', flex: 1, layout: {type: 'hbox', align: 'stretch'}, items: [
                        {xtype: 'gridpanel', itemId: 'apercu', flex: 1, store: me.apercuStore, columns: [], title: 'Aperçu du fichier', columnLines: true},
                        {xtype: 'panel', itemId: 'colonnes', title: 'Colonnes', width: 430, margin: '0 0 0 10', autoScroll: true, bodyPadding: 8,
                            tbar: [{text: 'Télécharger un fichier modèle (CSV)', itemId: 'fichierModele', handler: function () {
                                        me.telechargerModele();
                                    }}],
                            html: ''}
                    ]}
            ]};
    },

    /**
     * Envoi du fichier au serveur (FormData) : le fichier choisi est garde, pour relire une autre feuille ou sans titres
     * sans le redemander.
     */
    /**
     * Indication des colonnes (retours du 10/10) : colonnes du fichier en cours, avec un exemple et la zone qui les
     * reprend ; titres reconnus automatiquement pour chaque zone. On sait ainsi comment preparer un nouveau modele.
     */
    majColonnes: function () {
        var me = this, p = me.down('#colonnes'), enc = Ext.String.htmlEncode;
        if (!p || !me.cfg) {
            return;
        }
        var h = '';
        if (me.tableau) {
            var premiere = me.tableau.lignes.length ? me.tableau.lignes[0] : [];
            h += '<div class="etqp-col-titre"><b>Colonnes du fichier en cours</b></div><table class="etqp-col">'
                    + '<tr><th>Colonne</th><th>Exemple (1re ligne)</th><th>Zone</th></tr>';
            me.tableau.colonnes.forEach(function (c, i) {
                var zones = [];
                me.zonesStore.each(function (z) {
                    var source = String(z.get('source') || '');
                    var refs = source.match(/\{[^{}]+\}/g) || [];
                    if (refs.some(function (r) {
                        return me.normaliser(r.slice(1, -1)) === me.normaliser(c);
                    })) {
                        zones.push(z.get('libelle'));
                    }
                });
                h += '<tr><td><b>' + enc(c) + '</b></td><td>' + enc(premiere[i] || '') + '</td><td>'
                        + (zones.length ? '<span style="color:#17795f">\u2192 ' + enc(zones.join(', ')) + '</span>'
                                : '<span style="color:#8a94a0">non utilisée</span>') + '</td></tr>';
            });
            h += '</table>';
        }
        h += '<div class="etqp-col-titre" style="margin-top:10px"><b>Titres reconnus automatiquement</b> '
                + '<span class="etqp-aide">(accents et majuscules indifférents ; * obligatoire par défaut)</span></div>'
                + '<table class="etqp-col"><tr><th>Zone</th><th>Titres de colonne</th></tr>';
        Ext.each(me.cfg.zones, function (z) {
            h += '<tr><td><b>' + enc(z.libelle) + (z.obligatoire ? ' *' : '') + '</b></td><td>' + enc((z.titres || []).join(', ')) + '</td></tr>';
        });
        h += '</table>';
        p.update(h);
    },

    telechargerModele: function () {
        var me = this;
        if (!me.cfg) {
            return;
        }
        var lien = document.createElement('a');
        lien.href = URL.createObjectURL(new Blob(['\ufeff' + me.cfg.modeleCsv], {type: 'text/csv;charset=utf-8'}));
        lien.download = 'etiquettage-pro-modele.csv';
        document.body.appendChild(lien);
        lien.click();
        document.body.removeChild(lien);
        me.message('Fichier modèle téléchargé : chaque colonne est reconnue et va dans sa zone.');
    },

    lireFichier: function (feuille) {
        var me = this, champ = me.down('#fichier'), dom = champ.fileInputEl && champ.fileInputEl.dom;
        if (dom && dom.files && dom.files.length) {
            me.fichierChoisi = dom.files[0];
        }
        if (!me.fichierChoisi) {
            return;
        }
        var donnees = new FormData();
        donnees.append('fichier', me.fichierChoisi, me.fichierChoisi.name);
        donnees.append('titres', me.down('#titres').getValue() ? 'true' : 'false');
        if (feuille) {
            donnees.append('feuille', feuille);
        }
        var x = new XMLHttpRequest();
        x.open('POST', me.URL + 'lire');
        x.onload = function () {
            me.setLoading(false);
            var o = Ext.JSON.decode(x.responseText, true) || {};
            if (o.success) {
                me.afficherTableau(o);
            } else {
                me.message(o.msg || 'Fichier illisible.', true);
            }
        };
        x.onerror = function () {
            me.setLoading(false);
            me.message('Le serveur ne répond pas.', true);
        };
        me.setLoading('Lecture du fichier...');
        x.send(donnees);
        champ.reset();
    },

    afficherTableau: function (o) {
        var me = this;
        me.tableau = {colonnes: o.colonnes, lignes: o.lignes, titres: o.titres, fichier: o.fichier, proposition: o.proposition || {}};
        var champs = o.colonnes.map(function (c, i) {
            return 'c' + i;
        });
        me.apercuStore.model.setFields(champs);
        var lignes = o.lignes.slice(0, 200).map(function (l) {
            var x = {};
            l.forEach(function (v, i) {
                x['c' + i] = v;
            });
            return x;
        });
        me.down('#apercu').reconfigure(me.apercuStore, o.colonnes.map(function (c, i) {
            return {text: Ext.String.htmlEncode(c), dataIndex: 'c' + i, flex: 1, minWidth: 90, renderer: 'htmlEncode'};
        }));
        me.apercuStore.loadData(lignes);
        var feuille = me.down('#feuille');
        feuille.setVisible(o.feuilles.length > 1);
        feuille.getStore().loadData(o.feuilles.map(function (f) {
            return [f, f];
        }));
        feuille.setValue(o.feuille || null);
        me.down('#infoFichier').update('<div class="etqp-info"><b>' + Ext.String.htmlEncode(o.fichier) + '</b> : ' + o.lignes.length + ' ligne(s), '
                + o.colonnes.length + ' colonne(s)' + (o.separateur ? ' ; séparateur « ' + Ext.String.htmlEncode(o.separateur) + ' », ' + o.encodage : '')
                + (o.feuille ? ' ; feuille « ' + Ext.String.htmlEncode(o.feuille) + ' »' : '')
                + (o.ignorees ? ' ; <span style="color:#b42318">' + o.ignorees + ' ligne(s) au-delà de la limite ignorée(s)</span>' : '') + '</div>');
        /* correspondance : celle retenue pour un fichier de meme forme, sinon celle proposee par les titres */
        me.sourcesStore.loadData([{modele: '', libelle: '(aucune)'}].concat(o.colonnes.map(function (c) {
            return {modele: '{' + c + '}', libelle: c};
        })));
        me.zonesStore.remove(me.zonesStore.query('ajoutee', true).getRange());
        me.zonesStore.each(function (z) {
            z.set('source', o.proposition[z.get('id')] || '');
        });
        var reprise = me.restaurerCorrespondance();
        me.majApercuZones();
        me.message(o.lignes.length + ' ligne(s) lue(s)' + (reprise ? ' ; correspondance reprise du dernier fichier de même forme' : '')
                + ' : vérifiez les zones à l\'étape suivante.');
        me.debloquer(1);
        me.majSuivant();
    },

    saisieDirecte: function () {
        var me = this;
        me.tableau = null;
        me.produitsStore.removeAll();
        me.reconfigurerProduits();
        me.produitsStore.add({numero: 1, NOMBRE: '1'});
        me.debloquer(3);
        me.down('#etape1').setDisabled(true);
        me.etape = 2;
        me.down('#cartes').getLayout().setActiveItem(2);
        me.down('#etape2').toggle(true, true);
        me.down('#precedent').setDisabled(false);
        me.down('#suivant').setVisible(true);
        me.majSuivant();
        me.majCompteurs();
        me.message('Saisie directe : tapez le CIP puis « Compléter depuis Prestige » pour reprendre désignation, prix et EAN.');
        me.editer(me.down('#grilleProduits'), 'editionProduits', me.produitsStore.getAt(0), 1);
    },

    /* ------------------------------------------------------------ 2. Zones */

    carteZones: function () {
        var me = this;
        return {xtype: 'gridpanel', itemId: 'etapeZones', store: me.zonesStore, columnLines: true,
            plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1, pluginId: 'editionZones', listeners: {
                        beforeedit: function (ed, e) {
                            return e.field !== 'libelle' || e.record.get('ajoutee');
                        },
                        edit: function () {
                            me.majApercuZones();
                            me.majSuivant();
                        }
                    }})],
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {text: 'Ajouter une zone', itemId: 'ajouterZone', handler: function () {
                                var n = 1;
                                while (me.zonesStore.findExact('libelle', 'Zone ' + n) >= 0) {
                                    n++;
                                }
                                var r = me.zonesStore.add({id: 'A' + Ext.id(), libelle: 'Zone ' + n, ajoutee: true, obligatoire: false, source: ''})[0];
                                me.editer(me.down('#etapeZones'), 'editionZones', r, 0);
                            }},
                        {text: 'Proposer d\'après les titres', itemId: 'proposer', handler: function () {
                                var p = me.tableau ? me.tableau.proposition || {} : {};
                                me.zonesStore.each(function (z) {
                                    if (!z.get('ajoutee')) {
                                        z.set('source', p[z.get('id')] || '');
                                    }
                                });
                                me.majApercuZones();
                                me.majSuivant();
                            }},
                        {xtype: 'tbtext', html: '<span class="etqp-aide">Choisissez une colonne, ou tapez un texte fixe ; combinez avec {Colonne} (ex. « Lot {Lot} »). '
                                    + 'Une zone ajoutée est reprise par son nom : {Rayon}.</span>'}
                    ]}],
            columns: [
                {text: 'Zone de l\'étiquette', dataIndex: 'libelle', width: 210, editor: {xtype: 'textfield', allowBlank: false, maxLength: 40},
                    renderer: function (v, m, r) {
                        return Ext.String.htmlEncode(v) + (r.get('ajoutee') ? ' <i style="color:#1f5f9e">(ajoutée)</i>' : '');
                    }},
                {xtype: 'checkcolumn', text: 'Obligatoire', dataIndex: 'obligatoire', width: 95, listeners: {
                        beforecheckchange: function (c, i) {
                            var r = me.zonesStore.getAt(i);
                            return !r.get('verrouillee') && !r.get('ajoutee');
                        }}},
                {text: 'Source (colonne, texte fixe ou modèle)', dataIndex: 'source', flex: 1, renderer: 'htmlEncode',
                    editor: {xtype: 'combobox', store: me.sourcesStore, queryMode: 'local', valueField: 'modele', displayField: 'libelle',
                        editable: true, forceSelection: false, typeAhead: false, autoSelect: false, triggerAction: 'all',
                        tpl: '<tpl for="."><div class="x-boundlist-item">{libelle:htmlEncode}</div></tpl>'}},
                {text: 'Aperçu (1re ligne)', dataIndex: 'apercu', flex: 1, renderer: function (v) {
                        return v ? '<b>' + Ext.String.htmlEncode(v) + '</b>' : '<span style="color:#8a94a0">—</span>';
                    }},
                {xtype: 'actioncolumn', width: 34, items: [{iconCls: 'act-ico act-supprimer', tooltip: 'Retirer cette zone ajoutée',
                            getClass: function (v, m, r) {
                                return r.get('ajoutee') ? 'act-ico act-supprimer' : 'x-hide-display';
                            },
                            handler: function (g, i) {
                                me.zonesStore.removeAt(i);
                                me.majApercuZones();
                            }}]}
            ]};
    },

    /** Valeur d'une ligne du fichier par zone (les sources reconnaissent aussi les zones ajoutees). */
    valeursDe: function (cellules) {
        var me = this, ajoutees = {}, z = {};
        me.zonesStore.each(function (r) {
            if (r.get('ajoutee')) {
                ajoutees[r.get('libelle')] = me.evaluer(r.get('source'), cellules, ajoutees);
            }
        });
        me.zonesStore.each(function (r) {
            z[r.get('id')] = r.get('ajoutee') ? ajoutees[r.get('libelle')] : me.evaluer(r.get('source'), cellules, ajoutees);
        });
        return z;
    },

    majApercuZones: function () {
        var me = this, premiere = me.tableau && me.tableau.lignes.length ? me.tableau.lignes[0] : [];
        var v = me.valeursDe(premiere);
        me.zonesStore.each(function (r) {
            r.set('apercu', v[r.get('id')] || '');
        });
        me.zonesStore.commitChanges();
        me.majColonnes();
    },

    correspondance: function () {
        var me = this, c = {sources: {}, obligatoires: [], ajoutees: []};
        me.zonesStore.each(function (r) {
            if (r.get('ajoutee')) {
                c.ajoutees.push({nom: r.get('libelle'), modele: r.get('source') || ''});
            } else {
                if (r.get('source')) {
                    c.sources[r.get('id')] = r.get('source');
                }
                if (r.get('obligatoire')) {
                    c.obligatoires.push(r.get('id'));
                }
            }
        });
        return c;
    },

    cleFichier: function () {
        return 'etiquetagepro.correspondance.' + this.tableau.colonnes.map(this.normaliser, this).join('|');
    },

    retenirCorrespondance: function () {
        try {
            window.localStorage.setItem(this.cleFichier(), Ext.JSON.encode(this.correspondance()));
        } catch (e) {
            /* poste sans stockage local : la proposition par les titres suffit */
        }
    },

    restaurerCorrespondance: function () {
        var me = this, c = null;
        try {
            c = Ext.JSON.decode(window.localStorage.getItem(me.cleFichier()) || 'null', true);
        } catch (e) {
            c = null;
        }
        if (!c) {
            return false;
        }
        me.zonesStore.each(function (r) {
            if (!r.get('ajoutee')) {
                r.set('source', c.sources[r.get('id')] || '');
                r.set('obligatoire', r.get('verrouillee') || c.obligatoires.indexOf(r.get('id')) >= 0);
            }
        });
        Ext.each(c.ajoutees || [], function (a) {
            me.zonesStore.add({id: 'A' + Ext.id(), libelle: a.nom, ajoutee: true, obligatoire: false, source: a.modele});
        });
        return true;
    },

    appliquer: function (suite) {
        var me = this, c = me.correspondance();
        me.retenirCorrespondance();
        me.setLoading('Préparation des lignes...');
        me.appel('appliquer', Ext.apply({colonnes: me.tableau.colonnes, lignes: me.tableau.lignes, titres: me.tableau.titres}, c), function (o) {
            me.setLoading(false);
            me.chargerProduits(o, c.ajoutees.map(function (a) {
                return a.nom;
            }));
            if (o.inconnues.length) {
                me.message('Colonne(s) introuvable(s) dans les modèles : ' + o.inconnues.join(', '), true);
            }
            suite();
        });
        Ext.defer(function () {
            me.setLoading(false);
        }, 300000);
    },

    /* --------------------------------------------------------- 3. Produits */

    ajoutees: [],

    reconfigurerProduits: function () {
        var me = this, g = me.down('#grilleProduits'), ed = function (x) {
            return Ext.apply({xtype: 'textfield', selectOnFocus: true}, x || {});
        };
        me.produitsStore.model.setFields(me.champsProduits(me.ajoutees));
        var col = function (id, texte, w, x) {
            return Ext.apply({text: texte, dataIndex: id, width: w, editor: ed(), renderer: 'htmlEncode'}, x || {});
        };
        var colonnes = [
            {text: 'N°', dataIndex: 'numero', width: 50},
            col('CIP', 'CIP *', 100),
            col('DESIGNATION', 'Désignation', 220, {flex: 1}),
            col('PRIX', 'Prix', 80, {align: 'right'}),
            col('GROSSISTE', 'Grossiste', 120),
            col('LOT', 'Lot', 90),
            col('PEREMPTION', 'Péremption', 95),
            col('EAN', 'EAN', 115),
            col('NOMBRE', 'Nb étiq.', 65, {align: 'right'}),
            col('MENTION', 'Mention', 110),
            col('DATE', 'Date', 80)
        ];
        Ext.each(me.ajoutees, function (a) {
            colonnes.push(col('A:' + a, a, 100));
        });
        colonnes.push({text: 'Contrôle', dataIndex: 'erreurs', width: 240, renderer: function (v, m, r) {
                var e = r.get('erreurs') || [], a = r.get('avertissements') || [];
                if (e.length) {
                    m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(Ext.String.htmlEncode(e.join(' ; '))) + '"';
                    return '<span class="etqp-erreur" style="color:#b42318;font-weight:bold">⛔ ' + Ext.String.htmlEncode(e.join(' ; ')) + '</span>';
                }
                if (a.length) {
                    return '<span class="etqp-avert" style="color:#b26a00">⚠ ' + Ext.String.htmlEncode(a.join(' ; ')) + '</span>';
                }
                return '<span class="etqp-ok" style="color:#17795f">✔ ' + r.get('etiquettes') + ' étiquette(s)</span>';
            }});
        g.reconfigure(me.produitsStore, colonnes);
    },

    carteProduits: function () {
        var me = this;
        return {xtype: 'gridpanel', itemId: 'grilleProduits', store: me.produitsStore, columnLines: true, columns: [],
            viewConfig: {getRowClass: function (r) {
                    return (r.get('erreurs') || []).length ? 'etqp-ligne-erreur' : '';
                }, markDirty: false},
            plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1, pluginId: 'editionProduits', listeners: {
                        edit: function (ed, e) {
                            if (e.value !== e.originalValue) {
                                me.controler([e.record]);
                            }
                        }
                    }})],
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {text: 'Ajouter une ligne', itemId: 'ajouterLigne', handler: function () {
                                var n = 0;
                                me.produitsStore.each(function (r) {
                                    n = Math.max(n, r.get('numero') || 0);
                                });
                                var r = me.produitsStore.add({numero: n + 1, NOMBRE: '1'})[0];
                                me.majCompteurs();
                                me.majSuivant();
                                me.editer(me.down('#grilleProduits'), 'editionProduits', r, 1);
                            }},
                        {text: 'Supprimer la ligne', itemId: 'supprimerLigne', handler: function () {
                                var s = me.down('#grilleProduits').getSelectionModel().getSelection();
                                me.produitsStore.remove(s);
                                me.majCompteurs();
                                me.majSuivant();
                            }},
                        {text: 'Compléter depuis Prestige', itemId: 'completer', tooltip: 'Reprend la désignation, le prix, l\'EAN et le grossiste des produits de Prestige (par le CIP), dans les cases vides seulement',
                            handler: function () {
                                me.completer();
                            }},
                        {xtype: 'combobox', itemId: 'filtre', width: 190, editable: false, queryMode: 'local', value: 'TOUTES',
                            store: [['TOUTES', 'Toutes les lignes'], ['ERREURS', 'Lignes en erreur'], ['AVERT', 'Avertissements']],
                            listeners: {change: function (c, v) {
                                    me.produitsStore.clearFilter();
                                    if (v === 'ERREURS') {
                                        me.produitsStore.filterBy(function (r) {
                                            return (r.get('erreurs') || []).length > 0;
                                        });
                                    } else if (v === 'AVERT') {
                                        me.produitsStore.filterBy(function (r) {
                                            return (r.get('avertissements') || []).length > 0;
                                        });
                                    }
                                }}},
                        '->',
                        {xtype: 'tbtext', itemId: 'compteurs', text: ''}
                    ]}]};
    },

    preparerProduits: function () {
        var me = this;
        if (!me.down('#grilleProduits').headerCt.getGridColumns().length) {
            me.reconfigurerProduits();
        }
    },

    ligneJson: function (r) {
        var me = this, v = {}, a = {};
        ['CIP', 'DESIGNATION', 'PRIX', 'GROSSISTE', 'LOT', 'PEREMPTION', 'EAN', 'NOMBRE', 'DATE', 'MENTION'].forEach(function (z) {
            v[z] = r.get(z) === null || r.get(z) === undefined ? '' : String(r.get(z));
        });
        Ext.each(me.ajoutees, function (n) {
            a[n] = r.get('A:' + n) || '';
        });
        return {numero: r.get('numero'), valeurs: v, ajoutees: a};
    },

    obligatoires: function () {
        return this.correspondance().obligatoires;
    },

    chargerProduits: function (o, ajoutees) {
        var me = this;
        me.ajoutees = ajoutees || [];
        me.produitsStore.clearFilter(true);
        me.down('#filtre').setValue('TOUTES');
        me.reconfigurerProduits();
        me.produitsStore.loadData(o.lignes.map(function (l) {
            var x = Ext.apply({numero: l.numero, erreurs: l.erreurs, avertissements: l.avertissements, imprimable: !l.erreurs.length, etiquettes: l.nombre}, l.valeurs);
            Ext.Object.each(l.ajoutees || {}, function (k, v) {
                x['A:' + k] = v;
            });
            return x;
        }));
        me.majCompteurs();
    },

    /** Controle serveur des lignes modifiees (meme regle qu'a l'impression). */
    controler: function (records) {
        var me = this;
        me.appel('controler', {obligatoires: me.obligatoires(), lignes: records.map(me.ligneJson, me)}, function (o) {
            o.lignes.forEach(function (l, i) {
                var r = records[i];
                r.set({erreurs: l.erreurs, avertissements: l.avertissements, imprimable: !l.erreurs.length, etiquettes: l.nombre});
                r.commit();
            });
            me.majCompteurs();
        });
    },

    majCompteurs: function () {
        var me = this, n = 0, e = 0, etiq = 0;
        (me.produitsStore.snapshot || me.produitsStore.data).each(function (r) {
            n++;
            if ((r.get('erreurs') || []).length) {
                e++;
            } else {
                etiq += r.get('etiquettes') || 0;
            }
        });
        me.totalEtiquettes = etiq;
        var t = me.down('#compteurs');
        if (t) {
            t.update('<span class="etqp-compteurs">' + n + ' ligne(s) ; <b style="color:' + (e ? '#b42318' : '#17795f') + '">' + e
                    + ' en erreur (non imprimée' + (e > 1 ? 's' : '') + ')</b> ; <b>' + etiq + ' étiquette(s)</b></span>');
        }
    },

    completer: function () {
        var me = this, cips = [];
        (me.produitsStore.snapshot || me.produitsStore.data).each(function (r) {
            if (r.get('CIP')) {
                cips.push(String(r.get('CIP')).trim());
            }
        });
        if (!cips.length) {
            me.message('Aucun CIP à rechercher.', true);
            return;
        }
        me.appel('produits', {cips: Ext.Array.unique(cips)}, function (o) {
            var modifiees = [], trouves = 0;
            (me.produitsStore.snapshot || me.produitsStore.data).each(function (r) {
                var p = o.produits[String(r.get('CIP') || '').trim()];
                if (!p) {
                    return;
                }
                trouves++;
                var changes = {};
                [['DESIGNATION', 'designation'], ['PRIX', 'prix'], ['EAN', 'ean'], ['GROSSISTE', 'grossiste']].forEach(function (x) {
                    if (!r.get(x[0]) && p[x[1]]) {
                        changes[x[0]] = p[x[1]];
                    }
                });
                if (Ext.Object.getSize(changes)) {
                    r.set(changes);
                    modifiees.push(r);
                }
            });
            if (modifiees.length) {
                me.controler(modifiees);
            }
            me.message(trouves + ' produit(s) trouvé(s) dans Prestige, ' + modifiees.length + ' ligne(s) complétée(s) (cases vides seulement).');
        });
    },

    /* ------------------------------------------------------- 4. Impression */

    carteImpression: function () {
        var me = this;
        var reglages = me.REGLAGES.map(function (r) {
            return {xtype: 'numberfield', itemId: r[0], fieldLabel: r[1], minValue: r[2], maxValue: r[3], decimalPrecision: r[4],
                allowDecimals: r[4] > 0, decimalSeparator: ',', labelWidth: 160, width: 260, listeners: {change: function () {
                        me.majResume();
                    }}};
        });
        return {xtype: 'form', itemId: 'etapeImpression', border: false, autoScroll: true, bodyPadding: 12, layout: {type: 'hbox', align: 'stretchmax'}, items: [
                {xtype: 'container', width: 440, layout: 'anchor', defaults: {anchor: '100%', labelWidth: 150}, items: [
                        {xtype: 'radiogroup', itemId: 'code', fieldLabel: 'Type de code', columns: 1, items: [
                                {boxLabel: 'Code-barres standard (CIP)', name: 'code', inputValue: 'CODE128', itemId: 'codeCODE128'},
                                {boxLabel: 'DataMatrix (GS1 : EAN, péremption, lot, CIP)', name: 'code', inputValue: 'DATAMATRIX', itemId: 'codeDATAMATRIX'},
                                {boxLabel: 'QR code (GS1 : EAN, péremption, lot, CIP)', name: 'code', inputValue: 'QR', itemId: 'codeQR'}
                            ]},
                        {xtype: 'combobox', itemId: 'modele', fieldLabel: 'Planche', store: me.modelesStore, valueField: 'id', displayField: 'libelle',
                            queryMode: 'local', editable: false, listeners: {change: function () {
                                    me.majFormat();
                                }}},
                        {xtype: 'numberfield', itemId: 'position', fieldLabel: 'Commencer à la position', minValue: 1, value: 1, allowDecimals: false,
                            listeners: {change: function () {
                                    me.majResume();
                                }}},
                        {xtype: 'textfield', itemId: 'officine', fieldLabel: 'Nom de la pharmacie', maxLength: 60},
                        {xtype: 'textfield', itemId: 'monnaie', fieldLabel: 'Monnaie du prix', maxLength: 10},
                        {xtype: 'textfield', itemId: 'date', fieldLabel: 'Date (code-barres standard)', maxLength: 20,
                            emptyText: 'vide : pas de date'},
                        {xtype: 'component', itemId: 'resume', margin: '12 0', html: ''},
                        {xtype: 'container', layout: 'hbox', items: [
                                {xtype: 'button', text: 'Page de test', itemId: 'pageTest', margin: '0 10 0 0', handler: function () {
                                        me.ouvrir('test');
                                    }},
                                {xtype: 'button', text: 'Imprimer (PDF)', itemId: 'imprimer', cls: 'btn-primary', scale: 'medium', handler: function () {
                                        me.ouvrir('pdf');
                                    }}
                            ]}
                    ]},
                {xtype: 'fieldset', itemId: 'reglages', title: 'Format de la planche et calage (pour cette impression)', margin: '0 0 0 20', width: 300,
                    items: reglages}
            ]};
    },

    majFormat: function () {
        var me = this, libre = me.down('#modele').getValue() === 'PERSONNALISE';
        Ext.each(me.DIMENSIONS, function (k) {
            me.down('#' + k).setDisabled(!libre);
        });
        me.majResume();
    },

    parPage: function () {
        var me = this;
        if (me.down('#modele').getValue() === 'PERSONNALISE') {
            return Math.max(1, me.down('#KEY_ETIQUETTE_NB_COLONNES').getValue() || 5) * Math.max(1, me.down('#KEY_ETIQUETTE_NB_LIGNES').getValue() || 13);
        }
        var m = me.modelesStore.findRecord('id', me.down('#modele').getValue());
        return m ? m.get('parPage') : 65;
    },

    majResume: function () {
        var me = this, r = me.down('#resume');
        if (!r || !me.down('#position')) {
            return;
        }
        var parPage = me.parPage(), pos = Math.min(Math.max(me.down('#position').getValue() || 1, 1), parPage);
        me.down('#position').setMaxValue(parPage);
        var n = me.totalEtiquettes || 0, pages = n ? Math.ceil((n + pos - 1) / parPage) : 0;
        r.update('<div class="etqp-resume"><b>' + n + '</b> étiquette(s), ' + parPage + ' par planche : <b>' + pages + '</b> planche(s).'
                + (n === 0 ? '<br><span style="color:#b42318">Aucune étiquette à imprimer : vérifiez les produits.</span>' : '') + '</div>');
        me.down('#imprimer').setDisabled(n === 0);
    },

    options: function () {
        var me = this, reglages = {};
        Ext.each(me.REGLAGES, function (x) {
            var f = me.down('#' + x[0]);
            if (!f.isDisabled() && f.getValue() !== null && f.getValue() !== '') {
                reglages[x[0]] = String(f.getValue());
            }
        });
        return {code: me.down('#code').getValue().code || 'CODE128', modele: me.down('#modele').getValue(), position: me.down('#position').getValue() || 1,
            officine: me.down('#officine').getValue(), monnaie: me.down('#monnaie').getValue(), date: me.down('#date').getValue(), reglages: reglages};
    },

    /** PDF dans un nouvel onglet (formulaire POST : les lignes peuvent etre nombreuses). */
    ouvrir: function (chemin) {
        var me = this, lignes = [];
        (me.produitsStore.snapshot || me.produitsStore.data).each(function (r) {
            lignes.push(me.ligneJson(r));
        });
        var donnees = Ext.JSON.encode({options: me.options(), obligatoires: me.obligatoires(), lignes: chemin === 'pdf' ? lignes : []});
        var f = document.createElement('form');
        f.method = 'POST';
        f.action = me.URL + chemin;
        f.target = '_blank';
        f.style.display = 'none';
        var i = document.createElement('input');
        i.type = 'hidden';
        i.name = 'donnees';
        i.value = donnees;
        f.appendChild(i);
        document.body.appendChild(f);
        f.submit();
        document.body.removeChild(f);
        me.message(chemin === 'pdf' ? 'Planche envoyée (' + (me.totalEtiquettes || 0) + ' étiquette(s)) : rien n\'est enregistré dans les fiches articles.'
                : 'Page de test envoyée : imprimez-la à 100 % et superposez-la sur une planche.');
    }
});
