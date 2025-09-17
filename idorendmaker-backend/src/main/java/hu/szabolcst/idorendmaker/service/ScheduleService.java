package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.schedule.CreateScheduleSectionDataDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleItemWithRaceAndSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleWithPDFContextDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleWithSectionsDto;
import java.util.List;
import java.util.Optional;

public interface ScheduleService {
  List<ScheduleDto> getAllSchedules();
  
  Integer createSchedule(String paramString);
  
  List<ScheduleItemWithRaceAndSectionDto> getScheduleItems(Integer paramInteger);
  
  Integer createScheduleItem(Integer paramInteger1, Integer paramInteger2, Integer paramInteger3, Integer paramInteger4, Integer paramInteger5, Integer paramInteger6, String paramString);
  
  Integer saveScheduleWithSections(String paramString, List<CreateScheduleSectionDataDto> paramList, Integer paramInteger);
  
  Integer updateScheduleWithSections(Integer paramInteger1, String paramString, List<CreateScheduleSectionDataDto> paramList, Integer paramInteger2);
  
  Integer createScheduleSection(CreateScheduleSectionDataDto paramCreateScheduleSectionDataDto);
  
  List<ScheduleSectionDto> getScheduleSections(Integer paramInteger);
  
  List<ScheduleItemWithRaceAndSectionDto> getScheduleItemsBySection(Integer paramInteger);
  
  Optional<ScheduleWithSectionsDto> getScheduleWithSections(Integer paramInteger);
  
  ScheduleWithPDFContextDto getScheduleWithPDFContext(Integer paramInteger);
  
  void deleteSchedule(Integer paramInteger);
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\service\ScheduleService.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */