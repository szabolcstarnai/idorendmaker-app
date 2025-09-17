package hu.szabolcst.idorendmaker.utils;

public final class StringUtil {

    public static final String EMPTY = "";
    public static final String SPACE = " ";

    private StringUtil() {
        throw new UnsupportedOperationException();
    }

    public static String removeFrom(final String target, final String toRemove) {
        return target.replace(toRemove, "");
    }
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmake\\utils\StringUtil.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */