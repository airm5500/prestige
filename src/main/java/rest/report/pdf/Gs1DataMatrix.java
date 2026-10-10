package rest.report.pdf;

import java.util.ArrayList;
import java.util.List;
import org.krysalis.barcode4j.impl.datamatrix.DataMatrixErrorCorrection;
import org.krysalis.barcode4j.impl.datamatrix.DataMatrixPlacement;
import org.krysalis.barcode4j.impl.datamatrix.DataMatrixSymbolInfo;
import org.krysalis.barcode4j.impl.datamatrix.SymbolShapeHint;

/**
 * Retours du 10/10 (point 5) : DataMatrix ECC 200 au format GS1 (FNC1 en tete), sans nouvelle dependance.
 * <p>
 * barcode4j 2.1 ne sait pas mettre le FNC1 (il encode le caractere tel quel) : on compose ici les mots de code en mode
 * ASCII (FNC1 = 232, paires de chiffres = 130 + n, caractere = code + 1, GS = 30), avec le bourrage normalise, puis on
 * reprend de barcode4j le choix de la taille, la correction d'erreurs Reed-Solomon et le placement des modules.
 * </p>
 */
public final class Gs1DataMatrix {

    private Gs1DataMatrix() {
    }

    /** Mots de code de donnees (sans bourrage) d'une chaine GS1 brute. */
    static List<Integer> motsDeCode(String brute) {
        List<Integer> m = new ArrayList<>();
        m.add(232); // FNC1 : symbole GS1
        int i = 0;
        while (i < brute.length()) {
            char c = brute.charAt(i);
            if (Character.isDigit(c) && i + 1 < brute.length() && Character.isDigit(brute.charAt(i + 1))) {
                m.add(130 + (c - '0') * 10 + (brute.charAt(i + 1) - '0'));
                i += 2;
            } else if (c < 128) {
                m.add(c + 1);
                i++;
            } else {
                throw new IllegalArgumentException("Caractère non pris en charge dans une étiquette GS1 : " + c);
            }
        }
        return m;
    }

    /** Matrice du symbole complet (motifs de reperage compris) : [ligne][colonne], vrai = module noir. */
    public static boolean[][] matrice(String brute) {
        List<Integer> donnees = motsDeCode(brute);
        DataMatrixSymbolInfo info = DataMatrixSymbolInfo.lookup(donnees.size(), SymbolShapeHint.FORCE_SQUARE);
        StringBuilder cw = new StringBuilder();
        donnees.forEach(v -> cw.append((char) v.intValue()));
        /* bourrage : 129, puis valeurs pseudo-aleatoires (algorithme des 253 etats) */
        for (int pos = cw.length() + 1; cw.length() < info.dataCapacity; pos++) {
            if (cw.length() == donnees.size()) {
                cw.append((char) 129);
            } else {
                int v = 129 + ((149 * pos) % 253) + 1;
                cw.append((char) (v <= 254 ? v : v - 254));
            }
        }
        String complet = DataMatrixErrorCorrection.encodeECC200(cw.toString(), info);
        int largeurDonnees = info.getSymbolDataWidth(), hauteurDonnees = info.getSymbolDataHeight();
        final boolean[] bits = new boolean[largeurDonnees * hauteurDonnees];
        final boolean[] poses = new boolean[largeurDonnees * hauteurDonnees];
        DataMatrixPlacement placement = new DataMatrixPlacement(complet, largeurDonnees, hauteurDonnees) {
            @Override
            protected void setBit(int col, int row, boolean bit) {
                bits[row * numcols + col] = bit;
                poses[row * numcols + col] = true;
            }

            @Override
            protected boolean getBit(int col, int row) {
                return bits[row * numcols + col];
            }

            @Override
            protected boolean hasBit(int col, int row) {
                return poses[row * numcols + col];
            }
        };
        placement.place();
        int largeur = info.getSymbolWidth(), hauteur = info.getSymbolHeight();
        int regionL = info.matrixWidth, regionH = info.matrixHeight;
        boolean[][] m = new boolean[hauteur][largeur];
        for (int y = 0; y < hauteur; y++) {
            int ry = y % (regionH + 2);
            for (int x = 0; x < largeur; x++) {
                int rx = x % (regionL + 2);
                boolean v;
                if (ry == regionH + 1) {
                    v = true; // bord bas plein
                } else if (rx == 0) {
                    v = true; // bord gauche plein
                } else if (ry == 0) {
                    v = x % 2 == 0; // bord haut alterne
                } else if (rx == regionL + 1) {
                    v = y % 2 == 1; // bord droit alterne
                } else {
                    int dx = (x / (regionL + 2)) * regionL + rx - 1, dy = (y / (regionH + 2)) * regionH + ry - 1;
                    v = bits[dy * largeurDonnees + dx];
                }
                m[y][x] = v;
            }
        }
        return m;
    }
}
