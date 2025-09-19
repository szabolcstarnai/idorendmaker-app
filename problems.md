REFORM SCHEDULEBUILDER

1. All instances of new schedule

Now it looks like this:
Stacked, too tall, with unnecessarily horizontally huge inputs and buttons. We need the vertical space, and as seen from buttons we have plenty unused horizontal.
+------------------------------------------------------------------------------------------------------------------------+
| Beállítások                              									         |
|------------------------------------------------------------------------------------------------------------------------|
| Időrend neve: [ Új időrend           ]    Aktuális kezdés: [ 09:00          ]    Köv. időköz (perc): [ 15         ]    |
|                       											         |
|                    												         |
|                								     	      [Excel Export] [ Mentés ]  |
+------------------------------------------------------------------------------------------------------------------------+

+------------------------------------------------------------------------------------------------------------------------+
| Nap és szakasz kezelés                         								         |
|------------------------------------------------------------------------------------------------------------------------|
| Jelenlegi szakaszok:                      									         |
| [  1. nap                                    					         Délelőtt [09:00] [+ Délután] ]	 |
|                       												 |
|                                    									                 |
| [                                       + Új nap hozzáadása                                                          ] |
+------------------------------------------------------------------------------------------------------------------------+


Proposal (something like this):

+--------------------------------------------------------------------------------------------------------------------------------------+
| Beállítások                         							  | Nap és szakasz kezelés                     |
|-----------------------------------------------------------------------------------------|--------------------------------------------|
| Időrend neve: [ Új időrend ]  Aktuális kezdés: [ 09:00 ]  Köv. időköz (perc): [ 15 ]    | Jelenlegi szakaszok:                       |
|           						     [Excel Export] [ Mentés ]	  |   1. nap                                   |
|           									          |     Délelőtt [09:00] [+ Délután]           |
|            					                                          | [+ Új nap hozzáadása]                      |
+--------------------------------------------------------------------------------------------------------------------------------------+

Meaning we combine the boxes and split them horizontally, to save vertical space.


2. PDF processed schedule

{/* PDF extraction info */}
        {raceSource === 'pdf-filtered' && pdfExtractionId && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-800">
              <div className="font-medium">Nevezési lista alapú versenyprogramozás</div>
              <div className="text-xs text-green-700 mt-1">
                Csak a nevezési listában szereplő versenyszámok
              </div>
            </div>
          </div>
        )}

This should fade out and disappear like a toast message. Better yet, make it a toast message instead. This also just takes up space, with no added value after reading it once.

Again the vertical space wasted with Versenyző követés on top of the schedule is huge, while the schedule cards itselves are wasting horizontl space with huge gaps between the content and the delete button. 

+---------------------------------------------------+
| Versenyző követés (fixed, very tall)              |
|   +-------------------------------------------+   |
|   | scrollable list inside                    |   |
|   |                                           |   |
|   |                                           |   |
|   +-------------------------------------------+   |
+---------------------------------------------------+

+---------------------------------------------------+
| Schedule (scrollable, cramped)                    |
|   09:00 MK1 ... [   lots of empty space   ]   [X] |
|   09:15 MK2 ...                               [X] |
|   ...                                             |
+---------------------------------------------------+


Proposed:

+--------------------------------------------------------------------------------+
| Versenyző követés (left, scrollable)   | Schedule (right, main scrollable)     |
|----------------------------------------|---------------------------------------|
| - Pásztor Maxim   [Magas]              | 09:00 MK1 Férfi Gyermek U10-U11 ...   |
|   09:00 MK1 ...                        |    [compact info chips]        [ X ]  |
|   09:15 MK2 ...                        |                                       |
|                                        | 09:15 MK2 Férfi Gyermek U10 ... [ X ] |
| - Szabó Bence Botond [Magas]           |                                       |
|   ...                                  |                                       |
+--------------------------------------------------------------------------------+

The fix again is to use the horizontal space we have, and split it between the versenyző követés and the schedule itself.
