package etiquetagepro;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.parser.PdfTextExtractor;
import etiquetagepro.disposition.ContenuCode;
import etiquetagepro.disposition.ControleDisposition;
import etiquetagepro.disposition.Disposition;
import etiquetagepro.disposition.ElementEtiquette;
import etiquetagepro.disposition.Placement;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.report.pdf.ContenuEtendu;
import rest.report.pdf.Gs1;
import rest.report.pdf.Gs1DataMatrix;
import rest.report.pdf.LabelSheetPdf;
import rest.report.pdf.Symbole;

/**
 * Personnalisation des etiquettes et codes etendus (DataMatrix+, QR+) : contenu des codes, lecture, garde-fous de
 * lisibilite, dispositions proposees, mise a l'echelle, dessin PDF.
 */
class DispositionTest {

    private static final String[] TYPES = { LabelSheetPdf.CODE_BARRES, LabelSheetPdf.QR, LabelSheetPdf.DATAMATRIX,
            LabelSheetPdf.QR_PLUS, LabelSheetPdf.DATAMATRIX_PLUS };

    private static Map<String, String> infos() {
        Map<String, String> m = new HashMap<>();
        m.put(ContenuEtendu.NOM, "DOLIPRANE 1000MG CPR B/8");
        m.put(ContenuEtendu.PRIX, "1250");
        m.put(ContenuEtendu.PHA, "Pharmacie de l'Étoile");
        m.put(ContenuEtendu.GEO, "B-04");
        return m;
    }

    @Test
    void dataMatrixPlusGardeLeGs1StandardEtAjouteLesInformations() {
        String brute = Gs1.brute("3400930000014", LocalDate.of(2027, 12, 31), "A2410B", "3400930000014");
        String dm = ContenuEtendu.dataMatrixPlus(brute, infos());
        assertTrue(dm.startsWith(brute + Gs1.GS + "91EPLUS1"), dm);
        /* jeu de caracteres GS1 strict dans les champs internes : pas d'espace (un lecteur GS1 s'y arreterait) */
        assertFalse(dm.contains(" "), dm);
        assertTrue(dm.contains(Gs1.GS + "92DOLIPRANE_1000MG_CPR_B/8"), dm);
        /* une douchette ou un logiciel tiers lit toujours le standard */
        Gs1.Contenu c = Gs1.lire(dm);
        assertEquals("3400930000014", c.cip);
        assertEquals("A2410B", c.lot);
        assertEquals(LocalDate.of(2027, 12, 31), c.peremption);
        /* Prestige lit tout, accents retires */
        Map<String, String> lu = ContenuEtendu.lire(dm);
        assertEquals("DATAMATRIX+", lu.get("TYPE"));
        assertEquals("DOLIPRANE 1000MG CPR B/8", lu.get(ContenuEtendu.NOM));
        assertEquals("1250", lu.get(ContenuEtendu.PRIX));
        assertEquals("Pharmacie de l'Etoile", lu.get(ContenuEtendu.PHA));
        assertEquals("B-04", lu.get(ContenuEtendu.GEO));
        assertEquals("3400930000014", lu.get(ContenuEtendu.CIP));
        assertEquals("A2410B", lu.get(ContenuEtendu.LOT));
        assertEquals("31/12/2027", lu.get(ContenuEtendu.PER));
        assertEquals("3400930000014", lu.get(ContenuEtendu.EAN));
        /* telle que les douchettes la transmettent : prefixe ]d2, GS sous forme <GS> ou | */
        assertEquals(lu, ContenuEtendu.lire("]d2" + dm.replace(String.valueOf(Gs1.GS), "<GS>")));
        assertEquals(lu, ContenuEtendu.lire(dm.replace(Gs1.GS, '|')));
        /* forme lisible entre parentheses */
        String lisible = "(01)03400930000014(17)271231(10)A2410B(240)3400930000014(91)EPLUS1(92)DOLIPRANE_1000MG_CPR_B/8"
                + "(93)1250(94)Pharmacie_de_l'Etoile(96)B-04";
        assertEquals(lu, ContenuEtendu.lire(lisible));
    }

