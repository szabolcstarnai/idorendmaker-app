package hu.szabolcst.idorendmaker.model.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class Schedule {

    private Integer id;
    private String name;
    private Integer pdfExtractionId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ScheduleSection> sections = new ArrayList<>();
    private List<ScheduleItem> scheduleItems = new ArrayList<>();
    private List<DismissedRuleViolation> dismissedViolations = new ArrayList<>();
    private PDFExtraction pdfExtraction;

    public Schedule() {
        final LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

}