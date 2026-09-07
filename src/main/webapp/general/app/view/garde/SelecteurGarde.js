/* global Ext */

/*
 * Le selecteur de garde : une liste deroulante qui remplit la periode de l'ecran hote.
 *
 * C'est le point central du module. Plutot que de reconstruire dans les gardes le chiffre
 * d'affaires, les reglements et les articles vendus -- des etats qui existent deja et qui
 * finiraient par diverger de leurs originaux -- la garde se contente de NOMMER une periode, que
 * les ecrans existants savent deja exploiter. Choisir « Nuit du 5 au 6 septembre » dans l'ecran
 * des ventes terminees revient a saisir les quatre bornes a la main, sans risque d'erreur.
 *
 * Il se pose dans n'importe quelle barre d'outils dont l'ecran expose « #dtStart » et « #dtEnd »,
 * et « #hStart » / « #hEnd » quand il les a.
 *
 * UNE PRECAUTION IMPORTANTE : une garde va de 20 h a 8 h le lendemain. Un ecran qui ne connait que
 * des dates recevra donc « du 5 au 6 septembre », c'est-a-dire DEUX JOURNEES ENTIERES d'activite
 * ordinaire en plus de la nuit. Le resultat n'est alors pas celui de la garde, et le composant le
 * dit explicitement au lieu de laisser croire le contraire.
 */
/*
 * Le magasin est PARTAGE par tous les selecteurs de l'application. Le composant est pose sur une
 * soixantaine d'ecrans : lui donner son magasin propre declencherait un appel au serveur a chaque
 * ouverture d'ecran, pour une liste qui bouge une fois par garde. Un seul chargement suffit ; les
 * ecrans de gardes le rafraichissent quand la liste change.
 */
Ext.define('testextjs.view.garde.MagasinGardes', {
    singleton: true,
    magasin: null,

    obtenir: function () {
        if (!this.magasin) {
            this.magasin = Ext.create('Ext.data.Store', {
                storeId: 'magasinGardesPartage',
                fields: ['id', 'libelle', 'dateDebut', 'dateFin', 'jourDebut', 'heureDebut',
                    'jourFin', 'heureFin', 'duree',
                    {
                        name: 'libelleComplet',
                        convert: function (valeur, ligne) {
                            return ligne.get('libelle') + '  (' + ligne.get('dateDebut') + ' → '
                                    + ligne.get('dateFin') + ')';
                        }
                    }],
                autoLoad: true,
                proxy: {
                    type: 'ajax',
                    url: '../api/v1/gardes',
                    reader: {type: 'json', root: 'data', totalProperty: 'total'}
                }
            });
        }
        return this.magasin;
    },

    /** A appeler apres une creation, une modification ou une suppression de garde. */
    rafraichir: function () {
        if (this.magasin) {
            this.magasin.reload();
        }
    }
});

Ext.define('testextjs.view.garde.SelecteurGarde', {
    extend: 'Ext.form.field.ComboBox',
    xtype: 'selecteurgarde',

    fieldLabel: 'Garde',
    labelWidth: 40,
    width: 320,
    // Une marge propre : le separateur « - » des barres d'outils n'est pas utilisable partout,
    // certains ecrans posant leurs champs de periode dans un fieldcontainer et non un toolbar.
    margin: '0 6 0 6',
    valueField: 'id',
    displayField: 'libelleComplet',
    queryMode: 'local',
    editable: false,
    emptyText: 'Appliquer une période de garde...',

    config: {
        /**
         * Lance la recherche de l'ecran hote apres avoir pose la periode. A laisser a false quand
         * la recherche est couteuse : l'utilisateur la declenchera lui-meme.
         */
        rechercherApres: true
    },

    initComponent: function () {
        var me = this;
        me.store = testextjs.view.garde.MagasinGardes.obtenir();
        me.listeners = Ext.apply(me.listeners || {}, {
            select: function (combo, enregistrements) {
                combo.appliquer(enregistrements[0]);
            }
        });
        me.callParent(arguments);
    },

    /** Pose les bornes de la garde dans les champs de l'ecran hote. */
    appliquer: function (garde) {
        var me = this;
        if (!garde) {
            return;
        }
        // On remonte au premier conteneur qui porte les champs de periode : le selecteur peut
        // etre pose dans une barre d'outils imbriquee.
        var hote = me.up('panel');
        while (hote && !hote.down('#dtStart')) {
            hote = hote.up('panel');
        }
        if (!hote) {
            Ext.MessageBox.alert('Information',
                    'Cet &eacute;cran n\'a pas de p&eacute;riode &agrave; remplir.');
            return;
        }
        var dtStart = hote.down('#dtStart');
        var dtEnd = hote.down('#dtEnd');
        var hStart = hote.down('#hStart');
        var hEnd = hote.down('#hEnd');

        dtStart.setValue(Ext.Date.parse(garde.get('jourDebut'), 'Y-m-d'));
        dtEnd.setValue(Ext.Date.parse(garde.get('jourFin'), 'Y-m-d'));
        var heuresPosees = false;
        if (hStart && hEnd) {
            hStart.setValue(garde.get('heureDebut'));
            hEnd.setValue(garde.get('heureFin'));
            heuresPosees = true;
        }

        // L'avertissement n'est donne QU'UNE FOIS par ecran ouvert. Il est important -- l'ecran
        // afficherait sinon deux journees pleines en croyant montrer la garde -- mais le repeter a
        // chaque changement de garde le ferait fermer sans le lire, ce qui reviendrait a ne rien
        // dire du tout.
        if (!heuresPosees && !me.avertissementDonne && garde.get('jourDebut') !== garde.get('jourFin')) {
            me.avertissementDonne = true;
            Ext.MessageBox.alert('P&eacute;riode appliqu&eacute;e',
                    'La garde <b>' + garde.get('libelle') + '</b> va du ' + garde.get('dateDebut')
                    + ' au ' + garde.get('dateFin') + '.<br/><br/>'
                    + 'Cet &eacute;cran ne g&egrave;re que des dates : il affichera les <b>journ&eacute;es '
                    + 'enti&egrave;res</b> du ' + garde.get('jourDebut') + ' au ' + garde.get('jourFin')
                    + ', activit&eacute; de jour comprise.<br/>'
                    + 'Pour les chiffres de la garde seule, utilisez l\'&eacute;cran de gestion des gardes.');
        }
        if (me.getRechercherApres()) {
            var bouton = hote.down('#rechercher');
            if (bouton) {
                bouton.fireEvent('click', bouton);
            }
        }
    }
});
