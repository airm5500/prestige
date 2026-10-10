package rest;

import commonTasks.dto.AyantDroitDTO;
import commonTasks.dto.ClientDTO;
import commonTasks.dto.ClientLambdaDTO;
import commonTasks.dto.TiersPayantDTO;
import java.util.Locale;

/**
 * Retours du 10/10 : les noms et references saisis a la vente (client, ayant droit, tiers payant, matricule) sont
 * enregistres en majuscules. Ni les e-mails, ni les adresses, ni les telephones ne sont touches.
 */
public final class Majuscules {

    private Majuscules() {
    }

    /** Texte en majuscules (francais : accents conserves), espaces de bord retires ; null reste null. */
    public static String texte(String s) {
        return s == null ? null : s.trim().toUpperCase(Locale.FRENCH);
    }

    public static ClientLambdaDTO appliquer(ClientLambdaDTO c) {
        if (c != null) {
            c.setStrFIRSTNAME(texte(c.getStrFIRSTNAME()));
            c.setStrLASTNAME(texte(c.getStrLASTNAME()));
        }
        return c;
    }

    public static ClientDTO appliquer(ClientDTO c) {
        if (c != null) {
            c.setStrFIRSTNAME(texte(c.getStrFIRSTNAME()));
            c.setStrLASTNAME(texte(c.getStrLASTNAME()));
            c.setStrNUMEROSECURITESOCIAL(texte(c.getStrNUMEROSECURITESOCIAL()));
        }
        return c;
    }

    public static AyantDroitDTO appliquer(AyantDroitDTO a) {
        if (a != null) {
            a.setStrFIRSTNAME(texte(a.getStrFIRSTNAME()));
            a.setStrLASTNAME(texte(a.getStrLASTNAME()));
            a.setStrNUMEROSECURITESOCIAL(texte(a.getStrNUMEROSECURITESOCIAL()));
        }
        return a;
    }

    public static TiersPayantDTO appliquer(TiersPayantDTO t) {
        if (t != null) {
            t.setStrNAME(texte(t.getStrNAME()));
            t.setStrFULLNAME(texte(t.getStrFULLNAME()));
            t.setStrCODEORGANISME(texte(t.getStrCODEORGANISME()));
        }
        return t;
    }
}
