package rest.service.extranet.ubipharm;

import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.JournalCollecte;
import rest.service.extranet.commun.ReponseExtranet;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.commun.TransportExtranet.Attendu;

/**
 * Collecte de la page Ubipharm « Nouveaux produits » : un seul GET /NouveauxProduits (HTML attendu), en lecture seule.
 * Une page de connexion recue a la place (meme en 200) leve SESSION_EXPIREE, controle fait par le transport.
 */
public final class NouveauxProduitsCollecteur {

    public static final String CHEMIN = "/NouveauxProduits";
    /** Nom du module dans extranet_collecte. */
    public static final String MODULE = "NOUVEAUX_PRODUITS";
    /**
     * Statut de collecte quand la page montre une pagination : les lignes lues sont gardees, mais la liste n'est pas
     * presentee comme complete.
     */
    public static final String PARTIELLE = "PARTIELLE";

    private final TransportExtranet transport;
    private final NouveauxProduitsParseur parseur = new NouveauxProduitsParseur();

    public NouveauxProduitsCollecteur(TransportExtranet transport) {
        if (transport == null || transport.session().source() != SourceExtranet.UBIPHARM) {
            throw new IllegalArgumentException("Transport Ubipharm attendu");
        }
        this.transport = transport;
    }

    /** Lit la page et l'analyse ; rien n'est enregistre. */
    public NouveauxProduitsParseur.Resultat collecter() throws ExtranetException {
        ReponseExtranet r = transport.lire(CHEMIN, null, Attendu.HTML, null);
        return parseur.analyser(r.texte());
    }

    /**
     * Collecte journalisee et enregistree : ouvre la collecte, lit, enregistre les lignes, ferme la collecte (COMPLETE,
     * ou PARTIELLE si une pagination est visible), puis ne garde que les lignes de cette collecte. En cas d'echec, la
     * collecte est fermee en ECHEC et les lignes precedentes restent en place.
     *
     * @return identifiant de la collecte
     */
    public long collecterEtEnregistrer(JournalCollecte journal, NouveauxProduitsDepot depot, String utilisateur)
            throws ExtranetException {
        long id = journal.ouvrir(SourceExtranet.UBIPHARM, MODULE, null, utilisateur);
        NouveauxProduitsParseur.Resultat r;
        try {
            r = collecter();
        } catch (ExtranetException e) {
            journal.fermer(id, JournalCollecte.ECHEC, null, 0, e.getMessage());
            throw e;
        }
        depot.enregistrer(id, r.lignes());
        boolean complete = !r.paginationDetectee();
        journal.fermer(id, complete ? JournalCollecte.COMPLETE : PARTIELLE, null, r.lignes().size(),
                complete ? null : "Pagination visible sur la page : la liste lue n'est peut-être pas complète");
        depot.garderSeulement(id);
        return id;
    }
}
