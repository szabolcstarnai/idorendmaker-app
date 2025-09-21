package hu.szabolcst.idorendmaker.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PDFProcessingErrorResponse {

	private String errorCode;
	private String message;
	private String userMessage;

	public static PDFProcessingErrorResponse formatError() {
		return new PDFProcessingErrorResponse(
			"PDF_FORMAT_ERROR",
			"PDF format is not supported",
			"A kiválasztott fájl formátuma nem megfelelő. A szolgáltatás a hivatalos MKKSZ Kajak-Kenu Ablakból exportált NEVEZÉSEK - VERSENYSZÁMONKÉNT PDF dokumentumból tud adatot kinyerni. Utolsó tesztelt, működő dokumentum formátum éve: 2025"
		);
	}

	public static PDFProcessingErrorResponse emptyFileError() {
		return new PDFProcessingErrorResponse(
			"EMPTY_FILE_ERROR",
			"PDF file is empty",
			"A kiválasztott fájl üres vagy nem tartalmaz feldolgozható adatokat."
		);
	}

	public static PDFProcessingErrorResponse corruptedFileError() {
		return new PDFProcessingErrorResponse(
			"CORRUPTED_FILE_ERROR",
			"PDF file is corrupted or unreadable",
			"A kiválasztott PDF fájl sérült vagy nem olvasható. Kérjük, próbáljon meg egy másik fájlt."
		);
	}

	public static PDFProcessingErrorResponse processingError() {
		return new PDFProcessingErrorResponse(
			"PROCESSING_ERROR",
			"Error occurred during PDF processing",
			"Hiba történt a PDF feldolgozása során. Kérjük, ellenőrizze a fájl formátumát és próbálja újra."
		);
	}

	public static PDFProcessingErrorResponse invalidContentError() {
		return new PDFProcessingErrorResponse(
			"INVALID_CONTENT_ERROR",
			"PDF does not contain expected MKKSZ format structure",
			"A PDF nem tartalmazza a várt MKKSZ formátum szerkezetét. Kérjük, exportálja a dokumentumot a NEVEZÉSEK - VERSENYSZÁMONKÉNT funkcióval."
		);
	}

}