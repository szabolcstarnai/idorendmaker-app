package hu.szabolcst.idorendmaker.utils;

public final class StringUtil {

	public static final String EMPTY = "";
	public static final String SPACE = " ";

	private StringUtil() {
		throw new UnsupportedOperationException();
	}

	public static String removeFrom(final String target, final String toRemove) {
		return target.replace(toRemove, EMPTY);
	}

}
