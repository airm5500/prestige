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