    @Test
    void qrPlusTexteClairSurUneLigne() {
        Map<String, String> m = infos();
        m.put(ContenuEtendu.CIP, "3400930000014");
        m.put(ContenuEtendu.LOT, "A2410B");
        m.put(ContenuEtendu.PER, "31/12/2027");
        m.put(ContenuEtendu.NOM, "DOLIPRANE | 1000MG (CPR)");
        String qr = ContenuEtendu.qrPlus(m);
        assertEquals("EP1|CIP:3400930000014|NOM:DOLIPRANE 1000MG CPR|PRIX:1250|LOT:A2410B|PER:31/12/2027"
                + "|PHA:Pharmacie de l'Etoile|GEO:B-04", qr);
        assertFalse(qr.contains("\n"), "une seule ligne : la douchette n'envoie pas d'Entree au milieu");
        Map<String, String> lu = ContenuEtendu.lire("]Q3" + qr);
        assertEquals("QR+", lu.get("TYPE"));
        assertEquals("DOLIPRANE 1000MG CPR", lu.get(ContenuEtendu.NOM));
        assertEquals("31/12/2027", lu.get(ContenuEtendu.PER));
        /* un QR+ n'est pas pris pour une etiquette GS1 */
        assertFalse(Gs1.estGs1(qr));
    }

    @Test
    void lesCodesHabituelsNeSontPasDesCodesEtendus() {
        String brute = Gs1.brute("3400930000014", LocalDate.of(2027, 12, 31), "A2410B", "3400930000014");
        assertNull(ContenuEtendu.lire(brute));
        assertNull(ContenuEtendu.lire("3400930000014"));
        assertNull(ContenuEtendu.lire("8476972"));
        /* un fabricant qui utilise lui-meme le champ interne 91 : pas un code etendu */
        assertNull(ContenuEtendu.lire(brute + Gs1.GS + "91ABC123"));
        assertNull(ContenuEtendu.lire("(01)03400930000014(91)XYZ"));
        assertNull(ContenuEtendu.lire("EP1|LOT:A12"), "QR+ sans CIP : refuse");
    }

    @Test
    void dispositionsProposeesValidesSurLesFormatsCourants() {
        for (float[] f : new float[][] { { 38f, 21.2f }, { 38.1f, 21.2f }, { 70f, 37f }, { 52.5f, 29.7f },
                { 50f, 30f } }) {
            for (String t : TYPES) {
                Disposition d = Disposition.parDefaut(t, f[0], f[1]);
                ControleDisposition.Resultat r = ControleDisposition.controler(d);
                assertTrue(r.valide(), t + " " + f[0] + "x" + f[1] + " : " + r.json());
                assertTrue(d.placement(ElementEtiquette.CODE).isImprime());
            }
        }
    }

    @Test
    void dispositionProposee2DNomDeLaPharmacieEtDesignationEnHaut() {
        Disposition d = Disposition.parDefaut(LabelSheetPdf.DATAMATRIX, 38f, 21.2f);
        Placement ph = d.placement(ElementEtiquette.PHARMACIE), des = d.placement(ElementEtiquette.DESIGNATION);
        assertTrue(ph.isImprime() && des.isImprime());
        assertTrue(des.getY() >= ph.getY() + ph.getH(), "designation sous le nom de la pharmacie");
        assertTrue(des.getH() >= 2 * Disposition.hauteurLigne(des.getPolice()) - 0.01f, "deux lignes possibles");
        assertTrue(des.getPolice() >= 5.5f, "police de depart lisible");
        assertTrue(d.placement(ElementEtiquette.CODE_GEO).isImprime(), "code geo propose (imprime s'il existe)");
        /* retours du 11/10 : date d'edition affichee sur tous les types, jamais dans le code */
        for (String t : TYPES) {
            for (float[] f : new float[][] { { 38f, 21.2f }, { 70f, 37f } }) {
                Disposition x = Disposition.parDefaut(t, f[0], f[1]);
                assertTrue(x.placement(ElementEtiquette.DATE).isImprime(), "date d'edition " + t + " " + f[0]);
                assertFalse(x.placement(ElementEtiquette.DATE).isDansLeCode());
                x.placement(ElementEtiquette.DATE).dansLeCode(true);
                assertFalse(x.placement(ElementEtiquette.DATE).isDansLeCode(), "la date ne va jamais dans le code");
            }
        }
        assertEquals("Date d'édition", ElementEtiquette.DATE.getLibelle());
        Placement code = d.placement(ElementEtiquette.CODE);
        assertEquals(code.getL(), code.getH(), 0.001f);
    }

