package hu.szabolcst.idorendmaker.model.dto.race;

import java.util.List;
import lombok.Data;

/**
 * Read-only projection of a catalog {@code races} row with its associated
 * age groups. Identifiers are the catalog's string {@code code} values. The
 * boat class is exposed as a flat {@code boatClassCode} string; frontends
 * that need the boat-class display name look it up via the boat-class
 * endpoint. We dropped the nested {@code boatClassData} object (previously
 * a full {@code BoatClassDto}) to keep the catalog-facing mapper free of
 * joins the new entity no longer has.
 */
@Data
public class RaceWithAgeGroupsAndBoatClassDto {

    private String code;
    /**
     * Legacy integer id. Retained only so Phase 4b user services
     * ({@code CompetitorServiceImpl}, {@code ScheduleMapper}) keep
     * compiling until they're rewritten to the string-code contract.
     * Populated only by the legacy entity path; the catalog path leaves
     * this null. The REST API contract is {@code code}.
     *
     * @deprecated will be removed in Phase 4b.
     */
    @Deprecated
    private Integer id;
    private String name;
    private String discipline;
    private String boatClassCode;
    private String gender;
    private String distance;
    private Boolean hidden;
    private Integer sortOrder;
    private List<AgeGroupDto> ageGroups;

}
