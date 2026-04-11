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
@Table(name = "races")
public class Race {

    @Id
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String discipline;

    @Column(name = "boat_class_code", nullable = false)
    private String boatClassCode;

    @Column(nullable = false)
    private String gender;

    @Column(nullable = false)
    private String distance;

    @Column(nullable = false)
    private Boolean hidden;

    @Column(name = "sort_order")
    private Integer sortOrder;
}