    @Test
    void codesEtendusContenuParDefautEtPetitesEtiquettes() {
        Disposition grande = Disposition.parDefaut(LabelSheetPdf.DATAMATRIX_PLUS, 70f, 37f);
        for (ElementEtiquette e : Arrays.asList(ElementEtiquette.DESIGNATION, ElementEtiquette.PRIX,
                ElementEtiquette.PHARMACIE, ElementEtiquette.CODE_GEO)) {
            assertTrue(grande.placement(e).isDansLeCode(), e.name());
        }
        assertFalse(grande.placement(ElementEtiquette.GROSSISTE).isDansLeCode());
        assertFalse(grande.placement(ElementEtiquette.CIP).isDansLeCode(), "le CIP y est toujours, pas une option");
        /*
         * petite etiquette : moins d'informations dans le code pour qu'il reste lisible (DataMatrix+ : la designation
         * reste ; QR+, plus encombrant : CIP, lot, peremption et EAN seulement)
         */
        Disposition petiteDm = Disposition.parDefaut(LabelSheetPdf.DATAMATRIX_PLUS, 38f, 21.2f);
        assertTrue(petiteDm.placement(ElementEtiquette.DESIGNATION).isDansLeCode());
        assertTrue(ControleDisposition.controler(petiteDm).valide(),
                ControleDisposition.controler(petiteDm).json().toString());
        Disposition petite = Disposition.parDefaut(LabelSheetPdf.QR_PLUS, 38f, 21.2f);
        assertTrue(ControleDisposition.controler(petite).valide(),
                ControleDisposition.controler(petite).json().toString());
    }

