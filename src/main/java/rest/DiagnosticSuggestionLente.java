package rest;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Diagnostic d'une suggestion qui tarde a s'ouvrir.
 *
 * <p>
 * Sur les bases anciennes, l'ouverture d'une suggestion peut mettre plusieurs dizaines de secondes. Deux causes ont ete
 * constatees en officine, et elles se cumulent :
 *
 * <ul>
 * <li>des lignes de vente en double dans {@value #TABLE} - le meme article deux fois sur la meme vente -, qui gonflent
 * tout ce que l'ecran recalcule article par article ;</li>
 * <li>l'absence de l'index (lg_FAMILLE_ID, dt_CREATED) sur cette meme table : chaque article oblige alors le serveur a
 * parcourir toutes ses lignes de vente au lieu de sauter directement au mois en cours.</li>
 * </ul>
 *
 * <p>
 * Cette classe ne contient que la lecture des constats et la redaction du rapport - aucun acces base, aucun conteneur -
 * de facon a etre verifiable par des tests.
 */
public final class DiagnosticSuggestionLente {

    /** Table des lignes de vente, ou se logent les deux causes connues. */
    public static final String TABLE = "t_preenregistrement_detail";

    /** Nombre de groupes en double detailles dans le rapport ; au-dela, la liste est annoncee comme tronquee. */
    public static final int MAX_LIGNES_DETAILLEES = 50;

    private DiagnosticSuggestionLente() {
    }

    /**
     * Un index, tel que le decrit information_schema.STATISTICS : son nom, son unicite, et ses colonnes dans l'ordre.
     */
    public static final class Index {

        private final String nom;
        private final boolean unique;
        private final List<String> colonnes;

        Index(String nom, boolean unique, List<String> colonnes) {
            this.nom = nom;
            this.unique = unique;
            this.colonnes = colonnes;
        }

        public String nom() {
            return nom;
        }

        public boolean unique() {
            return unique;
        }

        public List<String> colonnes() {
            return Collections.unmodifiableList(colonnes);
        }
    }

    /**
     * L'appel qui vient d'etre juge lent releve-t-il de l'ouverture d'une suggestion ?
     */
    public static boolean estAppelSuggestion(String uri) {
        return uri != null && uri.toLowerCase(Locale.ROOT).contains("/api/v1/suggestion");
    }

    /**
     * Identifiant de la suggestion porte par la chaine de requete, quel que soit le nom du parametre selon l'ecran
     * (orderId, suggestionId, id). Chaine vide quand l'appel n'en designe aucune.
     */
    public static String identifiantSuggestion(String chaineDeRequete) {
        if (chaineDeRequete == null) {
            return "";
        }
        for (String nom : new String[] { "orderId", "suggestionId", "id" }) {
            String valeur = parametre(chaineDeRequete, nom);
            if (!valeur.isEmpty()) {
                return valeur;
            }
        }
        return "";
    }

    private static String parametre(String chaineDeRequete, String nom) {
        for (String couple : chaineDeRequete.split("&")) {
            int egal = couple.indexOf('=');
            if (egal > 0 && couple.substring(0, egal).trim().equalsIgnoreCase(nom)) {
                return couple.substring(egal + 1).trim();
            }
        }
        return "";
    }

    /**
     * Reconstitue les index d'une table a partir des lignes d'information_schema.STATISTICS.
     *
     * @param lignes
     *            une ligne par colonne indexee : {nom de l'index, rang de la colonne, nom de la colonne, non_unique}
     */
    public static List<Index> index(List<Object[]> lignes) {
        Map<String, List<String>> colonnes = new LinkedHashMap<>();
        Map<String, Boolean> uniques = new LinkedHashMap<>();
        if (lignes != null) {
            for (Object[] ligne : lignes) {
                if (ligne == null || ligne.length < 4 || ligne[0] == null || ligne[2] == null) {
                    continue;
                }
                String nom = String.valueOf(ligne[0]);
                colonnes.computeIfAbsent(nom, cle -> new ArrayList<>()).add(String.valueOf(ligne[2]));
                uniques.put(nom, entier(ligne[3]) == 0);
            }
        }
        List<Index> resultat = new ArrayList<>();
        for (Map.Entry<String, List<String>> entree : colonnes.entrySet()) {
            resultat.add(
                    new Index(entree.getKey(), Boolean.TRUE.equals(uniques.get(entree.getKey())), entree.getValue()));
        }
        return resultat;
    }

    private static long entier(Object valeur) {
        if (valeur instanceof Number) {
            return ((Number) valeur).longValue();
        }
        try {
            return Long.parseLong(String.valueOf(valeur).trim());
        } catch (NumberFormatException e) {
            return 1L;
        }
    }

    /**
     * Existe-t-il un index qui commence par ces colonnes, dans cet ordre ? Un index plus large convient : seules les
     * premieres colonnes comptent pour l'acces.
     */
    public static boolean commencePar(List<Index> index, String... colonnes) {
        return trouver(index, false, colonnes) != null;
    }

    /**
     * Existe-t-il un index UNIQUE portant exactement ces colonnes ? C'est lui qui interdit les doublons.
     */
    public static boolean uniciteSur(List<Index> index, String... colonnes) {
        return trouver(index, true, colonnes) != null;
    }

    private static Index trouver(List<Index> index, boolean exigerUnicite, String... colonnes) {
        if (index == null || colonnes.length == 0) {
            return null;
        }
        for (Index candidat : index) {
            if (exigerUnicite && (!candidat.unique() || candidat.colonnes().size() != colonnes.length)) {
                continue;
            }
            if (candidat.colonnes().size() < colonnes.length) {
                continue;
            }
            boolean correspond = true;
            for (int i = 0; i < colonnes.length; i++) {
                if (!candidat.colonnes().get(i).equalsIgnoreCase(colonnes[i])) {
                    correspond = false;
                    break;
                }
            }
            if (correspond) {
                return candidat;
            }
        }
        return null;
    }

    /**
     * Ce que le diagnostic a retenu, en quelques mots.
     *
     * <p>
     * Ce verdict entre dans le message de l'evenement, donc dans sa signature : deux diagnostics qui disent la meme
     * chose sont regroupes et comptes ensemble, alors qu'un diagnostic qui change - l'index vient d'etre pose, des
     * doublons viennent d'apparaitre - ouvre un evenement neuf, avec son propre rapport. Sans cela, le premier constat
     * resterait affiche indefiniment, meme devenu faux.
     *
     * @param doublons
     *            groupes en double trouves, ou null quand la recherche n'a pas ete lancee
     */
    public static String verdict(boolean indexDateEnPlace, List<Object[]> doublons) {
        boolean avecDoublons = doublons != null && !doublons.isEmpty();
        if (!indexDateEnPlace && avecDoublons) {
            return "index manquant et lignes de vente en double";
        }
        if (!indexDateEnPlace) {
            return "index manquant";
        }
        if (avecDoublons) {
            return "lignes de vente en double";
        }
        return "cause non identifiee";
    }

    /**
     * Le script que le technicien copie et execute, tel qu'il a deja resolu le probleme en officine : on visualise, on
     * supprime les doublons dans les deux tables liees, puis on pose les deux index qui manquent.
     */
    public static String scriptCorrection() {
        return "/* 1. VISUALISER les lignes en double (aucune modification) */\n" //
                + "SELECT d.*\n" //
                + "FROM " + TABLE + " d\n" //
                + "JOIN (\n" //
                + "    SELECT lg_FAMILLE_ID, lg_PREENREGISTREMENT_ID,\n" //
                + "           MIN(lg_PREENREGISTREMENT_DETAIL_ID) AS id_a_garder\n" //
                + "    FROM " + TABLE + "\n" //
                + "    GROUP BY lg_FAMILLE_ID, lg_PREENREGISTREMENT_ID\n" //
                + "    HAVING COUNT(*) > 1\n" //
                + ") x ON x.lg_FAMILLE_ID = d.lg_FAMILLE_ID\n" //
                + "    AND x.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID\n" //
                + "WHERE d.lg_PREENREGISTREMENT_DETAIL_ID <> x.id_a_garder;\n" //
                + "\n" //
                + "/* 2. SUPPRIMER d'abord dans hmvtproduit (sinon la cle etrangere refuse la suppression) */\n" //
                + "DELETE FROM hmvtproduit\n" //
                + "WHERE lg_PREENREGISTREMENT_DETAIL_ID IN (\n" //
                + "    SELECT id FROM (\n" //
                + "        SELECT d.lg_PREENREGISTREMENT_DETAIL_ID AS id\n" //
                + "        FROM " + TABLE + " d\n" //
                + "        JOIN (\n" //
                + "            SELECT lg_FAMILLE_ID, lg_PREENREGISTREMENT_ID,\n" //
                + "                   MIN(lg_PREENREGISTREMENT_DETAIL_ID) AS id_a_garder\n" //
                + "            FROM " + TABLE + "\n" //
                + "            GROUP BY lg_FAMILLE_ID, lg_PREENREGISTREMENT_ID\n" //
                + "            HAVING COUNT(*) > 1\n" //
                + "        ) x ON x.lg_FAMILLE_ID = d.lg_FAMILLE_ID\n" //
                + "            AND x.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID\n" //
                + "        WHERE d.lg_PREENREGISTREMENT_DETAIL_ID <> x.id_a_garder\n" //
                + "    ) a_supprimer\n" //
                + ");\n" //
                + "\n" //
                + "/* 3. SUPPRIMER ensuite les lignes de vente en double */\n" //
                + "DELETE d\n" //
                + "FROM " + TABLE + " d\n" //
                + "JOIN (\n" //
                + "    SELECT lg_FAMILLE_ID, lg_PREENREGISTREMENT_ID,\n" //
                + "           MIN(lg_PREENREGISTREMENT_DETAIL_ID) AS id_a_garder\n" //
                + "    FROM " + TABLE + "\n" //
                + "    GROUP BY lg_FAMILLE_ID, lg_PREENREGISTREMENT_ID\n" //
                + "    HAVING COUNT(*) > 1\n" //
                + ") x ON x.lg_FAMILLE_ID = d.lg_FAMILLE_ID\n" //
                + "    AND x.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID\n" //
                + "WHERE d.lg_PREENREGISTREMENT_DETAIL_ID <> x.id_a_garder;\n" //
                + "\n" //
                + "/* 4. INTERDIRE le retour des doublons */\n" //
                + "ALTER TABLE `" + TABLE + "`\n" //
                + "ADD UNIQUE KEY `un_vente_produit` (`lg_FAMILLE_ID`, `lg_PREENREGISTREMENT_ID`);\n" //
                + "\n" //
                + "/* 5. POSER l'index qui evite de parcourir tout l'historique article par article */\n" //
                + "ALTER TABLE `" + TABLE + "`\n" //
                + "ADD INDEX `idx_prd_famille_date` (`lg_FAMILLE_ID`, `dt_CREATED`);\n" //
                + "\n" //
                + "/* 6. RAFRAICHIR les statistiques des tables touchees */\n" //
                + "ANALYZE TABLE " + TABLE + ";\n" //
                + "ANALYZE TABLE t_preenregistrement;\n" //
                + "ANALYZE TABLE hmvtproduit;\n";
    }

    /**
     * Rapport joint a l'evenement de support : ce qui a ete mesure, ce qui a ete trouve, et le script a executer.
     *
     * @param suggestionId
     *            suggestion concernee, ou chaine vide si l'appel n'en designait aucune
     * @param uri
     *            appel juge lent
     * @param dureeMs
     *            temps de traitement mesure
     * @param seuilMs
     *            seuil au-dela duquel un appel est juge lent
     * @param utilisateur
     *            qui a constate la lenteur
     * @param uniciteEnPlace
     *            l'index unique (lg_FAMILLE_ID, lg_PREENREGISTREMENT_ID) est-il pose ?
     * @param indexDateEnPlace
     *            un index commencant par (lg_FAMILLE_ID, dt_CREATED) est-il pose ?
     * @param doublons
     *            groupes en double trouves : {article, vente, nombre de lignes} ; null quand la recherche n'a pas ete
     *            lancee (l'unicite etant deja en place, aucun doublon n'est possible)
     * @param listeTronquee
     *            vrai quand il existe d'autres groupes que ceux listes
     */
    public static String rapport(String suggestionId, String uri, long dureeMs, long seuilMs, String utilisateur,
            boolean uniciteEnPlace, boolean indexDateEnPlace, List<Object[]> doublons, boolean listeTronquee) {
        StringBuilder sb = new StringBuilder();
        sb.append("Suggestion lente a l'ouverture.\n");
        sb.append("\n");
        sb.append("Suggestion  : ").append(vide(suggestionId) ? "non precisee par l'appel" : suggestionId).append("\n");
        sb.append("Appel       : ").append(vide(uri) ? "" : uri).append("\n");
        sb.append("Duree       : ").append(dureeMs).append(" ms (seuil ").append(seuilMs).append(" ms)\n");
        sb.append("Constate par: ").append(vide(utilisateur) ? "" : utilisateur).append("\n");
        sb.append("\n");

        sb.append("1. INDEX ATTENDUS SUR ").append(TABLE).append("\n");
        sb.append("   un_vente_produit (lg_FAMILLE_ID, lg_PREENREGISTREMENT_ID) : ")
                .append(uniciteEnPlace ? "en place" : "ABSENT").append("\n");
        sb.append("   idx_prd_famille_date (lg_FAMILLE_ID, dt_CREATED)          : ")
                .append(indexDateEnPlace ? "en place" : "ABSENT").append("\n");
        if (!indexDateEnPlace) {
            sb.append("   -> sans cet index, chaque article de la suggestion fait parcourir tout son historique\n");
            sb.append("      de ventes au lieu de sauter directement au mois en cours. C'est la premiere chose\n");
            sb.append("      a poser : l'etape 5 du script suffit, elle ne supprime rien.\n");
        }
        sb.append("\n");

        sb.append("2. LIGNES DE VENTE EN DOUBLE (meme article sur la meme vente)\n");
        if (doublons == null) {
            sb.append("   Recherche non lancee : l'index unique un_vente_produit est deja pose, aucun doublon\n");
            sb.append("   ne peut donc exister.\n");
            sb.append(conclusion(indexDateEnPlace));
        } else if (doublons.isEmpty()) {
            sb.append("   Aucun doublon trouve.\n");
            sb.append(conclusion(indexDateEnPlace));
        } else {
            long lignesEnTrop = 0;
            for (Object[] ligne : doublons) {
                lignesEnTrop += Math.max(0, entier(ligne.length > 2 ? ligne[2] : null) - 1);
            }
            sb.append("   ").append(doublons.size())
                    .append(listeTronquee ? " groupes au moins" : (doublons.size() > 1 ? " groupes" : " groupe"))
                    .append(" en double, soit ").append(lignesEnTrop)
                    .append(lignesEnTrop > 1 ? " lignes en trop.\n" : " ligne en trop.\n");
            sb.append("\n");
            sb.append("   article (lg_FAMILLE_ID)              vente (lg_PREENREGISTREMENT_ID)      lignes\n");
            int montres = 0;
            for (Object[] ligne : doublons) {
                if (montres++ >= MAX_LIGNES_DETAILLEES) {
                    break;
                }
                sb.append("   ").append(cadrer(texte(ligne.length > 0 ? ligne[0] : null), 36))
                        .append(cadrer(texte(ligne.length > 1 ? ligne[1] : null), 36))
                        .append(texte(ligne.length > 2 ? ligne[2] : null)).append("\n");
            }
            if (listeTronquee || doublons.size() > MAX_LIGNES_DETAILLEES) {
                sb.append("   ... liste tronquee : lancez la requete 1 du script pour la liste complete.\n");
            }
        }
        sb.append("\n");

        sb.append("3. REQUETES A EXECUTER (a copier telles quelles, base a l'arret des ventes)\n");
        sb.append("\n");
        sb.append(scriptCorrection());
        return sb.toString();
    }

    /**
     * Ce qu'on peut conclure quand aucun doublon n'est en cause : soit l'index manque encore et c'est lui la piste,
     * soit les deux causes connues sont ecartees et la lenteur vient d'ailleurs.
     */
    private static String conclusion(boolean indexDateEnPlace) {
        return indexDateEnPlace ? "   Les deux causes connues sont ecartees : la lenteur vient d'ailleurs.\n"
                : "   Reste donc l'index manquant du point 1 : c'est la piste a suivre.\n";
    }

    private static boolean vide(String valeur) {
        return valeur == null || valeur.trim().isEmpty();
    }

    private static String texte(Object valeur) {
        return valeur == null ? "" : String.valueOf(valeur);
    }

    private static String cadrer(String valeur, int largeur) {
        if (valeur.length() >= largeur) {
            return valeur + " ";
        }
        StringBuilder sb = new StringBuilder(valeur);
        while (sb.length() < largeur) {
            sb.append(' ');
        }
        return sb.toString();
    }
}
