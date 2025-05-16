// Add legend
var legendPanel = ui.Panel({
  style: {
    padding: '8px 15px',
    position: 'bottom-left'
  }
});// Normalized Burn Ratio (NBR) Analysis App for Switzerland
// This app allows users to select a reference date for NBR analysis

// No imports needed for UI - GEE has built-in ui namespace

// Set the initial map view to Switzerland
Map.setCenter(8.458288, 47.133943, 8);

// Set the satellite basemap
Map.setOptions('SATELLITE');

///////////////////////////////////////////////////////
// Get the official Switzerland boundaries
var aoi = ee.FeatureCollection('projects/satromo-prod/assets/res/CH_boundaries_buffer_5000m_epsg32632').geometry();

// Mask for the forest
var forest_mask = ee.Image('projects/satromo-prod/assets/res/ch_bafu_lebensraumkarte_mask_forest_epsg32632');

///////////////////////////////////////////////////////
// FUNCTIONS

// Function to calculate all required dates based on reference date and duration
function calculate_dates(reference_date, duration_days) {
  // Convert reference date to ee.Date
  var ref_date = ee.Date(reference_date);
  
  // Calculate post-disturbance period dates
  var startdate_post = ref_date.advance(1, 'day'); // Start one day after the reference date
  var enddate_post = startdate_post.advance(duration_days, 'day'); // End after duration_days
  
  // Calculate pre-disturbance period dates (one year before)
  var startdate_pre = startdate_post.advance(-1, 'year');
  var enddate_pre = enddate_post.advance(-1, 'year');
  
  return {
    startdate_post: startdate_post.format('YYYY-MM-dd'),
    enddate_post: enddate_post.format('YYYY-MM-dd'),
    startdate_pre: startdate_pre.format('YYYY-MM-dd'),
    enddate_pre: enddate_pre.format('YYYY-MM-dd')
  };
}

// Function to calculate the normalized burn ratio
var calculate_nbr = function(startdate, enddate, aoi) {
  // Load the 10m and 20m resolution image collections
  var S2_col_10m = ee.ImageCollection('projects/satromo-prod/assets/col/S2_SR_HARMONIZED_SWISS')
                .filterDate(startdate, enddate)
                .filterBounds(aoi)
                .filter(ee.Filter.stringEndsWith('system:index', '10m'));
  
  var S2_col_20m = ee.ImageCollection('projects/satromo-prod/assets/col/S2_SR_HARMONIZED_SWISS')
                .filterDate(startdate, enddate)
                .filterBounds(aoi)
                .filter(ee.Filter.stringEndsWith('system:index', '20m'));
  
  // Apply the cloud and terrain shadow mask within the 10m S2 image collection
  var S2_col_10m_masked = S2_col_10m.map(function(image) {
    var cloudMask = image.select('cloudAndCloudShadowMask').eq(0);
    var shadowMask = image.select('terrainShadowMask').lt(100);
    return image.updateMask(cloudMask).updateMask(shadowMask);
  });
  
  // Get a list of image IDs from the 10m collection
  var imageIDs_10m = S2_col_10m_masked.aggregate_array('system:index');
  
  // Function to extract the base ID without the resolution suffix
  var getBaseID = function(id) {
    // Assuming the ID format is something like "YYYYMMDD_10m"
    return ee.String(id).slice(0, -3); // Remove the last 3 characters ("10m")
  };
  
  // Map over the 20m collection to find corresponding 10m images
  var S2_col_20m_masked = S2_col_20m.map(function(image20m) {
    // Get the base id by removing the "20m" suffix
    var id20m = ee.String(image20m.get('system:index'));
    var baseID = getBaseID(id20m);
    
    // Find the corresponding 10m image (with "10m" suffix)
    var id10m = baseID.cat('10m');
    
    // Get the 10m image with this ID
    var image10m = ee.Image(
      S2_col_10m.filter(ee.Filter.eq('system:index', id10m)).first()
    );
    
    // Create a mask from the 10m image
    var validMask = ee.Algorithms.If(
      ee.Algorithms.IsEqual(image10m, null),
      null,
      image10m.select('cloudAndCloudShadowMask').eq(0)
        .and(image10m.select('terrainShadowMask').lt(100))
    );
    
    // Apply the mask if it's valid, otherwise return the original image
    return ee.Algorithms.If(
      ee.Algorithms.IsEqual(validMask, null),
      image20m,
      image20m.updateMask(validMask)
    );
  });
  
  // Filter null images from the collection
  S2_col_20m_masked = S2_col_20m_masked.filter(ee.Filter.notNull(['system:index']));
  
  // Calculate NBR for the image collection
  var NBR_col = S2_col_20m_masked.map(function(image) {
    return image.normalizedDifference(['B8A', 'B11']).rename('nbr');
  });
  
  // Calculate median NBR
  var NBR = NBR_col.median().rename('median');
  
  // Apply forest mask
  NBR = NBR.updateMask(forest_mask);
  
  return NBR;
};

