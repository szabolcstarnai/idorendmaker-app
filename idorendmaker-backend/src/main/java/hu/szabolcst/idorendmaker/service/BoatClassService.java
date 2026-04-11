package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.boatclass.BoatClassDto;
import java.util.List;
import java.util.Optional;

public interface BoatClassService {

    /**
     * Get all boat classes ordered by name.
     */
    List<BoatClassDto> getAllBoatClasses();

    /**
     * Get distinct boat type codes for dropdown options. The catalog
     * {@code boat_classes.boat_type_code} is an FK to {@code boat_types.code};
     * callers that need display names resolve them via the boat-types
     * endpoint.
     */
    List<String> getDistinctBoatTypes();

    /**
     * Get distinct seat count texts for dropdown options.
     */
    List<String> getDistinctSeatCountTexts();

    /**
     * Get boat class by catalog {@code code}.
     */
    Optional<BoatClassDto> getBoatClassByCode(String code);

    /**
     * Find boat class by name.
     */
    Optional<BoatClassDto> getBoatClassByName(String name);
}
