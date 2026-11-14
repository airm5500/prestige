package rest.service.impl;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Rapport d'exploitation du 13/11, point 11 : chaque nuit, la veille de coherence remontait tout l'historique connu (2
 * 922 commandes de 2024, 500 lignes d'inventaire, 10 factures vides...) sans dire ce qui etait apparu depuis le passage
 * precedent. On garde, par controle, les identifiants deja vus ; un passage separe alors les cas NOUVEAUX des cas DEJA
 * CONNUS.
 * <p>
 * Regles : nouveaux et connus forment une partition des cas du passage (dans leur ordre) ; un cas qui disparait est
 * oublie, de sorte qu'il redevient nouveau s'il revient ; quand la liste est tronquee (plafond du controle atteint), on
 * n'oublie rien, faute de savoir si un cas absent est vraiment resolu.
 * </p>
 */
public final class SupportCasConnus {

    private final List<Object[]> nouveaux;
    private final List<Object[]> connus;
    private final Set<String> aRetenir;
    private final Set<String> aOublier;

    private SupportCasConnus(List<Object[]> nouveaux, List<Object[]> connus, Set<String> aRetenir,
            Set<String> aOublier) {
        this.nouveaux = nouveaux;
        this.connus = connus;
        this.aRetenir = aRetenir;
        this.aOublier = aOublier;
    }

    /** Longueur maximale d'un identifiant garde (colonne cas_id). */
    public static final int ID_MAX = 191;

    /** Identifiant d'un cas : sa premiere colonne, limitee a {@link #ID_MAX} caracteres. */
    public static String identifiant(Object[] ligne) {
        String id = ligne != null && ligne.length > 0 && ligne[0] != null ? String.valueOf(ligne[0]) : "";
        return id.length() > ID_MAX ? id.substring(0, ID_MAX) : id;
    }

    /**
     * @param lignes
     *            cas du passage (premiere colonne = identifiant)
     * @param dejaVus
     *            identifiants retenus au passage precedent
     * @param tronque
     *            vrai si le controle a atteint son plafond de lignes
     */
    public static SupportCasConnus separer(List<Object[]> lignes, Collection<String> dejaVus, boolean tronque) {
        Set<String> vus = dejaVus == null ? Collections.emptySet() : new LinkedHashSet<>(dejaVus);
        List<Object[]> nouveaux = new ArrayList<>();
        List<Object[]> connus = new ArrayList<>();
        Set<String> aRetenir = new LinkedHashSet<>();
        Set<String> presents = new LinkedHashSet<>();
        for (Object[] ligne : lignes == null ? Collections.<Object[]> emptyList() : lignes) {
            String id = identifiant(ligne);
            boolean premiereFois = presents.add(id);
            if (vus.contains(id)) {
                connus.add(ligne);
            } else {
                nouveaux.add(ligne);
                if (premiereFois) {
                    aRetenir.add(id);
                }
            }
        }
        Set<String> aOublier = new LinkedHashSet<>();
        if (!tronque) {
            for (String id : vus) {
                if (!presents.contains(id)) {
                    aOublier.add(id);
                }
            }
        }
        return new SupportCasConnus(nouveaux, connus, aRetenir, aOublier);
    }

    public List<Object[]> getNouveaux() {
        return nouveaux;
    }

    public List<Object[]> getConnus() {
        return connus;
    }

    /** Identifiants a ajouter a la memoire du controle. */
    public Set<String> getARetenir() {
        return aRetenir;
    }

    /** Identifiants a retirer de la memoire (cas resolus). */
    public Set<String> getAOublier() {
        return aOublier;
    }
}
