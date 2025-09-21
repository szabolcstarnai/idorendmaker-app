package hu.szabolcst.idorendmaker.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/**
 * REST Controller for serving static resources
 * Provides access to sample documents and other static assets
 */
@Slf4j
@RestController
@RequestMapping("/api/static")
public class StaticResourceController {

    private static final String SAMPLE_PDF_FILENAME = "sample-nevezetek-2025.pdf";
    private static final String SAMPLE_PDF_PATH = "static/" + SAMPLE_PDF_FILENAME;

    /**
     * Download sample PDF document demonstrating correct MKKSZ format
     * Used as reference for users experiencing PDF format errors
     *
     * @return ResponseEntity containing the sample PDF file
     */
    @GetMapping("/sample-pdf")
    public ResponseEntity<Resource> downloadSamplePDF() {
        try {
            log.info("Sample PDF download requested");

            // Load the sample PDF from classpath resources
            final Resource resource = new ClassPathResource(SAMPLE_PDF_PATH);

            if (!resource.exists()) {
                log.error("Sample PDF not found at path: {}", SAMPLE_PDF_PATH);
                return ResponseEntity.notFound().build();
            }

            log.info("Serving sample PDF: {} (size: {} bytes)",
                SAMPLE_PDF_FILENAME, resource.contentLength());

            // Set appropriate headers for PDF download
            final HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", SAMPLE_PDF_FILENAME);
            headers.setCacheControl("no-cache, no-store, must-revalidate");
            headers.setPragma("no-cache");
            headers.setExpires(0);

            return ResponseEntity.ok()
                .headers(headers)
                .body(resource);

        } catch (final IOException e) {
            log.error("Error reading sample PDF file", e);
            return ResponseEntity.internalServerError().build();
        } catch (final Exception e) {
            log.error("Unexpected error serving sample PDF", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get information about the sample PDF without downloading it
     * Useful for UI components to check availability
     *
     * @return ResponseEntity with sample PDF metadata
     */
    @GetMapping("/sample-pdf/info")
    public ResponseEntity<?> getSamplePDFInfo() {
        try {
            final Resource resource = new ClassPathResource(SAMPLE_PDF_PATH);

            if (!resource.exists()) {
                log.warn("Sample PDF info requested but file not found");
                return ResponseEntity.notFound().build();
            }

            final var info = new SamplePDFInfo(
                SAMPLE_PDF_FILENAME,
                resource.contentLength(),
                "Minta MKKSZ NEVEZÉSEK - VERSENYSZÁMONKÉNT export",
                "2025"
            );

            log.debug("Sample PDF info requested: {}", info);
            return ResponseEntity.ok(info);

        } catch (final IOException e) {
            log.error("Error getting sample PDF info", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
         * Data class for sample PDF information response
         */
        public record SamplePDFInfo(String filename, long sizeBytes, String description, String formatYear) {

        @Override
            public String toString() {
                return String.format("SamplePDFInfo{filename='%s', sizeBytes=%d, description='%s', formatYear='%s'}",
                    filename, sizeBytes, description, formatYear);
            }
        }
}