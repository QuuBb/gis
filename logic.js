import data from './pointsData.json' assert {type: 'json'};
import Map from 'ol/Map.js';
import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import {useGeographic} from 'ol/proj';
import {Feature, Overlay} from 'ol';
import {Point} from 'ol/geom';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Circle from 'ol/geom/Circle.js';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import {fromLonLat} from 'ol/proj';
import {add} from 'ol/coordinate';
import {returnOrUpdate} from 'ol/extent';

const apiKey = 'AAPK10d71740470841baaed42884615b1ee18aFFNVd1aKd1B0LoIAGYeNcz4kHplJ-pTki3jwJtXugj8JnUKnI3eDglN0aIV1ij';
const authentication = arcgisRest.ApiKeyManager.fromKey(apiKey);

const list = document.getElementsByTagName('ul')[0];
const popupInfo = document.getElementById('popupInfo');
const btnCenter = document.getElementById('btnCenter');
const btnNewPoint = document.getElementById('btnNewPoint');
const btnSavePoint = document.getElementById('btnSavePoint');
const btnRoute = document.getElementById('btnRoute');
const popupSave = document.getElementById('popupSave');

const defLat = 54.4;
const defLong = 18.6;

class App {
    constructor() {
        useGeographic();

        this.Init();

        this.points = [];
        this.pointRenders = [];
        this.pointLayer;
        this.startPoint;
        this.endPoint;
        this.startFlag = true;

        this.LoadPoints();
        this.RenderPoints();
        this.SetButtonsListeners();
        this.SetMapListeners();
    }

