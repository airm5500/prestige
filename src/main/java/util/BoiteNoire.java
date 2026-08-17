package util;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;

/**
 * Boite noire du watchdog serveur.
 *
 * Le fichier temoin (heartbeat) ne porte plus seulement l'heure du dernier battement : il porte une photographie de
 * l'etat du serveur a cet instant. C'est tout l'interet apres un crash, ou ce fichier est le SEUL etat connu d'avant
 * l'arret. Le server.log raconte ce qui s'est passe ; la boite noire dit dans quel etat le serveur se trouvait juste
 * avant (memoire, disque, requetes en vol).
 *
 * Format texte "cle=valeur", une par ligne, volontairement trivial : ce fichier doit rester lisible a l'oeil nu sur le
 * serveur, sans outil.
 *
 * La lecture accepte aussi l'ANCIEN format (une simple date sur une ligne). Sans cela, la premiere montee de version
 * lirait mal le fichier laisse par la version precedente et annoncerait une indisponibilite fantaisiste.
 *
 * @author koben
 */
public final class BoiteNoire {

    public static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private static final String CLE_HORODATAGE = "horodatage";
    private static final String CLE_MEM_UTILISEE = "memoireUtiliseeMo";
    private static final String CLE_MEM_MAX = "memoireMaxMo";
    private static final String CLE_DISQUE_LIBRE = "disqueLibreMo";
    private static final String CLE_REQUETES = "requetesEnCours";
    private static final String CLE_PLUS_LONGUE = "requeteLaPlusLongue";
    private static final String CLE_PLUS_LONGUE_MS = "requeteLaPlusLongueMs";

    /** Valeur portee par les mesures qui n'ont pas pu etre relevees. */
    public static final long INCONNU = -1L;

    private BoiteNoire() {
    }

    /**
     * Photographie de l'etat du serveur a un instant donne. Champs publics et finaux, comme
     * {@code SlowRequestFilter.RequeteEnCours} : c'est une donnee inerte, pas un objet metier.
     */
    public static final class Instantane {

        public final LocalDateTime horodatage;
        public final long memoireUtiliseeMo;
        public final long memoireMaxMo;
        public final long disqueLibreMo;
        public final long requetesEnCours;
        public final String requeteLaPlusLongue;
        public final long requeteLaPlusLongueMs;

        public Instantane(LocalDateTime horodatage, long memoireUtiliseeMo, long memoireMaxMo, long disqueLibreMo,
                long requetesEnCours, String requeteLaPlusLongue, long requeteLaPlusLongueMs) {
            this.horodatage = horodatage;
            this.memoireUtiliseeMo = memoireUtiliseeMo;
            this.memoireMaxMo = memoireMaxMo;
            this.disqueLibreMo = disqueLibreMo;
            this.requetesEnCours = requetesEnCours;
            this.requeteLaPlusLongue = requeteLaPlusLongue;
            this.requeteLaPlusLongueMs = requeteLaPlusLongueMs;
        }

        /** Instantane reduit a une date : c'est ce que rend la lecture d'un fichier a l'ancien format. */
        public static Instantane horodateSeul(LocalDateTime horodatage) {
            return new Instantane(horodatage, INCONNU, INCONNU, INCONNU, INCONNU, null, INCONNU);
        }

        /** Taux d'occupation de la memoire JVM en pourcent, ou {@link #INCONNU} si la mesure manque. */
        public long pourcentageMemoire() {
            if (memoireUtiliseeMo < 0 || memoireMaxMo <= 0) {
                return INCONNU;
            }
            return Math.round(memoireUtiliseeMo * 100.0d / memoireMaxMo);
        }

        /** Vrai si l'instantane ne porte aucune mesure : ancien format, ou releve integralement en echec. */
        public boolean sansMesure() {
            return memoireUtiliseeMo < 0 && disqueLibreMo < 0 && requetesEnCours < 0;
        }

