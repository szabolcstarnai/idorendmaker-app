package hu.szabolcst.idorendmaker.extractor;

import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

@Getter
public class LineData {

	private final float y;
	private final List<PositionalText> positionalText = new ArrayList<>();

	public LineData(final float y) {
		this.y = y;
	}

	public void addText(final PositionalText text) {
		positionalText.add(text);
	}

	public String getText() {
		final StringBuilder builder = new StringBuilder();
		for (final PositionalText text : positionalText) {
			builder.append(text.text());
		}

		return builder.toString();
	}

}
