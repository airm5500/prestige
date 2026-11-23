package rest.service.impl.journal;

import dal.enumeration.TypeLog;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.achats.ModificationBl;

/**
 * Retours du 23/11, proposition 2 : onglet « Historique » de la fiche article. Les lignes du journal qui concernent la
 * fiche, de la plus recente a la plus ancienne.
 * <ul>
 * <li>une ligne porte l'identifiant de la fiche (lignes ecrites depuis le 23/11) ou son CIP (lignes plus anciennes) ;
 * </li>
 * <li>une ligne au CIP datee d'avant la creation de la fiche appartient a une fiche precedente du meme CIP (cas R-LUME
 * : fiche supprimee puis recreee) ; une ligne au CIP partage par plusieurs fiches est signalee ;</li>
 * <li>la creation figure une fois : celle du journal si elle porte l'identifiant, sinon une ligne a la date de creation
 * de la fiche avec l'auteur retrouve ({@link rest.service.impl.CreateurArticle}).</li>
 * </ul>
 */
public final class HistoriqueFiche {

    /** Types du journal qui concernent un produit. */
    public static final Set<TypeLog> TYPES = Collections.unmodifiableSet(EnumSet.of(TypeLog.AJOUT_DE_NOUVEAU_PRODUIT,
            TypeLog.AJOUT_DE_DETAIL_PRODUIT, TypeLog.MODIFICATION_FICHE_PRODUIT, TypeLog.DESACTIVATION_DE_PRODUIT,
            TypeLog.SUPPRESSION_DE_PRODUIT, TypeLog.ACTIVATION_DE_PRODUIT, TypeLog.MODIFICATION_PRIX_VENTE_PRODUIT,
            TypeLog.MODIFICATION_INFO_PRODUIT_COMMANDE, TypeLog.AJUSTEMENT_DE_PRODUIT, TypeLog.DECONDITIONNEMENT,
            TypeLog.SAISIS_PERIMES, TypeLog.RETOUR_FOURNISSEUR, TypeLog.ORDONNANCIER_PRODUIT));

    /** Nombre de lignes rendues au plus. */
    public static final int MAXI = 500;

    public static final String CETTE_FICHE = "cette fiche";
    public static final String FICHE_PRECEDENTE = "fiche précédente (même CIP)";
    public static final String CIP_PARTAGE = "CIP partagé par plusieurs fiches";

    private HistoriqueFiche() {
    }

    /** Une ligne du journal lue en base. */
    public static final class Ligne {
        final Date le;
        final TypeLog type;
        final String description;
        final String detail;
        final String ref;
        final String auteur;

        public Ligne(Date le, TypeLog type, String description, String detail, String ref, String auteur) {
            this.le = le;
            this.type = type;
            this.description = description;
            this.detail = detail;
            this.ref = ref;
            this.auteur = auteur;
        }
    }

    /** Libelle court de l'action, pour la colonne « Action ». */
    public static String action(TypeLog t) {
        if (t == null) {
            return "";
        }
        switch (t) {
        case AJOUT_DE_NOUVEAU_PRODUIT:
        case AJOUT_DE_DETAIL_PRODUIT:
            return "Création";
        case MODIFICATION_FICHE_PRODUIT:
            return "Modification de la fiche";
        case DESACTIVATION_DE_PRODUIT:
            return "Désactivation";
        case SUPPRESSION_DE_PRODUIT:
            return "Suppression";
        case ACTIVATION_DE_PRODUIT:
            return "Réactivation";
        case MODIFICATION_PRIX_VENTE_PRODUIT:
            return "Prix de vente";
        case MODIFICATION_INFO_PRODUIT_COMMANDE:
            return "Prix à la commande";
        case AJUSTEMENT_DE_PRODUIT:
            return "Ajustement";
        case DECONDITIONNEMENT:
            return "Déconditionnement";
        case SAISIS_PERIMES:
            return "Saisie de périmés";
        case RETOUR_FOURNISSEUR:
            return "Retour fournisseur";
        case ORDONNANCIER_PRODUIT:
            return "Ordonnancier / sensible";
        default:
            return t.getValue();
        }
    }

