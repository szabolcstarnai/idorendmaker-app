package hu.szabolcst.idorendmaker.extractor;

import hu.szabolcst.idorendmaker.model.Versenyszam;
import hu.szabolcst.idorendmaker.model.Versenyzo;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static hu.szabolcst.idorendmaker.utils.StringUtil.EMPTY;
import static hu.szabolcst.idorendmaker.utils.StringUtil.SPACE;
import static hu.szabolcst.idorendmaker.utils.StringUtil.removeFrom;

@Slf4j
public class VersenyszamNevezesekExtractor {

	private static final String AZONOSITO_START = "A";
	private static final String NEV_START = "N";
	private static final String TAGSZERVEZET_START = "T";
	private static final String SZULETESI_EV_START = "S";
	private static final String AZONOSITO = "Azonosító";
	private static final String NEV = "Név";
	private static final String TAGSZERVEZET = "Tagszervezet";
	private static final String SZULETETT = "Született";
	private static final String DATUM_REGEX = "\\d{4}\\.\\d{2}\\.\\d{2}\\d{2}:\\d{2}:\\d{2}";

	public static List<Versenyszam> extractFromPdf(final String pdfPath) throws IOException {
		final List<Versenyszam> versenyszamList = new ArrayList<>();
		int unprocessedCompetitorCountForLastRace = 0;

		try (final PDDocument document = Loader.loadPDF(new File(pdfPath));
				final PDDocument noPosDocument = Loader.loadPDF(new File(pdfPath))) {
			for (int pageIndex = 0; pageIndex < document.getNumberOfPages(); pageIndex++) {
				final PositionalTextStripper stripper = new PositionalTextStripper();
				stripper.setStartPage(pageIndex + 1);
				stripper.setEndPage(pageIndex + 1);
				stripper.getText(document);

				final PDFTextStripper noPosStripper = new PDFTextStripper();
				noPosStripper.setStartPage(pageIndex + 1);
				noPosStripper.setEndPage(pageIndex + 1);
				final String text = noPosStripper.getText(noPosDocument);

				final String[] noPosLines = text.split("\r\n");
				final List<LineData> lineDataList = stripper.getLineDataList();

				unprocessedCompetitorCountForLastRace = processPageData(lineDataList, noPosLines, versenyszamList,
						unprocessedCompetitorCountForLastRace);
			}
		}

		return versenyszamList;
	}

	private static int processPageData(final List<LineData> lineDataList, final String[] noPosLines,
			final List<Versenyszam> versenyszamList, int competitorsCount) {
		Versenyszam currentVersenyszam = null;
		List<Versenyzo> currentNevezettek = null;
		Map<String, Float> columnPositions = null;
		boolean versenyszamNevAdded = false;
		boolean headerFound = false;
		if (competitorsCount != 0) {
			currentVersenyszam = versenyszamList.getLast();
			currentNevezettek = currentVersenyszam.getNevezettek();
			versenyszamNevAdded = true;
		}

		for (int i = 0; i < lineDataList.size(); i++) {
			final LineData line = lineDataList.get(i);
			final String text = line.getText().trim();
			final String noPosText = noPosLines[i].trim();
			if (isFillerLine(text)) {
				continue;
			}

			if (!versenyszamNevAdded && competitorsCount == 0) {
				currentVersenyszam = null;
				final String[] noPosSplit = noPosText.split(SPACE);
				competitorsCount =
						Integer.parseInt(noPosSplit[noPosSplit.length - 1].replace("(", EMPTY).replace(")", EMPTY));
			}

			if (currentVersenyszam != null && !versenyszamNevAdded) {
				versenyszamList.add(currentVersenyszam);
				versenyszamNevAdded = true;
			} else if (!versenyszamNevAdded) {
				final String versenyszamNev = removeFrom(noPosText, "(" + competitorsCount + ")").trim();
				currentNevezettek = new ArrayList<>();
				currentVersenyszam = new Versenyszam(UUID.randomUUID().toString(), versenyszamNev, currentNevezettek);
				headerFound = false;
				columnPositions = null;

				continue;
			}

			if (!headerFound && isLineTableHeader(text)) {
				headerFound = true;
				columnPositions = detectColumnPositions(line);

				continue;
			}

			if (headerFound) {
				if (!isDataRow(text)) {
					continue;
				}
				try {
					final Versenyzo versenyzo = extractVersenyzo(line, columnPositions, noPosText);
					currentNevezettek.add(versenyzo);
					competitorsCount--;
					versenyszamNevAdded = competitorsCount != 0;

					if (!versenyszamNevAdded) {
						currentVersenyszam = null;
					}
				} catch (final Exception e) {
					log.error("Error processing line: {}\n{}", text, e.toString());
				}
			}
		}

		return competitorsCount;
	}

