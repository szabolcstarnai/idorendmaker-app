package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.RaceMatchingMapper;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorRaceInfoDto;
import hu.szabolcst.idorendmaker.model.dto.matching.CompetitorDataDto;
import hu.szabolcst.idorendmaker.model.dto.matching.ExtractedCompetitorDto;
import hu.szabolcst.idorendmaker.model.dto.matching.ExtractedRaceDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFCleanupResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFDeletionResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFExtractionDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFExtractionStatsDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFProcessingResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.ProcessedVersenyszamDto;
import hu.szabolcst.idorendmaker.model.dto.matching.RaceWithCompetitorDataDto;
import hu.szabolcst.idorendmaker.model.entity.CompetitorEntry;
import hu.szabolcst.idorendmaker.model.entity.PDFExtraction;
import hu.szabolcst.idorendmaker.model.entity.Race;
import hu.szabolcst.idorendmaker.model.entity.RaceCompetitorAssociation;
import hu.szabolcst.idorendmaker.repository.CompetitorEntryRepository;
import hu.szabolcst.idorendmaker.repository.PDFExtractionRepository;
import hu.szabolcst.idorendmaker.repository.RaceCompetitorAssociationRepository;
import hu.szabolcst.idorendmaker.repository.RaceRepository;
import hu.szabolcst.idorendmaker.service.RaceMatchingService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class RaceMatchingServiceImpl implements RaceMatchingService {

    private final PDFExtractionRepository pdfExtractionRepository;
    private final CompetitorEntryRepository competitorEntryRepository;
    private final RaceCompetitorAssociationRepository raceCompetitorAssociationRepository;
    private final RaceRepository raceRepository;
    private final RaceMatchingMapper raceMatchingMapper;

    @Override
    @Transactional
    public PDFProcessingResultDto processPDFAndMatch(final String filename, final List<ProcessedVersenyszamDto> pdfData,
                                                     final String fileHash) {
        try {
            log.info("Processing PDF: {} with {} races", filename, pdfData.size());

            // Check for existing extraction with same hash for deduplication
            if (fileHash != null && !fileHash.isEmpty()) {
                final Optional<PDFExtraction> existingExtraction = pdfExtractionRepository.findByFileHash(fileHash);
                if (existingExtraction.isPresent()) {
                    log.info("Found existing extraction for hash {}, reusing data", fileHash);
                    
                    // Update existing extraction to reset session expiry
                    final PDFExtraction extraction = existingExtraction.get();
                    extraction.setStatus("session");
                    extraction.setExpiresAt(calculateSessionExpiry());
                    extraction.setExtractionStatus("completed");
                    pdfExtractionRepository.save(extraction);

                    // Load existing data back to result format
                    final List<ExtractedRaceDto> extractedRaces = loadExistingExtractionData(extraction.getId());
                    
                    return raceMatchingMapper.createProcessingResultDto(
                        true, extraction.getId(), extractedRaces, 
                        extraction.getTotalCompetitors(), extraction.getTotalEntries(), null, true
                    );
                }
            }

            // Transform PDF data to our internal format
            final List<ExtractedRaceDto> extractedRaces = transformPDFData(pdfData);
            
            // Create new PDF extraction record
            PDFExtraction pdfExtraction = new PDFExtraction();
            pdfExtraction.setFilename(filename);
            pdfExtraction.setFileHash(fileHash);
            pdfExtraction.setTotalRaces(extractedRaces.size());
            pdfExtraction.setTotalCompetitors(countUniqueCompetitors(extractedRaces));
            pdfExtraction.setTotalEntries(countTotalEntries(extractedRaces));
            pdfExtraction.setExtractionStatus("processing");
            pdfExtraction.setStatus("session");
            pdfExtraction.setExpiresAt(calculateSessionExpiry());
            pdfExtraction.setCreatedAt(LocalDateTime.now());
            
            pdfExtraction = pdfExtractionRepository.save(pdfExtraction);
            log.info("Created PDF extraction record with ID: {}", pdfExtraction.getId());

            // Store competitor entries
            storeCompetitorEntries(pdfExtraction.getId(), extractedRaces);

            // Match races to database and store associations
            matchRacesToDatabase(extractedRaces, pdfExtraction.getId());

            // Update extraction status to completed
            pdfExtraction.setExtractionStatus("completed");
            pdfExtractionRepository.save(pdfExtraction);

            log.info("PDF processing completed successfully");

            return raceMatchingMapper.createProcessingResultDto(
                true, pdfExtraction.getId(), extractedRaces,
                pdfExtraction.getTotalCompetitors(), pdfExtraction.getTotalEntries(), null, false
            );
            
        } catch (final Exception error) {
            log.error("Error processing PDF and matching races", error);
            return raceMatchingMapper.createProcessingResultDto(
                false, null, Collections.emptyList(), 0, 0, 
                error.getMessage(), false
            );
        }
    }

    @Override
    @Transactional
    public List<RaceWithCompetitorDataDto> getFilteredRaces(final Integer pdfExtractionId) {
        try {
            // Get races that have competitor associations from this PDF extraction
            final List<RaceCompetitorAssociation> raceAssociations = raceCompetitorAssociationRepository
                .findAllByPdfExtractionId(pdfExtractionId);

            // Group by race ID to aggregate competitor data
            final Map<Integer, List<RaceCompetitorAssociation>> raceMap = raceAssociations.stream()
                .collect(Collectors.groupingBy(RaceCompetitorAssociation::getRaceId));

            // Transform to RaceWithCompetitorData format
            final List<RaceWithCompetitorDataDto> filteredRaces = new ArrayList<>();
            
            for (final Map.Entry<Integer, List<RaceCompetitorAssociation>> entry : raceMap.entrySet()) {
                final Integer raceId = entry.getKey();
                final List<RaceCompetitorAssociation> associations = entry.getValue();
                
                // Get the race entity
                final Optional<Race> raceOpt = raceRepository.findById(raceId);
                if (raceOpt.isEmpty()) continue;
                
                final Race race = raceOpt.get();
                
                // Create competitor data
                final List<String> competitorIds = associations.stream()
                    .map(RaceCompetitorAssociation::getCompetitorId)
                    .distinct()
                    .collect(Collectors.toList());
                
                final List<String> topCompetitors = associations.stream()
                    .map(assoc -> assoc.getCompetitorEntry().getCompetitorName())
                    .distinct()
                    .limit(3)
                    .collect(Collectors.toList());

                // Create DTO
                final RaceWithCompetitorDataDto dto = raceMatchingMapper.toRaceWithCompetitorDataDto(race);
                dto.setEntryCount(competitorIds.size());
                dto.setCompetitorIds(competitorIds);
                dto.setTopCompetitors(topCompetitors);
                dto.setPdfExtractionId(pdfExtractionId);
                
                filteredRaces.add(dto);
            }

            // Sort by entry count (highest first)
            filteredRaces.sort((a, b) -> b.getEntryCount().compareTo(a.getEntryCount()));

            log.info("Retrieved {} filtered races for PDF extraction {}", filteredRaces.size(), pdfExtractionId);
            return filteredRaces;
            
        } catch (final Exception error) {
            log.error("Error getting filtered races", error);
            return Collections.emptyList();
        }
    }

    @Override
    @Transactional
    public Map<String, CompetitorDataDto> getCompetitorData(final Integer pdfExtractionId) {
        try {
            final List<CompetitorEntry> competitors = competitorEntryRepository
                .findAllWithRaceAssociationsByPdfExtractionId(pdfExtractionId);

            final Map<String, CompetitorDataDto> competitorMap = new HashMap<>();
            
            for (final CompetitorEntry competitor : competitors) {
                final CompetitorDataDto dto = raceMatchingMapper.toCompetitorDataDto(competitor);
                
                // Map race associations
                final List<CompetitorRaceInfoDto> races = competitor.getRaceCompetitorAssociations().stream()
                    .map(assoc -> {
                        final CompetitorRaceInfoDto raceDto = new CompetitorRaceInfoDto();
                        raceDto.setRaceId(assoc.getRaceId());
                        raceDto.setRaceName(assoc.getRace().getName());
                        raceDto.setPdfRaceName(assoc.getPdfRaceName());
                        return raceDto;
                    })
                    .collect(Collectors.toList());
                
                dto.setRaces(races);
                competitorMap.put(competitor.getCompetitorId(), dto);
            }

            log.info("Retrieved competitor data for {} competitors", competitorMap.size());
            return competitorMap;
            
        } catch (final Exception error) {
            log.error("Error getting competitor data", error);
            return Collections.emptyMap();
        }
    }

    @Override
    @Transactional
    public PDFExtractionStatsDto getPDFExtractionStats(final Integer pdfExtractionId) {
        try {
            final Optional<PDFExtraction> extractionOpt = pdfExtractionRepository.findById(pdfExtractionId);
            if (extractionOpt.isEmpty()) {
                throw new RuntimeException("PDF extraction " + pdfExtractionId + " not found");
            }

            final PDFExtraction extraction = extractionOpt.get();

            // Get count of unique races that have matches
            final List<Integer> matchedRaceIds = raceCompetitorAssociationRepository
                .findDistinctRaceIdsByPdfExtractionId(pdfExtractionId);
            
            final PDFExtractionStatsDto dto = raceMatchingMapper.toPDFExtractionStatsDto(extraction);
            dto.setMatchedRaces(matchedRaceIds.size());
            
            return dto;
            
        } catch (final Exception error) {
            log.error("Error getting PDF extraction stats", error);
            return null;
        }
    }

    @Override
    @Transactional
    public void linkToSchedule(final Integer pdfExtractionId) {
        try {
            final Optional<PDFExtraction> extractionOpt = pdfExtractionRepository.findById(pdfExtractionId);
            if (extractionOpt.isEmpty()) {
                throw new RuntimeException("PDF extraction " + pdfExtractionId + " not found");
            }

            final PDFExtraction extraction = extractionOpt.get();
            extraction.setStatus("linked");
            extraction.setLinkedAt(LocalDateTime.now());
            extraction.setExpiresAt(null); // Linked data doesn't expire
            pdfExtractionRepository.save(extraction);
            
            log.info("PDF extraction {} promoted to linked status", pdfExtractionId);
            
        } catch (final Exception error) {
            log.error("Error linking PDF extraction to schedule", error);
            throw new RuntimeException(error.getMessage());
        }
    }

    @Override
    @Transactional
    public PDFCleanupResultDto cleanupExpiredSessions() {
        try {
            final LocalDateTime now = LocalDateTime.now();
            
            // Find expired session extractions
            final List<PDFExtraction> expiredExtractions = pdfExtractionRepository
                .findExpiredSessionExtractions(now);
            
            final List<Integer> extractionIds = expiredExtractions.stream()
                .map(PDFExtraction::getId)
                .toList();
            
            if (extractionIds.isEmpty()) {
                return raceMatchingMapper.createCleanupResultDto(0, 0);
            }

            log.info("Cleaning up {} expired PDF extractions", extractionIds.size());
            
            // Delete in correct order (due to foreign key constraints)
            int deletedAssociations = 0;
            int deletedCompetitors = 0;
            
            for (final Integer extractionId : extractionIds) {
                final List<RaceCompetitorAssociation> associations = raceCompetitorAssociationRepository
                    .findAllByPdfExtractionId(extractionId);
                deletedAssociations += associations.size();
                raceCompetitorAssociationRepository.deleteAll(associations);
                
                final List<CompetitorEntry> competitors = competitorEntryRepository
                    .findAllByPdfExtractionId(extractionId);
                deletedCompetitors += competitors.size();
                competitorEntryRepository.deleteAll(competitors);
            }
            
            pdfExtractionRepository.deleteAll(expiredExtractions);

            final int totalDeleted = deletedAssociations + deletedCompetitors + expiredExtractions.size();
            
            log.info("Cleanup completed: {} extractions, {} total records deleted", 
                    expiredExtractions.size(), totalDeleted);
            
            return raceMatchingMapper.createCleanupResultDto(expiredExtractions.size(), totalDeleted);
            
        } catch (final Exception error) {
            log.error("Error during cleanup", error);
            throw new RuntimeException(error.getMessage());
        }
    }

    @Override
    @Transactional
    public List<PDFExtractionDto> getAllPDFExtractions() {
        try {
            final List<PDFExtraction> extractions = pdfExtractionRepository.findAllWithSchedulesOrderByCreatedAtDesc();

            // Transform to DTOs and include computed fields
            return extractions.stream().map(extraction -> {
                final PDFExtractionDto dto = raceMatchingMapper.toPDFExtractionDto(extraction);
                
                // Set computed counts
                dto.setCompetitorEntriesCount((int) competitorEntryRepository.countByPdfExtractionId(extraction.getId()));
                dto.setRaceAssociationsCount((int) raceCompetitorAssociationRepository.countByPdfExtractionId(extraction.getId()));
                dto.setSchedulesUsingCount(extraction.getSchedules() != null ? extraction.getSchedules().size() : 0);
                dto.setCanDelete("session".equals(extraction.getStatus()) && 
                    (extraction.getSchedules() == null || extraction.getSchedules().isEmpty()));
                
                return dto;
            }).collect(Collectors.toList());
            
        } catch (final Exception error) {
            log.error("Error getting all PDF extractions", error);
            return Collections.emptyList();
        }
    }

    @Override
    @Transactional
    public PDFDeletionResultDto deletePDFExtraction(final Integer pdfExtractionId) {
        try {
            // Check if extraction exists and is safe to delete
            final Optional<PDFExtraction> extractionOpt = pdfExtractionRepository.findByIdWithSchedules(pdfExtractionId);
            if (extractionOpt.isEmpty()) {
                throw new RuntimeException("PDF extraction " + pdfExtractionId + " not found");
            }

	        final PDFExtraction extraction = getPdfExtraction(pdfExtractionId, extractionOpt.get());

	        // Delete all related data
            final List<CompetitorEntry> competitors = competitorEntryRepository.findAllByPdfExtractionId(pdfExtractionId);
            competitorEntryRepository.deleteAll(competitors);

            final List<RaceCompetitorAssociation> associations = raceCompetitorAssociationRepository
                .findAllByPdfExtractionId(pdfExtractionId);
            raceCompetitorAssociationRepository.deleteAll(associations);

            // Delete the extraction itself
            pdfExtractionRepository.delete(extraction);

            log.info("Successfully deleted PDF extraction {}", pdfExtractionId);
            return raceMatchingMapper.createDeletionResultDto(true, null);
            
        } catch (final Exception error) {
            log.error("Error deleting PDF extraction", error);
            return raceMatchingMapper.createDeletionResultDto(false, error.getMessage());
        }
    }

	@Override
    public String calculateFileHash(final String filePath) {
        try {
            final byte[] fileBytes = Files.readAllBytes(Paths.get(filePath));
            final MessageDigest digest = MessageDigest.getInstance("SHA-256");
            final byte[] hashBytes = digest.digest(fileBytes);
            
            // Convert to hex string
            final StringBuilder sb = new StringBuilder();
            for (final byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
            
        } catch (final IOException | NoSuchAlgorithmException e) {
            log.error("Error calculating file hash for: {}", filePath, e);
            return null;
        }
    }

    @Override
    @Transactional
    public void matchRacesToDatabase(final List<ExtractedRaceDto> extractedRaces, final Integer pdfExtractionId) {
        // Get all database races for matching
        final List<Race> dbRaces = raceRepository.findAll();
        
        log.info("Matching {} extracted races against {} database races", 
                extractedRaces.size(), dbRaces.size());

        for (final ExtractedRaceDto extractedRace : extractedRaces) {
            // Find exact name match first (simple matching for now)
            final Optional<Race> exactMatch = dbRaces.stream()
                .filter(dbRace -> normalizeRaceName(dbRace.getName())
                    .equals(normalizeRaceName(extractedRace.getName())))
                .findFirst();

            if (exactMatch.isPresent()) {
                final Race race = exactMatch.get();
                log.info("Exact match found: \"{}\" → \"{}\"", extractedRace.getName(), race.getName());
                
                // Store race-competitor associations for this match
                for (final ExtractedCompetitorDto competitor : extractedRace.getCompetitors()) {
                    final RaceCompetitorAssociation association = new RaceCompetitorAssociation();
                    association.setPdfExtractionId(pdfExtractionId);
                    association.setRaceId(race.getId());
                    association.setCompetitorId(competitor.getId());
                    association.setPdfRaceName(extractedRace.getName());
                    association.setMatchConfidence(1.0F); // Exact match
                    raceCompetitorAssociationRepository.save(association);
                }

                extractedRace.setMatchedDatabaseRaceId(race.getId());
                extractedRace.setMatchConfidence(1.0);
            } else {
                log.info("No match found for race: \"{}\"", extractedRace.getName());
                // TODO: Implement fuzzy matching here
                extractedRace.setMatchConfidence(0.0);
            }
        }
    }

    @Override
    @Transactional
    public void storeCompetitorEntries(final Integer pdfExtractionId, final List<ExtractedRaceDto> extractedRaces) {
        final Map<String, ExtractedCompetitorDto> uniqueCompetitors = new HashMap<>();

        // Collect unique competitors and their race entries
        for (final ExtractedRaceDto race : extractedRaces) {
            for (final ExtractedCompetitorDto competitor : race.getCompetitors()) {
                if (uniqueCompetitors.containsKey(competitor.getId())) {
                    // Add this race to existing competitor's entries
                    final ExtractedCompetitorDto existing = uniqueCompetitors.get(competitor.getId());
                    existing.getRaceEntries().add(race.getName());
                } else {
                    // New competitor - create copy with race entry
                    final ExtractedCompetitorDto newCompetitor = new ExtractedCompetitorDto();
                    newCompetitor.setId(competitor.getId());
                    newCompetitor.setName(competitor.getName());
                    newCompetitor.setOrganization(competitor.getOrganization());
                    newCompetitor.setBirthYear(competitor.getBirthYear());
                    newCompetitor.setRaceEntries(new ArrayList<>(List.of(race.getName())));
                    uniqueCompetitors.put(competitor.getId(), newCompetitor);
                }
            }
        }

        // Store competitors in database
        for (final ExtractedCompetitorDto competitor : uniqueCompetitors.values()) {
            final CompetitorEntry entry = new CompetitorEntry();
            entry.setPdfExtractionId(pdfExtractionId);
            entry.setCompetitorId(competitor.getId());
            entry.setCompetitorName(competitor.getName());
            entry.setOrganization(competitor.getOrganization());
            entry.setBirthYear(competitor.getBirthYear());
            competitorEntryRepository.save(entry);
        }

        log.info("Stored {} unique competitors", uniqueCompetitors.size());
    }

    // Helper methods

	private static PDFExtraction getPdfExtraction(final Integer pdfExtractionId,
			final PDFExtraction extraction) {
		if ("linked".equals(extraction.getStatus()) ||
				(extraction.getSchedules() != null && !extraction.getSchedules().isEmpty())) {
			final int scheduleCount = extraction.getSchedules() != null ? extraction.getSchedules().size() : 0;
			throw new RuntimeException("Cannot delete PDF extraction " + pdfExtractionId +
					": it is linked to " + scheduleCount + " schedule(s)");
		}
		return extraction;
	}

    private List<ExtractedRaceDto> transformPDFData(final List<ProcessedVersenyszamDto> pdfData) {
        return pdfData.stream().map(race -> {
            final List<ExtractedCompetitorDto> competitors = (race.getNevezettek() != null ? race.getNevezettek() : Collections.<ProcessedVersenyszamDto.ProcessedCompetitorDto>emptyList()).stream()
                .map(competitor -> {
                    final ExtractedCompetitorDto dto = new ExtractedCompetitorDto();
                    dto.setId(competitor.getId() != null ? competitor.getId() : 
                            competitor.getNev() + "_" + race.getNev());
                    dto.setName(competitor.getNev());
                    dto.setOrganization(competitor.getTagszervezet());
                    dto.setBirthYear(competitor.getSzuletesiEv());
                    dto.setRaceEntries(new ArrayList<>(List.of(race.getNev())));
                    return dto;
                })
                .collect(Collectors.toList());

            final ExtractedRaceDto dto = new ExtractedRaceDto();
            dto.setId(race.getNev()); // Use race name as initial ID
            dto.setName(race.getNev());
            dto.setCompetitors(competitors);
            dto.setMatchConfidence(0.0); // Will be calculated during matching
            return dto;
        }).collect(Collectors.toList());
    }

    private int countUniqueCompetitors(final List<ExtractedRaceDto> extractedRaces) {
        final Set<String> uniqueCompetitors = new HashSet<>();
        for (final ExtractedRaceDto race : extractedRaces) {
            for (final ExtractedCompetitorDto competitor : race.getCompetitors()) {
                uniqueCompetitors.add(competitor.getId());
            }
        }
        return uniqueCompetitors.size();
    }

    private int countTotalEntries(final List<ExtractedRaceDto> extractedRaces) {
        return extractedRaces.stream()
            .mapToInt(race -> race.getCompetitors().size())
            .sum();
    }

    private LocalDateTime calculateSessionExpiry() {
        return LocalDateTime.now().plusHours(24);
    }

    private String normalizeRaceName(final String name) {
        return name
            .toLowerCase()
            .trim()
            .replaceAll("\\s+", " ") // Normalize whitespace
            .replaceAll("[^\\w\\s]", ""); // Remove special characters
    }

    private List<ExtractedRaceDto> loadExistingExtractionData(final Integer pdfExtractionId) {
        try {
            // Get all race associations for this extraction
            final List<RaceCompetitorAssociation> associations = raceCompetitorAssociationRepository
                .findAllByPdfExtractionId(pdfExtractionId);

            // Group by race to rebuild the extracted races structure
            final Map<Integer, List<RaceCompetitorAssociation>> raceMap = associations.stream()
                .collect(Collectors.groupingBy(RaceCompetitorAssociation::getRaceId));

            // Convert back to ExtractedRace format
            final List<ExtractedRaceDto> extractedRaces = new ArrayList<>();
            
            for (final Map.Entry<Integer, List<RaceCompetitorAssociation>> entry : raceMap.entrySet()) {
                final Integer raceId = entry.getKey();
                final List<RaceCompetitorAssociation> raceAssociations = entry.getValue();
                
                if (raceAssociations.isEmpty()) continue;
                
                final RaceCompetitorAssociation firstAssoc = raceAssociations.getFirst();
                
                final List<ExtractedCompetitorDto> competitors = raceAssociations.stream()
                    .map(assoc -> {
                        final ExtractedCompetitorDto dto = new ExtractedCompetitorDto();
                        dto.setId(assoc.getCompetitorEntry().getCompetitorId());
                        dto.setName(assoc.getCompetitorEntry().getCompetitorName());
                        dto.setOrganization(assoc.getCompetitorEntry().getOrganization());
                        dto.setBirthYear(assoc.getCompetitorEntry().getBirthYear());
                        dto.setRaceEntries(List.of(assoc.getPdfRaceName()));
                        return dto;
                    })
                    .collect(Collectors.toList());

                final ExtractedRaceDto raceDto = new ExtractedRaceDto();
                raceDto.setId(firstAssoc.getPdfRaceName());
                raceDto.setName(firstAssoc.getPdfRaceName());
                raceDto.setCompetitors(competitors);
                raceDto.setMatchedDatabaseRaceId(raceId);
                raceDto.setMatchConfidence(Double.valueOf(firstAssoc.getMatchConfidence()));
                
                extractedRaces.add(raceDto);
            }

            log.info("Loaded {} existing races from extraction {}", extractedRaces.size(), pdfExtractionId);
            return extractedRaces;
            
        } catch (final Exception error) {
            log.error("Error loading existing extraction data", error);
            return Collections.emptyList();
        }
    }
}
