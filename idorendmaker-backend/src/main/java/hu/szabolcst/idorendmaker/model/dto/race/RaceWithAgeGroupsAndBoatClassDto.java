package hu.szabolcst.idorendmaker.model.dto.race;

import java.util.List;
import lombok.Data;

/**
 * Read-only projection of a catalog {@code races} row with its associated
 * age groups. Identifiers are the catalog's string {@code code} values. The
 * boat class is flattened onto this DTO: {@code boatClassCode} plus the
 * resolved {@code boatClassName}, {@code boatTypeCode}, {@code seatCount}
 * and {@code seatCountText}. We dropped the nested {@code boatClassData}
 * object (previously a full {@code BoatClassDto}) to keep the catalog-facing
 * mapper free of joins the new entity no longer has; the service layer
 * stitches the boat class in from a bulk-loaded code-→entity map instead.
 */
@Data
public class RaceWithAgeGroupsAndBoatClassDto {

    private String code;
    private String name;
    private String discipline;
    private String boatClassCode;
    private String boatClassName;
    private String boatTypeCode;
    private Integer seatCount;
    private String seatCountText;
    private String gender;
    private String distance;
    private Boolean hidden;
    private Integer sortOrder;
    private List<AgeGroupDto> ageGroups;

}