// Function to process NBR analysis
function processNBR(reference_date) {
  // Clear previous layers
  Map.layers().reset();
  
  // Add satellite base map (satellite view is set in Map.setOptions)
  // Note: GEE doesn't allow direct opacity control of base maps, so we'll handle transparency
  // through visualization parameters of our analysis layers instead
  
  // Set duration for analysis (default: 60 days)
  var duration_days = 60;
  
  // Calculate all required dates
  var dates = calculate_dates(reference_date, duration_days);
  var startdate_post = dates.startdate_post;
  var enddate_post = dates.enddate_post;
  var startdate_pre = dates.startdate_pre;
  var enddate_pre = dates.enddate_pre;
  
  // Calculate NBR for post-disturbance period
  var NBR_post = calculate_nbr(startdate_post, enddate_post, aoi);
  
  // Calculate NBR for pre-disturbance period
  var NBR_pre = calculate_nbr(startdate_pre, enddate_pre, aoi);
  
  // Calculate dNBR (post - pre)
  var dNBR = NBR_post.subtract(NBR_pre).rename('dnbr');
  
  // Create binary mask layer for forest disturbance
  var disturbance_mask = dNBR.lte(-0.15);
  var disturbance = dNBR.updateMask(disturbance_mask);
  
  // Visualization parameters with transparency
  var vis_nbr = {min: 0.3, max: 0.8, palette: ['c8e6c9', '1b5e20'], opacity: 0.8}; // greens with transparency
  var vis_dif = {min: -0.2, max: 0.2, palette: ['D32F2F', 'FFFDE7', '1976D2'], opacity: 0.8};
  var vis_disturbance = {palette: ['7B0323'], opacity: 0.8};

  // Add year information to layer names based on the dates
  var pre_year = ee.Date(startdate_pre).get('year').getInfo();
  var post_year = ee.Date(startdate_post).get('year').getInfo();
  
  // Add layers to map
  Map.addLayer(NBR_pre.select('median'), vis_nbr, 'NBR: ' + pre_year, false);
  Map.addLayer(NBR_post.select('median'), vis_nbr, 'NBR: ' + post_year, false);
  Map.addLayer(dNBR.select('dnbr'), vis_dif, 'NBR: Delta ' + pre_year + '/' + post_year, true);
  Map.addLayer(disturbance, vis_disturbance, 'Disturbed forest areas (dNBR ≤ -0.15)', true);
  
  // Display date range information in the console
  print('Analysis performed with:');
  print('Reference date: ' + reference_date);
  print('Post-disturbance period: ' + startdate_post + ' to ' + enddate_post);
  print('Pre-disturbance period: ' + startdate_pre + ' to ' + enddate_pre);
  
  // Remove loading indicator
  panel.remove(panel.widgets().get(7));
}

// Create UI panel
var panel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
    width: '350px',
    padding: '10px'
  }
});

// Add title
var title = ui.Label({
  value: 'Normalized Burn Ratio (NBR) Analysis',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 10px 0'
  }
});
panel.add(title);

// Add description
var description = ui.Label({
  value: 'Select a reference date to analyze forest disturbances in Switzerland. ' +
         'The app will compare NBR values with the same period from the previous year.',
  style: {margin: '0 0 10px 0'}
});
panel.add(description);

