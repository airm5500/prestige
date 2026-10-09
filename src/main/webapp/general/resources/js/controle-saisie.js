/*
 * Controle de saisie commun a tous les ecrans (demande du 07/10 : « au cas ou un utilisateur renseigne n'importe quoi
 * dans un champ »).
 *
 * DATES IMPOSSIBLES : par defaut ExtJS « corrige » une date impossible au lieu de la refuser : 31/02/2026 devenait
 * 03/03/2026 et 29/02/2025 devenait 01/03/2025, sans rien signaler. L'utilisateur croyait avoir saisi fevrier et la
 * recherche (ou l'enregistrement) portait sur mars. Desormais une date impossible est REFUSEE : le champ passe en rouge
 * avec le message d'ExtJS (« ... n'est pas une date valide »), et aucune autre date n'est envoyee a sa place.
 * Les saisies courtes restent acceptees (0102, 010226, 01/02, 2026-02-01...).
 */
(function () {
    if (!window.Ext || !Ext.form || !Ext.form.field || !Ext.form.field.Date) {
        return;
    }
    Ext.form.field.Date.prototype.useStrict = true;
})();

/*
 * Retours du 08/10 (controle de saisie) : une liste deroulante dont la reponse du serveur arrive APRES la fermeture de
 * l'ecran (changement de menu pendant une recherche) est deja detruite : son magasin vaut null et ExtJS 4.2 levait
 * « Cannot read properties of null (reading 'getCount' / 'findRecord') ». La reponse tardive est desormais ignoree.
 */
(function () {
    if (!window.Ext || !Ext.form || !Ext.form.field || !Ext.form.field.ComboBox) {
        return;
    }
    var proto = Ext.form.field.ComboBox.prototype;
    var morte = function (c) {
        return c.isDestroyed || !c.store;
    };
    Ext.each(['afterQuery', 'onLoad', 'assertValue', 'doAutoSelect', 'onTypeAhead'], function (nom) {
        var origine = proto[nom];
        if (typeof origine === 'function') {
            proto[nom] = function () {
                return morte(this) ? undefined : origine.apply(this, arguments);
            };
        }
    });
    var findRecord = proto.findRecord;
    proto.findRecord = function () {
        return morte(this) ? false : findRecord.apply(this, arguments);
    };
})();

/*
 * Retours du 08/10 (controle de saisie) : dans une fenetre, la touche Tab sur le dernier champ ramene au premier (et
 * Maj+Tab l'inverse). ExtJS 4.2 appelait element.focus(false, true) : les navigateurs actuels refusent ces arguments
 * (« The provided value is not of type 'FocusOptions' ») et la navigation au clavier s'arretait. Meme comportement,
 * sans les arguments.
 */
(function () {
    if (!window.Ext || !Ext.Component || !Ext.util || !Ext.util.Floating) {
        return;
    }
    var origine = Ext.util.Floating.prototype.onKeyDown;
    var corrige = function (e) {
        var me = this;
        if (e.getKey() === Ext.EventObject.TAB && me.el) {
            var arriere = e.shiftKey, champs = me.el.query(':focusable'), premier = champs[0], dernier = champs[champs.length - 1];
            if (premier && dernier && e.target === (arriere ? premier : dernier)) {
                e.stopEvent();
                (arriere ? dernier : premier).focus();
            }
        }
    };
    Ext.util.Floating.prototype.onKeyDown = corrige;
    if (Ext.Component.prototype.onKeyDown === origine) {
        Ext.Component.prototype.onKeyDown = corrige;
    }
})();