        /**
         * Rendu lisible par un humain, destine au detail de l'incident et a la consultation manuelle.
         */
        public String enTexte() {
            StringBuilder sb = new StringBuilder();
            sb.append("Releve du ").append(horodatage == null ? "?" : horodatage.format(FMT)).append("\n");
            if (sansMesure()) {
                sb.append("(aucune mesure : fichier temoin ecrit par une version anterieure)\n");
                return sb.toString();
            }
            sb.append("Memoire JVM     : ").append(mesure(memoireUtiliseeMo, " Mo")).append(" / ")
                    .append(mesure(memoireMaxMo, " Mo"));
            long pct = pourcentageMemoire();
            if (pct != INCONNU) {
                sb.append(" (").append(pct).append("%)");
            }
            sb.append("\n");
            sb.append("Disque libre    : ").append(mesure(disqueLibreMo, " Mo")).append("\n");
            sb.append("Requetes en vol : ").append(mesure(requetesEnCours, "")).append("\n");
            if (StringUtils.isNotBlank(requeteLaPlusLongue)) {
                sb.append("Plus ancienne   : ").append(requeteLaPlusLongue);
                if (requeteLaPlusLongueMs != INCONNU) {
                    sb.append(" (depuis ").append(requeteLaPlusLongueMs).append(" ms)");
                }
                sb.append("\n");
            }
            return sb.toString();
        }

        private String mesure(long valeur, String unite) {
            return valeur < 0 ? "?" : valeur + unite;
        }
    }

    /**
     * Serialise un instantane au format "cle=valeur". Les mesures inconnues ne sont pas ecrites : mieux vaut une cle
     * absente qu'une cle presente portant une valeur fausse.
     */
    public static String formater(Instantane instantane) {
        Map<String, String> lignes = new LinkedHashMap<>();
        LocalDateTime horodatage = instantane.horodatage != null ? instantane.horodatage : LocalDateTime.now();
        lignes.put(CLE_HORODATAGE, horodatage.format(FMT));
        ajouter(lignes, CLE_MEM_UTILISEE, instantane.memoireUtiliseeMo);
        ajouter(lignes, CLE_MEM_MAX, instantane.memoireMaxMo);
        ajouter(lignes, CLE_DISQUE_LIBRE, instantane.disqueLibreMo);
        ajouter(lignes, CLE_REQUETES, instantane.requetesEnCours);
        if (StringUtils.isNotBlank(instantane.requeteLaPlusLongue)) {
            // Une valeur multiligne casserait le format : on la ramene sur une seule ligne.
            lignes.put(CLE_PLUS_LONGUE, instantane.requeteLaPlusLongue.replaceAll("\\s+", " ").trim());
            ajouter(lignes, CLE_PLUS_LONGUE_MS, instantane.requeteLaPlusLongueMs);
        }
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> ligne : lignes.entrySet()) {
            sb.append(ligne.getKey()).append('=').append(ligne.getValue()).append('\n');
        }
        return sb.toString();
    }

    /**
     * Relit un fichier temoin. Accepte le format "cle=valeur" comme l'ancien format (une simple date), et ne leve
     * jamais : un temoin illisible rend {@code repli}, car l'appelant est en train de diagnostiquer un crash et ne doit
     * pas echouer sur la forme du fichier.
     */
    public static Instantane lire(String contenu, LocalDateTime repli) {
        String texte = StringUtils.trimToEmpty(contenu);
        if (texte.isEmpty()) {
            return Instantane.horodateSeul(repli);
        }
        if (!texte.contains("=")) {
            // Ancien format : le fichier ne contenait que la date du dernier battement.
            return Instantane.horodateSeul(parseDate(texte, repli));
        }
        Map<String, String> valeurs = new LinkedHashMap<>();
        for (String ligne : texte.split("\\R")) {
            int separateur = ligne.indexOf('=');
            if (separateur > 0) {
                valeurs.put(ligne.substring(0, separateur).trim(), ligne.substring(separateur + 1).trim());
            }
        }
        return new Instantane(parseDate(valeurs.get(CLE_HORODATAGE), repli), parseLong(valeurs.get(CLE_MEM_UTILISEE)),
                parseLong(valeurs.get(CLE_MEM_MAX)), parseLong(valeurs.get(CLE_DISQUE_LIBRE)),
                parseLong(valeurs.get(CLE_REQUETES)), StringUtils.trimToNull(valeurs.get(CLE_PLUS_LONGUE)),
                parseLong(valeurs.get(CLE_PLUS_LONGUE_MS)));
    }

    private static void ajouter(Map<String, String> lignes, String cle, long valeur) {
        if (valeur >= 0) {
            lignes.put(cle, String.valueOf(valeur));
        }
    }

    private static LocalDateTime parseDate(String valeur, LocalDateTime repli) {
        try {
            return LocalDateTime.parse(StringUtils.trimToEmpty(valeur), FMT);
        } catch (Exception e) {
            return repli;
        }
    }

    private static long parseLong(String valeur) {
        try {
            return Long.parseLong(StringUtils.trimToEmpty(valeur));
        } catch (Exception e) {
            return INCONNU;
        }
    }
}
