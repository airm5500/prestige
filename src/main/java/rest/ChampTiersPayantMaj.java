package rest;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.BiConsumer;
import org.apache.commons.lang3.StringUtils;

import dal.TTiersPayant;

/**
 * Les donnees du tiers payant que la mise a jour selective sait poser en masse.
 *
 * <p>
 * L'ecran affiche un selecteur : l'officine coche les donnees qu'elle veut regler, et seules celles-la sont envoyees.
 * Une donnee non envoyee n'est pas touchee. C'est la seule regle qui rend l'ecran sur : sans elle, appliquer « bons par
 * page » a quarante organismes viderait au passage leur plafond de credit.
 * </p>
 *
 * <p>
 * Le code d'edition du bordereau ne figure pas ici : il exige de retrouver le {@code TModelFacture} correspondant, ce
 * qui demande l'EntityManager. Il reste traite a part par la ressource REST, avec son parametre historique.
 * </p>
 */
public enum ChampTiersPayantMaj {

    /** Nombre d'exemplaires du bordereau imprimes. */
    NBRE_EXEMPLAIRE_BORD("Nombre d'exemplaires du bordereau", Type.ENTIER,
            (tp, v) -> tp.setIntNBREEXEMPLAIREBORD((Integer) v)),

    /** Nombre maximum de bons par facture. 0 ou moins veut dire « pas de limite ». */
    NBREBONS("Nombre maximum de bons par facture", Type.ENTIER, (tp, v) -> tp.setIntNBREBONS((Integer) v)),

    /** Montant maximum d'une facture. 0 ou moins veut dire « pas de limite ». */
    MONTANTFAC("Montant maximum d'une facture", Type.ENTIER, (tp, v) -> tp.setIntMONTANTFAC((Integer) v)),

    /** Ordre des lignes sur la facture. Memes valeurs que la liste deroulante de la fiche. */
    MODE_TRI_FACTURE("Mode de tri de la facture", Type.TEXTE, (tp, v) -> tp.setStrMODETRIFACTURE((String) v)),

    /** Plafond de credit accorde a l'organisme. */
    PLAFOND_CREDIT("Plafond de crédit", Type.DECIMAL, (tp, v) -> tp.setDblPLAFONDCREDIT((Double) v)),

    /** Plafond par vente pour l'organisme. */
    PLAFOND_VENTE("Plafond par tiers payant", Type.DECIMAL, (tp, v) -> tp.setDblPLAFONDVENTE((Double) v)),

    /** Le plafond est-il absolu ? */
    IS_ABSOLUTE("Plafond absolu", Type.BOOLEEN, (tp, v) -> tp.setBIsAbsolute((Boolean) v)),

    /** Compte contribuable, repris sur les etats fiscaux. */
    COMPTE_CONTRIBUABLE("Compte contribuable", Type.TEXTE, (tp, v) -> tp.setStrCOMPTECONTRIBUABLE((String) v)),

    /** Registre de commerce, repris sur les etats fiscaux. */
    REGISTRE_COMMERCE("Registre de commerce", Type.TEXTE, (tp, v) -> tp.setStrREGISTRECOMMERCE((String) v)),

    /** Code officine attribue par l'organisme. */
    CODE_OFFICINE("Code officine", Type.TEXTE, (tp, v) -> tp.setStrCODEOFFICINE((String) v));

    /** Ce qu'on sait lire dans la valeur envoyee par l'ecran. */
    public enum Type {
        ENTIER, DECIMAL, TEXTE, BOOLEEN
    }

    /** Longueur des colonnes texte concernees : les trois font 100 caracteres en base. */
    private static final int LONGUEUR_TEXTE = 100;

    private final String libelle;
    private final Type type;
    private final BiConsumer<TTiersPayant, Object> poseur;

    ChampTiersPayantMaj(String libelle, Type type, BiConsumer<TTiersPayant, Object> poseur) {
        this.libelle = libelle;
        this.type = type;
        this.poseur = poseur;
    }

    public String libelle() {
        return libelle;
    }

    public Type type() {
        return type;
    }

    /** Le champ portant ce nom, ou {@code null} si l'ecran a envoye un nom inconnu. */
    public static ChampTiersPayantMaj parNom(String nom) {
        if (StringUtils.isBlank(nom)) {
            return null;
        }
        for (ChampTiersPayantMaj champ : values()) {
            if (champ.name().equalsIgnoreCase(nom.trim())) {
                return champ;
            }
        }
        return null;
    }

