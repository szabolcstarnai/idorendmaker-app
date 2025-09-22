package hu.szabolcst.idorendmaker.model.dto.boatclass;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class BoatClassDto {

    private Integer id;
    private String name;                // e.g., "Kajak egyes", "Kajak páros"
    private String boatType;            // e.g., "Kajak", "Minikajak", "Kenu"
    private Integer seatCount;          // e.g., 1, 2, 4, 20, null for "csapat"
    private String seatCountText;       // e.g., "1", "2", "4", "20", "csapat"
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime createdAt;

}