    @Test
    void gardeFousBloquants() {
        Disposition d = Disposition.parDefaut(LabelSheetPdf.DATAMATRIX, 38f, 21.2f);
        Placement code = d.placement(ElementEtiquette.CODE);
        /* texte pose sur le code */
        Placement prix = d.placement(ElementEtiquette.PRIX);
        d.ajouter(new Placement(ElementEtiquette.PRIX, code.getX() + 1, code.getY() + 1, 6, prix.getH(),
                prix.getPolice()));
        assertProbleme(d, ElementEtiquette.PRIX, "chevauche le code");
        /* hors de l'etiquette */
        d = Disposition.parDefaut(LabelSheetPdf.DATAMATRIX, 38f, 21.2f);
        Placement ph = d.placement(ElementEtiquette.PHARMACIE);
        d.ajouter(new Placement(ElementEtiquette.PHARMACIE, 0.2f, ph.getY(), ph.getL(), ph.getH(), ph.getPolice()));
        assertProbleme(d, ElementEtiquette.PHARMACIE, "sort de l'étiquette");
        /* police illisible */
        d = Disposition.parDefaut(LabelSheetPdf.DATAMATRIX, 38f, 21.2f);
        Placement cip = d.placement(ElementEtiquette.CIP);
        d.ajouter(new Placement(ElementEtiquette.CIP, cip.getX(), cip.getY(), cip.getL(), cip.getH(), 3f)
                .alignement(Placement.GAUCHE));
        assertProbleme(d, ElementEtiquette.CIP, "trop petite pour être lue");
        /* cadre trop bas pour sa police */
        d = Disposition.parDefaut(LabelSheetPdf.DATAMATRIX, 38f, 21.2f);
        d.ajouter(new Placement(ElementEtiquette.CIP, cip.getX(), cip.getY(), cip.getL(), 1f, 7f));
        assertProbleme(d, ElementEtiquette.CIP, "cadre trop bas");
        /* code trop petit : refuse, avec la taille a atteindre */
        d = Disposition.parDefaut(LabelSheetPdf.DATAMATRIX, 38f, 21.2f);
        d.ajouter(new Placement(ElementEtiquette.CODE, code.getX(), code.getY(), 5f, 5f, 0f));
        ControleDisposition.Resultat r = assertProbleme(d, ElementEtiquette.CODE, "trop petit pour être lu");
        assertTrue(r.moduleMm < ControleDisposition.MODULE_2D_MIN);
        /* code-barres trop etroit */
        d = Disposition.parDefaut(LabelSheetPdf.CODE_BARRES, 38f, 21.2f);
        Placement cb = d.placement(ElementEtiquette.CODE);
        d.ajouter(new Placement(ElementEtiquette.CODE, cb.getX(), cb.getY(), 15f, cb.getH(), 0f));
        assertProbleme(d, ElementEtiquette.CODE, "trop étroit");
        /* code etendu trop rempli pour sa taille */
        d = Disposition.parDefaut(LabelSheetPdf.DATAMATRIX_PLUS, 38f, 21.2f);
        for (Placement p : d.getPlacements()) {
            p.dansLeCode(true);
        }
        assertProbleme(d, ElementEtiquette.CODE, "mettez moins d'informations");
    }

    private static ControleDisposition.Resultat assertProbleme(Disposition d, ElementEtiquette e, String morceau) {
        ControleDisposition.Resultat r = ControleDisposition.controler(d);
        assertFalse(r.valide(), r.json().toString());
        assertTrue(r.problemes.stream().anyMatch(p -> p.bloquant && p.element == e && p.message.contains(morceau)),
                r.json().toString());
        return r;
    }

    @Test
    void elementNonImprimeNeCompteNiPourLeChevauchementNiPourLaMarge() {
        Disposition d = Disposition.parDefaut(LabelSheetPdf.DATAMATRIX, 38f, 21.2f);
        Placement code = d.placement(ElementEtiquette.CODE);
        d.ajouter(new Placement(ElementEtiquette.LOT, code.getX(), code.getY(), 8, 2.5f, 5.5f).imprime(false));
        d.ajouter(new Placement(ElementEtiquette.MENTION, -5, -5, 8, 2.5f, 5.5f).imprime(false));
        assertTrue(ControleDisposition.controler(d).valide());
    }

    @Test
    void miseALEchelleEtRecontrole() {
        Disposition d = Disposition.parDefaut(LabelSheetPdf.DATAMATRIX, 38f, 21.2f);
        Disposition grande = d.aLEchelle(70f, 37f);
        assertEquals(70f, grande.getLargeur(), 0.001f);
        Placement c = grande.placement(ElementEtiquette.CODE);
        assertEquals(c.getL(), c.getH(), 0.001f, "le code reste carre");
        assertTrue(ControleDisposition.controler(grande).valide(),
                ControleDisposition.controler(grande).json().toString());
        /* une reduction forte rend des elements illisibles : c'est signale */
        Disposition minuscule = d.aLEchelle(20f, 10f);
        assertFalse(ControleDisposition.controler(minuscule).valide());
    }

