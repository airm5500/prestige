package rest.service.impl.sauvegarde;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.io.BufferedReader;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.Arrays;
import java.util.HashSet;
import org.junit.jupiter.api.Test;

class ExtraitSauvegardeTest {

    private static final String SAUVEGARDE = String.join("\n", "-- MariaDB dump 10.19",
            "/*!40101 SET NAMES utf8mb4 */;",
            "/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;", "--",
            "-- Table structure for table `t_client`", "--", "CREATE TABLE `t_client` (`id` int);",
            "-- Dumping data for table `t_client`", "INSERT INTO `t_client` VALUES (1);", "--",
            "-- Table structure for table `t_famille`", "--", "DROP TABLE IF EXISTS `t_famille`;",
            "CREATE TABLE `t_famille` (`id` int);", "--", "-- Dumping data for table `t_famille`", "--",
            "INSERT INTO `t_famille` VALUES (1,'é'),(2,'-- Table structure for table `t_client`');",
            "/*!50003 SET @saved_cs_client = @@character_set_client */ ;", "DELIMITER ;;",
            "/*!50003 CREATE*/ /*!50003 TRIGGER `maj` AFTER UPDATE ON `t_famille` FOR EACH ROW BEGIN END */;;",
            "DELIMITER ;", "--", "-- Temporary table structure for view `v_stock`", "--",
            "CREATE TABLE `v_stock` (`x` int);", "-- Dumping routines for database 'labo'", "DELIMITER ;;",
            "CREATE PROCEDURE `p`() BEGIN END ;;", "DELIMITER ;", "-- Dump completed on 2026-11-02");

    @Test
    void gardeLEnTeteEtLesTablesDemandeesSansDeclencheur() throws Exception {
        StringWriter out = new StringWriter();
        int n = ExtraitSauvegarde.filtrer(new BufferedReader(new StringReader(SAUVEGARDE)), out,
                new HashSet<>(Arrays.asList("t_famille")));
        String s = out.toString();
        assertEquals(1, n);
        assertTrue(s.startsWith("-- MariaDB dump 10.19\n/*!40101 SET NAMES utf8mb4 */;\n"));
        assertTrue(s.contains("FOREIGN_KEY_CHECKS=0"));
        assertTrue(s.contains("CREATE TABLE `t_famille`"));
        assertTrue(s.contains("INSERT INTO `t_famille` VALUES (1,'é'),(2,'-- Table structure for table `t_client`');"));
        assertFalse(s.contains("t_client` (`id`"));
        assertFalse(s.contains("INSERT INTO `t_client`"));
        assertFalse(s.contains("TRIGGER"));
        assertFalse(s.contains("DELIMITER"));
        assertFalse(s.contains("v_stock"));
        assertFalse(s.contains("PROCEDURE"));
    }
}
