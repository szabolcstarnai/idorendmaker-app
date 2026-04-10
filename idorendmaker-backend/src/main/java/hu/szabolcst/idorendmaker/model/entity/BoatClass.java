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
@Table(name = "boat_classes")
public class BoatClass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(name = "boat_type")
    private String boatType;

    @Column(name = "seat_count")
    private Integer seatCount;

    @Column(name = "seat_count_text")
    private String seatCountText;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Transient
    private List<Race> races = new ArrayList<>();

    public BoatClass() {
        this.createdAt = LocalDateTime.now();
    }
}
