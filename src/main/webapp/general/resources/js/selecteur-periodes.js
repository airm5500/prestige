/* global Ext, window */

/*
 * =====================================================================================
 * SELECTEUR DE PERIODES DE COMPARAISON
 *
 * Un menu d'analyse a besoin de comparer des periodes entre elles : les trois derniers
 * mois, les six derniers, les trois dernieres semaines ou annees. Poser ce choix ecran
 * par ecran obligerait a rouvrir chaque fichier de vue pour ajouter un menu, et a le
 * refaire a chaque nouvelle demande.
 *
 * Ce fichier fait l'inverse : il liste les ecrans concernes, et le selecteur s'y pose
 * tout seul a l'ouverture. Ajouter un menu, c'est ajouter un xtype dans ECRANS_ANALYSE
 * ci-dessous -- une ligne, un seul fichier.
 *
 * Meme mecanique et meme point d'accroche que ECRANS_COLLES dans correctifs-affichage.js :
 * App.onLoadNewComponent appelle appliquerSiConcerne() juste apres la creation de l'ecran.
 *
 * -------------------------------------------------------------------------------------
 * CE QUE LE SELECTEUR FAIT, ET CE QU'IL NE FAIT PAS
 *
 * Il ne calcule AUCUN chiffre. Il propose les choix, pose la periode dans les champs de
 * l'ecran, et lance l'analyse que l'ecran prevoit deja. Le travail reste a l'ecran.
 *
 * -------------------------------------------------------------------------------------
 * LA REGLE DES BORNES
 *
 * « 3 derniers mois » designe les trois mois REVOLUS -- en septembre : juin, juillet et
 * aout -- et le mois en cours est rappele EN PLUS, marque comme tel. L'officine veut voir
 * ou elle en est, mais septembre n'a pas encore ses trente jours : le presenter comme un
 * mois comparable ferait lire un effondrement du chiffre d'affaires le 2 du mois. Le
 * decoupage exact vit dans util.PeriodesCa, cote serveur, avec ses tests.
 *
 * -------------------------------------------------------------------------------------
 * UNE PERIODE OU PLUSIEURS
 *
 * Une seule periode donne les chiffres bruts de cette periode. A partir de deux, l'ecran
 * bascule en analyse comparative. C'est l'ecran qui applique cette regle : le selecteur
 * se contente de dire combien de periodes ont ete demandees.
 * =====================================================================================
 */

window.PrestigeAnalyse = window.PrestigeAnalyse || {};

/**
 * Les ecrans qui recoivent le selecteur de periodes.
 *
 * Un xtype par ligne. L'ecran doit exposer « #dtStart » et « #dtEnd » : ce sont eux que
 * le selecteur remplit.
 */
window.PrestigeAnalyse.ECRANS_ANALYSE = [
    // chiffre d'affaires par emplacement et famille : l'ecran porte deja son analyse
    'cazonegeomanager',
    // balance des ventes et de la caisse : l'analyse comparative est dans son 2e onglet
    'balancesalecahs'
];

/**
 * Les choix proposes. « nombre » est le nombre de periodes COMPLETES analysees ; la
 * periode en cours est rappelee en plus par le serveur.
 */
window.PrestigeAnalyse.CHOIX = [
    {id: 'TROIS_SEMAINES', libelle: '3 dernières semaines', unite: 'SEMAINE', nombre: 3},
    {id: 'TROIS_MOIS', libelle: '3 derniers mois', unite: 'MOIS', nombre: 3},
    {id: 'SIX_MOIS', libelle: '6 derniers mois', unite: 'MOIS', nombre: 6},
    {id: 'TROIS_ANS', libelle: '3 dernières années', unite: 'ANNEE', nombre: 3},
    {id: 'LIBRE', libelle: 'Période libre', unite: 'LIBRE', nombre: 0}
];

/** Le choix portant cet identifiant, ou null. */
window.PrestigeAnalyse.choix = function (id) {
    'use strict';
    var trouve = null;
    Ext.each(window.PrestigeAnalyse.CHOIX, function (c) {
        if (c.id === id) {
            trouve = c;
            return false;
        }
        return true;
    });
    return trouve;
};

/**
 * Pose le selecteur sur un ecran s'il figure dans la liste ci-dessus.
 *
 * L'ecran qui porte DEJA un « #typePeriode » -- parce qu'il avait son propre menu avant
 * l'existence de ce fichier -- est laisse tel quel : y ajouter un second selecteur en
 * afficherait deux, dont un seul serait ecoute.
 *
 * @param {Ext.Component} ecran ecran qui vient d'etre cree
 */
window.PrestigeAnalyse.appliquerSiConcerne = function (ecran) {
    'use strict';

    if (!ecran || !ecran.isXType || !Ext.isFunction(ecran.down)) {
        return;
    }
    var concerne = Ext.Array.some(window.PrestigeAnalyse.ECRANS_ANALYSE, function (xtype) {
        return ecran.isXType(xtype);
    });
    if (!concerne || ecran.down('#typePeriode')) {
        return;
    }
    var barre = ecran.down('toolbar');
    if (!barre || !ecran.down('#dtStart') || !ecran.down('#dtEnd')) {
        // Sans barre d'outils ou sans champs de periode, il n'y a nulle part ou se poser
        // ni rien a remplir : mieux vaut ne rien faire que poser un menu sans effet.
        return;
    }
    barre.insert(0, {
        xtype: 'combobox',
        itemId: 'typePeriode',
        fieldLabel: 'Période',
        labelWidth: 50,
        width: 210,
        margin: '0 6 0 0',
        store: Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'],
            data: window.PrestigeAnalyse.CHOIX
        }),
        valueField: 'id',
        displayField: 'libelle',
        queryMode: 'local',
        editable: false,
        value: 'TROIS_MOIS'
    });
};
