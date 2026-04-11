package hu.szabolcst.idorendmaker.model.entity.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "boat_classes")
public class BoatClass {

    @Id
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "boat_type_code")
    private String boatTypeCode;

    @Column(name = "seat_count")
    private Integer seatCount;

    @Column(name = "seat_count_text")
    private String seatCountText;
}