    @Test
    void jsonAllerRetour() {
        Disposition d = Disposition.parDefaut(LabelSheetPdf.QR_PLUS, 52.5f, 29.7f);
        d.placement(ElementEtiquette.GROSSISTE).dansLeCode(true);
        JSONObject j = d.json();
        Disposition lue = Disposition.lire(new JSONObject(j.toString()));
        assertEquals(j.toString(), lue.json().toString());
        assertEquals(d.cle(), "QR_PLUS|52.5x29.7");
        /* element inconnu ignore, element manquant ajoute non imprime */
        JSONObject partiel = new JSONObject().put("typeCode", "DATAMATRIX").put("largeur", 38).put("hauteur", 21.2).put(
                "elements",
                new org.json.JSONArray().put(new JSONObject().put("element", "INCONNU"))
                        .put(d.placement(ElementEtiquette.CODE).getClass() == null ? null : new JSONObject()
                                .put("element", "CODE").put("x", 20).put("y", 6).put("l", 12).put("h", 14)));
        Disposition p = Disposition.lire(partiel);
        assertNotNull(p.placement(ElementEtiquette.PRIX));
        assertFalse(p.placement(ElementEtiquette.PRIX).isImprime());
        assertEquals(12f, p.placement(ElementEtiquette.CODE).getH(), 0.001f, "code 2D remis carre");
    }

    @Test
    void symboleIdentiqueAuCodeImprime() {
        String brute = Gs1.brute("3400930000014", LocalDate.of(2027, 12, 31), "A2410B", "3400930000014");
        assertTrue(Arrays.deepEquals(Gs1DataMatrix.matrice(brute),
                Symbole.de(LabelSheetPdf.DATAMATRIX, brute).getModules()));
        Symbole qr = Symbole.de(LabelSheetPdf.QR, brute);
        assertEquals(4, qr.getSilence());
        /* motif de reperage du QR (coin haut-gauche) : 7 modules noirs, puis noir-blanc*5-noir */
        assertTrue(qr.lignes()[0].startsWith("1111111"), qr.lignes()[0]);
        assertTrue(qr.lignes()[1].startsWith("1000001"), qr.lignes()[1]);
        assertTrue(qr.lignes()[2].startsWith("1011101"), qr.lignes()[2]);
        assertEquals(qr.getModules().length, qr.getModules()[0].length);
        Symbole b = Symbole.de(LabelSheetPdf.CODE_BARRES, "3400930000014");
        assertTrue(b.isLineaire());
        assertTrue(b.getModules()[0][0], "commence par une barre");
        /* le pire cas d'un DataMatrix+ est plus grand que le contenu reel */
        Disposition d = Disposition.parDefaut(LabelSheetPdf.DATAMATRIX_PLUS, 70f, 37f);
        assertTrue(Symbole.de(LabelSheetPdf.DATAMATRIX_PLUS, ContenuCode.pireCas(d)).getModules().length >= Symbole
                .de(LabelSheetPdf.DATAMATRIX_PLUS, ContenuEtendu.dataMatrixPlus(brute, infos())).getModules().length);
    }

    @Test
    void pdfAvecDispositionNomDuProduitSousLaPharmacie() throws Exception {
        LabelSheetPdf.LabelData l = new LabelSheetPdf.LabelData("PHARMACIE DE L'ETOILE", "LABOREX",
                "DOLIPRANE 1000MG COMPRIME PELLICULE SECABLE BOITE DE 8", "3400930000014", "1 250 CFA", "10/10/26")
                        .codeGeo("B-04");
        String brute = Gs1.brute("3400930000014", LocalDate.of(2027, 12, 31), "A2410B", "3400930000014");
        l.codeEtendu(LabelSheetPdf.DATAMATRIX_PLUS, brute, "A2410B", "31/12/2027").codeUnique("AB2CD");
        LabelSheetPdf.SheetFormat f = LabelSheetPdf.formatFor(LabelSheetPdf.MODELE_PERSONNALISE,
                k -> k.equals(LabelSheetPdf.KEY_LARGEUR_MM) ? "70"
                        : k.equals(LabelSheetPdf.KEY_HAUTEUR_MM) ? "37" : k.equals(LabelSheetPdf.KEY_NB_COLONNES) ? "3"
                                : k.equals(LabelSheetPdf.KEY_NB_LIGNES) ? "8" : null);
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        LabelSheetPdf.write(o, java.util.Collections.singletonList(l), 1, f, null);
        String texte = PdfTextExtractor.getTextFromPage(new PdfReader(o.toByteArray()), 1);
        int ph = texte.indexOf("PHARMACIE DE L'ETOILE"), des = texte.indexOf("DOLIPRANE");
        assertTrue(ph >= 0 && des > ph, texte);
        assertTrue(texte.contains("B-04") && texte.contains("1 250 CFA") && texte.contains("3400930000014"), texte);
    }

