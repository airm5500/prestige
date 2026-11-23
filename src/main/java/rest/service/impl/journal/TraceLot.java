package rest.service.impl.journal;

import dal.TUser;
import dal.enumeration.TypeLog;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import rest.service.impl.achats.ModificationBl;

/**
 * Retours du 23/11 : trace des mises a jour en lot de la fiche article (« Mise à jour des articles », « MAJ seuil »,
 * ordonnancier ou sensible coche en lot, « cocher tout le résultat » de la gestion des articles).
 * <ul>
 * <li>{@link #lire} : les valeurs affichees des colonnes touchees, pour chaque article, avant puis apres la mise a jour
 * (memes libelles et memes mises en forme que la trace d'une fiche, {@link ModificationFiche}) ;</li>
 * <li>{@link #ecarts} : pour chaque article, les champs reellement changes ; un article deja a la valeur voulue n'en a
 * pas ;</li>
 * <li>{@link #ecrire} : une ligne de journal par article change, dans la transaction de la mise a jour, avec
 * l'identifiant de la fiche (onglet « Historique ») et le detail avant → apres.</li>
 * </ul>
 */
public final class TraceLot {

    /** Debut de la description d'une ligne de lot : l'onglet « Historique » l'affiche « Modification en lot ». */
    public static final String PREFIXE = "Modification en lot";

    private static final int PAQUET_LECTURE = 1000;
    private static final int PAQUET_ECRITURE = 200;

    private TraceLot() {
    }

    /** Une colonne suivie : libelle affiche, expression SQL (alias f, g, fa, t, lab, gam), mise en forme. */
    public static final class Colonne {
        public final String libelle;
        final String expression;
        final Function<Object, String> format;

        Colonne(String libelle, String expression, Function<Object, String> format) {
            this.libelle = libelle;
            this.expression = expression;
            this.format = format;
        }
    }

    static String texte(Object o) {
        return ModificationBl.texte(o == null ? null : String.valueOf(o));
    }

