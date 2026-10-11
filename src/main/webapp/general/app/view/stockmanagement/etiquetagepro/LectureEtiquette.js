/* global Ext */
/*
 * Etiquettage Pro, onglet « Lire une etiquette » (retours du 11/10, hors vente) : on scanne une etiquette (DataMatrix+,
 * QR+, GS1 habituelle ou simple CIP) et toutes ses informations s'affichent d'un coup, avec le produit de Prestige et les
 * alertes (prix etiquete different du prix actuel, peremption depassee ou proche, produit inconnu). Le champ garde le
 * focus et se vide apres chaque lecture : on enchaine les scans. Aucune fenetre.
 * API v1/etiquetage-pro/lire-etiquette.
 */
Ext.define('testextjs.view.stockmanagement.etiquetagepro.LectureEtiquette', {
    extend: 'Ext.panel.Panel',
    xtype: 'etqlecture',
    border: false,
    bodyPadding: 16,
    autoScroll: true,
    layout: {type: 'vbox', align: 'stretch'},

    LIBELLES: {CIP: 'CIP', NOM: 'Désignation', PRIX: 'Prix étiqueté', LOT: 'Lot', PER: 'Péremption', PHA: 'Pharmacie',
        GEO: 'Code géo', GRO: 'Grossiste', COD: 'Code de l\'étiquette', EAN: 'EAN'},
    TYPES: {'DATAMATRIX+': 'DataMatrix+ (étendu)', 'QR+': 'QR+ (étendu)', GS1: 'Étiquette GS1 (QR / DataMatrix)', CIP: 'Code simple (CIP ou EAN)'},

    initComponent: function () {
        var me = this;
        me.items = [
            {xtype: 'container', layout: {type: 'hbox', align: 'middle'}, items: [
                    {xtype: 'textfield', itemId: 'lectureCode', fieldLabel: 'Scannez une étiquette', labelWidth: 150, flex: 1, maxWidth: 720,
                        emptyText: 'DataMatrix+, QR+, étiquette GS1 ou CIP, puis Entrée', enableKeyEvents: true, selectOnFocus: true,
                        listeners: {specialkey: function (f, e) {
                                if (e.getKey() === e.ENTER) {
                                    e.stopEvent();
                                    me.lire();
                                }
                            }}},
                    {xtype: 'button', text: 'Lire', itemId: 'lectureLire', margin: '0 0 0 8', handler: function () {
                            me.lire();
                        }}
                ]},
            {xtype: 'component', itemId: 'lectureResultat', margin: '16 0 0 0', html: '<div class="etqp-aide">Hors vente : commande, réception,'
                        + ' inventaire, contrôle de rayon. À la caisse, les étiquettes étendues sont refusées.</div>'}
        ];
        me.callParent(arguments);
    },

    ouvrir: function () {
        var c = this.down('#lectureCode');
        Ext.defer(function () {
            c.focus(true);
        }, 50);
    },

    lire: function () {
        var me = this, champ = me.down('#lectureCode'), code = champ.getValue();
        if (!code || !Ext.String.trim(code)) {
            champ.focus(true);
            return;
        }
        Ext.Ajax.request({
            url: me.ecran.URL + 'lire-etiquette', method: 'GET', params: {code: code},
            success: function (r) {
                var o = Ext.JSON.decode(r.responseText, true) || {};
                if (!o.success) {
                    me.down('#lectureResultat').update('<div class="etqp-lecture-erreur" style="color:#b42318;font-weight:bold">'
                            + Ext.String.htmlEncode(o.msg || 'Étiquette illisible.') + '</div>');
                } else {
                    me.afficher(o);
                }
                champ.setValue('');
                champ.focus(true);
            },
            failure: function () {
                me.down('#lectureResultat').update('<div style="color:#b42318">Le serveur ne répond pas.</div>');
            }
        });
    },

    afficher: function (o) {
        var me = this, enc = Ext.String.htmlEncode, lignes = '';
        Ext.Object.each(o.infos, function (k, v) {
            lignes += '<tr><th style="text-align:left;padding:4px 10px;background:#eef4fb;width:180px">' + enc(me.LIBELLES[k] || k) + '</th>'
                    + '<td class="etqp-lu-' + k + '" style="padding:4px 10px">' + enc(v) + '</td></tr>';
        });
        var p = o.produit, produit = p
                ? '<tr><th style="text-align:left;padding:4px 10px;background:#f4f6f8">Dans Prestige</th><td class="etqp-lu-produit" style="padding:4px 10px">'
                + enc(p.designation) + ' — prix actuel <b>' + Ext.util.Format.number(p.prix, '0,000').replace(/,/g, ' ') + '</b>'
                + (p.codeGeo ? ' — code géo ' + enc(p.codeGeo) : '') + (p.statut && p.statut !== 'enable' ? ' — <i>produit désactivé</i>' : '') + '</td></tr>'
                : '';
        var alertes = (o.alertes || []).map(function (a) {
            return '<div class="etqp-alerte" style="color:#b42318;font-weight:bold;margin-top:6px">⚠ ' + enc(a) + '</div>';
        }).join('');
        me.down('#lectureResultat').update('<div class="etqp-lu"><div class="etqp-lu-type" style="font-weight:bold;margin-bottom:8px">'
                + enc(me.TYPES[o.type] || o.type) + (o.venteAutorisee ? '' : ' <span style="color:#b26a00">— hors vente (refusée à la caisse)</span>')
                + '</div><table class="etqp-col" style="max-width:720px">' + lignes + produit + '</table>'
                + (alertes || '<div class="etqp-lu-ok" style="color:#17795f;font-weight:bold;margin-top:6px">✔ Aucune alerte</div>') + '</div>');
    }
});
