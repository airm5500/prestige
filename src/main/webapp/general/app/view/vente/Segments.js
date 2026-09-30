/* global Ext */

/*
 * Boutons segmentes pour un combo court (theme commun, maquette validee le 30/09) : type et nature de vente.
 *
 * Le combo reste le composant de reference : les controleurs lisent getValue(), posent setValue() et ecoutent 'select'
 * comme avant. Le plugin cache seulement sa zone de saisie et dessine a la place un bouton par ligne du store ; un clic
 * pose la valeur et emet 'select' exactement comme un choix dans la liste. Les changements venus du code (setValue)
 * sont repris a l'ecran, et un combo en lecture seule ou desactive rend les boutons inactifs.
 *
 * Options : libelles (valeur -> texte affiche), exclure (valeurs a ne pas proposer).
 */
Ext.define('testextjs.view.vente.Segments', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.segments',
    libelles: null,
    exclure: null,

    init: function (combo) {
        var me = this;
        me.combo = combo;
        combo.addCls('seg-combo');
        combo.on('afterrender', me.monter, me, {single: true});
        combo.on('change', me.dessiner, me);
        combo.on('enable', me.dessiner, me);
        combo.on('disable', me.dessiner, me);
        combo.on('writeablechange', me.dessiner, me);
        combo.getStore().on('load', me.dessiner, me);
        combo.on('destroy', function () {
            combo.getStore().un('load', me.dessiner, me);
        });
    },

    monter: function () {
        var me = this, combo = me.combo, store = combo.getStore();
        me.zone = Ext.DomHelper.append(combo.bodyEl, {tag: 'div', cls: 'seg-groupe', role: 'radiogroup'}, true);
        me.zone.on('click', function (e) {
            var bouton = e.getTarget('button.seg-bouton');
            if (bouton) {
                me.choisir(bouton.getAttribute('data-valeur'));
            }
        });
        if (!store.getCount() && !store.isLoading()) {
            store.load();
        }
        me.dessiner();
    },

    libelle: function (rec) {
        var me = this, v = String(rec.get(me.combo.valueField));
        if (me.libelles && me.libelles[v]) {
            return me.libelles[v];
        }
        var t = String(rec.get(me.combo.displayField) || '').replace(/_/g, ' ').toLowerCase();
        return t.charAt(0).toUpperCase() + t.slice(1);
    },

    dessiner: function () {
        var me = this, combo = me.combo;
        if (!me.zone || combo.isDestroyed) {
            return;
        }
        var courant = combo.getValue() === null || combo.getValue() === undefined ? '' : String(combo.getValue());
        var inactif = combo.disabled || combo.readOnly;
        var html = [];
        combo.getStore().each(function (rec) {
            var v = String(rec.get(combo.valueField));
            if (me.exclure && me.exclure.indexOf(v) >= 0 && v !== courant) {
                return;
            }
            var actif = v === courant;
            html.push('<button type="button" class="seg-bouton' + (actif ? ' seg-actif' : '') + '" role="radio" aria-checked="'
                    + actif + '" data-valeur="' + Ext.String.htmlEncode(v) + '"' + (inactif ? ' disabled' : '') + '>'
                    + Ext.String.htmlEncode(me.libelle(rec)) + '</button>');
        });
        me.zone.update(html.join(''));
    },

    choisir: function (valeur) {
        var me = this, combo = me.combo;
        if (combo.disabled || combo.readOnly || String(combo.getValue()) === valeur) {
            return;
        }
        var rec = combo.getStore().findRecord(combo.valueField, valeur, 0, false, false, true);
        if (!rec) {
            return;
        }
        combo.setValue(rec.get(combo.valueField));
        combo.fireEvent('select', combo, [rec]);
    }
});