    @Test
    void sansDispositionLeDessinHistoriqueNeChangePas() throws Exception {
        LabelSheetPdf.LabelData l = new LabelSheetPdf.LabelData("PHARMACIE TEST", "LABOREX", "DOLIPRANE 1000MG",
                "3400930000014", "1 250 CFA", "10/10/26");
        LabelSheetPdf.SheetFormat f = LabelSheetPdf.formatFor(null, null);
        ByteArrayOutputStream a = new ByteArrayOutputStream(), b = new ByteArrayOutputStream();
        LabelSheetPdf.write(a, java.util.Collections.singletonList(l), 1, f);
        LabelSheetPdf.write(b, java.util.Collections.singletonList(l), 1, f, (t, w, h) -> null);
        assertEquals(PdfTextExtractor.getTextFromPage(new PdfReader(a.toByteArray()), 1),
                PdfTextExtractor.getTextFromPage(new PdfReader(b.toByteArray()), 1));
        assertEquals(new String(new PdfReader(a.toByteArray()).getPageContent(1), "ISO-8859-1"),
                new String(new PdfReader(b.toByteArray()).getPageContent(1), "ISO-8859-1"),
                "meme dessin, trait pour trait");
        /* les editions existantes ne peuvent pas demander un code etendu */
        assertEquals(LabelSheetPdf.CODE_BARRES, LabelSheetPdf.typeCode("QR_PLUS"));
        assertEquals(LabelSheetPdf.QR_PLUS, LabelSheetPdf.typeCodeEtendu("qr_plus"));
    }

    @Test
    void designationLonguePasseSurDeuxLignesPuisAbregee() throws Exception {
        com.itextpdf.text.pdf.BaseFont bold = com.itextpdf.text.pdf.BaseFont.createFont(
                com.itextpdf.text.pdf.BaseFont.HELVETICA_BOLD, com.itextpdf.text.pdf.BaseFont.WINANSI, false);
        Disposition d = Disposition.parDefaut(LabelSheetPdf.DATAMATRIX, 38f, 21.2f);
        Placement des = d.placement(ElementEtiquette.DESIGNATION);
        List<String> l = rest.report.pdf.RenduDispositionAcces.lignes(bold,
                "DOLIPRANE 1000MG COMPRIME PELLICULE SECABLE B/8", des);
        assertEquals(2, l.size(), l.toString());
        assertEquals(
                des.getPolice(), rest.report.pdf.RenduDispositionAcces.taille(bold,
                        "DOLIPRANE 1000MG COMPRIME PELLICULE SECABLE B/8", des),
                0.001f, "deux lignes a la police de depart avant de reduire");
        List<String> tresLong = rest.report.pdf.RenduDispositionAcces.lignes(bold,
                "AMOXICILLINE ACIDE CLAVULANIQUE BIOGARAN 1G/125MG POUDRE POUR SUSPENSION BUVABLE EN SACHET-DOSE B/24",
                des);
        assertTrue(tresLong.size() <= 2, tresLong.toString());
        assertTrue(
                rest.report.pdf.RenduDispositionAcces.taille(bold,
                        "AMOXICILLINE ACIDE CLAVULANIQUE BIOGARAN 1G/125MG"
                                + " POUDRE POUR SUSPENSION BUVABLE EN SACHET-DOSE B/24",
                        des) >= ElementEtiquette.POLICE_MIN);
    }
}
