package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.boatclass.BoatClassDto;
import java.util.List;
import java.util.Optional;

public interface BoatClassService {

    /**
     * Get all boat classes ordered by name
     */
    List<BoatClassDto> getAllBoatClasses();

    /**
     * Get distinct boat types for dropdown options
     */
    List<String> getDistinctBoatTypes();

    /**
     * Get distinct seat count texts for dropdown options
     */
    List<String> getDistinctSeatCountTexts();

    /**
     * Get boat class by ID
     */
    Optional<BoatClassDto> getBoatClassById(Integer id);

    /**
     * Find boat class by name
     */
    Optional<BoatClassDto> getBoatClassByName(String name);
}