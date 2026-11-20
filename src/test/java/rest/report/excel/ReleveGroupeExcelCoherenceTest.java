package rest.report.excel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.service.ModeRegroupement;
import rest.service.dto.ReleveGroupeDTO;
import rest.service.dto.ReleveGroupeFactureDTO;
import rest.service.dto.ReleveGroupeLigneDTO;

/**
 * Plan du 19/11, point 14 : releve des factures de groupe en Excel, sur 5 000 releves tires au hasard (graine fixe ; 0
 * a 6 groupes, 0 a 30 factures, plusieurs organismes par facture de groupe, factures soldees, en partie reglees ou non
 * reglees), dans les deux modes :
 * <ul>
 * <li>chaque facture du releve est une ligne « Facture », une seule fois, avec ses montants ;</li>
 * <li>sous-total d'un bloc = somme de ses factures ; un sous-total a chaque changement de facture de groupe (ou
 * d'organisme) ; somme des sous-totaux d'un groupe = total du groupe ;</li>
 * <li>total general = total du releve, nombre de factures exact ; reste = facture − regle a chaque niveau.</li>
 * </ul>
 */
class ReleveGroupeExcelCoherenceTest {

    private static final String[] TIERS = { "MUGEF-CI", "INAM", "ASCOMA", "SAHAM", "ALLIANZ", "GNA" };

    private static BigDecimal bd(long v) {
        return BigDecimal.valueOf(v);
    }

    private static ReleveGroupeFactureDTO releve(Random r, boolean parTiers) {
        ReleveGroupeFactureDTO d = new ReleveGroupeFactureDTO();
        int ng = r.nextInt(7);
        long tf = 0, tr = 0, tx = 0;
        int nb = 0;
        for (int g = 0; g < ng; g++) {
            ReleveGroupeDTO gr = new ReleveGroupeDTO(g, "GROUPE " + g);
            List<ReleveGroupeLigneDTO> l = new ArrayList<>();
            int nf = r.nextInt(31);
            for (int i = 0; i < nf; i++) {
                long m = r.nextInt(3) == 0 ? 0 : 1000 + r.nextInt(5_000_000);
                int etat = r.nextInt(3);
                long regle = etat == 0 ? 0
                        : etat == 1 ? m : (m == 0 ? 0 : r.nextInt((int) Math.min(m, Integer.MAX_VALUE)));
                l.add(new ReleveGroupeLigneDTO("FG" + g + "-" + r.nextInt(4), "01/11/2026", "F" + g + "-" + i,
                        TIERS[r.nextInt(TIERS.length)], "01/10/2026 - 31/10/2026", bd(m), bd(regle), bd(m - regle),
                        regle == m ? "Réglée" : "Non réglée"));
            }
            /* le service trie deja selon le mode */
            l.sort(parTiers ? Comparator.comparing(ReleveGroupeLigneDTO::getTiersPayant)
                    : Comparator.comparing(ReleveGroupeLigneDTO::getCodeFactureGroupe));
            long f = 0, rg = 0, x = 0;
            for (ReleveGroupeLigneDTO li : l) {
                f += li.getMontantFacture().longValue();
                rg += li.getMontantRegle().longValue();
                x += li.getMontantRestant().longValue();
            }
            gr.setFactures(l);
            gr.setMontantFacture(bd(f));
            gr.setMontantRegle(bd(rg));
            gr.setMontantRestant(bd(x));
            d.getGroupes().add(gr);
            tf += f;
            tr += rg;
            tx += x;
            nb += nf;
        }
        d.setMontantFacture(bd(tf));
        d.setMontantRegle(bd(tr));
        d.setMontantRestant(bd(tx));
        d.setNbFactures(nb);
        return d;
    }

    @Test
    void sousTotauxEtTotaux() {
        Random r = new Random(20261119L);
        int blocs = 0;
        for (int cas = 0; cas < 5000; cas++) {
            boolean parTiers = cas % 2 == 1;
            String mode = parTiers ? ModeRegroupement.PAR_TIERS_PAYANT : ModeRegroupement.PAR_FACTURE_DE_GROUPE;
            ReleveGroupeFactureDTO d = releve(r, parTiers);
            List<ReleveGroupeExcel.Ligne> l = ReleveGroupeExcel.lignes(d, mode);
            String ici = "cas " + cas + " " + mode;
            int k = 0;
            int factures = 0;
            for (ReleveGroupeDTO g : d.getGroupes()) {
                BigDecimal sommeSt = BigDecimal.ZERO;
                int i = 0;
                while (i < g.getFactures().size()) {
                    ReleveGroupeLigneDTO premiere = g.getFactures().get(i);
                    String cle = parTiers ? premiere.getTiersPayant() : premiere.getCodeFactureGroupe();
                    BigDecimal f = BigDecimal.ZERO, rg = BigDecimal.ZERO, x = BigDecimal.ZERO;
                    int n = 0;
                    while (i < g.getFactures().size() && cle.equals(parTiers ? g.getFactures().get(i).getTiersPayant()
                            : g.getFactures().get(i).getCodeFactureGroupe())) {
                        ReleveGroupeLigneDTO li = g.getFactures().get(i);
                        ReleveGroupeExcel.Ligne e = l.get(k++);
                        assertEquals(ReleveGroupeExcel.FACTURE, e.nature, ici);
                        assertEquals(li.getCodeFacture(), e.facture, ici);
                        assertEquals(li.getMontantFacture(), e.montant, ici);
                        assertEquals(e.montant.subtract(e.regle), e.reste, ici + " : reste = facture - regle");
                        f = f.add(li.getMontantFacture());
                        rg = rg.add(li.getMontantRegle());
                        x = x.add(li.getMontantRestant());
                        n++;
                        i++;
                        factures++;
                    }
                    ReleveGroupeExcel.Ligne st = l.get(k++);
                    assertEquals(ReleveGroupeExcel.SOUS_TOTAL, st.nature, ici);
                    assertEquals(cle, parTiers ? st.tiersPayant : st.factureGroupe, ici);
                    assertEquals(f, st.montant, ici + " : sous-total facture");
                    assertEquals(rg, st.regle, ici);
                    assertEquals(x, st.reste, ici);
                    assertEquals(n + (parTiers ? " facture" : " organisme") + (n > 1 ? "s" : ""), st.facture, ici);
                    sommeSt = sommeSt.add(st.montant);
                    blocs++;
                }
                ReleveGroupeExcel.Ligne tg = l.get(k++);
                assertEquals(ReleveGroupeExcel.TOTAL_GROUPE, tg.nature, ici);
                assertEquals(g.getMontantFacture(), tg.montant, ici);
                assertEquals(sommeSt, tg.montant, ici + " : somme des sous-totaux = total du groupe");
                assertEquals(tg.montant.subtract(tg.regle), tg.reste, ici);
            }
            ReleveGroupeExcel.Ligne tot = l.get(k++);
            assertEquals(ReleveGroupeExcel.TOTAL_GENERAL, tot.nature, ici);
            assertEquals(d.getMontantFacture(), tot.montant, ici);
            assertEquals(d.getMontantRestant(), tot.reste, ici);
            assertEquals(d.getNbFactures() + " facture" + (d.getNbFactures() > 1 ? "s" : ""), tot.facture, ici);
            assertEquals(d.getNbFactures(), factures, ici);
            assertEquals(l.size(), k, ici + " : aucune ligne en trop");
        }
        assertTrue(blocs > 10000, "blocs essayes : " + blocs);
    }
}
