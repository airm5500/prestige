package util;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Filtre multiple des ecrans d'analyse (13/10) : rayons, familles ou grossistes coches, envoyes separes par des
 * virgules. Un seul identifiant (ancien fonctionnement) reste accepte tel quel. Vide ou « ALL » : pas de filtre. Les
 * valeurs passent TOUJOURS en parametres lies (jamais collees dans la requete).
 */
public final class FiltreListe {

    /** Au-dela, la liste est tronquee : une selection d'ecran n'en a jamais autant. */
    public static final int MAX_VALEURS = 500;

    private FiltreListe() {
    }

    /** Identifiants distincts, dans l'ordre recu ; liste vide = pas de filtre. */
    public static List<String> valeurs(String brut) {
        Set<String> v = new LinkedHashSet<>();
        if (brut != null) {
            for (String s : brut.split(",")) {
                String t = s.trim();
                if (!t.isEmpty() && !"ALL".equalsIgnoreCase(t) && v.size() < MAX_VALEURS) {
                    v.add(t);
                }
            }
        }
        return new ArrayList<>(v);
    }

    /**
     * Criteria : « chemin IN (valeurs) », ou null s'il n'y a pas de filtre (l'appelant n'ajoute alors rien). Un seul
     * identifiant donne un IN a une valeur, equivalent de l'ancien cb.equal.
     */
    public static javax.persistence.criteria.Predicate predicat(javax.persistence.criteria.Expression<?> chemin,
            String brut) {
        List<String> v = valeurs(brut);
        return v.isEmpty() ? null : chemin.in(v);
    }

    public static boolean actif(String brut) {
        return !valeurs(brut).isEmpty();
    }

    /**
     * Ajoute « AND colonne IN (?n, ?n+1...) » a la requete et les valeurs a la liste des parametres. Le premier numero
     * est {@code premierNumero + parametres.size()} : la meme convention que les requetes qui l'appellent.
     */
    public static void ajouter(StringBuilder sql, String colonne, String brut, List<? super String> parametres,
            int premierNumero) {
        List<String> v = valeurs(brut);
        if (v.isEmpty()) {
            return;
        }
        sql.append(" AND ").append(colonne).append(" IN (");
        for (int i = 0; i < v.size(); i++) {
            sql.append(i == 0 ? "" : ", ").append('?').append(premierNumero + parametres.size());
            parametres.add(v.get(i));
        }
        sql.append(')');
    }
}
