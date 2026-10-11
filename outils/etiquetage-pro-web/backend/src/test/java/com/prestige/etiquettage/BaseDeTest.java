package com.prestige.etiquettage;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

/**
 * Tests sur une base dediee (bd_etiquette_test) du MariaDB de developpement, creee et migree par Flyway ; jamais la base
 * de Prestige ni une base de production. Adresse donnee par ETIQUETTAGE_TEST_DB_URL si besoin.
 */
@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=${ETIQUETTAGE_TEST_DB_URL:jdbc:mariadb://127.0.0.1:3306/bd_etiquette_test?createDatabaseIfNotExist=true}",
        "spring.datasource.username=${ETIQUETTAGE_TEST_DB_USER:etiquettage_test}",
        "spring.datasource.password=${ETIQUETTAGE_TEST_DB_PASSWORD:etiquettage_test}",
        "etiquettage.ouvrir-navigateur=false" })
public abstract class BaseDeTest {

    static {
        System.setProperty("etiquettage.base", "externe");
    }
}
