package rest.report;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import toolkits.utils.jdom;

/**
 * Inventaire des etats (modeles jasper) : lesquels se resolvent sur CETTE machine, lesquels manquent.
 *
 * <p>
 * Un etat reference par le code mais absent du serveur ne se signale nulle part : l'utilisateur clique, le service
 * ecrit dans le journal, et le navigateur affiche un 404 sans explication. Trois l'ont ete - « ca_zone_geo », «
 * rp_facture_subro » et « rp_recap_caisse_recette » - et rien ne permettait de le savoir avant qu'un utilisateur ne
 * tombe dessus. Cette sonde repond a la question d'un coup, sur la machine ou l'application tourne, la ou vivent
 * reellement les modeles.
 * </p>
 *
 * <p>
 * Elle ne compile ni ne remplit aucun etat : elle regarde seulement si le fichier existe, la ou le service ira le
 * chercher - le repertoire d'etats de l'officine d'abord, le modele embarque dans le war ensuite.
 * </p>
 */
public final class InventaireEtats {

    private static final Logger LOG = Logger.getLogger(InventaireEtats.class.getName());

    /** Ou l'etat a ete trouve, ou pourquoi il ne l'a pas ete. */
    public enum Origine {
        /** .jasper deja compile dans le repertoire d'etats. */
        COMPILE,
        /** .jrxml dans le repertoire d'etats. */
        REPERTOIRE,
        /** .jrxml embarque dans le war. */
        EMBARQUE,
        /** Introuvable : toute edition qui le demande finira en 404. */
        ABSENT,
        /** Prefixe complete a l'execution : la sonde ne peut pas conclure. */
        PREFIXE
    }

    public static final class Etat {
        private final String nom;
        private final Origine origine;

        Etat(String nom, Origine origine) {
            this.nom = nom;
            this.origine = origine;
        }

        public String getNom() {
            return nom;
        }

        public String getOrigine() {
            return origine.name();
        }

        public boolean isDisponible() {
            return origine != Origine.ABSENT;
        }
    }

    private InventaireEtats() {
    }

    /** Noms references par le code, lus depuis la liste embarquee. Un nom suivi de « + » est un prefixe. */
    public static List<String> nomsReferences() {
        List<String> noms = new ArrayList<>();
        try (InputStream in = InventaireEtats.class.getResourceAsStream("/reports/etats-references.txt")) {
            if (in == null) {
                LOG.warning("Liste des etats references introuvable dans le war");
                return noms;
            }
            try (BufferedReader lecteur = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                String ligne;
                while ((ligne = lecteur.readLine()) != null) {
                    String nom = ligne.trim();
                    if (!nom.isEmpty() && !nom.startsWith("#")) {
                        noms.add(nom);
                    }
                }
            }
        } catch (IOException e) {
            LOG.log(Level.WARNING, "lecture de la liste des etats references", e);
        }
        return noms;
    }

    /** Etat d'un nom : ou il se trouve, ou qu'il manque. */
    public static Etat resoudre(String nomBrut) {
        String nom = nomBrut.trim();
        if (nom.endsWith("+")) {
            return new Etat(nom.substring(0, nom.length() - 1).trim(), Origine.PREFIXE);
        }
        String repertoire = jdom.scr_report_file;
        if (repertoire != null) {
            if (new java.io.File(repertoire + nom + ".jasper").isFile()) {
                return new Etat(nom, Origine.COMPILE);
            }
            if (new java.io.File(repertoire + nom + ".jrxml").isFile()) {
                return new Etat(nom, Origine.REPERTOIRE);
            }
        }
        try (InputStream embarque = InventaireEtats.class.getResourceAsStream("/reports/" + nom + ".jrxml")) {
            if (embarque != null) {
                return new Etat(nom, Origine.EMBARQUE);
            }
        } catch (IOException e) {
            LOG.log(Level.FINE, "lecture du modele embarque " + nom, e);
        }
        return new Etat(nom, Origine.ABSENT);
    }

    /** Inventaire complet, dans l'ordre de la liste. */
    public static List<Etat> inventaire() {
        List<Etat> etats = new ArrayList<>();
        for (String nom : nomsReferences()) {
            etats.add(resoudre(nom));
        }
        return etats;
    }
}
