# AI-Farm
A Complete Solution For Managing a Farm, Gorwing Your Own Food, Or Even If You Want To Grow Roses.

## How Does AI-FARM Help You
  AI-Farm helps you on Four different levels:
- Offline data gathering, and automatic data upload on approach:
    - an Esp32 Gathers Data from Temperature, Humidity, Light, Wind, And Soil Moisture Sensors, and saves it to an SD Card if there is nonetwork close by.
    - the Esp32 automatically checks for Networks nearby, and if available, connects to them and starts pinging the server.
    - if the server is online on the current network, the Esp32 automatically sends the data gathered in the SD Card first, then the current Data.
- Offline And Online Dashboard For Data visualization:
    - if the Esp32 is Not Connected to the server the Dashboard connects to the server, and gets the all the Data saved fromthe last Two Days(Customizable).
    - if the Esp32 is COnnected to the server and Data is being gathered in real time, the Dashboard switches to Online Mode, Where it zooms on the last 5 min(Customizable) of Data
    - in both cases the dashboard shows the graphes of all data, and adds on top of that the current task, and the last watering time for every region.
- Monitoring Sessions:
    - Every Two Weeks or so, a monitoring session should be done, where any device connected to the server starts the session.
    - after starting the session every picture from any device will be included in the same monitoring session.
    - then everone in the team connects to the server using their phones, or any connected deviece with a camera.
    - after connection everyone can take pictures of the plants' leafs all over the farm, and their locations are sent with the pictures and saved on the server.
    - at the end, when the "End Monitoring Session" Button is clicked, all the pictures are passed to a ViT Disease Classification AI, that labels every picture as healthy, or with a disease if not.
    - then a report is generated and saved in the database, with a timestamp.
- Report & Suggestions:
    - opening the report tab, asks the server for the last report saved from the last monitoring session made, and gets shows it.
    - when making the report at the end of a monitoring session, all the data form the last monitoring session to the one being endeed, is averaged
    - then is compared with the ideal ranges of every data vector, of the plant the data has been gathered from.
    - then the report gets generated, containing an introduction describing the purpose of the report,
    - and a describtion then an analysis of evey data vector, its benefits or harmful effects.
    - then it goes to describe the diseases that has been detected in the farm.
    - then is concludes by a general conslusion, and a prediction of how the farm's stat is changing in the futur to the next monitoring session.
    - in the Report Tab, you can read or download the report as a pdf,
    - and you have a "Get Suggestions" button which leads you to another page where a TODO List of suggestions and solutions can be viewed, or downloaded.
    - these sugestions are based on the report giving steps to solve every problem that was described in the report, and the areelimited to things that don't need an expert to apply.
