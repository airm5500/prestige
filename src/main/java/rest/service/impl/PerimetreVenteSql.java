package rest.service.impl;

/**
 * Perimetre de vente d'un emplacement, pose sur les requetes de chiffre d'affaires.
 *
 * <p>
 * Une vente jouee DANS un depot d'extension (evolution 5, point 1) laisse son argent dans la caisse de l'operateur de
 * l'officine : son mouvement de caisse porte donc l'officine comme magasin. C'est necessaire - l'argent est reellement
 * dans ce tiroir, et le ticket Z de l'operateur doit le voir.
 *
 * <p>
 * Mais l'officine a decide que ce chiffre d'affaires appartient au depot et ne se melange pas au sien. Le magasin du
 * mouvement ne suffit donc plus a definir le perimetre :
 * <ul>
 * <li>pour l'officine, on retire les ventes jouees dans un depot ;</li>
 * <li>pour un depot, on ajoute celles qui y ont ete jouees depuis l'officine, aux cotes de celles saisies par un
 * utilisateur rattache au depot - le cas qui existait deja, et qui n'est pas touche.</li>
 * </ul>
 *
 * <p>
 * Consequence assumee : le total du ticket Z d'un operateur et le chiffre d'affaires de l'officine ne coincident plus
 * des qu'il y a eu des ventes en depot. L'ecart vaut exactement ces ventes, et le ticket Z le nomme.
 */
public final class PerimetreVenteSql {

    /** Colonne portant le depot d'extension ou la vente s'est jouee ; NULL pour une vente d'officine. */
    static final String COLONNE = "p.`lg_EMPLACEMENT_VENTE_ID`";

    private PerimetreVenteSql() {
    }

    /**
     * Clause de perimetre a substituer au predicat d'emplacement d'une requete de vente.
     *
     * @param clauseMagasin
     *            le predicat d'origine, tel qu'il est ecrit dans la requete
     * @param parametre
     *            le parametre positionnel qu'il utilise, par exemple « ?2 »
     * @param depot
     *            vrai si l'emplacement demande est un depot d'extension
     */
    public static String clause(String clauseMagasin, String parametre, boolean depot) {
        if (depot) {
            return " (" + clauseMagasin + " OR " + COLONNE + " = " + parametre + ") ";
        }
        return " " + clauseMagasin + " AND " + COLONNE + " IS NULL ";
    }

    /**
     * Les ecritures exactes du predicat d'emplacement rencontrees dans les requetes de vente. Elles sont enumerees
     * plutot que devinees : une ecriture oubliee laisserait sa requete sur l'ancien perimetre, et le test la fait
     * remonter.
     */
    static final String[][] PREDICATS = { { "m.`lg_EMPLACEMENT_ID` =?2", "?2" }, { "m.lg_EMPLACEMENT_ID = ?2", "?2" },
            { "m.`lg_EMPLACEMENT_ID` =?4", "?4" }, { "u.lg_EMPLACEMENT_ID=?4", "?4" } };

    /**
     * Pose le perimetre sur une requete. Une requete sans vente a son cote (achats, autres mouvements de caisse) est
     * rendue telle quelle : elle n'a pas de « p » a interroger.
     */
    public static String appliquer(String sql, boolean depot) {
        if (sql == null || !sql.contains("t_preenregistrement")) {
            return sql;
        }
        String resultat = sql;
        for (String[] predicat : PREDICATS) {
            if (resultat.contains(predicat[0])) {
                resultat = resultat.replace(predicat[0], clause(predicat[0], predicat[1], depot));
            }
        }
        return resultat;
    }
}
