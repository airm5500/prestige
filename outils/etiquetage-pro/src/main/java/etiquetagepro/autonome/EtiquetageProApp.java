package etiquetagepro.autonome;

import etiquetagepro.Correspondance;
import etiquetagepro.LecteurTableau;
import etiquetagepro.LigneEtiquette;
import etiquetagepro.MoteurEtiquettes;
import etiquetagepro.OptionsImpression;
import etiquetagepro.RegistreLocal;
import etiquetagepro.Tableau;
import etiquetagepro.Zone;
import java.awt.BorderLayout;
import java.awt.CardLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Desktop;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.awt.event.ActionEvent;
import java.awt.event.KeyEvent;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.swing.BorderFactory;
import javax.swing.ButtonGroup;
import javax.swing.DefaultCellEditor;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JComponent;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JRadioButton;
import javax.swing.JScrollPane;
import javax.swing.JSpinner;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.KeyStroke;
import javax.swing.InputMap;
import javax.swing.Action;
import javax.swing.AbstractAction;
import javax.swing.SpinnerNumberModel;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.filechooser.FileNameExtensionFilter;
import javax.swing.table.AbstractTableModel;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.DefaultTableModel;
import rest.report.pdf.LabelSheetPdf;

/**
 * Etiquettage Pro autonome : la fonction Etiquettage Pro de Prestige, sur n'importe quel ordinateur (Java 8 ou plus),
 * sans Prestige ni base de donnees. Meme assistant en 4 etapes : source (CSV, Excel ou saisie), zones (colonne, texte
 * fixe, modele, zones obligatoires, zones ajoutees), produits (tableau modifiable, controle), impression (code-barres
 * standard, DataMatrix, QR code ; planches de Prestige ou format libre ; page de test). Le PDF est enregistre puis
 * ouvert. Codes d'etiquettes 2D : registre local, prefixe propre a l'installation.
 */
public final class EtiquetageProApp extends JFrame {

    private static final long serialVersionUID = 1L;
    static final String[] ETAPES = { "1. Source", "2. Zones", "3. Produits", "4. Impression" };
    private static final Color ROUGE = new Color(0xB4, 0x23, 0x18), VERT = new Color(0x17, 0x79, 0x5F);
    private static final Color FOND_ERREUR = new Color(0xFD, 0xEC, 0xEA);
    /* cle, libelle, min, max, pas, dimension (format libre seulement) */
    static final Object[][] REGLAGES = { { LabelSheetPdf.KEY_NB_COLONNES, "Colonnes", 1d, 20d, 1d, true },
            { LabelSheetPdf.KEY_NB_LIGNES, "Lignes", 1d, 40d, 1d, true },
            { LabelSheetPdf.KEY_LARGEUR_MM, "Largeur (mm)", 5d, 210d, 0.1d, true },
            { LabelSheetPdf.KEY_HAUTEUR_MM, "Hauteur (mm)", 5d, 297d, 0.1d, true },
            { LabelSheetPdf.KEY_ESPACE_H_MM, "Espace horizontal (mm)", 0d, 50d, 0.1d, true },
            { LabelSheetPdf.KEY_ESPACE_V_MM, "Espace vertical (mm)", 0d, 50d, 0.1d, true },
            { LabelSheetPdf.KEY_MARGE_GAUCHE_MM, "Marge gauche (mm, 0 = centré)", 0d, 100d, 0.1d, false },
            { LabelSheetPdf.KEY_MARGE_HAUT_MM, "Marge haut (mm, 0 = centré)", 0d, 100d, 0.1d, false },
            { LabelSheetPdf.KEY_DECALAGE_X_MM, "Décalage X (mm)", -50d, 50d, 0.1d, false },
            { LabelSheetPdf.KEY_DECALAGE_Y_MM, "Décalage Y (mm)", -50d, 50d, 0.1d, false },
            { LabelSheetPdf.KEY_ECHELLE_POURCENT, "Échelle (%)", 50d, 150d, 1d, false } };
    static final String[][] MODELES = {
            { LabelSheetPdf.MODELE_CARRE_38X21_2, "Carré 38 x 21,2 mm (65 par page)" },
            { LabelSheetPdf.MODELE_CARRE_38_1X21_2, "Carré 38,1 x 21,2 mm (65 par page, espacées)" },
            { LabelSheetPdf.MODELE_ARRONDI_38X21, "Arrondi 38 x 21 mm (65 par page)" },
            { LabelSheetPdf.MODELE_PERSONNALISE, "Format libre (dimensions ci-contre)" } };

    final Reglages reglages;
    final RegistreLocal registre;
    /* etat de l'assistant */
    Tableau tableau;
    boolean avecTitres = true;
    File fichier;
    int etape;
    final List<LigneZone> zones = new ArrayList<>();
    final List<LigneEtiquette> produits = new ArrayList<>();
    final List<String> ajoutees = new ArrayList<>();

