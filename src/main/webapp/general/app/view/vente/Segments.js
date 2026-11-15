/* global Ext */

/*
 * Boutons segmentes pour un combo court (theme commun, maquette validee le 30/09) : type et nature de vente.
 *
 * Le combo reste le composant de reference : les controleurs lisent getValue(), posent setValue() et ecoutent 'select'
 * comme avant. Le plugin cache seulement sa zone de saisie et dessine a la place un bouton par ligne du store ; un clic
 * pose la valeur et emet 'select' exactement comme un choix dans la liste. Les changements venus du code (setValue)
 * sont repris a l'ecran, et un combo en lecture seule ou desactive rend les boutons inactifs.
 *
 * Options : libelles (valeur -> texte affiche), exclure (valeurs a ne pas proposer), pastille (point clignotant sur le
 * bouton actif), confirmer (demande du 14/11) : fonction (valeur visee, valeur courante) qui rend le texte de
 * confirmation quand le choix a des consequences, ou rien. Le premier clic ne change rien : le bouton vise affiche ce
 * texte (aucune fenetre) ; un second clic dans les 6 secondes confirme. Le combo porte alors confirmationDonnee
 * (= la valeur) pendant le 'select', pour que le controleur sache que l'operateur a confirme.
 */
Ext.define('testextjs.view.vente.Segments', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.segments',
    libelles: null,
    exclure: null,
    pastille: false,
    confirmer: null,
    arme: null,

    init: function (combo) {
        var me = this;
        me.combo = combo;
        combo.addCls('seg-combo');
        combo.on('afterrender', me.monter, me, {single: true});
        combo.on('change', me.dessiner, me);
        combo.on('enable', me.dessiner, me);
        combo.on('disable', me.dessiner, me);
        combo.on('writeablechange', me.dessiner, me);
        /* Ecoute geree par le combo : retiree avec lui (a sa destruction, son store est deja detache). */
        combo.mon(combo.getStore(), 'load', me.dessiner, me);
    },

    monter: function () {
        var me = this, combo = me.combo, store = combo.getStore();
        me.zone = Ext.DomHelper.append(combo.bodyEl, {tag: 'div', cls: 'seg-groupe', role: 'radiogroup'}, true);
        combo.bodyEl.setStyle('width', 'auto');
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
            var actif = v === courant, arme = v === me.arme;
            html.push('<button type="button" class="seg-bouton' + (actif ? ' seg-actif' : '') + (arme ? ' seg-confirmer' : '')
                    + '" role="radio" aria-checked="' + actif + '" data-valeur="' + Ext.String.htmlEncode(v) + '"'
                    + (inactif ? ' disabled' : '') + '>'
                    + (actif && me.pastille ? '<span class="seg-point"></span>' : '')
                    + Ext.String.htmlEncode(arme ? me.texteArme : me.libelle(rec)) + '</button>');
        });
        me.zone.update(html.join(''));
        /* Le combo prend la largeur de ses boutons : l'espacement avec le champ suivant reste celui de la marge. */
        var boutons = me.zone.dom.querySelectorAll('button.seg-bouton'), largeur = boutons.length ? 6 + 2 * (boutons.length - 1) : 0;
        Ext.each(boutons, function (b) {
            largeur += b.offsetWidth;
        });
        if (combo.rendered && largeur && Math.abs(combo.getWidth() - largeur) > 1) {
            combo.setWidth(largeur);
            if (combo.ownerCt) {
                combo.ownerCt.updateLayout();
            }
        }
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
        // second clic sur un bouton arme (par le premier clic ou par le controleur) : c'est la confirmation
        var confirme = me.arme === valeur;
        var texte = !confirme && me.confirmer ? me.confirmer(valeur, String(combo.getValue())) : null;
        if (texte) {
            me.armer(valeur, texte);
            return;
        }
        me.desarmer(true);
        combo.confirmationDonnee = confirme ? valeur : null;
        try {
            combo.setValue(rec.get(combo.valueField));
            combo.fireEvent('select', combo, [rec]);
        } finally {
            combo.confirmationDonnee = null;
        }
    },

    /* premier clic d'un choix a consequences : le bouton affiche la question, un second clic confirme */
    armer: function (valeur, texte) {
        var me = this;
        me.arme = valeur;
        me.texteArme = texte;
        clearTimeout(me.minuteur);
        me.minuteur = setTimeout(function () {
            me.desarmer();
        }, 6000);
        me.dessiner();
    },

    desarmer: function (sansDessin) {
        var me = this;
        clearTimeout(me.minuteur);
        if (me.arme === null) {
            return;
        }
        me.arme = null;
        if (!sansDessin) {
            me.dessiner();
        }
    }
});
