package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import dal.TCompteClientTiersPayant;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TTiersPayant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.ticket.CreditLigne;

/**
 * Photo du 05/11 : vente de 1 000 F, CNAM (priorite 1, 70 %) paie 700 F, MUPEMENET (priorite 2, 70 % du reste) paie 300
 * F. Les deux taux valent 70 % : le ticket les rangeait au hasard et le plafond a 100 % donnait « MUPEMENET [70%] 300 »
 * et « CNAM [30%] 700 ».
 */
class TicketOrdreTiersPayantTest {

    private static TPreenregistrementCompteClientTiersPayent part(String nom, Integer priorite, int taux, int montant) {
        TTiersPayant tp = new TTiersPayant();
        tp.setStrNAME(nom);
        TCompteClientTiersPayant c = new TCompteClientTiersPayant();
        c.setLgTIERSPAYANTID(tp);
        c.setIntPRIORITY(priorite);
        c.setIntPOURCENTAGE(taux);
        TPreenregistrementCompteClientTiersPayent p = new TPreenregistrementCompteClientTiersPayent();
        p.setLgCOMPTECLIENTTIERSPAYANTID(c);
        p.setIntPERCENT(taux);
        p.setIntPRICE(montant);
        return p;
    }

    private static List<String> noms(List<TPreenregistrementCompteClientTiersPayent> l) {
        List<String> r = new ArrayList<>();
        l.forEach(p -> r.add(p.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrNAME()));
        return r;
    }

    private static List<Integer> tauxAffiches(List<TPreenregistrementCompteClientTiersPayent> l) {
        List<Integer> t = new ArrayList<>();
        l.forEach(p -> t.add(p.getIntPERCENT()));
        return CreditLigne.tauxAffiches(t);
    }

    @Test
    void lePrincipalPasseDevantQuandLesTauxSontEgaux() {
        List<TPreenregistrementCompteClientTiersPayent> l = GenerateTicketServiceImpl
                .parPriorite(Arrays.asList(part("MUPEMENET", 2, 70, 300), part("CNAM", 1, 70, 700)));
        assertEquals(Arrays.asList("CNAM", "MUPEMENET"), noms(l));
        assertEquals(Arrays.asList(70, 30), tauxAffiches(l), "CNAM [70%] 700, MUPEMENET [30%] 300");
    }

    @Test
    void laPrioriteCompteAvantLeTaux() {
        // complementaire a 100 % du reste : le principal garde ses 60 %, le complementaire est affiche a 40 %
        List<TPreenregistrementCompteClientTiersPayent> l = GenerateTicketServiceImpl
                .parPriorite(Arrays.asList(part("RC", 2, 100, 400), part("RO", 1, 60, 600)));
        assertEquals(Arrays.asList("RO", "RC"), noms(l));
        assertEquals(Arrays.asList(60, 40), tauxAffiches(l));
    }

    @Test
    void sansPrioriteLOrdreDuTauxEstGarde() {
        List<TPreenregistrementCompteClientTiersPayent> l = GenerateTicketServiceImpl
                .parPriorite(Arrays.asList(part("A", null, 80, 800), part("B", null, 20, 200)));
        assertEquals(Arrays.asList("A", "B"), noms(l));
        List<TPreenregistrementCompteClientTiersPayent> m = GenerateTicketServiceImpl
                .parPriorite(Arrays.asList(part("B", 1, 20, 200), part("A", null, 80, 800)));
        assertEquals(Arrays.asList("B", "A"), noms(m), "un organisme sans priorite passe apres les autres");
    }
}
