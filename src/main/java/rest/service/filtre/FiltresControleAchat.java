package rest.service.filtre;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import rest.service.dto.BonLivraisonDetail;
import rest.service.dto.EtatControlBon;

/**
 * Filtres de l'etat de controle des achats (point 17) : statut du controle et presence d'ecarts.
 *
 * <p>
 * Ni l'un ni l'autre ne peut etre pose en base : le statut est calcule apres coup a partir des lignes du bon
 * (EtatControlBonBuilder), et l'ecart se lit en comparant la quantite controlee a la quantite recue. Le filtrage est
 * donc fait en Java, sur la liste complete et AVANT la pagination - filtrer la seule page affichee donnerait des pages
 * inegales et un total faux.
 *
 * <p>
 * Un critere laisse a « Tous » ne filtre rien : l'ecran s'ouvre comme avant.
 */
public final class FiltresControleAchat {

    /** Statut du controle demande. */
    public enum Statut {
        TOUS, CONTROLE, NON_CONTROLE
    }

    /** Presence d'ecarts demandee. */
    public enum Ecart {
        TOUS, AVEC_ECART, SANS_ECART
    }

    private final Statut statut;
    private final Ecart ecart;

    public FiltresControleAchat(String statut, String ecart) {
        this.statut = lire(Statut.class, statut, Statut.TOUS);
        this.ecart = lire(Ecart.class, ecart, Ecart.TOUS);
    }

    public boolean inactif() {
        return statut == Statut.TOUS && ecart == Ecart.TOUS;
    }

    public List<EtatControlBon> appliquer(List<EtatControlBon> bons) {
        if (bons == null) {
            return new ArrayList<>();
        }
        if (inactif()) {
            return new ArrayList<>(bons);
        }
        List<EtatControlBon> retenus = new ArrayList<>();
        for (EtatControlBon bon : bons) {
            if (accepteStatut(bon) && accepteEcart(bon)) {
                retenus.add(bon);
            }
        }
        return retenus;
    }

    /**
     * « Controle » = controle termine. Un bon commence mais non termine reste a faire du point de vue de celui qui
     * cherche ce qu'il lui reste a controler.
     */
    private boolean accepteStatut(EtatControlBon bon) {
        if (statut == Statut.TOUS) {
            return true;
        }
        boolean termine = "TERMINE".equals(bon.getChecked());
        return statut == Statut.CONTROLE ? termine : !termine;
    }

    private boolean accepteEcart(EtatControlBon bon) {
        if (ecart == Ecart.TOUS) {
            return true;
        }
        return ecart == Ecart.AVEC_ECART ? presenteUnEcart(bon) : !presenteUnEcart(bon);
    }

    /**
     * Un bon presente un ecart des qu'une de ses lignes a ete comptee et que le compte differe de la quantite recue.
     * Une ligne jamais comptee n'est pas un ecart : c'est un controle a faire, ce que dit deja le statut.
     */
    public static boolean presenteUnEcart(EtatControlBon bon) {
        List<BonLivraisonDetail> details = bon == null ? null : bon.getBonLivraisonDetails();
        if (details == null) {
            return false;
        }
        for (BonLivraisonDetail detail : details) {
            Integer compte = detail.getQuantiteControle();
            Integer recue = detail.getIntQTERECUE();
            if (compte != null && compte > 0 && recue != null && !compte.equals(recue)) {
                return true;
            }
        }
        return false;
    }

    /** Rappel des criteres retenus, pour l'en-tete des impressions et des exports. */
    public List<String> libelles() {
        List<String> criteres = new ArrayList<>();
        if (statut != Statut.TOUS) {
            criteres.add("Contrôle : " + (statut == Statut.CONTROLE ? "contrôlés" : "non contrôlés"));
        }
        if (ecart != Ecart.TOUS) {
            criteres.add("Écarts : " + (ecart == Ecart.AVEC_ECART ? "avec écarts" : "sans écart"));
        }
        return criteres;
    }

    private static <T extends Enum<T>> T lire(Class<T> type, String valeur, T defaut) {
        if (valeur == null || valeur.trim().isEmpty()) {
            return defaut;
        }
        try {
            return Enum.valueOf(type, valeur.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            // Valeur inconnue : on ne filtre pas plutot que de rendre une liste vide inexplicable.
            return defaut;
        }
    }
}
