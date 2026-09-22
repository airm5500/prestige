package rest.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Regles de saisie d'une ordonnance client : controles et numerotation (evolution 6, point 2).
 *
 * <p>
 * Tout est ici, en methodes statiques sans base de donnees, pour une raison simple : ce sont les regles qu'il faut
 * pouvoir verifier une par une. Un controle qui ne vit que dans l'ecran ExtJS est un controle qu'un appel direct au
 * service contourne, et un document de sante enregistre sans client ou sans date n'est plus un document.
 */
public final class OrdonnanceClientSaisie {

    /** Longueurs de la base : tronquer proprement vaut mieux qu'une erreur SQL a l'enregistrement. */
    public static final int MAX_LIBELLE = 150;
    public static final int MAX_POSOLOGIE = 150;
    public static final int MAX_DUREE = 50;
    public static final int MAX_ETABLISSEMENT = 100;
    public static final int MAX_MOTIF = 200;

    private static final DateTimeFormatter MOIS = DateTimeFormatter.ofPattern("yyyyMM");

    private OrdonnanceClientSaisie() {
    }

    /**
     * Controles d'une ordonnance a enregistrer. Rend la liste des refus, vide si tout est bon.
     *
     * <p>
     * Le prescripteur et l'etablissement ne sont PAS obligatoires (« si disponibles ») : une ordonnance dont le tampon
     * est illisible doit pouvoir etre saisie, sinon elle ne le sera pas du tout et l'information est perdue pour de
     * bon.
     */
    public static List<String> valider(JSONObject o, LocalDate aujourdhui) {
        List<String> refus = new ArrayList<>();
        if (o == null) {
            refus.add("Aucune donnée reçue.");
            return refus;
        }
        if (StringUtils.isBlank(o.optString("clientId", null))) {
            refus.add("Choisissez le client de l'ordonnance.");
        }
        LocalDate date = date(o.optString("dateOrdonnance", null));
        if (date == null) {
            refus.add("La date de l'ordonnance est obligatoire.");
        } else if (aujourdhui != null && date.isAfter(aujourdhui)) {
            /*
             * Une ordonnance datee de demain n'existe pas. Le refus est utile : la faute de frappe sur l'annee (2027 au
             * lieu de 2026) sortirait sinon le document de tous les historiques filtres par periode.
             */
            refus.add("La date de l'ordonnance ne peut pas être dans le futur.");
        }
        JSONArray produits = o.optJSONArray("produits");
        int retenus = 0;
        if (produits != null) {
            for (int i = 0; i < produits.length(); i++) {
                JSONObject p = produits.optJSONObject(i);
                if (p == null || estLigneVide(p)) {
                    continue;
                }
                retenus++;
                if (StringUtils.isBlank(libelle(p))) {
                    refus.add("Ligne " + (i + 1) + " : le produit doit être nommé.");
                }
                if (p.optInt("quantite", 1) <= 0) {
                    refus.add("Ligne " + (i + 1) + " : la quantité doit être supérieure à zéro.");
                }
                Integer servie = qteServie(p);
                if (servie != null && servie < 0) {
                    refus.add("Ligne " + (i + 1) + " : la quantité servie ne peut pas être négative.");
                } else if (servie != null && servie > Math.max(1, p.optInt("quantite", 1))) {
                    /*
                     * Servir plus que prescrit fausserait le taux de satisfaction (plus de 100 %) : on le refuse plutot
                     * que de le rabattre en silence.
                     */
                    refus.add("Ligne " + (i + 1) + " : la quantité servie dépasse la quantité prescrite.");
                }
            }
        }
        if (retenus == 0) {
            refus.add("Une ordonnance comporte au moins un produit prescrit.");
        }
        Object age = o.opt("agePatient");
        if (age != null && age != JSONObject.NULL && !"".equals(String.valueOf(age).trim())) {
            Integer a = agePatient(o);
            if (a == null || a < 0 || a > AGE_MAX) {
                refus.add("L'âge du patient doit être compris entre 0 et " + AGE_MAX + " ans.");
            }
        }
        return refus;
    }

    /** Au-dela, c'est une faute de frappe (l'annee de naissance tapee a la place de l'age). */
    public static final int AGE_MAX = 130;

    /**
     * Quantite servie d'une ligne : null quand elle n'est pas renseignee (champ absent, vide ou nul). Le null a un sens
     * - « pas encore renseigne » - distinct de 0, « non servi ».
     */
    static Integer qteServie(JSONObject p) {
        Object v = p.opt("qteServie");
        if (v == null || v == JSONObject.NULL) {
            return null;
        }
        if (v instanceof Number) {
            return ((Number) v).intValue();
        }
        String texte = String.valueOf(v).trim();
        if (texte.isEmpty()) {
            return null;
        }
        try {
            return Integer.valueOf(texte);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Age saisi, ou null s'il est absent ou illisible. */
    static Integer agePatient(JSONObject o) {
        Object v = o.opt("agePatient");
        if (v == null || v == JSONObject.NULL) {
            return null;
        }
        if (v instanceof Number) {
            return ((Number) v).intValue();
        }
        try {
            return Integer.valueOf(String.valueOf(v).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Sexe normalise : F, M, ou null. Toute autre valeur est ignoree plutot que stockee telle quelle. */
    static String sexePatient(JSONObject o) {
        String v = StringUtils.trimToEmpty(o.optString("sexePatient", "")).toUpperCase();
        return "F".equals(v) || "M".equals(v) ? v : null;
    }

    /*
     * ETAT DE SERVICE D'UNE ORDONNANCE (retour du 22/09 : « partiellement par ligne »).
     *
     * Calcule a partir des lignes, jamais stocke : un etat stocke a cote des lignes finit toujours par les contredire.
     */
    public static final String SERVICE_A_RENSEIGNER = "a_renseigner";
    public static final String SERVICE_NON_SERVIE = "non_servie";
    public static final String SERVICE_PARTIELLE = "partielle";
    public static final String SERVICE_SERVIE = "servie";

    /**
     * @param nbLignes
     *            lignes de l'ordonnance
     * @param nbRenseignees
     *            lignes dont la quantite servie est renseignee (0 compris)
     * @param nbServies
     *            lignes servies EN ENTIER (servie >= prescrite)
     * @param qteServie
     *            quantite servie totale
     */
    public static String etatService(int nbLignes, int nbRenseignees, int nbServies, int qteServie) {
        if (nbLignes <= 0 || nbRenseignees <= 0) {
            return SERVICE_A_RENSEIGNER;
        }
        if (nbServies >= nbLignes) {
            return SERVICE_SERVIE;
        }
        if (qteServie <= 0) {
            return SERVICE_NON_SERVIE;
        }
        return SERVICE_PARTIELLE;
    }

    /**
     * Une ligne entierement vide est ignoree, pas refusee : la grille de saisie garde presque toujours une derniere
     * ligne amorcee que l'operateur n'a pas remplie, et la lui reprocher serait absurde.
     */
    static boolean estLigneVide(JSONObject p) {
        return StringUtils.isBlank(libelle(p)) && StringUtils.isBlank(p.optString("articleId", null))
                && StringUtils.isBlank(p.optString("posologie", null))
                && StringUtils.isBlank(p.optString("duree", null));
    }

    static String libelle(JSONObject p) {
        String libelle = p.optString("libelle", null);
        return libelle == null ? null : libelle.trim();
    }

    /** Date au format ISO (yyyy-MM-dd) telle que l'envoie l'ecran, ou null si elle est absente ou illisible. */
    public static LocalDate date(String iso) {
        if (StringUtils.isBlank(iso)) {
            return null;
        }
        String valeur = iso.trim();
        if (valeur.length() > 10) {
            // « 2026-09-18T00:00:00 » : les datefield ExtJS envoient parfois l'heure avec la date.
            valeur = valeur.substring(0, 10);
        }
        try {
            return LocalDate.parse(valeur);
        } catch (RuntimeException e) {
            return null;
        }
    }

    /**
     * Numero lisible d'une ordonnance : {@code ORD-AAAAMM-0001}.
     *
     * <p>
     * C'est ce qu'on dit au telephone et ce qui s'imprime en tete de fiche ; un identifiant technique de 40 caracteres
     * ne se lit pas a voix haute. La sequence repart a 1 chaque mois : au bout de quelques annees, un compteur global
     * ne dirait plus rien, alors que le mois situe le document.
     */
    public static String numero(LocalDate jour, int sequence) {
        return String.format("ORD-%s-%04d", MOIS.format(jour), sequence);
    }

    /**
     * Sequence suivante, deduite du dernier numero du mois. Un numero inattendu (format ancien, saisie manuelle) ne
     * fait pas echouer l'enregistrement : on repart de la valeur la plus haute qu'on sait lire.
     */
    public static int sequenceSuivante(String dernierNumero) {
        if (StringUtils.isBlank(dernierNumero)) {
            return 1;
        }
        int tiret = dernierNumero.lastIndexOf('-');
        if (tiret < 0 || tiret + 1 >= dernierNumero.length()) {
            return 1;
        }
        String fin = dernierNumero.substring(tiret + 1);
        if (!StringUtils.isNumeric(fin)) {
            return 1;
        }
        return Integer.parseInt(fin) + 1;
    }

    /** Tronque a la longueur de la colonne, sans jamais rendre null pour une valeur presente. */
    public static String tronquer(String valeur, int max) {
        if (valeur == null) {
            return null;
        }
        String propre = valeur.trim();
        return propre.length() <= max ? propre : propre.substring(0, max);
    }
}