    /* composants */
    private final CardLayout cartes = new CardLayout();
    private final JPanel centre = new JPanel(cartes);
    private final JLabel[] titresEtapes = new JLabel[4];
    final JButton precedent = new JButton("« Précédent"), suivant = new JButton("Suivant »");
    final JLabel etat = new JLabel(" ");
    final JCheckBox titres = new JCheckBox("1re ligne = titres des colonnes", true);
    final JComboBox<String> feuille = new JComboBox<>();
    final JLabel info = new JLabel(" ");
    final javax.swing.JEditorPane colonnes = new javax.swing.JEditorPane();
    final DefaultTableModel apercu = new DefaultTableModel();
    final ZonesModele zonesModele = new ZonesModele();
    final JTable tableZones = new JTable(zonesModele);
    final JComboBox<String> sources = new JComboBox<>();
    final ProduitsModele produitsModele = new ProduitsModele();
    final JTable tableProduits = new JTable(produitsModele);
    final JLabel compteurs = new JLabel(" ");
    final JRadioButton codeBarres = new JRadioButton("Code-barres standard (CIP)", true);
    final JRadioButton dataMatrix = new JRadioButton("DataMatrix (GS1 : EAN, péremption, lot, CIP)");
    final JRadioButton qr = new JRadioButton("QR code (GS1 : EAN, péremption, lot, CIP)");
    final JComboBox<String> modele = new JComboBox<>();
    final JSpinner position = new JSpinner(new SpinnerNumberModel(1, 1, 999, 1));
    final JTextField officine = new JTextField(24), monnaie = new JTextField(6), date = new JTextField(10);
    final JTextField prefixe = new JTextField(3);
    final Map<String, JSpinner> champsReglages = new LinkedHashMap<>();
    final JLabel resume = new JLabel(" ");
    private boolean chargement;

    /** Zone de l'etiquette ou zone ajoutee (zone == null), avec sa source. */
    static final class LigneZone {
        Zone zone;
        String nom;
        boolean obligatoire;
        String source = "";
        String apercu = "";

