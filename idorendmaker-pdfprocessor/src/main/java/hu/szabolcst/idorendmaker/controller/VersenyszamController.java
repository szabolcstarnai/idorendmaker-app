package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.Versenyszam;
import hu.szabolcst.idorendmaker.service.VersenyszamService;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/versenyszam")
public class VersenyszamController {

	private final VersenyszamService versenyszamService;

	//@RequestBody(content = @Content(mediaType = MediaType.MULTIPART_FORM_DATA_VALUE))
	@PostMapping(value = "/extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<List<Versenyszam>> extractFromPdf(@RequestParam("file") final MultipartFile file) {
		if (file.isEmpty()) {
			log.error("Received empty file");

			return ResponseEntity.badRequest().build();
		}

		if (!"application/pdf".equals(file.getContentType())) {
			log.error("Received non-PDF file: {}", file.getContentType());

			return ResponseEntity.badRequest().build();
		}

		try {
			final List<Versenyszam> versenyszamok = versenyszamService.extractFromPdf(file);

			return ResponseEntity.ok(versenyszamok);
		} catch (final IOException e) {
			log.error("Error processing PDF file", e);

			return ResponseEntity.internalServerError().build();
		}
	}

}
