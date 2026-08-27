package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Detection du support de JSON_TABLE d'apres la banniere de version du serveur de base de donnees.
 *
 * <p>
 * Avant cette detection, chaque affichage d'une valorisation historique lancait une requete JSON_TABLE, recoltait une
 * erreur de syntaxe 1064 sur MariaDB 10.5 et journalisait une pile complete, avant de basculer sur l'extraction Java.
 * La version est desormais lue une fois puis memorisee.
 * </p>
 */
public class JsonTableDisponibiliteTest {

    /** Version de production actuelle : JSON_TABLE n'existe pas, la requete ne doit jamais etre tentee. */
    @Test
    public void mariaDb105NeSupportePasJsonTable() {
        assertFalse(ProduitServiceImpl.supporteJsonTable("10.5.8-MariaDB-1:10.5.8+maria~focal"));
        assertFalse(ProduitServiceImpl.supporteJsonTable("10.5.8-MariaDB"));
    }

    /** MariaDB 10.6 introduit JSON_TABLE : une montee de version doit reactiver la voie rapide sans code a changer. */
    @Test
    public void mariaDb106EtPlusSupporteJsonTable() {
        assertTrue(ProduitServiceImpl.supporteJsonTable("10.6.2-MariaDB"));
        assertTrue(ProduitServiceImpl.supporteJsonTable("10.11.14-MariaDB-0ubuntu0.24.04.1"));
        assertTrue(ProduitServiceImpl.supporteJsonTable("11.2.1-MariaDB"));
    }

    /** Les versions anterieures de MariaDB restent exclues. */
    @Test
    public void mariaDbAnterieureNeSupportePasJsonTable() {
        assertFalse(ProduitServiceImpl.supporteJsonTable("10.4.22-MariaDB"));
        assertFalse(ProduitServiceImpl.supporteJsonTable("5.5.68-MariaDB"));
    }

    /** MySQL a son propre seuil : JSON_TABLE apparait en 8.0. */
    @Test
    public void mySqlHuitSupporteJsonTable() {
        assertTrue(ProduitServiceImpl.supporteJsonTable("8.0.33"));
        assertFalse(ProduitServiceImpl.supporteJsonTable("5.7.42-log"));
    }

    /** Banniere illisible ou absente : on suppose l'absence, le repli Java restant toujours fonctionnel. */
    @Test
    public void versionIllisibleSupposeAbsence() {
        assertFalse(ProduitServiceImpl.supporteJsonTable(null));
        assertFalse(ProduitServiceImpl.supporteJsonTable(""));
        assertFalse(ProduitServiceImpl.supporteJsonTable("inconnue"));
    }
}
