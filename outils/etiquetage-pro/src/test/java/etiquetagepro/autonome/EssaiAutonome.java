package etiquetagepro.autonome;

import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.parser.PdfTextExtractor;
import etiquetagepro.RegistreLocal;
import etiquetagepro.Zone;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.atomic.AtomicReference;
import javax.imageio.ImageIO;
import javax.swing.JButton;
import javax.swing.SwingUtilities;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import rest.report.pdf.LabelSheetPdf;

/**
 * Essai de l'application autonome, fenetre reelle (ecran virtuel) : import CSV et Excel, zones, produits, impression
 * des 3 types de code, format libre, page de test, registre local, reglages retenus, saisie directe. Lance par
 * tester.sh ; sortie « n/m OK » et code de retour.
 */
public final class EssaiAutonome {

    private static final List<Boolean> RES = new ArrayList<>();
    private static File captures;

    private static void ok(String nom, boolean c, Object detail) {
        RES.add(c);
        System.out.println((c ? "PASS  " : "FAIL  ") + nom + (detail == null ? "" : "  [" + String.valueOf(detail).replace('\n', ' ') + "]"));
    }

    private static <T> T edt(Callable<T> f) throws Exception {
        AtomicReference<T> r = new AtomicReference<>();
        AtomicReference<Exception> e = new AtomicReference<>();
        SwingUtilities.invokeAndWait(() -> {
            try {
                r.set(f.call());
            } catch (Exception x) {
                e.set(x);
            }
        });
        if (e.get() != null) {
            throw e.get();
        }
        return r.get();
    }

    private static void capture(EtiquetageProApp a, String nom) throws Exception {
        if (captures == null) {
            return;
        }
        edt(() -> {
            BufferedImage i = new BufferedImage(a.getWidth(), a.getHeight(), BufferedImage.TYPE_INT_RGB);
            a.paint(i.getGraphics());
            ImageIO.write(i, "png", new File(captures, nom + ".png"));
            return null;
        });
    }

    private static JButton bouton(java.awt.Container c, String nom) {
        for (java.awt.Component x : c.getComponents()) {
            if (x instanceof JButton && nom.equals(x.getName())) {
                return (JButton) x;
            }
            if (x instanceof java.awt.Container) {
                JButton b = bouton((java.awt.Container) x, nom);
                if (b != null) {
                    return b;
                }
            }
        }
        return null;
    }

    private static int pages(File f) throws Exception {
        PdfReader r = new PdfReader(f.getPath());
        try {
            return r.getNumberOfPages();
        } finally {
            r.close();
        }
    }

