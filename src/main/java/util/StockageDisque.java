/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package util;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Emplacement de stockage des donnees de travail ecrites sur disque (logs du Centre de Support, rapports, logs de
 * calcul semois / seuils de reapprovisionnement, fichier de configuration).
 *
 * Probleme resolu : par defaut ces fichiers allaient dans le profil Windows de l'utilisateur ({@code user.home}, ex.
 * {@code C:\Users\Dr Kouassi\Documents}). Quand Payara tourne en service Windows, le compte de service n'a pas le droit
 * d'ecrire dans ce profil : {@code AccessDeniedException} a chaque ecriture (et les chemins contenant un espace posent
 * en plus des problemes de troncature dans certains outils).
 *
 * Regle retenue : on ecrit sur un disque de donnees, dans l'ordre de preference <b>D: puis F: puis E:</b>. Un disque
 * n'est retenu que s'il existe ET qu'on peut reellement y creer un dossier (test d'ecriture effectif, pas seulement
 * presence du lecteur). Si aucun ne convient (ou hors Windows), on retombe sur l'emplacement historique
 * ({@code user.home}), donc jamais de regression : au pire le comportement reste celui d'avant.
 *
 * @author koben
 */
public final class StockageDisque {

    private static final Logger LOG = Logger.getLogger(StockageDisque.class.getName());

    /** Ordre de preference des disques de donnees, conformement a la regle d'exploitation. */
    private static final String[] DISQUES_PREFERES = { "D:", "F:", "E:" };
    /** Dossier parent unique regroupant toutes les donnees Prestige sur le disque retenu. */
    private static final String DOSSIER_RACINE = "prestige";

    /** Racine resolue une seule fois par demarrage (la resolution fait des acces disque). */
    private static volatile Path racine;

    private StockageDisque() {
    }

    /**
     * Racine de stockage : {@code D:\prestige} (ou F:, E:), sinon {@code <user.home>\prestige} en repli.
     */
    public static Path racine() {
        Path resolue = racine;
        if (resolue == null) {
            synchronized (StockageDisque.class) {
                resolue = racine;
                if (resolue == null) {
                    resolue = resoudreRacine();
                    racine = resolue;
                    LOG.log(Level.INFO, "Stockage Prestige : {0}", resolue);
                }
            }
        }
        return resolue;
    }

    /**
     * Sous-dossier de la racine, cree si besoin. Ex. {@code sousDossier("support")} -> {@code D:\prestige\support}.
     */
    public static Path sousDossier(String nom) {
        Path dossier = racine().resolve(nom);
        try {
            Files.createDirectories(dossier);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Creation du dossier impossible : " + dossier, e);
        }
        return dossier;
    }

    private static Path resoudreRacine() {
        String os = System.getProperty("os.name");
        if (os != null && os.toLowerCase().contains("windows")) {
            for (String disque : DISQUES_PREFERES) {
                Path candidat = Paths.get(disque + File.separator + DOSSIER_RACINE);
                if (estUtilisable(candidat)) {
                    return candidat;
                }
            }
        }
        // Repli : emplacement historique (profil utilisateur), comportement d'avant.
        return Paths.get(System.getProperty("user.home"), DOSSIER_RACINE);
    }

    /**
     * Vrai si le disque existe et si on peut reellement creer/ecrire dans le dossier cible. On teste l'ecriture au lieu
     * de se fier a la seule presence du lecteur : un lecteur reseau deconnecte, un CD-ROM ou un disque protege en
     * ecriture serait sinon retenu a tort.
     */
    private static boolean estUtilisable(Path dossier) {
        try {
            Path racineDisque = dossier.getRoot();
            if (racineDisque == null || !Files.exists(racineDisque)) {
                return false;
            }
            Files.createDirectories(dossier);
            Path test = dossier.resolve(".prestige-write-test");
            Files.deleteIfExists(test);
            Files.createFile(test);
            Files.deleteIfExists(test);
            return true;
        } catch (Exception e) {
            LOG.log(Level.FINE, "Disque non utilisable pour le stockage : " + dossier, e);
            return false;
        }
    }
}