        LigneZone(Zone z, String nom, boolean obligatoire) {
            this.zone = z;
            this.nom = nom;
            this.obligatoire = obligatoire;
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception e) {
                /* aspect par defaut */
            }
            try {
                EtiquetageProApp f = new EtiquetageProApp(Reglages.dossierParDefaut());
                f.setVisible(true);
            } catch (IOException e) {
                javax.swing.JOptionPane.showMessageDialog(null, "Dossier des réglages inaccessible : " + e.getMessage(),
                        "Étiquettage Pro", javax.swing.JOptionPane.ERROR_MESSAGE);
            }
        });
    }

    EtiquetageProApp(java.nio.file.Path dossier) throws IOException {
        super("Étiquettage Pro");
        this.reglages = new Reglages(dossier);
        this.registre = RegistreLocal.ouvrir(dossier);
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(980, 640));
        setSize(1200, 760);
        setLocationRelativeTo(null);
        for (Zone z : Zone.values()) {
            zones.add(new LigneZone(z, z.getLibelle(), z.isObligatoireParDefaut()));
        }
        JPanel haut = new JPanel(new FlowLayout(FlowLayout.LEFT, 18, 8));
        for (int i = 0; i < 4; i++) {
            titresEtapes[i] = new JLabel(ETAPES[i]);
            haut.add(titresEtapes[i]);
        }
        centre.add(carteSource(), "0");
        centre.add(carteZones(), "1");
        centre.add(carteProduits(), "2");
        centre.add(carteImpression(), "3");
        JPanel bas = new JPanel(new BorderLayout(8, 0));
        bas.setBorder(BorderFactory.createEmptyBorder(6, 10, 6, 10));
        bas.add(precedent, BorderLayout.WEST);
        bas.add(etat, BorderLayout.CENTER);
        bas.add(suivant, BorderLayout.EAST);
        precedent.addActionListener(e -> allerA(etape - 1));
        suivant.addActionListener(e -> suivant());
        getContentPane().add(haut, BorderLayout.NORTH);
        getContentPane().add(centre, BorderLayout.CENTER);
        getContentPane().add(bas, BorderLayout.SOUTH);
        allerA(0);
    }

    /* ------------------------------------------------------------- outils */

    void message(String texte, boolean erreur) {
        etat.setForeground(erreur ? ROUGE : VERT);
        etat.setText(texte);
    }

    private static JPanel ligne(Component... c) {
        JPanel p = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 4));
        for (Component x : c) {
            p.add(x);
        }
        return p;
    }

    private static JButton bouton(String texte, String nom) {
        JButton b = new JButton(texte);
        b.setName(nom);
        return b;
    }

    /* ------------------------------------------------------------- etapes */

    void allerA(int i) {
        if (i < 0 || i > 3) {
            return;
        }
        if (tableZones.isEditing()) {
            tableZones.getCellEditor().stopCellEditing();
        }
        if (tableProduits.isEditing()) {
            tableProduits.getCellEditor().stopCellEditing();
        }
        if (i == 3) {
            majResume();
        }
        if (i != etape) {
            message(" ", false);
        }
        etape = i;
        cartes.show(centre, String.valueOf(i));
        for (int k = 0; k < 4; k++) {
            titresEtapes[k].setFont(titresEtapes[k].getFont().deriveFont(k == i ? Font.BOLD : Font.PLAIN));
            titresEtapes[k].setForeground(k == i ? new Color(0x1F, 0x5F, 0x9E) : Color.DARK_GRAY);
        }
        precedent.setEnabled(i > 0);
        suivant.setVisible(i < 3);
        majSuivant();
    }

    void majSuivant() {
        boolean ok;
        if (etape == 0) {
            ok = tableau != null;
        } else if (etape == 1) {
            ok = tableau != null && !zone(Zone.CIP).source.trim().isEmpty();
        } else {
            ok = !produits.isEmpty();
        }
        suivant.setEnabled(ok);
    }

    void suivant() {
        if (etape == 1) {
            appliquer();
        }
        allerA(etape + 1);
    }

    /* ------------------------------------------------------------ 1. Source */

    private JComponent carteSource() {
        JPanel p = new JPanel(new BorderLayout());
        JButton importer = bouton("Importer un fichier (CSV, Excel)…", "importer");
        JButton saisie = bouton("Saisir les produits à la main", "saisie");
        feuille.setName("feuille");
        feuille.setVisible(false);
        importer.addActionListener(e -> choisirFichier());
        saisie.addActionListener(e -> saisieDirecte());
        titres.addActionListener(e -> {
            avecTitres = titres.isSelected();
            if (fichier != null) {
                importer(fichier, (String) feuille.getSelectedItem());
            }
        });
        feuille.addActionListener(e -> {
            if (!chargement && fichier != null && feuille.getSelectedItem() != null) {
                importer(fichier, (String) feuille.getSelectedItem());
            }
        });
        JPanel h = new JPanel(new BorderLayout());
        h.add(ligne(importer, titres, new JLabel("Feuille :"), feuille, saisie), BorderLayout.NORTH);
        info.setBorder(BorderFactory.createEmptyBorder(4, 12, 8, 12));
        info.setText("<html>Importez un fichier CSV (séparateur ; , tabulation ou |) ou Excel (.xlsx, .xls) ; ses colonnes seront "
                + "associées aux zones de l'étiquette à l'étape suivante. Vous pouvez aussi saisir les produits directement.</html>");
        h.add(info, BorderLayout.CENTER);
        p.add(h, BorderLayout.NORTH);
        JTable t = new JTable(apercu);
        t.setEnabled(false);
        /* indication des colonnes (retours du 10/10) : colonnes du fichier en cours et titres reconnus par zone */
        JButton modeleCsv = bouton("Enregistrer un fichier modèle (CSV)…", "fichierModele");
        modeleCsv.addActionListener(e -> enregistrerModele());
        colonnes.setContentType("text/html");
        colonnes.setEditable(false);
        JPanel droite = new JPanel(new BorderLayout());
        droite.setBorder(BorderFactory.createTitledBorder("Colonnes"));
        droite.add(ligne(modeleCsv), BorderLayout.NORTH);
        droite.add(new JScrollPane(colonnes), BorderLayout.CENTER);
        droite.setPreferredSize(new Dimension(440, 300));
        JPanel milieu = new JPanel(new BorderLayout(10, 0));
        milieu.add(new JScrollPane(t), BorderLayout.CENTER);
        milieu.add(droite, BorderLayout.EAST);
        p.add(milieu, BorderLayout.CENTER);
        majColonnes();
        return p;
    }

    private void choisirFichier() {
        JFileChooser c = new JFileChooser(reglages.get("dernierDossier", System.getProperty("user.home")));
        c.setFileFilter(new FileNameExtensionFilter("Fichiers CSV ou Excel", "csv", "txt", "xlsx", "xls"));
        if (c.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
            reglages.set("dernierDossier", c.getSelectedFile().getParent());
            reglages.enregistrer();
            importer(c.getSelectedFile(), null);
        }
    }

    /** Lit le fichier (feuille donnee, sinon la premiere) et prepare la correspondance. */
    void importer(File f, String nomFeuille) {
        try {
            Tableau t = LecteurTableau.lire(f.getName(), Files.readAllBytes(f.toPath()), nomFeuille, avecTitres);
            fichier = f;
            tableau = t;
            chargement = true;
            feuille.removeAllItems();
            for (String x : t.getFeuilles()) {
                feuille.addItem(x);
            }
            feuille.setSelectedItem(t.getFeuille());
            feuille.setVisible(t.getFeuilles().size() > 1);
            chargement = false;
            apercu.setColumnIdentifiers(t.getColonnes().toArray());
            apercu.setRowCount(0);
            for (List<String> l : t.getLignes().subList(0, Math.min(200, t.getLignes().size()))) {
                apercu.addRow(l.toArray());
            }
            info.setText("<html><b>" + echapper(f.getName()) + "</b> : " + t.getLignes().size() + " ligne(s), "
                    + t.getColonnes().size() + " colonne(s)"
                    + (t.getSeparateur() != null ? " ; séparateur « " + t.getSeparateur() + " », " + t.getEncodage() : "")
                    + (t.getFeuille() != null ? " ; feuille « " + echapper(t.getFeuille()) + " »" : "")
                    + (t.getLignesIgnorees() > 0 ? " ; <font color='#b42318'>" + t.getLignesIgnorees() + " ligne(s) ignorée(s)</font>" : "")
                    + "</html>");
            /* correspondance : celle retenue pour cette forme de fichier, sinon celle proposee par les titres */
            Correspondance retenue = reglages.retenue(t.getColonnes());
            appliquerCorrespondance(retenue != null ? retenue : Correspondance.proposer(t));
            sources.removeAllItems();
            sources.addItem("");
            for (String c : t.getColonnes()) {
                sources.addItem("{" + c + "}");
            }
            message(t.getLignes().size() + " ligne(s) lue(s)" + (retenue != null ? " ; correspondance reprise du dernier fichier de même forme" : "")
                    + " : vérifiez les zones à l'étape suivante.", false);
        } catch (IOException e) {
            message(e.getMessage(), true);
        }
        majSuivant();
    }

    static String echapper(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    void saisieDirecte() {
        tableau = null;
        ajoutees.clear();
        produits.clear();
        produits.add(new LigneEtiquette(1).valeur(Zone.NOMBRE, "1").valider(obligatoires()));
        produitsModele.fireTableStructureChanged();
        majCompteurs();
        allerA(2);
        message("Saisie directe : tapez les produits (CIP obligatoire), une ligne par produit. Entrée passe au champ suivant, "
                + "puis à la ligne suivante.", false);
        SwingUtilities.invokeLater(() -> editer(0, 1));
    }

    /* ------------------------------------------------------------- 2. Zones */

    LigneZone zone(Zone z) {
        for (LigneZone l : zones) {
            if (l.zone == z) {
                return l;
            }
        }
        throw new IllegalStateException(z.name());
    }

    private void appliquerCorrespondance(Correspondance c) {
        zones.removeIf(l -> l.zone == null);
        for (LigneZone l : zones) {
            l.source = c.getSource(l.zone) == null ? "" : c.getSource(l.zone);
            l.obligatoire = c.getObligatoires().contains(l.zone);
        }
        for (Map.Entry<String, String> a : c.getAjoutees().entrySet()) {
            LigneZone l = new LigneZone(null, a.getKey(), false);
            l.source = a.getValue();
            zones.add(l);
        }
        majApercuZones();
    }

    Correspondance correspondance() {
        Correspondance c = new Correspondance();
        for (LigneZone l : zones) {
            if (l.zone == null) {
                c.ajouter(l.nom, l.source);
            } else {
                c.source(l.zone, l.source).obligatoire(l.zone, l.obligatoire);
            }
        }
        return c;
    }

    Set<Zone> obligatoires() {
        Set<Zone> s = EnumSet.of(Zone.CIP);
        for (LigneZone l : zones) {
            if (l.zone != null && l.obligatoire) {
                s.add(l.zone);
            }
        }
        return s;
    }

    void majApercuZones() {
        if (tableau != null && !tableau.getLignes().isEmpty()) {
            Tableau premiere = new Tableau(tableau.getColonnes(), tableau.getLignes().subList(0, 1));
            LigneEtiquette l = correspondance().appliquer(premiere, avecTitres).get(0);
            for (LigneZone z : zones) {
                z.apercu = z.zone == null ? l.getAjoutees().getOrDefault(z.nom, "") : l.valeur(z.zone);
            }
        } else {
            zones.forEach(z -> z.apercu = "");
        }
        zonesModele.fireTableDataChanged();
        majColonnes();
    }

    /** Colonnes du fichier en cours (exemple, zone qui la reprend) et titres reconnus automatiquement par zone. */
    void majColonnes() {
        StringBuilder h = new StringBuilder("<html><body style='font-family:sans-serif;font-size:10px'>");
        String style = " style='border:1px solid #d5dde6;padding:2px 4px;text-align:left;vertical-align:top'";
        if (tableau != null) {
            List<String> premiere = tableau.getLignes().isEmpty() ? new ArrayList<>() : tableau.getLignes().get(0);
            h.append("<b>Colonnes du fichier en cours</b><table cellspacing='0' width='100%'><tr><th").append(style).append(">Colonne</th><th")
                    .append(style).append(">Exemple (1re ligne)</th><th").append(style).append(">Zone</th></tr>");
            for (int i = 0; i < tableau.getColonnes().size(); i++) {
                String c = tableau.getColonnes().get(i);
                List<String> noms = zonesDeLaColonne(c);
                h.append("<tr><td").append(style).append("><b>").append(echapper(c)).append("</b></td><td").append(style).append(">")
                        .append(echapper(i < premiere.size() ? premiere.get(i) : "")).append("</td><td").append(style).append(">")
                        .append(noms.isEmpty() ? "<font color='#8a94a0'>non utilisée</font>"
                                : "<font color='#17795f'>→ " + echapper(String.join(", ", noms)) + "</font>")
                        .append("</td></tr>");
            }
            h.append("</table><br>");
        }
        h.append("<b>Titres reconnus automatiquement</b> (accents et majuscules indifférents ; * obligatoire par défaut)")
                .append("<table cellspacing='0' width='100%'><tr><th").append(style).append(">Zone</th><th").append(style)
                .append(">Titres de colonne</th></tr>");
        for (Zone z : Zone.values()) {
            h.append("<tr><td").append(style).append("><b>").append(echapper(z.getLibelle())).append(z.isObligatoireParDefaut() ? " *" : "")
                    .append("</b></td><td").append(style).append(">").append(echapper(String.join(", ", z.getTitres()))).append("</td></tr>");
        }
        colonnes.setText(h.append("</table></body></html>").toString());
        colonnes.setCaretPosition(0);
    }

    /** Zones (et zones ajoutees) dont la source cite cette colonne. */
    List<String> zonesDeLaColonne(String colonne) {
        List<String> noms = new ArrayList<>();
        java.util.regex.Matcher m;
        for (LigneZone z : zones) {
            m = java.util.regex.Pattern.compile("\\{([^{}]+)\\}").matcher(z.source == null ? "" : z.source);
            while (m.find()) {
                if (Correspondance.normaliser(m.group(1)).equals(Correspondance.normaliser(colonne))) {
                    noms.add(z.nom);
                    break;
                }
            }
        }
        return noms;
    }

    /** Fichier modele : une colonne par zone et deux lignes d'exemple, pour essayer l'import. */
    void ecrireModele(File f) throws IOException {
        Files.write(f.toPath(), ("\ufeff" + Zone.fichierModele()).getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private void enregistrerModele() {
        JFileChooser c = new JFileChooser(reglages.get("dernierDossier", System.getProperty("user.home")));
        c.setSelectedFile(new File(c.getCurrentDirectory(), "etiquettage-pro-modele.csv"));
        if (c.showSaveDialog(this) == JFileChooser.APPROVE_OPTION) {
            try {
                ecrireModele(c.getSelectedFile());
                message("Fichier modèle enregistré : importez-le pour voir chaque colonne aller dans sa zone.", false);
            } catch (IOException e) {
                message("Enregistrement impossible : " + e.getMessage(), true);
            }
        }
    }

    final class ZonesModele extends AbstractTableModel {
        private static final long serialVersionUID = 1L;
        private final String[] cols = { "Zone de l'étiquette", "Obligatoire", "Source (colonne, texte fixe ou modèle)", "Aperçu (1re ligne)" };

        @Override
        public int getRowCount() {
            return zones.size();
        }

        @Override
        public int getColumnCount() {
            return cols.length;
        }

        @Override
        public String getColumnName(int c) {
            return cols[c];
        }

        @Override
        public Class<?> getColumnClass(int c) {
            return c == 1 ? Boolean.class : String.class;
        }

        @Override
        public boolean isCellEditable(int r, int c) {
            LigneZone l = zones.get(r);
            return c == 2 || (c == 0 && l.zone == null) || (c == 1 && l.zone != null && !l.zone.isToujoursObligatoire());
        }

        @Override
        public Object getValueAt(int r, int c) {
            LigneZone l = zones.get(r);
            switch (c) {
            case 0:
                return l.zone == null ? l.nom + " (ajoutée)" : l.nom;
            case 1:
                return l.zone != null && l.obligatoire;
            case 2:
                return l.source;
            default:
                return l.apercu;
            }
        }

        @Override
        public void setValueAt(Object v, int r, int c) {
            LigneZone l = zones.get(r);
            if (c == 0) {
                String n = String.valueOf(v).replace(" (ajoutée)", "").trim();
                if (!n.isEmpty()) {
                    l.nom = n;
                }
            } else if (c == 1) {
                l.obligatoire = Boolean.TRUE.equals(v);
            } else if (c == 2) {
                l.source = v == null ? "" : String.valueOf(v);
            }
            majApercuZones();
            majSuivant();
        }
    }

    private JComponent carteZones() {
        JPanel p = new JPanel(new BorderLayout());
        JButton ajouter = bouton("Ajouter une zone", "ajouterZone"), retirer = bouton("Retirer la zone ajoutée", "retirerZone");
        JButton proposer = bouton("Proposer d'après les titres", "proposer");
        ajouter.addActionListener(e -> {
            int n = 1;
            while (nomPris("Zone " + n)) {
                n++;
            }
            zones.add(new LigneZone(null, "Zone " + n, false));
            zonesModele.fireTableDataChanged();
        });
        retirer.addActionListener(e -> {
            int r = tableZones.getSelectedRow();
            if (r >= 0 && zones.get(r).zone == null) {
                zones.remove(r);
                majApercuZones();
            }
        });
        proposer.addActionListener(e -> {
            if (tableau != null) {
                Correspondance c = Correspondance.proposer(tableau);
                for (LigneZone l : zones) {
                    if (l.zone != null) {
                        l.source = c.getSource(l.zone) == null ? "" : c.getSource(l.zone);
                    }
                }
                majApercuZones();
                majSuivant();
            }
        });
        sources.setEditable(true);
        tableZones.getColumnModel().getColumn(2).setCellEditor(new DefaultCellEditor(sources));
        tableZones.setRowHeight(24);
        tableZones.getColumnModel().getColumn(0).setPreferredWidth(200);
        tableZones.getColumnModel().getColumn(1).setPreferredWidth(80);
        tableZones.getColumnModel().getColumn(2).setPreferredWidth(360);
        tableZones.getColumnModel().getColumn(3).setPreferredWidth(300);
        p.add(ligne(ajouter, retirer, proposer, new JLabel("<html><font color='#5b6b7b'>Choisissez une colonne, ou tapez un texte fixe ; "
                + "combinez avec {Colonne} (ex. « Lot {Lot} »). Une zone ajoutée est reprise par son nom : {Rayon}.</font></html>")), BorderLayout.NORTH);
        p.add(new JScrollPane(tableZones), BorderLayout.CENTER);
        return p;
    }

    private boolean nomPris(String n) {
        for (LigneZone l : zones) {
            if (Correspondance.normaliser(l.nom).equals(Correspondance.normaliser(n))) {
                return true;
            }
        }
        return false;
    }

    /** Lignes du fichier selon la correspondance (retenue pour les fichiers de meme forme). */
    void appliquer() {
        Correspondance c = correspondance();
        reglages.retenir(tableau.getColonnes(), c);
        ajoutees.clear();
        ajoutees.addAll(c.getAjoutees().keySet());
        produits.clear();
        produits.addAll(c.appliquer(tableau, avecTitres));
        produitsModele.fireTableStructureChanged();
        majCompteurs();
        List<String> inconnues = c.referencesInconnues(tableau);
        if (!inconnues.isEmpty()) {
            message("Colonne(s) introuvable(s) dans les modèles : " + String.join(", ", inconnues), true);
        }
    }

    /* ---------------------------------------------------------- 3. Produits */

    static final Zone[] COLONNES = { Zone.CIP, Zone.DESIGNATION, Zone.PRIX, Zone.GROSSISTE, Zone.LOT, Zone.PEREMPTION,
            Zone.EAN, Zone.NOMBRE, Zone.MENTION, Zone.DATE };

    final class ProduitsModele extends AbstractTableModel {
        private static final long serialVersionUID = 1L;

        @Override
        public int getRowCount() {
            return produits.size();
        }

        @Override
        public int getColumnCount() {
            return 2 + COLONNES.length + ajoutees.size();
        }

        @Override
        public String getColumnName(int c) {
            if (c == 0) {
                return "N°";
            }
            if (c <= COLONNES.length) {
                return COLONNES[c - 1] == Zone.NOMBRE ? "Nb étiq." : COLONNES[c - 1].getLibelle() + (COLONNES[c - 1] == Zone.CIP ? " *" : "");
            }
            if (c <= COLONNES.length + ajoutees.size()) {
                return ajoutees.get(c - COLONNES.length - 1);
            }
            return "Contrôle";
        }

        @Override
        public boolean isCellEditable(int r, int c) {
            return c > 0 && c <= COLONNES.length + ajoutees.size();
        }

        @Override
        public Object getValueAt(int r, int c) {
            LigneEtiquette l = produits.get(r);
            if (c == 0) {
                return l.getNumero();
            }
            if (c <= COLONNES.length) {
                return l.valeur(COLONNES[c - 1]);
            }
            if (c <= COLONNES.length + ajoutees.size()) {
                return l.getAjoutees().getOrDefault(ajoutees.get(c - COLONNES.length - 1), "");
            }
            if (!l.getErreurs().isEmpty()) {
                return "⛔ " + String.join(" ; ", l.getErreurs());
            }
            if (!l.getAvertissements().isEmpty()) {
                return "⚠ " + String.join(" ; ", l.getAvertissements());
            }
            return "✔ " + l.getNombre() + " étiquette(s)";
        }

        @Override
        public void setValueAt(Object v, int r, int c) {
            LigneEtiquette l = produits.get(r);
            String s = v == null ? "" : String.valueOf(v);
            if (c <= COLONNES.length) {
                l.valeur(COLONNES[c - 1], s);
            } else {
                l.ajoutee(ajoutees.get(c - COLONNES.length - 1), s);
            }
            l.valider(obligatoires());
            fireTableRowsUpdated(r, r);
            majCompteurs();
        }
    }

    /*
     * Retours du 25/10 (point 7), comme dans Prestige : en saisie a la main, Entree enchaine CIP, designation, prix, lot,
     * peremption et nombre d'etiquettes, puis ouvre la ligne suivante (creee si besoin). Les autres colonnes restent a la
     * souris ou a la tabulation. Un fichier importe garde le comportement habituel d'Entree.
     */
    static final Zone[] ENCHAINEMENT = { Zone.CIP, Zone.DESIGNATION, Zone.PRIX, Zone.LOT, Zone.PEREMPTION, Zone.NOMBRE };

    void ajouterLigne() {
        int n = 0;
        for (LigneEtiquette l : produits) {
            n = Math.max(n, l.getNumero());
        }
        produits.add(new LigneEtiquette(n + 1).valeur(Zone.NOMBRE, "1").valider(obligatoires()));
        produitsModele.fireTableDataChanged();
        majCompteurs();
        majSuivant();
    }

    void editer(int ligne, int colonne) {
        if (ligne < 0 || ligne >= tableProduits.getRowCount()) {
            return;
        }
        int vue = tableProduits.convertColumnIndexToView(colonne);
        tableProduits.changeSelection(ligne, vue, false, false);
        if (tableProduits.editCellAt(ligne, vue)) {
            Component c = tableProduits.getEditorComponent();
            if (c instanceof JTextField) {
                ((JTextField) c).selectAll();
            }
            if (c != null) {
                c.requestFocusInWindow();
            }
        }
    }

    /** Colonne (du modele) qui suit dans l'enchainement, ou -1 apres le nombre d'etiquettes (ligne suivante). */
    static int colonneSuivante(int colonne) {
        Zone z = colonne >= 1 && colonne <= COLONNES.length ? COLONNES[colonne - 1] : null;
        int k = -1;
        for (int i = 0; i < ENCHAINEMENT.length; i++) {
            if (ENCHAINEMENT[i] == z) {
                k = i;
            }
        }
        if (k >= 0) {
            return k + 1 < ENCHAINEMENT.length ? colonne(ENCHAINEMENT[k + 1]) : -1;
        }
        /* colonne hors enchainement : la prochaine de l'enchainement a sa droite */
        for (Zone e : ENCHAINEMENT) {
            if (colonne(e) > colonne) {
                return colonne(e);
            }
        }
        return -1;
    }

    private static int colonne(Zone z) {
        for (int i = 0; i < COLONNES.length; i++) {
            if (COLONNES[i] == z) {
                return i + 1;
            }
        }
        return -1;
    }

    private void enchainementClavier() {
        final JTextField champ = new JTextField();
        champ.setBorder(BorderFactory.createLineBorder(new Color(0x1E, 0x3A, 0x5F)));
        tableProduits.setDefaultEditor(Object.class, new DefaultCellEditor(champ));
        final KeyStroke entree = KeyStroke.getKeyStroke(KeyEvent.VK_ENTER, 0);
        InputMap carte = tableProduits.getInputMap(JComponent.WHEN_ANCESTOR_OF_FOCUSED_COMPONENT);
        final Object habituelle = carte.get(entree);
        final Action deplacement = habituelle == null ? null : tableProduits.getActionMap().get(habituelle);
        Action suivant = new AbstractAction() {
            private static final long serialVersionUID = 1L;

            @Override
            public void actionPerformed(ActionEvent e) {
                int ligne = tableProduits.isEditing() ? tableProduits.getEditingRow() : tableProduits.getSelectedRow();
                int colonne = tableProduits.convertColumnIndexToModel(tableProduits.isEditing() ? tableProduits.getEditingColumn()
                        : tableProduits.getSelectedColumn());
                if (tableau != null || ligne < 0 || colonne < 0) {
                    if (tableProduits.isEditing()) {
                        tableProduits.getCellEditor().stopCellEditing();
                    }
                    if (deplacement != null) {
                        deplacement.actionPerformed(new ActionEvent(tableProduits, ActionEvent.ACTION_PERFORMED, null));
                    }
                    return;
                }
                if (tableProduits.isEditing() && !tableProduits.getCellEditor().stopCellEditing()) {
                    return;
                }
                int c = colonneSuivante(colonne);
                if (c > 0) {
                    editer(ligne, c);
                    return;
                }
                if (ligne == produits.size() - 1) {
                    ajouterLigne();
                }
                editer(ligne + 1, 1);
            }
        };
        tableProduits.getActionMap().put("etiquettageSuivant", suivant);
        carte.put(entree, "etiquettageSuivant");
        champ.getInputMap(JComponent.WHEN_FOCUSED).put(entree, "etiquettageSuivant");
        champ.getActionMap().put("etiquettageSuivant", suivant);
    }

    private JComponent carteProduits() {
        JPanel p = new JPanel(new BorderLayout());
        JButton ajouter = bouton("Ajouter une ligne", "ajouterLigne"), supprimer = bouton("Supprimer les lignes choisies", "supprimerLignes");
        ajouter.addActionListener(e -> {
            ajouterLigne();
            tableProduits.editCellAt(produits.size() - 1, 1);
        });
        enchainementClavier();
        supprimer.addActionListener(e -> {
            int[] choisies = tableProduits.getSelectedRows();
            for (int i = choisies.length - 1; i >= 0; i--) {
                produits.remove(tableProduits.convertRowIndexToModel(choisies[i]));
            }
            produitsModele.fireTableDataChanged();
            majCompteurs();
            majSuivant();
        });
        tableProduits.setRowHeight(22);
        tableProduits.setDefaultRenderer(Object.class, new DefaultTableCellRenderer() {
            private static final long serialVersionUID = 1L;

            @Override
            public Component getTableCellRendererComponent(JTable t, Object v, boolean choisie, boolean focus, int r, int c) {
                Component x = super.getTableCellRendererComponent(t, v, choisie, focus, r, c);
                LigneEtiquette l = produits.get(t.convertRowIndexToModel(r));
                if (!choisie) {
                    x.setBackground(l.imprimable() ? Color.WHITE : FOND_ERREUR);
                }
                x.setForeground(c == t.getColumnCount() - 1 ? (l.imprimable() ? (l.getAvertissements().isEmpty() ? VERT : new Color(0xB2, 0x6A, 0x00)) : ROUGE)
                        : choisie ? t.getSelectionForeground() : Color.BLACK);
                return x;
            }
        });
        tableProduits.putClientProperty("terminateEditOnFocusLost", Boolean.TRUE);
        p.add(ligne(ajouter, supprimer, compteurs), BorderLayout.NORTH);
        p.add(new JScrollPane(tableProduits), BorderLayout.CENTER);
        return p;
    }

    void majCompteurs() {
        int erreurs = 0;
        for (LigneEtiquette l : produits) {
            if (!l.imprimable()) {
                erreurs++;
            }
        }
        compteurs.setText("<html>" + produits.size() + " ligne(s) ; <b><font color='" + (erreurs > 0 ? "#b42318" : "#17795f") + "'>" + erreurs
                + " en erreur (non imprimée" + (erreurs > 1 ? "s" : "") + ")</font></b> ; <b>" + MoteurEtiquettes.total(produits)
                + " étiquette(s)</b></html>");
    }

    /* -------------------------------------------------------- 4. Impression */

    private JComponent carteImpression() {
        JPanel gauche = new JPanel(new GridBagLayout());
        GridBagConstraints g = new GridBagConstraints();
        g.insets = new Insets(4, 6, 4, 6);
        g.anchor = GridBagConstraints.WEST;
        g.gridy = 0;
        ButtonGroup groupe = new ButtonGroup();
        for (JRadioButton b : new JRadioButton[] { codeBarres, dataMatrix, qr }) {
            groupe.add(b);
            b.addActionListener(e -> majResume());
        }
        codeBarres.setName("CODE128");
        dataMatrix.setName("DATAMATRIX");
        qr.setName("QR");
        String type = reglages.get("code", LabelSheetPdf.CODE_BARRES);
        (LabelSheetPdf.DATAMATRIX.equals(type) ? dataMatrix : LabelSheetPdf.QR.equals(type) ? qr : codeBarres).setSelected(true);
        for (String[] m : MODELES) {
            modele.addItem(m[1]);
        }
        String m = reglages.get("modele", LabelSheetPdf.MODELE_CARRE_38X21_2);
        for (int i = 0; i < MODELES.length; i++) {
            if (MODELES[i][0].equals(m)) {
                modele.setSelectedIndex(i);
            }
        }
        modele.addActionListener(e -> majFormat());
        position.addChangeListener(e -> majResume());
        officine.setText(reglages.get("officine", ""));
        monnaie.setText(reglages.get("monnaie", "CFA"));
        date.setText(LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yy")));
        prefixe.setText(registre.getPrefixe());
        prefixe.setEditable(false);
        Object[][] champs = { { "Type de code", ligne(codeBarres) }, { "", ligne(dataMatrix) }, { "", ligne(qr) },
                { "Planche", modele }, { "Commencer à la position", position }, { "Nom de la pharmacie", officine },
                { "Monnaie du prix", monnaie }, { "Date (code-barres standard)", date },
                { "Préfixe des codes de ce poste", prefixe } };
        for (Object[] c : champs) {
            g.gridx = 0;
            g.weightx = 0;
            gauche.add(new JLabel((String) c[0]), g);
            g.gridx = 1;
            gauche.add((Component) c[1], g);
            g.gridy++;
        }
        JButton test = bouton("Page de test…", "pageTest"), imprimer = bouton("Générer le PDF…", "imprimer");
        test.addActionListener(e -> enregistrerEtOuvrir(true));
        imprimer.addActionListener(e -> enregistrerEtOuvrir(false));
        g.gridx = 0;
        g.gridwidth = 2;
        gauche.add(resume, g);
        g.gridy++;
        gauche.add(ligne(test, imprimer), g);

        JPanel droite = new JPanel(new GridBagLayout());
        droite.setBorder(BorderFactory.createTitledBorder("Format de la planche et calage"));
        GridBagConstraints d = new GridBagConstraints();
        d.insets = new Insets(3, 6, 3, 6);
        d.anchor = GridBagConstraints.WEST;
        d.gridy = 0;
        for (Object[] r : REGLAGES) {
            String cle = (String) r[0];
            double valeur = Double.parseDouble(reglages.get(cle, defaut(cle)).replace(',', '.'));
            JSpinner s = new JSpinner(new SpinnerNumberModel(valeur, (double) r[2], (double) r[3], (double) r[4]));
            s.setName(cle);
            s.addChangeListener(e -> majResume());
            champsReglages.put(cle, s);
            d.gridx = 0;
            droite.add(new JLabel((String) r[1]), d);
            d.gridx = 1;
            droite.add(s, d);
            d.gridy++;
        }
        JPanel p = new JPanel(new FlowLayout(FlowLayout.LEFT, 20, 10));
        p.add(gauche);
        p.add(droite);
        majFormat();
        return new JScrollPane(p);
    }

    static String defaut(String cle) {
        switch (cle) {
        case LabelSheetPdf.KEY_NB_COLONNES:
            return "5";
        case LabelSheetPdf.KEY_NB_LIGNES:
            return "13";
        case LabelSheetPdf.KEY_LARGEUR_MM:
            return "38";
        case LabelSheetPdf.KEY_HAUTEUR_MM:
            return "21.2";
        case LabelSheetPdf.KEY_ECHELLE_POURCENT:
            return "100";
        default:
            return "0";
        }
    }

    String modeleChoisi() {
        return MODELES[Math.max(0, modele.getSelectedIndex())][0];
    }

    void majFormat() {
        boolean libre = LabelSheetPdf.MODELE_PERSONNALISE.equals(modeleChoisi());
        for (Object[] r : REGLAGES) {
            JSpinner s = champsReglages.get(r[0]);
            if (s != null) {
                s.setEnabled(!(Boolean) r[5] || libre);
            }
        }
        majResume();
    }

    String typeCode() {
        return dataMatrix.isSelected() ? LabelSheetPdf.DATAMATRIX : qr.isSelected() ? LabelSheetPdf.QR : LabelSheetPdf.CODE_BARRES;
    }

    OptionsImpression options() {
        OptionsImpression o = new OptionsImpression().typeCode(typeCode()).modele(modeleChoisi())
                .positionDepart((Integer) position.getValue()).officine(officine.getText()).monnaie(monnaie.getText())
                .dateParDefaut(date.getText());
        for (Object[] r : REGLAGES) {
            JSpinner s = champsReglages.get(r[0]);
            if (s == null || !s.isEnabled()) {
                continue;
            }
            double v = ((Number) s.getValue()).doubleValue();
            /* marges a 0 : grille centree (comme une marge non renseignee dans Prestige) */
            if (v == 0 && (LabelSheetPdf.KEY_MARGE_GAUCHE_MM.equals(r[0]) || LabelSheetPdf.KEY_MARGE_HAUT_MM.equals(r[0]))) {
                continue;
            }
            o.reglage((String) r[0], v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v));
        }
        return o;
    }

    int parPage() {
        return options().planche(null).perPage();
    }

    void majResume() {
        if (champsReglages.isEmpty()) {
            return;
        }
        int parPage = parPage();
        ((SpinnerNumberModel) position.getModel()).setMaximum(parPage);
        if ((Integer) position.getValue() > parPage) {
            position.setValue(parPage);
        }
        int n = MoteurEtiquettes.total(produits);
        int pages = n == 0 ? 0 : (n + (Integer) position.getValue() - 1 + parPage - 1) / parPage;
        resume.setText("<html><b>" + n + "</b> étiquette(s), " + parPage + " par planche : <b>" + pages + "</b> planche(s)."
                + (n == 0 ? "<br><font color='#b42318'>Aucune étiquette à imprimer : vérifiez les produits.</font>" : "") + "</html>");
    }

    private void retenirReglages() {
        reglages.set("code", typeCode());
        reglages.set("modele", modeleChoisi());
        reglages.set("officine", officine.getText().trim());
        reglages.set("monnaie", monnaie.getText().trim());
        for (Map.Entry<String, JSpinner> e : champsReglages.entrySet()) {
            reglages.set(e.getKey(), String.valueOf(e.getValue().getValue()));
        }
        reglages.enregistrer();
    }

    /** Ecrit le PDF (planche ou page de test) dans ce fichier ; le nombre d'etiquettes imprimees. */
    int ecrirePdf(File f, boolean pageDeTest) throws Exception {
        if (tableProduits.isEditing()) {
            tableProduits.getCellEditor().stopCellEditing();
        }
        retenirReglages();
        try (OutputStream out = new FileOutputStream(f)) {
            if (pageDeTest) {
                MoteurEtiquettes.pageDeTest(out, options(), null);
                return 0;
            }
            MoteurEtiquettes.pdf(out, produits, options(), registre, null);
            return MoteurEtiquettes.total(produits);
        }
    }

    private void enregistrerEtOuvrir(boolean pageDeTest) {
        JFileChooser c = new JFileChooser(reglages.get("dossierPdf", System.getProperty("user.home")));
        c.setSelectedFile(new File(c.getCurrentDirectory(), (pageDeTest ? "etiquettes_test_" : "etiquettes_")
                + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + ".pdf"));
        c.setFileFilter(new FileNameExtensionFilter("Document PDF", "pdf"));
        if (c.showSaveDialog(this) != JFileChooser.APPROVE_OPTION) {
            return;
        }
        File f = c.getSelectedFile().getName().toLowerCase().endsWith(".pdf") ? c.getSelectedFile()
                : new File(c.getSelectedFile().getPath() + ".pdf");
        reglages.set("dossierPdf", f.getParent());
        try {
            int n = ecrirePdf(f, pageDeTest);
            message(pageDeTest ? "Page de test enregistrée : imprimez-la à 100 % et superposez-la sur une planche."
                    : n + " étiquette(s) enregistrée(s) dans " + f.getName(), false);
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.OPEN)) {
                Desktop.getDesktop().open(f);
            }
        } catch (IllegalArgumentException e) {
            message(e.getMessage(), true);
        } catch (Exception e) {
            message("PDF impossible : " + e.getMessage(), true);
        }
    }
}