    public static void main(String[] args) throws Exception {
        Path dossier = Files.createTempDirectory("etqp-autonome");
        captures = args.length > 0 ? new File(args[0]) : null;
        if (captures != null) {
            captures.mkdirs();
        }
        File csv = dossier.resolve("produits.csv").toFile();
        Files.write(csv.toPath(), ("Code produit;Libellé;PV;Fournisseur;N° lot;Exp;Qté;Rayon\r\n"
                + "1234567;PRODUIT ESSAI UN;1 500;LABOREX;A12;03/2030;2;R1\r\n" + ";SANS CIP;100;;;;;\r\n"
                + "7654321;PRIX FAUX;abc;;;;1;R2\r\n" + "8476972;AUTRE;900;;;;1;R3\r\n").getBytes(StandardCharsets.UTF_8));
        File xlsx = dossier.resolve("produits.xlsx").toFile();
        try (XSSFWorkbook wb = new XSSFWorkbook(); FileOutputStream o = new FileOutputStream(xlsx)) {
            wb.createSheet("Notes");
            Sheet s = wb.createSheet("Produits");
            Row h = s.createRow(0);
            h.createCell(0).setCellValue("CIP");
            h.createCell(1).setCellValue("Désignation");
            h.createCell(2).setCellValue("EAN");
            Row r = s.createRow(1);
            r.createCell(0).setCellValue(7777777d);
            r.createCell(1).setCellValue("PRODUIT EXCEL");
            r.createCell(2).setCellValue(3400930000014d);
            wb.write(o);
        }
        Path reglagesPoste = dossier.resolve("poste");
        EtiquetageProApp a = edt(() -> {
            EtiquetageProApp f = new EtiquetageProApp(reglagesPoste);
            f.setVisible(true);
            return f;
        });
        try {
            String prefixe = a.registre.getPrefixe();
            ok("Fenêtre ouverte, étape 1 ; préfixe d'installation tiré et affiché", edt(() -> a.etape == 0 && !a.suivant.isEnabled()
                    && RegistreLocal.prefixeValide(prefixe) && prefixe.equals(a.prefixe.getText())), prefixe);
            capture(a, "1-source-vide");

            /* ------------------------------------------------------ CSV */
            edt(() -> {
                a.importer(csv, null);
                return null;
            });
            ok("CSV lu : aperçu 4 lignes, 8 colonnes, séparateur indiqué", edt(() -> a.apercu.getRowCount() == 4 && a.apercu.getColumnCount() == 8
                    && a.info.getText().contains("séparateur « ; », UTF-8") && a.suivant.isEnabled()), a.info.getText());
            ok("Indication des colonnes : « Code produit » → CIP, « Rayon » → Mention libre ; titres reconnus affichés",
                    edt(() -> a.colonnes.getText().contains("Code produit") && a.zonesDeLaColonne("Code produit").equals(java.util.Collections.singletonList("CIP"))
                            && a.zonesDeLaColonne("Rayon").equals(java.util.Collections.singletonList("Mention libre"))
                            && a.colonnes.getText().contains("Titres reconnus") && a.colonnes.getText().contains("code produit")), null);
            capture(a, "1-source-csv");
            edt(() -> {
                a.allerA(1);
                return null;
            });
            ok("Zones proposées d'après les titres", edt(() -> "{Code produit}".equals(a.zone(Zone.CIP).source) && "{PV}".equals(a.zone(Zone.PRIX).source)
                    && "{Rayon}".equals(a.zone(Zone.MENTION).source) && a.zone(Zone.EAN).source.isEmpty()), null);
            ok("La case « obligatoire » du CIP n'est pas modifiable ; celle du prix l'est", edt(() -> !a.zonesModele.isCellEditable(a.zones.indexOf(a.zone(Zone.CIP)), 1)
                    && a.zonesModele.isCellEditable(a.zones.indexOf(a.zone(Zone.PRIX)), 1)), null);
            edt(() -> {
                bouton(a, "ajouterZone").doClick();
                int i = a.zones.size() - 1;
                a.zonesModele.setValueAt("Emplacement", i, 0);
                a.zonesModele.setValueAt("Rayon {Rayon}", i, 2);
                a.zonesModele.setValueAt("{Emplacement} / lot {N° lot}", a.zones.indexOf(a.zone(Zone.MENTION)), 2);
                a.zonesModele.setValueAt(Boolean.FALSE, a.zones.indexOf(a.zone(Zone.DESIGNATION)), 1);
                a.zonesModele.setValueAt("REÇU LE 10/10", a.zones.indexOf(a.zone(Zone.DATE)), 2);
                return null;
            });
            ok("Zone ajoutée reprise dans un modèle (aperçu « Rayon R1 / lot A12 »), texte fixe", edt(() -> "Rayon R1 / lot A12".equals(a.zone(Zone.MENTION).apercu)
                    && "REÇU LE 10/10".equals(a.zone(Zone.DATE).apercu)), edt(() -> a.zone(Zone.MENTION).apercu));
            capture(a, "2-zones");
            edt(() -> {
                a.suivant();
                return null;
            });
            ok("Produits : 4 lignes, 2 en erreur (CIP manquant, prix illisible), 3 étiquettes", edt(() -> a.produits.size() == 4
                    && a.produits.get(1).getErreurs().contains("CIP manquant") && !a.produits.get(2).imprimable()
                    && a.compteurs.getText().contains("4 ligne(s)") && a.compteurs.getText().contains("2 en erreur")
                    && a.compteurs.getText().contains("3 étiquette(s)")), edt(() -> a.compteurs.getText()));
            capture(a, "3-produits");
            edt(() -> {
                a.produitsModele.setValueAt("2 000", 2, 3);
                a.tableProduits.setRowSelectionInterval(1, 1);
                bouton(a, "supprimerLignes").doClick();
                bouton(a, "ajouterLigne").doClick();
                if (a.tableProduits.isEditing()) {
                    a.tableProduits.getCellEditor().cancelCellEditing();
                }
                int i = a.produits.size() - 1;
                a.produitsModele.setValueAt("5555555", i, 1);
                a.produitsModele.setValueAt("AJOUT MANUEL", i, 2);
                a.produitsModele.setValueAt("3", i, 8);
                return null;
            });
            ok("Prix corrigé, ligne en erreur supprimée, ligne ajoutée : 0 erreur, 7 étiquettes", edt(() -> a.compteurs.getText().contains("4 ligne(s)")
                    && a.compteurs.getText().contains("0 en erreur") && a.compteurs.getText().contains("7 étiquette(s)")), edt(() -> a.compteurs.getText()));

            /* ------------------------------------------------- impression */
            edt(() -> {
                a.allerA(3);
                a.officine.setText("PHARMACIE ESSAI");
                return null;
            });
            ok("Résumé : 7 étiquettes, 65 par planche, 1 planche", edt(() -> a.resume.getText().contains("<b>7</b> étiquette(s), 65 par planche : <b>1</b>")), edt(() -> a.resume.getText()));
            capture(a, "4-impression");
            File pdf = dossier.resolve("e.pdf").toFile();
            int avant = a.registre.nombre();
            int n = edt(() -> a.ecrirePdf(pdf, false));
            String texte = PdfTextExtractor.getTextFromPage(new PdfReader(pdf.getPath()), 1);
            ok("Code-barres standard : 1 page, 7 étiquettes, aucun code au registre", n == 7 && pages(pdf) == 1 && a.registre.nombre() == avant
                    && texte.contains("PHARMACIE ESSAI") && texte.contains("1 500 CFA") && texte.contains("LABOREX - Rayon R1 / lot A12"),
                    texte.replace('\n', ' '));
            for (String type : new String[] { "DATAMATRIX", "QR" }) {
                edt(() -> {
                    ("QR".equals(type) ? a.qr : a.dataMatrix).setSelected(true);
                    return null;
                });
                avant = a.registre.nombre();
                edt(() -> a.ecrirePdf(pdf, false));
                List<String> codes = Files.readAllLines(reglagesPoste.resolve("codes.txt"));
                String t2 = PdfTextExtractor.getTextFromPage(new PdfReader(pdf.getPath()), 1);
                ok(type + " : mention libre sur sa propre ligne (« Rayon R1 / lot A12 »), pharmacie en tête", t2.contains("Rayon R1 / lot A12")
                        && t2.contains("PHARMACIE ESSAI"), t2.replace('\n', ' '));
                ok(type + " : 7 codes uniques au registre local, tous avec le préfixe du poste", a.registre.nombre() - avant == 7
                        && codes.stream().allMatch(c -> c.startsWith(prefixe) && c.length() == 5), codes.size());
            }
            edt(() -> {
                a.modele.setSelectedIndex(3);
                a.champsReglages.get(LabelSheetPdf.KEY_NB_COLONNES).setValue(3d);
                a.champsReglages.get(LabelSheetPdf.KEY_NB_LIGNES).setValue(2d);
                a.champsReglages.get(LabelSheetPdf.KEY_LARGEUR_MM).setValue(63.5d);
                a.champsReglages.get(LabelSheetPdf.KEY_HAUTEUR_MM).setValue(38.1d);
                a.position.setValue(6);
                a.codeBarres.setSelected(true);
                return null;
            });
            ok("Format libre 3 x 2, position 6 : 2 planches annoncées", edt(() -> a.resume.getText().contains("6 par planche : <b>2</b>")), edt(() -> a.resume.getText()));
            edt(() -> a.ecrirePdf(pdf, false));
            ok("Format libre : PDF de 2 pages", pages(pdf) == 2, pages(pdf));
            ok("Dimensions bloquées hors format libre", edt(() -> {
                a.modele.setSelectedIndex(0);
                boolean bloque = !a.champsReglages.get(LabelSheetPdf.KEY_NB_COLONNES).isEnabled()
                        && a.champsReglages.get(LabelSheetPdf.KEY_DECALAGE_X_MM).isEnabled();
                a.modele.setSelectedIndex(3);
                return bloque;
            }), null);
            File test = dossier.resolve("t.pdf").toFile();
            edt(() -> a.ecrirePdf(test, true));
            ok("Page de test : 1 page", pages(test) == 1, null);

            /* -------------------------------------- reglages retenus, reprise */
            Reglages r = new Reglages(reglagesPoste);
            ok("Réglages retenus sur le poste (pharmacie, planche, colonnes)", "PHARMACIE ESSAI".equals(r.get("officine", ""))
                    && LabelSheetPdf.MODELE_PERSONNALISE.equals(r.get("modele", "")) && r.get(LabelSheetPdf.KEY_NB_COLONNES, "").startsWith("3"), null);
            EtiquetageProApp b = edt(() -> new EtiquetageProApp(reglagesPoste));
            edt(() -> {
                b.importer(csv, null);
                return null;
            });
            ok("Nouvelle fenêtre : même préfixe, réglages repris, correspondance du fichier reprise", edt(() -> b.registre.getPrefixe().equals(prefixe)
                    && "PHARMACIE ESSAI".equals(b.officine.getText()) && b.modeleChoisi().equals(LabelSheetPdf.MODELE_PERSONNALISE)
                    && b.etat.getText().contains("correspondance reprise") && "{Emplacement} / lot {N° lot}".equals(b.zone(Zone.MENTION).source)
                    && !b.zone(Zone.DESIGNATION).obligatoire), edt(() -> b.etat.getText()));

            /* ------------------------------------------------ fichier modele */
            File modele = dossier.resolve("modele.csv").toFile();
            edt(() -> {
                b.ecrireModele(modele);
                b.importer(modele, null);
                return null;
            });
            ok("Fichier modèle : une colonne par zone (" + etiquetagepro.Zone.values().length + "), toutes prises par leur zone",
                    edt(() -> b.tableau.getColonnes().size() == etiquetagepro.Zone.values().length
                    && b.tableau.getColonnes().stream().allMatch(c -> !b.zonesDeLaColonne(c).isEmpty())), edt(() -> b.tableau.getColonnes()));

            /* ------------------------------------------------------- Excel */
            edt(() -> {
                b.importer(xlsx, null);
                return null;
            });
            ok("Excel : choix de la feuille (2 feuilles), 1re vide", edt(() -> b.feuille.isVisible() && b.tableau.getLignes().isEmpty()), null);
            edt(() -> {
                b.feuille.setSelectedItem("Produits");
                return null;
            });
            ok("Excel, feuille « Produits » : EAN entier", edt(() -> b.tableau.getLignes().size() == 1
                    && "3400930000014".equals(b.tableau.getLignes().get(0).get(2))), edt(() -> b.tableau.getLignes()));

            /* ----------------------------------------------- saisie directe */
            edt(() -> {
                bouton(b, "saisie").doClick();
                if (b.tableProduits.isEditing()) {
                    b.tableProduits.getCellEditor().cancelCellEditing();
                }
                b.produitsModele.setValueAt("8476972", 0, 1);
                b.produitsModele.setValueAt("SAISI", 0, 2);
                b.qr.setSelected(true);
                b.modele.setSelectedIndex(0);
                b.position.setValue(1);
                return null;
            });
            avant = b.registre.nombre();
            int un = edt(() -> b.ecrirePdf(pdf, false));
            ok("Saisie directe : 1 étiquette QR, 1 code au registre", un == 1 && b.registre.nombre() - avant == 1 && pages(pdf) == 1, un);
            edt(() -> {
                b.produitsModele.setValueAt("", 0, 1);
                return null;
            });
            String refus = null;
            try {
                edt(() -> b.ecrirePdf(pdf, false));
            } catch (IllegalArgumentException e) {
                refus = e.getMessage();
            }
            ok("Rien d'imprimable : refusé avec explication", refus != null && refus.contains("Aucune étiquette"), refus);
            edt(() -> {
                b.dispose();
                return null;
            });
        } catch (Exception e) {
            e.printStackTrace(System.out);
            ok("Déroulement de l'essai", false, e);
        } finally {
            edt(() -> {
                a.dispose();
                return null;
            });
        }
        long n = RES.stream().filter(x -> x).count();
        System.out.println();
        System.out.println(n + "/" + RES.size() + (n == RES.size() ? " OK" : " ECHEC"));
        System.exit(n == RES.size() ? 0 : 1);
    }
}
