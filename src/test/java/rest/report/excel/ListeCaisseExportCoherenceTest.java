package rest.report.excel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import commonTasks.dto.SumCaisseDTO;
import commonTasks.dto.VenteReglementDTO;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.junit.jupiter.api.Test;
import rest.service.v2.dto.VisualisationCaisseDTO;

/**
 * Plan du 19/11, point 15 : export CSV / Excel de la liste de caisse et de la visualisation de caisse, sur 3 000 listes
 * tirees au hasard (graine fixe ; 0 a 400 mouvements, montants negatifs, nuls et positifs, 0 a 3 reglements par
 * mouvement, noms avec « ; », guillemets, accents et retours a la ligne, client absent, totaux par mode avec
 * annulation) :
 * <ul>
 * <li>une ligne par mouvement, dans l'ordre, puis une ligne par total, dans l'ordre ; rien de perdu ni en double ;</li>
 * <li>type de mouvement = libelle de l'ecran (VNO -> COMPTANT, VO -> ASSURANCE) ; montant = montant du mouvement ;</li>
 * <li>detail des reglements = ligne depliee de l'ecran (dernier reglement en premier) ; somme des reglements retrouvee
 * ;</li>
 * <li>CSV relu par un tableur (« ; », UTF-8 avec BOM) = lignes de l'export, cellule par cellule.</li>
 * </ul>
 */
class ListeCaisseExportCoherenceTest {

    private static final String[] TYPES = { "VENTE AU COMPTANT", "VENTE A CREDIT", "REGLEMENT VO", "SORTIE CAISSE",
            "ventes N.O.", "ventes ordonnancees", "VNO", "VO", "Fond de caisse", "REGLEMENT DIFFERE" };
    private static final String[] MODES = { "Espece", "Cheque", "Carte bancaire", "Mobile money", "Differe" };
    private static final String[] NOMS = { "KOUASSI Awa", "N'GUESSAN; Paul", "Dupont \"le grand\"", "Ébrié\nKoné",
            "  YAO  ", "" };

