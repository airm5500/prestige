package com.prestige.veille.regles;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Regles pures de la veille (sans base ni reseau : testees a part).
 * <ul>
 * <li>incident : ouvert apres N echecs de suite d'une cible, ferme au premier succes ;</li>
 * <li>seuils : memoire du serveur Java, espace disque, memoire de la machine ;</li>
 * <li>redemarrage automatique du service Payara : seulement s'il est active, si Prestige ne repond plus depuis le delai
 * choisi ALORS QUE MariaDB repond (sinon redemarrer Payara ne servirait a rien), et pas plus de N fois par heure.</li>
 * </ul>
 */
public final class Regles {

    private Regles() {
    }

    public enum Transition {
        AUCUNE, OUVRIR, FERMER
    }

    /** Ouverture / fermeture d'un incident d'apres le resultat de la sonde. */
    public static Transition transition(boolean ok, int echecsConsecutifs, int seuil, boolean incidentOuvert) {
        if (ok) {
            return incidentOuvert ? Transition.FERMER : Transition.AUCUNE;
        }
        return !incidentOuvert && echecsConsecutifs >= Math.max(1, seuil) ? Transition.OUVRIR : Transition.AUCUNE;
    }

    /** Message d'un seuil depasse, ou null. */
    public static String seuil(Double memoirePct, double memoireMax, Long disqueLibreMo, long disqueMin, Long ramLibreMo,
            Long ramTotaleMo) {
        if (memoirePct != null && memoirePct >= memoireMax) {
            return "Mémoire du serveur Java à " + Math.round(memoirePct) + " % (seuil " + Math.round(memoireMax) + " %)";
        }
        if (disqueLibreMo != null && disqueLibreMo >= 0 && disqueLibreMo < disqueMin) {
            return "Espace disque libre : " + disqueLibreMo + " Mo (seuil " + disqueMin + " Mo)";
        }
        if (ramLibreMo != null && ramTotaleMo != null && ramTotaleMo > 0 && ramLibreMo * 100 / ramTotaleMo < 5) {
            return "Mémoire de la machine presque pleine : " + ramLibreMo + " Mo libres";
        }
        return null;
    }

    public enum Decision {
        RIEN, DESACTIVE, ATTENDRE, BASE_ARRETEE, LIMITE_ATTEINTE, REDEMARRER
    }

    /**
     * Redemarrage automatique du service Payara.
     *
     * @param prestigeEnPanneDepuis
     *            debut de la panne de Prestige (null s'il repond)
     * @param redemarrages
     *            dates des redemarrages automatiques deja faits
     */
    public static Decision redemarrage(boolean actif, LocalDateTime prestigeEnPanneDepuis, boolean mariadbRepond,
            int apresMinutes, List<LocalDateTime> redemarrages, int maxParHeure, LocalDateTime maintenant) {
        if (prestigeEnPanneDepuis == null) {
            return Decision.RIEN;
        }
        if (!actif) {
            return Decision.DESACTIVE;
        }
        if (Duration.between(prestigeEnPanneDepuis, maintenant).toMinutes() < Math.max(1, apresMinutes)) {
            return Decision.ATTENDRE;
        }
        if (!mariadbRepond) {
            return Decision.BASE_ARRETEE;
        }
        long recents = redemarrages.stream().filter(t -> t.isAfter(maintenant.minusHours(1))).count();
        return recents >= Math.max(1, maxParHeure) ? Decision.LIMITE_ATTEINTE : Decision.REDEMARRER;
    }

    /** Etat d'un service Windows dans la sortie de « sc query » (RUNNING, STOPPED...), ou null. */
    public static String etatService(String sortieSc) {
        if (sortieSc == null) {
            return null;
        }
        for (String l : sortieSc.split("\\r?\\n")) {
            String t = l.trim();
            /* « STATE : 4 RUNNING » (anglais) ou « ETAT : 4 RUNNING » (francais) : le code et le mot ne sont pas traduits */
            if (t.matches("(?i)(STATE|ETAT|ÉTAT)\\s*:\\s*\\d+\\s+\\S+.*")) {
                return t.replaceAll("(?i)^(STATE|ETAT|ÉTAT)\\s*:\\s*\\d+\\s+(\\S+).*$", "$2").toUpperCase();
            }
        }
        return null;
    }
}
