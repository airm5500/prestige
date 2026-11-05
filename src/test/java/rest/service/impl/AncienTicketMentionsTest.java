package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import util.Constant;

/**
 * Retour du 05/11 : « quand on choisit Ancien modèle, le ticket ne sort plus à la réédition ». Les mentions posées sous
 * un produit depuis le 03/11 (promotion, crédit par tiers-payant de la ligne comptant) ont moins de cinq colonnes une
 * fois découpées : l'ancien ticket ne doit pas s'arrêter dessus.
 */
class AncienTicketMentionsTest {

    @Test
    void lAncienTicketDessineLesMentionsSousLesProduits() {
        ImpressionServiceImpl imp = new ImpressionServiceImpl();
        imp.setTypeTicket(Constant.TICKET_VENTE);
        imp.setDatas(Arrays.asList(" 1; *;ABLEPT 300MG CPR GEL;8.295;8.295", " ; ;PROMOTION DONT 1 OFFERTE(S);;",
                " ; ;CNAM Taux 70 % : 4 200;;", ";;;;------"));
        BufferedImage image = new BufferedImage(300, 400, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        try {
            assertDoesNotThrow(() -> imp.buildContent(g, 12, 85));
        } finally {
            g.dispose();
        }
    }
}
