package hu.szabolcst.idorendmaker.model.dto.boatclass;

import lombok.Data;

@Data
public class BoatClassDto {

    private String code;
    private String name;                // e.g., "Kajak egyes", "Kajak páros"
    private String boatTypeCode;        // FK to boat_types.code
    private Integer seatCount;          // e.g., 1, 2, 4, 20, null for "csapat"
    private String seatCountText;       // e.g., "1", "2", "4", "20", "csapat"

}
