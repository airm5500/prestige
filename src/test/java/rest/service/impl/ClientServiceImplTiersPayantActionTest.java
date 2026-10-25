package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.TCompteClientTiersPayant;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import util.Constant;

class ClientServiceImplTiersPayantActionTest {

    @Test
    void onlyExplicitAssociateActionKeepsExistingTiersPayant() {
        assertTrue(ClientServiceImpl.isAssociateTiersPayantAction(" ASSOCIATE "));
        assertFalse(ClientServiceImpl.isAssociateTiersPayantAction("REPLACE"));
        assertFalse(ClientServiceImpl.isAssociateTiersPayantAction(null));
    }

    @Test
    void complementaryPriorityComesAfterActiveLinksOnly() {
        TCompteClientTiersPayant principal = link(Constant.STATUT_ENABLE, 1);
        TCompteClientTiersPayant complementaire = link(Constant.STATUT_ENABLE, 3);
        TCompteClientTiersPayant supprime = link(Constant.STATUT_DELETE, 12);

        assertEquals(4, ClientServiceImpl.nextTiersPayantPriority(
                Arrays.asList(principal, complementaire, supprime)));
    }

    private TCompteClientTiersPayant link(String status, int priority) {
        TCompteClientTiersPayant link = new TCompteClientTiersPayant();
        link.setStrSTATUT(status);
        link.setIntPRIORITY(priority);
        return link;
    }
}