	private static boolean isLineTableHeader(final String text) {
		return text.contains(AZONOSITO) && text.contains(NEV) &&
				text.contains(TAGSZERVEZET) && text.contains(SZULETETT);
	}

	private static boolean isFillerLine(final String text) {
		return text.isEmpty() || text.contains("Oldal:") || text.contains("Nyomtatva:") || text.contains("NEVEZÉSEK") ||
				text.matches(DATUM_REGEX);
	}

	private static boolean isDataRow(final String text) {
		return text.matches("^\\s*\\d+.*");
	}

	private static Map<String, Float> detectColumnPositions(final LineData headerLine) {
		final Map<String, Float> positions = new HashMap<>();
		final List<PositionalText> words = headerLine.getPositionalText();

		Float azonositoPos = null;
		Float nevPos = null;
		Float tagszervezetPos = null;
		Float szuletettPos = null;

		for (final PositionalText word : words) {
			final String text = word.text().trim();

			switch (text) {
				case AZONOSITO_START -> azonositoPos = word.x();
				case NEV_START -> nevPos = word.x();
				case TAGSZERVEZET_START -> tagszervezetPos = word.x();
				case SZULETESI_EV_START -> szuletettPos = word.x();
			}
		}

		positions.put(AZONOSITO, azonositoPos);
		positions.put(NEV, nevPos);
		positions.put(TAGSZERVEZET, tagszervezetPos);
		positions.put(SZULETETT, szuletettPos);

		return positions;
	}

	private static Versenyzo extractVersenyzo(final LineData line, final Map<String, Float> columnPositions,
			final String noPosText) {
		final List<PositionalText> words = line.getPositionalText();
		final float nevPos = columnPositions.get(NEV);
		final float tagszervezetPos = columnPositions.get(TAGSZERVEZET);

		final StringBuilder nevBuilder = new StringBuilder();

		for (final PositionalText word : words) {
			final float x = word.x();
			final String text = word.text();

			if (nevPos <= x && x < tagszervezetPos) {
				nevBuilder.append(text);
			}
		}

		final String[] splitNoPosText = noPosText.split(SPACE);
		final String szuletettStr = splitNoPosText[splitNoPosText.length - 1].trim();

		final String id = splitNoPosText[0].trim();
		final String tagszervezet = getTagszervezetAfterNameFromNoPosData(noPosText, nevBuilder.toString());
		final String nev = noPosText.replace(id, EMPTY).replace(tagszervezet, EMPTY).replace(szuletettStr, EMPTY).trim();
		final int szuletesiEv = parseBirthYear(szuletettStr);

		return new Versenyzo(id, nev, tagszervezet, szuletesiEv);
	}

	private static String getTagszervezetAfterNameFromNoPosData(final String noPosText, final String nev) {
		final String[] nameSplitted = splitOnCapital(nev);
		final String nameLastPart = nameSplitted[nameSplitted.length - 1].trim();

		return noPosText.substring(noPosText.indexOf(nameLastPart) + nameLastPart.length(), noPosText.length() - 5)
				.trim();
	}

	private static String[] splitOnCapital(final String nev) {
		return nev.replaceAll("(?<!^)(\\p{Lu})", " $1").split(SPACE);
	}

	private static Integer parseBirthYear(final String szuletettStr) {
		final int szuletesiEv;
		try {
			szuletesiEv = Integer.parseInt(szuletettStr);
		} catch (final NumberFormatException e) {
			log.error("Error parsing birth year: {}", szuletettStr);

			return 0;
		}

		return szuletesiEv;
	}

}
