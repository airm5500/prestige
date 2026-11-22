package util;

/**
 * Controle et normalisation d'un numero de mobile ivoirien avant toute communication (point 2).
 *
 * <p>
 * Un numero conforme compte 10 chiffres au format local et commence par 01, 05 ou 07. Il peut avoir ete saisi avec
 * l'indicatif (225, +225, 00225) et des separateurs (espaces, points, tirets, parentheses), retires a la normalisation.
 * Le resultat donne le numero local (0708473750) et international (2250708473750), ou le motif du rejet. Classe sans
 * dependance, testee unitairement.
 */
public final class TelephoneCi {

    /** Resultat du controle. */
    public static final class Resultat {

        private final boolean valide;
        private final String local;
        private final String international;
        private final String motif;

        private Resultat(boolean valide, String local, String international, String motif) {
            this.valide = valide;
            this.local = local;
            this.international = international;
            this.motif = motif;
        }

        public boolean isValide() {
            return valide;
        }

        /** Numero a 10 chiffres (format local), vide si invalide. */
        public String getLocal() {
            return local;
        }

        /** Numero avec l'indicatif 225 sans « + », vide si invalide. */
        public String getInternational() {
            return international;
        }

        /** Motif du rejet, vide si valide. */
        public String getMotif() {
            return motif;
        }
    }

    private static final String INDICATIF = "225";

    /**
     * Indicatif du pays de l'officine (parametre KEY_INDICATIF_PAYS, 225 par defaut), pose au demarrage et relu
     * regulierement par job.PaysOfficineBootstrap. Retour du 22/11 sur le point 8.3 : le logiciel peut etre installe
     * hors de Cote d'Ivoire.
     */
    private static volatile String indicatifPays = INDICATIF;

    /** Longueurs d'un numero international complet (indicatif compris), norme E.164. */
    private static final int INTERNATIONAL_MIN = 8;
    private static final int INTERNATIONAL_MAX = 15;
    /** Longueurs d'un numero national hors Cote d'Ivoire (sans le zero de tete). */
    private static final int NATIONAL_MIN = 6;
    private static final int NATIONAL_MAX = 12;

    private TelephoneCi() {
    }

    public static String indicatifPays() {
        return indicatifPays;
    }

    /** Pose l'indicatif du pays de l'officine (« 225 », « +33 », « 0032 ») ; une valeur illisible remet 225. */
    public static void indicatifPays(String valeur) {
        indicatifPays = lireIndicatif(valeur);
    }

    static String lireIndicatif(String valeur) {
        String n = valeur == null ? "" : valeur.replaceAll("[\\s+]", "");
        if (n.startsWith("00")) {
            n = n.substring(2);
        }
        return n.matches("[1-9][0-9]{0,2}") ? n : INDICATIF;
    }

    /** L'officine est en Cote d'Ivoire : les numeros sans indicatif suivent la regle ivoirienne. */
    public static boolean paysCoteDIvoire() {
        return INDICATIF.equals(indicatifPays);
    }

    /** Aide affichee avec un refus : ce qu'on attend selon le pays de l'officine. */
    public static String aide() {
        return aide(indicatifPays);
    }

    static String aide(String pays) {
        return (INDICATIF.equals(pays) ? "Un numéro ivoirien compte dix chiffres et commence par 01, 05 ou 07 ; un"
                : "Un") + " numéro étranger s'écrit avec son indicatif, par exemple +33 6 12 34 56 78.";
    }

    /**
     * Controle selon le pays de l'officine. Retour du 22/11 sur le point 8.3 : un client peut avoir un numero etranger
     * (belge, francais...). Un numero precede de « + » ou de « 00 » et d'un autre indicatif que celui de l'officine est
     * un numero etranger : valide s'il compte 8 a 15 chiffres, garde sous la forme « +32470123456 ». Un numero du pays
     * de l'officine suit, en Cote d'Ivoire, la regle d'avant (inchangee) ; ailleurs, 6 a 12 chiffres hors zero de tete.
     */
    public static Resultat controler(String saisie) {
        return controler(saisie, indicatifPays);
    }

