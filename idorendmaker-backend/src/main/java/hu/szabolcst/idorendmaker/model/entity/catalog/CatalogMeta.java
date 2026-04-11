package hu.szabolcst.idorendmaker.model.entity.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Catalog metadata key-value table. One row per metadata key
 * (schema_version, catalog_version, generated_at, source, etc.).
 */
@Getter
@Setter
@Entity
@Table(name = "catalog_meta")
public class CatalogMeta {

    @Id
    @Column(name = "key")
    private String key;

    @Column(name = "value")
    private String value;
}