    /** Description sans le suffixe technique « référence [ ... ] ». */
    static String sansReference(String d) {
        String s = StringUtils.trimToEmpty(d);
        int i = s.lastIndexOf(" référence [");
        return i > 0 && s.endsWith("]") ? s.substring(0, i).trim() : s;
    }

    /**
     * @param id
     *            identifiant de la fiche
     * @param creeLe
     *            date de creation de la fiche
     * @param fichesParCip
     *            nombre de fiches (tous statuts) par CIP de la fiche
     * @param lignes
     *            lignes du journal dont la reference est l'identifiant ou un CIP de la fiche
     * @param auteurCreation
     *            auteur de la creation retrouve hors journal par identifiant (peut etre vide)
     */
    public static JSONArray assembler(String id, Date creeLe, Map<String, Integer> fichesParCip, List<Ligne> lignes,
            String auteurCreation) {
        List<Ligne> l = new ArrayList<>();
        boolean creation = false;
        for (Ligne g : lignes) {
            if (g == null || g.le == null || !TYPES.contains(g.type)) {
                continue;
            }
            l.add(g);
            creation |= estCreation(id, g);
        }
        if (!creation && creeLe != null) {
            l.add(new Ligne(creeLe, TypeLog.AJOUT_DE_NOUVEAU_PRODUIT, "Création de la fiche", null, id,
                    StringUtils.trimToEmpty(auteurCreation)));
        }
        l.sort(Comparator.comparing((Ligne g) -> g.le).reversed());
        SimpleDateFormat f = new SimpleDateFormat("dd/MM/yyyy HH:mm");
        JSONArray a = new JSONArray();
        for (Ligne g : l.subList(0, Math.min(MAXI, l.size()))) {
            JSONArray champs = new JSONArray();
            for (ModificationBl.Champ c : ModificationBl.lire(g.detail)) {
                champs.put(new JSONObject().put("champ", c.libelle).put("avant", c.avant).put("apres", c.apres));
            }
            a.put(new JSONObject().put("le", f.format(g.le)).put("action", action(g.type))
                    .put("auteur", StringUtils.trimToEmpty(g.auteur)).put("quoi", sansReference(g.description))
                    .put("champs", champs).put("fiche", fiche(id, creeLe, fichesParCip, g)));
        }
        return a;
    }

    /** Ligne de creation qui porte l'identifiant de la fiche (lignes ecrites depuis le 23/11). */
    public static boolean estCreation(String id, Ligne g) {
        return g != null && id.equals(g.ref)
                && (g.type == TypeLog.AJOUT_DE_NOUVEAU_PRODUIT || g.type == TypeLog.AJOUT_DE_DETAIL_PRODUIT);
    }

    /** A quelle fiche la ligne se rattache. */
    static String fiche(String id, Date creeLe, Map<String, Integer> fichesParCip, Ligne g) {
        if (id.equals(g.ref)) {
            return CETTE_FICHE;
        }
        // une seconde de marge : la ligne de creation est ecrite juste apres la fiche
        if (creeLe != null && g.le.getTime() < creeLe.getTime() - 1_000L) {
            return FICHE_PRECEDENTE;
        }
        Integer n = fichesParCip.get(g.ref);
        return n != null && n > 1 ? CIP_PARTAGE : CETTE_FICHE;
    }

    /** Ordinaux des types, pour la requete. */
    public static List<Integer> ordinaux() {
        List<Integer> o = new ArrayList<>();
        for (TypeLog t : TYPES) {
            o.add(t.ordinal());
        }
        Collections.sort(o);
        return o;
    }

    static List<String> refs(String id, String... cips) {
        List<String> r = new ArrayList<>(Arrays.asList(id));
        for (String c : cips) {
            if (StringUtils.isNotBlank(c) && !r.contains(c.trim())) {
                r.add(c.trim());
            }
        }
        return r;
    }
}
