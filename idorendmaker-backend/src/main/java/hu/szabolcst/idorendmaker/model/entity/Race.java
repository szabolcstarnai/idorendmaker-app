package hu.szabolcst.idorendmaker.model.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class Race {

    private Integer id;
    private String name;
    private String discipline;
    private String boatClass;          // Legacy string field - kept for backward compatibility
    private Integer boatClassId;       // Reference to boat_classes table for enhanced rule system
    private String gender;
    private String distance;
    private Integer occurrence = 0;
    private Boolean hidden = Boolean.FALSE;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private BoatClass boatClassData;   // Joined boat class data for enhanced rule system
    private List<RaceAgeGroup> ageGroups = new ArrayList<>();
    private List<ScheduleItem> scheduleItems = new ArrayList<>();
    private List<RaceCompetitorAssociation> raceCompetitorAssociations = new ArrayList<>();

    public Race() {
        final LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void markUpdated() {
        this.updatedAt = LocalDateTime.now();
    }

}