// Create date picker
var dateSelector = ui.Textbox({
  placeholder: 'YYYY-MM-DD (e.g., 2021-06-21)',
  value: '2021-06-21',
  style: {width: '200px'}
});

// Add date picker label
var dateLabel = ui.Label('Enter Reference Date (YYYY-MM-DD):', 
  {fontWeight: 'bold', margin: '10px 0 5px 0'});
panel.add(dateLabel);
panel.add(dateSelector);

// Add date validation message
var dateValidationMsg = ui.Label('', 
  {color: 'red', margin: '2px 0', fontSize: '12px'});
panel.add(dateValidationMsg);

// Function to validate date format
function validateDate(dateString) {
  // Check if the format is YYYY-MM-DD
  var dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  // Check if it's a valid date
  var d = new Date(dateString);
  if (isNaN(d.getTime())) {
    return false;
  }
  
  // Check if date is within our allowed range (April 2018 to present)
  var minDate = new Date('2018-04-01');
  var maxDate = new Date(); // Current date
  
  if (d < minDate || d > maxDate) {
    return false;
  }
  
  return true;
}

// Add process button
var processButton = ui.Button({
  label: 'Process NBR Analysis',
  onClick: function() {
    var selected_date = dateSelector.getValue();
    
    // Validate date
    if (!validateDate(selected_date)) {
      dateValidationMsg.setValue('Please enter a valid date between Apr 2018 and today');
      return;
    } else {
      dateValidationMsg.setValue('');
    }
    
    // Process analysis with the selected date
    processNBR(selected_date);
  },
  style: {
    margin: '10px 0 0 0',
    color: 'white',
    backgroundColor: '#4285F4'
  }
});
panel.add(processButton);

// Add quick-select date buttons
var dateButtonPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {margin: '5px 0'}
});

// Function to create date buttons
function createDateButton(label, date) {
  var button = ui.Button({
    label: label,
    onClick: function() {
      dateSelector.setValue(date);
      dateValidationMsg.setValue('');
    },
    style: {margin: '0 5px 0 0', padding: '2px 8px', fontSize: '12px'}
  });
  return button;
}

// Add quick date selection buttons
dateButtonPanel.add(createDateButton('2018', '2018-06-21'));
dateButtonPanel.add(createDateButton('2019', '2019-06-21'));
dateButtonPanel.add(createDateButton('2020', '2020-06-21'));
dateButtonPanel.add(createDateButton('2021', '2021-06-21'));
dateButtonPanel.add(createDateButton('2022', '2022-06-21'));
dateButtonPanel.add(createDateButton('Today', ee.Date(Date.now()).format('YYYY-MM-dd').getInfo()));

panel.add(ui.Label('Quick Select:', {margin: '10px 0 2px 0'}));
panel.add(dateButtonPanel);

// Add legend title
var legendTitle = ui.Label({
  value: 'Legend',
  style: {
    fontWeight: 'bold',
    fontSize: '14px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});
legendPanel.add(legendTitle);

// Create legend items
function addLegendItem(color, name) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });
  
  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 18px'}
  });
  
  legendPanel.add(
    ui.Panel([colorBox, description], ui.Panel.Layout.Flow('horizontal'))
  );
}

// Add legend items
addLegendItem('#D32F2F', 'Decreased NBR (potential disturbance)');
addLegendItem('#1976D2', 'Increased NBR');
addLegendItem('#7B0323', 'Severe forest disturbance (dNBR ≤ -0.15)');

// Add notes section
var notesLabel = ui.Label({
  value: 'Notes:',
  style: {
    fontWeight: 'bold',
    fontSize: '14px',
    margin: '15px 0 5px 0'
  }
});
panel.add(notesLabel);

var notes = ui.Label({
  value: '- Analysis uses a 60-day window after your selected date\n' +
         '- Compares with the same 60-day period from previous year\n' +
         '- Forest disturbances appear as red areas in the delta map\n' +
         '- Severe disturbances (dNBR ≤ -0.15) are highlighted in dark red',
  style: {whiteSpace: 'pre'}
});
panel.add(notes);

// Add panels to the UI
Map.add(panel);
Map.add(legendPanel);

// Run initial analysis with default date
processNBR('2021-06-21');