    static Boolean booleen(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof Boolean) {
            return (Boolean) o;
        }
        if (o instanceof Number) {
            return ((Number) o).intValue() != 0;
        }
        String s = String.valueOf(o).trim();
        return s.isEmpty() ? null : ("1".equals(s) || "true".equalsIgnoreCase(s));
    }

    static String oui(Object o) {
        Boolean b = booleen(o);
        return b == null ? "(vide)" : (b ? "oui" : "non");
    }

    static String entier(Object o) {
        return ModificationBl.montant(o == null ? null : ((Number) o).intValue());
    }

    public static final Colonne GROSSISTE = new Colonne("Grossiste", "g.str_LIBELLE", TraceLot::texte);
    public static final Colonne FAMILLE = new Colonne("Famille", "fa.str_LIBELLE", TraceLot::texte);
    public static final Colonne TVA = new Colonne("TVA", "t.int_VALUE",
            o -> o == null ? "(vide)" : ((Number) o).intValue() + " %");
    public static final Colonne CODE_REMISE = new Colonne("Code remise", "f.str_CODE_REMISE", TraceLot::texte);
    public static final Colonne TABLEAU = new Colonne("Tableau", "f.int_T", TraceLot::texte);
    public static final Colonne LABORATOIRE = new Colonne("Laboratoire", "lab.libelle", TraceLot::texte);
    public static final Colonne GAMME = new Colonne("Gamme", "gam.libelle", TraceLot::texte);
    public static final Colonne ORDONNANCIER = new Colonne("Ordonnancier", "f.is_scheduled", TraceLot::oui);
    public static final Colonne SENSIBLE = new Colonne("Sensible", "f.is_sensible", TraceLot::oui);
    public static final Colonne REMISE = new Colonne("Remise autorisée", "f.bool_REMISE", TraceLot::oui);
    public static final Colonne Q1 = new Colonne("Q1", "f.int_Q1_SEUIL_REAPPRO", TraceLot::entier);
    public static final Colonne Q2 = new Colonne("Q2", "f.int_Q2_QTE_REAPPRO", TraceLot::entier);
    /** « Gestion des articles » : article coche a l'ecran = bool_ACCOUNT a 0 (regle historique). */
    public static final Colonne RETENU = new Colonne("Article retenu", "f.bool_ACCOUNT", o -> {
        Boolean b = booleen(o);
        return b == null ? "(vide)" : (b ? "non" : "oui");
    });

    private static final String JOINTURES = " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID"
            + " LEFT JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID"
            + " LEFT JOIN t_code_tva t ON t.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID"
            + " LEFT JOIN laboratoire lab ON lab.id = f.laboratoire_id"
            + " LEFT JOIN gamme_produit gam ON gam.id = f.gamme_id";

    /** CIP, nom et valeurs affichees d'un article. */
    public static final class Photo {
        final String cip;
        final String nom;
        final Map<String, String> valeurs;

        public Photo(String cip, String nom, Map<String, String> valeurs) {
            this.cip = cip;
            this.nom = nom;
            this.valeurs = valeurs;
        }
    }

    /** Valeurs affichees des colonnes, pour chaque article (lecture par paquets de 1 000). */
    @SuppressWarnings("unchecked")
    public static Map<String, Photo> lire(EntityManager em, List<String> ids, List<Colonne> colonnes) {
        Map<String, Photo> m = new LinkedHashMap<>();
        if (ids == null || ids.isEmpty()) {
            return m;
        }
        StringBuilder sel = new StringBuilder("SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME");
        for (Colonne c : colonnes) {
            sel.append(", ").append(c.expression);
        }
        sel.append(" FROM t_famille f").append(JOINTURES).append(" WHERE f.lg_FAMILLE_ID IN ?1");
        for (int i = 0; i < ids.size(); i += PAQUET_LECTURE) {
            List<String> paquet = ids.subList(i, Math.min(ids.size(), i + PAQUET_LECTURE));
            for (Object[] r : (List<Object[]>) em.createNativeQuery(sel.toString()).setParameter(1, paquet)
                    .getResultList()) {
                Map<String, String> v = new LinkedHashMap<>();
                for (int k = 0; k < colonnes.size(); k++) {
                    v.put(colonnes.get(k).libelle, colonnes.get(k).format.apply(r[3 + k]));
                }
                m.put((String) r[0], new Photo((String) r[1], (String) r[2], v));
            }
        }
        return m;
    }

    /** Pour chaque article present avant et apres, les champs changes ; les articles sans changement sont absents. */
    public static Map<String, List<ModificationBl.Champ>> ecarts(Map<String, Photo> avant, Map<String, Photo> apres) {
        Map<String, List<ModificationBl.Champ>> m = new LinkedHashMap<>();
        for (Map.Entry<String, Photo> e : avant.entrySet()) {
            Photo b = apres.get(e.getKey());
            if (b == null) {
                continue;
            }
            List<ModificationBl.Champ> l = ModificationFiche.ecarts(e.getValue().valeurs, b.valeurs);
            if (!l.isEmpty()) {
                m.put(e.getKey(), l);
            }
        }
        return m;
    }

    /** « Modification en lot (operation) de la fiche CIP NOM par AUTEUR : champ, champ », 255 caracteres au plus. */
    public static String description(String operation, String cip, String nom, String auteur,
            List<ModificationBl.Champ> champs) {
        StringBuilder libelles = new StringBuilder();
        for (ModificationBl.Champ c : champs) {
            libelles.append(libelles.length() == 0 ? "" : ", ").append(c.libelle.toLowerCase(Locale.FRENCH));
        }
        return StringUtils.left(PREFIXE + " (" + StringUtils.trimToEmpty(operation) + ") de la fiche "
                + StringUtils.trimToEmpty(cip) + " " + StringUtils.trimToEmpty(nom) + " par "
                + StringUtils.trimToEmpty(auteur) + " : " + libelles, ModificationFiche.LONGUEUR_DESCRIPTION);
    }

    /**
     * Une ligne de journal par article change (insertion par paquets de 200, dans la transaction de l'appelant).
     *
     * @return le nombre de lignes ecrites ; 0 sans utilisateur
     */
    public static int ecrire(EntityManager em, TUser u, String operation, Map<String, Photo> avant,
            Map<String, Photo> apres) {
        if (u == null) {
            return 0;
        }
        Map<String, List<ModificationBl.Champ>> ecarts = ecarts(avant, apres);
        if (ecarts.isEmpty()) {
            return 0;
        }
        String auteur = StringUtils.trimToEmpty(
                StringUtils.defaultString(u.getStrFIRSTNAME()) + " " + StringUtils.defaultString(u.getStrLASTNAME()));
        List<Object[]> lignes = new ArrayList<>();
        for (Map.Entry<String, List<ModificationBl.Champ>> e : ecarts.entrySet()) {
            Photo p = apres.get(e.getKey());
            lignes.add(new Object[] { UUID.randomUUID().toString(), e.getKey(),
                    description(operation, p.cip, p.nom, auteur, e.getValue()), ModificationBl.detail(e.getValue()) });
        }
        int n = 0;
        for (int i = 0; i < lignes.size(); i += PAQUET_ECRITURE) {
            List<Object[]> paquet = lignes.subList(i, Math.min(lignes.size(), i + PAQUET_ECRITURE));
            StringBuilder sql = new StringBuilder("INSERT INTO t_event_log (lg_EVENT_LOG_ID, lg_USER_ID, dt_CREATED,"
                    + " dt_UPDATED, str_CREATED_BY, str_STATUT, str_TABLE_CONCERN, typeLog, str_TYPE_LOG,"
                    + " str_DESCRIPTION, str_DETAIL) VALUES ");
            for (int k = 0; k < paquet.size(); k++) {
                int b = k * 7;
                sql.append(k == 0 ? "" : ", ").append("(?").append(b + 1).append(", ?").append(b + 2)
                        .append(", NOW(), NOW(), ?").append(b + 3).append(", 'enable', 'dal.TFamille', ?").append(b + 4)
                        .append(", ?").append(b + 5).append(", ?").append(b + 6).append(", ?").append(b + 7)
                        .append(")");
            }
            Query q = em.createNativeQuery(sql.toString());
            for (int k = 0; k < paquet.size(); k++) {
                int b = k * 7;
                Object[] l = paquet.get(k);
                q.setParameter(b + 1, l[0]);
                q.setParameter(b + 2, u.getLgUSERID());
                q.setParameter(b + 3, StringUtils.defaultString(u.getStrLOGIN()));
                q.setParameter(b + 4, TypeLog.MODIFICATION_FICHE_PRODUIT.ordinal());
                q.setParameter(b + 5, l[1]);
                q.setParameter(b + 6, l[2]);
                q.setParameter(b + 7, l[3]);
            }
            n += q.executeUpdate();
        }
        return n;
    }

    /** Raccourci : liste d'une colonne. */
    public static List<Colonne> colonnes(Colonne... c) {
        return Collections.unmodifiableList(Arrays.asList(c));
    }
}
