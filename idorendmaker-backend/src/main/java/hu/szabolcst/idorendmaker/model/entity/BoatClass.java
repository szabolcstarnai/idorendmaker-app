package hu.szabolcst.idorendmaker.model.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class BoatClass {

    private Integer id;
    private String name;                // e.g., "Kajak egyes", "Kajak páros"
    private String boatType;            // e.g., "Kajak", "Minikajak", "Kenu"
    private Integer seatCount;          // e.g., 1, 2, 4, 20, null for "csapat"
    private String seatCountText;       // e.g., "1", "2", "4", "20", "csapat"
    private LocalDateTime createdAt;
    private List<Race> races = new ArrayList<>(); // Races that use this boat class

    public BoatClass() {
        this.createdAt = LocalDateTime.now();
    }

}