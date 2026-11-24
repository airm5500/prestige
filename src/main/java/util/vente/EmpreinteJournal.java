package util.vente;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Journal de preuve des ventes en saisie (cahier des charges du 24/11, point 2) : chaque ligne porte l'empreinte
 * SHA-256 de son contenu et de l'empreinte de la ligne précédente. Une ligne retouchée en base, ou retirée au milieu du
 * journal, casse la chaîne à cet endroit. Fonctions pures, sans base.
 */
public final class EmpreinteJournal {

    /** Empreinte « précédente » de la toute première ligne. */
    public static final String ORIGINE = "0000000000000000000000000000000000000000000000000000000000000000";

    /*
     * Essai du 24/11 : l'heure est scellée à la SECONDE. Écrite par le pilote de la base, une heure à la milliseconde
     * revenait sans ses millisecondes (.000) : toutes les empreintes relues différaient, la chaîne paraissait rompue.
     */
    private static final DateTimeFormatter HORODATAGE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private EmpreinteJournal() {
    }

    /** Une ligne du journal, telle qu'écrite et relue en base. */
    public static final class Ligne {
        public final long id;
        public final LocalDateTime creeLe;
        public final String venteId;
        public final String numero;
        public final boolean depot;
        public final String geste;
        public final String etatAvant;
        public final String etatApres;
        public final boolean admis;
        public final String motif;
        public final String cause;
        public final String utilisateurId;
        public final String poste;
        public final Integer nbLignes;
        public final Integer montant;
        public final String empreintePrecedente;
        public final String empreinte;

        public Ligne(long id, LocalDateTime creeLe, String venteId, String numero, boolean depot, String geste,
                String etatAvant, String etatApres, boolean admis, String motif, String cause, String utilisateurId,
                String poste, Integer nbLignes, Integer montant, String empreintePrecedente, String empreinte) {
            this.id = id;
            this.creeLe = creeLe == null ? null : creeLe.withNano(0);
            this.venteId = venteId;
            this.numero = numero;
            this.depot = depot;
            this.geste = geste;
            this.etatAvant = etatAvant;
            this.etatApres = etatApres;
            this.admis = admis;
            this.motif = motif;
            this.cause = cause;
            this.utilisateurId = utilisateurId;
            this.poste = poste;
            this.nbLignes = nbLignes;
            this.montant = montant;
            this.empreintePrecedente = empreintePrecedente;
            this.empreinte = empreinte;
        }

        /** Même ligne, chaînée derrière {@code precedente} et scellée. */
        public Ligne scellee(String precedente) {
            Ligne l = new Ligne(id, creeLe, venteId, numero, depot, geste, etatAvant, etatApres, admis, motif, cause,
                    utilisateurId, poste, nbLignes, montant, precedente, null);
            return new Ligne(id, creeLe, venteId, numero, depot, geste, etatAvant, etatApres, admis, motif, cause,
                    utilisateurId, poste, nbLignes, montant, precedente, calculer(l));
        }
    }

    private static String champ(Object o) {
        if (o == null) {
            return "∅";
        }
        /* le séparateur ne peut pas être forgé : il est doublé dans les valeurs */
        return String.valueOf(o).replace("|", "||");
    }

    /** Empreinte d'une ligne : tout son contenu (sauf l'identifiant technique) et l'empreinte précédente. */
    public static String calculer(Ligne l) {
        String s = String.join("|", champ(l.creeLe == null ? null : l.creeLe.format(HORODATAGE)), champ(l.venteId),
                champ(l.numero), l.depot ? "1" : "0", champ(l.geste), champ(l.etatAvant), champ(l.etatApres),
                l.admis ? "1" : "0", champ(l.motif), champ(l.cause), champ(l.utilisateurId), champ(l.poste),
                champ(l.nbLignes), champ(l.montant), champ(l.empreintePrecedente));
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder b = new StringBuilder(64);
            for (byte x : h) {
                b.append(String.format("%02x", x));
            }
            return b.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /**
     * Contrôle d'une suite de lignes lue dans l'ordre des identifiants. Rend l'identifiant de la première ligne
     * retouchée ou dont la précédente a disparu, ou -1 si la chaîne est intacte.
     */
    public static long premiereRupture(List<Ligne> lignes) {
        String attendue = ORIGINE;
        for (Ligne l : lignes) {
            if (!attendue.equals(l.empreintePrecedente) || !calculer(l).equals(l.empreinte)) {
                return l.id;
            }
            attendue = l.empreinte;
        }
        return -1;
    }
}
