/* global Ext */

/**
 * « Gestion dépôts extensions » (évolution 5, point 1).
 *
 * Un seul dépôt est choisi en haut de l'écran, et les onglets Valorisation et Chiffre d'affaires le suivent.
 * L'onglet de saisie de vente garde son propre sélecteur : le dépôt y est redemandé à chaque vente, choix de
 * l'officine, et le choix fait en haut ne fait que le prérenseigner.
 *
 * Tous les sélecteurs sont QUALIFIÉS par l'onglet visé (depotextensionstock, depotextensionemplacement,
 * depotextensionca) et non par le seul xtype de l'écran : les trois onglets portent des composants de même
 * nature, et un sélecteur trop large en piloterait un autre que le sien. C'est la classe de bug rencontrée
 * deux fois sur ce projet.
 *
 * Tant qu'aucun dépôt n'est choisi, rien n'est demandé au serveur et les éditions restent inactives : une liste
 * de stock sans dépôt n'aurait aucun sens.
 */
Ext.define('testextjs.controller.DepotExtensionCtr', {
    extend: 'Ext.app.Controller',

    views: ['testextjs.view.stockmanagement.depotextension.DepotExtensionManager'],

    refs: [
        { ref: 'ecran', selector: 'depotextension' },
        { ref: 'depotEcran', selector: 'depotextension #depotEcran' },
        { ref: 'grilleStock', selector: 'depotextension depotextensionstock' },
        { ref: 'grilleEmplacement', selector: 'depotextension depotextensionemplacement' },
        { ref: 'ongletCa', selector: 'depotextension depotextensionca' },
        /* Criteres partages par les deux vues de la valorisation : ils vivent au-dessus d'elles. */
        { ref: 'criteresBarre', selector: 'depotextension #barreCriteres' },
        { ref: 'barreVues', selector: 'depotextension #barreVues' },
        { ref: 'onglets', selector: 'depotextension #onglets' },
        { ref: 'pointCaisse', selector: 'depotextension pointcaisseview' }
    ],

    init: function () {
        var me = this;
        me.control({
            'depotextension #depotEcran': { select: me.surChangementDepot },
            'depotextension #barreCriteres combobox[itemId=famille]': { select: me.rechercher },
            'depotextension #barreCriteres combobox[itemId=emplacement]': { select: me.rechercher },
            'depotextension #barreCriteres combobox[itemId=filtreStock]': { select: me.surFiltreStock },
            'depotextension #barreCriteres checkbox[itemId=enStock]': { change: me.rechercher },
            'depotextension #barreCriteres button[itemId=rechercher]': { click: me.rechercher },
            'depotextension #barreCriteres textfield[itemId=recherche]': { specialkey: me.surTouche },
            'depotextension #barreVues button[itemId=exporterExcel]': { click: me.exporterExcel },
            'depotextension #barreVues button[itemId=imprimer]': { click: me.imprimer },
            'depotextension #vueSimple': { click: me.montrerVueSimple },
            'depotextension #vueEmplacement': { click: me.montrerVueEmplacement },
            'depotextension depotextensionca button[itemId=caRechercher]': { click: me.chargerCa },
            'depotextension depotextensionca button[itemId=caImprimer]': { click: me.imprimerCa },
            'depotextension #onglets': { tabchange: me.surChangementOnglet },
            'depotextension': { afterrender: me.surAffichage }
        });
    },

    surAffichage: function () {
        var me = this;
        var stock = me.getGrilleStock();
        if (stock) {
            stock.getStore().on('load', me.surChargementStock, me);
        }
        var emplacement = me.getGrilleEmplacement();
        if (emplacement) {
            emplacement.getStore().on('load', me.surChargementEmplacement, me);
        }
        me.rappeler('Choisissez un dépôt.');
        me.majActions();
        // Des l'affichage : la saisie de vente part d'un depot vide et d'un titre sans nom de depot.
        me.imposerLeDepotALaVente();
        me.appliquerPrivilegesOnglets();
    },

    /**
     * Retire les onglets auxquels l'opérateur n'a pas droit.
     *
     * Retour du 17/09 : « ajouter un privilège sur chaque onglet de sorte à ne pas permettre que tout le monde
     * voie tout ». Retirer l'onglet, et non le désactiver : un onglet grisé donne l'impression d'un défaut, alors
     * qu'il s'agit d'une décision de l'officine.
     *
     * Ce n'est PAS le contrôle d'accès — masquer un onglet n'en est pas un. Les services refusent de leur côté,
     * chacun sur son privilège ; ceci ne fait que présenter à chacun l'écran qui le concerne. Si l'appel échoue,
     * on ne retire rien : mieux vaut un onglet de trop, que les services refuseront, qu'un écran vide sans
     * explication.
     */
    appliquerPrivilegesOnglets: function () {
        var me = this;
        Ext.Ajax.request({
            url: '../api/v1/depot-extension/onglets',
            method: 'GET',
            success: function (reponse) {
                var droits = Ext.JSON.decode(reponse.responseText, true);
                if (!droits || droits.success === false) { return; }
                me.retirerOngletsInterdits(droits);
            }
        });
    },

    retirerOngletsInterdits: function (droits) {
        var me = this;
        var onglets = me.getOnglets();
        if (!onglets || onglets.isDestroyed) { return; }
        var correspondance = {
            ongletVente: 'vente',
            ongletValorisation: 'valorisation',
            ongletCa: 'ca',
            ongletPointCaisse: 'pointCaisse'
        };
        var aRetirer = [];
        onglets.items.each(function (onglet) {
            var cle = correspondance[onglet.getItemId()];
            if (cle && droits[cle] === false) { aRetirer.push(onglet); }
        });
        Ext.Array.each(aRetirer, function (onglet) {
            onglets.remove(onglet, true);
        });
        // Le premier onglet restant devient l'onglet courant : sans cela, l'ecran s'ouvrirait sur un
        // onglet retire et n'afficherait rien.
        if (onglets.items.getCount() > 0 && !onglets.getActiveTab()) {
            onglets.setActiveTab(0);
        }
        me.ongletsRetires = Ext.Array.map(aRetirer, function (o) { return o.getItemId(); });
    },

    /** Identifiant du dépôt choisi pour l'écran, ou chaîne vide. */
    depotId: function () {
        var combo = this.getDepotEcran();
        return combo && combo.getValue() ? combo.getValue() : '';
    },

    nomDepot: function () {
        var combo = this.getDepotEcran();
        return combo ? (combo.getRawValue() || '') : '';
    },

    /**
     * Critères courants de la valorisation, lus à UN SEUL endroit : la barre partagée.
     *
     * C'est ce qui rend vrai le retour du 17/09 — « la recherche sur valorisation simple joue sur l'option par
     * emplacement » : les deux vues, les deux éditions et l'export lisent la même fonction, il n'existe donc pas
     * deux jeux de critères susceptibles de diverger.
     *
     * « ALL » est la valeur que les combos de la maison envoient pour « Tous » : elle vaut absence de filtre. Le
     * serveur la neutralise aussi, mais autant ne pas l'envoyer.
     */
    criteres: function () {
        var barre = this.getCriteresBarre();
        var valeur = function (selecteur) {
            var champ = barre ? barre.down(selecteur) : null;
            var v = champ ? champ.getValue() : '';
            return (!v || v === 'ALL') ? '' : v;
        };
        var recherche = barre ? barre.down('#recherche') : null;
        var filtre = barre && barre.down('#filtreStock') ? (barre.down('#filtreStock').getValue() || 'TOUS') : 'TOUS';
        return {
            depotId: this.depotId(),
            query: recherche ? (recherche.getValue() || '').trim() : '',
            familleId: valeur('#famille'),
            zoneGeoId: valeur('#emplacement'),
            filtreStock: filtre,
            enStock: (barre && barre.down('#enStock') && barre.down('#enStock').getValue()) ? 'true' : 'false'
        };
    },

    /**
     * Le filtre de stock l'emporte sur la case « masquer les articles à 0 », et la case est grisée tant qu'il est
     * posé : les deux se contrediraient sinon — masquer les zéros ET ne garder que les zéros ne ramènerait jamais
     * rien, et l'utilisateur chercherait longtemps pourquoi sa liste est vide. Le SQL applique la même règle.
     */
    surFiltreStock: function () {
        var barre = this.getCriteresBarre();
        var filtre = barre && barre.down('#filtreStock') ? barre.down('#filtreStock').getValue() : 'TOUS';
        var caseZero = barre ? barre.down('#enStock') : null;
        if (caseZero) {
            caseZero.setDisabled(filtre && filtre !== 'TOUS');
        }
        this.rechercher();
    },

    surChangementDepot: function () {
        var me = this;
        // Un changement de dépôt vide les listes avant de recharger : on ne doit pas voir une seconde le
        // contenu du dépôt précédent sous le nom du nouveau.
        var stock = me.getGrilleStock();
        if (stock) { stock.getStore().removeAll(); }
        var emplacement = me.getGrilleEmplacement();
        if (emplacement) { emplacement.getStore().removeAll(); }
        me.majValorisation(null);
        me.majTotauxEmplacement(null);
        me.viderCa();
        me.rappeler('');
        me.majActions();
        me.imposerLeDepotALaVente();
        me.rechargerOngletCourant();
    },

    /**
     * Impose à la saisie de vente le dépôt choisi en haut de l'écran.
     *
     * Le dépôt appartient à l'écran : dans l'onglet de vente il n'est plus saisissable, il est affiché en
     * lecture seule et grisé. Deux retours de l'officine viennent de là — le dépôt disparaissait, encadré de
     * rouge, après chaque vente validée, et le titre gardait le nom d'un dépôt précédent alors que plus rien
     * n'était choisi. Un reflet ne peut ni disparaître ni retarder.
     *
     * Passer une valeur vide est volontairement permis : c'est ce qui remet le champ ET le titre à zéro quand
     * on désélectionne le dépôt en haut.
     */
    imposerLeDepotALaVente: function () {
        var me = this;
        var ecran = me.getEcran();
        if (!ecran) { return; }
        var combo = ecran.down('doventeendepot #depotVente');
        if (!combo || combo.isDestroyed) { return; }
        var ctr = me.application.getController('VenteEnDepotCtr');
        var id = me.depotId();
        var poser = function () {
            if (!ctr || combo.isDestroyed) { return; }
            ctr.imposerLeDepot(id && combo.getStore().findExact('id', id) >= 0 ? id : null);
        };
        // Le store des dépôts de la vente peut ne pas être encore chargé : on attend, une seule fois.
        if (id && combo.getStore().getCount() === 0) {
            combo.getStore().on('load', poser, me, { single: true });
            combo.getStore().load();
        } else {
            poser();
        }
    },

    surTouche: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.rechercher();
        }
    },

    majActions: function () {
        var barre = this.getBarreVues();
        if (!barre) { return; }
        var actif = !!this.depotId();
        barre.down('#imprimer').setDisabled(!actif);
        // L'export Excel ne vaut que pour la liste des articles : la ventilation par emplacement tient en
        // quelques lignes, elle s'imprime. Le bouton suit donc la vue affichee.
        barre.down('#exporterExcel').setDisabled(!actif || this.vueCourante() === 'depotextensionemplacement');
    },

    /** xtype de la vue de valorisation actuellement affichée. */
    vueCourante: function () {
        var ecran = this.getEcran();
        var vues = ecran ? ecran.down('#vues') : null;
        var courante = vues ? vues.getLayout().getActiveItem() : null;
        return courante ? courante.getXType() : '';
    },

    rechercher: function () {
        var me = this;
        me.majActions();
        if (!me.depotId()) {
            me.majValorisation(null);
            me.majTotauxEmplacement(null);
            return;
        }
        me.rechargerOngletCourant();
    },

    /** On ne charge que la vue visible : un onglet caché n'a pas à interroger le serveur. */
    rechargerOngletCourant: function () {
        var me = this;
        if (!me.depotId()) { return; }
        var ecran = me.getEcran();
        if (!ecran) { return; }
        var onglets = ecran.down('#onglets');
        var actif = onglets ? onglets.getActiveTab() : null;
        var id = actif ? actif.getItemId() : '';
        if (!actif || id === 'ongletValorisation') {
            me.chargerVueValorisation();
        } else if (id === 'ongletPointCaisse') {
            // Changer de dépôt doit se voir dans l'onglet affiché, quel qu'il soit : sinon le point de
            // caisse continuerait d'afficher le dépôt précédent sous le nom du nouveau.
            me.orienterLePointDeCaisse();
        }
    },

    chargerVueValorisation: function () {
        var me = this;
        if (me.vueCourante() === 'depotextensionemplacement') {
            me.chargerEmplacement();
        } else {
            me.chargerStock();
        }
    },

    chargerStock: function () {
        var stock = this.getGrilleStock();
        if (!stock || !this.depotId()) { return; }
        var proxy = stock.getStore().getProxy();
        proxy.extraParams = Ext.apply(proxy.extraParams || {}, this.criteres());
        stock.getStore().loadPage(1);
    },

    chargerEmplacement: function () {
        var grille = this.getGrilleEmplacement();
        if (!grille || !this.depotId()) { return; }
        var proxy = grille.getStore().getProxy();
        proxy.extraParams = Ext.apply(proxy.extraParams || {}, this.criteres());
        grille.getStore().load();
    },

    /*
     * Passer d'une vue a l'autre RECHARGE la vue d'arrivee avec les criteres courants.
     *
     * C'est exactement le scenario decrit par l'officine : on cherche « doliprane » dans la liste des articles,
     * on passe par emplacement et on ne doit voir que le rayon COMPRIMES ; on revient, on efface la recherche,
     * et la vue par emplacement remontre tous les rayons. Comme les criteres sont partages, il suffit de
     * recharger a l'arrivee - aucune synchronisation a maintenir entre deux jeux de critères.
     */
    montrerVueSimple: function () {
        var ecran = this.getEcran();
        var vues = ecran ? ecran.down('#vues') : null;
        if (!vues) { return; }
        vues.getLayout().setActiveItem(0);
        this.majActions();
        this.chargerStock();
    },

    montrerVueEmplacement: function () {
        var ecran = this.getEcran();
        var vues = ecran ? ecran.down('#vues') : null;
        if (!vues) { return; }
        vues.getLayout().setActiveItem(1);
        this.majActions();
        this.chargerEmplacement();
    },

    surChangementOnglet: function (onglets, onglet) {
        var me = this;
        if (!me.depotId()) {
            me.rappeler('Choisissez un dépôt.');
            return;
        }
        var id = onglet.getItemId();
        if (id === 'ongletValorisation') {
            me.chargerVueValorisation();
        } else if (id === 'ongletVente') {
            me.imposerLeDepotALaVente();
        } else if (id === 'ongletPointCaisse') {
            me.orienterLePointDeCaisse();
        }
        // L'onglet Chiffre d'affaires ne se charge pas tout seul : la période est à choisir.
    },

    /**
     * Impose au point de caisse le dépôt choisi en haut de l'écran, puis relance sa recherche.
     *
     * L'écran « Point Caisse Dépôt » est embarqué tel quel et s'ouvre sur « TOUT » : dans cet onglet, il doit
     * parler du même dépôt que ses voisins, sinon les quatre onglets donneraient quatre périmètres différents
     * sous le même titre. Le choix reste modifiable dans l'onglet — on ne verrouille pas un écran emprunté.
     */
    orienterLePointDeCaisse: function () {
        var me = this;
        var vue = me.getPointCaisse();
        if (!vue || vue.isDestroyed) { return; }
        var combo = vue.down('combobox');
        if (!combo || combo.isDestroyed) { return; }
        var id = me.depotId();
        var poser = function () {
            if (combo.isDestroyed) { return; }
            // Le dépôt d'extension n'est proposé que s'il figure dans la liste de cet écran ; sinon on laisse
            // le choix tel quel plutôt que d'imposer une valeur qui ne ramènerait rien.
            if (id && combo.getStore().findExact(combo.valueField, id) >= 0) {
                combo.setValue(id);
            }
            var bouton = Ext.getCmp('searchBtnPointCaisseFiltre');
            if (bouton && !bouton.isDestroyed) { bouton.fireEvent('click', bouton); }
        };
        if (combo.getStore().getCount() === 0) {
            combo.getStore().on('load', poser, me, { single: true });
        } else {
            poser();
        }
    },

    /**
     * La valorisation vient du serveur : elle porte sur toutes les lignes retenues, pas sur la page affichée.
     *
     * Elle est lue dans les données brutes du lecteur du store, et non dans un argument de l'événement : en
     * ExtJS 4.2, « load » reçoit (store, enregistrements, succès, eOpts) et ne transporte PAS l'opération,
     * donc aucune réponse complète.
     */
    surChargementStock: function (store) {
        var reponse = this.reponseBrute(store);
        if (reponse && reponse.success === false) {
            this.majValorisation(null, reponse.message);
            return;
        }
        this.majValorisation(reponse ? reponse.valorisation : null);
    },

    surChargementEmplacement: function (store) {
        var reponse = this.reponseBrute(store);
        this.majTotauxEmplacement(reponse ? reponse.valorisation : null);
        this.majValorisation(reponse ? reponse.valorisation : null);
    },

    reponseBrute: function (store) {
        var lecteur = store.getProxy().getReader();
        return lecteur ? lecteur.rawData : null;
    },

    montant: function (v) {
        return Ext.util.Format.number(v || 0, '0,000');
    },

    majValorisation: function (valorisation, message) {
        var barre = this.getBarreVues();
        var zone = barre ? barre.down('#valorisation') : null;
        if (!zone) { return; }
        if (!valorisation) {
            zone.update(Ext.String.htmlEncode(message || 'Choisissez un dépôt pour voir ce qu\'il détient.'));
            return;
        }
        var n = this.montant;
        zone.update('<b>' + Ext.String.htmlEncode(this.nomDepot()) + '</b> — '
                + n(valorisation.articles) + ' article(s), ' + n(valorisation.quantite) + ' unité(s) — '
                + 'valeur d\'achat <b>' + n(valorisation.valeurAchat) + '</b> CFA — '
                + 'valeur de vente <b>' + n(valorisation.valeurVente) + '</b> CFA');
    },

    /**
     * Total du dépôt rappelé sous la ventilation par emplacement : c'est ce qui permet de vérifier d'un coup
     * d'œil que la somme des lignes fait bien le total.
     */
    majTotauxEmplacement: function (valorisation) {
        var grille = this.getGrilleEmplacement();
        var zone = grille ? grille.down('#totaux') : null;
        if (!zone) { return; }
        if (!valorisation) {
            zone.update('');
            return;
        }
        var n = this.montant;
        zone.update('Total du dépôt — valeur d\'achat <b>' + n(valorisation.valeurAchat) + '</b> CFA, '
                + 'valeur de vente <b>' + n(valorisation.valeurVente) + '</b> CFA '
                + '(la somme des lignes ci-dessus doit faire ce total)');
    },

    rappeler: function (texte) {
        var ecran = this.getEcran();
        var zone = ecran ? ecran.down('#rappelDepot') : null;
        if (zone) {
            zone.update(Ext.String.htmlEncode(texte || ''));
        }
    },

    /* ------------------------------------------------------------------ chiffre d'affaires */

    viderCa: function () {
        var onglet = this.getOngletCa();
        if (!onglet) { return; }
        onglet.down('#caGrille').getStore().removeAll();
        onglet.down('#caTotaux').update('');
        // L'edition n'a de sens qu'apres une recherche : on n'imprime pas une grille vide.
        onglet.down('#caImprimer').setDisabled(true);
    },

    chargerCa: function () {
        var me = this;
        var onglet = me.getOngletCa();
        if (!onglet) { return; }
        if (!me.depotId()) {
            onglet.down('#caTotaux').update('<span style="color:#c0392b;">Choisissez un dépôt.</span>');
            return;
        }
        var debut = onglet.down('#caDebut').getValue();
        var fin = onglet.down('#caFin').getValue();
        if (!debut || !fin) {
            onglet.down('#caTotaux').update('<span style="color:#c0392b;">Indiquez la période.</span>');
            return;
        }
        if (debut > fin) {
            onglet.down('#caTotaux').update('<span style="color:#c0392b;">La date de début est après la fin.</span>');
            return;
        }
        onglet.down('#caTotaux').update('Lecture en cours...');
        Ext.Ajax.request({
            method: 'GET',
            /*
             * Service propre à cet écran, et non le v1/balance/balancesalecashdepot partagé avec l'écran
             * « Balance Dépôt » : l'onglet a besoin d'une porte à lui pour que son privilège s'applique, et on
             * ne peut pas resserrer celui de l'autre écran sans le casser. Les chiffres sortent de la MÊME
             * balance — rien n'est recalculé, les deux écrans ne peuvent pas se contredire.
             */
            url: '../api/v1/depot-extension/ca',
            params: {
                dtStart: Ext.Date.format(debut, 'Y-m-d'),
                dtEnd: Ext.Date.format(fin, 'Y-m-d'),
                depotId: me.depotId()
            },
            timeout: 180000,
            success: function (reponse) {
                var r = Ext.JSON.decode(reponse.responseText, true) || {};
                me.afficherCa(r);
            },
            failure: function () {
                var o = me.getOngletCa();
                if (o && !o.isDestroyed) {
                    o.down('#caTotaux').update('<span style="color:#c0392b;">Le chiffre d\'affaires n\'a pas '
                            + 'pu être lu.</span>');
                }
            }
        });
    },

    afficherCa: function (r) {
        var me = this;
        var onglet = me.getOngletCa();
        if (!onglet || onglet.isDestroyed) { return; }
        if (r.success === false) {
            onglet.down('#caGrille').getStore().removeAll();
            onglet.down('#caTotaux').update('<span style="color:#c0392b;">'
                    + Ext.String.htmlEncode(r.msg || r.message || 'Chiffre d\'affaires indisponible.') + '</span>');
            return;
        }
        onglet.down('#caGrille').getStore().loadData(r.data || []);
        onglet.down('#caImprimer').setDisabled(!me.depotId());
        var meta = r.metaData || {};
        var n = me.montant;
        // Le rappel reprend les grandeurs des colonnes demandées : net, marge, et la part tiers payant, qui
        // dit ce qui reste à encaisser auprès d'un organisme.
        onglet.down('#caTotaux').update('<b>' + Ext.String.htmlEncode(me.nomDepot()) + '</b> — '
                + n(meta.nbreVente) + ' vente(s) — net <b>' + n(meta.montantNet) + '</b> CFA '
                + '(TTC ' + n(meta.montantTTC) + ', marge ' + n(meta.marge)
                + ', tiers payant ' + n(meta.montantTp) + ')');
    },

    /**
     * Edition du chiffre d'affaires, servie en flux dans l'onglet ouvert par le clic.
     *
     * Les chiffres ne sont pas ceux de la grille mais ceux que le serveur recalcule sur la MEME periode et le
     * meme depot : imprimer ce que le navigateur a en memoire donnerait un document qui ne correspond a rien
     * dès que quelqu'un a vendu entre-temps.
     */
    imprimerCa: function () {
        var onglet = this.getOngletCa();
        if (!onglet) { return; }
        var debut = onglet.down('#caDebut').getValue();
        var fin = onglet.down('#caFin').getValue();
        if (!this.depotId() || !debut || !fin) { return; }
        window.open('../api/v1/depot-extension/ca/pdf?' + Ext.Object.toQueryString({
            depotId: this.depotId(),
            dtStart: Ext.Date.format(debut, 'Y-m-d'),
            dtEnd: Ext.Date.format(fin, 'Y-m-d')
        }));
    },

    exporterExcel: function () {
        window.location = '../api/v1/depot-extension/stock/excel?'
                + Ext.Object.toQueryString(this.criteresEdition());
    },

    /**
     * Critères de l'édition : ceux de l'écran, plus les LIBELLÉS des filtres choisis.
     *
     * Le rappel de critères imprimé doit se relire sans avoir l'écran sous les yeux : « Famille : SPECIALITES
     * PUBLIQUES » se comprend, un identifiant technique non.
     */
    criteresEdition: function () {
        var criteres = this.criteres();
        var barre = this.getCriteresBarre();
        var brut = function (selecteur) {
            var champ = barre ? barre.down(selecteur) : null;
            var v = champ ? (champ.getRawValue() || '') : '';
            return (v === 'Tous' || v === 'Toutes') ? '' : v;
        };
        criteres.familleLibelle = criteres.familleId ? brut('#famille') : '';
        criteres.emplacementLibelle = criteres.zoneGeoId ? brut('#emplacement') : '';
        return criteres;
    },

    /**
     * PDF servi en flux : il s'ouvre une seule fois, dans l'onglet ouvert par le clic.
     *
     * Une seule commande pour les deux vues : elle édite CE QUI EST AFFICHÉ. « Par emplacement, on doit pouvoir
     * imprimer » — c'est le même bouton, avec le modèle de la vue courante.
     */
    imprimer: function () {
        var chemin = this.vueCourante() === 'depotextensionemplacement'
                ? '../api/v1/depot-extension/valorisation-emplacement/pdf?'
                : '../api/v1/depot-extension/stock/pdf?';
        window.open(chemin + Ext.Object.toQueryString(this.criteresEdition()));
    }
});
