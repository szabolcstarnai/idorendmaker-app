package hu.szabolcst.idorendmaker.model.entity;


import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class Rule {

    private Integer id;
    private String name;
    private String description;
    private Integer minIntervalMinutes;
    private Boolean isActive = Boolean.TRUE;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<RuleCondition> conditions = new ArrayList<>();
    private List<RuleMatching> matchings = new ArrayList<>();

    public Rule() {
        final LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void markUpdated() {
        this.updatedAt = LocalDateTime.now();
    }

}