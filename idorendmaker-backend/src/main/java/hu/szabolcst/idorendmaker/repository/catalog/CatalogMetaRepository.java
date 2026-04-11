package hu.szabolcst.idorendmaker.repository.catalog;

import hu.szabolcst.idorendmaker.model.entity.catalog.CatalogMeta;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface CatalogMetaRepository extends Repository<CatalogMeta, String> {
    Optional<CatalogMeta> findById(String key);
}
