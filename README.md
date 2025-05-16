# 🛰️ SwissNBR: Forest Disturbance Detection App 🇨🇭🌲

Welcome to **SwissNBR**, your ultra-focused, hyperspectral-powered geek tool for detecting forest disturbances in Switzerland using the **Normalized Burn Ratio (NBR)** and Google Earth Engine. This app was built for rapid environmental insight, temporal forest change detection, and data-driven geekery during Data Hackdays Bern.

## 💡 What it does

SwissNBR lets you:

- Select any **reference date** between April 2018 and today
- Analyze **forest disturbance** over a 60-day post-event window
- Compare it against the **same period in the previous year**
- Visualize the impact using **Sentinel-2 harmonized imagery**
- Get 🔥 `dNBR` maps and detect severe changes like wildfires or windthrow
- Feel like a geo-superhero

## 🧠 Under the Hood

This GEE app runs a pixel-based `dNBR = NBR_post - NBR_pre` analysis. It loads Swiss-harmonized Sentinel-2 images, masks clouds and shadows with custom quality masks, and:

- Uses **10m cloud masks** to filter the **20m bands** used for NBR
- Applies a **forest-only mask** from Swiss BAFU ecosystem data
- Applies **Snow-Mask** (NDSI-Based)
- Produces a visual stack:
  - ✅ NBR before and after (median)
  - ✅ Difference layer `dNBR`
  - ✅ Severe disturbance mask where `dNBR ≤ -0.15`

The app gives you map layers with intuitive color palettes:
- 🔴 Red = negative NBR change (possible damage)
- 🔵 Blue = vegetation recovery
- 🟤 Dark red = severe damage

## 🕹️ How to Use It

1. Open the app (in Google Earth Engine)
2. Pick a reference date (e.g. `2021-06-21`)
3. Click **“Process NBR Analysis”**
4. Toggle layers in the map legend
5. Inspect Swiss forests like a pro


## 🗺️ Tech Stack

- Google Earth Engine (JavaScript API)
- Sentinel-2 Level-2A imagery (`S2_SR_HARMONIZED_SWISS`)
- SwissTopo / BAFU ecosystem and boundary data
- Pure Earth Engine UI, no imports needed

## 🚀 Why It Matters

Forests in Switzerland face stress from windthrow, fire, and drought. This app provides a **lightweight decision support tool** for rapid screening and monitoring. No preprocessing. No downloads. Just actionable spatial awareness — served fresh via EO.

## 🤓 For Hackathon Judges & GeoNerds

- Fork it. Clone it. Break it. Improve it.
- Code readability? ✅
- UI/UX simplicity? ✅
- Geo-science? ✅
- Nerd cred? 💯

## 📍 Credits

Developed during the Data Hackdays Bern using Earth Engine magic and pure curiosity. Data powered by [Swisstopo](https://www.swisstopo.admin.ch) and [SATROMO].

---

🌲  See the forest *and* the trees. 🔍🌍
