package rest.service.impl.campagne;

import java.time.LocalDate;
import java.time.MonthDay;
import java.time.Period;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;

/**
 * CAMPAGNES SMS / WHATSAPP (besoins du 11/10, lot 4) : regles pures, sans base (testees a part).
 * <ul>
 * <li>categories et canaux ;</li>
 * <li>date d'une fete pour une annee : fixe (jour/mois), liee a Paques (decalage en jours) ou saisie chaque annee
 * (fetes du calendrier musulman, annoncees) ;</li>
 * <li>anniversaire du jour (un 29 fevrier se fete le 28 les annees non bissextiles), age ;</li>
 * <li>joignabilite d'un client : consentement du canal (un refus bloque toujours ; « accord explicite seulement » exige
 * un accord) et numero valide.</li>
 * </ul>
 */
public final class Campagnes {

    public static final int LONGUEUR_MAX = 640;

    public enum Categorie {
        ANNIVERSAIRE("Anniversaires"), FETE("Fêtes"), INFO_CLIENTS("Infos clients"), INFO_PHARMACIE("Infos pharmacie"),
        PERSONNALISE("Personnalisé");

        public final String libelle;

        Categorie(String libelle) {
            this.libelle = libelle;
        }

        public static Categorie de(String v) {
            for (Categorie c : values()) {
                if (c.name().equalsIgnoreCase(StringUtils.trimToEmpty(v))) {
                    return c;
                }
            }
            return null;
        }
    }

    private Campagnes() {
    }

    /** Canal reconnu : SMS, WHATSAPP ou SMS_WHATSAPP (WhatsApp, repli SMS) ; SMS par defaut. */
    public static String canal(String v) {
        String c = StringUtils.trimToEmpty(v).toUpperCase(java.util.Locale.ROOT);
        return "WHATSAPP".equals(c) || "SMS_WHATSAPP".equals(c) ? c : "SMS";
    }

    public static String libelleCanal(String canal) {
        switch (canal(canal)) {
        case "WHATSAPP":
            return "WhatsApp";
        case "SMS_WHATSAPP":
            return "WhatsApp, repli SMS";
        default:
            return "SMS";
        }
    }

    /** Dimanche de Paques (calendrier gregorien, algorithme de Meeus / Jones / Butcher). */
    public static LocalDate paques(int annee) {
        int a = annee % 19, b = annee / 100, c = annee % 100, d = b / 4, e = b % 4, f = (b + 8) / 25;
        int g = (b - f + 1) / 3, h = (19 * a + b - d - g + 15) % 30, i = c / 4, k = c % 4;
        int l = (32 + 2 * e + 2 * i - h - k) % 7, m = (a + 11 * h + 22 * l) / 451;
        int mois = (h + l - 7 * m + 114) / 31, jour = ((h + l - 7 * m + 114) % 31) + 1;
        return LocalDate.of(annee, mois, jour);
    }

    /**
     * Date d'une fete pour une annee ; null si elle n'est pas connue (fete a date saisie, pas encore saisie).
     *
     * @param saisies
     *            dates saisies, par annee
     */
    public static LocalDate dateFete(String regle, Integer mois, Integer jour, int decalage, int annee,
            Map<Integer, LocalDate> saisies) {
        switch (StringUtils.defaultString(regle)) {
        case "FIXE":
            if (mois == null || jour == null) {
                return null;
            }
            MonthDay md = MonthDay.of(mois, Math.min(jour, java.time.Month.of(mois).maxLength()));
            return md.isValidYear(annee) ? md.atYear(annee) : LocalDate.of(annee, mois, 28);
        case "PAQUES":
            return paques(annee).plusDays(decalage);
        default:
            return saisies == null ? null : saisies.get(annee);
        }
    }

    /** Vrai si le client fete son anniversaire ce jour-la (29 fevrier fete le 28 les annees non bissextiles). */
    public static boolean anniversaire(LocalDate naissance, LocalDate jour) {
        if (naissance == null || jour == null || naissance.isAfter(jour)) {
            return false;
        }
        if (naissance.getMonthValue() == 2 && naissance.getDayOfMonth() == 29 && !jour.isLeapYear()) {
            return jour.getMonthValue() == 2 && jour.getDayOfMonth() == 28;
        }
        return naissance.getMonthValue() == jour.getMonthValue() && naissance.getDayOfMonth() == jour.getDayOfMonth();
    }

    public static Integer age(LocalDate naissance, LocalDate jour) {
        if (naissance == null || jour == null || naissance.isAfter(jour)) {
            return null;
        }
        return Period.between(naissance, jour).getYears();
    }

    /**
     * Motif pour lequel le client n'est pas joignable sur ce canal ; null s'il l'est. Un refus explicite bloque
     * toujours ; avec « accord explicite seulement », il faut un accord (une absence de reponse ne suffit pas). Pour
     * WhatsApp avec repli SMS, un des deux canaux suffit.
     */
    public static String motifExclusion(String canal, Boolean consentSms, Boolean consentWhatsApp,
            boolean accordExplicite, boolean numeroValide) {
        String c = canal(canal);
        boolean sms = !"WHATSAPP".equals(c), whatsapp = !"SMS".equals(c);
        boolean okSms = sms && (accordExplicite ? Boolean.TRUE.equals(consentSms) : !Boolean.FALSE.equals(consentSms));
        boolean okWa = whatsapp
                && (accordExplicite ? Boolean.TRUE.equals(consentWhatsApp) : !Boolean.FALSE.equals(consentWhatsApp));
        if (!okSms && !okWa) {
            boolean toutRefuse = (!sms || Boolean.FALSE.equals(consentSms))
                    && (!whatsapp || Boolean.FALSE.equals(consentWhatsApp));
            if (toutRefuse) {
                return "SMS".equals(c) ? "A refusé les SMS"
                        : "WHATSAPP".equals(c) ? "A refusé WhatsApp" : "A refusé WhatsApp et les SMS";
            }
            return "Pas d'accord explicite";
        }
        if (!numeroValide) {
            return "Numéro absent ou invalide";
        }
        return null;
    }

    /** Controle d'un texte de message ; null s'il est recevable. */
    public static String controlerTexte(String texte) {
        if (StringUtils.isBlank(texte)) {
            return "Le message est vide.";
        }
        if (texte.trim().length() > LONGUEUR_MAX) {
            return "Message trop long (" + texte.trim().length() + " caractères, " + LONGUEUR_MAX + " au plus).";
        }
        return null;
    }
}