    Init() {
        this.view = new View({
            center: [defLong, defLat],
            zoom: 12,
        });

        this.map = new Map({
            target: 'map',
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
            ],
            view: this.view,
        });
    }

    SetButtonsListeners() {
        btnCenter.addEventListener('click', () => {
            this.CenterView();
        });

        btnNewPoint.addEventListener('click', () => {
            this.AddNewPoint();
        });

        btnSavePoint.addEventListener('click', e => {
            e.preventDefault();
            this.SaveNewPoint();
        });

        btnRoute.addEventListener('click', () => {
            this.StartRoute();
        });
    }

    SetMapListeners() {
        this.map.on('click', event => {
            const feature = this.map.forEachFeatureAtPixel(event.pixel, feature => {
                return feature;
            });
            if (!feature) {
                popupInfo.classList.add('hidden');
                popupSave.classList.add('hidden');
                return;
            } else {
                let point = this.points.filter(obj => {
                    return obj.name === feature.getProperties()['name'];
                });

                point = point[0];

                this.ShowPointInfo(point);
                this.SetViewToPoint(point);
            }
        });

        this.map.on('dblclick', event => {
            this.AddNewPoint(event);
        });
    }

    LoadDefaultPoints() {
        const points = [...data.monuments];
        points.forEach(point => {
            point.default = true;
        });
        this.points.push(...points);
    }

    LoadSavedPoints() {
        if (localStorage.length == 0) return;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const point = JSON.parse(localStorage.getItem(localStorage.key(i)));
            point.default = false;
            point.key = key;
            this.points.push(point);
        }
    }

    LoadPoints() {
        this.points = [];
        this.LoadDefaultPoints();
        this.LoadSavedPoints();
    }

    RenderPointsToMap() {
        this.map.removeLayer(this.map.getLayers().array_[1]);
        this.pointRenders = [];
        this.points.forEach(point => {
            let pointRender = new Feature({
                geometry: new Point([point.longitude, point.latitude]),
                name: point.name,
            });

            pointRender.setStyle(
                new Style({
                    image: new Icon({
                        scale: 0.7,
                        anchor: [0.5, 1],
                        anchorXUnits: 'fraction',
                        anchorYUnits: 'fraction',
                        src: 'data/img.png',
                    }),
                })
            );

            this.pointRenders.push(pointRender);
        });

        this.vectorSource = new VectorSource({
            features: this.pointRenders,
        });

        this.vectorLayer = new VectorLayer({
            source: this.vectorSource,
        });

        this.map.addLayer(this.vectorLayer);
    }

    RenderPointToList() {
        list.innerHTML = '';
        this.points.forEach((point, i) => {
            let liHTML;
            if (point.default) {
                liHTML = `<li class="border-b-2 border-black 80 flex items-center cursor-pointer">
                <div class="w-full flex items-center p-1">
                <div class="w-8 h-8">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                    stroke="currentColor" class="w-8 h-8 min-w-[32 rem]">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                </div>
                <h3 class="text-xl">${point.name}</h3>
                </div>
            </li>`;
            } else {
                liHTML = `<li storage-key="${point.key}" class="border-b-2 border-black 80 flex items-center cursor-pointer">
                <div class="w-full flex items-center p-1">
                <div class="w-8 h-8">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                    stroke="currentColor" class="w-8 h-8 min-w-[32 rem]">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                </div>
                <h3 class="text-xl">${point.name}</h3>
                <button id="btnDelete" class="w-8 h-8 ml-auto">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                </button>
                </div>
            </li>`;
            }

            list.insertAdjacentHTML('beforeend', liHTML);

            const newLiEl = list.lastElementChild;

            newLiEl.addEventListener('click', () => {
                this.ShowPointInfo(point);
                this.SetViewToPoint(point);
            });

            if (newLiEl.getElementsByTagName('button')[0] !== undefined) {
                newLiEl.getElementsByTagName('button')[0].addEventListener('click', e => {
                    e.stopPropagation();
                    this.DeleteCustomPoint(newLiEl.getAttribute('storage-key'));
                });
            }
        });
    }

    RenderPoints() {
        this.RenderPointToList();
        this.RenderPointsToMap();
    }

    SetViewToPoint(point) {
        const newLatitude = point.latitude - -0.0013;
        const newLongitude = point.longitude - 0.001;
        const cords = [newLongitude, newLatitude];

        this.view.setCenter(cords);
        this.view.setZoom(18);
    }

    ShowPointInfo(point) {
        const x = this.map.getOverlays().getArray()[0];
        if (x !== undefined) this.map.removeOverlay(x);

        this.map.removeOverlay(0);
        const overlay = new Overlay({
            element: popupInfo,
            autoPan: {
                animation: {
                    duration: 250,
                },
            },
            positioning: 'bottom-center',
            offset: [0, -60],
        });

        this.map.addOverlay(overlay);

        overlay.setPosition([point.longitude, point.latitude]);

        fetch(`https://geocode.maps.co/reverse?lat=${point.latitude}&lon=${point.longitude}`)
            .then(response => response.json())
            .then(data => {
                popupInfo.getElementsByTagName('img')[0].src = point.photo;
                popupInfo.getElementsByTagName('h4')[0].innerHTML = point.name;
                popupInfo.getElementsByTagName('p')[2].innerHTML = point.description;

                if (data.address.house_number !== undefined) {
                    popupInfo.getElementsByTagName(
                        'p'
                    )[1].innerHTML = `ul. ${data.address.road} ${data.address.house_number}, ${data.address.city} ${data.address.postcode}`;
                } else {
                    popupInfo.getElementsByTagName('p')[1].innerHTML = `ul. ${data.address.road}, ${data.address.city} ${data.address.postcode}`;
                }
            });

        popupInfo.classList.remove('hidden');
    }

    CenterView() {
        navigator.geolocation.getCurrentPosition(
            position => {
                this.view.setCenter([position.coords.longitude, position.coords.latitude]);
                this.view.setZoom(18);
            },
            () => {
                this.view.setCenter([defLong, defLat]);
            }
        );
    }

    AddNewPoint(event = null) {
        document.getElementById('long').value = '';
        document.getElementById('lat').value = '';
        document.getElementById('name').value = '';
        document.getElementById('description').value = '';
        const addPointOverlay = new Overlay({
            element: popupSave,
            autoPan: {
                animation: {
                    duration: 250,
                },
            },
            positioning: 'bottom-center',
        });

        this.map.addOverlay(addPointOverlay);

        if (event !== null) {
            addPointOverlay.setPosition(event.coordinate);
            document.getElementById('long').value = Math.round(Number(event.coordinate[0]) * 100) / 100;
            document.getElementById('lat').value = Math.round(event.coordinate[1] * 100) / 100;
        } else {
            addPointOverlay.setPosition(this.view.getCenter());
        }
        popupSave.classList.remove('hidden');
    }

    SaveNewPoint() {
        const name = document.getElementById('name').value;
        const description = document.getElementById('description').value;
        const longitude = document.getElementById('long').value;
        const latitude = document.getElementById('lat').value;
        const photo = document.getElementById('photo').value;

        if (name === '' || description === '' || longitude === '' || latitude === '') {
            btnSavePoint.classList.remove('bg-gray-50');
            btnSavePoint.classList.add('bg-red-800');
            btnSavePoint.disabled = true;
            setTimeout(() => {
                btnSavePoint.disabled = false;
                btnSavePoint.classList.add('bg-gray-50');
                btnSavePoint.classList.remove('bg-red-800');
            }, 2000);
        } else {
            const newPoint = {
                name: name,
                longitude: longitude,
                latitude: latitude,
                description: description,
                photo: photo,
                default: false,
                key: `point${localStorage.length}`,
            };
            localStorage.setItem(`point${localStorage.length}`, JSON.stringify(newPoint));
            this.points.push(newPoint);
            popupSave.classList.add('hidden');
            this.RenderPoints();
        }
    }

    DeleteCustomPoint(pointKey) {
        localStorage.removeItem(pointKey);
        this.LoadPoints();
        this.RenderPoints();
    }

    StartRoute() {
        this.startPoint = null;
        this.endPoint = null;

        console.log('starting route');

        const old_element = document.getElementById('map');
        const new_element = old_element.cloneNode(true);
        old_element.parentNode.replaceChild(new_element, old_element);
        new_element.firstElementChild.remove();

        this.Init();
        this.RenderPointToList();

        this.map.on('click', e => {
            e.preventDefault();
            if (this.startPoint === null) {
                this.startPoint = new Point(e.coordinate);
                console.log('start point', this.startPoint);
            } else if (this.endPoint === null) {
                this.endPoint = new Point(e.coordinate);

                arcgisRest
                    .solveRoute({
                        stops: [this.startPoint.coordinate, this.endPoint.coordinate],
                    })
                    .then(res => {
                        console.log(res);
                    });

                console.log('end point', this.endPoint);
            } else if (this.startPoint !== null && this.endPoint !== null) {
                if (this.startFlag) {
                    this.startPoint = new Point(e.coordinate);
                    console.log('start point', this.startPoint);
                } else {
                    this.endPoint = new Point(e.coordinate);
                    console.log('end point', this.endPoint);
                }
                this.startFlag = !this.startFlag;

                // auth not working, prob smth wrong with dev profile

                arcgisRest
                    .solveRoute({
                        stops: [this.startPoint.coordinate, this.endPoint.coordinate],
                        authentication,
                    })
                    .then(res => {
                        console.log(res);
                    });
            }
        });
    }
}

const app = new App();