    /**
     * Traduit la valeur telle que l'ecran l'envoie (toujours du texte) vers le type attendu par l'entite.
     *
     * @throws IllegalArgumentException
     *             si la valeur ne convient pas ; le message est destine a l'utilisateur
     */
    public Object convertir(String valeur) {
        String brut = StringUtils.trimToEmpty(valeur);
        switch (type) {
        case ENTIER:
            return entier(brut);
        case DECIMAL:
            return decimal(brut);
        case BOOLEEN:
            // « 1 » / « 0 » comme partout ailleurs dans l'application ; « true » / « false » sont
            // acceptes parce qu'un appel direct a l'API les ecrit naturellement ainsi.
            if ("1".equals(brut) || "true".equalsIgnoreCase(brut)) {
                return Boolean.TRUE;
            }
            if ("0".equals(brut) || "false".equalsIgnoreCase(brut)) {
                return Boolean.FALSE;
            }
            throw new IllegalArgumentException(libelle + " : répondez oui ou non.");
        case TEXTE:
        default:
            return texte(brut);
        }
    }

    private Object entier(String brut) {
        try {
            return Integer.valueOf(brut);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(libelle + " : « " + brut + " » n'est pas un nombre entier.");
        }
    }

    private Object decimal(String brut) {
        try {
            // La virgule decimale francaise arrive telle quelle depuis certains claviers.
            double valeur = Double.parseDouble(brut.replace(',', '.'));
            if (valeur < 0) {
                throw new IllegalArgumentException(libelle + " : un montant négatif n'a pas de sens.");
            }
            return Double.valueOf(valeur);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(libelle + " : « " + brut + " » n'est pas un montant.");
        }
    }

    private Object texte(String brut) {
        if (this == MODE_TRI_FACTURE && !"ALPHABETIQUE".equals(brut) && !"DATE_BON".equals(brut)) {
            throw new IllegalArgumentException(libelle + " : « " + brut + " » n'est pas un mode de tri connu.");
        }
        if (brut.length() > LONGUEUR_TEXTE) {
            // Tronquer silencieusement ecrirait une valeur fausse dans quarante fiches d'un coup.
            throw new IllegalArgumentException(
                    libelle + " : " + LONGUEUR_TEXTE + " caractères au maximum (" + brut.length() + " saisis).");
        }
        // Un texte vide efface la donnee : c'est voulu, l'officine coche le champ pour le vider.
        return brut;
    }

    /** Pose la valeur deja convertie sur le tiers payant. */
    public void appliquer(TTiersPayant tiersPayant, Object valeur) {
        poseur.accept(tiersPayant, valeur);
    }

    /** Ce qui sera repris dans le message de confirmation et dans le journal. */
    public String resume(Object valeur) {
        if (type == Type.BOOLEEN) {
            return libelle + " = " + (Boolean.TRUE.equals(valeur) ? "oui" : "non");
        }
        String texte = String.valueOf(valeur);
        return libelle + " = " + (texte.isEmpty() ? "(vide)" : texte);
    }

    /**
     * Lit la table {@code champ -> valeur} envoyee par l'ecran et rend les valeurs converties, dans l'ordre de la
     * declaration de l'enumeration pour que le message de confirmation soit toujours presente pareil.
     *
     * @param json
     *            objet JSON ; une forme illisible rend une table vide, l'appelant refusera faute de reglage
     *
     * @throws IllegalArgumentException
     *             si une valeur ne convient pas
     */
    public static Map<ChampTiersPayantMaj, Object> lire(String json) {
        Map<ChampTiersPayantMaj, Object> valeurs = new LinkedHashMap<>();
        if (StringUtils.isBlank(json)) {
            return valeurs;
        }
        org.json.JSONObject objet;
        try {
            objet = new org.json.JSONObject(json);
        } catch (org.json.JSONException e) {
            return valeurs;
        }
        for (ChampTiersPayantMaj champ : values()) {
            if (objet.has(champ.name())) {
                // getString refuserait un nombre ou un booleen JSON ; l'ecran envoie du texte, mais un
                // appel direct a l'API peut envoyer le type naturel de la donnee.
                valeurs.put(champ,
                        champ.convertir(objet.isNull(champ.name()) ? "" : String.valueOf(objet.get(champ.name()))));
            }
        }
        return valeurs;
    }
}
