/* global Ext */

Ext.define('testextjs.controller.AbcManagerCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.Report.abc.AbcManager'],
    refs: [
        {ref: 'abc', selector: 'abcmanager'},
        {ref: 'grid', selector: 'abcmanager gridpanel'}
    ],

    init: function () {
        this.control({
            'abcmanager gridpanel': {
                viewready: this.doInitStore
            },
            'abcmanager #rechercher': {
                click: this.doSearch
            },
            'abcmanager #rayons': {select: this.doSearch},
            'abcmanager #grossiste': {select: this.doSearch},
            'abcmanager #codeFamile': {select: this.doSearch},
            'abcmanager #comboType': {select: this.doSearch},
            'abcmanager #comboClasse': {select: this.doSearch},
            'abcmanager #comboStock': {select: this.doSearch},
            'abcmanager #searchField': {specialkey: this.onSearchKey},
            'abcmanager #recalculer': {click: this.onRecalculer},
            'abcmanager #appliquer': {click: this.onAppliquer}
        });
    },

    doInitStore: function () {
        this.doSearch();
    },

    onSearchKey: function (field, e) {
        if (e.getKey() === e.ENTER) {
            this.doSearch();
        }
    },

    doSearch: function () {
        // loadPage(1) declenche beforeload (extraParams positionnes dans la vue)
        this.getGrid().getStore().loadPage(1);
    },

    buildParams: function () {
        const me = this, abc = me.getAbc();
        const v = function (id) {
            const c = abc.down('#' + id);
            return c && c.getValue() ? c.getValue() : '';
        };
        return {
            dtStart: abc.down('#dtStart').getSubmitValue(),
            dtEnd: abc.down('#dtEnd').getSubmitValue(),
            type: v('comboType') || 'CA',
            codeFamille: v('codeFamile'),
            codeRayon: v('rayons'),
            codeGrossiste: v('grossiste')
        };
    },

    onRecalculer: function () {
        const me = this;
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Recalcul de la classification ABC');
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/articles/abc/recalculate',
            params: me.buildParams(),
            timeout: 2400000,
            success: function (response) {
                progress.hide();
                const r = Ext.JSON.decode(response.responseText, true) || {};
                const s = r.summary || {};
                const line = function (c) {
                    const x = s[c] || {};
                    return c + ' : ' + (x.nbProduits || 0) + ' produits';
                };
                Ext.Msg.alert('Classification ABC',
                        'Recalcul effectué sur ' + (r.total || 0) + ' produits.<br/><br/>'
                        + line('A') + '<br/>' + line('B') + '<br/>' + line('C'));
                me.doSearch();
            },
            failure: function (response) {
                progress.hide();
                Ext.Msg.alert('Erreur', 'Échec du recalcul. Code HTTP : ' + response.status);
            }
        });
    },

    onAppliquer: function () {
        const me = this;
        Ext.MessageBox.confirm('Confirmation',
                'Appliquer la classification ABC calculée sur les fiches articles ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Application aux fiches articles');
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/articles/abc/apply',
                        params: me.buildParams(),
                        timeout: 2400000,
                        success: function (response) {
                            progress.hide();
                            const r = Ext.JSON.decode(response.responseText, true) || {};
                            Ext.Msg.alert('Classification ABC',
                                    'Classes appliquées sur ' + (r.count || 0) + ' fiches articles.');
                            me.doSearch();
                        },
                        failure: function (response) {
                            progress.hide();
                            Ext.Msg.alert('Erreur', 'Échec de l\'application. Code HTTP : ' + response.status);
                        }
                    });
                });
    }
});
