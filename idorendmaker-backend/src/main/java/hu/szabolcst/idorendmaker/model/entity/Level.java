package hu.szabolcst.idorendmaker.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "levels")
public class Level {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(name = "level_type")
    private String levelType;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @Column(name = "is_default")
    private Boolean isDefault = Boolean.FALSE;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Transient
    private List<ScheduleItem> scheduleItems = new ArrayList<>();

    public Level() {
        this.createdAt = LocalDateTime.now();
    }
}
