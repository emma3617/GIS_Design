var view, csvLayer; // 定义为全局变量

require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/CSVLayer",
    "esri/renderers/SimpleRenderer",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
    "esri/widgets/Search",
    "esri/geometry/geometryEngine"
], function (Map, MapView, CSVLayer, SimpleRenderer, SimpleMarkerSymbol, BasemapGallery, Expand, Search, geometryEngine) {
    var map = new Map({
        basemap: "satellite"
    });

    view = new MapView({
        container: "viewDiv",
        map: map,
        center: [116.383331, 39.916668], // Longitude, latitude
        zoom: 12
    });

    // 创建一个简单的点符号
    var markerSymbol = new SimpleMarkerSymbol({
        color: [226, 119, 40], // RGBA颜色
        outline: { // 定义外边框
            color: [255, 255, 255], // 白色外边框
            width: 1
        }
    });

    // 创建一个渲染器使用上面定义的符号
    var renderer = new SimpleRenderer({
        symbol: markerSymbol
    });

    // 创建CSV图层
    csvLayer = new CSVLayer({
        url: "history spots.csv",
        outFields: ["*"],
        latitudeField: "Latitude",
        longitudeField: "Longitude",
        popupTemplate: {
            title: "{Name}",
            content: [
                {
                    type: "media",
                    mediaInfos: [
                        {
                            title: "",
                            type: "image",
                            value: {
                                sourceURL: "{Image}"
                            }
                        }
                    ]
                },
                {
                    type: "fields",
                    fieldInfos: [
                        { fieldName: "Name", label: "Name" },
                        { fieldName: "Summary", label: "Summary" },
                        { fieldName: "Contact Info", label: "Contact Info" },
                        { fieldName: "Ticket Prices", label: "Ticket Prices" },
                        { fieldName: "Opening Hours", label: "Opening Hours" },
                        { fieldName: "Latitude", label: "Latitude" },
                        { fieldName: "Longitude", label: "Longitude" },
                        { fieldName: "Architectural_style", label: "Architectural Style" },
                        { fieldName: "Era", label: "Era" },
                        { fieldName: "province", label: "province" },
                        { fieldName: "Historical_events", label: "Historical Events" },
                        {
                            fieldName: "Link",
                            label: "Link",
                            visible: true,
                            format: {
                                template: "<a href={Link} target='_blank'>{Link}</a>"
                            }
                        }
                    ]
                }
            ]
        },
        renderer: renderer
    });

    map.add(csvLayer); // 将CSV图层添加到地图上

    view.when(function () {
        // 初始化下拉选单
        initDropdowns();

        // 绑定搜索按钮事件
        document.getElementById('searchButton').addEventListener('click', function () {
            searchHistoricBuildings();
        });

        // 绑定搜索框Enter事件
        document.getElementById('searchBox').addEventListener('keydown', function (event) {
            if (event.key === "Enter" || event.keyCode === 13) { // 兼容不同浏览器
                searchHistoricBuildings();
            }
        });

        // 添加切换底图按钮到地图视图中
        var basemapToggleButton = document.createElement("button");
        basemapToggleButton.style.position = "absolute";
        basemapToggleButton.style.top = "10px";
        basemapToggleButton.style.left = "10px";
        basemapToggleButton.style.zIndex = "30";
        basemapToggleButton.style.background = "#fff";
        basemapToggleButton.style.padding = "5px 10px";
        basemapToggleButton.style.border = "1px solid #ccc";
        basemapToggleButton.style.cursor = "pointer";
        view.ui.add(basemapToggleButton, "top-left");

        var basemapGallery = new BasemapGallery({
            view: view,
            container: document.createElement("div")
        });

        var basemapGalleryExpand = new Expand({
            view: view,
            content: basemapGallery
        });

        view.ui.add(basemapGalleryExpand, "top-left");

        basemapToggleButton.addEventListener('click', function () {
            var display = basemapGallery.container.style.display;
            basemapGallery.container.style.display = display === 'block' ? 'none' : 'block';
        });

        // 初始化下拉选单
        function initDropdowns() {
            var architecturalStyles = new Set();
            var eras = new Set();
            var province = new Set();

            csvLayer.queryFeatures({
                where: "1=1",
                outFields: ["Architectural_style", "Era", "province"]
            }).then(function (results) {
                results.features.forEach(function (feature) {
                    architecturalStyles.add(feature.attributes.Architectural_style);
                    eras.add(feature.attributes.Era);
                    province.add(feature.attributes.province);
                });

                populateDropdown('architecturalStyleSelect', architecturalStyles);
                populateDropdown('eraSelect', eras);
                populateDropdown('provinceSelect', province);
            });
        }

        function populateDropdown(elementId, valuesSet) {
            var selectElement = document.getElementById(elementId);
            valuesSet.forEach(function (value) {
                var option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                selectElement.appendChild(option);
            });
        }

        function searchHistoricBuildings() {
            var searchValue = document.getElementById('searchBox').value;
            var architecturalStyle = document.getElementById('architecturalStyleSelect').value;
            var era = document.getElementById('eraSelect').value;
            var province = document.getElementById('provinceSelect').value;

            var query = csvLayer.createQuery();
            query.where = "1=1";

            if (searchValue) {
                query.where += ` AND Name LIKE '%${searchValue}%'`;
            }
            if (architecturalStyle) {
                query.where += ` AND Architectural_style = '${architecturalStyle}'`;
            }
            if (era) {
                query.where += ` AND Era = '${era}'`;
            }
            if (province) {
                query.where += ` AND Historical_figures = '${province}'`;
            }

            csvLayer.queryFeatures(query).then(function (results) {
                let filteredFeatures = results.features;

                if (filteredFeatures.length > 1) {
                    var resultList = document.getElementById('resultsList');
                    resultList.innerHTML = ''; // 清空现有选项

                    filteredFeatures.forEach(function (feature) {
                        var li = document.createElement('li');
                        li.textContent = feature.attributes.Name;
                        li.onclick = function () {
                            displayResult(feature);
                            closeResultsModal();
                        };
                        resultList.appendChild(li);
                    });

                    document.getElementById('resultsModal').style.display = 'block'; // 显示下拉框
                } else if (filteredFeatures.length === 1) {
                    displayResult(filteredFeatures[0]);
                } else {
                    console.log("No results found");
                    view.popup.close();
                }
            }).catch(function (error) {
                console.error("Search failed:", error);
            });
        }

        function displayResult(feature) {
            var geometry = feature.geometry;
            view.goTo({
                target: geometry,
                zoom: 15
            }, {
                duration: 1500,
                easing: "ease-in-out"
            }).then(function () {
                view.popup.open({
                    features: [feature],
                    location: geometry
                });
            });
        }

        function closeResultsModal() {
            var resultsModal = document.getElementById('resultsModal');
            if (resultsModal) {
                resultsModal.style.display = 'none';
                console.log('Modal closed successfully.');
            } else {
                console.log('Error: Modal element not found.');
            }
        }

        var closeButton = document.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', function () {
                closeResultsModal();
            });
        }
    });
});
