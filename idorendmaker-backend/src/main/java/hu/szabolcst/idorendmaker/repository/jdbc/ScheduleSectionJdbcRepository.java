 package hu.szabolcst.idorendmaker.repository.jdbc;
 
 import hu.szabolcst.idorendmaker.model.entity.ScheduleSection;
 import hu.szabolcst.idorendmaker.repository.ScheduleSectionRepository;
 import hu.szabolcst.idorendmaker.repository.jdbc.BaseJdbcRepository;
 import java.sql.PreparedStatement;
 import java.sql.Timestamp;
 import java.util.List;
 import org.springframework.jdbc.core.RowMapper;
 import org.springframework.stereotype.Repository;
 
 @Repository
 public class ScheduleSectionJdbcRepository
   extends BaseJdbcRepository<ScheduleSection, Integer>
   implements ScheduleSectionRepository
 {
   public ScheduleSectionJdbcRepository() {
     super(ScheduleSection.class);
   }
 
   
   protected String getTableName() {
     return "schedule_sections";
   }
 
   
   protected String getIdColumnName() {
     return "id";
   }
 
   
   protected String getInsertSql() {
     return "INSERT INTO schedule_sections (schedule_id, day_number, section_type, start_time, created_at) VALUES (?, ?, ?, ?, ?)";
   }
 
   
   protected String getUpdateSql() {
     return "UPDATE schedule_sections SET schedule_id = ?, day_number = ?, section_type = ?, start_time = ?, created_at = ? WHERE id = ?";
   }
 
   
   protected void setInsertParameters(final PreparedStatement ps, final ScheduleSection section) throws Exception {
     ps.setInt(1, section.getScheduleId());
     ps.setInt(2, section.getDayNumber());
     ps.setString(3, section.getSectionType());
     ps.setString(4, section.getStartTime());
     ps.setTimestamp(5, Timestamp.valueOf(section.getCreatedAt()));
   }
 
   
   protected void setUpdateParameters(final PreparedStatement ps, final ScheduleSection section) throws Exception {
     ps.setInt(1, section.getScheduleId());
     ps.setInt(2, section.getDayNumber());
     ps.setString(3, section.getSectionType());
     ps.setString(4, section.getStartTime());
     ps.setTimestamp(5, Timestamp.valueOf(section.getCreatedAt()));
     ps.setInt(6, section.getId());
   }
 
   
   protected Integer getId(final ScheduleSection section) {
     return section.getId();
   }
 
   
   protected void setId(final ScheduleSection section, final Integer id) {
     section.setId(id);
   }
 
 
 
 
 
 
   
   public List<ScheduleSection> findAllByScheduleIdOrderByDayNumberAscSectionTypeAsc(final Integer scheduleId) {
     final String sql = "SELECT * FROM schedule_sections WHERE schedule_id = ? ORDER BY day_number ASC, section_type ASC";
     return this.jdbcTemplate.query("SELECT * FROM schedule_sections WHERE schedule_id = ? ORDER BY day_number ASC, section_type ASC", (RowMapper)this.rowMapper,
         scheduleId);
   }
 
 
 
 
   
   public void deleteAllByScheduleId(final Integer scheduleId) {
     final String sql = "DELETE FROM schedule_sections WHERE schedule_id = ?";
     this.jdbcTemplate.update("DELETE FROM schedule_sections WHERE schedule_id = ?", scheduleId);
   }
 }


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\repository\jdbc\ScheduleSectionJdbcRepository.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */