package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorConflictResultDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorStatsDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.RaceCompetitorSummaryDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.ScheduleRaceDto;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public interface CompetitorService {

    List<CompetitorScheduleDto> analyzeCompetitorSchedules(List<ScheduleRaceDto> paramList, Integer paramInteger);

    CompetitorConflictResultDto checkCompetitorConflicts(Integer paramInteger1, Integer paramInteger2, Integer paramInteger3);

    RaceCompetitorSummaryDto getRaceCompetitorSummary(Integer paramInteger1, Integer paramInteger2);

    List<CompetitorScheduleDto> getHighRiskCompetitors(Integer paramInteger);

    CompetitorStatsDto getCompetitorStats(Integer paramInteger);
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\service\CompetitorService.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */