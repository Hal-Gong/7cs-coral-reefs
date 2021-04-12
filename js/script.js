var myMap = L.map("map").setView([-21, 149], 5.5);
// Mapbox map api overrides the original leaflet one.
L.tileLayer("https://api.mapbox.com/styles/v1/mengxuanzhang/ckg0jawvb0we919o7a7wv5aqv/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWVuZ3h1YW56aGFuZyIsImEiOiJja2cwOXMwZjMyNTFqMnpwOTI0aWQ4YXUwIn0.9ynMtyT-AXaXa8j2qEqEdg", {
attribution: 'Map data © href="https://www.openstreetmap.org/">OpenStreetMap contributors, href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA, Imagery © href="https://www.mapbox.com/">Mapbox',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'your.mapbox.access.token'
}).addTo(myMap);
var layerGroup = L.layerGroup().addTo(myMap);
var latlngArray = [];

var data = {
    where: "1=1",
    outFields: "*",
    geometryType: "esriGeometryPolygon",
    resultRecordCount : 300,
    returnGeometry : true,
    f: "pgeojson"
};

var tideData = {
    resource_id: '7afe7233-fae0-4024-bc98-3a72f05675bd',
    limit: 80000
};

// Select tide data, set markers, popup information.
function iterateRecordsTide(data) {
    // Get current time.
    var currentTime = Math.floor(Date.now()/1000);
    // Get the time 24 hours ago.
    var Time = Math.ceil((currentTime-86400) / 600) * 600;

    $.each(data.result.records, function(recordKey, recordValue) {        
        var recordSeconds = recordValue["Seconds"];
        
        if (recordSeconds == Time) {
            var longitude = recordValue["Longitude"];
            var latitude = recordValue["Latitude"];
            var recordTime = recordValue["DateTime"];
            var recordPrediction = recordValue["Prediction"];
            var recordSite = recordValue["Site"];
            var marker = L.marker([latitude, longitude]).addTo(myMap);
            // Set popup text and realize click-popup
            popupText = "<p class = 'poptext'>Site: " + recordSite + "</p><p class = 'poptext'>Predicted Water Level: " + recordPrediction + "</p><p class = 'poptext'>Date & Time: " + recordTime + "<p>";
            marker.bindPopup(popupText).openPopup;
        }
    });
}

// Set data to each layer.
function iterateRecords(feature, layer) {
    layer.layerID = feature.properties.UNIQUE_ID;
    layer.longitude = feature.properties.X_COORD;
    layer.latitude = feature.properties.Y_COORD;

    // Set popup text and realize click-popup.
    layer.bindPopup("<p class = 'poptext'>Unique ID: " + feature.properties.UNIQUE_ID + "</p><p class = 'poptext'>Reef Type: " + feature.properties.FEAT_NAME + "</p><p class = 'poptext'>Reef Name: " +  feature.properties.GBR_NAME + "</p><button class = 'popupButton' id = '" + feature.properties.UNIQUE_ID + "addButton'>+add</button><button class = 'popupButton' id = '" + feature.properties.UNIQUE_ID + "cancelButton'>-cancel</button>", {closeOnClick: true, autoClose: false}).openPopup();

    // Add/cancel button
    layer.on('popupopen',function() {
        $("#" + layer.layerID +"addButton").click(function(event) {
            event.preventDefault();
            console.log("add");
            if (confirm("I want to add this reef to my route.")) {
                addLatlng(layer.latitude, layer.longitude);
            }
            layer.closePopup();
        }); 

        $("#" + layer.layerID +"cancelButton").click(function(event) {
            event.preventDefault();
            console.log("cancel");
            if (confirm("I want to cancel this reef from my route.")) {
                cancelLatlng(layer.latitude, layer.longitude); 
            }
            layer.closePopup();
        }); 
    });
}

// Add the reef coordinate to array and sort them for route.
function addLatlng(latitude,longitude) {
    var roofAdded = false;
    // Check whether it is in the array.
    for (let index = 0; index < latlngArray.length; index++) {
        const element = latlngArray[index];
        // If it is in the array popup alert window.
        if (latitude == element[0] && longitude == element[1]) {
            alert("This reef has been added.");
            roofAdded = true;
        }
    }

    // If it is not in the array, add it in.
    if (!roofAdded) {
        var latlng = [latitude,longitude];
        latlngArray.push(latlng);
        // Sort the array: longitude ascending then latitude ascending.
        latlngArray.sort(([a,b],[c,d]) => b-d || a-c);
    }

    // console.log(latlngArray);
    // Generate the route.
    drawLine(latlngArray);
}

// Cancel the reef coordinate from array for route.
function cancelLatlng(latitude,longitude) {
    var cancelIndex = -1;
    // Check whether it is in the array.
    for (let index = 0; index < latlngArray.length; index++) {
        const element = latlngArray[index];
        if (latitude == element[0] && longitude == element[1]) {
            cancelIndex = index;
        }
    }
    // If it is in the array, delete it.
    if (cancelIndex != -1) {
        latlngArray.splice(cancelIndex, 1);
    }

    // console.log(latlngArray);
    // Generate the route.
    drawLine(latlngArray);
}

// Draw the line. (Clear the layers first and draw it again)
function drawLine(latlngs) {
    layerGroup.clearLayers();
    L.polyline(latlngs,{color: 'white'}).addTo(layerGroup);
}


$(document).ready(function() {
    // Search bar
    $('#search-by-reefID').keyup(function() {
        myMap.eachLayer(function(layer) {
            layer.closePopup();
        });

        // Determine whether the input is more then two digits.
        if (this.value.length > 1 ) {
            let input = this;
            // Look for the layers which meet the rule, then open the popup window.
            myMap.eachLayer(function(layer) {
                if (typeof layer.layerID =='string' && layer.layerID.includes(input.value)) {
                    layer.openPopup();
                }
            });
        }
    });

    // Ajax request for reef data.
    $.ajax({
        url: "https://services8.arcgis.com/ll1QQ2mI4WMXIXdm/ArcGIS/rest/services/Great_Barrier_Reef_features/FeatureServer/0/query",
        data: data,
        dataType: "jsonp",
        cache: true,
        success: function(results) {
            L.geoJson(results, {onEachFeature: iterateRecords}).addTo(myMap);
            console.log("Got reefs")
        }
    });

    // Ajax request for tide data.
    $.ajax({
        url: 'https://www.data.qld.gov.au/api/3/action/datastore_search',
        data: tideData,
        dataType: 'jsonp',
        cache:true,
        success: function(results) {
            iterateRecordsTide(results);
            console.log("Got tide levels");
        }
    });

    //
    $('.button1').click(function() {
        if ($('.button1').css('display') == "none") {
            $('#infor').show();
        } else {
            $('#infor').hide();
        }
    });
    
    $('.button').click(function() {
        if ($('.button').css('display') != "none") {
            $('#infor').show();
        }
    }); 
});