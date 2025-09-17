package hu.szabolcst.idorendmaker.model.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class AgeGroup {

    private Integer id;
    private String name;
    private LocalDateTime createdAt;
    private List<RaceAgeGroup> races = new ArrayList<>();

    public AgeGroup() {
        this.createdAt = LocalDateTime.now();
    }
}