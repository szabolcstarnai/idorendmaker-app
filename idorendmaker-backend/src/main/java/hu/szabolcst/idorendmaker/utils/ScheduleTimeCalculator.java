package hu.szabolcst.idorendmaker.utils;

import java.util.List;


public final class ScheduleTimeCalculator {

    public static int timeToMinutes(final String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty()) {
            return 0;
        }

        final String[] parts = timeStr.split(":");
        if (parts.length != 2) {
            throw new IllegalArgumentException("Invalid time format: " + timeStr + ". Expected HH:MM");
        }

        try {
            final int hours = Integer.parseInt(parts[0]);
            final int minutes = Integer.parseInt(parts[1]);
            return hours * 60 + minutes;
        } catch (final NumberFormatException e) {
            throw new IllegalArgumentException("Invalid time format: " + timeStr + ". Expected HH:MM", e);
        }
    }


    public static String minutesToTime(final int minutes) {
        final int hours = Math.floorDiv(minutes, 60);
        final int mins = minutes % 60;
        return String.format("%02d:%02d", hours, mins);
    }


    public static String calculateRaceTime(final int raceIndex, final List<Integer> intervals, final String sectionStartTime) {
        if (raceIndex == 0) {
            return sectionStartTime;
        }

        int totalMinutes = timeToMinutes(sectionStartTime);

        for (int i = 0; i < raceIndex && i < intervals.size(); i++) {
            final Integer interval = intervals.get(i);
            totalMinutes += (interval != null) ? interval : 0;
        }

        return minutesToTime(totalMinutes);
    }


    public static String formatInterval(final int minutes) {
        final int hours = Math.floorDiv(minutes, 60);
        final int mins = minutes % 60;
        return String.format("+ %02d:%02d", hours, mins);
    }


    public static String calculateTotalDuration(final String startTime, final String lastRaceTime, final String hoursLabel,
        final String minutesLabel) {
        if (lastRaceTime == null || lastRaceTime.trim().isEmpty()) {
            return "0 " + minutesLabel;
        }

        final int startTotalMin = timeToMinutes(startTime);
        final int endTotalMin = timeToMinutes(lastRaceTime);
        final int duration = endTotalMin - startTotalMin;

        final int hours = Math.floorDiv(duration, 60);
        final int minutes = duration % 60;

        if (hours > 0) {
            return hours + " " + hours + " " + hoursLabel + " " + minutes;
        }
        return minutes + " " + minutes;
    }


    public static String calculateStartTimeForOrderIndex(final int orderIndex, final List<Integer> intervalsList,
        final String sectionStartTime) {
        return calculateRaceTime(orderIndex, intervalsList, sectionStartTime);
    }
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmake\\utils\ScheduleTimeCalculator.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */