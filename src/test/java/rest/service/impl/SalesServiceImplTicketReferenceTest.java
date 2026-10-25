package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;

class SalesServiceImplTicketReferenceTest {

    @Test
    void keepsTicketReferenceCreatedWithPreSale() {
        AtomicBoolean generatorCalled = new AtomicBoolean(false);

        String result = SalesServiceImpl.resolveTicketReference("1234567890", () -> {
            generatorCalled.set(true);
            return "0987654321";
        });

        assertEquals("1234567890", result);
        assertFalse(generatorCalled.get());
    }

    @Test
    void generatesTicketReferenceForLegacyPreSale() {
        AtomicBoolean generatorCalled = new AtomicBoolean(false);

        String result = SalesServiceImpl.resolveTicketReference(null, () -> {
            generatorCalled.set(true);
            return "0987654321";
        });

        assertEquals("0987654321", result);
        assertTrue(generatorCalled.get());
    }
}
