/* global Ext */
/*
 * Etiquettage Pro, onglet « Impression Prestige » (retours du 11/10) : apercu avant impression des etiquettes de
 * Prestige (panier de l'etiquetage massif, bon de livraison), comme l'etape 4 de l'assistant. Les reglages de Prestige
 * (parametres KEY_ETIQUETTE_*) s'affichent et se reglent a l'ecran ; la planche se voit (cases deja utilisees,
 * etiquettes a imprimer, clic sur une case = position de depart) ; le resume donne le nombre d'etiquettes par type
 * (« selon le type de chaque produit » ou le code force). Page de test et PDF par le moteur de Prestige (/Etiquete),
 * avec les reglages de l'ecran. « Enregistrer comme réglages par défaut » : administrateur seulement. Aucune fenetre.
 */
Ext.define('testextjs.view.stockmanagement.etiquetagepro.ImpressionPrestige', {
    extend: 'Ext.form.Panel',
    xtype: 'etqimpression',
    border: false,
    autoScroll: true,
    bodyPadding: 12,
    layout: {type: 'hbox', align: 'stretchmax'},

    COULEURS: {CODE128: '#7d8b99', DATAMATRIX: '#0b5e78', QR: '#3f7d3a', DATAMATRIX_PLUS: '#8a4b9a', QR_PLUS: '#b26a00'},
    LIBELLES: {CODE128: 'Code-barres', DATAMATRIX: 'DataMatrix', QR: 'QR code', DATAMATRIX_PLUS: 'DataMatrix+', QR_PLUS: 'QR+'},

    initComponent: function () {
        var me = this, ecran = me.ecran;
        me.bonsStore = Ext.create('Ext.data.Store', {fields: ['id', 'ref', 'date', 'grossiste', {name: 'etiquettes', type: 'int'},
                {name: 'libelle', convert: function (v, r) {
                        return r.get('ref') + ' — ' + r.get('date') + ' — ' + r.get('grossiste') + ' (' + r.get('etiquettes') + ' étiq.)';
                    }}], proxy: {type: 'memory'}});
        var reglages = ecran.REGLAGES.map(function (r) {
            return {xtype: 'numberfield', itemId: 'imp' + r[0], name: r[0], fieldLabel: r[1], minValue: r[2], maxValue: r[3],
                decimalPrecision: r[4], allowDecimals: r[4] > 0, decimalSeparator: ',', labelWidth: 160, width: 260,
                listeners: {change: function () {
                        me.majApercu();
                    }}};
        });
        me.items = [
            {xtype: 'container', width: 470, layout: 'anchor', defaults: {anchor: '100%', labelWidth: 150}, items: [
                    {xtype: 'radiogroup', itemId: 'impSource', fieldLabel: 'Étiquettes à imprimer', columns: 1, items: [
                            {boxLabel: 'Panier de l\'étiquetage massif (gestion des étiquettes)', name: 'source', inputValue: 'PANIER', checked: true},
                            {boxLabel: 'Bon de livraison (quantités reçues)', name: 'source', inputValue: 'BL'}
                        ], listeners: {change: function () {
                                me.majSource();
                            }}},
                    {xtype: 'combobox', itemId: 'impBon', fieldLabel: 'Bon de livraison', store: me.bonsStore, valueField: 'id', displayField: 'libelle',
                        queryMode: 'local', hidden: true, editable: true, anyMatch: true, forceSelection: true, emptyText: 'Référence du bon…',
                        listeners: {select: function () {
                                me.resume();
                            }}},
                    {xtype: 'checkbox', itemId: 'impParProduit', fieldLabel: 'Type de code', boxLabel: 'Selon le type d\'étiquette de chaque produit',
                        checked: true, listeners: {change: function () {
                                me.resume();
                            }}},
                    {xtype: 'radiogroup', itemId: 'impCode', fieldLabel: 'Sinon (produits sans type)', columns: 1, items: [
                            {boxLabel: 'Code-barres standard (CIP)', name: 'impcode', inputValue: 'CODE128'},
                            {boxLabel: 'DataMatrix (GS1)', name: 'impcode', inputValue: 'DATAMATRIX'},
                            {boxLabel: 'QR code (GS1)', name: 'impcode', inputValue: 'QR'}
                        ], listeners: {change: function () {
                                me.resume();
                            }}},
                    {xtype: 'combobox', itemId: 'impModele', fieldLabel: 'Planche', store: ecran.modelesStore, valueField: 'id', displayField: 'libelle',
                        queryMode: 'local', editable: false, listeners: {change: function () {
                                me.majFormat();
                            }}},
                    {xtype: 'numberfield', itemId: 'impPosition', fieldLabel: 'Commencer à la position', minValue: 1, value: 1, allowDecimals: false,
                        listeners: {change: function () {
                                me.majApercu();
                            }}},
                    {xtype: 'displayfield', itemId: 'impOfficine', fieldLabel: 'Nom de la pharmacie'},
                    {xtype: 'textfield', itemId: 'impDate', fieldLabel: 'Date d\'édition', maxLength: 20, emptyText: 'vide : pas de date imprimée'},
                    {xtype: 'component', itemId: 'impResume', margin: '10 0', html: ''},
                    {xtype: 'container', layout: 'hbox', items: [
                            {xtype: 'button', text: 'Page de test', itemId: 'impTest', margin: '0 10 0 0', handler: function () {
                                    me.imprimer(true);
                                }},
                            {xtype: 'button', text: 'Générer le PDF', itemId: 'impPdf', cls: 'btn-primary', scale: 'medium', handler: function () {
                                    me.imprimer(false);
                                }}
                        ]},
                    {xtype: 'button', text: 'Enregistrer comme réglages par défaut', itemId: 'impEnregistrer', margin: '12 0 0 0',
                        tooltip: 'Les réglages de cet écran deviennent ceux de toutes les impressions d\'étiquettes de Prestige', handler: function () {
                            me.enregistrer();
                        }}
                ]},
            {xtype: 'fieldset', itemId: 'impReglages', title: 'Format de la planche et calage', margin: '0 0 0 20', width: 300, items: reglages},
            {xtype: 'panel', itemId: 'impPlanche', title: 'Aperçu de la planche (cliquez une case pour commencer là)', margin: '0 0 0 20', flex: 1,
                minWidth: 260, bodyPadding: 10, html: ''}
        ];
        me.callParent(arguments);
    },

    /** Appelee par l'ecran a l'ouverture de l'onglet : reglages de Prestige. */
    ouvrir: function () {
        var me = this;
        me.ecran.appel('impression/reglages', null, function (o) {
            me.cfg = o;
            me.down('#impCode').setValue({impcode: o.code});
            me.down('#impParProduit').setValue(o.parProduit);
            me.down('#impModele').setValue(o.modele);
            me.down('#impOfficine').setValue(Ext.String.htmlEncode(o.officine));
            if (!me.down('#impDate').getValue()) {
                me.down('#impDate').setValue(o.date);
            }
            Ext.Object.each(o.reglages, function (k, v) {
                var f = me.down('#imp' + k);
                if (f) {
                    f.setValue(v === '' ? null : Number(String(v).replace(',', '.')));
                }
            });
            me.down('#impEnregistrer').setVisible(o.peutEnregistrer);
            me.majFormat();
            me.majSource();
        });
    },

    source: function () {
        return this.down('#impSource').getValue().source || 'PANIER';
    },

    majSource: function () {
        var me = this, bl = me.source() === 'BL';
        me.down('#impBon').setVisible(bl);
        if (bl && !me.bonsStore.getCount()) {
            me.ecran.appel('impression/bons', null, function (o) {
                me.bonsStore.loadData(o.bons);
            });
        }
        me.resume();
    },

    majFormat: function () {
        var me = this, libre = me.down('#impModele').getValue() === 'PERSONNALISE';
        Ext.each(me.ecran.DIMENSIONS, function (k) {
            me.down('#imp' + k).setDisabled(!libre);
        });
        me.majApercu();
    },

    /** Geometrie de la planche affichee : modele de Prestige, ou format libre de l'ecran. */
    geometrie: function () {
        var me = this, m = me.down('#impModele').getValue(), v = function (k, d) {
            var x = me.down('#imp' + k).getValue();
            return x === null || x === undefined || x === '' ? d : Number(x);
        };
        if (m === 'PERSONNALISE') {
            return {col: Math.max(1, v('KEY_ETIQUETTE_NB_COLONNES', 5)), lig: Math.max(1, v('KEY_ETIQUETTE_NB_LIGNES', 13)),
                l: v('KEY_ETIQUETTE_LARGEUR_MM', 38), h: v('KEY_ETIQUETTE_HAUTEUR_MM', 21.2)};
        }
        return m === 'CARRE_38_1X21_2' ? {col: 5, lig: 13, l: 38.1, h: 21.2} : m === 'ARRONDI_38X21' ? {col: 5, lig: 13, l: 38, h: 21}
                : {col: 5, lig: 13, l: 38, h: 21.2};
    },

    resume: function () {
        var me = this;
        if (!me.cfg) {
            return;
        }
        var id = me.source() === 'BL' ? me.down('#impBon').getValue() : '';
        if (me.source() === 'BL' && !id) {
            me.etat = {total: 0, parType: {}, produits: 0};
            me.majApercu();
            return;
        }
        me.ecran.appel('impression/resume', {source: me.source(), id: id || '', parProduit: me.down('#impParProduit').getValue(),
            code: me.down('#impCode').getValue().impcode || 'CODE128'}, function (o) {
            me.etat = o;
            me.majApercu();
        });
    },

    /** Planche dessinee a l'echelle : cases deja utilisees en gris, etiquettes a imprimer en couleur par type. */
    majApercu: function () {
        var me = this, p = me.down('#impPlanche');
        if (!p || !p.body || !me.etat) {
            return;
        }
        var g = me.geometrie(), parPage = g.col * g.lig, pos = Math.min(Math.max(me.down('#impPosition').getValue() || 1, 1), parPage);
        me.down('#impPosition').setMaxValue(parPage);
        var types = [], total = me.etat.total || 0;
        Ext.Object.each(me.etat.parType || {}, function (t, n) {
            for (var i = 0; i < n && types.length < parPage - pos + 1; i++) {
                types.push(t);
            }
        });
        var largeur = Math.min(360, p.body.getWidth() - 20 || 320), k = largeur / (g.col * g.l), html = '<div class="etqp-planche" style="display:grid;'
                + 'grid-template-columns:repeat(' + g.col + ',' + (g.l * k) + 'px);gap:2px;background:#e9edf1;padding:6px;width:max-content">';
        for (var i = 1; i <= parPage; i++) {
            var t = i >= pos ? types[i - pos] : null, fond = i < pos ? '#c9d1d9' : t ? me.COULEURS[t] || '#7d8b99' : '#fff';
            html += '<div class="etqp-case" data-position="' + i + '" title="Position ' + i + (t ? ' — ' + (me.LIBELLES[t] || t) : '') + '" style="height:'
                    + Math.max(8, g.h * k) + 'px;background:' + fond + ';border:1px solid #b8c1cb;cursor:pointer;font-size:9px;color:#fff;'
                    + 'display:flex;align-items:center;justify-content:center">' + (i === pos ? '▶' : '') + '</div>';
        }
        html += '</div>';
        var legende = Ext.Object.getKeys(me.etat.parType || {}).map(function (t) {
            return '<span style="display:inline-block;margin-right:10px"><span style="display:inline-block;width:10px;height:10px;background:'
                    + (me.COULEURS[t] || '#7d8b99') + ';margin-right:4px"></span>' + (me.LIBELLES[t] || t) + ' : <b>' + me.etat.parType[t] + '</b></span>';
        }).join('');
        p.update('<div style="margin-bottom:6px;font-size:12px">' + (legende || '<i>Aucune étiquette</i>') + '</div>' + html
                + '<div style="font-size:12px;color:#5b6b7b;margin-top:6px">Gris : cases déjà utilisées ; ▶ : première étiquette. Première planche montrée.</div>');
        Ext.each(p.body.dom.querySelectorAll('.etqp-case'), function (c) {
            c.addEventListener('click', function () {
                me.down('#impPosition').setValue(Number(c.getAttribute('data-position')));
            });
        });
        var pages = total ? Math.ceil((total + pos - 1) / parPage) : 0;
        me.down('#impResume').update('<div class="etqp-resume"><b>' + total + '</b> étiquette(s) pour <b>' + (me.etat.produits || 0) + '</b> produit(s), '
                + parPage + ' par planche : <b>' + pages + '</b> planche(s).' + (total === 0
                ? '<br><span style="color:#b42318">Aucune étiquette à imprimer' + (me.source() === 'BL' && !me.down('#impBon').getValue() ? ' : choisissez un bon.' : '.') + '</span>'
                : '') + '</div>');
        me.down('#impPdf').setDisabled(total === 0);
    },

    /** Parametres envoyes au moteur de Prestige (reglages de l'ecran prioritaires sur la configuration). */
    parametres: function (test) {
        var me = this, q = {modele_ETIQUETTE: me.down('#impModele').getValue(), code: me.down('#impCode').getValue().impcode || 'CODE128',
            parProduit: me.down('#impParProduit').getValue() ? '1' : '0', date: me.down('#impDate').getValue() || ''};
        Ext.each(me.ecran.REGLAGES, function (r) {
            var f = me.down('#imp' + r[0]);
            if (!f.isDisabled() && f.getValue() !== null && f.getValue() !== '') {
                q[r[0]] = String(f.getValue());
            }
        });
        var pos = me.down('#impPosition').getValue() || 1;
        if (test) {
            q.test = '1';
        } else if (me.source() === 'BL') {
            q.lg_BON_LIVRAISON_ID = me.down('#impBon').getValue();
            q.int_NUMBER = pos;
        } else {
            q.etiquettes = 'EN_PREPARATION';
            q.int_NUMBER = pos;
        }
        return q;
    },

    imprimer: function (test) {
        var me = this;
        window.open('../Etiquete?' + Ext.Object.toQueryString(me.parametres(test)));
        me.ecran.message(test ? 'Page de test envoyée : imprimez-la à 100 % et superposez-la sur une planche.'
                : 'Planche envoyée (' + ((me.etat && me.etat.total) || 0) + ' étiquette(s)).' + (me.source() === 'PANIER' ? ' Le panier est soldé.' : ''));
        if (!test && me.source() === 'PANIER') {
            Ext.defer(function () {
                me.resume();
            }, 1500);
        }
    },

    enregistrer: function () {
        var me = this, reglages = {};
        Ext.each(me.ecran.REGLAGES, function (r) {
            var f = me.down('#imp' + r[0]);
            reglages[r[0]] = f.getValue() === null || f.getValue() === undefined ? '' : String(f.getValue());
        });
        me.ecran.appel('impression/reglages/enregistrer', {code: me.down('#impCode').getValue().impcode || 'CODE128',
            parProduit: me.down('#impParProduit').getValue(), modele: me.down('#impModele').getValue(), reglages: reglages}, function (o) {
            me.ecran.message(o.msg);
        });
    }
});
