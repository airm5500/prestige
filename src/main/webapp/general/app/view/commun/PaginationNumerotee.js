/* global Ext */

/*
 * Pagination numerotee du theme commun (maquette validee le 30/09) : « ‹ 1 2 3 … 12 › » a la place du champ
 * « Page [ ] sur N ».
 *
 * Plugin pose sur un pagingtoolbar ExtJS : la barre reste la meme (memes boutons premier / precedent / suivant /
 * dernier / actualiser, meme evenement beforechange, meme store), seul le champ de saisie de page est remplace a
 * l'ecran par des numeros cliquables. Un clic suit le chemin de la saisie d'un numero de page : 'beforechange', puis
 * loadPage(n).
 */
Ext.define('testextjs.view.commun.PaginationNumerotee', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.paginationnumerotee',
    /** Nombre de numeros autour de la page courante. */
    autour: 2,

    init: function (barre) {
        var me = this;
        me.barre = barre;
        barre.addCls('theme-pagination');
        barre.on('afterrender', me.monter, me, {single: true});
        barre.on('change', me.dessiner, me);
    },

    monter: function () {
        var me = this, barre = me.barre;
        Ext.each(['#inputItem', '#afterTextItem'], function (sel) {
            var c = barre.child(sel);
            if (c) {
                c.hide();
            }
        });
        barre.items.each(function (c) {
            if (c.isXType && c.isXType('tbtext') && c.text === barre.beforePageText) {
                c.hide();
            }
        });
        var prec = barre.child('#prev');
        me.zone = barre.insert(prec ? barre.items.indexOf(prec) + 1 : 2, {xtype: 'component', itemId: 'pagesNumerotees',
            cls: 'pg-zone'});
        /* Clic ecoute sur l'element du composant, des qu'il existe. */
        var brancher = function () {
            me.zone.getEl().on('click', function (e) {
                var b = e.getTarget('button.pg-num');
                if (b && !b.disabled) {
                    me.aller(parseInt(b.getAttribute('data-page'), 10));
                }
            });
        };
        if (me.zone.rendered) {
            brancher();
        } else {
            me.zone.on('afterrender', brancher, me, {single: true});
        }
        me.dessiner();
    },

    aller: function (page) {
        var barre = this.barre;
        if (page >= 1 && page <= barre.getPageData().pageCount && barre.fireEvent('beforechange', barre, page) !== false) {
            barre.store.loadPage(page);
        }
    },

    dessiner: function () {
        var me = this, barre = me.barre;
        if (!me.zone || me.zone.isDestroyed || !barre.store) {
            return;
        }
        var d = barre.getPageData();
        var total = Math.max(d.pageCount || 0, 1), courante = Math.min(Math.max(d.currentPage || 1, 1), total);
        var pages = [], i;
        for (i = 1; i <= total; i++) {
            if (i === 1 || i === total || Math.abs(i - courante) <= me.autour) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '…') {
                pages.push('…');
            }
        }
        me.zone.update(Ext.Array.map(pages, function (p) {
            return p === '…' ? '<span class="pg-trou">…</span>'
                    : '<button type="button" class="pg-num' + (p === courante ? ' pg-actif' : '') + '" data-page="' + p + '"'
                    + (p === courante ? ' aria-current="page" disabled' : '') + '>' + p + '</button>';
        }).join(''));
    }
});
