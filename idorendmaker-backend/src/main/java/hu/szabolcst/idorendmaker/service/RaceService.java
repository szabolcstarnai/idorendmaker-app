package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.DatabaseStatsDto;
import hu.szabolcst.idorendmaker.model.dto.race.AgeGroupDto;
import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsDto;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public interface RaceService {
  List<RaceWithAgeGroupsDto> getAllRaces();
  
  List<RaceWithAgeGroupsDto> searchRaces(String paramString);
  
  boolean updateRaceHidden(Integer paramInteger, boolean paramBoolean);
  
  List<AgeGroupDto> getAllAgeGroups();
  
  DatabaseStatsDto getStats();
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\service\RaceService.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */