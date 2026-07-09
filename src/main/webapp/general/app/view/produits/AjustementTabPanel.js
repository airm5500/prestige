/* global Ext */

/**
 * Vue des ajustements de stock en deux onglets :
 * - "Gestion des ajustements" (contenu historique de la vue)
 * - "Analyse Ajustement de stock" (produits les plus ajustes sur une periode)
 *
 * Le xtype 'ajustementmanager' (ouvert par le menu) est porte par ce conteneur.
 */
Ext.define('testextjs.view.produits.AjustementTabPanel', {
    extend: 'Ext.tab.Panel',
    xtype: 'ajustementmanager',
    requires: [
        'testextjs.view.produits.Ajustement',
        'testextjs.view.produits.AnalyseAjustement'
    ],

    width: '97%',
    height: 'auto',
    minHeight: 620,
    cls: 'custompanel',
    activeTab: 0,
    plain: true,
    items: [
        {
            xtype: 'ajustementgestion',
            title: 'Gestion des ajustements'
        },
        {
            xtype: 'analyseajustement',
            title: 'Analyse Ajustement de stock'
        }
    ]
});