    @Test
    void lignesEtCsv() throws Exception {
        Random r = new Random(20261119L);
        int speciaux = 0, totaux = 0;
        for (int cas = 0; cas < 3000; cas++) {
            int n = r.nextInt(cas % 50 == 0 ? 401 : 40);
            List<VisualisationCaisseDTO> mvts = new ArrayList<>();
            List<List<VenteReglementDTO>> regl = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                VisualisationCaisseDTO m = new VisualisationCaisseDTO();
                m.setTypeMouvement(TYPES[r.nextInt(TYPES.length)]);
                m.setReference("REF-" + r.nextInt(100000));
                m.setOperateur(NOMS[r.nextInt(NOMS.length)]);
                m.setClient(r.nextInt(4) == 0 ? null : NOMS[r.nextInt(NOMS.length)]);
                m.setTaskDate(String.format("%02d/11/2026", 1 + r.nextInt(30)));
                m.setTaskHeure(String.format("%02d:%02d", r.nextInt(24), r.nextInt(60)));
                int montant = r.nextInt(5) == 0 ? -r.nextInt(50000) : r.nextInt(8) == 0 ? 0 : r.nextInt(500000);
                m.setMontant(montant);
                List<VenteReglementDTO> l = new ArrayList<>();
                int nr = r.nextInt(4);
                for (int k = 0; k < nr; k++) {
                    VenteReglementDTO v = new VenteReglementDTO();
                    v.setTypeReglement(MODES[r.nextInt(MODES.length)]);
                    v.setMontant(r.nextInt(200000));
                    l.add(v);
                }
                m.getReglements().addAll(l);
                regl.add(l);
                mvts.add(m);
            }
            List<SumCaisseDTO> sommes = new ArrayList<>();
            int nm = r.nextInt(MODES.length + 1);
            for (int k = 0; k < nm; k++) {
                SumCaisseDTO s = new SumCaisseDTO();
                s.setModeReglement(MODES[k]);
                s.setAmount(r.nextInt(3_000_000) - 100_000L);
                sommes.add(s);
            }
            if (r.nextBoolean()) {
                SumCaisseDTO s = new SumCaisseDTO();
                s.setModeReglement("Annulation");
                s.setAmount(-r.nextInt(90000));
                sommes.add(s);
            }
            String ici = "cas " + cas;
            List<ListeCaisseExport.Ligne> l = ListeCaisseExport.lignes(mvts, sommes);
            assertEquals(n + sommes.size(), l.size(), ici + " : une ligne par mouvement et par total");
            for (int i = 0; i < n; i++) {
                VisualisationCaisseDTO m = mvts.get(i);
                ListeCaisseExport.Ligne x = l.get(i);
                assertEquals(ListeCaisseExport.MOUVEMENT, x.nature, ici);
                assertEquals(m.getReference(), x.reference, ici + " : ordre");
                assertEquals(m.getMontant(), x.montant, ici);
                assertEquals(m.getClient() == null ? "" : m.getClient(), x.client, ici);
                String type = m.getTypeMouvement();
                String attendu = "VNO".equals(type) ? "COMPTANT"
                        : "VO".equals(type) ? "ASSURANCE"
                                : "ventes N.O.".equals(type) ? "Ventes comptant"
                                        : "ventes ordonnancees".equals(type) ? "Ventes assurance"
                                                : "REGLEMENT VO".equals(type) ? "REGLEMENT ASSURANCE" : type;
                assertEquals(attendu, x.type, ici + " : libelle de l'ecran");
                List<VenteReglementDTO> rg = regl.get(i);
                long somme = 0;
                if (!x.reglements.isEmpty()) {
                    String[] parts = x.reglements.split(" \\| ");
                    assertEquals(rg.size(), parts.length, ici);
                    for (int k = 0; k < parts.length; k++) {
                        VenteReglementDTO v = rg.get(rg.size() - 1 - k);
                        assertEquals(v.getTypeReglement() + " : " + v.getMontant(), parts[k],
                                ici + " : dernier reglement en premier");
                        somme += Long.parseLong(parts[k].substring(parts[k].lastIndexOf(' ') + 1));
                    }
                } else {
                    assertTrue(rg.isEmpty(), ici);
                }
                assertEquals(rg.stream().mapToLong(VenteReglementDTO::getMontant).sum(), somme, ici);
            }
            for (int k = 0; k < sommes.size(); k++) {
                ListeCaisseExport.Ligne x = l.get(n + k);
                assertEquals(ListeCaisseExport.TOTAL, x.nature, ici);
                assertEquals(sommes.get(k).getModeReglement(), x.type, ici);
                assertEquals(sommes.get(k).getAmount(), x.montant, ici);
                totaux++;
            }

            /* CSV relu */
            byte[] csv = ListeCaisseExport.csv(l);
            assertEquals((byte) 0xEF, csv[0], ici + " : BOM");
            String texte = new String(Arrays.copyOfRange(csv, 3, csv.length), StandardCharsets.UTF_8);
            List<CSVRecord> lu = CSVFormat.EXCEL.withDelimiter(';').parse(new StringReader(texte)).getRecords();
            assertEquals(l.size() + 1, lu.size(), ici + " : en-tete + lignes");
            assertEquals("Montant", lu.get(0).get(7), ici);
            for (int i = 0; i < l.size(); i++) {
                ListeCaisseExport.Ligne x = l.get(i);
                CSVRecord c = lu.get(i + 1);
                assertEquals(9, c.size(), ici);
                assertEquals(
                        Arrays.asList(x.nature, x.type, x.reference, x.operateur, x.client, x.date, x.heure,
                                String.valueOf(x.montant), x.reglements),
                        Arrays.asList(c.get(0), c.get(1), c.get(2), c.get(3), c.get(4), c.get(5), c.get(6), c.get(7),
                                c.get(8)),
                        ici + " : ligne " + i);
                if (x.operateur.contains(";") || x.operateur.contains("\"") || x.operateur.contains("\n")) {
                    speciaux++;
                }
            }
        }
        assertTrue(speciaux > 1000, "noms avec ; \" ou retour a la ligne : " + speciaux);
        assertTrue(totaux > 5000, "totaux essayes : " + totaux);
    }

    @Test
    void libellesDeLEcran() {
        assertEquals("COMPTANT", ListeCaisseExport.libelleAffiche(" VNO "));
        assertEquals("ASSURANCE", ListeCaisseExport.libelleAffiche("VO"));
        assertEquals("Ventes comptant", ListeCaisseExport.libelleAffiche("ventes N.O."));
        assertEquals("Ventes assurance", ListeCaisseExport.libelleAffiche("ventes ordonnancees"));
        assertEquals("ANNULATION COMPTANT", ListeCaisseExport.libelleAffiche("ANNULATION VNO"));
        assertEquals("VOIE", ListeCaisseExport.libelleAffiche("VOIE"));
        assertEquals("VENTE AU COMPTANT", ListeCaisseExport.libelleAffiche("VENTE AU COMPTANT"));
        assertEquals("", ListeCaisseExport.libelleAffiche(null));
    }
}
