package hu.szabolcst.idorendmaker.extractor;

import lombok.Getter;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class PositionalTextStripper extends PDFTextStripper {

	private static final float LINE_THRESHOLD = 2.0f;

	@Getter
	private final List<LineData> lineDataList = new ArrayList<>();
	private final Map<Float, LineData> lineMap = new HashMap<>();

	public PositionalTextStripper() {
		super();
		setSortByPosition(true);
	}

	@Override
	protected void processTextPosition(final TextPosition text) {
		super.processTextPosition(text);
		if (text.getUnicode().trim().isEmpty()) {
			return;
		}

		final float y = text.getY();
		// Find the closest line using the threshold
		float closestY = -1;
		float minDistance = Float.MAX_VALUE;

		for (final float lineY : lineMap.keySet()) {
			final float distance = Math.abs(lineY - y);
			if (distance < minDistance && distance <= LINE_THRESHOLD) {
				closestY = lineY;
				minDistance = distance;
			}
		}

		final LineData line;
		if (closestY >= 0) {
			line = lineMap.get(closestY);
		} else {
			line = new LineData(y);
			lineMap.put(y, line);
			lineDataList.add(line);
		}

		line.addText(new PositionalText(text.getX(), y, text.getUnicode()));
	}

}
