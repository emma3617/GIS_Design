var view, csvLayer; // 定义为全局变量

require([
    "esri/views/MapView",
    "esri/WebMap",
    "esri/layers/CSVLayer",
    "esri/renderers/SimpleRenderer",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "dojo/domReady!"
], function (MapView, WebMap, CSVLayer, SimpleRenderer, SimpleMarkerSymbol, BasemapGallery, Expand, Graphic, GraphicsLayer) {

    var markerSymbol = new SimpleMarkerSymbol({
        color: [226, 119, 40],
        outline: { color: [255, 255, 255], width: 2 }
    });

    var renderer = new SimpleRenderer({
        symbol: markerSymbol
    });

    var csvLayer = new CSVLayer({
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
                            value: { sourceURL: "{Image}" }
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
                            format: { template: "<a href={Link} target='_blank'>{Link}</a>" }
                        }
                    ]
                }
            ]
        },
        renderer: renderer
    });

    var map = new WebMap({
        basemap: "satellite",
        layers: [csvLayer]
    });

    var view = new MapView({
        container: "viewDiv",
        map: map,
        center: [116.383331, 39.916668], // Longitude, latitude
        zoom: 12
    });


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
        var basemapGallery = new BasemapGallery({
            view: view,
            container: document.createElement("div")
        });

        var basemapGalleryExpand = new Expand({
            view: view,
            content: basemapGallery
        });

        view.ui.add(basemapGalleryExpand, "top-left");

        document.getElementById('toggleSearch').addEventListener('click', function () {
            document.getElementById('searchSection').style.display = 'block';
            document.getElementById('routeSection').style.display = 'none';
            this.classList.add('active');
            document.getElementById('toggleRoute').classList.remove('active');
        });

        document.getElementById('toggleRoute').addEventListener('click', function () {
            document.getElementById('searchSection').style.display = 'none';
            document.getElementById('routeSection').style.display = 'block';
            this.classList.add('active');
            document.getElementById('toggleSearch').classList.remove('active');
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

        /* 添加路線圖層 */
        const graphicsLayer = new GraphicsLayer();
        map.add(graphicsLayer);

        document.getElementById('showRouteButton').addEventListener('click', function () {
            const route = document.getElementById('routeSelect').value;
            if (route) {
                // 根據選擇的路線顯示地圖路徑和資訊
                showRoute(route);
            }
        });

        function showRoute(route) {
            // 清除現有圖形
            graphicsLayer.removeAll();

            // 假設我們有路線資料
            const routes = {
                "route1": {
                    "details": "路線1的詳細資訊",
                    "path": [
                        [116.4074, 39.9042],
                        [116.4084, 39.9052],
                        [116.4094, 39.9062]
                    ]
                }
                // 添加更多路線
            };

            if (routes[route]) {
                const routeData = routes[route];
                document.getElementById('routeInfo').style.display = 'block';
                document.getElementById('routeDetails').innerText = routeData.details;

                const polyline = {
                    type: "polyline",
                    paths: routeData.path
                };

                const polylineSymbol = {
                    type: "simple-line",
                    color: [226, 119, 40],
                    width: 4
                };

                const polylineGraphic = new Graphic({
                    geometry: polyline,
                    symbol: polylineSymbol
                });

                graphicsLayer.add(polylineGraphic);
            }
        }
            // Home button to reset map view
            document.getElementById('homeButton').addEventListener('click', function() {
                view.goTo({
                    center: [116.383331, 39.916668],
                    zoom: 12
                }, {
                    duration: 500,
                    easing: "ease-in-out"
                });
        });
    });
});
