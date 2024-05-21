var view, csvLayer, graphicsLayer; // 定义为全局变量

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

    csvLayer = new CSVLayer({
        url: "history spots_0522.csv",
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

    view = new MapView({
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

        // 绑定清除按钮事件
        document.getElementById('clearButton').addEventListener('click', function () {
            clearFilters();
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
            resetMapView(); // 重置地图视图
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
            var provinces = new Set();

            csvLayer.queryFeatures({
                where: "1=1",
                outFields: ["Architectural_style", "Era", "province"]
            }).then(function (results) {
                results.features.forEach(function (feature) {
                    architecturalStyles.add(feature.attributes.Architectural_style);
                    eras.add(feature.attributes.Era);
                    provinces.add(feature.attributes.province);
                });

                populateDropdown('architecturalStyleSelect', architecturalStyles, "请选择建筑风格");
                populateDropdown('eraSelect', eras, "请选择时代");
                populateDropdown('provinceSelect', provinces, "请选择行政区/省份");
            });

            document.getElementById('architecturalStyleSelect').addEventListener('change', function () {
                updateDropdowns('architecturalStyleSelect');
            });
            document.getElementById('eraSelect').addEventListener('change', function () {
                updateDropdowns('eraSelect');
            });
            document.getElementById('provinceSelect').addEventListener('change', function () {
                updateDropdowns('provinceSelect');
            });
        }

        function populateDropdown(elementId, valuesSet, placeholder) {
            var selectElement = document.getElementById(elementId);
            selectElement.innerHTML = `<option value="">${placeholder}</option>`; // 重置下拉选单并添加提示文字
            valuesSet.forEach(function (value) {
                var option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                selectElement.appendChild(option);
            });
        }

        function updateDropdowns(changedElementId) {
            var selectedArchitecturalStyle = document.getElementById('architecturalStyleSelect').value;
            var selectedEra = document.getElementById('eraSelect').value;
            var selectedProvince = document.getElementById('provinceSelect').value;

            var query = csvLayer.createQuery();
            query.where = "1=1";

            if (selectedArchitecturalStyle) {
                query.where += ` AND Architectural_style = '${selectedArchitecturalStyle}'`;
            }
            if (selectedEra) {
                query.where += ` AND Era = '${selectedEra}'`;
            }
            if (selectedProvince) {
                query.where += ` AND province = '${selectedProvince}'`;
            }

            csvLayer.queryFeatures(query).then(function (results) {
                var architecturalStyles = new Set();
                var eras = new Set();
                var provinces = new Set();

                results.features.forEach(function (feature) {
                    architecturalStyles.add(feature.attributes.Architectural_style);
                    eras.add(feature.attributes.Era);
                    provinces.add(feature.attributes.province);
                });

                if (changedElementId !== 'architecturalStyleSelect') {
                    populateDropdown('architecturalStyleSelect', architecturalStyles, "请选择建筑风格");
                    document.getElementById('architecturalStyleSelect').value = selectedArchitecturalStyle;
                }
                if (changedElementId !== 'eraSelect') {
                    populateDropdown('eraSelect', eras, "请选择时代");
                    document.getElementById('eraSelect').value = selectedEra;
                }
                if (changedElementId !== 'provinceSelect') {
                    populateDropdown('provinceSelect', provinces, "请选择行政区/省份");
                    document.getElementById('provinceSelect').value = selectedProvince;
                }
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
                query.where += ` AND province = '${province}'`;
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

        function clearFilters() {
            document.getElementById('searchBox').value = '';
            document.getElementById('architecturalStyleSelect').value = '';
            document.getElementById('eraSelect').value = '';
            document.getElementById('provinceSelect').value = '';
            initDropdowns();
        }

        /* 添加路線圖層 */
        graphicsLayer = new GraphicsLayer();
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

            // 路線資料
            const routes = {
                "route1": {
                    "details": "路线 1 的详细信息",
                    "spots": [
                        { "name": "景點 1", "coordinates": [116.2908589, 40.00752469] },
                        { "name": "景點 2", "coordinates": [116.3065917, 39.9980715] },
                        { "name": "景點 3", "coordinates": [116.3040327, 39.99347134] }
                    ],
                    "color": [237, 250, 0]
                },
                "route2": {
                    "details": "路线 2 的详细信息",
                    "spots": [
                        { "name": "景點 4", "coordinates": [116.3896137, 39.92186203] },
                        { "name": "景點 5", "coordinates": [116.3974427, 39.92285634] },
                        { "name": "景點 6", "coordinates": [116.3985817, 39.92502786] }
                    ],
                    "color": [255, 62, 165]
                },
                "route3": {
                    "details": "路线 3 的详细信息",
                    "spots": [
                        { "name": "景點 7", "coordinates": [116.3874, 39.9042] },
                        { "name": "景點 8", "coordinates": [116.3884, 39.9052] },
                        { "name": "景點 9", "coordinates": [116.3894, 39.9062] }
                    ],
                    "color": [105, 225, 71]
                }
            };


            if (routes[route]) {
                const routeData = routes[route];
                document.getElementById('routeInfo').style.display = 'block';
                document.getElementById('routeDetails').innerText = routeData.details;

                const spotGraphics = routeData.spots.map(function (spot) {
                    const point = {
                        type: "point",
                        longitude: spot.coordinates[0],
                        latitude: spot.coordinates[1]
                    };

                    const pointSymbol = {
                        type: "simple-marker",
                        color: routeData.color,
                        size: "12px",
                        outline: {
                            color: [255, 255, 255],
                            width: 2
                        }
                    };

                    const pointGraphic = new Graphic({
                        geometry: point,
                        symbol: pointSymbol,
                        attributes: { name: spot.name }
                    });


                    graphicsLayer.add(pointGraphic);
                    return pointGraphic;
                });

                // 計算包含所有景點的區域範圍並稍微移動視窗
                const geometries = spotGraphics.map(graphic => graphic.geometry);
                const extent = geometries[0].extent.clone();
                geometries.forEach(function (geometry) {
                    extent.union(geometry.extent);
                });

                view.goTo(extent.expand(1.2), { duration: 1000 });
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

        function resetMapView() {
            graphicsLayer.removeAll();
            view.goTo({
                center: [116.383331, 39.916668],
                zoom: 12
            }, {
                duration: 500,
                easing: "ease-in-out"
            });
        }
    });
});
