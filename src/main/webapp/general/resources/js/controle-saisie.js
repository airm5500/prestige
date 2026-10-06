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
