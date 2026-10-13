/* global Ext */

/*
 * AUDIT & RAPPROCHEMENTS (besoins du 11/10, point 6). Onglet Analyse, en lecture seule (API v1/audit/analyse) :
 * une tuile par controle (vert : concorde ; rouge : ecarts), le detail de la tuile choisie dessous, sans fenetre.
 * Les onglets Rapports et Regularisations viendront ensuite.
 */
Ext.define('testextjs.view.audit.AuditRapprochements', {
    extend: 'Ext.tab.Panel',
    xtype: 'auditrapprochements',
    id: 'auditrapprochementsID',
    title: 'Audit & rapprochements',
    frame: true,
    width: '98%',
    height: 680,
    cls: 'auditrapprochements',

    /* colonnes du detail, par section : [champ, titre, largeur, nombre] */
    COLONNES: {
        STOCK: [['cip', 'CIP', 90], ['libelle', 'Produit', 0], ['emplacement', 'Emplacement', 150], ['stockReel', 'Stock réel', 90, 1],
            ['stockHistorique', 'Stock historique', 110, 1], ['ecart', 'Écart', 80, 1], ['dernierMouvement', 'Dernier mouvement', 130]],
        STOCK_NEGATIF: [['cip', 'CIP', 90], ['libelle', 'Produit', 0], ['emplacement', 'Emplacement', 150], ['stockReel', 'Stock', 90, 1]],
        CAISSES_OUVERTES: [['caissier', 'Caissier', 0], ['ouverture', 'Ouverte le', 140], ['jours', 'Jours', 80, 1]],
        BILLETAGE: [['caissier', 'Caissier', 0], ['ouverture', 'Ouverture', 130], ['fermeture', 'Fermeture', 130], ['attendu', 'Attendu', 110, 1],
            ['billetage', 'Billetage', 110, 1], ['ecart', 'Écart', 100, 1]],
        DIFFERES: [['client', 'Client', 0], ['ventes', 'Ventes différées', 120, 1], ['reglements', 'Règlements', 110, 1],
            ['soldeReleve', 'Solde du relevé', 120, 1], ['resteDu', 'Reste dû enregistré', 140, 1], ['ecart', 'Écart', 100, 1]],
        CARNETS: [['depot', 'Dépôt', 0], ['solde', 'Solde du carnet', 120, 1], ['ventes', 'Ventes', 110, 1], ['reglements', 'Règlements', 110, 1],
            ['retours', 'Retours', 100, 1], ['soldeCalcule', 'Solde calculé', 120, 1], ['ecart', 'Écart', 100, 1]],
        CONTROLES: [['module', 'Module', 110], ['libelle', 'Contrôle', 0], ['cas', 'Cas', 80, 1], ['erreur', 'Remarque', 200]]
    },

    initComponent: function () {
        var me = this;
        me.styles();
        me.items = [me.ongletAnalyse()];
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.lancer();
        });
    },

    esc: function (v) {
        return Ext.String.htmlEncode(v === null || v === undefined ? '' : String(v));
    },

    nombre: function (v) {
        var n = Math.round(Number(v || 0));
        return (n < 0 ? '−' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    },

    styles: function () {
        if (document.getElementById('audit-styles')) {
            return;
        }
        Ext.util.CSS.createStyleSheet(
                '.audit-tuiles{display:flex;flex-wrap:wrap;gap:10px;padding:10px}'
                + '.audit-tuile{flex:1 1 200px;min-width:200px;max-width:320px;border-radius:8px;padding:10px 12px;cursor:pointer;'
                + 'border:1px solid #d5dbe1;border-left:6px solid #1e8449;background:#fff;transition:box-shadow .15s,transform .15s}'
                + '.audit-tuile:hover{box-shadow:0 2px 8px rgba(0,0,0,.15);transform:translateY(-1px)}'
                + '.audit-tuile.ecart{border-left-color:#c0392b}.audit-tuile.erreur{border-left-color:#e67e22}'
                + '.audit-tuile.choisie{outline:2px solid #1f6fb2}'
                + '.audit-tuile .t{font-weight:bold;color:#2c3e50;margin-bottom:4px}'
                + '.audit-tuile .n{font-size:22px;font-weight:bold;color:#1e8449}.audit-tuile.ecart .n{color:#c0392b}'
                + '.audit-tuile .m{color:#555;font-size:12px}'
                + '.audit-explication{padding:6px 10px;color:#444;background:#f4f6f8;border-radius:6px;margin:0 10px}',
                'audit-styles');
    },

    ongletAnalyse: function () {
        var me = this;
        var debut = Ext.Date.getFirstDateOfMonth(new Date());
        return {
            xtype: 'panel', title: 'Analyse', itemId: 'ongletAnalyse', layout: {type: 'vbox', align: 'stretch'},
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'debut', fieldLabel: 'Billetage du', labelWidth: 80, width: 200,
                            format: 'd/m/Y', submitFormat: 'Y-m-d', value: debut},
                        {xtype: 'datefield', itemId: 'fin', fieldLabel: 'au', labelWidth: 25, width: 145,
                            format: 'd/m/Y', submitFormat: 'Y-m-d', value: new Date()},
                        {xtype: 'button', itemId: 'lancer', text: 'Lancer l\'analyse', iconCls: 'searchicon',
                            handler: function () {
                                me.lancer();
                            }},
                        '->',
                        {xtype: 'tbtext', itemId: 'resume', text: ''}
                    ]
                }],
            items: [
                {xtype: 'component', itemId: 'tuiles', html: '', autoScroll: true},
                {xtype: 'component', itemId: 'explication', html: '', margin: '0 0 6 0'},
                {xtype: 'container', itemId: 'detail', flex: 1, layout: 'fit', margin: '0 10 10 10'}
            ]
        };
    },

    lancer: function () {
        var me = this, a = me.down('#ongletAnalyse');
        var d = a.down('#debut').getValue(), f = a.down('#fin').getValue();
        if (!d || !f) {
            return;
        }
        a.setLoading('Analyse en cours…');
        Ext.Ajax.request({
            url: '../api/v1/audit/analyse', method: 'GET',
            params: {dtStart: Ext.Date.format(d, 'Y-m-d'), dtEnd: Ext.Date.format(f, 'Y-m-d')},
            success: function (response) {
                a.setLoading(false);
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success === false) {
                    me.afficherMessage(r.msg || 'Analyse refusée.');
                    return;
                }
                me.resultat = r;
                me.afficherTuiles(r);
            },
            failure: function () {
                a.setLoading(false);
                me.afficherMessage('Le serveur n\'a pas répondu.');
            }
        });
    },

    afficherMessage: function (texte) {
        var a = this.down('#ongletAnalyse');
        a.down('#tuiles').update('<div class="audit-explication" style="margin:10px">' + this.esc(texte) + '</div>');
    },

    afficherTuiles: function (r) {
        var me = this, a = me.down('#ongletAnalyse'), html = '<div class="audit-tuiles">';
        Ext.each(r.sections || [], function (s) {
            var cls = s.erreur ? 'erreur' : (s.nb > 0 ? 'ecart' : ''), m = '';
            if (s.erreur) {
                m = me.esc(s.erreur);
            } else if (s.nb === 0) {
                m = 'Concorde';
            } else if (s.montant) {
                m = me.nombre(s.montant) + ' F d\'écart';
            } else if (s.quantite) {
                m = me.nombre(s.quantite) + ' unités d\'écart';
            } else {
                m = 'À contrôler';
            }
            html += '<div class="audit-tuile ' + cls + '" data-code="' + me.esc(s.code) + '" title="' + me.esc(s.explication) + '">'
                    + '<div class="t">' + me.esc(s.titre) + '</div><div class="n">' + me.nombre(s.nb) + '</div>'
                    + '<div class="m">' + m + '</div></div>';
        });
        a.down('#tuiles').update(html + '</div>');
        a.down('#resume').setText(r.sectionsEnEcart ? r.sectionsEnEcart + ' contrôle(s) en écart' : 'Tout concorde');
        Ext.each(a.down('#tuiles').getEl().query('.audit-tuile'), function (el) {
            Ext.get(el).on('click', function () {
                me.choisir(el.getAttribute('data-code'));
            });
        });
        var premier = Ext.Array.findBy(r.sections || [], function (s) {
            return s.nb > 0;
        }) || (r.sections || [])[0];
        if (premier) {
            me.choisir(premier.code);
        }
    },

    /* tous les champs des lignes (identifiants compris, utiles aux regularisations), pas seulement les colonnes */
    champs: function (lignes, cols) {
        var vus = {};
        Ext.each(cols, function (c) {
            vus[c[0]] = true;
        });
        Ext.each(lignes, function (l) {
            Ext.Object.each(l, function (k) {
                vus[k] = true;
            });
        });
        return Ext.Object.getKeys(vus);
    },

    choisir: function (code) {
        var me = this, a = me.down('#ongletAnalyse');
        var s = Ext.Array.findBy(me.resultat.sections || [], function (x) {
            return x.code === code;
        });
        if (!s) {
            return;
        }
        me.sectionChoisie = code;
        Ext.each(a.down('#tuiles').getEl().query('.audit-tuile'), function (el) {
            Ext.get(el)[el.getAttribute('data-code') === code ? 'addCls' : 'removeCls']('choisie');
        });
        var plus = (s.lignes || []).length < s.nb && code !== 'CONTROLES' ? ' (' + s.lignes.length + ' premières lignes sur ' + me.nombre(s.nb) + ')' : '';
        a.down('#explication').update('<div class="audit-explication"><b>' + me.esc(s.titre) + '</b> : ' + me.esc(s.explication || '') + plus + '</div>');
        var cols = me.COLONNES[code] || [];
        var colonnes = Ext.Array.map(cols, function (c) {
            var col = {text: c[1], dataIndex: c[0], sortable: true, renderer: function (v) {
                    return c[3] ? me.nombre(v) : me.esc(v);
                }};
            if (c[2]) {
                col.width = c[2];
            } else {
                col.flex = 1;
            }
            if (c[3]) {
                col.align = 'right';
            }
            return col;
        });
        var detail = a.down('#detail');
        detail.removeAll();
        detail.add({
            xtype: 'grid', itemId: 'grilleDetail', columns: colonnes,
            store: Ext.create('Ext.data.Store', {fields: me.champs(s.lignes || [], cols), data: s.lignes || []}),
            viewConfig: {emptyText: '<div style="padding:10px;color:#1e8449">Aucun écart : les deux sources concordent.</div>', deferEmptyText: false}
        });
    }
});