    static Resultat controler(String saisie, String pays) {
        if (saisie == null || saisie.trim().isEmpty()) {
            return rejet("Numéro absent");
        }
        String brut = saisie.trim();
        // Separateurs toleres : espaces, points, tirets, parentheses, et un « + » en tete.
        String nettoye = brut.replaceAll("[\\s.\\-()]", "");
        boolean plus = nettoye.startsWith("+");
        if (plus) {
            nettoye = nettoye.substring(1);
        }
        if (!nettoye.matches("\\d+")) {
            return rejet("Caractères non numériques");
        }
        /*
         * « + » ou « 00 » puis un indicatif (jamais 0) : numero ecrit avec son indicatif ; un autre indicatif que celui
         * de l'officine = etranger. « +07 08... » reste un numero du pays, comme avant.
         */
        String chiffres = !plus && nettoye.startsWith("00") ? nettoye.substring(2) : nettoye;
        boolean avecIndicatif = (plus || nettoye.startsWith("00")) && !chiffres.startsWith("0");
        if (avecIndicatif && !chiffres.startsWith(pays)) {
            return etranger(chiffres);
        }
        if (!INDICATIF.equals(pays)) {
            return autrePays(avecIndicatif, chiffres, pays);
        }
        if (nettoye.startsWith("00" + INDICATIF)) {
            nettoye = nettoye.substring(5);
        } else if (nettoye.startsWith(INDICATIF) && nettoye.length() == 13) {
            nettoye = nettoye.substring(3);
        }
        if (nettoye.length() == 8) {
            return rejet("Ancien format à 8 chiffres");
        }
        if (nettoye.length() != 10) {
            return rejet("Nombre de chiffres incorrect (" + nettoye.length() + ")");
        }
        String prefixe = nettoye.substring(0, 2);
        if (prefixe.equals("21") || prefixe.equals("25") || prefixe.equals("27")) {
            return rejet("Numéro fixe (non mobile)");
        }
        if (!prefixe.equals("01") && !prefixe.equals("05") && !prefixe.equals("07")) {
            return rejet("Préfixe non mobile (" + prefixe + ")");
        }
        return new Resultat(true, nettoye, INDICATIF + nettoye, "");
    }

    /**
     * Ancien identifiant WhatsApp a 8 chiffres : un compte ouvert avant le passage a 10 chiffres (2021) ecrit souvent
     * depuis 225 + 8 chiffres (22508473750 pour le 07 08 47 37 50). Rend les 8 chiffres, ou null pour toute autre
     * forme. Repris du CRM UBIPHARM.
     */
    public static String ancienIdentifiant(String numero) {
        String n = numero == null ? "" : numero.replaceAll("[\\s.\\-()+]", "");
        if (n.startsWith("00")) {
            n = n.substring(2);
        }
        return n.matches(INDICATIF + "\\d{8}") ? n.substring(3) : null;
    }

    /**
     * Le numero a 10 chiffres d'un ancien identifiant : celui des numeros connus (valides) dont les 8 derniers chiffres
     * correspondent, s'il est seul ; null s'il n'y en a aucun ou plusieurs (on ne devine pas).
     */
    public static String numeroActuel(String huitChiffres, Iterable<String> numerosConnus) {
        if (huitChiffres == null) {
            return null;
        }
        java.util.Set<String> retenus = new java.util.TreeSet<>();
        for (String s : numerosConnus) {
            Resultat r = controler(s);
            if (r.isValide() && r.getLocal().substring(2).equals(huitChiffres)) {
                retenus.add(r.getLocal());
            }
        }
        return retenus.size() == 1 ? retenus.iterator().next() : null;
    }

    /** Numero local normalise si le controle passe, sinon la saisie telle quelle (le fournisseur tranchera). */
    public static String localOuSaisie(String saisie) {
        Resultat r = controler(saisie);
        return r.isValide() ? r.getLocal() : saisie;
    }

    /**
     * Le numero tel qu'on peut l'ecrire dans un journal : separateurs retires, tout masque sauf les deux derniers
     * chiffres (« ********50 »). Rapport du 26/10, M4 : le numero du destinataire figurait en clair dans le journal du
     * support et dans ses exports.
     */
    public static String masquer(String numero) {
        String n = numero == null ? "" : numero.replaceAll("[\\s.\\-()]", "");
        if (n.length() <= 2) {
            return n.replaceAll(".", "*");
        }
        return n.substring(0, n.length() - 2).replaceAll(".", "*") + n.substring(n.length() - 2);
    }

    /** Numero etranger, sans « + » ni « 00 » : indicatif et numero, 8 a 15 chiffres. Garde : « +32470123456 ». */
    private static Resultat etranger(String chiffres) {
        if (chiffres.length() < INTERNATIONAL_MIN || chiffres.length() > INTERNATIONAL_MAX) {
            return rejet("Numéro étranger : nombre de chiffres incorrect (" + chiffres.length() + ")");
        }
        return new Resultat(true, "+" + chiffres, chiffres, "");
    }

    /** Numero du pays de l'officine, hors Cote d'Ivoire : 6 a 12 chiffres hors zero de tete. */
    private static Resultat autrePays(boolean avecIndicatif, String chiffres, String pays) {
        String national = avecIndicatif ? chiffres.substring(pays.length()) : chiffres;
        String utile = national.startsWith("0") ? national.substring(1) : national;
        if (utile.length() < NATIONAL_MIN || utile.length() > NATIONAL_MAX) {
            return rejet("Nombre de chiffres incorrect (" + national.length() + ")");
        }
        return new Resultat(true, avecIndicatif ? "+" + chiffres : national, pays + utile, "");
    }

    private static Resultat rejet(String motif) {
        return new Resultat(false, "", "", motif);
    }
}
