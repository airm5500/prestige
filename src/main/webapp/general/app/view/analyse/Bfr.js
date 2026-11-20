/* global Ext */

/*
 * Plan du 19/11 : menu « BFR » (ANALYSE DE GESTION). Besoin en fonds de roulement, lecture seule :
 *   stock valorisé (achat) + créances clients (différés, factures tiers payant non réglées, parts tiers payant non
 *   facturées) − dettes fournisseurs (« À régler » depuis la date de départ du suivi) ; en jours de CA HT sur 360 j.
 * Mêmes chiffres que la carte du tableau de bord (une seule route serveur : ../api/v1/bfr).
 */
Ext.define('testextjs.view.analyse.Bfr', {
    extend: 'Ext.panel.Panel',
    xtype: 'bfr',
    layout: {type: 'vbox', align: 'stretch'},
    bodyPadding: 10,
    autoScroll: true,

    statics: {
        /** Montant à l'écran (séparateur de milliers « . », comme les autres écrans). */
        fmt: function (v) {
            return Ext.util.Format.number(Number(v) || 0, '0,000');
        },
        jours: function (o) {
            return o.joursCalculable ? Ext.util.Format.number(o.jours, '0,000.0') + ' j' : 'non calculable (CA HT nul)';
        },
        /** Ligne du tableau de synthèse ; cle : repère pour les tests (data-bfr). */
        ligne: function (libelle, montant, cle, note, fort) {
            var F = testextjs.view.analyse.Bfr;
            return '<tr' + (fort ? ' style="font-weight:bold;border-top:1px solid #cbd5e1"' : '') + '><td style="padding:3px 10px 3px 0">' + libelle
                    + (note ? ' <span style="color:#64748b;font-weight:normal">(' + note + ')</span>' : '') + '</td>'
                    + '<td style="text-align:right;padding:3px 0" data-bfr="' + cle + '">' + F.fmt(montant) + '</td></tr>';
        },
        /** Synthèse en HTML (menu et carte la partagent). */
        synthese: function (o) {
            var F = testextjs.view.analyse.Bfr, c = o.creances, d = o.dettes, s = o.stock;
            var actif = '<table style="width:100%;border-collapse:collapse">'
                    + F.ligne('Stock valorisé (achat)', s.total, 'stock', 'rayon ' + F.fmt(s.rayon) + ' · réserve ' + F.fmt(s.reserve))
                    + F.ligne('Différés clients', c.differes, 'differes')
                    + F.ligne('Factures tiers payant non réglées', c.factures, 'factures', c.nombreFactures + ' facture(s)')
                    + F.ligne('Parts tiers payant non facturées', c.parts, 'parts', c.nombreParts + ' part(s)')
                    + F.ligne('Autres créances', 0, 'autresCreances', c.autresLibelle)
                    + F.ligne('Créances clients', c.total, 'creances', null, true)
                    + '</table>';
            var passif = '<table style="width:100%;border-collapse:collapse">'
                    + F.ligne('Dettes fournisseurs (À régler)', d.fournisseurs, 'fournisseurs', d.nombreBl + ' BL')
                    + F.ligne('Dettes fiscales et sociales', 0, 'fiscales', d.nonSuivi)
                    + F.ligne('Autres dettes', 0, 'autresDettes', d.nonSuivi)
                    + F.ligne('Dettes', d.total, 'dettes', null, true)
                    + '</table>';
            return '<div style="display:flex;gap:24px;flex-wrap:wrap">'
                    + '<div style="flex:1;min-width:320px"><div style="font-weight:bold;margin-bottom:4px">Actif circulant</div>' + actif + '</div>'
                    + '<div style="flex:1;min-width:320px"><div style="font-weight:bold;margin-bottom:4px">Passif circulant</div>' + passif + '</div>'
                    + '<div style="flex:1;min-width:260px;background:#f1f5f9;border-radius:6px;padding:10px">'
                    + '<div style="color:#475569">BFR = stock + créances − dettes</div>'
                    + '<div style="font-size:22px;font-weight:bold;margin:4px 0" data-bfr="bfr">' + F.fmt(o.bfr) + '</div>'
                    + '<div>soit <b data-bfr="jours">' + F.jours(o) + '</b> de CA HT</div>'
                    + '<div style="color:#475569;margin-top:4px">CA HT du ' + o.caDebut + ' au ' + o.caFin + ' (' + o.baseJours + ' j) : <span data-bfr="caHt">' + F.fmt(o.caHt) + '</span></div>'
                    + '</div></div>'
                    + '<div style="margin-top:8px;color:#475569" data-bfr="mention">' + Ext.String.htmlEncode(o.mention) + '. Calcul du ' + o.date + '.</div>';
        }
    },

    initComponent: function () {
        var me = this;
        var grille = function (id, titre, colonne) {
            return {xtype: 'gridpanel', itemId: id, title: titre, height: 300, columnLines: true,
                store: Ext.create('Ext.data.Store', {fields: [colonne, {name: 'nombre', type: 'int'}, {name: 'montant', type: 'number'}], data: []}),
                columns: [
                    {text: colonne === 'grossiste' ? 'Grossiste' : 'Organisme', dataIndex: colonne, flex: 1},
                    {text: colonne === 'grossiste' ? 'BL' : 'Nombre', dataIndex: 'nombre', width: 90, align: 'right'},
                    {text: 'Montant', dataIndex: 'montant', width: 140, align: 'right', renderer: testextjs.view.analyse.Bfr.fmt}
                ]};
        };
        me.tbar = [{xtype: 'tbtext', itemId: 'bfrTitre', text: '<b>Besoin en fonds de roulement</b>'}, '->',
            {xtype: 'button', itemId: 'bfrActualiser', text: 'Actualiser', iconCls: 'refresh', handler: function () {
                    me.charger();
                }}];
        me.items = [
            {xtype: 'component', itemId: 'bfrResume', html: '<div style="color:#64748b">Calcul en cours…</div>', margin: '0 0 10 0'},
            {xtype: 'tabpanel', itemId: 'bfrDetail', plain: true, items: [
                    grille('bfrFactures', 'Factures tiers payant non réglées', 'organisme'),
                    grille('bfrParts', 'Parts tiers payant non facturées', 'organisme'),
                    grille('bfrGrossistes', 'Dettes fournisseurs par grossiste', 'grossiste')
                ]}
        ];
        me.callParent(arguments);
        me.on('afterrender', me.charger, me, {single: true});
    },

    charger: function () {
        var me = this, resume = me.down('#bfrResume');
        resume.update('<div style="color:#64748b">Calcul en cours…</div>');
        me.chargement = true;
        Ext.Ajax.request({
            url: '../api/v1/bfr', method: 'GET', timeout: 240000,
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                me.chargement = false;
                if (!o.success) {
                    resume.update('<div style="color:#b91c1c">' + Ext.String.htmlEncode(o.msg || 'Le BFR n\'a pas pu être calculé.') + '</div>');
                    return;
                }
                me.donnees = o;
                resume.update(testextjs.view.analyse.Bfr.synthese(o));
                me.down('#bfrFactures').getStore().loadData(o.detail.factures || []);
                me.down('#bfrParts').getStore().loadData(o.detail.parts || []);
                me.down('#bfrGrossistes').getStore().loadData(o.detail.grossistes || []);
            },
            failure: function () {
                me.chargement = false;
                resume.update('<div style="color:#b91c1c">Le BFR n\'a pas pu être calculé.</div>');
            }
        });
    }
});
