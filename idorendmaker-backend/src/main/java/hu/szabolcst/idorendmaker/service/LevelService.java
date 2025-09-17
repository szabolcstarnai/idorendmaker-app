package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import java.util.List;
import java.util.Optional;

public interface LevelService {
  List<LevelDto> getAllLevels();
  
  LevelDto getDefaultLevel();
  
  Optional<LevelDto> getLevelById(Integer paramInteger);
  
  List<LevelDto> getLevelsByType(String paramString);
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\service\LevelService.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */