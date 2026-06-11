/* global Ext */

Ext.define('testextjs.controller.AchatGrossisteMensuelCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.bons.AchatGrossisteMensuel'],
    refs: [
        {
            ref: 'achatMensuel',
            selector: 'achatgrossistemensuel'
        },
        {
            ref: 'achatMensuelGrid',
            selector: 'achatgrossistemensuel gridpanel'
        },
        {
            ref: 'dtStart',
            selector: 'achatgrossistemensuel #dtStart'
        },
        {
            ref: 'dtEnd',
            selector: 'achatgrossistemensuel #dtEnd'
        },
        {
            ref: 'toggleType',
            selector: 'achatgrossistemensuel #toggleType'
        }
    ],
    init: function (application) {
        this.control({
            'achatgrossistemensuel #rechercher': {
                click: this.doSearch
            },
            'achatgrossistemensuel #imprimer': {
                click: this.onPdfClick
            },
            'achatgrossistemensuel #toggleType': {
                toggle: this.onToggleType
            },
            'achatgrossistemensuel gridpanel': {
                viewready: this.doSearch
            }
        });
    },
    // La repartition est faite sur les colonnes janvier..decembre : la periode doit rester
    // dans une meme annee civile pour ne pas cumuler des mois d'annees differentes.
    checkPeriode: function () {
        const me = this;
        const dtStart = me.getDtStart().getValue();
        const dtEnd = me.getDtEnd().getValue();
        if (!dtStart || !dtEnd) {
            return false;
        }
        if (dtStart.getFullYear() !== dtEnd.getFullYear()) {
            Ext.Msg.alert('Période invalide',
                    'La période doit être comprise dans une même année civile (du 1er janvier au 31 décembre).');
            return false;
        }
        if (dtStart > dtEnd) {
            Ext.Msg.alert('Période invalide', 'La date de début doit être antérieure à la date de fin.');
            return false;
        }
        return true;
    },
    onToggleType: function (button, pressed) {
        const me = this;
        const panel = me.getAchatMensuel();
        panel.amountType = pressed ? 'HT' : 'TTC';
        button.setText('Montants : ' + panel.amountType);
        me.doSearch();
    },
    doSearch: function () {
        const me = this;
        if (!me.checkPeriode()) {
            return;
        }
        me.getAchatMensuelGrid().getStore().load({
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                type: me.getAchatMensuel().amountType
            }
        });
    },
    onPdfClick: function () {
        const me = this;
        if (!me.checkPeriode()) {
            return;
        }
        const linkUrl = '../EtatControlStockServlet?mode=achatMensuel&dtStart=' + me.getDtStart().getSubmitValue()
                + '&dtEnd=' + me.getDtEnd().getSubmitValue() + '&type=' + me.getAchatMensuel().amountType;
        window.open(linkUrl);
    }

});
